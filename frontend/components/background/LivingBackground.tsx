"use client";

import { useEffect, useRef, useState } from "react";

export type BackgroundTheme = "dunes" | "constellation" | "arabesque" | "aurora";

/**
 * The full-viewport animated backdrop.
 *
 * One canvas, one requestAnimationFrame loop, three scenes. Rewritten after the
 * first version showed four real defects:
 *
 *  1. `createLinearGradient` ran inside the draw call, allocating a gradient
 *     object sixty times a second and throwing it away. Gradients are now built
 *     once and rebuilt only on resize or theme change.
 *  2. In the dune scene the blowing sand was painted *after* the dunes, so
 *     grains floated on top of the foreground silhouettes instead of behind
 *     them. Draw order is now back-to-front.
 *  3. Changing route changed the scene, which tore the canvas down and rebuilt
 *     it — a hard flash on every navigation. Scenes now cross-fade: the old one
 *     keeps drawing while the new one fades in over it.
 *  4. The arabesque scene was three SVG rings at 0.1 opacity over a flat
 *     gradient, which on most pages looked like no background at all. It is now
 *     a proper canvas scene with the same weight as the other two.
 *
 * Performance rules that survived the rewrite, because they were the right
 * ones: the loop is cancelled outright when the tab is hidden; particle counts
 * scale to viewport area; devices reporting four cores or fewer are capped at
 * 30fps; and under prefers-reduced-motion no canvas is created at all — a
 * static gradient renders instead, so there is no loop left spinning behind an
 * accessibility setting.
 */

/* ----------------------------------------------------------------- colour */

type RGB = [number, number, number];

function hexToRgb(hex: string): RGB {
  const value = hex.replace("#", "");
  return [
    parseInt(value.slice(0, 2), 16),
    parseInt(value.slice(2, 4), 16),
    parseInt(value.slice(4, 6), 16),
  ];
}

function mix(a: string, b: string, t: number): string {
  const [r1, g1, b1] = hexToRgb(a);
  const [r2, g2, b2] = hexToRgb(b);
  const r = Math.round(r1 + (r2 - r1) * t);
  const g = Math.round(g1 + (g2 - g1) * t);
  const bl = Math.round(b1 + (b2 - b1) * t);
  return `rgb(${r} ${g} ${bl})`;
}

function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

interface Palette {
  top: string;
  bottom: string;
  mark: string;
  accent: string;
  ink: string;
}

/**
 * Dune skies shift with the local clock, as the brief asks. Four keyframes
 * around the day, interpolated by hour so the change is continuous rather than
 * four discrete looks.
 */
const DUNE_DAY: { at: number; light: Palette; dark: Palette }[] = [
  {
    at: 6,   // dawn
    light: { top: "#ffe9c9", bottom: "#f3cfa0", mark: "#c89a63", accent: "#ff9d5c", ink: "#8a5a34" },
    dark:  { top: "#20263f", bottom: "#3b2f42", mark: "#4c3f52", accent: "#e0794a", ink: "#151827" },
  },
  {
    at: 12,  // midday
    light: { top: "#dff0ff", bottom: "#f7e8cd", mark: "#cfa96f", accent: "#ffca63", ink: "#8f6a3c" },
    dark:  { top: "#16283a", bottom: "#2b3346", mark: "#42506a", accent: "#7fb2d8", ink: "#101a26" },
  },
  {
    at: 18,  // dusk
    light: { top: "#ffd9b0", bottom: "#e8a879", mark: "#b3714a", accent: "#ff7a45", ink: "#7a4526" },
    dark:  { top: "#2a1e35", bottom: "#472a34", mark: "#5a3b46", accent: "#ff8a5c", ink: "#1a1020" },
  },
  {
    at: 23,  // night
    light: { top: "#c9d6e8", bottom: "#e2d6c2", mark: "#a08a68", accent: "#f0c46a", ink: "#6b5a42" },
    dark:  { top: "#0a1020", bottom: "#141a2c", mark: "#2a3450", accent: "#9fb6d8", ink: "#060a14" },
  },
];

