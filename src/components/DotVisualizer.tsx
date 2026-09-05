import { useEffect, useRef } from "react";
import { analyserData, analyserTimeData } from "@/lib/audio";
import { createSpectrum, spectrumLevels } from "@/lib/spectrum";

export type VisualMode = "spectrum" | "mirror" | "radial" | "wave";

export const VISUAL_MODES: VisualMode[] = ["spectrum", "mirror", "radial", "wave"];

// Dot-matrix visualizers for the cover slot.
// Same grid as the icons: pitch 10, dot radius 4.5.
// Canvas backing is 280x280, displayed at 112px → rendered dot = 3.6px,
// exactly the icon/slider dot size.
const COLS = 28;
const ROWS = 28;
const P = 10;
const R = 4.5;
const LIT = "#e8b800";
const DIM = "#2b2b2b";
const CC = COLS / 2 - 0.5; // grid center in cell units (13.5)
const MAX_R = Math.sqrt(CC * CC + CC * CC); // corner distance (~19.09)
const RING_R0 = 4; // radial mode inner hole radius (cells)

type Ctx2D = CanvasRenderingContext2D;

function dot(g: Ctx2D, x: number, y: number, on: boolean) {
  g.fillStyle = on ? LIT : DIM;
  g.beginPath();
  g.arc(x * P + P / 2, y * P + P / 2, R, 0, Math.PI * 2);
  g.fill();
}

export default function DotVisualizer({
  active,
  mode,
}: {
  active: boolean;
  mode: VisualMode;
}) {
  const ref = useRef<HTMLCanvasElement>(null);
  const modeRef = useRef(mode);
  modeRef.current = mode;

  useEffect(() => {
    let raf = 0;
    let t = 0;
    const spec = createSpectrum(COLS);

    const draw = () => {
      const cv = ref.current;
      const g = cv?.getContext("2d") ?? null;
      if (cv && g) {
        g.clearRect(0, 0, cv.width, cv.height);
        const m = modeRef.current;
        if (m === "wave") {
          drawWave(g, t, active);
        } else if (m === "radial") {
          drawRadial(g, t, active, spec);
        } else {
          drawBars(g, t, active, m === "mirror", spec);
        }
      }
      t += 1;
      raf = requestAnimationFrame(draw);
    };

    // Vertical bars from the bottom (spectrum) or mirrored around center.
    const drawBars = (
      g: Ctx2D,
      t: number,
      active: boolean,
      mirror: boolean,
      spec: { peaks: Float32Array },
    ) => {
      const data = active ? analyserData() : null;
      const levels = data && data.length > 0 ? spectrumLevels(data, COLS, spec) : null;
      for (let x = 0; x < COLS; x++) {
        let level: number;
        let peak = 0;
        if (levels) {
          level = levels[x] ?? 0;
          peak = spec.peaks[x] ?? 0;
        } else {
          level = 0.15 + 0.12 * Math.sin(t / 24 + x * 0.55);
        }
        if (!active) level *= 0.5;
        if (mirror) {
          const half = (level * ROWS) / 2;
          for (let y = 0; y < ROWS; y++) {
            const c = ROWS - 1 - y - (ROWS / 2 - 0.5); // 0 = center
            dot(g, x, y, Math.abs(c) < half);
          }
        } else {
          const lit = Math.round(level * ROWS);
          const peakRow = Math.min(ROWS - 1, Math.floor(peak * ROWS));
          for (let y = 0; y < ROWS; y++) {
            const row = ROWS - 1 - y; // 0 = bottom
            const isOn = row < lit || (peak > 0.01 && row === peakRow && row >= lit);
            dot(g, x, y, isOn);
          }
        }
      }
    };

    // Radial sunburst: angle = frequency sector, radius = level.
    const drawRadial = (g: Ctx2D, t: number, active: boolean, spec: { peaks: Float32Array }) => {
      const data = active ? analyserData() : null;
      const levels = data && data.length > 0 ? spectrumLevels(data, COLS, spec) : null;
      for (let y = 0; y < ROWS; y++) {
        for (let x = 0; x < COLS; x++) {
          const dx = x - CC;
          const dy = (ROWS - 1 - y) - CC; // y-up
          const r = Math.sqrt(dx * dx + dy * dy);
          if (r < RING_R0 - 0.5) {
            dot(g, x, y, false);
            continue;
          }
          let angle = Math.atan2(dy, dx); // -PI..PI
          if (angle < 0) angle += Math.PI * 2;
          const sector = Math.min(COLS - 1, Math.floor((angle / (Math.PI * 2)) * COLS));
          let level: number;
          if (levels) {
            level = levels[sector] ?? 0;
          } else {
            level = 0.3 + 0.2 * Math.sin(t / 30 + sector * 0.45);
          }
          if (!active) level *= 0.5;
          dot(g, x, y, r <= RING_R0 + level * (MAX_R - RING_R0));
        }
      }
    };

    // Oscilloscope: time-domain wave as a 2-3 dot thick curve.
    const drawWave = (g: Ctx2D, t: number, active: boolean) => {
      const data = active ? analyserTimeData() : null;
      const n = data?.length ?? 0;
      for (let x = 0; x < COLS; x++) {
        let v: number;
        if (data && n > 0) {
          const s = data[Math.min(n - 1, Math.floor((x / COLS) * n))] ?? 128;
          v = (s - 128) / 128; // -1..1
        } else {
          v = 0.3 * Math.sin(t / 26 + (x / COLS) * Math.PI * 4);
        }
        if (!active) v *= 0.5;
        const center = CC + v * 11;
        for (let y = 0; y < ROWS; y++) {
          const row = ROWS - 1 - y; // 0 = bottom
          dot(g, x, y, Math.abs(row - center) <= 1.1);
        }
      }
    };

    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [active]);

  return <canvas ref={ref} width={COLS * P} height={ROWS * P} className="h-full w-full" />;
}
