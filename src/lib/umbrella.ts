// Umbrella in the rain — standalone dot-matrix loop.
// Handle + canopy sweep open → rain falls 3s, drops splash off the dome → fade.
// Same dot language: 28×28 grid, pitch 10, radius 4.5.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "./dotAnims";

const COLS = 28;
const ROWS = 28;
const C = { x: 14, y: 16 }; // dome center (bottom edge middle)
const DOME_R = 9;

const OPEN = 1.0;
const RAIN = 8.0;
const OUTRO = 0.7;
const TAIL = 0.3;
export const UMBRELLA_PERIOD = OPEN + RAIN + OUTRO + TAIL; // 10.0

const DROPS = 22;

function hash(i: number): number {
  const v = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return v - Math.floor(v);
}

/** Dome surface row at dot-col x (upper arc). NaN outside the dome. */
function domeY(x: number): number {
  const dx = x - C.x;
  if (Math.abs(dx) > DOME_R) return NaN;
  return C.y - Math.sqrt(DOME_R * DOME_R - dx * dx);
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, style: string, alpha: number) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= COLS || yi < 0 || yi >= ROWS) return;
  g.globalAlpha = alpha;
  g.fillStyle = style;
  g.beginPath();
  g.arc(xi * DOT_P + DOT_P / 2, yi * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}

export function drawUmbrella(g: CanvasRenderingContext2D, t: number) {
  const tt = ((t % UMBRELLA_PERIOD) + UMBRELLA_PERIOD) % UMBRELLA_PERIOD;
  // dim field
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = DOT_DIM;
      g.beginPath();
      g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
      g.fill();
    }
  }
  let global = 1;
  if (tt > UMBRELLA_PERIOD - OUTRO) {
    global = Math.max(0, 1 - (tt - (UMBRELLA_PERIOD - OUTRO)) / OUTRO);
  }

  // canopy sweep: arc reveals from top-center outward during OPEN
  const openK = Math.min(1, tt / OPEN);
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const d = Math.sqrt((x - C.x) * (x - C.x) + (y - C.y) * (y - C.y));
      if (Math.abs(d - DOME_R) > 0.6 || y > C.y) continue;
      const ang = Math.abs(Math.atan2(C.y - y, x - C.x) - Math.PI / 2); // 0 at top
      if (ang / (Math.PI / 2) <= openK) dot(g, x, y, DOT_LIT, global);
    }
  }
  // scalloped bottom edge
  for (let x = C.x - DOME_R; x <= C.x + DOME_R; x++) {
    const dip = Math.round(1.2 * (0.5 + 0.5 * Math.cos(((x - C.x) / DOME_R) * Math.PI * 3)));
    if (tt >= (Math.abs(x - C.x) / DOME_R) * OPEN) dot(g, x, C.y + dip, DOT_LIT, global);
  }
  // tip + handle J
  if (tt >= 0.1) dot(g, C.x, 5, DOT_LIT, global);
  for (let y = C.y; y <= 23; y++) {
    if (tt >= ((y - C.y) / 7) * OPEN) dot(g, C.x, y, DOT_LIT, global);
  }
  for (let k = 0; k <= 4; k++) {
    const hx = C.x - k;
    const hy = 23 + Math.round((1 - Math.cos((k / 4) * (Math.PI / 2))) * 2);
    if (tt >= OPEN * 0.7) dot(g, hx, hy, DOT_LIT, global);
  }

  // rain falls from above (spawned off-frame) with a fade-in start,
  // so nothing pops out of thin air mid-frame
  if (tt >= OPEN && tt < OPEN + RAIN) {
    const rt = tt - OPEN;
    const rainA = Math.min(1, rt / 0.8);
    for (let i = 0; i < DROPS; i++) {
      const speed = 12 + (i % 3) * 2;
      const x = 2 + hash(i) * 24;
      const y = ((rt * speed + hash(i + 99) * 34) % 34) - 3;
      const dy = domeY(Math.round(x));
      if (!Number.isNaN(dy) && y >= dy - 0.5 && y <= dy + 1) {
        // splash: two side dots flash
        const a = 1 - (y - (dy - 0.5)) / 1.5;
        dot(g, x - 1, dy, DOT_LIT, Math.max(0, a) * global * rainA);
        dot(g, x + 1, dy, DOT_LIT, Math.max(0, a) * global * rainA);
        continue;
      }
      dot(g, x, y, "rgba(154,154,158,0.8)", global * rainA);
    }
  }
}