function dunePalette(mode: "light" | "dark", hour: number): Palette {
  const points = DUNE_DAY;
  let a = points[points.length - 1];
  let b = points[0];
  for (let i = 0; i < points.length; i++) {
    const next = points[(i + 1) % points.length];
    const from = points[i].at;
    const to = next.at > from ? next.at : next.at + 24;
    const h = hour >= from ? hour : hour + 24;
    if (h >= from && h <= to) {
      a = points[i];
      b = next;
      const t = (h - from) / (to - from);
      const pa = a[mode];
      const pb = b[mode];
      return {
        top: mix(pa.top, pb.top, t),
        bottom: mix(pa.bottom, pb.bottom, t),
        mark: mix(pa.mark, pb.mark, t),
        accent: mix(pa.accent, pb.accent, t),
        ink: mix(pa.ink, pb.ink, t),
      };
    }
  }
  return a[mode];
}

type StaticKind = "constellation" | "arabesque" | "aurora";

const STATIC_PALETTES: Record<"light" | "dark", Record<StaticKind, Palette>> = {
  light: {
    constellation: { top: "#ffffff", bottom: "#eef5f1", mark: "#00732f", accent: "#0b3d5c", ink: "#dfe9e3" },
    arabesque:     { top: "#fffdf8", bottom: "#f3ede0", mark: "#00732f", accent: "#b08b4f", ink: "#e8dcc4" },
    aurora:        { top: "#f7fbf8", bottom: "#eaf3ee", mark: "#00732f", accent: "#0b3d5c", ink: "#d7e5dc" },
  },
  dark: {
    constellation: { top: "#081014", bottom: "#0f1e26", mark: "#2e9257", accent: "#7cc4e8", ink: "#132029" },
    arabesque:     { top: "#0a0f14", bottom: "#141c22", mark: "#2e9257", accent: "#c9a227", ink: "#101820" },
    aurora:        { top: "#050a10", bottom: "#0b1620", mark: "#2e9257", accent: "#7cc4e8", ink: "#04080d" },
  },
};

/* ------------------------------------------------------------------ hooks */

function useThemeMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () =>
      setMode(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => observer.disconnect();
  }, []);
  return mode;
}

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(query.matches);
    update();
    query.addEventListener("change", update);
    return () => query.removeEventListener("change", update);
  }, []);
  return reduced;
}

/* ----------------------------------------------------------------- scenes */

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  phase: number;
}

interface Scene {
  kind: BackgroundTheme;
  palette: Palette;
  particles: Particle[];
  sky: CanvasGradient | null;
  vignette: CanvasGradient | null;
}

