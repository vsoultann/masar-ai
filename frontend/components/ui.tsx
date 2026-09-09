"use client";

import { useLocale } from "@/lib/locale-context";
import { localiseDigits } from "@/lib/i18n";

export function Loading({ label }: { label?: string }) {
  const { t } = useLocale();
  return (
    <div role="status" className="flex items-center gap-3 py-10 muted">
      <span
        aria-hidden="true"
        className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--line)] border-t-[var(--brand)]"
      />
      <span className="text-sm">{label ?? t.common.loading}</span>
    </div>
  );
}

export function ErrorBox({ message, onRetry }: { message: string; onRetry?: () => void }) {
  const { t } = useLocale();
  return (
    <div role="alert" className="card p-4 border-[var(--color-uae-red-muted)]">
      <p className="text-sm font-medium">{t.common.error}</p>
      <p className="mt-1 text-sm muted">{message}</p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn btn-ghost mt-3 !py-1.5 text-sm">
          {t.common.retry}
        </button>
      )}
    </div>
  );
}

export function EmptyState({ message }: { message: string }) {
  return (
    <div className="card grid place-items-center px-6 py-12 text-center">
      <p className="text-sm muted">{message}</p>
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`animate-pulse rounded-md bg-[var(--surface-3)] ${className}`}
    />
  );
}

const DEMAND_STYLES: Record<string, string> = {
  very_high: "bg-[var(--color-uae-red-muted)] text-white",
  high: "bg-[var(--brand)] text-[var(--brand-ink)]",
  moderate: "bg-[var(--surface-3)] text-[var(--ink-2)]",
};

export function DemandBadge({ demand }: { demand: string }) {
  const { t } = useLocale();
  const label =
    demand === "very_high"
      ? t.common.veryHigh
      : demand === "high"
        ? t.common.high
        : t.common.moderate;
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
        DEMAND_STYLES[demand] ?? DEMAND_STYLES.moderate
      }`}
    >
      {t.careers.demand}: {label}
    </span>
  );
}

export function Chip({
  children,
  tone = "neutral",
}: {
  children: React.ReactNode;
  tone?: "neutral" | "brand" | "accent" | "warn";
}) {
  const tones = {
    neutral: "bg-[var(--surface-3)] text-[var(--ink-2)]",
    brand: "bg-[var(--brand)]/12 text-[var(--brand)]",
    accent: "bg-[var(--accent)]/12 text-[var(--accent)]",
    // Amber rather than red: "warn" is used for an indicative eligibility
    // shortfall, and red would read as a rejection the data cannot support.
    warn: "bg-amber-500/15 text-amber-700 dark:text-amber-400",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** A labelled 0-100 bar. Used for skills, readiness and sector probability. */
export function Meter({
  value,
  max = 100,
  label,
  right,
  color,
}: {
  value: number;
  max?: number;
  label?: string;
  right?: string;
  color?: string;
}) {
  const percent = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div>
      {(label || right) && (
        <div className="mb-1 flex items-baseline justify-between gap-3 text-xs">
          <span className="truncate">{label}</span>
          <span className="muted ltr-nums shrink-0">{right}</span>
        </div>
      )}
      <div
        role="meter"
        aria-valuenow={Math.round(value)}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label}
        className="h-2 w-full overflow-hidden rounded-full bg-[var(--surface-3)]"
      >
        <div
          className="h-full rounded-full transition-[width] duration-500"
          style={{ width: `${percent}%`, background: color ?? "var(--brand)" }}
        />
      </div>
    </div>
  );
}

export function StatTile({
  value,
  label,
  hint,
}: {
  value: string | number;
  label: string;
  hint?: string;
}) {
  const { locale } = useLocale();
  return (
    <div className="card p-4">
      <p className="text-2xl font-bold ltr-nums">{localiseDigits(value, locale)}</p>
      <p className="mt-0.5 text-sm font-medium">{label}</p>
      {hint && <p className="mt-1 text-xs muted">{hint}</p>}
    </div>
  );
}

export function SectionHeading({
  title,
  subtitle,
  id,
}: {
  title: string;
  subtitle?: string;
  id?: string;
}) {
  return (
    <div className="mb-5">
      <h2 id={id} className="text-xl font-bold sm:text-2xl">
        {title}
      </h2>
      {subtitle && <p className="mt-1 text-sm muted max-w-2xl">{subtitle}</p>}
    </div>
  );
}
