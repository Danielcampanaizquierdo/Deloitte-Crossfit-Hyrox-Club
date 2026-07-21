// Shared Deno KV key helpers.
//
// Pure key-construction helpers only — no I/O, no Deno.Kv calls. Each helper
// returns a Deno.KvKey (readonly tuple) matching the key model described in
// docs/plans/2026-07-21-deno-kv-design.md.

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

// Admins: ["admins", id]
export function adminKey(id: string): Deno.KvKey {
  return ["admins", id];
}

// Admins index: ["admins_by_email", normalizedEmail]
export function adminEmailKey(email: string): Deno.KvKey {
  return ["admins_by_email", normalizeEmail(email)];
}

// Events: ["events", id]
export function eventKey(id: string): Deno.KvKey {
  return ["events", id];
}

// Events index: ["events_by_approval", approved, id]
export function eventApprovalKey(approved: boolean, id: string): Deno.KvKey {
  return ["events_by_approval", approved, id];
}

// Events index: ["events_by_date", timestamp, id]
export function eventDateKey(timestamp: number, id: string): Deno.KvKey {
  return ["events_by_date", timestamp, id];
}

// Members: ["members", id]
export function memberKey(id: string): Deno.KvKey {
  return ["members", id];
}

// Members index: ["members_by_approval", approved, id]
export function memberApprovalKey(approved: boolean, id: string): Deno.KvKey {
  return ["members_by_approval", approved, id];
}

// Members index: ["members_by_email", normalizedEmail]
export function memberEmailKey(email: string): Deno.KvKey {
  return ["members_by_email", normalizeEmail(email)];
}

// PRs: ["prs", id]
export function prKey(id: string): Deno.KvKey {
  return ["prs", id];
}

// PRs index: ["prs_by_approval", approved, id]
export function prApprovalKey(approved: boolean, id: string): Deno.KvKey {
  return ["prs_by_approval", approved, id];
}

// PRs index: ["prs_by_movement", movement, id]
export function prMovementKey(movement: string, id: string): Deno.KvKey {
  return ["prs_by_movement", movement, id];
}

// PRs index: ["prs_by_member", memberId, id]
export function prMemberKey(memberId: string, id: string): Deno.KvKey {
  return ["prs_by_member", memberId, id];
}

// Results: ["results", id]
export function resultKey(id: string): Deno.KvKey {
  return ["results", id];
}

// Results index: ["results_by_approval", approved, id]
export function resultApprovalKey(approved: boolean, id: string): Deno.KvKey {
  return ["results_by_approval", approved, id];
}

// Signups: ["signups", id]
export function signupKey(id: string): Deno.KvKey {
  return ["signups", id];
}

// Signups index: ["signups_by_event", eventId, id]
export function signupEventKey(eventId: string, id: string): Deno.KvKey {
  return ["signups_by_event", eventId, id];
}

// Signups index: ["signups_by_member", memberId, id]
export function signupMemberKey(memberId: string, id: string): Deno.KvKey {
  return ["signups_by_member", memberId, id];
}

// Signups index: ["signups_by_event_email", eventId, normalizedEmail]
export function signupEmailKey(eventId: string, email: string): Deno.KvKey {
  return ["signups_by_event_email", eventId, normalizeEmail(email)];
}
