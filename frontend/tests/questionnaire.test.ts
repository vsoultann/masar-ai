import { readFile } from "node:fs/promises";

import { beforeAll, describe, expect, it } from "vitest";

import { drawQuestionnaire, narrowTo } from "@/lib/questionnaire";
import { scoreQuestionnaire } from "@/lib/scoring";
import type { Questionnaire } from "@/lib/types";

/**
 * Shortening the inventories.
 *
 * RIASEC ships thirty statements and Big Five twenty-five; the wizard now asks
 * ten of each. The danger in that is silent: `scoreQuestionnaire` falls back to
 * a neutral 50 for a dimension it sees no answers for, so a draw that misses a
 * letter produces a profile with a hole in it and no error anywhere.
 */

let riasec: Questionnaire;
let bigfive: Questionnaire;

beforeAll(async () => {
  const dir = `${process.cwd()}/public/data`;
  riasec = JSON.parse(await readFile(`${dir}/questionnaire_riasec.json`, "utf8"));
  bigfive = JSON.parse(await readFile(`${dir}/questionnaire_bigfive.json`, "utf8"));
});

const dimensionsOf = (q: Questionnaire) =>
  [...new Set(q.items.map((item) => item.dimension))];

describe("drawing ten statements", () => {
  it("draws exactly ten distinct items from each instrument", () => {
    for (const questionnaire of [riasec, bigfive]) {
      const drawn = drawQuestionnaire(questionnaire, 10);
      expect(drawn).toHaveLength(10);
      expect(new Set(drawn).size).toBe(10);
      const ids = new Set(questionnaire.items.map((item) => item.id));
      for (const id of drawn) expect(ids.has(id)).toBe(true);
    }
  });

  it("covers every dimension, on every run", () => {
    // The whole reason the draw is stratified. A plain random ten of thirty
    // misses a RIASEC letter about one run in six.
    for (let run = 0; run < 50; run += 1) {
      for (const questionnaire of [riasec, bigfive]) {
        const drawn = new Set(drawQuestionnaire(questionnaire, 10));
        const covered = new Set(
          questionnaire.items.filter((item) => drawn.has(item.id))
            .map((item) => item.dimension),
        );
        expect([...covered].sort()).toEqual(dimensionsOf(questionnaire).sort());
      }
    }
  });

  it("spreads the remainder instead of always loading the same dimension", () => {
    // Ten items over six RIASEC letters leaves four spare. If they always
    // landed on the same letters, those would be measured twice as precisely
    // as the rest on every run in the product's life.
    const extras = new Map<string, number>();
    const byId = new Map(riasec.items.map((item) => [item.id, item]));
    for (let run = 0; run < 60; run += 1) {
      const counts = new Map<string, number>();
      for (const id of drawQuestionnaire(riasec, 10)) {
        const dimension = byId.get(id)!.dimension;
        counts.set(dimension, (counts.get(dimension) ?? 0) + 1);
      }
      for (const [dimension, count] of counts) {
        if (count > 1) extras.set(dimension, (extras.get(dimension) ?? 0) + 1);
      }
    }
    expect(extras.size).toBe(dimensionsOf(riasec).length);
  });

  it("gives a different set almost every time", () => {
    const draws = new Set<string>();
    for (let run = 0; run < 40; run += 1) {
      draws.add(drawQuestionnaire(riasec, 10).sort().join(","));
    }
    expect(draws.size).toBeGreaterThan(20);
  });

  it("is reproducible when the randomness is", () => {
    const fixed = () => 0.37;
    expect(drawQuestionnaire(riasec, 10, fixed))
      .toEqual(drawQuestionnaire(riasec, 10, fixed));
  });

  it("keeps reverse-keyed statements in the mix", () => {
    /*
     * A personality inventory mixes "I am X" with "I am not X" to catch people
     * who agree with everything, so a draw that happened to take only the
     * positively-keyed items would quietly delete that check. Big Five carries
     * eight of twenty-five reverse-keyed; RIASEC carries none, because an
     * interest inventory asks what you enjoy and there is nothing to reverse.
     */
    expect(riasec.items.some((item) => item.reverse)).toBe(false);
    expect(bigfive.items.filter((item) => item.reverse).length).toBeGreaterThan(0);

    const byId = new Map(bigfive.items.map((item) => [item.id, item]));
    let runsWithReverse = 0;
    for (let run = 0; run < 30; run += 1) {
      const drawn = drawQuestionnaire(bigfive, 10);
      if (drawn.some((id) => byId.get(id)!.reverse)) runsWithReverse += 1;
    }
    expect(runsWithReverse).toBe(30);
  });
});

describe("scoring a drawn subset", () => {
  it("scores every dimension for real, never falling back to neutral", () => {
    const drawn = drawQuestionnaire(riasec, 10);
    const narrowed = narrowTo(riasec, drawn);
    // Answer everything at the top of the scale. A dimension that fell through
    // to the neutral default would come back as exactly 50.
    const answers = Object.fromEntries(narrowed.items.map((item) => [item.id, 5]));
    const scores = scoreQuestionnaire(answers, narrowed.items);

    for (const dimension of dimensionsOf(riasec)) {
      expect(scores[dimension], dimension).toBeDefined();
      expect(scores[dimension], dimension).not.toBe(50);
    }
  });
});

describe("narrowTo", () => {
  it("returns the items in the order they were drawn", () => {
    const drawn = drawQuestionnaire(riasec, 10);
    expect(narrowTo(riasec, drawn).items.map((item) => item.id)).toEqual(drawn);
  });

  it("falls back to the full instrument when stored ids have gone stale", () => {
    // A saved profile referencing items the catalog no longer has must not
    // leave the student with four questions.
    const stale = ["riasec_01", "does_not_exist", "also_gone"];
    expect(narrowTo(riasec, stale).items).toHaveLength(riasec.items.length);
    expect(narrowTo(riasec, []).items).toHaveLength(riasec.items.length);
  });
});
