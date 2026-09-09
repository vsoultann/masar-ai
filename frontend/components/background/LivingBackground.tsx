"use client";

import { useEffect, useRef, useState } from "react";

export type BackgroundTheme = "dunes" | "constellation" | "arabesque";

/**
 * The full-viewport animated backdrop.
 *
 * Performance is the whole design constraint here, because this runs on every
 * page for the entire session:
 *
 *  - one requestAnimationFrame loop, never a timer per particle;
 *  - the loop is cancelled outright when the tab is hidden, so a backgrounded
 *    tab costs nothing;
 *  - particle count scales with viewport area rather than being a fixed number,
 *    so a phone does not run a desktop's workload;
 *  - devices reporting <= 4 cores are treated as low-power and capped at 30fps;
 *  - prefers-reduced-motion skips the canvas entirely and paints a static
 *    gradient instead -- no hidden rAF loop left spinning.
 *
 * Dunes and Constellation are canvas: they are particle systems, and drawing a
 * few hundred moving points as DOM nodes would be wasteful. Arabesque is SVG,
 * because it is a handful of stroked paths doing a slow rotation, which is what
 * SVG plus a CSS transform is genuinely best at.
 */

interface Palette {
  sky: [string, string];
  marks: string;
  accent: string;
}

const PALETTES: Record<"light" | "dark", Record<BackgroundTheme, Palette>> = {
  light: {
    dunes: { sky: ["#fdf8ee", "#f2e4c9"], marks: "#c8a870", accent: "#00732f" },
    constellation: { sky: ["#ffffff", "#f2f7f4"], marks: "#00732f", accent: "#0b3d5c" },
    arabesque: { sky: ["#ffffff", "#f7f4ec"], marks: "#00732f", accent: "#0b3d5c" },
  },
  dark: {
    dunes: { sky: ["#0b1418", "#16232a"], marks: "#3b5a63", accent: "#2e9257" },
    constellation: { sky: ["#0a1216", "#101d24"], marks: "#2e9257", accent: "#7cc4e8" },
    arabesque: { sky: ["#0a1216", "#111e25"], marks: "#2e9257", accent: "#7cc4e8" },
  },
};

