import type {
  CreateWodRequest,
  CreateWodScoreRequest,
  UpdateWodRequest,
  Wod,
  WodScore,
} from "../types/Wod.ts";
import { rankWodScores } from "../types/Wod.ts";
import {
  createWodRepository,
  DuplicateWodScoreError,
  WodRepository,
} from "../repositories/wodRepository.ts";
import { kv } from "../lib/kv.ts";

/** A WOD plus its approved scores, already ranked for display. */
export interface WodWithScores extends Wod {
  scores: WodScore[];
}

// Pure factory: takes a WodRepository so tests can build this service against
// an isolated :memory: KV, matching the other services in this directory.
export function createWodService(repo: WodRepository) {
  return {
    getAll(): Promise<Wod[]> {
      return repo.list();
    },

    getApproved(): Promise<Wod[]> {
      return repo.listApproved();
    },

    getPending(): Promise<Wod[]> {
      return repo.listPending();
    },

    getById(id: string): Promise<Wod | null> {
      return repo.get(id);
    },

    create(data: CreateWodRequest): Promise<Wod> {
      return repo.create(data);
    },

    update(id: string, data: UpdateWodRequest): Promise<Wod | null> {
      return repo.update(id, data);
    },

    approve(id: string): Promise<Wod | null> {
      return repo.approve(id);
    },

    delete(id: string): Promise<boolean> {
      return repo.delete(id);
    },

    getScoresByWod(wodId: string): Promise<WodScore[]> {
      return repo.listScoresByWod(wodId);
    },

    getPendingScores(): Promise<WodScore[]> {
      return repo.listPendingScores();
    },

    async createScore(data: CreateWodScoreRequest): Promise<WodScore | null> {
      try {
        return await repo.createScore(data);
      } catch (err) {
        if (err instanceof DuplicateWodScoreError) {
          throw new Error("Already scored this WOD");
        }
        throw err;
      }
    },

    approveScore(id: string): Promise<WodScore | null> {
      return repo.approveScore(id);
    },

    deleteScore(id: string): Promise<boolean> {
      return repo.deleteScore(id);
    },

    /** Approved WODs, newest first, each with its approved scores ranked for
     * that WOD's score type — the exact shape the board renders. */
    async getBoard(limit = 10): Promise<WodWithScores[]> {
      const wods = await repo.listApproved();
      const recent = wods
        .sort((a, b) =>
          new Date(b.date).getTime() - new Date(a.date).getTime()
        )
        .slice(0, limit);

      return Promise.all(
        recent.map(async (wod) => {
          const scores = await repo.listScoresByWod(wod.id);
          return {
            ...wod,
            scores: rankWodScores(
              scores.filter((s) => s.approved),
              wod.scoreType,
            ),
          };
        }),
      );
    },
  };
}

// Production singleton: binds to the app-lifetime KV connection once at
// module load. Deno/Fresh support top-level await in ES modules.
export const wodService = createWodService(createWodRepository(await kv));
