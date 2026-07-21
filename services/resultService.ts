import { CompetitionResult, CreateResultRequest, UpdateResultRequest } from "../types/Result.ts";
import {
  createResultRepository,
  ResultRepository,
} from "../repositories/resultRepository.ts";
import { kv } from "../lib/kv.ts";

// Pure factory: takes a ResultRepository so tests can build this service
// against an isolated :memory: KV (see services/services_kv_test.ts).
export function createResultService(repo: ResultRepository) {
  return {
    async getAll(): Promise<CompetitionResult[]> {
      return repo.list();
    },

    async getApproved(): Promise<CompetitionResult[]> {
      return repo.listApproved();
    },

    async getPending(): Promise<CompetitionResult[]> {
      return repo.listPending();
    },

    async getById(id: string): Promise<CompetitionResult | null> {
      return repo.get(id);
    },

    async create(data: CreateResultRequest): Promise<CompetitionResult> {
      return repo.create(data);
    },

    async update(
      id: string,
      data: UpdateResultRequest,
    ): Promise<CompetitionResult | null> {
      return repo.update(id, data);
    },

    async delete(id: string): Promise<boolean> {
      return repo.delete(id);
    },

    async approve(id: string): Promise<CompetitionResult | null> {
      return repo.approve(id);
    },
  };
}

// Production singleton: binds to the app-lifetime KV connection once at
// module load. Deno/Fresh support top-level await in ES modules.
export const resultService = createResultService(createResultRepository(await kv));
