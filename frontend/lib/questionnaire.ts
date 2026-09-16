import type { Questionnaire, QuestionnaireItem } from "@/lib/types";

/**
 * Drawing a short questionnaire from a long one.
 *
 * The RIASEC inventory has thirty statements and the Big Five twenty-five,
 * which is faithful to the instruments and far too long for a student who came
 * to find out what to study. Both are now drawn down to ten.
 *
 * **Stratified, not random.** `scoreQuestionnaire` averages within a dimension
 * and falls back to a neutral 50 for any dimension it sees no answers for. A
 * plain random ten out of thirty would miss a RIASEC letter roughly one run in
 * six, and the student would never know: their Artistic score would just be
 * exactly average, and the recommender would rank 184 careers against a profile
 * with a hole in it. So the draw takes items *per dimension* — every dimension
 * is represented, and the remainder is spread rather than piled on one letter.
 *
 * **Reverse-keyed items are kept in proportion where possible.** An inventory
 * mixes "I enjoy X" with "I dislike X" to catch people who agree with
 * everything. Drawing only the positively-keyed ones would quietly remove that
 * check, so the sampler prefers a mix inside each dimension.
 */

/** Fisher-Yates against an injectable source, so a test can pin the draw. */
function shuffle<T>(rows: T[], random: () => number): T[] {
  const out = [...rows];
  for (let index = out.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(random() * (index + 1));
    [out[index], out[swap]] = [out[swap], out[index]];
  }
  return out;
}

/**
 * Orders one dimension's items so that taking a prefix alternates between
 * normally-keyed and reverse-keyed statements for as long as both last.
 */
function interleaveByKeying(
  items: QuestionnaireItem[],
  random: () => number,
): QuestionnaireItem[] {
  const normal = shuffle(items.filter((item) => !item.reverse), random);
  const reversed = shuffle(items.filter((item) => item.reverse), random);
  const out: QuestionnaireItem[] = [];
  while (normal.length > 0 || reversed.length > 0) {
    if (normal.length > 0) out.push(normal.shift() as QuestionnaireItem);
    if (reversed.length > 0) out.push(reversed.shift() as QuestionnaireItem);
  }
  return out;
}

/**
 * The ids of `limit` items, covering every dimension the questionnaire has.
 *
 * Returns ids rather than items because the result is persisted with the
 * student's profile: the draw has to survive closing the tab. Re-drawing on
 * resume would show a different ten questions half way through and make the
 * "answer every statement" check unsatisfiable.
 */
export function drawQuestionnaire(
  questionnaire: Questionnaire,
  limit = 10,
  random: () => number = Math.random,
): string[] {
  const dimensions = [...new Set(questionnaire.items.map((item) => item.dimension))];
  if (dimensions.length === 0) return [];

  const pools = new Map<string, QuestionnaireItem[]>();
  for (const dimension of dimensions) {
    pools.set(
      dimension,
      interleaveByKeying(
        questionnaire.items.filter((item) => item.dimension === dimension),
        random,
      ),
    );
  }

  // Round-robin across dimensions in a shuffled order, so when the limit does
  // not divide evenly the extra items land on different dimensions each run
  // rather than always on the first ones.
  const order = shuffle(dimensions, random);
  const picked: string[] = [];
  let exhausted = false;
  while (picked.length < limit && !exhausted) {
    exhausted = true;
    for (const dimension of order) {
      if (picked.length >= limit) break;
      const pool = pools.get(dimension);
      const next = pool?.shift();
      if (next) {
        picked.push(next.id);
        exhausted = false;
      }
    }
  }

  // Presentation order is shuffled too: without this the student answers one
  // statement per dimension in a fixed cycle, which is a pattern people notice
  // and start second-guessing.
  return shuffle(picked, random);
}

/**
 * The questionnaire narrowed to a stored draw.
 *
 * Falls back to the full instrument when the stored ids do not match the
 * catalog — which happens when the item bank changes under a saved profile,
 * and is better than showing a student four questions because six ids went
 * stale.
 */
export function narrowTo(questionnaire: Questionnaire, ids: string[]): Questionnaire {
  if (ids.length === 0) return questionnaire;
  const wanted = new Set(ids);
  const items = questionnaire.items.filter((item) => wanted.has(item.id));
  if (items.length !== ids.length) return questionnaire;
  // Ordered by the draw, not by the catalog.
  const byId = new Map(items.map((item) => [item.id, item]));
  return {
    ...questionnaire,
    items: ids.map((id) => byId.get(id) as QuestionnaireItem),
  };
}
