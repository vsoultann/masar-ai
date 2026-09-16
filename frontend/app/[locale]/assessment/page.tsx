"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import LocationPicker from "@/components/LocationPicker";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { ErrorBox, Loading } from "@/components/ui";
import { loadBigFive, loadRiasec } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { drawQuestionnaire, narrowTo } from "@/lib/questionnaire";
import { scoreQuestionnaire } from "@/lib/scoring";
import { emptyProfile, useProfile } from "@/lib/store/profile";
import type { Profile, Questionnaire } from "@/lib/types";

/*
 * The six core subjects, and only those.
 *
 * The wizard used to ask for nine, including Islamic studies, social studies
 * and computer science. Those are not taken by every student on every MOE
 * track, so the form asked most people for marks they did not have and then
 * accepted the blanks silently. Six subjects everyone sits is a form that can
 * reasonably be made mandatory, which is the point.
 *
 * The model still has features for the other three; the inference pipeline
 * imputes a missing grade, exactly as it already did whenever a student left
 * one of them blank. Nothing needs retraining.
 */
const SUBJECTS = [
  "math", "physics", "biology", "chemistry", "english", "arabic",
] as const;
/*
 * SAT and IELTS replaced EmSAT here.
 *
 * Both stay optional, and for different reasons: a grade 10 or 11 student has
 * not sat the SAT yet, and plenty of UAE programmes never ask for IELTS at all.
 * What is not optional is that a score someone *does* type sits on the real
 * scale — a 9.5 IELTS band or a 2000 SAT is a typo, and silently storing it
 * would put a number in the profile that cannot exist.
 */
const SAT_RANGE = [400, 1600] as const;
const IELTS_RANGE = [4, 9] as const;
const EMIRATES = [
  "abu_dhabi", "dubai", "sharjah", "ajman",
  "umm_al_quwain", "ras_al_khaimah", "fujairah",
] as const;
const TRACKS = ["general", "advanced", "elite"] as const;
const TOTAL_STEPS = 4;

/*
 * Ten statements each, drawn from the thirty-item RIASEC inventory and the
 * twenty-five-item Big Five.
 *
 * Fifty-five statements was the single longest thing in the product and the
 * commonest place to give up. Ten per instrument is short enough to finish and,
 * because the draw is stratified by dimension, still scores every letter and
 * every trait rather than leaving some at a neutral default.
 */
const QUESTIONNAIRE_LENGTH = 10;

/**
 * The four-step assessment.
 *
 * Everything persists to localStorage as the student advances, so they can
 * close the tab and come back — the brief asks for resumable progress, and
 * with no account that has to be the device's job.
 *
 * There is no sign-in step. Entering a name in step 1 creates the local
 * profile; asking someone to register an account before an anonymous,
 * device-local questionnaire would be friction with nothing behind it.
 */
/**
 * One optional standardised-test score.
 *
 * SAT and IELTS are the same control with different bounds, and writing it
 * twice invites the two copies to drift — which is how the EmSAT block ended
 * up validating a range the label did not mention.
 */
function OptionalScore({
  id, label, value, onChange, min, max, step, error, clearError,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (next: string) => void;
  min: number;
  max: number;
  step: number;
  error?: string;
  clearError: () => void;
}) {
  const invalid = Boolean(error);
  return (
    <div>
      <label htmlFor={`test-${id}`} className="mb-1 block text-xs font-medium">
        {label}
      </label>
      <input
        id={`test-${id}`}
        type="number"
        min={min}
        max={max}
        step={step}
        inputMode="decimal"
        dir="ltr"
        aria-invalid={invalid}
        aria-describedby={invalid ? `test-${id}-error` : undefined}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
          clearError();
        }}
        className={`field ${invalid ? "border-[var(--color-uae-red-muted)]" : ""}`}
      />
      {invalid && (
        <p
          id={`test-${id}-error`}
          className="mt-1 text-[11px] text-[var(--color-uae-red-muted)] dark:text-red-400"
        >
          {error}
        </p>
      )}
    </div>
  );
}

