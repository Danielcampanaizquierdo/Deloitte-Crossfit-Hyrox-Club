import { Handlers } from "$fresh/server.ts";
import { prService } from "../../../services/prService.ts";
import { State } from "../../../types/State.ts";

export const handler: Handlers<unknown, State> = {
  async POST(req, _ctx) {
    let body: Record<string, unknown>;
    try {
      body = await req.json();
    } catch {
      return Response.json({ error: "JSON inválido" }, { status: 400 });
    }

    const { memberName, memberEmail, movement, weight, date } = body as Record<string, string>;
    if (!memberName || !memberEmail || !movement || !weight || !date) {
      return Response.json(
        { error: "Campos requeridos: memberName, memberEmail, movement, weight, date" },
        { status: 400 },
      );
    }

    const weightNum = Number(weight);
    if (isNaN(weightNum) || weightNum <= 0) {
      return Response.json({ error: "weight debe ser un número positivo" }, { status: 400 });
    }

    const pr = await prService.create({ memberName, memberEmail, movement, weight: weightNum, date });
    return Response.json(pr, { status: 201 });
  },
};
