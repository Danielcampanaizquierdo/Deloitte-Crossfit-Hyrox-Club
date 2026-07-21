import { Handlers } from "$fresh/server.ts";
import { wodService } from "../../../services/wodService.ts";
import type { WodFormat, WodScoreType } from "../../../types/Wod.ts";
import { State } from "../../../types/State.ts";

const FORMATS: WodFormat[] = ["amrap", "for_time", "emom", "strength", "hyrox"];
const SCORE_TYPES: WodScoreType[] = ["reps", "rounds", "time", "weight"];

export const handler: Handlers<unknown, State> = {
  async GET(_req, _ctx) {
    return Response.json(await wodService.getBoard());
  },

  async POST(req, ctx) {
    if (!ctx.state.isAdmin) {
      return Response.json({ error: "Forbidden" }, { status: 403 });
    }

    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { name, date, format, description, scoreType } = body as Record<
      string,
      string
    >;
    if (!name || !date || !format || !description || !scoreType) {
      return Response.json(
        {
          error:
            "Campos requeridos: name, date, format, description, scoreType",
        },
        { status: 400 },
      );
    }
    if (!FORMATS.includes(format as WodFormat)) {
      return Response.json({ error: "format inválido" }, { status: 400 });
    }
    if (!SCORE_TYPES.includes(scoreType as WodScoreType)) {
      return Response.json({ error: "scoreType inválido" }, { status: 400 });
    }

    const rawCap = body.timeCapMinutes;
    let timeCapMinutes: number | undefined;
    if (rawCap !== undefined && rawCap !== null && rawCap !== "") {
      const parsed = Number(rawCap);
      if (!Number.isFinite(parsed) || parsed <= 0) {
        return Response.json(
          { error: "timeCapMinutes debe ser un número positivo" },
          { status: 400 },
        );
      }
      timeCapMinutes = Math.round(parsed);
    }

    const wod = await wodService.create({
      name,
      date,
      format: format as WodFormat,
      description,
      scoreType: scoreType as WodScoreType,
      timeCapMinutes,
    });
    // An admin posting the board is the approval, matching how
    // routes/api/events/index.ts and results/index.ts publish immediately.
    const approved = await wodService.approve(wod.id);
    return Response.json(approved, { status: 201 });
  },
};
