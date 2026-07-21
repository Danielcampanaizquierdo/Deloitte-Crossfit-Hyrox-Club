import { Handlers } from "$fresh/server.ts";
import { prService } from "../../../services/prService.ts";
import { movementMetric, type PRMetric } from "../../../lib/movements.ts";
import { State } from "../../../types/State.ts";
import { toPublicPR, toPublicPRs } from "../../../types/PR.ts";

const METRICS: PRMetric[] = ["weight", "time", "reps"];

export const handler: Handlers<unknown, State> = {
  // Approved PRs only, optionally narrowed to one movement with ?movement=.
  async GET(req, _ctx) {
    const movement = new URL(req.url).searchParams.get("movement");
    const prs = movement
      ? await prService.getByMovement(movement)
      : await prService.getApproved();
    return Response.json(toPublicPRs(prs));
  },

  async POST(req, ctx) {
    const member = ctx.state.member;
    if (!member) {
      return Response.json(
        { error: "Inicia sesión para registrar un PR" },
        { status: 401 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { movement, weight, date } = body as Record<string, string>;
    if (!movement || !weight || !date) {
      return Response.json(
        { error: "Campos requeridos: movement, weight, date" },
        { status: 400 },
      );
    }

    const weightNum = Number(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return Response.json({ error: "weight debe ser un número positivo" }, { status: 400 });
    }

    const requested = body.metric as PRMetric | undefined;
    const metric = requested && METRICS.includes(requested)
      ? requested
      : movementMetric(movement);

    // Attribution comes from the session: a PR can only be filed under the
    // logged-in member's own name.
    const pr = await prService.create({
      memberId: member.id,
      memberName: member.name,
      memberEmail: member.email,
      movement,
      weight: weightNum,
      metric,
      date,
    });
    return Response.json(toPublicPR(pr), { status: 201 });
  },
};
