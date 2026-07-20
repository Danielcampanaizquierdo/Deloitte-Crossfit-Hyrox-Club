import { Member, CreateMemberRequest, UpdateMemberRequest } from "../types/Member.ts";

// In-memory database
let members: Member[] = [
  {
    id: "mbr-001",
    name: "Demo Athlete",
    email: "demo.athlete@example.com",
    level: "intermediate",
    goal: "crossfit",
    location: "Madrid",
    bio: "Passionate about CrossFit and HYROX training.",
    approved: true,
    joinedAt: new Date("2025-01-15"),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mbr-002",
    name: "Member B",
    email: "member.b@example.com",
    level: "advanced",
    goal: "crossfit",
    location: "Madrid",
    bio: "Strength training specialist.",
    approved: true,
    joinedAt: new Date("2024-11-20"),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "mbr-003",
    name: "Member C",
    email: "member.c@example.com",
    level: "beginner",
    goal: "hyrox",
    location: "Barcelona",
    bio: "Just starting my HYROX journey.",
    approved: false,
    joinedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const memberService = {
  // Get all members
  async getAll(): Promise<Member[]> {
    return members;
  },

  // Get approved members only
  async getApproved(): Promise<Member[]> {
    return members.filter((m) => m.approved);
  },

  // Get pending members
  async getPending(): Promise<Member[]> {
    return members.filter((m) => !m.approved);
  },

  // Get member by ID
  async getById(id: string): Promise<Member | null> {
    return members.find((m) => m.id === id) || null;
  },

  // Get member by email
  async getByEmail(email: string): Promise<Member | null> {
    return members.find((m) => m.email === email) || null;
  },

  // Search members
  async search(query: string, level?: string, goal?: string): Promise<Member[]> {
    const q = query.toLowerCase();
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
    const member: Member = {
      id: `mbr-${Date.now()}`,
      ...data,
      approved: false,
      joinedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    members.push(member);
    return member;
  },

  // Update member
  async update(id: string, data: UpdateMemberRequest): Promise<Member | null> {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return null;

    const updated: Member = {
      ...members[index],
      ...data,
      updatedAt: new Date(),
    };
    members[index] = updated;
    return updated;
  },

  // Delete member
  async delete(id: string): Promise<boolean> {
    const index = members.findIndex((m) => m.id === id);
    if (index === -1) return false;
    members.splice(index, 1);
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
