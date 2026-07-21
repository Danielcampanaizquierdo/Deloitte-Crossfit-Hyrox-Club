export async function withKv<T>(fn: (kv: Deno.Kv) => Promise<T>): Promise<T> {
  const kv = await Deno.openKv(":memory:");
  try {
    return await fn(kv);
  } finally {
    kv.close();
  }
}
