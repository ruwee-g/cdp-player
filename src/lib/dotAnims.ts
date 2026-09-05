// Dot-matrix shape animations — same dot language as icons/visualizer:
// 28×28 grid, pitch 10, dot radius 4.5, #e8b800 on #2b2b2b.

export const DOT_COLS = 28;
export const DOT_ROWS = 28;
export const DOT_P = 10;
export const DOT_R = 4.5;
export const DOT_LIT = "#e8b800";
export const DOT_DIM = "#2b2b2b";
const DOT_FLASH = "#fff6c9";

const FADE_SECS = 0.5;
const POP_SECS = 0.38;

// A2 finale timeline (snap bulbs): appear → H1 → global pop → H2 →
// global pop → H3 → vanish inside→out.
const A2_H1 = 1.0;
const A2_POP = 0.35;
const A2_H2 = 0.5;
const A2_H3 = 1.0;
const A2_TAIL = 0.2;

export type HeartInfo = {
  mask: boolean[];
  dist: Float32Array; // distance from heart center, per cell
  maxDist: number;
  cols: number;
  rows: number;
};

/** Heart mask via the implicit equation (x²+y²−1)³ − x²y³ ≤ 0. */
export function heartMask(cols = DOT_COLS, rows = DOT_ROWS): HeartInfo {
  const cx = cols / 2 - 0.5;
  const cy = rows / 2 - 0.5 + 1.0; // optical: a touch down
  const s = (cols / DOT_COLS) * 9;
  const mask: boolean[] = new Array(cols * rows);
  const dist = new Float32Array(cols * rows);
  let maxDist = 0;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const nx = (x - cx) / s;
      const ny = (cy - y) / s; // y-up
      const v = Math.pow(nx * nx + ny * ny - 1, 3) - nx * nx * ny * ny * ny;
      const i = y * cols + x;
      mask[i] = v <= 0;
      const d = Math.sqrt((x - cx) * (x - cx) + (y - cy) * (y - cy));
      dist[i] = d;
      if (mask[i] && d > maxDist) maxDist = d;
    }
  }
  return { mask, dist, maxDist, cols, rows };
}

export type BloomParams = {
  stagger: number; // secs of delay per cell of distance from center
  popScale: number; // radius overshoot multiplier (1 = no pop)
  flash: number; // white-core flash strength 0..1
  holdSecs: number; // full-on hold before disappearing
  snap: boolean; // true = bulbs: snap on/off one by one, no smooth fade
};

export const BLOOM_PRESETS: { name: string; desc: string; params: BloomParams }[] = [
  { name: "A — base", desc: "stagger 45ms · pop 1.35× · flash 0.5", params: { stagger: 0.045, popScale: 1.35, flash: 0.5, holdSecs: 0.5, snap: false } },
  { name: "B — fast + soft", desc: "stagger 28ms · pop 1.15× · flash 0.3", params: { stagger: 0.028, popScale: 1.15, flash: 0.3, holdSecs: 0.5, snap: false } },
  { name: "C — slow + big", desc: "stagger 60ms · pop 1.6× · flash 0.7", params: { stagger: 0.06, popScale: 1.6, flash: 0.7, holdSecs: 0.5, snap: false } },
  { name: "D — wave only", desc: "stagger 40ms · no pop · flash 0.9", params: { stagger: 0.04, popScale: 1.0, flash: 0.9, holdSecs: 0.5, snap: false } },
];

// Refined A variants for the test grid.
export const A_VARIANTS: { name: string; desc: string; params: BloomParams; finale?: boolean }[] = [
  { name: "A1 — hold 2s", desc: "as-is · hold 2s before fade", params: { stagger: 0.045, popScale: 1.35, flash: 0.5, holdSecs: 2.0, snap: false } },
  { name: "A2 — finale", desc: "saved build → heartFinale.ts", params: { stagger: 0.045, popScale: 1.35, flash: 0, holdSecs: 0.5, snap: true }, finale: true },
];

