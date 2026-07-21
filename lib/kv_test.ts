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