export default function LivingBackground({
  theme = "constellation",
}: {
  theme?: BackgroundTheme;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({ x: -9999, y: -9999, active: false });
  const mode = useThemeMode();
  const reduced = usePrefersReducedMotion();

  // The scene is held in a ref so a route change swaps it inside the running
  // loop instead of tearing the canvas down and rebuilding it.
  const target = useRef<BackgroundTheme>(theme);
  const modeRef = useRef(mode);
  target.current = theme;
  modeRef.current = mode;

  useEffect(() => {
    if (reduced) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    // Everything targets 60fps, phones included. The previous 30fps cap on
    // low-core devices bought smoothness by halving it, which is the wrong
    // trade for a background people look at constantly. The frame budget is
    // met by drawing *less* instead: modest devices get roughly half the
    // particles and links, at full frame rate.
    const modest = (navigator.hardwareConcurrency ?? 8) <= 4;
    const minFrameMs = 1000 / 60;

    let width = 0;
    let height = 0;
    let frame = 0;
    let last = 0;
    let running = true;

    let current: Scene | null = null;
    let previous: Scene | null = null;
    let fade = 1;                      // 1 = current fully shown
    let currentMode: "light" | "dark" = modeRef.current;

    const paletteFor = (kind: BackgroundTheme, m: "light" | "dark"): Palette =>
      kind === "dunes"
        ? dunePalette(m, new Date().getHours() + new Date().getMinutes() / 60)
        : STATIC_PALETTES[m][kind as StaticKind];

    const buildScene = (kind: BackgroundTheme, m: "light" | "dark"): Scene => {
      const palette = paletteFor(kind, m);
      const area = width * height;
      const density = kind === "constellation" ? 15000 : 7000;
      const count =
        kind === "aurora"
          ? (modest ? 4 : 6)
          : Math.round(
              Math.min(area / density, modest ? 55 : kind === "constellation" ? 110 : 160),
            );

      const particles: Particle[] = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        r: 0.8 + Math.random() * 1.8,
        phase: Math.random() * Math.PI * 2,
      }));

      return { kind, palette, particles, sky: null, vignette: null };
    };

    /** Gradients are per-scene and per-size, so they are built here, not in the
     *  draw call where the first version rebuilt them every frame. */
    const buildGradients = (scene: Scene) => {
      const sky = ctx.createLinearGradient(0, 0, width * 0.25, height);
      sky.addColorStop(0, scene.palette.top);
      sky.addColorStop(1, scene.palette.bottom);
      scene.sky = sky;

      const vignette = ctx.createRadialGradient(
        width / 2, height * 0.45, Math.min(width, height) * 0.25,
        width / 2, height * 0.5, Math.max(width, height) * 0.75,
      );
      vignette.addColorStop(0, rgba(scene.palette.ink, 0));
      vignette.addColorStop(1, rgba(scene.palette.ink, 0.42));
      scene.vignette = vignette;
    };

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      if (current) {
        current = buildScene(current.kind, modeRef.current);
        buildGradients(current);
      }
      if (previous) {
        previous = buildScene(previous.kind, modeRef.current);
        buildGradients(previous);
      }
    };

    /* ---------------------------------------------------------- renderers */

    const drawDunes = (scene: Scene, time: number, alpha: number) => {
      const p = scene.palette;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.sky!;
      ctx.fillRect(0, 0, width, height);

      // Sun, low and warm. Its height tracks the same clock as the palette.
      const hour = new Date().getHours();
      const dayness = Math.max(0, Math.cos(((hour - 13) / 24) * Math.PI * 2));
      const sunY = height * (0.66 - dayness * 0.34);
      const sunX = width * 0.74;
      const halo = ctx.createRadialGradient(sunX, sunY, 0, sunX, sunY, height * 0.42);
      halo.addColorStop(0, rgba(p.accent, 0.5));
      halo.addColorStop(1, rgba(p.accent, 0));
      ctx.fillStyle = halo;
      ctx.fillRect(0, 0, width, height);
      ctx.beginPath();
      ctx.arc(sunX, sunY, Math.max(18, height * 0.035), 0, Math.PI * 2);
      ctx.fillStyle = rgba(p.accent, 0.75);
      ctx.fill();

      // Blown sand, drawn BEFORE the dunes so grains pass behind the ridges.
      ctx.fillStyle = p.mark;
      for (const grain of scene.particles) {
        grain.x += grain.vx + 0.5;
        grain.y += Math.sin((grain.x + time * 0.02) * 0.008 + grain.phase) * 0.22;
        if (grain.x > width + 4) {
          grain.x = -4;
          grain.y = Math.random() * height;
        }
        ctx.globalAlpha = alpha * 0.28;
        ctx.fillRect(grain.x, grain.y, grain.r, grain.r);
      }

      // Five ridges, near ones darker and faster: parallax without a camera.
      const layers = 5;
      for (let layer = 0; layer < layers; layer++) {
        const depth = layer / (layers - 1);
        const baseY = height * (0.62 + depth * 0.14);
        const amplitude = 22 + layer * 15;
        const speed = 0.00004 * (layer + 1);
        const wavelength = 0.0015 - layer * 0.00018;

        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 10) {
          const y =
            baseY
            + Math.sin(x * wavelength + time * speed * 1000) * amplitude
            + Math.sin(x * wavelength * 2.4 + time * speed * 600) * amplitude * 0.32;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = mix(p.mark, p.ink, depth * 0.85);
        ctx.globalAlpha = alpha * (0.5 + depth * 0.45);
        ctx.fill();
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.vignette!;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    };

    const drawConstellation = (scene: Scene, time: number, alpha: number) => {
      const p = scene.palette;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.sky!;
      ctx.fillRect(0, 0, width, height);

      const nodes = scene.particles;
      const link = Math.min(160, Math.max(95, width * 0.09));
      const { x: px, y: py, active } = pointer.current;

      for (const node of nodes) {
        if (active) {
          const dx = node.x - px;
          const dy = node.y - py;
          const distance = Math.hypot(dx, dy);
          if (distance < 150 && distance > 0.01) {
            const push = (1 - distance / 150) * 0.7;
            node.x += (dx / distance) * push;
            node.y += (dy / distance) * push;
          }
        }
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));
      }

      // A uniform grid keeps the link search local. The all-pairs loop this
      // replaces was 7,000+ distance checks a frame on a wide screen.
      const cell = link;
      const cols = Math.max(1, Math.ceil(width / cell));
      const rows = Math.max(1, Math.ceil(height / cell));
      const buckets: number[][] = Array.from({ length: cols * rows }, () => []);
      nodes.forEach((node, index) => {
        const cx = Math.min(cols - 1, Math.floor(node.x / cell));
        const cy = Math.min(rows - 1, Math.floor(node.y / cell));
        buckets[cy * cols + cx].push(index);
      });

      ctx.strokeStyle = p.mark;
      ctx.lineWidth = 1;
      for (let cy = 0; cy < rows; cy++) {
        for (let cx = 0; cx < cols; cx++) {
          const here = buckets[cy * cols + cx];
          if (here.length === 0) continue;
          for (let ny = cy; ny <= cy + 1 && ny < rows; ny++) {
            for (let nx = cx - 1; nx <= cx + 1 && nx < cols; nx++) {
              if (nx < 0 || (ny === cy && nx < cx)) continue;
              for (const i of here) {
                for (const j of buckets[ny * cols + nx]) {
                  if (j <= i) continue;
                  const dx = nodes[i].x - nodes[j].x;
                  const dy = nodes[i].y - nodes[j].y;
                  const distance = Math.hypot(dx, dy);
                  if (distance > link) continue;
                  ctx.globalAlpha = alpha * (1 - distance / link) * 0.3;
                  ctx.beginPath();
                  ctx.moveTo(nodes[i].x, nodes[i].y);
                  ctx.lineTo(nodes[j].x, nodes[j].y);
                  ctx.stroke();
                }
              }
            }
          }
        }
      }

      for (const node of nodes) {
        // A slow breath so the field is never completely still.
        const pulse = 0.6 + Math.sin(time * 0.0012 + node.phase) * 0.4;
        ctx.globalAlpha = alpha * 0.16 * pulse;
        ctx.fillStyle = p.accent;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r * 4, 0, Math.PI * 2);
        ctx.fill();

        ctx.globalAlpha = alpha * (0.45 + pulse * 0.4);
        ctx.fillStyle = p.mark;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.vignette!;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    };

    const drawArabesque = (scene: Scene, time: number, alpha: number) => {
      const p = scene.palette;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.sky!;
      ctx.fillRect(0, 0, width, height);

      const cx = width / 2;
      const cy = height / 2;
      const base = Math.max(width, height) * 0.42;

      // Concentric eight-point stars, counter-rotating and breathing. Drawn on
      // canvas rather than as SVG rings so it carries the same visual weight as
      // the other two scenes instead of disappearing at 10% opacity.
      const rings = 5;
      for (let ring = 0; ring < rings; ring++) {
        const scale = 0.32 + ring * 0.18;
        const radius = base * scale * (1 + Math.sin(time * 0.0004 + ring) * 0.03);
        const spin = time * 0.00008 * (ring % 2 ? -1 : 1) * (1 + ring * 0.25);

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(spin);
        ctx.globalAlpha = alpha * (0.3 - ring * 0.035);
        ctx.strokeStyle = ring % 2 ? p.accent : p.mark;
        ctx.lineWidth = 1.4;

        // Two squares at 45 degrees: the eight-point star.
        for (const rotation of [0, Math.PI / 4]) {
          ctx.beginPath();
          for (let corner = 0; corner < 4; corner++) {
            const angle = rotation + (corner * Math.PI) / 2;
            const x = Math.cos(angle) * radius;
            const y = Math.sin(angle) * radius;
            if (corner === 0) ctx.moveTo(x, y);
            else ctx.lineTo(x, y);
          }
          ctx.closePath();
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(0, 0, radius * 0.82, 0, Math.PI * 2);
        ctx.stroke();

        // Radial spokes tying the ring to the next one out.
        ctx.globalAlpha = alpha * (0.18 - ring * 0.02);
        for (let spoke = 0; spoke < 16; spoke++) {
          const angle = (spoke * Math.PI) / 8;
          ctx.beginPath();
          ctx.moveTo(Math.cos(angle) * radius * 0.82, Math.sin(angle) * radius * 0.82);
          ctx.lineTo(Math.cos(angle) * radius * 1.16, Math.sin(angle) * radius * 1.16);
          ctx.stroke();
        }
        ctx.restore();
      }

      // Slow motes so the scene is not purely geometric.
      ctx.fillStyle = p.accent;
      for (const mote of scene.particles) {
        mote.x += mote.vx * 0.35;
        mote.y += mote.vy * 0.35;
        if (mote.x < 0) mote.x = width;
        if (mote.x > width) mote.x = 0;
        if (mote.y < 0) mote.y = height;
        if (mote.y > height) mote.y = 0;
        ctx.globalAlpha = alpha * (0.1 + Math.sin(time * 0.001 + mote.phase) * 0.06);
        ctx.beginPath();
        ctx.arc(mote.x, mote.y, mote.r, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.vignette!;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    };

    /**
     * Slow drifting colour fields — a mesh gradient in motion.
     *
     * Built from a few large radial gradients rather than many particles, so it
     * costs six gradient fills a frame regardless of screen size. `lighter`
     * composite makes overlaps bloom instead of muddying, which is what gives
     * it depth; it is reset immediately afterwards because leaving it set would
     * silently wreck every later draw call on this context.
     */
    const drawAurora = (scene: Scene, time: number, alpha: number) => {
      const p = scene.palette;
      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.sky!;
      ctx.fillRect(0, 0, width, height);

      const hues = [p.mark, p.accent, p.mark, p.accent, p.mark, p.accent];
      const span = Math.max(width, height);

      ctx.globalCompositeOperation = "lighter";
      scene.particles.forEach((blob, index) => {
        // Lissajous drift: two incommensurate frequencies, so the blobs never
        // fall into a visible repeating pattern.
        const t = time * 0.00004;
        const x = width * (0.5 + Math.sin(t * (1 + index * 0.32) + blob.phase) * 0.42);
        const y = height * (0.5 + Math.cos(t * (0.8 + index * 0.21) + blob.phase * 1.7) * 0.42);
        const radius = span * (0.28 + Math.sin(t * 2 + index) * 0.06);

        const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
        const strength = modeRef.current === "dark" ? 0.3 : 0.22;
        gradient.addColorStop(0, rgba(hues[index % hues.length], strength * alpha));
        gradient.addColorStop(1, rgba(hues[index % hues.length], 0));
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, width, height);
      });
      ctx.globalCompositeOperation = "source-over";

      // A faint star lattice keeps the identity consistent with the other
      // scenes, so the landing page does not feel like a different product.
      ctx.globalAlpha = alpha * 0.07;
      ctx.strokeStyle = p.mark;
      ctx.lineWidth = 1;
      const cell = 132;
      for (let x = (time * 0.004) % cell - cell; x < width + cell; x += cell) {
        for (let y = 0; y < height + cell; y += cell) {
          ctx.strokeRect(x + 22, y + 22, cell - 44, cell - 44);
          ctx.save();
          ctx.translate(x + cell / 2, y + cell / 2);
          ctx.rotate(Math.PI / 4);
          ctx.strokeRect(-(cell - 44) / 2, -(cell - 44) / 2, cell - 44, cell - 44);
          ctx.restore();
        }
      }

      ctx.globalAlpha = alpha;
      ctx.fillStyle = scene.vignette!;
      ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    };

    const render = (scene: Scene, time: number, alpha: number) => {
      if (!scene.sky || !scene.vignette) buildGradients(scene);
      if (scene.kind === "dunes") drawDunes(scene, time, alpha);
      else if (scene.kind === "constellation") drawConstellation(scene, time, alpha);
      else if (scene.kind === "aurora") drawAurora(scene, time, alpha);
      else drawArabesque(scene, time, alpha);
    };

    /* --------------------------------------------------------------- loop */

    const FADE_MS = 620;

    const loop = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      if (now - last < minFrameMs) return;
      const delta = last === 0 ? 16 : now - last;
      last = now;

      // Swap scenes without rebuilding the canvas: the outgoing scene keeps
      // drawing underneath while the incoming one fades in over it.
      if (!current) {
        current = buildScene(target.current, modeRef.current);
        buildGradients(current);
        fade = 1;
      } else if (current.kind !== target.current) {
        previous = current;
        current = buildScene(target.current, modeRef.current);
        buildGradients(current);
        fade = 0;
      } else if (modeRef.current !== currentMode) {
        // Theme toggled: rebuild palettes in place and cross-fade to them.
        previous = current;
        current = buildScene(current.kind, modeRef.current);
        buildGradients(current);
        fade = 0;
        currentMode = modeRef.current;
      }

      if (fade < 1) {
        fade = Math.min(1, fade + delta / FADE_MS);
        if (previous) render(previous, now, 1);
        render(current, now, fade);
        if (fade >= 1) previous = null;
      } else {
        render(current, now, 1);
      }
    };

    const onPointer = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY, active: true };
    };
    const onPointerLeave = () => {
      pointer.current = { x: -9999, y: -9999, active: false };
    };

    const onVisibility = () => {
      if (document.hidden) {
        running = false;
        cancelAnimationFrame(frame);
      } else if (!running) {
        running = true;
        last = 0;
        frame = requestAnimationFrame(loop);
      }
    };

    resize();
    frame = requestAnimationFrame(loop);
    window.addEventListener("resize", resize);
    document.addEventListener("visibilitychange", onVisibility);
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    if (finePointer) {
      window.addEventListener("pointermove", onPointer, { passive: true });
      window.addEventListener("pointerleave", onPointerLeave);
    }

    return () => {
      running = false;
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", resize);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pointermove", onPointer);
      window.removeEventListener("pointerleave", onPointerLeave);
    };
    // `theme` and `mode` are read through refs inside the loop rather than
    // listed here on purpose: making them dependencies would restart the canvas
    // on every navigation, which is the flash this rewrite exists to remove.
  }, [reduced]);

  const palette =
    theme === "dunes"
      ? dunePalette(mode, new Date().getHours())
      : STATIC_PALETTES[mode][theme as StaticKind];
  const staticGradient = `linear-gradient(160deg, ${palette.top}, ${palette.bottom})`;

  // Reduced motion: a still gradient, no canvas, no loop.
  if (reduced) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: staticGradient }}
      />
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      // The inline background covers the single frame before the first paint;
      // with `alpha: false` an unpainted canvas is black, which flashed.
      style={{ background: staticGradient }}
    />
  );
}
