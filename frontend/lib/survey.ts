/**
 * The landing-page surveys: the model, separate from the view.
 *
 * Two lengths, because one length served neither student who arrives on the
 * landing page. The three-question version this replaces was too short to
 * separate 184 careers — the answer it produced was closer to a coin flip than
 * to a recommendation, and a student who liked it had no way to spend two more
 * minutes and get something better.
 *
 *   Quick check (5)  one RIASEC dimension pair per question.
 *   Deep dive (10)   the same five, then five that reach into Big Five and the
 *                    remaining RIASEC pairs.
 *
 * The questions themselves live in the dictionaries (`survey.quick`,
 * `survey.deep`) because they are content; what lives here is which dimensions
 * each one moves, which is behaviour. The two are kept in the same order and
 * an equal length is asserted by the test suite.
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
 * Questions 1-5 are the quick check and also the first half of the deep dive,
 * so a student who does both is never asked to contradict themselves.
 *
 * No RIASEC pair is repeated inside the first five, and the deep dive's extra
 * questions reach into Big Five and into the pairs the quick check left alone,
 * because a second pass over the same six letters adds confidence without
 * adding information.
 */
export const QUICK_SURVEY: SurveyQuestion[] = [
  { id: "q1", up: "I", down: "S", axis: "riasec" },
  { id: "q2", up: "R", down: "A", axis: "riasec" },
  { id: "q3", up: "E", down: "C", axis: "riasec" },
  { id: "q4", up: "A", down: "C", axis: "riasec" },
  { id: "q5", up: "S", down: "I", axis: "riasec" },
];

export const DEEP_SURVEY: SurveyQuestion[] = [
  ...QUICK_SURVEY,
  { id: "q6", up: "C", down: "O", axis: "bigfive" },
  { id: "q7", up: "O", down: "C", axis: "bigfive" },
  { id: "q8", up: "R", down: "I", axis: "riasec" },
  { id: "q9", up: "E", down: "S", axis: "riasec" },
  { id: "q10", up: "C", down: "A", axis: "riasec" },
];

/** Neutral defaults for everything the survey does not ask about. */
export const NEUTRAL_RIASEC = { R: 50, I: 50, A: 50, S: 50, E: 50, C: 50 };
export const NEUTRAL_BIGFIVE = { O: 55, C: 55, E: 50, A: 55, N: 45 };

export interface SurveyScores {
  riasec: Record<string, number>;
  bigfive: Record<string, number>;
}

export const emptyScores = (): SurveyScores => ({ riasec: {}, bigfive: {} });

/**
 * Folds one answer into the running scores.
 *
 * **Averaging, not overwriting.** A later question may touch a dimension an
 * earlier one already moved — q5 raises S, which q1 lowered. Overwriting would
 * mean the last question asked silently cancelled the first, so a student who
 * answered ten questions would end up with exactly the profile of a student who
 * answered only the last five. Averaging keeps both answers in the profile,
 * which is the entire reason for asking ten.
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
