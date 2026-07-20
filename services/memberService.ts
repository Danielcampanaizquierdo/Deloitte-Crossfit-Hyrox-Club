import { Member, CreateMemberRequest, UpdateMemberRequest } from "../types/Member.ts";
import { storage } from "../lib/storage.ts";

const STORAGE_FILE = "members.json";

export const memberService = {
  // Get all members
  async getAll(): Promise<Member[]> {
    return await storage.read(STORAGE_FILE);
  },

  // Get approved members only
  async getApproved(): Promise<Member[]> {
    const members = await this.getAll();
    return members.filter((m) => m.approved);
  },

  // Get pending members
  async getPending(): Promise<Member[]> {
    const members = await this.getAll();
    return members.filter((m) => !m.approved);
  },

  // Get member by ID
  async getById(id: string): Promise<Member | null> {
    const members = await this.getAll();
    return members.find((m) => m.id === id) || null;
  },

  // Get member by email
  async getByEmail(email: string): Promise<Member | null> {
    const members = await this.getAll();
    return members.find((m) => m.email === email) || null;
  },

  // Search members
  async search(query: string, level?: string, goal?: string): Promise<Member[]> {
    const q = query.toLowerCase();
    const members = await this.getAll();
    return members.filter((m) => {
      const matchesQuery =
        m.name.toLowerCase().includes(q) ||
        m.email.toLowerCase().includes(q) ||
        m.location.toLowerCase().includes(q) ||
        (m.bio?.toLowerCase().includes(q) || false);
      const matchesLevel = !level || m.level === level;
      const matchesGoal = !goal || m.goal === goal;
      return matchesQuery && matchesLevel && matchesGoal && m.approved;
    });
  },

  // Create member
  async create(data: CreateMemberRequest): Promise<Member> {
    const members = await this.getAll();
    const member: Member = {
      id: `mbr-${Date.now()}`,
      ...data,
      approved: false,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    members.push(member);
    await storage.write(STORAGE_FILE, members);
    return member;
  },

  // Update member
  async update(id: string, data: UpdateMemberRequest): Promise<Member | null> {
    const members = await this.getAll();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const updated: Member = {
      ...members[index],
      ...data,
      updatedAt: new Date(),
    };
    members[index] = updated;
    await storage.write(STORAGE_FILE, members);
    return updated;
  },

  // Delete member
  async delete(id: string): Promise<boolean> {
    const members = await this.getAll();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return false;
    members.splice(index, 1);
    await storage.write(STORAGE_FILE, members);
    return true;
  },

  // Approve member
  async approve(id: string): Promise<Member | null> {
    return this.update(id, { approved: true });
  },

  // Reject member
  async reject(id: string): Promise<boolean> {
    return this.delete(id);
  },
};
