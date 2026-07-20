import { PR, CreatePRRequest, UpdatePRRequest } from "../types/PR.ts";

// In-memory database
let prs: PR[] = [
  {
    id: "pr-001",
    memberId: "mbr-001",
    memberName: "Demo Athlete",
    movement: "clean_and_jerk",
    weight: 140,
    date: new Date("2026-06-15"),
    approved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "pr-002",
    memberId: "mbr-002",
    memberName: "Member B",
    movement: "snatch",
    weight: 100,
    date: new Date("2026-06-10"),
    approved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const prService = {
  // Get all PRs
  async getAll(): Promise<PR[]> {
    return prs;
  },

  // Get approved PRs only
  async getApproved(): Promise<PR[]> {
    return prs.filter((p) => p.approved);
  },

  // Get pending PRs
  async getPending(): Promise<PR[]> {
    return prs.filter((p) => !p.approved);
  },

  // Get PR by ID
  async getById(id: string): Promise<PR | null> {
    return prs.find((p) => p.id === id) || null;
  },

  // Get PRs by member
  async getByMemberId(memberId: string): Promise<PR[]> {
    return prs.filter((p) => p.memberId === memberId);
  },

  // Get PRs by movement
  async getByMovement(movement: string): Promise<PR[]> {
    return prs.filter((p) => p.movement === movement && p.approved);
  },

  // Get top PR for a movement
  async getTop(movement: string): Promise<PR | null> {
    const movementPrs = await this.getByMovement(movement);
    return movementPrs.length > 0
      ? movementPrs.reduce((top, current) =>
          current.weight > top.weight ? current : top
        )
      : null;
  },

  // Create PR
  async create(data: CreatePRRequest): Promise<PR> {
    const member = await (await import("./memberService.ts")).memberService.getById(
      data.memberId
    );
    if (!member) throw new Error("Member not found");

    const pr: PR = {
      id: `pr-${Date.now()}`,
      ...data,
      memberName: member.name,
      date: new Date(data.date),
      approved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    prs.push(pr);
    return pr;
  },

  // Update PR
  async update(id: string, data: UpdatePRRequest): Promise<PR | null> {
    const index = prs.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updated: PR = {
      ...prs[index],
      ...data,
      date: data.date ? new Date(data.date) : prs[index].date,
      updatedAt: new Date(),
    };
    prs[index] = updated;
    return updated;
  },

  // Delete PR
  async delete(id: string): Promise<boolean> {
    const index = prs.findIndex((p) => p.id === id);
    if (index === -1) return false;
    prs.splice(index, 1);
    return true;
  },

  // Approve PR
  async approve(id: string): Promise<PR | null> {
    return this.update(id, { approved: true });
  },
};
