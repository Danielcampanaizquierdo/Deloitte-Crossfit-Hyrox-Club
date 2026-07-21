import { PR, CreatePRRequest, UpdatePRRequest } from "../types/PR.ts";
import { createPrRepository, PrRepository } from "../repositories/prRepository.ts";
import { memberService as defaultMemberService } from "./memberService.ts";
import { kv } from "../lib/kv.ts";

// Minimal shape prService needs from memberService, so tests can inject a
// memberService built against an isolated repository instead of the
// production singleton (which is bound to the app-lifetime KV).
interface MemberLookup {
  getById(id: string): Promise<{ name: string } | null>;
}

// Pure factory: takes a PrRepository, plus (for consistency/testability) the
// sibling member lookup used to resolve memberName from data.memberId. In
// production this defaults to the same memberService singleton the original
// file imported directly.
export function createPrService(
  repo: PrRepository,
  memberSvc: MemberLookup = defaultMemberService,
) {
  return {
    async getAll(): Promise<PR[]> {
      return repo.list();
    },

    async getApproved(): Promise<PR[]> {
      return repo.listApproved();
    },

    async getPending(): Promise<PR[]> {
      return repo.listPending();
    },

    async getById(id: string): Promise<PR | null> {
      return repo.get(id);
    },

    async getByMemberId(memberId: string): Promise<PR[]> {
      return repo.listByMemberId(memberId);
    },

    async getByMovement(movement: string): Promise<PR[]> {
      return repo.listByMovement(movement);
    },

    async getTop(movement: string): Promise<PR | null> {
      const movementPrs = await this.getByMovement(movement);
      return movementPrs.length > 0
        ? movementPrs.reduce((top, current) =>
            current.weight > top.weight ? current : top
          )
        : null;
    },

    async create(data: CreatePRRequest): Promise<PR> {
      let memberName = data.memberName;
      if (data.memberId) {
        const member = await memberSvc.getById(data.memberId);
        if (!member) throw new Error("Member not found");
        memberName = member.name;
      }
      return repo.create({ ...data, memberName });
    },

    async update(id: string, data: UpdatePRRequest): Promise<PR | null> {
      return repo.update(id, data);
    },

    async delete(id: string): Promise<boolean> {
      return repo.delete(id);
    },

    async approve(id: string): Promise<PR | null> {
      return repo.approve(id);
    },
  };
}

// Production singleton: binds to the app-lifetime KV connection once at
// module load. Deno/Fresh support top-level await in ES modules.
export const prService = createPrService(createPrRepository(await kv));
