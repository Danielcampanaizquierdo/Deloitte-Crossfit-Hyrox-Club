import { Handlers } from "$fresh/server.ts";
import { prService } from "../../../services/prService.ts";
import { movementMetric, MOVEMENTS } from "../../../lib/movements.ts";
import { State } from "../../../types/State.ts";
import { toPublicPR, toPublicPRs } from "../../../types/PR.ts";
import { MemberNotEligibleError } from "../../../repositories/prRepository.ts";

function validCalendarDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  if (
    Number.isNaN(parsed.getTime()) ||
    parsed.toISOString().slice(0, 10) !== value
  ) {
    return false;
  }
  const today = new Date().toISOString().slice(0, 10);
  return value >= "2000-01-01" && value <= today;
}

export const handler: Handlers<unknown, State> = {
  // Approved PRs only, optionally narrowed to one movement with ?movement=
  // and/or a free-text athlete search with ?search=.
  async GET(req, _ctx) {
    const params = new URL(req.url).searchParams;
    const movement = params.get("movement");
    let prs = movement
      ? await prService.getByMovement(movement)
      : await prService.getApproved();

    // Mirror the client's leaderboard search: case-insensitive substring
    // match on the athlete's name (see islands/LeaderboardSection.tsx).
    const search = params.get("search")?.trim().toLowerCase();
    if (search) {
      prs = prs.filter((pr) => pr.memberName.toLowerCase().includes(search));
    }

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

    const movement = typeof body.movement === "string"
      ? body.movement.trim()
      : "";
    const date = typeof body.date === "string" ? body.date : "";
    if (!movement || body.weight === undefined || !date) {
      return Response.json(
        { error: "Campos requeridos: movement, weight, date" },
        { status: 400 },
      );
    }

    const definition = MOVEMENTS.find((item) => item.name === movement);
    if (!definition) {
      return Response.json({ error: "Movimiento no reconocido" }, {
        status: 400,
      });
    }

    const weightNum = Number(body.weight);
    if (!Number.isFinite(weightNum) || weightNum <= 0) {
      return Response.json(
        { error: "weight debe ser un número positivo y finito" },
        { status: 400 },
      );
    }
    if (!validCalendarDate(date)) {
      return Response.json(
        { error: "date debe ser una fecha válida no futura" },
        { status: 400 },
      );
    }

    // The catalogue, not the client, decides how a movement is ranked.
    const metric = movementMetric(movement);

    // Attribution comes from the session: a PR can only be filed under the
    // logged-in member's own name.
    try {
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
    } catch (error) {
      if (error instanceof MemberNotEligibleError) {
        return Response.json(
          { error: "Tu cuenta ya no está activa o aprobada" },
          { status: 403 },
        );
      }
      throw error;
    }
  },
};
