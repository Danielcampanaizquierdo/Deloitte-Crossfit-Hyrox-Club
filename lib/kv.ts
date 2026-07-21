export function openKv(path?: string): Promise<Deno.Kv> {
  return Deno.openKv(path);
}

export const kv = openKv();
