"use client";

import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { useLocale } from "@/lib/locale-context";

/**
 * Chart notes
 * -----------
 * Recharts renders SVG laid out in physical coordinates, so the charts stay
 * left-to-right even on the Arabic side; globals.css forces `direction: ltr`
 * on the chart wrapper. What *is* localised is every label and tooltip.
 *
 * Colours come from the UAE palette and are distinguishable in both themes.
 * Every series is also labelled, so colour is never the only channel carrying
 * meaning.
 *
 * Series keys are fixed strings and the translated label goes through `name`.
 * Deriving a `dataKey` from the UI language would make the key language
 * dependent, which is a bug waiting for the first person who renames a label.
 */
const GREEN = "#00732f";
const BLUE = "#0b3d5c";
const SAND = "#b08d3f";

const axisStyle = { fontSize: 11, fill: "var(--ink-2)" };

/**
 * Recharts animates every series on mount using requestAnimationFrame. That is
 * pleasant by default and wrong for two audiences: people who have asked their
 * system for reduced motion, and any renderer that does not run animation
 * frames (headless screenshots, print), where an un-animated chart stays
 * collapsed at zero and shows nothing at all.
 */
function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(query.matches);
    const listener = (event: MediaQueryListEvent) => setReduced(event.matches);
    query.addEventListener("change", listener);
    return () => query.removeEventListener("change", listener);
  }, []);

  return reduced;
}

function ChartFrame({ children, height = 260 }: { children: React.ReactElement; height?: number }) {
  return (
    <div style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {children}
      </ResponsiveContainer>
    </div>
  );
}

const tooltipStyle = {
  background: "var(--surface)",
  border: "1px solid var(--line)",
  borderRadius: 8,
  fontSize: 12,
  color: "var(--ink)",
};

export function RiasecRadar({ scores }: { scores: Record<string, number> }) {
  const { t } = useLocale();
  const animate = !usePrefersReducedMotion();
  const data = (["R", "I", "A", "S", "E", "C"] as const).map((code) => ({
    axis: t.riasec[code],
    value: Math.round(scores[code] ?? 0),
  }));
  return (
    <ChartFrame>
      <RadarChart data={data} outerRadius="72%">
        <PolarGrid stroke="var(--line)" />
        <PolarAngleAxis dataKey="axis" tick={axisStyle} />
        <PolarRadiusAxis domain={[0, 100]} tick={{ ...axisStyle, fontSize: 9 }} />
        <Radar
          dataKey="value"
          stroke={GREEN}
          fill={GREEN}
          fillOpacity={0.35}
          isAnimationActive={animate}
        />
        <Tooltip contentStyle={tooltipStyle} />
      </RadarChart>
    </ChartFrame>
  );
}

export function BigFiveBars({ scores }: { scores: Record<string, number> }) {
  const { t } = useLocale();
  const animate = !usePrefersReducedMotion();
  const data = (["O", "C", "E", "A", "N"] as const).map((code) => ({
    trait: t.bigfive[code],
    value: Math.round(scores[code] ?? 0),
  }));
  return (
    <ChartFrame>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="trait" tick={axisStyle} interval={0} height={50} angle={-18} dy={12} />
        <YAxis domain={[0, 100]} tick={axisStyle} width={32} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-3)" }} />
        <Bar dataKey="value" fill={BLUE} radius={[4, 4, 0, 0]} isAnimationActive={animate} />
      </BarChart>
    </ChartFrame>
  );
}

export interface GapDatum {
  skill: string;
  current: number;
  required: number;
}

/** Skill gap as a radar when there are enough axes, a bar chart otherwise.
 *  A radar with three or four axes is unreadable, so we switch. */
