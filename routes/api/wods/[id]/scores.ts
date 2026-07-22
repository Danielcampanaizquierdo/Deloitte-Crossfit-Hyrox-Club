import { Handlers } from "$fresh/server.ts";
import { wodService } from "../../../../services/wodService.ts";
import { parseTimeToSeconds } from "../../../../lib/movements.ts";
import { State } from "../../../../types/State.ts";
import { toPublicWodScore, toPublicWodScores } from "../../../../types/Wod.ts";
import { MemberNotEligibleError } from "../../../../repositories/wodRepository.ts";

export const handler: Handlers<unknown, State> = {
  async GET(_req, ctx) {
    const wod = await wodService.getById(ctx.params.id);
    if (!wod || !wod.approved) {
      return Response.json({ error: "WOD no encontrado" }, { status: 404 });
    }
    const scores = await wodService.getScoresByWod(ctx.params.id);
    return Response.json(toPublicWodScores(scores.filter((s) => s.approved)));
  },

  async POST(req, ctx) {
    const member = ctx.state.member;
    if (!member) {
      return Response.json(
        { error: "Inicia sesión para registrar tu score" },
        { status: 401 },
      );
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { value } = body as Record<string, string>;
    if (value === undefined || value === "") {
      return Response.json(
        { error: "Campo requerido: value" },
        { status: 400 },
      );
    }

    const wod = await wodService.getById(ctx.params.id);
    if (!wod || !wod.approved) {
      return Response.json({ error: "WOD no encontrado" }, { status: 404 });
    }

    // A time-scored WOD is submitted as mm:ss and stored as whole seconds;
    // every other score type is a plain positive number.
    let numericValue: number | null;
    if (wod.scoreType === "time") {
      numericValue = parseTimeToSeconds(String(value));
    } else {
      const parsed = Number(value);
      numericValue = Number.isFinite(parsed) && parsed > 0 ? parsed : null;
    }

    if (numericValue === null) {
      return Response.json(
        {
          error: wod.scoreType === "time"
            ? "Introduce un tiempo válido (mm:ss)"
            : "Introduce un número positivo",
        },
        { status: 400 },
      );
    }

    try {
      // Attribution comes from the session, so a score can only be logged
      // under the logged-in member's own name.
      const score = await wodService.createScore({
        wodId: ctx.params.id,
        memberId: member.id,
        memberName: member.name,
        memberEmail: member.email,
        value: numericValue,
        scaled: body.scaled === true || body.scaled === "true",
        notes: typeof body.notes === "string" ? body.notes : undefined,
      });
      if (!score) {
        return Response.json({ error: "WOD no encontrado" }, { status: 404 });
      }
      return Response.json(toPublicWodScore(score), { status: 201 });
    } catch (err) {
      if (err instanceof MemberNotEligibleError) {
        return Response.json(
          { error: "Tu cuenta ya no puede registrar scores" },
          { status: 403 },
        );
      }
      if (err instanceof Error && err.message.includes("Already scored")) {
        return Response.json(
          { error: "Ya has registrado tu score en este WOD" },
          { status: 409 },
        );
      }
      throw err;
    }
  },
};