/** Full loop duration for a preset: reveal → hold → disappear. */
export function bloomPeriod(info: HeartInfo, p: BloomParams): number {
  const revealTotal = info.maxDist * p.stagger + POP_SECS;
  if (p.snap) {
    return revealTotal + A2_H1 + A2_POP + A2_H2 + A2_POP + A2_H3 + info.maxDist * p.stagger + A2_TAIL;
  }
  return revealTotal + p.holdSecs + FADE_SECS;
}

/** Bell envelope 0→1→0 over [start, start+dur], 0 outside. */
function bell(t: number, start: number, dur: number): number {
  if (t < start || t > start + dur) return 0;
  return Math.sin((Math.PI * (t - start)) / dur);
}

function baseDot(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = DOT_DIM;
  g.beginPath();
  g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
  g.fill();
}

/** Draw one loop frame at time t (secs, wraps automatically). */
export function drawBloomFrame(
  g: CanvasRenderingContext2D,
  info: HeartInfo,
  p: BloomParams,
  t: number,
) {
  const { mask, dist, maxDist, cols, rows } = info;
  const revealTotal = maxDist * p.stagger + POP_SECS;
  // A2 finale: appear → H1 → pop all → H2 → pop all → H3 → vanish.
  const g1 = p.snap ? revealTotal + A2_H1 : 0;
  const g2 = p.snap ? g1 + A2_POP + A2_H2 : 0;
  const fadeStart = p.snap ? g2 + A2_POP + A2_H3 : revealTotal + p.holdSecs;
  const vanishSpan = p.snap ? maxDist * p.stagger + A2_TAIL : FADE_SECS;
  const period = fadeStart + vanishSpan;
  const tt = ((t % period) + period) % period;
  let global = 1;
  if (!p.snap && tt > fadeStart) {
    global = Math.max(0, 1 - (tt - fadeStart) / FADE_SECS);
  }
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!mask[i]) {
        baseDot(g, x, y);
        continue;
      }
      if (p.snap) {
        // Bulbs finale: binary on/off, appear + vanish inside→out,
        // with two global pops on all dots in between.
        const onAt = dist[i] * p.stagger;
        const offAt = fadeStart + dist[i] * p.stagger;
        if (tt < onAt || tt >= offAt || tt >= period - 0.05) {
          baseDot(g, x, y);
          continue;
        }
        const sinceOn = tt - onAt;
        const snapK = sinceOn < 0.16 ? 1 - sinceOn / 0.16 : 0;
        const allPop = Math.max(bell(tt, g1, A2_POP), bell(tt, g2, A2_POP));
        const k = Math.max(snapK, allPop);
        g.fillStyle = DOT_LIT;
        g.beginPath();
        g.arc(
          x * DOT_P + DOT_P / 2,
          y * DOT_P + DOT_P / 2,
          DOT_R * (1 + (p.popScale - 1) * k),
          0,
          Math.PI * 2,
        );
        g.fill();
        continue;
      }
      const rise = Math.min(1, Math.max(0, (tt - dist[i] * p.stagger) / POP_SECS));
      if (rise <= 0 || global <= 0) {
        baseDot(g, x, y);
        continue;
      }
      baseDot(g, x, y);
      const pop = 1 + (p.popScale - 1) * Math.sin(Math.PI * Math.min(rise * 1.15, 1));
      const a = Math.min(1, rise * 2) * global;
      g.globalAlpha = a;
      g.fillStyle = DOT_LIT;
      g.beginPath();
      g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R * pop, 0, Math.PI * 2);
      g.fill();
      if (p.flash > 0 && rise < 1) {
        g.globalAlpha = p.flash * (1 - rise) * global;
        g.fillStyle = DOT_FLASH;
        g.beginPath();
        g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R * 0.8 * pop, 0, Math.PI * 2);
        g.fill();
      }
      g.globalAlpha = 1;
    }
  }
}
