// WOD repository — persists Wod and WodScore records in Deno KV, following the
// same conventions as the other repositories in this directory: every
// create/update/delete is a single kv.atomic() transaction that checks the
// primary record's versionstamp and writes the primary entry and all affected
// index entries together, retrying on a false `ok` commit result.
//
// Scores carry a wod_scores_by_wod_email reservation key that doubles as the
// one-score-per-athlete-per-WOD constraint, mirroring how signupRepository.ts
// enforces one signup per event and email.

import type {
  CreateWodRequest,
  CreateWodScoreRequest,
  UpdateWodRequest,
  Wod,
  WodScore,
} from "../types/Wod.ts";
import {
  wodApprovalKey,
  wodDateKey,
  wodKey,
  wodScoreApprovalKey,
  wodScoreEmailKey,
  wodScoreKey,
  wodScoreMemberKey,
  wodScoreWodKey,
} from "./keys.ts";

const MAX_RETRIES = 3;

export class DuplicateWodScoreError extends Error {
  constructor(wodId: string, email: string) {
    super(`A score for WOD "${wodId}" with email "${email}" already exists`);
    this.name = "DuplicateWodScoreError";
  }
}

function generateWodId(): string {
  return `wod-${crypto.randomUUID()}`;
}

function generateScoreId(): string {
  return `wsc-${crypto.randomUUID()}`;
}

async function resolveWods(
  kv: Deno.Kv,
  entries: AsyncIterable<Deno.KvEntry<string>>,
): Promise<Wod[]> {
  const wods: Wod[] = [];
  for await (const entry of entries) {
    const record = await kv.get<Wod>(wodKey(entry.value));
    // Defensively skip index entries whose primary record is gone.
    if (record.value) wods.push(record.value);
  }
  return wods;
}

async function resolveScores(
  kv: Deno.Kv,
  entries: AsyncIterable<Deno.KvEntry<string>>,
): Promise<WodScore[]> {
  const scores: WodScore[] = [];
  for await (const entry of entries) {
    const record = await kv.get<WodScore>(wodScoreKey(entry.value));
    if (record.value) scores.push(record.value);
  }
  return scores;
}

export interface WodRepository {
  get(id: string): Promise<Wod | null>;
  list(): Promise<Wod[]>;
  listApproved(): Promise<Wod[]>;
  listPending(): Promise<Wod[]>;
  create(data: CreateWodRequest): Promise<Wod>;
  update(id: string, data: UpdateWodRequest): Promise<Wod | null>;
  approve(id: string): Promise<Wod | null>;
  delete(id: string): Promise<boolean>;

  getScore(id: string): Promise<WodScore | null>;
  listScores(): Promise<WodScore[]>;
  listScoresByWod(wodId: string): Promise<WodScore[]>;
  listPendingScores(): Promise<WodScore[]>;
  /** Returns null when the referenced WOD does not exist. */
  createScore(data: CreateWodScoreRequest): Promise<WodScore | null>;
  approveScore(id: string): Promise<WodScore | null>;
  deleteScore(id: string): Promise<boolean>;
}

