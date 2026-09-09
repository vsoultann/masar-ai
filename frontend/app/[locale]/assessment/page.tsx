"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";

import LocationPicker from "@/components/LocationPicker";
import { ErrorBox, Loading } from "@/components/ui";
import { loadBigFive, loadRiasec } from "@/lib/data/client";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { scoreQuestionnaire } from "@/lib/scoring";
import { emptyProfile, useProfile } from "@/lib/store/profile";
import type { Profile, Questionnaire } from "@/lib/types";

const SUBJECTS = [
  "arabic", "english", "math", "physics", "chemistry",
  "biology", "islamic", "social", "computer_science",
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
      <h1 className="text-2xl font-black">{t.wizard.title}</h1>
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
          onSubmit={(event) => {
            event.preventDefault();
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
              {SUBJECTS.map((subject) => (
                <div key={subject}>
                  <label htmlFor={`grade-${subject}`} className="mb-1 block text-xs font-medium">
                    {t.subjects[subject]}
                  </label>
                  <input
                    id={`grade-${subject}`}
                    type="number"
                    min={0}
                    max={100}
                    inputMode="numeric"
                    dir="ltr"
                    value={grades[subject] ?? ""}
                    onChange={(event) =>
                      setGrades((current) => ({ ...current, [subject]: event.target.value }))
                    }
                    className="field"
                  />
                </div>
              ))}
            </div>
          </fieldset>

          <fieldset>
            <legend className="text-sm font-bold">
              {t.wizard.emsatTitle}
            </legend>
            <p className="mt-1 text-xs muted">{t.wizard.emsatHelp}</p>
            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {EMSAT_SUBJECTS.map((subject) => (
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
                    value={emsat[subject] ?? ""}
                    onChange={(event) =>
                      setEmsat((current) => ({ ...current, [subject]: event.target.value }))
                    }
                    className="field"
                  />
                </div>
              ))}
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
        <QuestionnaireStep
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
        <QuestionnaireStep
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

/** Steps 3 and 4 differ only in their content, so they share one component. */
function QuestionnaireStep({
  questionnaire,
  answers,
  setAnswers,
  legend,
  help,
  complete,
  busy,
  onBack,
  onSubmit,
  submitLabel,
}: {
  questionnaire: Questionnaire;
  answers: Record<string, number>;
  setAnswers: (updater: (current: Record<string, number>) => Record<string, number>) => void;
  legend: string;
  help: string;
  complete: boolean;
  busy: boolean;
  onBack: () => void;
  onSubmit: () => void;
  submitLabel: string;
}) {
  const { locale, t, pick } = useLocale();
  const answered = Object.keys(answers).length;
  const total = questionnaire.items.length;

  return (
    <form
      className="card mt-6 space-y-5 p-6"
      onSubmit={(event) => {
        event.preventDefault();
        onSubmit();
      }}
    >
      <fieldset>
        <legend className="text-sm font-bold">{legend}</legend>
        <p className="mt-1 text-xs muted">{help}</p>

        <div className="sticky top-16 z-10 -mx-6 mt-4 border-y bg-[var(--surface-2)] px-6 py-2.5">
          <p className="text-xs font-medium ltr-nums" aria-live="polite">
            {localiseDigits(answered, locale)} / {localiseDigits(total, locale)}{" "}
            {t.wizard.answered}
          </p>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-[var(--surface-3)]">
            <div
              className="h-full rounded-full bg-[var(--brand)] transition-[width] duration-300"
              style={{ width: `${(answered / total) * 100}%` }}
            />
          </div>
        </div>

        <ol className="mt-5 space-y-5">
          {questionnaire.items.map((item, index) => (
            <li key={item.id}>
              <fieldset>
                <legend className="text-sm leading-relaxed">
                  <span className="muted ltr-nums">{localiseDigits(index + 1, locale)}. </span>
                  {pick(item, "text")}
                </legend>
                <div className="mt-2.5 flex flex-wrap gap-1.5">
                  {questionnaire.scale.map((point) => {
                    const selected = answers[item.id] === point.value;
                    return (
                      <label
                        key={point.value}
                        className={`cursor-pointer rounded-lg border px-3 py-1.5 text-xs transition-colors ${
                          selected
                            ? "border-[var(--brand)] bg-[var(--brand)] font-semibold text-[var(--brand-ink)]"
                            : "hover:bg-[var(--surface-3)]"
                        }`}
                      >
                        <input
                          type="radio"
                          name={item.id}
                          value={point.value}
                          checked={selected}
                          onChange={() =>
                            setAnswers((current) => ({ ...current, [item.id]: point.value }))
                          }
                          className="sr-only"
                        />
                        {pick(point, "label")}
                      </label>
                    );
                  })}
                </div>
              </fieldset>
            </li>
          ))}
        </ol>
      </fieldset>

      {!complete && <p className="text-xs muted">{t.wizard.mustAnswerAll}</p>}

      <div className="flex gap-3">
        <button type="button" onClick={onBack} className="btn btn-ghost">
          {t.wizard.back}
        </button>
        <button type="submit" disabled={busy || !complete} className="btn btn-primary flex-1">
          {busy ? t.wizard.saving : submitLabel}
        </button>
      </div>
    </form>
  );
}
