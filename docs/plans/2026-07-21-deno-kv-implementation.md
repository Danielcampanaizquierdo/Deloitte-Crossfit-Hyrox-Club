# Deno KV Persistence Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace local JSON persistence with Deno KV on Deno Deploy while preserving the current service and HTTP API contracts.

**Architecture:** Add an application-lifetime KV connection and focused repositories that own primary keys, indexes, and atomic writes. Existing services call those repositories rather than `lib/storage.ts`; routes and frontend do not change. Tests instantiate repositories with an isolated `Deno.openKv(":memory:")` database.

**Tech Stack:** Deno, Fresh 1.6.8, TypeScript, built-in Deno KV, Deno's built-in test runner, `std/assert`.

---

## Preconditions

- In the Deno Deploy console, provision a Deno KV database and assign it to
  `deloitte-crossfit-hyrox-club`. The deployed application will use
  `Deno.openKv()` with no connection string or token.
- Do not migrate or delete `data/*.json`; the deployed KV database starts
  empty.
- Repair the repository's malformed `HEAD` before executing commit steps. At
  planning time, both `git status` and `git commit` fail with `fatal: bad object
  HEAD`; repairing Git history is intentionally outside this feature.

### Task 1: Enable local KV and create a testable connection

**Files:**
- Create: `lib/kv.ts`
- Create: `lib/kv_test.ts`
- Modify: `deno.json`

**Step 1: Write the failing test**

Create `lib/kv_test.ts`:

```ts
import { assertEquals } from "std/assert/mod.ts";
import { openKv } from "./kv.ts";

Deno.test("openKv returns a usable database", async () => {
  const kv = await openKv(":memory:");
  try {
    await kv.set(["test", "connection"], "ok");
    assertEquals((await kv.get<string>(["test", "connection"])).value, "ok");
  } finally {
    kv.close();
  }
});
```

**Step 2: Run the test to verify it fails**

Run: `deno test --unstable-kv -A lib/kv_test.ts`

Expected: failure because `lib/kv.ts` does not exist.

**Step 3: Implement the minimal connection module**

Create `lib/kv.ts`:

```ts
export function openKv(path?: string): Promise<Deno.Kv> {
  return Deno.openKv(path);
}

export const kv = openKv();
```

Update `deno.json` tasks to pass `--unstable-kv` wherever the application is
run locally:

```json
"dev": "deno run -A --unstable-kv --watch=static/,routes/ dev.ts",
"build": "deno run -A --unstable-kv dev.ts build",
"preview": "deno run -A --unstable-kv main.ts"
```

**Step 4: Run the test and type check**

Run: `deno test --unstable-kv -A lib/kv_test.ts && deno check --unstable-kv lib/kv.ts`

Expected: one passing test and no type errors.

**Step 5: Commit**

```bash
git add deno.json lib/kv.ts lib/kv_test.ts
git commit -m "feat: add Deno KV connection"
```

### Task 2: Add shared KV key helpers and repository test setup

**Files:**
- Create: `repositories/keys.ts`
- Create: `repositories/test_utils.ts`
- Create: `repositories/keys_test.ts`

**Step 1: Write the failing key-shape test**

```ts
import { assertEquals } from "std/assert/mod.ts";
import { eventKey, signupEmailKey } from "./keys.ts";

Deno.test("keys use stable prefixes and normalized email", () => {
  assertEquals(eventKey("evt-1"), ["events", "evt-1"]);
  assertEquals(
    signupEmailKey("evt-1", "Athlete@Example.COM "),
    ["signups_by_event_email", "evt-1", "athlete@example.com"],
  );
});
```

**Step 2: Run it to verify it fails**

Run: `deno test --unstable-kv -A repositories/keys_test.ts`

Expected: failure because the key helpers do not exist.

**Step 3: Implement keys and ephemeral test setup**

`repositories/keys.ts` must export typed helpers for every primary and index
key from the approved design, including `eventKey`, `memberKey`, `prKey`,
`resultKey`, `signupKey`, all `...ApprovalKey` helpers, `memberEmailKey`,
`prMovementKey`, `prMemberKey`, `signupEventKey`, `signupMemberKey`, and
`signupEmailKey`. Use `email.trim().toLowerCase()` in one exported
`normalizeEmail()` helper.

`repositories/test_utils.ts` must export:

```ts
export async function withKv<T>(fn: (kv: Deno.Kv) => Promise<T>): Promise<T> {
  const kv = await Deno.openKv(":memory:");
  try {
    return await fn(kv);
  } finally {
    kv.close();
  }
}
```

**Step 4: Run the test**

Run: `deno test --unstable-kv -A repositories/keys_test.ts`

Expected: passing.

**Step 5: Commit**

```bash
git add repositories/keys.ts repositories/test_utils.ts repositories/keys_test.ts
git commit -m "feat: define Deno KV key schema"
```

### Task 3: Implement event and member repositories with atomic indexes

