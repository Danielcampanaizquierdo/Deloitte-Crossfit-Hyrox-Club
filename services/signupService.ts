import { EventSignup, CreateSignupRequest } from "../types/Signup.ts";
import { storage } from "../lib/storage.ts";

const STORAGE_FILE = "signups.json";

export const signupService = {
  // Get all signups
  async getAll(): Promise<EventSignup[]> {
    return await storage.read(STORAGE_FILE);
  },

  // Get signups by event
  async getByEventId(eventId: string): Promise<EventSignup[]> {
    const signups = await this.getAll();
    return signups.filter((s) => s.eventId === eventId);
  },

  // Get signups by member
  async getByMemberId(memberId: string): Promise<EventSignup[]> {
    const signups = await this.getAll();
    return signups.filter((s) => s.memberId === memberId);
  },

  // Get signup by ID
  async getById(id: string): Promise<EventSignup | null> {
    const signups = await this.getAll();
    return signups.find((s) => s.id === id) || null;
  },

  // Check if member is signed up for event
  async isSignedUp(eventId: string, memberEmail: string): Promise<boolean> {
    const signups = await this.getAll();
    return signups.some(
      (s) => s.eventId === eventId && s.memberEmail === memberEmail
    );
  },

  // Create signup
  async create(data: CreateSignupRequest): Promise<EventSignup> {
    // Check if already signed up
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

  // Delete signup (cancel attendance)
  async delete(id: string): Promise<boolean> {
    const signups = await this.getAll();
    const index = signups.findIndex((s) => s.id === id);
    if (index === -1) return false;
    signups.splice(index, 1);
    await storage.write(STORAGE_FILE, signups);
    return true;
  },

  // Count signups for event
  async countByEvent(eventId: string): Promise<number> {
    return (await this.getByEventId(eventId)).length;
  },
};
