import { Member, CreateMemberRequest, UpdateMemberRequest } from "../types/Member.ts";
import { storage } from "../lib/storage.ts";

const STORAGE_FILE = "members.json";

export const memberService = {
  async getAll(): Promise<Member[]> {
    return await storage.read(STORAGE_FILE);
  },

  async getApproved(): Promise<Member[]> {
    const members = await this.getAll();
    return members.filter((m) => m.approved);
  },

  async getPending(): Promise<Member[]> {
    const members = await this.getAll();
    return members.filter((m) => !m.approved);
  },

  async getById(id: string): Promise<Member | null> {
    const members = await this.getAll();
    return members.find((m) => m.id === id) || null;
  },

  async getByEmail(email: string): Promise<Member | null> {
    const members = await this.getAll();
    return members.find((m) => m.email === email) || null;
  },

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

  async delete(id: string): Promise<boolean> {
    const members = await this.getAll();
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return false;
    members.splice(index, 1);
    await storage.write(STORAGE_FILE, members);
    return true;
  },

  async approve(id: string): Promise<Member | null> {
    return this.update(id, { approved: true });
  },

  async reject(id: string): Promise<boolean> {
    return this.delete(id);
  },
};