**Files:**
- Create: `repositories/eventRepository.ts`
- Create: `repositories/memberRepository.ts`
- Create: `repositories/eventRepository_test.ts`
- Create: `repositories/memberRepository_test.ts`

**Step 1: Write failing repository tests**

Cover the following executable cases using `withKv`:

```ts
Deno.test("event repository lists approved and upcoming events by indexes", async () => {
  // create one future approved event and one past/pending event;
  // assert listApproved() and listUpcoming() return only the valid event.
});

Deno.test("event repository removes all event indexes on delete", async () => {
  // create, delete, then assert get(id), listApproved(), and listUpcoming()
  // contain no record.
});

Deno.test("member repository reserves normalized emails atomically", async () => {
  // create Athlete@Example.com, then assert a second create with
  // athlete@example.com rejects with DuplicateMemberEmailError.
});

Deno.test("member approval moves the member between approval indexes", async () => {
  // create pending, approve, then assert listPending() is empty and
  // listApproved() contains the member.
});
```

**Step 2: Run the tests to verify they fail**

Run: `deno test --unstable-kv -A repositories/eventRepository_test.ts repositories/memberRepository_test.ts`

Expected: failure because the repositories are absent.

**Step 3: Implement the repositories**

Export factory functions `createEventRepository(kv)` and
`createMemberRepository(kv)`. Each must expose the existing service-level
operations: get/list/create/update/delete and the approved/pending/upcoming or
search operations appropriate to its entity.

For create/update/delete, build a single `kv.atomic()` transaction that checks
the primary entry version, sets or deletes the primary entry and all affected
index keys, then calls `.commit()`. On a false `ok` result, reread and retry at
most three times. The member create transaction must `.check({ key:
memberEmailKey(email), versionstamp: null })` before setting the member and
email index. Throw an exported `DuplicateMemberEmailError` on a present email
index. Resolve index results by reading the referenced primary record and skip
any absent primary record defensively.

**Step 4: Run tests and checks**

Run: `deno test --unstable-kv -A repositories/eventRepository_test.ts repositories/memberRepository_test.ts && deno check --unstable-kv repositories/eventRepository.ts repositories/memberRepository.ts`

Expected: all tests pass and no type errors.

**Step 5: Commit**

```bash
git add repositories/eventRepository.ts repositories/memberRepository.ts repositories/*Repository_test.ts
git commit -m "feat: persist events and members in Deno KV"
```

### Task 4: Implement PR and result repositories with indexed listing

**Files:**
- Create: `repositories/prRepository.ts`
- Create: `repositories/resultRepository.ts`
- Create: `repositories/prRepository_test.ts`
- Create: `repositories/resultRepository_test.ts`

**Step 1: Write failing tests**

Test that PR approval changes visibility, `listByMovement()` only returns
approved PRs for its movement, and `listByMemberId()` uses the member index.
Test that result approval changes visibility and deleting a result removes it
from both the primary key and approval index.

**Step 2: Run them to verify failure**

Run: `deno test --unstable-kv -A repositories/prRepository_test.ts repositories/resultRepository_test.ts`

Expected: failure because the repository modules do not exist.

**Step 3: Implement the repositories**

Export `createPrRepository(kv)` and `createResultRepository(kv)`. Store every
entity at its primary key, maintain the approved index on each update, and
maintain PR movement/member indexes. Use the same bounded retry and
versionstamp transaction pattern from Task 3. `listByMovement()` must read the
movement index and filter to approved records; `getTop()` remains a service
calculation over that result to preserve the current behavior.

**Step 4: Run tests and checks**

Run: `deno test --unstable-kv -A repositories/prRepository_test.ts repositories/resultRepository_test.ts && deno check --unstable-kv repositories/prRepository.ts repositories/resultRepository.ts`

Expected: passing tests and no type errors.

**Step 5: Commit**

```bash
git add repositories/prRepository.ts repositories/resultRepository.ts repositories/*Repository_test.ts
git commit -m "feat: persist PRs and results in Deno KV"
```

### Task 5: Implement atomic signup repository and attendee count

**Files:**
- Create: `repositories/signupRepository.ts`
- Create: `repositories/signupRepository_test.ts`
- Modify: `repositories/eventRepository.ts`

**Step 1: Write failing concurrency and cancellation tests**

```ts
Deno.test("only one simultaneous signup per event and email commits", async () => {
  // Promise.allSettled two create calls with the same event/email;
  // assert exactly one fulfillment, one duplicate error, and attendees === 1.
});

Deno.test("cancelling a signup deletes indexes and decrements attendees", async () => {
  // create signup, delete it, assert no event/email or event/member index
  // remains and attendees returns to zero.
});
```

**Step 2: Run tests to confirm failure**

Run: `deno test --unstable-kv -A repositories/signupRepository_test.ts`

Expected: failure because the signup repository does not exist.

**Step 3: Implement a transactional create and delete**

