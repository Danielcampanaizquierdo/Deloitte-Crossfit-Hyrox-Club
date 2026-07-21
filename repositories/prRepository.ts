// PR repository — persists PR records in Deno KV along with the
// prs_by_approval, prs_by_movement, and prs_by_member secondary indexes
// described in docs/plans/2026-07-21-deno-kv-design.md.
//
// Every create/update/delete is a single kv.atomic() transaction that checks
// the primary record's versionstamp and writes/deletes the primary entry and
// all affected index entries together. On a false `ok` commit result, the
// operation rereads current state and retries, up to MAX_RETRIES times.
//
// listByMovement() reads the movement index and filters to approved records,
// so pending PRs never show up in movement leaderboards. getTop() remains a
// service-level calculation over that result.

import type { CreatePRRequest, PR, UpdatePRRequest } from "../types/PR.ts";
import { movementMetric } from "../lib/movements.ts";
import { prApprovalKey, prKey, prMemberKey, prMovementKey } from "./keys.ts";

const MAX_RETRIES = 3;

function generateId(): string {
  return `pr-${crypto.randomUUID()}`;
}

async function resolveIds(
  kv: Deno.Kv,
  entries: AsyncIterable<Deno.KvEntry<string>>,
): Promise<PR[]> {
  const prs: PR[] = [];
  for await (const entry of entries) {
    const record = await kv.get<PR>(prKey(entry.value));
    // Defensively skip index entries whose primary record is gone.
    if (record.value) prs.push(record.value);
  }
  return prs;
}

export interface PrRepository {
  get(id: string): Promise<PR | null>;
  list(): Promise<PR[]>;
  listApproved(): Promise<PR[]>;
  listPending(): Promise<PR[]>;
  listByMemberId(memberId: string): Promise<PR[]>;
  listByMovement(movement: string): Promise<PR[]>;
  create(data: CreatePRRequest): Promise<PR>;
  update(id: string, data: UpdatePRRequest): Promise<PR | null>;
  approve(id: string): Promise<PR | null>;
  delete(id: string): Promise<boolean>;
}

export function createPrRepository(kv: Deno.Kv): PrRepository {
  async function get(id: string): Promise<PR | null> {
    const entry = await kv.get<PR>(prKey(id));
    return entry.value;
  }

  async function list(): Promise<PR[]> {
    const prs: PR[] = [];
    for await (const entry of kv.list<PR>({ prefix: ["prs"] })) {
      if (entry.value) prs.push(entry.value);
    }
    return prs;
  }

  function listApproved(): Promise<PR[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["prs_by_approval", true] }),
    );
  }

  function listPending(): Promise<PR[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["prs_by_approval", false] }),
    );
  }

  function listByMemberId(memberId: string): Promise<PR[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["prs_by_member", memberId] }),
    );
  }

  async function listByMovement(movement: string): Promise<PR[]> {
    const prs = await resolveIds(
      kv,
      kv.list<string>({ prefix: ["prs_by_movement", movement] }),
    );
    return prs.filter((pr) => pr.approved);
  }

  async function create(data: CreatePRRequest): Promise<PR> {
    const id = generateId();
    const now = new Date();
    const pr: PR = {
      id,
      memberId: data.memberId ?? "",
      memberName: data.memberName,
      memberEmail: data.memberEmail,
      movement: data.movement,
      weight: data.weight,
      // Derived from the catalogue rather than trusted from the request, so a
      // movement always ranks the way its own metric implies. An explicit
      // metric still wins, for movements outside the catalogue.
      metric: data.metric ?? movementMetric(data.movement),
      date: new Date(data.date),
      approved: false,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<PR>(prKey(id));
      const res = await kv.atomic()
        .check(primary)
        .set(prKey(id), pr)
        .set(prApprovalKey(pr.approved, id), id)
        .set(prMovementKey(pr.movement, id), id)
        .set(prMemberKey(pr.memberId, id), id)
        .commit();
      if (res.ok) return pr;
    }
    throw new Error(`Failed to create PR ${id} after ${MAX_RETRIES} attempts`);
  }

  async function update(
    id: string,
    data: UpdatePRRequest,
  ): Promise<PR | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<PR>(prKey(id));
      if (primary.value === null) return null;
      const current = primary.value;

      const updated: PR = {
        ...current,
        ...data,
        date: data.date ? new Date(data.date) : current.date,
        updatedAt: new Date(),
      };

      const atomic = kv.atomic()
        .check(primary)
        .set(prKey(id), updated);

      if (updated.approved !== current.approved) {
        atomic
          .delete(prApprovalKey(current.approved, id))
          .set(prApprovalKey(updated.approved, id), id);
      }

      if (updated.movement !== current.movement) {
        atomic
          .delete(prMovementKey(current.movement, id))
          .set(prMovementKey(updated.movement, id), id);
      }

      if (updated.memberId !== current.memberId) {
        atomic
          .delete(prMemberKey(current.memberId, id))
          .set(prMemberKey(updated.memberId, id), id);
      }

      const res = await atomic.commit();
      if (res.ok) return updated;
    }
    throw new Error(`Failed to update PR ${id} after ${MAX_RETRIES} attempts`);
  }

  function approve(id: string): Promise<PR | null> {
    return update(id, { approved: true });
  }

  async function deletePr(id: string): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<PR>(prKey(id));
      if (primary.value === null) return false;
      const current = primary.value;

      const res = await kv.atomic()
        .check(primary)
        .delete(prKey(id))
        .delete(prApprovalKey(current.approved, id))
        .delete(prMovementKey(current.movement, id))
        .delete(prMemberKey(current.memberId, id))
        .commit();
      if (res.ok) return true;
    }
    throw new Error(`Failed to delete PR ${id} after ${MAX_RETRIES} attempts`);
  }

  return {
    get,
    list,
    listApproved,
    listPending,
    listByMemberId,
    listByMovement,
    create,
    update,
    approve,
    delete: deletePr,
  };
}