function useThemeMode(): "light" | "dark" {
  const [mode, setMode] = useState<"light" | "dark">("light");
  useEffect(() => {
    const read = () =>
      setMode(
        document.documentElement.dataset.theme === "dark" ? "dark" : "light",
      );
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

export default function LivingBackground({
  theme = "constellation",
}: {
  theme?: BackgroundTheme;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const pointer = useRef({ x: -9999, y: -9999 });
  const mode = useThemeMode();
  const reduced = usePrefersReducedMotion();

  useEffect(() => {
    if (reduced || theme === "arabesque") return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { alpha: false });
    if (!ctx) return;

    const palette = PALETTES[mode][theme];
    // Low-power heuristic: core count is the only signal available everywhere.
    const lowPower = (navigator.hardwareConcurrency ?? 8) <= 4;
    const minFrameMs = lowPower ? 1000 / 30 : 1000 / 60;

    let width = 0;
    let height = 0;
    let dpr = 1;
    let frame = 0;
    let last = 0;
    let running = true;

    interface Node { x: number; y: number; vx: number; vy: number; r: number }
    let nodes: Node[] = [];

    const resize = () => {
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      // Scale the population to the area so a 4K monitor and a phone both look
      // right and cost about the same per pixel.
      const area = width * height;
      const density = theme === "constellation" ? 14000 : 9000;
      const count = Math.round(Math.min(area / density, lowPower ? 45 : 120));
      nodes = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.28,
        vy: (Math.random() - 0.5) * 0.28,
        r: 0.9 + Math.random() * 1.7,
      }));
    };

    const paintSky = () => {
      const gradient = ctx.createLinearGradient(0, 0, 0, height);
      gradient.addColorStop(0, palette.sky[0]);
      gradient.addColorStop(1, palette.sky[1]);
      ctx.fillStyle = gradient;
      ctx.fillRect(0, 0, width, height);
    };

    /** Layered sine dunes drifting at different speeds, plus blown sand. */
    const drawDunes = (t: number) => {
      paintSky();
      const layers = 4;
      for (let layer = 0; layer < layers; layer++) {
        const depth = layer / (layers - 1);
        const baseY = height * (0.55 + depth * 0.16);
        const amplitude = 26 + layer * 16;
        const speed = 0.000045 * (layer + 1);
        const wavelength = 0.0016 - layer * 0.00022;

        ctx.beginPath();
        ctx.moveTo(0, height);
        for (let x = 0; x <= width; x += 8) {
          const y =
            baseY +
            Math.sin(x * wavelength + t * speed * 1000) * amplitude +
            Math.sin(x * wavelength * 2.3 + t * speed * 620) * amplitude * 0.35;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(width, height);
        ctx.closePath();
        ctx.fillStyle = palette.marks;
        ctx.globalAlpha = 0.1 + depth * 0.16;
        ctx.fill();
      }
      ctx.globalAlpha = 1;

      // Sand grains blowing across the frame.
      ctx.fillStyle = palette.marks;
      for (const node of nodes) {
        node.x += node.vx + 0.45;
        node.y += Math.sin((node.x + t * 0.02) * 0.01) * 0.16;
        if (node.x > width + 4) node.x = -4;
        if (node.y > height) node.y = 0;
        ctx.globalAlpha = 0.22;
        ctx.fillRect(node.x, node.y, node.r, node.r);
      }
      ctx.globalAlpha = 1;
    };

    /** Drifting nodes, linked when close, gently repelled by the cursor. */
    const drawConstellation = () => {
      paintSky();
      const linkDistance = Math.min(150, Math.max(90, width * 0.09));
      const { x: px, y: py } = pointer.current;

      for (const node of nodes) {
        const dx = node.x - px;
        const dy = node.y - py;
        const distance = Math.hypot(dx, dy);
        if (distance < 120 && distance > 0.01) {
          const push = (1 - distance / 120) * 0.6;
          node.x += (dx / distance) * push;
          node.y += (dy / distance) * push;
        }
        node.x += node.vx;
        node.y += node.vy;
        if (node.x < 0 || node.x > width) node.vx *= -1;
        if (node.y < 0 || node.y > height) node.vy *= -1;
        node.x = Math.max(0, Math.min(width, node.x));
        node.y = Math.max(0, Math.min(height, node.y));
      }

      ctx.strokeStyle = palette.marks;
      ctx.lineWidth = 1;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const distance = Math.hypot(dx, dy);
          if (distance > linkDistance) continue;
          ctx.globalAlpha = (1 - distance / linkDistance) * 0.22;
          ctx.beginPath();
          ctx.moveTo(nodes[i].x, nodes[i].y);
          ctx.lineTo(nodes[j].x, nodes[j].y);
          ctx.stroke();
        }
      }

      ctx.globalAlpha = 0.55;
      ctx.fillStyle = palette.accent;
      for (const node of nodes) {
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    };

    const loop = (now: number) => {
      if (!running) return;
      frame = requestAnimationFrame(loop);
      if (now - last < minFrameMs) return;
      last = now;
      if (theme === "dunes") drawDunes(now);
      else drawConstellation();
    };

    const onPointer = (event: PointerEvent) => {
      pointer.current = { x: event.clientX, y: event.clientY };
    };
    const onPointerLeave = () => {
      pointer.current = { x: -9999, y: -9999 };
    };

    // A hidden tab must cost nothing, so the loop is cancelled rather than
    // left running against a throttled clock.
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
    if (theme === "constellation" && window.matchMedia("(pointer: fine)").matches) {
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
  }, [theme, mode, reduced]);

  const palette = PALETTES[mode][theme];
  const staticGradient = `linear-gradient(180deg, ${palette.sky[0]}, ${palette.sky[1]})`;

  // Reduced motion: a still gradient, with no canvas and no loop.
  if (reduced) {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10"
        style={{ background: staticGradient }}
      />
    );
  }

  if (theme === "arabesque") {
    return (
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden"
        style={{ background: staticGradient }}
      >
        <ArabesqueBloom colour={palette.marks} accent={palette.accent} />
      </div>
    );
  }

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className="pointer-events-none fixed inset-0 -z-10"
      style={{ background: staticGradient }}
    />
  );
}

/**
 * An eight-point Islamic star, rotating slowly and breathing between two radii.
 * Pure SVG plus CSS keyframes: no JavaScript runs per frame, so this costs
 * essentially nothing next to the canvas themes.
 */
function ArabesqueBloom({ colour, accent }: { colour: string; accent: string }) {
  const rings = [
    { size: 620, duration: 150, opacity: 0.1, stroke: colour },
    { size: 420, duration: 105, opacity: 0.13, stroke: accent },
    { size: 260, duration: 75, opacity: 0.1, stroke: colour },
  ];

  return (
    <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
      {rings.map((ring, index) => (
        <svg
          key={ring.size}
          width={ring.size}
          height={ring.size}
          viewBox="0 0 200 200"
          className="absolute left-1/2 top-1/2"
          style={{
            marginLeft: -ring.size / 2,
            marginTop: -ring.size / 2,
            opacity: ring.opacity,
            animation: `masar-spin ${ring.duration}s linear infinite${
              index % 2 ? " reverse" : ""
            }`,
          }}
        >
          <g fill="none" stroke={ring.stroke} strokeWidth="0.8">
            {/* Two overlaid squares at 45 degrees make the eight-point star. */}
            <rect x="45" y="45" width="110" height="110" />
            <rect
              x="45"
              y="45"
              width="110"
              height="110"
              transform="rotate(45 100 100)"
            />
            <circle cx="100" cy="100" r="55" />
            <circle cx="100" cy="100" r="78" />
            {Array.from({ length: 8 }, (_, i) => {
              const angle = (i * Math.PI) / 4;
              return (
                <line
                  key={i}
                  x1={100 + Math.cos(angle) * 55}
                  y1={100 + Math.sin(angle) * 55}
                  x2={100 + Math.cos(angle) * 78}
                  y2={100 + Math.sin(angle) * 78}
                />
              );
            })}
          </g>
        </svg>
      ))}
    </div>
  );
}
