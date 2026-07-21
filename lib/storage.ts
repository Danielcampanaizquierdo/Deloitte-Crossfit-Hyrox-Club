import { ensureDir } from "std/fs/mod.ts";

const DATA_DIR = "./data";

await ensureDir(DATA_DIR);

interface StorageFile {
  path: string;
  defaultValue: unknown;
}

class JSONStorage {
  private cache: Map<string, unknown> = new Map();

  async initialize(files: StorageFile[]): Promise<void> {
    for (const file of files) {
      await this.ensureFile(file.path, file.defaultValue);
    }
  }

  private async ensureFile(path: string, defaultValue: unknown): Promise<void> {
    const filePath = `${DATA_DIR}/${path}`;
    try {
      const content = await Deno.readTextFile(filePath);
      this.cache.set(path, JSON.parse(content));
    } catch (error) {
      if (error instanceof Deno.errors.NotFound) {
        this.cache.set(path, defaultValue);
        await this.write(path, defaultValue);
      } else {
        throw error;
      }
    }
  }

  async read<T>(path: string): Promise<T> {
    if (!this.cache.has(path)) {
      await this.ensureFile(path, []);
    }
    return this.cache.get(path) as T;
  }

  async write(path: string, data: unknown): Promise<void> {
    this.cache.set(path, data);
    const filePath = `${DATA_DIR}/${path}`;
    const dir = filePath.substring(0, filePath.lastIndexOf("/"));
    await ensureDir(dir);
    await Deno.writeTextFile(filePath, JSON.stringify(data, null, 2));
  }
}

export const storage = new JSONStorage();

await storage.initialize([
  { path: "events.json", defaultValue: [] },
  { path: "members.json", defaultValue: [] },
  { path: "prs.json", defaultValue: [] },
  { path: "results.json", defaultValue: [] },
  { path: "signups.json", defaultValue: [] },
]);
