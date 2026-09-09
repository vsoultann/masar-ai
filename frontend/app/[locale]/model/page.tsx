"use client";

import { useEffect, useState } from "react";

import SmartImage from "@/components/SmartImage";
import { ModelComparisonChart } from "@/components/charts";
import { Chip, Loading, Meter, SectionHeading, StatTile } from "@/components/ui";
import { localiseDigits } from "@/lib/i18n";
import { useLocale } from "@/lib/locale-context";
import { loadModel } from "@/lib/ml/inference";

interface ComparisonRow {
  cv_accuracy_mean: number;
  cv_macro_f1_mean: number;
  test: { accuracy: number; macro_f1: number };
}

interface Metrics {
  comparison: Record<string, ComparisonRow>;
  selected: { name?: string; test: { accuracy: number; macro_f1: number } };
  dataset: { rows: number };
  featureImportance: Record<string, number>;
  classes: string[];
}

/**
 * Model transparency.
 *
 * The numbers here are read from the same bundle the recommender uses, not
 * copied into the page — so they cannot fall out of date relative to the model
 * actually running.
 *
 * The limitations section is not a disclaimer bolted on at the end. The dataset
 * is synthetic, and a page that reported 66% accuracy without saying what that
 * number is measured against would be misleading a reader who has every reason
 * to assume it means "right about real students two times in three".
 */
export default function ModelPage() {
  const { locale, t } = useLocale();
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [info, setInfo] = useState<{ model: string; trainedAt: string; rows: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    loadModel()
      .then((bundle) => {
        if (cancelled) return;
        setMetrics(bundle.metrics as unknown as Metrics);
        setInfo({
          model: bundle.generatedFrom.model,
          trainedAt: bundle.generatedFrom.trainedAt,
          rows: bundle.generatedFrom.datasetRows,
        });
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, []);

  if (!metrics || !info) {
    return (
      <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <Loading />
      </div>
    );
  }

  const pct = (value: number) => `${localiseDigits((value * 100).toFixed(1), locale)}%`;
  const importance = Object.entries(metrics.featureImportance).slice(0, 10);
  const maxImportance = Math.max(...importance.map(([, value]) => Math.abs(value)), 0.0001);

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
      <header>
        <h1 className="text-2xl font-black sm:text-3xl">{t.model.title}</h1>
        <p className="mt-2 max-w-2xl muted">{t.model.subtitle}</p>
      </header>

      <div className="mt-6 grid gap-3 sm:grid-cols-4">
        <StatTile label={t.model.accuracy} value={pct(metrics.selected.test.accuracy)} />
        <StatTile label={t.model.macroF1} value={pct(metrics.selected.test.macro_f1)} />
        <StatTile label={t.model.dataset} value={localiseDigits(info.rows, locale)} />
        <StatTile label={t.model.classes} value={localiseDigits(metrics.classes.length, locale)} />
      </div>

      <section className="mt-10">
        <SectionHeading title={t.model.comparison} />
        <div className="card p-4">
          <ModelComparisonChart
            data={Object.entries(metrics.comparison).map(([model, row]) => ({
              model,
              cv: row.cv_accuracy_mean,
              f1: row.cv_macro_f1_mean,
              test: row.test.accuracy,
            }))}
          />
          <div className="mt-3 flex flex-wrap gap-1.5">
            {Object.keys(metrics.comparison).map((model) => (
              <Chip key={model} tone={model === info.model ? "brand" : "neutral"}>
                {model.replace(/_/g, " ")} —{" "}
                {model === info.model ? t.model.selected : t.model.benchmark}
              </Chip>
            ))}
          </div>
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading title={t.model.featureImportance} />
        <div className="grid gap-2 sm:grid-cols-2">
          {importance.map(([feature, value]) => (
            <Meter
              key={feature}
              value={Math.round((Math.abs(value) / maxImportance) * 100)}
              label={feature.replace(/_/g, " ")}
              right={value.toFixed(3)}
            />
          ))}
        </div>
      </section>

      <section className="mt-10">
        <SectionHeading title={t.model.confusionMatrix} />
        {/* Rendered by ml/evaluate.py and committed as an artifact, so the
            figure on this page is the one in the documentation. */}
        <SmartImage
          src="/images/model/confusion_matrix.png" /* asset-ok: SmartImage prefixes it */
          alt={t.model.confusionMatrix}
          seed="confusion-matrix"
          aspect="4 / 3"
        />
      </section>

      <section className="mt-10">
        <SectionHeading title={t.model.honesty} />
        <div className="card space-y-4 p-5 leading-relaxed">
          <p>{t.model.syntheticNote}</p>
          <p>{t.model.proseNote}</p>
          <p>{t.model.parityNote}</p>
          <p className="text-sm muted">
            {t.model.trainedAt}:{" "}
            {new Date(info.trainedAt).toLocaleString(locale === "ar" ? "ar-AE" : "en-GB")}
          </p>
        </div>
      </section>
    </div>
  );
}
