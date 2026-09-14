/**
 * The landing-page surveys: the model, separate from the view.
 *
 * Two lengths — a five-question quick check and a ten-question deep dive —
 * drawn at random from a shared pool of 22, so no two runs ask the same set
 * and the deep dive is never the quick check with five more on the end.
 *
 * The pool holds each unordered dimension pair exactly once. That is not
 * tidiness, it is the thing that makes a random draw safe: two questions on the
 * same pair would ask the student to agree with a statement and its mirror, and
 * whichever they answered second would look like a contradiction.
 *
 * The question *text* lives in the dictionaries under `survey.pool`, keyed by
 * the same ids used here, because text is content and dimensions are behaviour.
 * The test suite asserts every id in the pool has text in both languages.
 */

export interface SurveyQuestion {
  id: string;
  /** The dimension raised when the student agrees. */
  up: string;
  /** ...and the one lowered. Pairing them is what makes five answers separable. */
  down: string;
  /** Which of the two profile vectors the pair belongs to. */
  axis: "riasec" | "bigfive";
}

/*
 * Fifteen RIASEC questions, one per unordered pair of the six letters, and
 * seven Big Five questions across distinct trait pairs.
 *
 * Every one is written about *choosing* — a major, a commitment, what you would
 * keep if a machine took the rest — rather than about liking a school subject.
 * A student who has decided they "like physics" has not decided anything; one
 * who knows whether they would rather carry a decision or follow a correct
 * procedure has.
 */
export const SURVEY_POOL: SurveyQuestion[] = [
  { id: "ri", up: "R", down: "I", axis: "riasec" },
  { id: "ra", up: "R", down: "A", axis: "riasec" },
  { id: "rs", up: "R", down: "S", axis: "riasec" },
  { id: "re", up: "R", down: "E", axis: "riasec" },
  { id: "rc", up: "R", down: "C", axis: "riasec" },
  { id: "ia", up: "I", down: "A", axis: "riasec" },
  { id: "is", up: "I", down: "S", axis: "riasec" },
  { id: "ie", up: "I", down: "E", axis: "riasec" },
  { id: "ic", up: "I", down: "C", axis: "riasec" },
  { id: "as", up: "A", down: "S", axis: "riasec" },
  { id: "ae", up: "A", down: "E", axis: "riasec" },
  { id: "ac", up: "A", down: "C", axis: "riasec" },
  { id: "se", up: "S", down: "E", axis: "riasec" },
  { id: "sc", up: "S", down: "C", axis: "riasec" },
  { id: "ec", up: "E", down: "C", axis: "riasec" },

  { id: "b_oc", up: "O", down: "C", axis: "bigfive" },
  { id: "b_oa", up: "O", down: "A", axis: "bigfive" },
  { id: "b_oe", up: "O", down: "E", axis: "bigfive" },
  { id: "b_ca", up: "C", down: "A", axis: "bigfive" },
  { id: "b_cn", up: "C", down: "N", axis: "bigfive" },
  { id: "b_ea", up: "E", down: "A", axis: "bigfive" },
  { id: "b_en", up: "E", down: "N", axis: "bigfive" },
];

export const QUICK_LENGTH = 5;
export const DEEP_LENGTH = 10;

/** How many of each draw come from the personality pool rather than interests. */
const BIGFIVE_SHARE: Record<number, number> = { [QUICK_LENGTH]: 1, [DEEP_LENGTH]: 3 };

/** Neutral defaults for everything a given draw does not ask about. */
export const NEUTRAL_RIASEC = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
export const NEUTRAL_BIGFIVE = { O: 55, C: 55, E: 50, A: 55, N: 45 };

export interface SurveyScores {
  riasec: Record<string, number>;
  bigfive: Record<string, number>;
}

export const emptyScores = (): SurveyScores => ({ riasec: {}, bigfive: {} });

/** Fisher-Yates, against an injectable source so a test can pin the draw. */
function shuffle<T>(rows: T[], random: () => number): T[] {
  const out = [...rows];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

/**
 * Draws one survey.
 *
 * Random, but not carelessly so. Two rules shape the draw:
 *
 *  - **A fixed share of personality questions.** A purely random five could
 *    come out all Big Five, leaving every RIASEC letter at its neutral default
 *    — and the recommender would then be ranking 184 careers on a profile that
 *    says nothing about interests at all.
 *  - **Spread across the letters.** Picking greedily by least-used letter stops
 *    a draw like RI / RA / RS / RE, which is four questions about how Realistic
 *    someone is and nothing else. The shuffle still decides which of the
 *    equally-good candidates is taken, so the set differs every run.
 */
export function drawSurvey(
  length: number,
  random: () => number = Math.random,
): SurveyQuestion[] {
  const wantBigFive = BIGFIVE_SHARE[length] ?? Math.round(length * 0.3);
  const pick = (pool: SurveyQuestion[], count: number) => {
    const shuffled = shuffle(pool, random);
    const used = new Map<string, number>();
    const chosen: SurveyQuestion[] = [];
    while (chosen.length < count && chosen.length < shuffled.length) {
      let best: SurveyQuestion | null = null;
      let bestCost = Infinity;
      for (const question of shuffled) {
        if (chosen.includes(question)) continue;
        const cost = (used.get(question.up) ?? 0) + (used.get(question.down) ?? 0);
        if (cost < bestCost) {
          best = question;
          bestCost = cost;
        }
      }
      if (!best) break;
      chosen.push(best);
      used.set(best.up, (used.get(best.up) ?? 0) + 1);
      used.set(best.down, (used.get(best.down) ?? 0) + 1);
    }
    return chosen;
  };

  const riasec = SURVEY_POOL.filter((question) => question.axis === "riasec");
  const bigfive = SURVEY_POOL.filter((question) => question.axis === "bigfive");
  const drawn = [
    ...pick(riasec, length - wantBigFive),
    ...pick(bigfive, wantBigFive),
  ];
  // Interleave rather than front-loading all the interest questions, so the
  // survey does not visibly change subject halfway through.
  return shuffle(drawn, random);
}

/**
 * Folds one answer into the running scores.
 *
 * **Averaging, not overwriting.** The pool guarantees no draw repeats a pair,
 * but a letter can still appear in two different pairs (RI and RS both move R).
 * Overwriting would mean the later question silently cancelled the earlier one,
 * so a ten-question run would end up with the profile of a much shorter one.
 */
export function applyAnswer(
  scores: SurveyScores,
  question: SurveyQuestion,
  agree: boolean,
): SurveyScores {
  const vector = { ...scores[question.axis] };
  const blend = (key: string, value: number) => {
    vector[key] = key in vector ? Math.round((vector[key] + value) / 2) : value;
  };
  blend(question.up, agree ? 85 : 35);
  blend(question.down, agree ? 40 : 80);
  return { ...scores, [question.axis]: vector };
}

/** The full profile the model is asked to score, with the gaps filled in. */
export function toStudentProfile(scores: SurveyScores) {
  return {
    riasec: { ...NEUTRAL_RIASEC, ...scores.riasec },
    bigfive: { ...NEUTRAL_BIGFIVE, ...scores.bigfive },
    grades: {},
    emsat: {},
    track: "advanced",
    emirate: "abu_dhabi",
  };
}
