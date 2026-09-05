// Sleepy smiley v2 — standalone dot-matrix loop.
// Timeline: face appears bulb-by-bulb inside→out (snap + pop) → hold 0.35s →
// one Z pops in top-right → Z sways right/left (±2 cells, 0.35s holds) for
// 3s → everything vanishes bulb-by-bulb outside→in → loop.
// Same dot language: 28×28 grid, pitch 10, radius 4.5.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "./dotAnims";

const COLS = 28;
const ROWS = 28;
const FACE = { x: 10, y: 14 };
const FACE_R = 8;

const STAGGER = 0.05; // appear delay per cell of distance
const SNAP_POP_SECS = 0.16;
const POP_SCALE = 1.35;
const HOLD_AFTER_FACE = 0.35;
const Z_STAGGER = 0.03;
const SWAY_DUR = 3.0;
const SWAY_HOLD = 0.35;
const SWAY_STEP = 2;
const VANISH_STAGGER = 0.05;
const TAIL = 0.25;

const Z_GLYPH = ["#####", "...#.", "..#..", ".#...", "#####"];
const Z_BASE = { x: 20, y: 5 }; // top-left of the 5×5 glyph
const Z_CENTER = { x: 22, y: 7 };

type Dot = { x: number; y: number; d: number; z: boolean; dz: number };

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
}

function buildDots(): { dots: Dot[]; maxD: number; maxFace: number } {
  const dots: Dot[] = [];
  const push = (x: number, y: number, z: boolean, cx: number, cy: number) => {
    if (x < 0 || x >= COLS || y < 0 || y >= ROWS) return;
    dots.push({
      x,
      y,
      d: dist(x, y, FACE.x, FACE.y),
      z,
      dz: dist(x, y, cx, cy),
    });
  };
  // head outline
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (Math.abs(dist(x, y, FACE.x, FACE.y) - FACE_R) <= 0.6) {
        push(x, y, false, FACE.x, FACE.y);
      }
    }
  }
  // closed eyes: shallow ∪ arcs
  for (const ex of [FACE.x - 3, FACE.x + 3]) {
    for (let dx = -2; dx <= 2; dx++) {
      push(ex + dx, Math.round(12 + dx * dx * 0.3), false, FACE.x, FACE.y);
    }
  }
  // small open mouth: ring r≈1.1 at (10, 17.5)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (Math.abs(dist(x, y, 10, 17.5) - 1.1) <= 0.55) {
        push(x, y, false, FACE.x, FACE.y);
      }
    }
  }
  // the one Z
  Z_GLYPH.forEach((row, gy) => {
    [...row].forEach((ch, gx) => {
      if (ch === "#") push(Z_BASE.x + gx, Z_BASE.y + gy, true, Z_CENTER.x, Z_CENTER.y);
    });
  });
  let maxD = 0;
  let maxFace = 0;
  for (const dt of dots) {
    if (dt.d > maxD) maxD = dt.d;
    if (!dt.z && dt.d > maxFace) maxFace = dt.d;
  }
  return { dots, maxD, maxFace };
}

const { dots: DOTS, maxD: MAX_D, maxFace: MAX_FACE } = buildDots();

const REVEAL_END = MAX_FACE * STAGGER + SNAP_POP_SECS;
const Z_START = REVEAL_END + HOLD_AFTER_FACE;
const SWAY_START = Z_START + 0.3;
export const SWAY_END = SWAY_START + SWAY_DUR;
const VANISH_START = SWAY_END;
export const SLEEPY_PERIOD = VANISH_START + MAX_D * VANISH_STAGGER + TAIL;

const SWAY_SEQ = [0, SWAY_STEP, 0, -SWAY_STEP];

function swayOff(t: number): number {
  if (t < SWAY_START || t >= SWAY_END) return 0;
  return SWAY_SEQ[Math.floor((t - SWAY_START) / SWAY_HOLD) % SWAY_SEQ.length] ?? 0;
}

function baseDot(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = DOT_DIM;
  g.beginPath();
  g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
  g.fill();
}

export function drawSleepy(g: CanvasRenderingContext2D, t: number) {
  const tt = ((t % SLEEPY_PERIOD) + SLEEPY_PERIOD) % SLEEPY_PERIOD;
  const off = swayOff(tt);
  // dim field
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) baseDot(g, x, y);
  }
  for (const dt of DOTS) {
    const onAt = dt.z ? Z_START + dt.dz * Z_STAGGER : dt.d * STAGGER;
    const offAt = VANISH_START + (MAX_D - dt.d) * VANISH_STAGGER;
    if (tt < onAt || tt >= offAt) continue;
    const sinceOn = tt - onAt;
    const k = sinceOn < SNAP_POP_SECS ? 1 - sinceOn / SNAP_POP_SECS : 0;
    g.fillStyle = DOT_LIT;
    g.beginPath();
    g.arc(
      (dt.x + (dt.z ? off : 0)) * DOT_P + DOT_P / 2,
      dt.y * DOT_P + DOT_P / 2,
      DOT_R * (1 + (POP_SCALE - 1) * k),
      0,
      Math.PI * 2,
    );
    g.fill();
  }
}
