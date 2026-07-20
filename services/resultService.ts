import { CompetitionResult, CreateResultRequest, UpdateResultRequest } from "../types/Result.ts";

// In-memory database
let results: CompetitionResult[] = [
  {
    id: "res-001",
    title: "HYROX Madrid",
    date: new Date("2026-06-20"),
    description: "Great team performance, strong finishing times and amazing spirit throughout the competition.",
    results: [
      { position: 1, memberName: "Demo Athlete", time: "58:32" },
      { position: 2, memberName: "Member B", time: "59:15" },
      { position: 3, memberName: "Member C", time: "61:00" },
    ],
    approved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  {
    id: "res-002",
    title: "DEKA Event",
    date: new Date("2026-05-10"),
    description: "Internal challenge with strong team cohesion. Personal PRs achieved and future goals set.",
    results: [
      { position: 1, memberName: "Demo Athlete", score: "250 points" },
      { position: 2, memberName: "Member B", score: "235 points" },
    ],
    approved: true,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

export const resultService = {
  // Get all results
  async getAll(): Promise<CompetitionResult[]> {
    return results;
  },

  // Get approved results
  async getApproved(): Promise<CompetitionResult[]> {
    return results.filter((r) => r.approved);
  },

  // Get pending results
  async getPending(): Promise<CompetitionResult[]> {
    return results.filter((r) => !r.approved);
  },

  // Get result by ID
  async getById(id: string): Promise<CompetitionResult | null> {
    return results.find((r) => r.id === id) || null;
  },

  // Create result
  async create(data: CreateResultRequest): Promise<CompetitionResult> {
    const result: CompetitionResult = {
      id: `res-${Date.now()}`,
      ...data,
      date: new Date(data.date),
      approved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    results.push(result);
    return result;
  },

  // Update result
  async update(id: string, data: UpdateResultRequest): Promise<CompetitionResult | null> {
    const index = results.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: CompetitionResult = {
      ...results[index],
      ...data,
      date: data.date ? new Date(data.date) : results[index].date,
      updatedAt: new Date(),
    };
    results[index] = updated;
    return updated;
  },

  // Delete result
  async delete(id: string): Promise<boolean> {
    const index = results.findIndex((r) => r.id === id);
    if (index === -1) return false;
    results.splice(index, 1);
    return true;
  },

  // Approve result
  async approve(id: string): Promise<CompetitionResult | null> {
    return this.update(id, { approved: true });
  },
};
