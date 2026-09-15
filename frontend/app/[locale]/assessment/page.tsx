"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import LocationPicker from "@/components/LocationPicker";
import QuestionnaireFlow from "@/components/QuestionnaireFlow";
import { ErrorBox, Loading } from "@/components/ui";
import { loadBigFive, loadRiasec } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
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
const EMSAT_SUBJECTS = ["english", "math", "physics", "arabic"] as const;
const EMIRATES = [
  "abu_dhabi", "dubai", "sharjah", "ajman",
  "umm_al_quwain", "ras_al_khaimah", "fujairah",
] as const;
const TRACKS = ["general", "advanced", "elite"] as const;
const TOTAL_STEPS = 4;

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
  const [emsat, setEmsat] = useState<Record<string, string>>({});
  const [gradeErrors, setGradeErrors] = useState<Record<string, string>>({});
  const [emsatErrors, setEmsatErrors] = useState<Record<string, string>>({});
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
    setEmsat(
      Object.fromEntries(Object.entries(stored.emsat ?? {}).map(([k, v]) => [k, String(v)])),
    );
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
   * EmSAT stays optional, because it genuinely is — a grade 10 or 11 student
   * has not sat it. What is not optional is that a score they *do* type sits
   * on the real 500–1500 band.
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

    const badEmsat: Record<string, string> = {};
    for (const subject of EMSAT_SUBJECTS) {
      const raw = (emsat[subject] ?? "").trim();
      if (raw === "") continue;
      const value = Number(raw);
      if (!Number.isFinite(value) || value < 500 || value > 1500) {
        badEmsat[subject] = t.errors.emsatRange;
      }
    }

    setGradeErrors(badGrades);
    setEmsatErrors(badEmsat);
    return Object.keys(badGrades).length === 0 && Object.keys(badEmsat).length === 0;
  }, [grades, emsat, t.errors.required, t.errors.gradeRange, t.errors.emsatRange]);

  const riasecDone = riasec ? Object.keys(riasecAnswers).length >= riasec.items.length : false;
  const bigfiveDone = bigfive ? Object.keys(bigfiveAnswers).length >= bigfive.items.length : false;

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
            const numericEmsat = Object.fromEntries(
              Object.entries(emsat)
                .filter(([, value]) => value !== "")
                .map(([key, value]) => [key, Number(value)]),
            );
            void save({ grades: numericGrades, emsat: numericEmsat }, 3);
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
            <legend className="text-sm font-bold">
              {t.wizard.emsatTitle}
            </legend>
            <p className="mt-1 text-xs muted">{t.wizard.emsatHelp}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {EMSAT_SUBJECTS.map((subject) => {
                const invalid = Boolean(emsatErrors[subject]);
                return (
                  <div key={subject}>
                    <label htmlFor={`emsat-${subject}`} className="mb-1 block text-xs font-medium">
                      {t.subjects[subject]}
                    </label>
                    <input
                      id={`emsat-${subject}`}
                      type="number"
                      min={500}
                      max={1500}
                      inputMode="numeric"
                      dir="ltr"
                      aria-invalid={invalid}
                      aria-describedby={invalid ? `emsat-${subject}-error` : undefined}
                      value={emsat[subject] ?? ""}
                      onChange={(event) => {
                        setEmsat((current) => ({ ...current, [subject]: event.target.value }));
                        setEmsatErrors((current) => {
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
                        id={`emsat-${subject}-error`}
                        className="mt-1 text-[11px] text-[var(--color-uae-red-muted)] dark:text-red-400"
                      >
                        {emsatErrors[subject]}
                      </p>
                    )}
                  </div>
                );
              })}
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
      {step === 3 && riasec && (
        <QuestionnaireFlow
          questionnaire={riasec}
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
                riasec: riasec ? scoreQuestionnaire(riasecAnswers, riasec.items) : {},
              },
              4,
            )
          }
          submitLabel={t.wizard.next}
        />
      )}

      {step === 4 && bigfive && (
        <QuestionnaireFlow
          questionnaire={bigfive}
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
                bigfive: bigfive ? scoreQuestionnaire(bigfiveAnswers, bigfive.items) : {},
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
