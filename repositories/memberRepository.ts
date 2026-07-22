// Member repository — persists Member records in Deno KV along with the
// members_by_approval and members_by_email secondary indexes described in
// docs/plans/2026-07-21-deno-kv-design.md.
//
// Every create/update/delete is a single kv.atomic() transaction that checks
// the primary record's versionstamp and writes/deletes the primary entry and
// all affected index entries together. On a false `ok` commit result, the
// operation rereads current state and retries, up to MAX_RETRIES times.
//
// Member creation additionally reserves the normalized email atomically: the
// transaction checks that members_by_email has no existing entry
// (versionstamp: null) before writing the member and its indexes. If that
// check fails because the email is already taken, DuplicateMemberEmailError
// is thrown.

import type {
  CreateMemberRequest,
  Member,
  UpdateMemberRequest,
} from "../types/Member.ts";
import {
  memberApprovalKey,
  memberEmailKey,
  memberKey,
  normalizeEmail,
} from "./keys.ts";

const MAX_RETRIES = 3;

export class DuplicateMemberEmailError extends Error {
  constructor(email: string) {
    super(`Member with email "${email}" already exists`);
    this.name = "DuplicateMemberEmailError";
  }
}

function generateId(): string {
  return `mbr-${crypto.randomUUID()}`;
}

async function resolveIds(
  kv: Deno.Kv,
  entries: AsyncIterable<Deno.KvEntry<string>>,
): Promise<Member[]> {
  const members: Member[] = [];
  for await (const entry of entries) {
    const record = await kv.get<Member>(memberKey(entry.value));
    // Defensively skip index entries whose primary record is gone.
    if (
      record.value && record.value.active !== false &&
      !record.value.deletedAt
    ) members.push(record.value);
  }
  return members;
}

export interface MemberRepository {
  get(id: string): Promise<Member | null>;
  list(): Promise<Member[]>;
  listApproved(): Promise<Member[]>;
  listPending(): Promise<Member[]>;
  getByEmail(email: string): Promise<Member | null>;
  create(data: CreateMemberRequest): Promise<Member>;
  update(id: string, data: UpdateMemberRequest): Promise<Member | null>;
  approve(id: string): Promise<Member | null>;
  delete(id: string): Promise<boolean>;
}

export function createMemberRepository(kv: Deno.Kv): MemberRepository {
  async function get(id: string): Promise<Member | null> {
    const entry = await kv.get<Member>(memberKey(id));
    return entry.value;
  }

  async function list(): Promise<Member[]> {
    const members: Member[] = [];
    for await (const entry of kv.list<Member>({ prefix: ["members"] })) {
      if (
        entry.value && entry.value.active !== false && !entry.value.deletedAt
      ) members.push(entry.value);
    }
    return members;
  }

  function listApproved(): Promise<Member[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["members_by_approval", true] }),
    );
  }

  function listPending(): Promise<Member[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["members_by_approval", false] }),
    );
  }

  async function getByEmail(email: string): Promise<Member | null> {
    const index = await kv.get<string>(memberEmailKey(email));
    if (index.value === null) return null;
    const record = await kv.get<Member>(memberKey(index.value));
    return record.value;
  }

  async function create(data: CreateMemberRequest): Promise<Member> {
    const id = generateId();
    const normalizedEmail = normalizeEmail(data.email);
    const now = new Date();
    const member: Member = {
      id,
      name: data.name,
      email: data.email,
      level: data.level,
      goal: data.goal,
      location: data.location,
      bio: data.bio,
      approved: false,
      active: true,
      passwordHash: data.passwordHash,
      passwordSalt: data.passwordSalt,
      joinedAt: now,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Member>(memberKey(id));
      const res = await kv.atomic()
        .check(primary)
        .check({ key: memberEmailKey(normalizedEmail), versionstamp: null })
        .set(memberKey(id), member)
        .set(memberApprovalKey(member.approved, id), id)
        .set(memberEmailKey(normalizedEmail), id)
        .commit();
      if (res.ok) return member;

      const emailIndex = await kv.get(memberEmailKey(normalizedEmail));
      if (emailIndex.value !== null) {
        throw new DuplicateMemberEmailError(data.email);
      }
      // Otherwise an unrelated conflict (e.g. concurrent write); retry.
    }
    throw new Error(
      `Failed to create member ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  async function update(
    id: string,
    data: UpdateMemberRequest,
  ): Promise<Member | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Member>(memberKey(id));
      if (primary.value === null) return null;
      const current = primary.value;
      if (current.active === false || current.deletedAt) return null;

      const updated: Member = {
        ...current,
        ...data,
        updatedAt: new Date(),
      };

      const currentNormalized = normalizeEmail(current.email);
      const updatedNormalized = normalizeEmail(updated.email);
      const emailChanged = updatedNormalized !== currentNormalized;

      const atomic = kv.atomic()
        .check(primary)
        .set(memberKey(id), updated);

      if (updated.approved !== current.approved) {
        atomic
          .delete(memberApprovalKey(current.approved, id))
          .set(memberApprovalKey(updated.approved, id), id);
      }

      if (emailChanged) {
        atomic
          .check({ key: memberEmailKey(updatedNormalized), versionstamp: null })
          .delete(memberEmailKey(currentNormalized))
          .set(memberEmailKey(updatedNormalized), id);
      }

      const res = await atomic.commit();
      if (res.ok) return updated;

      if (emailChanged) {
        const emailIndex = await kv.get(memberEmailKey(updatedNormalized));
        if (emailIndex.value !== null && emailIndex.value !== id) {
          throw new DuplicateMemberEmailError(updated.email);
        }
      }
      // Otherwise the primary record changed concurrently; reread and retry.
    }
    throw new Error(
      `Failed to update member ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  function approve(id: string): Promise<Member | null> {
    return update(id, { approved: true });
  }

  async function deleteMember(id: string): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Member>(memberKey(id));
      if (primary.value === null) return false;
      const current = primary.value;
      if (current.active === false || current.deletedAt) return false;

      // Keep the stable identity and email reservation so historical PRs,
      // scores and bookings cannot later be attributed to a different person.
      // Credentials and approval are revoked in the same atomic write.
      const {
        passwordHash: _passwordHash,
        passwordSalt: _passwordSalt,
        ...identity
      } = current;
      const deleted: Member = {
        ...identity,
        approved: false,
        active: false,
        deletedAt: new Date(),
        updatedAt: new Date(),
      };

      const res = await kv.atomic()
        .check(primary)
        .set(memberKey(id), deleted)
        .delete(memberApprovalKey(current.approved, id))
        .commit();
      if (res.ok) return true;
    }
    throw new Error(
      `Failed to delete member ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  return {
    get,
    list,
    listApproved,
    listPending,
    getByEmail,
    create,
    update,
    approve,
    delete: deleteMember,
  };
}
