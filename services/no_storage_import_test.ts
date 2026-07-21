// Architecture guard: none of the business services may reintroduce a
// dependency on the retired lib/storage.ts (JSON file persistence). Task 6
// migrated every service to wrap a Deno KV repository instead; this test is
// a static, textual safety net against that regressing.
//
// It intentionally does NOT re-run the functional KV write coverage already
// provided by services_kv_test.ts (which imports the createXService
// factories and performs representative writes against an isolated
// Deno.openKv(":memory:") instance for every service). That functional test
// would not fail merely because a service file carries an extra, unused
// `import ... from "../lib/storage.ts"` — an unused import doesn't change
// runtime behavior, and lib/storage.ts's own top-level side effect (ensuring
// a directory exists) succeeds silently under typical test permissions. So a
// stray leftover import could slip back in without any functional test
// noticing. This test reads each service's source text directly and fails
// immediately if the substring "lib/storage" appears anywhere in it.

const SERVICE_FILES = [
  "eventService.ts",
  "memberService.ts",
  "prService.ts",
  "resultService.ts",
  "signupService.ts",
];

Deno.test("services no longer reference lib/storage", async () => {
  for (const file of SERVICE_FILES) {
    const source = await Deno.readTextFile(new URL(file, import.meta.url));
    if (source.includes("lib/storage")) {
      throw new Error(
        `services/${file} still references "lib/storage" — services must ` +
          `depend on Deno KV repositories, not the retired JSON storage module.`,
      );
    }
  }
});
