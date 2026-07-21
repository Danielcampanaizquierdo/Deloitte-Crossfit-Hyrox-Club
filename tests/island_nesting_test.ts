import { assertEquals } from "std/assert/mod.ts";

// Fresh only hydrates an island when a *route* renders it. An island returned
// from a plain component in components/ is server-rendered as static markup
// and never hydrates, so its event handlers silently never attach — the
// component looks completely normal in review and in the SSR'd HTML.
//
// This repo shipped exactly that bug: commit beb8f3f put ModalManager islands
// inside components/Hero.tsx to "wire the hero buttons to their modals", and
// the buttons were dead in production while the identical buttons rendered
// straight from routes/index.tsx worked. Registering a profile from the hero
// was impossible.
//
// Plain components are still free to be used *inside* an island — that is the
// normal direction, and it is how components/Modal.tsx and Countdown.tsx are
// used. Only the components/ -> islands/ direction is broken.

const IMPORT_PATTERN = /(?:import|export)[\s\S]*?from\s*["']([^"']+)["']/g;

async function tsxFilesIn(dir: string): Promise<string[]> {
  const files: string[] = [];
  for await (const entry of Deno.readDir(dir)) {
    if (entry.isFile && entry.name.endsWith(".tsx")) {
      files.push(`${dir}/${entry.name}`);
    }
  }
  return files.sort();
}

Deno.test("no component in components/ imports an island", async () => {
  const offenders: string[] = [];

  for (const path of await tsxFilesIn("components")) {
    const source = await Deno.readTextFile(path);
    for (const match of source.matchAll(IMPORT_PATTERN)) {
      const specifier = match[1];
      if (specifier.includes("islands/")) {
        offenders.push(`${path} imports ${specifier}`);
      }
    }
  }

  assertEquals(
    offenders,
    [],
    "A component in components/ imports an island. Fresh will render it as " +
      "static HTML and it will never hydrate, so its handlers will not fire. " +
      "Render the island directly from a route, or make the component itself " +
      "an island.",
  );
});

Deno.test("every island is reachable from a route", async () => {
  // An island nothing renders is dead weight in the bundle at best, and at
  // worst a component someone believes is wired up.
  const routeSources: string[] = [];
  async function collectRoutes(dir: string) {
    for await (const entry of Deno.readDir(dir)) {
      const path = `${dir}/${entry.name}`;
      if (entry.isDirectory) await collectRoutes(path);
      else if (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts")) {
        routeSources.push(await Deno.readTextFile(path));
      }
    }
  }
  await collectRoutes("routes");

  // Islands may also be rendered by other islands' files at build time only
  // via direct import, so count those as reachable too.
  const islandSources: string[] = [];
  for (const path of await tsxFilesIn("islands")) {
    islandSources.push(await Deno.readTextFile(path));
  }

  const haystack = [...routeSources, ...islandSources].join("\n");

  const orphans: string[] = [];
  for (const path of await tsxFilesIn("islands")) {
    const name = path.split("/").pop()!.replace(".tsx", "");
    if (!haystack.includes(`islands/${name}.tsx`)) orphans.push(name);
  }

  assertEquals(
    orphans,
    [],
    "These islands are never rendered by a route. Either wire them up or " +
      "delete them so they stop being bundled.",
  );
});
