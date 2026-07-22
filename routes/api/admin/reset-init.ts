/** @jsxRuntime classic */
// Temporary one-shot endpoint — REMOVE AFTER USE
// Protected by RESET_SECRET env var (query param ?secret=…)
import { Handlers } from "$fresh/server.ts";
import type { Admin } from "../../../types/Admin.ts";
import {
  adminEmailKey,
  adminKey,
  initialAdminMarkerKey,
} from "../../../repositories/keys.ts";
import { hashPassword } from "../../../lib/password.ts";

export const handler: Handlers = {
  async POST(req) {
    const url = new URL(req.url);
    const secret = url.searchParams.get("secret");
    const expected = Deno.env.get("RESET_SECRET");

    if (!expected || secret !== expected) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    let body: Record<string, unknown> = {};
    try {
      body = await req.json();
    } catch { /* ignore */ }

    const email = (body.email as string | undefined) ??
      Deno.env.get("INITIAL_ADMIN_EMAIL");
    const password = (body.password as string | undefined) ??
      Deno.env.get("INITIAL_ADMIN_PASSWORD");
    const name = (body.name as string | undefined) ??
      Deno.env.get("INITIAL_ADMIN_NAME") ?? "Admin";

    if (!email || !password) {
      return Response.json(
        { error: "Provide email+password in body or set INITIAL_ADMIN_EMAIL/PASSWORD" },
        { status: 400 },
      );
    }

    const kv = await Deno.openKv();
    const { hash, salt } = await hashPassword(password);

    const indexEntry = await kv.get<string>(adminEmailKey(email));

    if (indexEntry.value) {
      // Admin exists — update password
      const adminEntry = await kv.get<Admin>(adminKey(indexEntry.value));
      if (!adminEntry.value) {
        kv.close();
        return Response.json({ error: "Index found but admin record missing" }, { status: 500 });
      }
      const updated: Admin = {
        ...adminEntry.value,
        passwordHash: hash,
        passwordSalt: salt,
        updatedAt: new Date(),
      };
      const res = await kv.atomic()
        .check(adminEntry)
        .set(adminKey(indexEntry.value), updated)
        .commit();
      kv.close();
      return res.ok
        ? Response.json({ ok: true, action: "password_updated", email })
        : Response.json({ error: "Concurrent write — try again" }, { status: 409 });
    }

    // Admin does not exist — create it
    const id = `adm-${crypto.randomUUID()}`;
    const now = new Date();
    const admin: Admin = {
      id,
      email: email.trim(),
      name: name.trim(),
      passwordHash: hash,
      passwordSalt: salt,
      role: "superadmin",
      active: true,
      createdAt: now,
      updatedAt: now,
    };
    const res = await kv.atomic()
      .check({ key: adminEmailKey(email), versionstamp: null })
      .set(adminKey(id), admin)
      .set(adminEmailKey(email), id)
      .set(initialAdminMarkerKey(), id)
      .commit();
    kv.close();
    return res.ok
      ? Response.json({ ok: true, action: "admin_created", email })
      : Response.json({ error: "Email already taken — retry" }, { status: 409 });
  },
};