export function createWodRepository(kv: Deno.Kv): WodRepository {
  async function get(id: string): Promise<Wod | null> {
    const entry = await kv.get<Wod>(wodKey(id));
    return entry.value;
  }

  async function list(): Promise<Wod[]> {
    const wods: Wod[] = [];
    for await (const entry of kv.list<Wod>({ prefix: ["wods"] })) {
      if (entry.value) wods.push(entry.value);
    }
    return wods;
  }

  function listApproved(): Promise<Wod[]> {
    return resolveWods(
      kv,
      kv.list<string>({ prefix: ["wods_by_approval", true] }),
    );
  }

  function listPending(): Promise<Wod[]> {
    return resolveWods(
      kv,
      kv.list<string>({ prefix: ["wods_by_approval", false] }),
    );
  }

  async function create(data: CreateWodRequest): Promise<Wod> {
    const id = generateWodId();
    const now = new Date();
    const wod: Wod = {
      id,
      name: data.name,
      date: new Date(data.date),
      format: data.format,
      description: data.description,
      timeCapMinutes: data.timeCapMinutes,
      scoreType: data.scoreType,
      approved: false,
      createdAt: now,
      updatedAt: now,
    };

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Wod>(wodKey(id));
      const res = await kv.atomic()
        .check(primary)
        .set(wodKey(id), wod)
        .set(wodApprovalKey(wod.approved, id), id)
        .set(wodDateKey(wod.date.getTime(), id), id)
        .commit();
      if (res.ok) return wod;
    }
    throw new Error(`Failed to create WOD ${id} after ${MAX_RETRIES} attempts`);
  }

  async function update(
    id: string,
    data: UpdateWodRequest,
  ): Promise<Wod | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Wod>(wodKey(id));
      if (primary.value === null) return null;
      const current = primary.value;

      const updated: Wod = {
        ...current,
        ...data,
        date: data.date ? new Date(data.date) : new Date(current.date),
        updatedAt: new Date(),
      };

      const atomic = kv.atomic()
        .check(primary)
        .set(wodKey(id), updated);

      if (updated.approved !== current.approved) {
        atomic
          .delete(wodApprovalKey(current.approved, id))
          .set(wodApprovalKey(updated.approved, id), id);
      }

      const currentTime = new Date(current.date).getTime();
      if (updated.date.getTime() !== currentTime) {
        atomic
          .delete(wodDateKey(currentTime, id))
          .set(wodDateKey(updated.date.getTime(), id), id);
      }

      const res = await atomic.commit();
      if (res.ok) return updated;
    }
    throw new Error(`Failed to update WOD ${id} after ${MAX_RETRIES} attempts`);
  }

  function approve(id: string): Promise<Wod | null> {
    return update(id, { approved: true });
  }

  async function deleteWod(id: string): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<Wod>(wodKey(id));
      if (primary.value === null) return false;
      const current = primary.value;

      // A WOD's scores are meaningless without it, so they go in the same
      // sweep. Collected before the transaction so their keys can all be
      // deleted alongside the WOD's own.
      const scores = await listScoresByWod(id);

      const atomic = kv.atomic()
        .check(primary)
        .delete(wodKey(id))
        .delete(wodApprovalKey(current.approved, id))
        .delete(wodDateKey(new Date(current.date).getTime(), id));

      for (const score of scores) {
        atomic
          .delete(wodScoreKey(score.id))
          .delete(wodScoreWodKey(id, score.id))
          .delete(wodScoreApprovalKey(score.approved, score.id))
          .delete(wodScoreEmailKey(id, score.memberEmail));
        if (score.memberId) {
          atomic.delete(wodScoreMemberKey(id, score.memberId));
        }
      }

      const res = await atomic.commit();
      if (res.ok) return true;
    }
    throw new Error(`Failed to delete WOD ${id} after ${MAX_RETRIES} attempts`);
  }

  async function getScore(id: string): Promise<WodScore | null> {
    const entry = await kv.get<WodScore>(wodScoreKey(id));
    return entry.value;
  }

  async function listScores(): Promise<WodScore[]> {
    const scores: WodScore[] = [];
    for await (const entry of kv.list<WodScore>({ prefix: ["wod_scores"] })) {
      if (entry.value) scores.push(entry.value);
    }
    return scores;
  }

  function listScoresByWod(wodId: string): Promise<WodScore[]> {
    return resolveScores(
      kv,
      kv.list<string>({ prefix: ["wod_scores_by_wod", wodId] }),
    );
  }

  function listPendingScores(): Promise<WodScore[]> {
    return resolveScores(
      kv,
      kv.list<string>({ prefix: ["wod_scores_by_approval", false] }),
    );
  }

  async function createScore(
    data: CreateWodScoreRequest,
  ): Promise<WodScore | null> {
    const id = generateScoreId();
    const score: WodScore = {
      id,
      wodId: data.wodId,
      memberId: data.memberId,
      memberName: data.memberName,
      memberEmail: data.memberEmail,
      value: data.value,
      scaled: data.scaled ?? false,
      notes: data.notes,
      approved: false,
      createdAt: new Date(),
    };
    const emailKey = wodScoreEmailKey(data.wodId, data.memberEmail);
    const memberKey = data.memberId
      ? wodScoreMemberKey(data.wodId, data.memberId)
      : null;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const wodEntry = await kv.get<Wod>(wodKey(data.wodId));
      if (wodEntry.value === null) return null;

      const primary = await kv.get<WodScore>(wodScoreKey(id));

      const atomic = kv.atomic()
        .check(wodEntry)
        .check(primary)
        .check({ key: emailKey, versionstamp: null })
        .set(wodScoreKey(id), score)
        .set(wodScoreWodKey(data.wodId, id), id)
        .set(wodScoreApprovalKey(false, id), id)
        .set(emailKey, id);
      if (memberKey) {
        atomic
          .check({ key: memberKey, versionstamp: null })
          .set(memberKey, id);
      }
      const res = await atomic.commit();
      if (res.ok) return score;

      if (memberKey) {
        const memberIndex = await kv.get(memberKey);
        if (memberIndex.value !== null) {
          throw new DuplicateWodScoreError(data.wodId, data.memberEmail);
        }
      }
      const emailIndex = await kv.get(emailKey);
      if (emailIndex.value !== null) {
        throw new DuplicateWodScoreError(data.wodId, data.memberEmail);
      }
      // Otherwise an unrelated conflict (e.g. the WOD was edited); retry.
    }
    throw new Error(
      `Failed to create score for WOD ${data.wodId} after ${MAX_RETRIES} attempts`,
    );
  }

  async function approveScore(id: string): Promise<WodScore | null> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<WodScore>(wodScoreKey(id));
      if (primary.value === null) return null;
      const current = primary.value;
      if (current.approved) return current;

      const updated: WodScore = { ...current, approved: true };

      const res = await kv.atomic()
        .check(primary)
        .set(wodScoreKey(id), updated)
        .delete(wodScoreApprovalKey(current.approved, id))
        .set(wodScoreApprovalKey(true, id), id)
        .commit();
      if (res.ok) return updated;
    }
    throw new Error(
      `Failed to approve WOD score ${id} after ${MAX_RETRIES} attempts`,
    );
  }

  async function deleteScore(id: string): Promise<boolean> {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      const primary = await kv.get<WodScore>(wodScoreKey(id));
      if (primary.value === null) return false;
      const current = primary.value;

      const atomic = kv.atomic()
        .check(primary)
        .delete(wodScoreKey(id))
        .delete(wodScoreWodKey(current.wodId, id))
        .delete(wodScoreApprovalKey(current.approved, id))
        .delete(wodScoreEmailKey(current.wodId, current.memberEmail));
      if (current.memberId) {
        atomic.delete(wodScoreMemberKey(current.wodId, current.memberId));
      }
      const res = await atomic.commit();
      if (res.ok) return true;
    }
    throw new Error(
      `Failed to delete WOD score ${id} after ${MAX_RETRIES} attempts`,
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
    delete: deleteWod,
    getScore,
    listScores,
    listScoresByWod,
    listPendingScores,
    createScore,
    approveScore,
    deleteScore,
  };
}
