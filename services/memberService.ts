import { Member, CreateMemberRequest, UpdateMemberRequest } from "../types/Member.ts";
import {
  createMemberRepository,
  MemberRepository,
} from "../repositories/memberRepository.ts";
import { kv } from "../lib/kv.ts";

// Pure factory: takes a MemberRepository so tests can build this service
// against an isolated :memory: KV (see services/services_kv_test.ts).
export function createMemberService(repo: MemberRepository) {
  return {
    async getAll(): Promise<Member[]> {
      return repo.list();
    },

    async getApproved(): Promise<Member[]> {
      return repo.listApproved();
    },

    async getPending(): Promise<Member[]> {
      return repo.listPending();
    },

    async getById(id: string): Promise<Member | null> {
      return repo.get(id);
    },

    async getByEmail(email: string): Promise<Member | null> {
      return repo.getByEmail(email);
    },

    async search(query: string, level?: string, goal?: string): Promise<Member[]> {
      const q = query.toLowerCase();
      // repo.listApproved() already guarantees m.approved, so the previous
      // redundant `m.approved` check in the filter predicate is dropped.
      const members = await repo.listApproved();
      return members.filter((m) => {
        const matchesQuery =
          m.name.toLowerCase().includes(q) ||
          m.email.toLowerCase().includes(q) ||
          m.location.toLowerCase().includes(q) ||
          (m.bio?.toLowerCase().includes(q) || false);
        const matchesLevel = !level || m.level === level;
        const matchesGoal = !goal || m.goal === goal;
        return matchesQuery && matchesLevel && matchesGoal;
      });
    },

    async create(data: CreateMemberRequest): Promise<Member> {
      return repo.create(data);
    },

    async update(id: string, data: UpdateMemberRequest): Promise<Member | null> {
      return repo.update(id, data);
    },

    async delete(id: string): Promise<boolean> {
      return repo.delete(id);
    },

    async approve(id: string): Promise<Member | null> {
      return repo.approve(id);
    },

    async reject(id: string): Promise<boolean> {
      return repo.delete(id);
    },
  };
}

// Production singleton: binds to the app-lifetime KV connection once at
// module load. Deno/Fresh support top-level await in ES modules.
export const memberService = createMemberService(createMemberRepository(await kv));
