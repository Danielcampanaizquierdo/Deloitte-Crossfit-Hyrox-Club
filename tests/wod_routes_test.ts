import { assertEquals } from "std/assert/mod.ts";
import { handler as wodsIndex } from "../routes/api/wods/index.ts";
import { handler as wodDelete } from "../routes/api/wods/[id]/delete.ts";
import { handler as scoreApprove } from "../routes/api/wod-scores/[id]/approve.ts";
import { handler as scoreDelete } from "../routes/api/wod-scores/[id]/delete.ts";

function anonContext(id = "missing") {
  return { params: { id }, state: { isAdmin: false } };
}

Deno.test("publishing a WOD requires an admin session", async () => {
  const post = wodsIndex.POST;
  if (!post) throw new Error("POST handler is required");

  const response = await post(
    new Request("http://localhost/api/wods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fran",
        date: "2026-08-01",
        format: "for_time",
        description: "21-15-9",
        scoreType: "time",
      }),
    }),
    anonContext() as never,
  );

  assertEquals(response.status, 403);
});

Deno.test("deleting a WOD requires an admin session", async () => {
  const del = wodDelete.DELETE;
  if (!del) throw new Error("DELETE handler is required");

  const response = await del(
    new Request("http://localhost/api/wods/wod-1/delete", { method: "DELETE" }),
    anonContext("wod-1") as never,
  );

  assertEquals(response.status, 403);
});

Deno.test("moderating a WOD score requires an admin session", async () => {
  for (
    const [label, handler, method] of [
      ["approve", scoreApprove, "POST"],
      ["delete", scoreDelete, "DELETE"],
    ] as const
  ) {
    const fn = method === "POST" ? handler.POST : handler.DELETE;
    if (!fn) throw new Error(`${label} handler is required`);

    const response = await fn(
      new Request(`http://localhost/api/wod-scores/wsc-1/${label}`, { method }),
      anonContext("wsc-1") as never,
    );

    assertEquals(response.status, 403, `${label} must reject anonymous callers`);
  }
});

Deno.test("publishing a WOD rejects an unknown format or score type", async () => {
  const post = wodsIndex.POST;
  if (!post) throw new Error("POST handler is required");

  const adminContext = { params: {}, state: { isAdmin: true } };

  const badFormat = await post(
    new Request("http://localhost/api/wods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fran",
        date: "2026-08-01",
        format: "not-a-format",
        description: "21-15-9",
        scoreType: "time",
      }),
    }),
    adminContext as never,
  );
  assertEquals(badFormat.status, 400);

  const badScoreType = await post(
    new Request("http://localhost/api/wods", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: "Fran",
        date: "2026-08-01",
        format: "for_time",
        description: "21-15-9",
        scoreType: "vibes",
      }),
    }),
    adminContext as never,
  );
  assertEquals(badScoreType.status, 400);
});
