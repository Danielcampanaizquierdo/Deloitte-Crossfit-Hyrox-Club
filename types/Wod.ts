/** Workout of the Day: the board the club posts, plus the scores members log
 * against it. */

export type WodFormat = "amrap" | "for_time" | "emom" | "strength" | "hyrox";

/** How a WOD is scored, which decides both the input unit and the ranking
 * direction on its leaderboard. */
export type WodScoreType = "reps" | "rounds" | "time" | "weight";

export interface Wod {
  id: string;
  name: string;
  date: Date;
  format: WodFormat;
  /** The workout itself, as written on the whiteboard. Newlines preserved. */
  description: string;
  timeCapMinutes?: number;
  scoreType: WodScoreType;
  approved: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateWodRequest {
  name: string;
  date: string;
  format: WodFormat;
  description: string;
  timeCapMinutes?: number;
  scoreType: WodScoreType;
}

export interface UpdateWodRequest {
  name?: string;
  date?: string;
  format?: WodFormat;
  description?: string;
  timeCapMinutes?: number;
  scoreType?: WodScoreType;
  approved?: boolean;
}

export interface WodScore {
  id: string;
  wodId: string;
  /** Stable owner id for authorization and duplicate prevention. Older
   * persisted scores may not have it and fall back to the legacy email key. */
  memberId?: string;
  memberName: string;
  memberEmail: string;
  /** Numeric score in the unit implied by the WOD's scoreType: seconds for
   * "time", kilograms for "weight", plain counts for "reps"/"rounds". */
  value: number;
  /** false = Rx (as prescribed), true = scaled. Rx always outranks scaled. */
  scaled: boolean;
  notes?: string;
  approved: boolean;
  createdAt: Date;
}

export interface CreateWodScoreRequest {
  wodId: string;
  memberId?: string;
  memberName: string;
  memberEmail: string;
  value: number;
  scaled?: boolean;
  notes?: string;
}

/** Notes can contain health context and email is private. Neither belongs on
 * the public WOD leaderboard. */
export type PublicWodScore = Omit<
  WodScore,
  "memberId" | "memberEmail" | "notes"
>;

export function toPublicWodScore(score: WodScore): PublicWodScore {
  const {
    memberId: _memberId,
    memberEmail: _memberEmail,
    notes: _notes,
    ...safe
  } = score;
  return safe;
}

export function toPublicWodScores(scores: WodScore[]): PublicWodScore[] {
  return scores.map(toPublicWodScore);
}

export const WOD_FORMAT_LABELS: Record<WodFormat, string> = {
  amrap: "AMRAP",
  for_time: "For Time",
  emom: "EMOM",
  strength: "Fuerza",
  hyrox: "HYROX",
};

export const WOD_SCORE_LABELS: Record<WodScoreType, string> = {
  reps: "Repeticiones",
  rounds: "Rondas",
  time: "Tiempo",
  weight: "Peso (kg)",
};

/** Time-scored WODs rank fastest-first; every other score type ranks
 * highest-first. */
export function wodHigherIsBetter(scoreType: WodScoreType): boolean {
  return scoreType !== "time";
}

/** Ranks scores for a WOD leaderboard: Rx before scaled, then by value in the
 * direction the score type implies. Does not mutate the input. */
export function rankWodScores<T extends { value: number; scaled: boolean }>(
  scores: T[],
  scoreType: WodScoreType,
): T[] {
  const higherBetter = wodHigherIsBetter(scoreType);
  return [...scores].sort((a, b) => {
    if (a.scaled !== b.scaled) return a.scaled ? 1 : -1;
    return higherBetter ? b.value - a.value : a.value - b.value;
  });
}
