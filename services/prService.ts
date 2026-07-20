import { PR, CreatePRRequest, UpdatePRRequest } from "../types/PR.ts";
import { storage } from "../lib/storage.ts";
import { memberService } from "./memberService.ts";

const STORAGE_FILE = "prs.json";

export const prService = {
  // Get all PRs
  async getAll(): Promise<PR[]> {
    return await storage.read(STORAGE_FILE);
  },

  // Get approved PRs only
  async getApproved(): Promise<PR[]> {
    const prs = await this.getAll();
    return prs.filter((p) => p.approved);
  },

  // Get pending PRs
  async getPending(): Promise<PR[]> {
    const prs = await this.getAll();
    return prs.filter((p) => !p.approved);
  },

  // Get PR by ID
  async getById(id: string): Promise<PR | null> {
    const prs = await this.getAll();
    return prs.find((p) => p.id === id) || null;
  },

  // Get PRs by member
  async getByMemberId(memberId: string): Promise<PR[]> {
    const prs = await this.getAll();
    return prs.filter((p) => p.memberId === memberId);
  },

  // Get PRs by movement
  async getByMovement(movement: string): Promise<PR[]> {
    const prs = await this.getAll();
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
    const member = await memberService.getById(data.memberId);
    if (!member) throw new Error("Member not found");

    const prs = await this.getAll();
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
    await storage.write(STORAGE_FILE, prs);
    return pr;
  },

  // Update PR
  async update(id: string, data: UpdatePRRequest): Promise<PR | null> {
    const prs = await this.getAll();
    const index = prs.findIndex((p) => p.id === id);
    if (index === -1) return null;

    const updated: PR = {
      ...prs[index],
      ...data,
      date: data.date ? new Date(data.date) : prs[index].date,
      updatedAt: new Date(),
    };
    prs[index] = updated;
    await storage.write(STORAGE_FILE, prs);
    return updated;
  },

  // Delete PR
  async delete(id: string): Promise<boolean> {
    const prs = await this.getAll();
    const index = prs.findIndex((p) => p.id === id);
    if (index === -1) return false;
    prs.splice(index, 1);
    await storage.write(STORAGE_FILE, prs);
    return true;
  },

  // Approve PR
  async approve(id: string): Promise<PR | null> {
    return this.update(id, { approved: true });
  },
};