`createSignupRepository(kv)` must load the current event and reserve
`signupEmailKey(eventId, email)`. Its commit must atomically check the event
version and absent email key, then set the signup record and its three indexes,
set the duplicate-reservation key, and update the event record with
`attendees + 1` and a new `updatedAt`. If the event is absent, return a domain
not-found result; if the reservation exists, throw `DuplicateSignupError`.

Its delete operation must read the signup and event then atomically check both
versionstamps, delete the primary record plus every signup index/reservation,
and update the event with `Math.max(0, attendees - 1)`. Retry a failed commit
at most three times. Remove the standalone service call that increments
attendees after signup creation, since it would double-count.

**Step 4: Run tests and checks**

Run: `deno test --unstable-kv -A repositories/signupRepository_test.ts && deno check --unstable-kv repositories/signupRepository.ts`

Expected: passing tests and no type errors.

**Step 5: Commit**

```bash
git add repositories/signupRepository.ts repositories/signupRepository_test.ts repositories/eventRepository.ts
git commit -m "feat: atomically persist event signups in Deno KV"
```

### Task 6: Switch services to repositories without changing routes

**Files:**
- Modify: `services/eventService.ts`
- Modify: `services/memberService.ts`
- Modify: `services/prService.ts`
- Modify: `services/resultService.ts`
- Modify: `services/signupService.ts`
- Modify: `routes/api/events/[id]/signup.ts`
- Create: `services/services_kv_test.ts`

**Step 1: Write failing service contract tests**

Create services from repositories backed by `:memory:` KV and assert current
contract behavior: generated entity fields, `null` for missing ids, approved
filters, member search, top PR selection, duplicate signup error, and
attendee increment/decrement. Include an assertion that a successful signup
through the service changes `attendees` exactly once.

**Step 2: Run the test to verify failure**

Run: `deno test --unstable-kv -A services/services_kv_test.ts`

Expected: failure while services still import `lib/storage.ts`.

**Step 3: Replace storage calls**

Import the app KV promise and repository factories in each service. Keep
existing exported service object names and public method signatures. Add
optional factory exports only where needed for test injection; production
exports must bind repositories to `await kv`. Delete `STORAGE_FILE` constants
and every `storage.read`/`storage.write` use.

In `routes/api/events/[id]/signup.ts`, remove:

```ts
await eventService.addAttendee(ctx.params.id);
```

because Task 5 performs that mutation in the signup transaction. Do not change
the HTTP status codes or duplicate-signup response.

**Step 4: Run service tests and type check the full app**

Run: `deno test --unstable-kv -A services/services_kv_test.ts && deno check --unstable-kv main.ts`

Expected: passing tests and no type errors.

**Step 5: Commit**

```bash
git add services routes/api/events/[id]/signup.ts
git commit -m "refactor: switch services from JSON storage to Deno KV"
```

### Task 7: Remove obsolete storage dependency, document operation, and verify deployment

**Files:**
- Delete: `lib/storage.ts`
- Modify: `README.md`
- Modify: `API_DOCS.md` only if it claims JSON/in-memory persistence

**Step 1: Write a failing architecture guard test**

Add a test that imports every service and completes one representative write to
an in-memory KV instance. This guards against an accidental remaining import of
`lib/storage.ts`.

**Step 2: Confirm the guard fails before cleanup**

Run: `rg -n "lib/storage|storage\.read|storage\.write|JSONStorage" services lib routes`

Expected before deletion: only obsolete references to `lib/storage.ts` remain.

**Step 3: Remove legacy storage and update documentation**

Use `apply_patch` to delete `lib/storage.ts` only after the search returns no
runtime imports. Update README to state "Deno KV" as the persistence layer and
add deployment instructions: provision a Deno KV database, assign it to the
app, and deploy. Include the data-residency warning from the approved design;
do not claim EU-only residency or GDPR compliance.

**Step 4: Run the full verification suite**

Run:

```bash
deno fmt --check
deno test --unstable-kv -A
deno check --unstable-kv main.ts
deno task build
```

Expected: every command exits 0.

**Step 5: Deploy and smoke-test**

After assigning the KV database in Deno Deploy, deploy through the existing
deployment workflow. Verify at
`https://deloitte-crossfit-hyrox-club.danielcampanaizquierdo.deno.net/`:

1. Create a member and receive HTTP 201.
2. Approve it as admin and verify it persists after a reload.
3. Create an approved event, create then cancel a signup, and verify the
   attendee count moves 0 → 1 → 0.
4. Repeat a signup with the same event/email and verify HTTP 409.

**Step 6: Commit**

```bash
git add README.md API_DOCS.md lib/storage.ts
git commit -m "docs: document Deno KV deployment and remove JSON storage"
```

## Implementation order

`Task 1 → Task 2 → (Tasks 3 and 4) → Task 5 → Task 6 → Task 7`

Tasks 3 and 4 can run in parallel after Task 2; Task 5 depends on the event
repository from Task 3. Do not change public endpoints, seed data, or the
existing JSON files during this work.
