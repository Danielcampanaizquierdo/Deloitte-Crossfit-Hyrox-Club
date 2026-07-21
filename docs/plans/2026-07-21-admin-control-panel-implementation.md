# Admin Control Panel Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Provide individual administrator accounts and one protected panel for user, calendar, request, and administrator management.

**Architecture:** Deno KV stores administrators and a unique normalized-email index. A password-hashing module and signed sessions identify the acting administrator; protected API routes expose server-validated CRUD, while one Preact island presents the four management views and reports API errors.

**Tech Stack:** Deno, Fresh, Preact, Deno KV, Web Crypto, Deno test runner.

---

### Task 1: Administrator persistence and bootstrap

**Files:** Create `types/Admin.ts`, `repositories/adminRepository.ts`, `repositories/adminRepository_test.ts`, `lib/adminBootstrap.ts`, `lib/adminBootstrap_test.ts`; modify `lib/kv.ts`.

1. Write failing tests for normalized-email uniqueness and idempotent creation of the initial admin from `INITIAL_ADMIN_EMAIL`, `INITIAL_ADMIN_NAME`, and `INITIAL_ADMIN_PASSWORD`.
2. Run `deno test -A --unstable-kv repositories/adminRepository_test.ts lib/adminBootstrap_test.ts`; expect missing modules.
3. Implement keys `admins/[id]` and `admins_by_email/[normalizedEmail]`, atomic create/deactivate/list operations, and a bootstrap that never overwrites an existing account.
4. Run the tests again; expect all passing.
5. Commit `feat: add Deno KV administrator accounts`.

### Task 2: Passwords, sessions, and login API

**Files:** Create `lib/passwords.ts`, `lib/passwords_test.ts`; modify `lib/session.ts`, `routes/_middleware.ts`, `types/State.ts`, `routes/api/admin/login.ts`, `routes/api/admin/logout.ts`; test `routes/api/admin/login_test.ts`.

1. Write failing tests for password hash verification, a session carrying `{ adminId, role }`, invalid credentials, and an inactive admin.
2. Run the targeted tests; expect failure.
3. Implement PBKDF2 hash/verify with random salt, a signed session payload, login against the admin repository, and middleware that sets `state.admin`.
4. Run targeted tests and `deno task build`; expect success.
5. Commit `feat: authenticate individual administrator accounts`.

### Task 3: Protected management APIs

**Files:** Create `routes/api/admin/users/index.ts`, `routes/api/admin/users/[id].ts`, `routes/api/admin/events/index.ts`, `routes/api/admin/events/[id].ts`, `routes/api/admin/accounts/index.ts`, `routes/api/admin/accounts/[id].ts`; test corresponding `*_test.ts` modules.

1. Write failing route tests for 401/403, user approve/reject/edit/disable/delete, event create/edit/publish/cancel/delete, and administrator create/deactivate.
2. Run those tests and confirm failure.
3. Implement routes using the existing services/repositories, validate every body, and return API errors the UI can display. Prevent an admin from deactivating their own account.
4. Run route tests and build.
5. Commit `feat: add protected user calendar and admin APIs`.

### Task 4: Unified administration panel

**Files:** Create `islands/AdminControlPanel.tsx`; modify `routes/index.tsx`, `islands/AdminPanel.tsx`; test `islands/AdminControlPanel_test.tsx` if component tooling permits, otherwise route-level tests plus manual Fresh smoke test.

1. Write a failing UI/route test defining the four tabs and error response state.
2. Implement tabs for Users, Calendar, Requests, and Administrators; use explicit confirmation for destructive actions and surface `response.error` for every failed fetch.
3. Replace `AdminPendingPanel` action usage with the unified panel and preserve read-only public views.
4. Run build and manually verify admin login, user edit, event publish/cancel, and account deactivation.
5. Commit `feat: add unified administration control panel`.

### Task 5: Deployment, regression, and documentation

**Files:** Modify `README.md`, `API_DOCS.md`, Deno Deploy environment configuration; optionally delete obsolete duplicated `routes/api/admin/*/[id]/approve.ts` only after equivalent routes are tested.

1. Add environment setup documentation, including the initial-admin variables and rotation procedure.
2. Run `deno fmt --check`, `deno test -A --unstable-kv`, and `deno task build`.
3. Assign Deno KV to the application, set environment variables, deploy, and smoke-test the live panel.
4. Commit `docs: document administrator panel deployment`.
