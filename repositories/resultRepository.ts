// Result repository — persists CompetitionResult records in Deno KV along
// with the results_by_approval secondary index described in
// docs/plans/2026-07-21-deno-kv-design.md.
//
// Every create/update/delete is a single kv.atomic() transaction that checks
// the primary record's versionstamp and writes/deletes the primary entry and
// the approval index entry together. On a false `ok` commit result, the
// operation rereads current state and retries, up to MAX_RETRIES times.

import type {
  CompetitionResult,
  CreateResultRequest,
  UpdateResultRequest,
} from "../types/Result.ts";
import { resultApprovalKey, resultKey } from "./keys.ts";

const MAX_RETRIES = 3;

function generateId(): string {
  return `res-${crypto.randomUUID()}`;
}

async function resolveIds(
  kv: Deno.Kv,
  entries: AsyncIterable<Deno.KvEntry<string>>,
): Promise<CompetitionResult[]> {
  const results: CompetitionResult[] = [];
  for await (const entry of entries) {
    const record = await kv.get<CompetitionResult>(resultKey(entry.value));
    // Defensively skip index entries whose primary record is gone.
    if (record.value) results.push(record.value);
  }
  return results;
}

export interface ResultRepository {
  get(id: string): Promise<CompetitionResult | null>;
  list(): Promise<CompetitionResult[]>;
  listApproved(): Promise<CompetitionResult[]>;
  listPending(): Promise<CompetitionResult[]>;
  create(data: CreateResultRequest): Promise<CompetitionResult>;
  update(
    id: string,
    data: UpdateResultRequest,
  ): Promise<CompetitionResult | null>;
  approve(id: string): Promise<CompetitionResult | null>;
  delete(id: string): Promise<boolean>;
}

export function createResultRepository(kv: Deno.Kv): ResultRepository {
  async function get(id: string): Promise<CompetitionResult | null> {
    const entry = await kv.get<CompetitionResult>(resultKey(id));
    return entry.value;
  }

  async function list(): Promise<CompetitionResult[]> {
    const results: CompetitionResult[] = [];
    for await (
      const entry of kv.list<CompetitionResult>({ prefix: ["results"] })
    ) {
      if (entry.value) results.push(entry.value);
    }
    return results;
  }

  function listApproved(): Promise<CompetitionResult[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["results_by_approval", true] }),
    );
  }

  function listPending(): Promise<CompetitionResult[]> {
    return resolveIds(
      kv,
      kv.list<string>({ prefix: ["results_by_approval", false] }),
    );
  }

  async function create(
    data: CreateResultRequest,
  ): Promise<CompetitionResult> {
    const id = generateId();
    const now = new Date();
    const result: CompetitionResult = {
      id,
      name: data.name,
      date: new Date(data.date),
      description: data.description,
      photoUrl: data.photoUrl,
      approved: false,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<CompetitionResult>(resultKey(id));
      const res = await kv.atomic()
        .check(primary)
        .set(resultKey(id), result)
        .set(resultApprovalKey(result.approved, id), id)
        .commit();
      if (res.ok) return result;
    }
    throw new Error(
      `Failed to create result ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  async function update(
    id: string,
    data: UpdateResultRequest,
  ): Promise<CompetitionResult | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<CompetitionResult>(resultKey(id));
      if (primary.value === null) return null;
      const current = primary.value;

      const updated: CompetitionResult = {
        ...current,
        ...data,
        date: data.date ? new Date(data.date) : current.date,
        updatedAt: new Date(),
      };

      const atomic = kv.atomic()
        .check(primary)
        .set(resultKey(id), updated);

      if (updated.approved !== current.approved) {
        atomic
          .delete(resultApprovalKey(current.approved, id))
          .set(resultApprovalKey(updated.approved, id), id);
      }

      const res = await atomic.commit();
      if (res.ok) return updated;
    }
    throw new Error(
      `Failed to update result ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  function approve(id: string): Promise<CompetitionResult | null> {
    return update(id, { approved: true });
  }

  async function deleteResult(id: string): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<CompetitionResult>(resultKey(id));
      if (primary.value === null) return false;
      const current = primary.value;

      const res = await kv.atomic()
        .check(primary)
        .delete(resultKey(id))
        .delete(resultApprovalKey(current.approved, id))
        .commit();
      if (res.ok) return true;
    }
    throw new Error(
      `Failed to delete result ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  return {
    get,
    list,
    listApproved,
    listPending,
    create,
    update,
    approve,
    delete: deleteResult,
  };
}
