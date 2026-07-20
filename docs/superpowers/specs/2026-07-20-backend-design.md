# Backend Design — Deloitte Crossfit/Hyrox Club

**Date:** 2026-07-20
**Status:** Approved

## Context

The app is a Deno Fresh 1.6.8 single-page club management tool for a Crossfit/Hyrox community. The current state has a static frontend with hardcoded data, five JSON-based services, and a client-side admin passcode hardcoded in the Preact island. The goal is to add a full server-side backend: admin session management, SSR data loading, and API routes for all form submissions.

**Deployment target:** Deno Deploy (migrating from GitHub Pages).

## Decisions

| Decision | Choice | Reason |
|----------|--------|--------|
| Auth | Admin passcode only, no user accounts | Keeps it simple; public users submit forms anonymously |
| Admin session | Cookie-based (HMAC-signed, 8h TTL) | Persists across reloads without a database |
| Passcode storage | `ADMIN_PASSCODE` env var on Deno Deploy | Removes hardcoded secret from client JS |
| Data for public pages | SSR via Fresh handler | No flash, indexable, no client-side loading states |
| Data persistence | JSON files via existing `lib/storage.ts` | Already built; fine for small club scale |

## Architecture

### File structure (new files only)

```
routes/
  _middleware.ts          — reads session cookie, sets ctx.state.isAdmin
  index.tsx               — adds handler: SSR data load → props
  api/
    admin/
      login.ts            — POST: validate passcode → set session cookie
      logout.ts           — POST: clear session cookie
    events/
      index.ts            — POST (admin): create event
      [id]/
        signup.ts         — POST (public): sign up for event
        approve.ts        — POST (admin): approve pending event
        delete.ts         — DELETE (admin): delete event
    members/
      index.ts            — POST (public): register as member
      [id]/
        approve.ts        — POST (admin): approve member
        reject.ts         — POST (admin): reject and delete member
    prs/
      index.ts            — POST (public): submit PR/benchmark
      [id]/
        approve.ts        — POST (admin): approve PR → shows in leaderboard
    results/
      index.ts            — POST (admin): submit competition result
      [id]/
        approve.ts        — POST (admin): approve result
lib/
  session.ts              — createSession / verifySession / clearSession
```

### Session management (`lib/session.ts`)

Three functions using `crypto.subtle` (Web Crypto API, available in Deno Deploy):

- `createSession()` — generates 32 random bytes, signs with HMAC-SHA256 using `SESSION_SECRET` env var. Returns `Set-Cookie` header value with `HttpOnly; Secure; SameSite=Lax; Max-Age=28800`.
- `verifySession(cookieHeader)` — parses cookie, re-derives HMAC, constant-time compares. Returns `boolean`.
- `clearSession()` — returns `Set-Cookie` with `Max-Age=0`.

### Middleware (`routes/_middleware.ts`)

Runs on every request. Reads the `session` cookie, calls `verifySession`. Writes `ctx.state.isAdmin: boolean`. No redirect — routes decide what to do with the flag.

### SSR handler (`routes/index.tsx`)

```ts
export const handler: Handlers<PageData> = {
  async GET(req, ctx) {
    const isAdmin = ctx.state.isAdmin;
    const [events, members, prs, results] = await Promise.all([
      isAdmin ? eventService.getAll() : eventService.getUpcoming(),
      memberService.getApproved(),
      prService.getApproved(),
      resultService.getApproved(),
    ]);
    const pending = isAdmin ? {
      events: await eventService.getPending(),
      members: await memberService.getPending(),
      prs: await prService.getPending(),
      results: await resultService.getPending(),
    } : null;
    return ctx.render({ events, members, prs, results, pending, isAdmin });
  }
};
```

All islands that currently use hardcoded data (`Calendar`, `MembersFilter`, leaderboard section, `AdminPanel`) receive real data as props.

## API Routes

All routes return JSON. Admin routes return **403** if `!ctx.state.isAdmin`. Public routes return **400** with `{ error: string }` on validation failure.

### Public endpoints

| Method | Path | Body | Effect |
|--------|------|------|--------|
| POST | `/api/members` | `{ name, email, level, goal, location }` | Creates member with `approved: false` |
| POST | `/api/prs` | `{ memberName, memberEmail, movement, weight, date }` | Creates PR with `approved: false`; no memberId required |
| POST | `/api/events/:id/signup` | `{ memberName, memberEmail, comments? }` | Signs up for event; rejects duplicate email |

### Admin endpoints

| Method | Path | Body | Effect |
|--------|------|------|--------|
| POST | `/api/admin/login` | `{ passcode }` | Sets session cookie on match |
| POST | `/api/admin/logout` | — | Clears session cookie |
| POST | `/api/events` | `{ title, date, location, description, type? }` | Creates event with `approved: true` |
| POST | `/api/events/:id/approve` | — | Sets `approved: true` |
| DELETE | `/api/events/:id` | — | Deletes event |
| POST | `/api/members/:id/approve` | — | Sets `approved: true` |
| POST | `/api/members/:id/reject` | — | Deletes member |
| POST | `/api/prs/:id/approve` | — | Sets `approved: true` → appears in leaderboard |
| POST | `/api/results` | `{ name, date, description, photoUrl? }` | Creates result with `approved: true` |
| POST | `/api/results/:id/approve` | — | Sets `approved: true` |

## Island changes

| Island | Change |
|--------|--------|
| `AdminPanel` | Remove client-side passcode logic; render a `<form>` that POSTs to `/api/admin/login`. Receives `isAdmin` prop from SSR. |
| `Calendar` | Accept `events: Event[]` prop instead of hardcoded object. |
| `MembersFilter` | Accept `members: Member[]` prop; filter in-memory client-side as now. |
| Signup form | Wire up to `POST /api/events/:id/signup` with fetch, show success/error inline. |
| PR form | Wire up to `POST /api/prs` with fetch, show success/error inline. |
| Member registration form | Wire up to `POST /api/members` with fetch, show success/error inline. |
| Admin pending panels | Wire approve/reject buttons to API routes with fetch; remove from DOM on success. |

## Env vars (Deno Deploy)

| Var | Description |
|-----|-------------|
| `ADMIN_PASSCODE` | Admin unlock passcode (replaces hardcoded `ClubAdmin2026`) |
| `SESSION_SECRET` | 32+ byte random string for HMAC signing |

## Error handling

- Storage errors bubble up as 500 with `{ error: "Internal server error" }`.
- Duplicate signup returns 409 with `{ error: "Ya estás apuntado a este evento" }`.
- Missing required fields return 400 with field-level `{ error: "..." }`.
- Invalid admin session returns 403; no redirect.

## Service layer changes needed

`types/PR.ts` — `CreatePRRequest.memberId` becomes optional; add `memberName: string` and `memberEmail: string` as required fields for anonymous submissions.

`services/prService.ts` — `create()` uses `memberName`/`memberEmail` from request directly when `memberId` is absent, instead of looking up the member. The `PR` object stores `memberName` as it already does.

## Out of scope

- Email notifications
- File/photo uploads
- User accounts or member login
- Pagination (small club, JSON fits in memory)
- Rate limiting
