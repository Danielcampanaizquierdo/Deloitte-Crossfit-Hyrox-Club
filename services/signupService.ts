import { EventSignup, CreateSignupRequest } from "../types/Signup.ts";
import { storage } from "../lib/storage.ts";

const STORAGE_FILE = "signups.json";

export const signupService = {
  async getAll(): Promise<EventSignup[]> {
    return await storage.read(STORAGE_FILE);
  },

  async getByEventId(eventId: string): Promise<EventSignup[]> {
    const signups = await this.getAll();
    return signups.filter((s) => s.eventId === eventId);
  },

  async getByMemberId(memberId: string): Promise<EventSignup[]> {
    const signups = await this.getAll();
    return signups.filter((s) => s.memberId === memberId);
  },

  async getById(id: string): Promise<EventSignup | null> {
    const signups = await this.getAll();
    return signups.find((s) => s.id === id) || null;
  },

  async isSignedUp(eventId: string, memberEmail: string): Promise<boolean> {
    const signups = await this.getAll();
    return signups.some(
      (s) => s.eventId === eventId && s.memberEmail === memberEmail
    );
  },

  async create(data: CreateSignupRequest): Promise<EventSignup> {
    const exists = await this.isSignedUp(data.eventId, data.memberEmail);
    if (exists) throw new Error("Already signed up for this event");
    const signups = await this.getAll();
    const signup: EventSignup = {
      id: `signup-${Date.now()}`,
      ...data,
      signedUpAt: new Date(),
    };
    signups.push(signup);
    await storage.write(STORAGE_FILE, signups);
    return signup;
  },

  async delete(id: string): Promise<boolean> {
    const signups = await this.getAll();
    const index = signups.findIndex((s) => s.id === id);
    if (index === -1) return false;
    signups.splice(index, 1);
    await storage.write(STORAGE_FILE, signups);
    return true;
  },

  async countByEvent(eventId: string): Promise<number> {
    return (await this.getByEventId(eventId)).length;
  },
};
