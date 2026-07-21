import { assertEquals } from "https://deno.land/std@0.208.0/assert/mod.ts";
import { handler as approveMember } from "../routes/api/admin/members/[id]/approve.ts";
import { handler as approvePR } from "../routes/api/admin/prs/[id]/approve.ts";
import { handler as approveResult } from "../routes/api/admin/results/[id]/approve.ts";

const unauthenticatedContext = {
  params: { id: "missing" },
  state: { isAdmin: false },
};

for (
  const [label, handler] of [
    ["members", approveMember],
    ["PRs", approvePR],
    ["results", approveResult],
  ] as const
) {
  Deno.test(`rejects unauthenticated admin ${label} approvals`, async () => {
    const post = handler.POST;
    if (!post) throw new Error("POST handler is required");

    const response = await post(
      new Request("http://localhost/api/admin/approve"),
      unauthenticatedContext as never,
    );

    assertEquals(response.status, 403);
  });
}