export default function AssessmentPage() {
  const { locale, t } = useLocale();
  const router = useRouter();

  const profile = useProfile((state) => state.profile);
  const hydrated = useProfile((state) => state.hydrated);
  const createProfile = useProfile((state) => state.create);
  const updateProfile = useProfile((state) => state.update);

  const [step, setStep] = useState(1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  // step 1
  const [fullName, setFullName] = useState("");
  const [emirate, setEmirate] = useState("");
  const [city, setCity] = useState("");
  const [coordinates, setCoordinates] =
    useState<{ lat: number; lng: number } | null>(null);
  const [locationSource, setLocationSource] =
    useState<Profile["locationSource"]>(null);
  const [school, setSchool] = useState("");
  const [gradeLevel, setGradeLevel] = useState("12");
  const [track, setTrack] = useState("general");
  // step 2
  const [grades, setGrades] = useState<Record<string, string>>({});
  const [sat, setSat] = useState("");
  const [ielts, setIelts] = useState("");
  const [gradeErrors, setGradeErrors] = useState<Record<string, string>>({});
  const [testErrors, setTestErrors] = useState<Record<string, string>>({});
  // steps 3 and 4
  const [riasec, setRiasec] = useState<Questionnaire | null>(null);
  const [bigfive, setBigfive] = useState<Questionnaire | null>(null);
  const [riasecAnswers, setRiasecAnswers] = useState<Record<string, number>>({});
  const [bigfiveAnswers, setBigfiveAnswers] = useState<Record<string, number>>({});

  useEffect(() => {
    Promise.all([loadRiasec(), loadBigFive()])
      .then(([riasecQuestionnaire, bigfiveQuestionnaire]) => {
        setRiasec(riasecQuestionnaire);
        setBigfive(bigfiveQuestionnaire);
      })
      .catch(() => setError(t.common.error));
  }, [t.common.error]);

  // Keyed on the profile id, not the profile object: this effect seeds the form
  // from stored values, and re-running it on every store write would overwrite
  // whatever the student is currently typing.
  const profileId = profile?.id;

  useEffect(() => {
    if (!hydrated) return;
    const stored = useProfile.getState().profile;
    if (!stored) return;

    setFullName(stored.fullName);
    setEmirate(stored.emirate ?? "");
    setCity(stored.city ?? "");
    setCoordinates(stored.coordinates);
    setLocationSource(stored.locationSource);
    setSchool(stored.school ?? "");
    setGradeLevel(stored.gradeLevel ?? "12");
    setTrack(stored.track ?? "general");
    setGrades(
      Object.fromEntries(Object.entries(stored.grades ?? {}).map(([k, v]) => [k, String(v)])),
    );
    setSat(stored.sat === null || stored.sat === undefined ? "" : String(stored.sat));
    setIelts(stored.ielts === null || stored.ielts === undefined ? "" : String(stored.ielts));
    setRiasecAnswers(stored.riasecAnswers ?? {});
    setBigfiveAnswers(stored.bigfiveAnswers ?? {});
    // Resume where the student stopped rather than restarting at step 1.
    setStep(Math.min(TOTAL_STEPS, (stored.completedSteps ?? 0) + 1));
  }, [hydrated, profileId]);

  /**
   * Persist questionnaire answers as they are given, not only on submit.
   *
   * The brief asks for per-step resumability, but a thirty-item questionnaire
   * that only saves at the end means closing the tab on item 29 throws away
   * twenty-nine answers — and the flow's "resume at the first unanswered item"
   * would be a promise it could not keep. Writing each answer through makes
   * that promise true. `completedSteps` is untouched here: the step is not
   * complete until it is submitted.
   */
  useEffect(() => {
    if (!hydrated || Object.keys(riasecAnswers).length === 0) return;
    updateProfile({ riasecAnswers });
  }, [riasecAnswers, hydrated, updateProfile]);

  useEffect(() => {
    if (!hydrated || Object.keys(bigfiveAnswers).length === 0) return;
    updateProfile({ bigfiveAnswers });
  }, [bigfiveAnswers, hydrated, updateProfile]);

  /**
   * Applies one step's data and advances.
   *
   * `completedSteps` only ever moves forward: a student revisiting step 2 to
   * correct a grade must not lose the questionnaires they already finished.
   */
  const save = useCallback(
    (patch: Partial<Profile>, nextStep: number) => {
      setBusy(true);
      setError(null);
      try {
        const existing = useProfile.getState().profile;
        if (!existing) {
          const name = typeof patch.fullName === "string" ? patch.fullName : "";
          createProfile(name || emptyProfile("").fullName);
        }
        const current = useProfile.getState().profile;
        updateProfile({
          ...patch,
          completedSteps: Math.max(current?.completedSteps ?? 0, nextStep - 1),
        });
        setNotice(t.wizard.saved);
        window.setTimeout(() => setNotice(null), 1800);

        if (nextStep > TOTAL_STEPS) {
          router.push(`/${locale}/results`);
          return;
        }
        setStep(nextStep);
        window.scrollTo({ top: 0, behavior: "smooth" });
      } catch {
        setError(t.common.error);
      } finally {
        setBusy(false);
      }
    },
    [createProfile, updateProfile, locale, router, t.common.error, t.wizard.saved],
  );

  /**
   * Grades must be complete and in range before step 2 will advance.
   *
   * Previously a blank was filtered out on submit and the student went
   * through with nothing entered — the recommender then ran on an entirely
   * imputed academic profile and returned ten careers with the confidence of
   * a real answer. Refusing to continue is the honest behaviour: the
   * recommendation is only worth what went into it.
   *
   * SAT and IELTS stay optional, because they genuinely are — a grade 10 or
   * 11 student has sat neither, and plenty of UAE programmes never ask for
   * IELTS. What is not optional is that a score they *do* type sits on the
   * real scale.
   */
  const validateGrades = useCallback(() => {
    const badGrades: Record<string, string> = {};
    for (const subject of SUBJECTS) {
      const raw = (grades[subject] ?? "").trim();
      if (raw === "") {
        badGrades[subject] = t.errors.required;
        continue;
      }
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 0 || value > 100) {
        badGrades[subject] = t.errors.gradeRange;
      }
    }

    const badTests: Record<string, string> = {};
    const checkOptional = (
      key: string, raw: string, [min, max]: readonly [number, number], message: string,
    ) => {
      const value = raw.trim();
      if (value === "") return;
      const parsed = Number(value);
      if (!Number.isFinite(parsed) || parsed < min || parsed > max) badTests[key] = message;
    };
    checkOptional("sat", sat, SAT_RANGE, t.errors.satRange);
    checkOptional("ielts", ielts, IELTS_RANGE, t.errors.ieltsRange);

    setGradeErrors(badGrades);
    setTestErrors(badTests);
    return Object.keys(badGrades).length === 0 && Object.keys(badTests).length === 0;
  }, [grades, sat, ielts, t.errors.required, t.errors.gradeRange,
      t.errors.satRange, t.errors.ieltsRange]);

  /*
   * The drawn subset, held on the profile.
   *
   * Drawn once, the first time the student reaches the step, and then reused —
   * a fresh draw on every mount would change the questions under a
   * half-finished run and make "answer every statement" impossible to satisfy.
   * Starting the assessment over clears the ids, so the next run is a new ten.
   */
  useEffect(() => {
    if (!hydrated || !riasec || !bigfive) return;
    const stored = useProfile.getState().profile;
    if (!stored) return;
    const patch: Partial<Profile> = {};
    if ((stored.riasecItems ?? []).length === 0) {
      patch.riasecItems = drawQuestionnaire(riasec, QUESTIONNAIRE_LENGTH);
    }
    if ((stored.bigfiveItems ?? []).length === 0) {
      patch.bigfiveItems = drawQuestionnaire(bigfive, QUESTIONNAIRE_LENGTH);
    }
    if (Object.keys(patch).length > 0) updateProfile(patch);
  }, [hydrated, riasec, bigfive, profileId, updateProfile]);

  /*
   * Null until the draw exists, not "the full inventory until the draw exists".
   *
   * narrowTo falls back to the whole instrument for an empty id list, which is
   * right for a stale saved profile and wrong for the single frame between
   * mount and the effect above: the student saw statement 1 of 30 and then
   * watched it swap for a different statement as the draw landed.
   */
  const riasecIds = profile?.riasecItems ?? [];
  const bigfiveIds = profile?.bigfiveItems ?? [];
  const riasecDrawn = riasec && riasecIds.length > 0 ? narrowTo(riasec, riasecIds) : null;
  const bigfiveDrawn = bigfive && bigfiveIds.length > 0 ? narrowTo(bigfive, bigfiveIds) : null;

  const riasecDone = riasecDrawn
    ? Object.keys(riasecAnswers).length >= riasecDrawn.items.length
    : false;
  const bigfiveDone = bigfiveDrawn
    ? Object.keys(bigfiveAnswers).length >= bigfiveDrawn.items.length
    : false;

  const stepTitles = useMemo(
    () => [t.wizard.s1Title, t.wizard.s2Title, t.wizard.s3Title, t.wizard.s4Title],
    [t],
  );

  if (!hydrated || (!riasec && !error)) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
        <Loading />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <h1 className="text-gradient text-2xl font-black">{t.wizard.title}</h1>
      <p className="mt-1.5 text-sm muted">{t.wizard.subtitle}</p>

      {/* progress */}
      <ol className="mt-6 grid grid-cols-4 gap-2" aria-label={t.wizard.title}>
        {stepTitles.map((title, index) => {
          const number = index + 1;
          const done = (profile?.completedSteps ?? 0) >= number;
          const active = step === number;
          return (
            <li key={title}>
              <button
                type="button"
                onClick={() => setStep(number)}
                aria-current={active ? "step" : undefined}
                className={`w-full rounded-lg border p-2.5 text-start transition-colors ${
                  active
                    ? "border-[var(--brand)] bg-[var(--brand)]/10"
                    : done
                      ? "border-[var(--brand)]/40"
                      : ""
                }`}
              >
                <span className="block text-[11px] muted ltr-nums">
                  {t.wizard.step} {localiseDigits(number, locale)} {t.wizard.of}{" "}
                  {localiseDigits(TOTAL_STEPS, locale)}
                </span>
                <span className="mt-0.5 block text-xs font-semibold leading-tight">
                  {done && (
                    <span aria-hidden="true" className="text-[var(--brand)]">
                      ✓{" "}
                    </span>
                  )}
                  {title}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {error && (
        <div className="mt-5">
          <ErrorBox message={error} />
        </div>
      )}
      {notice && (
        <p role="status" className="mt-4 text-sm font-medium text-[var(--brand)]">
          {notice}
        </p>
      )}

      {/* ------------------------------------------------------------- step 1 */}
      {step === 1 && (
        <form
          className="card mt-6 space-y-4 p-6"
          onSubmit={(event) => {
            event.preventDefault();
            void save(
              {
                fullName: fullName.trim(),
                emirate: emirate || null,
                city: city || null,
                coordinates,
                locationSource,
                school: school.trim() || null,
                gradeLevel,
                track,
              },
              2,
            );
          }}
        >
          <fieldset className="space-y-4">
            <legend className="text-sm font-bold">{t.wizard.s1Legend}</legend>

            <div>
              <label htmlFor="wiz-name" className="mb-1 block text-sm font-medium">
                {t.wizard.fullName}
              </label>
              <input
                id="wiz-name"
                required
                minLength={2}
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                className="field"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor="wiz-emirate" className="mb-1 block text-sm font-medium">
                  {t.wizard.emirate}
                </label>
                <select
                  id="wiz-emirate"
                  required
                  value={emirate}
                  onChange={(event) => setEmirate(event.target.value)}
                  className="field"
                >
                  <option value="" disabled>
                    —
                  </option>
                  {EMIRATES.map((item) => (
                    <option key={item} value={item}>
                      {t.emirates[item]}
                    </option>
                  ))}
                </select>
              </div>

              {/* City, and the optional geolocation shortcut. Both feed the
                  distance ranking on the university matching page. */}
              {emirate && (
                <LocationPicker
                  emirate={emirate}
                  city={city}
                  onCityChange={setCity}
                  onCoordinates={(next, source) => {
                    setCoordinates(next);
                    setLocationSource(source);
                  }}
                />
              )}

              <div>
                <label htmlFor="wiz-school" className="mb-1 block text-sm font-medium">
                  {t.wizard.school}
                </label>
                <input
                  id="wiz-school"
                  required
                  minLength={2}
                  value={school}
                  onChange={(event) => setSchool(event.target.value)}
                  className="field"
                />
              </div>

              <div>
                <label htmlFor="wiz-grade" className="mb-1 block text-sm font-medium">
                  {t.wizard.gradeLevel}
                </label>
                <select
                  id="wiz-grade"
                  value={gradeLevel}
                  onChange={(event) => setGradeLevel(event.target.value)}
                  className="field"
                >
                  <option value="10">{t.wizard.grade10}</option>
                  <option value="11">{t.wizard.grade11}</option>
                  <option value="12">{t.wizard.grade12}</option>
                  <option value="graduate">{t.wizard.graduate}</option>
                </select>
              </div>

              <div>
                <label htmlFor="wiz-track" className="mb-1 block text-sm font-medium">
                  {t.wizard.track}
                </label>
                <select
                  id="wiz-track"
                  value={track}
                  onChange={(event) => setTrack(event.target.value)}
                  className="field"
                >
                  {TRACKS.map((item) => (
                    <option key={item} value={item}>
                      {t.tracks[item]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>

          <button type="submit" disabled={busy} className="btn btn-primary w-full">
            {busy ? t.wizard.saving : t.wizard.next}
          </button>
        </form>
      )}

      {/* ------------------------------------------------------------- step 2 */}
      {step === 2 && (
        <form
          className="card mt-6 space-y-6 p-6"
          noValidate
          onSubmit={(event) => {
            event.preventDefault();
            if (!validateGrades()) {
              setError(t.wizard.s2Incomplete);
              return;
            }
            setError(null);
            const numericGrades = Object.fromEntries(
              Object.entries(grades)
                .filter(([, value]) => value !== "")
                .map(([key, value]) => [key, Number(value)]),
            );
            const optional = (raw: string) =>
              raw.trim() === "" ? null : Number(raw);
            void save(
              { grades: numericGrades, sat: optional(sat), ielts: optional(ielts) },
              3,
            );
          }}
        >
          <fieldset>
            <legend className="text-sm font-bold">{t.wizard.s2Legend}</legend>
            <p className="mt-1 text-xs muted">{t.wizard.s2Help}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {SUBJECTS.map((subject) => {
                const invalid = Boolean(gradeErrors[subject]);
                return (
                  <div key={subject}>
                    {/* The asterisk sits outside the <label>, not inside it.
                        Inside, it becomes part of the label's text, which
                        breaks every lookup by label text — including the ones
                        the test suite uses — and adds a spoken "star" to the
                        field's name. `required` on the input is what actually
                        tells assistive technology the field is mandatory; this
                        is decoration for everyone else. */}
                    <div className="mb-1 flex items-baseline gap-1">
                      <label
                        htmlFor={`grade-${subject}`}
                        className="block text-xs font-medium"
                      >
                        {t.subjects[subject]}
                      </label>
                      <span aria-hidden="true" className="text-[11px] text-[var(--color-uae-red-muted)]">
                        *
                      </span>
                    </div>
                    <input
                      id={`grade-${subject}`}
                      type="number"
                      required
                      min={0}
                      max={100}
                      inputMode="numeric"
                      dir="ltr"
                      aria-invalid={invalid}
                      aria-describedby={invalid ? `grade-${subject}-error` : undefined}
                      value={grades[subject] ?? ""}
                      onChange={(event) => {
                        setGrades((current) => ({ ...current, [subject]: event.target.value }));
                        // Clear this field's error as soon as it is touched:
                        // leaving it up while someone types reads as the form
                        // arguing with them.
                        setGradeErrors((current) => {
                          if (!current[subject]) return current;
                          const next = { ...current };
                          delete next[subject];
                          return next;
                        });
                      }}
                      className={`field ${invalid ? "border-[var(--color-uae-red-muted)]" : ""}`}
                    />
                    {invalid && (
                      <p
                        id={`grade-${subject}-error`}
                        className="mt-1 text-[11px] text-[var(--color-uae-red-muted)] dark:text-red-400"
                      >
                        {gradeErrors[subject]}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold">{t.wizard.satTitle}</legend>
            <p className="mt-1 text-xs muted">{t.wizard.satHelp}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <OptionalScore
                id="sat"
                label={t.wizard.satLabel}
                value={sat}
                onChange={setSat}
                min={SAT_RANGE[0]}
                max={SAT_RANGE[1]}
                step={10}
                error={testErrors.sat}
                clearError={() => setTestErrors(({ sat: _drop, ...rest }) => rest)}
              />
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold">{t.wizard.ieltsTitle}</legend>
            <p className="mt-1 text-xs muted">{t.wizard.ieltsHelp}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <OptionalScore
                id="ielts"
                label={t.wizard.ieltsLabel}
                value={ielts}
                onChange={setIelts}
                min={IELTS_RANGE[0]}
                max={IELTS_RANGE[1]}
                step={0.5}
                error={testErrors.ielts}
                clearError={() => setTestErrors(({ ielts: _drop, ...rest }) => rest)}
              />
            </div>
          </fieldset>

          <div className="flex gap-3">
            <button type="button" onClick={() => setStep(1)} className="btn btn-ghost">
              {t.wizard.back}
            </button>
            <button type="submit" disabled={busy} className="btn btn-primary flex-1">
              {busy ? t.wizard.saving : t.wizard.next}
            </button>
          </div>
        </form>
      )}

      {/* --------------------------------------------------------- steps 3 & 4 */}
      {step === 3 && !riasecDrawn && <Loading />}
      {step === 3 && riasecDrawn && (
        <QuestionnaireFlow
          questionnaire={riasecDrawn}
          answers={riasecAnswers}
          setAnswers={setRiasecAnswers}
          legend={t.wizard.s3Legend}
          help={t.wizard.s3Help}
          complete={riasecDone}
          busy={busy}
          onBack={() => setStep(2)}
          onSubmit={() =>
            void save(
              {
                riasecAnswers,
                // Scored here because there is no server to score it.
                riasec: riasecDrawn
                  ? scoreQuestionnaire(riasecAnswers, riasecDrawn.items)
                  : {},
              },
              4,
            )
          }
          submitLabel={t.wizard.next}
        />
      )}

      {step === 4 && !bigfiveDrawn && <Loading />}
      {step === 4 && bigfiveDrawn && (
        <QuestionnaireFlow
          questionnaire={bigfiveDrawn}
          answers={bigfiveAnswers}
          setAnswers={setBigfiveAnswers}
          legend={t.wizard.s4Legend}
          help={t.wizard.s4Help}
          complete={bigfiveDone}
          busy={busy}
          onBack={() => setStep(3)}
          onSubmit={() =>
            void save(
              {
                bigfiveAnswers,
                bigfive: bigfiveDrawn
                  ? scoreQuestionnaire(bigfiveAnswers, bigfiveDrawn.items)
                  : {},
              },
              5,
            )
          }
          submitLabel={t.wizard.finish}
        />
      )}
    </div>
  );
}
