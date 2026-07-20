import { CompetitionResult, CreateResultRequest, UpdateResultRequest } from "../types/Result.ts";
import { storage } from "../lib/storage.ts";

const STORAGE_FILE = "results.json";

export const resultService = {
  async getAll(): Promise<CompetitionResult[]> {
    return await storage.read(STORAGE_FILE);
  },

  async getApproved(): Promise<CompetitionResult[]> {
    const results = await this.getAll();
    return results.filter((r) => r.approved);
  },

  async getPending(): Promise<CompetitionResult[]> {
    const results = await this.getAll();
    return results.filter((r) => !r.approved);
  },

  async getById(id: string): Promise<CompetitionResult | null> {
    const results = await this.getAll();
    return results.find((r) => r.id === id) || null;
  },

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

  async delete(id: string): Promise<boolean> {
    const results = await this.getAll();
    const index = results.findIndex((r) => r.id === id);
    if (index === -1) return false;
    results.splice(index, 1);
    await storage.write(STORAGE_FILE, results);
    return true;
  },

  async approve(id: string): Promise<CompetitionResult | null> {
    return this.update(id, { approved: true });
  },
};
