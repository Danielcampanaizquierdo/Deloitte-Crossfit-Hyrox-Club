import { CompetitionResult, CreateResultRequest, UpdateResultRequest } from "../types/Result.ts";
import { storage } from "../lib/storage.ts";

const STORAGE_FILE = "results.json";

export const resultService = {
  // Get all results
  async getAll(): Promise<CompetitionResult[]> {
    return await storage.read(STORAGE_FILE);
  },

  // Get approved results
  async getApproved(): Promise<CompetitionResult[]> {
    const results = await this.getAll();
    return results.filter((r) => r.approved);
  },

  // Get pending results
  async getPending(): Promise<CompetitionResult[]> {
    const results = await this.getAll();
    return results.filter((r) => !r.approved);
  },

  // Get result by ID
  async getById(id: string): Promise<CompetitionResult | null> {
    const results = await this.getAll();
    return results.find((r) => r.id === id) || null;
  },

  // Create result
  async create(data: CreateResultRequest): Promise<CompetitionResult> {
    const results = await this.getAll();
    const result: CompetitionResult = {
      id: `res-${Date.now()}`,
      ...data,
      date: new Date(data.date),
      approved: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    results.push(result);
    await storage.write(STORAGE_FILE, results);
    return result;
  },

  // Update result
  async update(id: string, data: UpdateResultRequest): Promise<CompetitionResult | null> {
    const results = await this.getAll();
    const index = results.findIndex((r) => r.id === id);
    if (index === -1) return null;

    const updated: CompetitionResult = {
      ...results[index],
      ...data,
      date: data.date ? new Date(data.date) : results[index].date,
      updatedAt: new Date(),
    };
    results[index] = updated;
    await storage.write(STORAGE_FILE, results);
    return updated;
  },

  // Delete result
  async delete(id: string): Promise<boolean> {
    const results = await this.getAll();
    const index = results.findIndex((r) => r.id === id);
    if (index === -1) return false;
    results.splice(index, 1);
    await storage.write(STORAGE_FILE, results);
    return true;
  },

  // Approve result
  async approve(id: string): Promise<CompetitionResult | null> {
    return this.update(id, { approved: true });
  },
};