export function SkillGapChart({ data }: { data: GapDatum[] }) {
  const { t } = useLocale();
  const animate = !usePrefersReducedMotion();
  // Series keys stay fixed ("current"/"required") and the translated strings go
  // through `name`. Using the translated label as the dataKey looked tidier but
  // silently drew nothing: the key has to match the field in the row objects,
  // and tying it to the UI language makes that a language-dependent bug.
  const currentLabel = t.dashboard.gapCurrent;
  const requiredLabel = t.dashboard.gapRequired;
  const rows = data.map((row) => ({
    skill: row.skill,
    current: Math.round(row.current),
    required: Math.round(row.required),
  }));

  if (data.length >= 5) {
    return (
      <ChartFrame height={330}>
        <RadarChart data={rows} outerRadius="68%">
          <PolarGrid stroke="var(--line)" />
          <PolarAngleAxis dataKey="skill" tick={{ ...axisStyle, fontSize: 10 }} />
          <PolarRadiusAxis
            domain={[0, 100]}
            angle={90}
            tick={{ ...axisStyle, fontSize: 9 }}
          />
          <Radar
            name={requiredLabel}
            dataKey="required"
            stroke={BLUE}
            fill={BLUE}
            fillOpacity={0.15}
            strokeDasharray="4 3"
            isAnimationActive={animate}
          />
          <Radar
            name={currentLabel}
            dataKey="current"
            stroke={GREEN}
            fill={GREEN}
            fillOpacity={0.4}
            isAnimationActive={animate}
          />
          <Legend wrapperStyle={{ fontSize: 12 }} />
          <Tooltip contentStyle={tooltipStyle} />
        </RadarChart>
      </ChartFrame>
    );
  }

  return (
    <ChartFrame height={280}>
      <BarChart data={rows} layout="vertical" margin={{ left: 8, right: 12 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
        <XAxis type="number" domain={[0, 100]} tick={axisStyle} />
        <YAxis type="category" dataKey="skill" width={130} tick={{ ...axisStyle, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-3)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          name={currentLabel}
          dataKey="current"
          fill={GREEN}
          radius={[0, 4, 4, 0]}
          isAnimationActive={animate}
        />
        <Bar
          name={requiredLabel}
          dataKey="required"
          fill={BLUE}
          radius={[0, 4, 4, 0]}
          isAnimationActive={animate}
        />
      </BarChart>
    </ChartFrame>
  );
}

export function SectorDistribution({
  data,
}: {
  data: { name: string; value: number; color: string }[];
}) {
  const animate = !usePrefersReducedMotion();
  return (
    <ChartFrame height={Math.max(220, data.length * 26)}>
      <BarChart data={data} layout="vertical" margin={{ left: 8, right: 24 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" horizontal={false} />
        <XAxis type="number" tick={axisStyle} allowDecimals={false} />
        <YAxis type="category" dataKey="name" width={150} tick={{ ...axisStyle, fontSize: 10 }} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-3)" }} />
        <Bar dataKey="value" radius={[0, 4, 4, 0]} isAnimationActive={animate}>
          {data.map((row) => (
            <Cell key={row.name} fill={row.color || SAND} />
          ))}
        </Bar>
      </BarChart>
    </ChartFrame>
  );
}

export function ModelComparisonChart({
  data,
}: {
  data: { model: string; cv: number; f1: number; test: number }[];
}) {
  const { t } = useLocale();
  const animate = !usePrefersReducedMotion();
  const rows = data.map((row) => ({
    model: row.model.replace(/_/g, " "),
    cv: row.cv,
    f1: row.f1,
    test: row.test,
  }));
  return (
    <ChartFrame height={280}>
      <BarChart data={rows} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
        <XAxis dataKey="model" tick={axisStyle} />
        <YAxis domain={[0, 1]} tick={axisStyle} width={38} />
        <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--surface-3)" }} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar
          name={t.admin.cvAccuracy}
          dataKey="cv"
          fill={GREEN}
          radius={[4, 4, 0, 0]}
          isAnimationActive={animate}
        />
        <Bar
          name={t.admin.cvF1}
          dataKey="f1"
          fill={BLUE}
          radius={[4, 4, 0, 0]}
          isAnimationActive={animate}
        />
        <Bar
          name={t.admin.testAccuracy}
          dataKey="test"
          fill={SAND}
          radius={[4, 4, 0, 0]}
          isAnimationActive={animate}
        />
      </BarChart>
    </ChartFrame>
  );
}
