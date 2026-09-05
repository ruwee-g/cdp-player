// Rocket launch — standalone dot-matrix loop.
// Snaps in low → engine ignites → accelerates upward with flickering flame
// and expanding smoke puffs → exits top → loop.
// Same dot language: 28×28 grid, pitch 10, radius 4.5.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "./dotAnims";

const COLS = 28;
const ROWS = 28;
const HOT = "#fff6c9";
const SMOKE = "154,154,158";

const APPEAR = 0.5;
const IGNITE = 0.4;
const LIFT = 1.8;
const HOLD = 0.5;
const TAIL = 0.3;
export const ROCKET_PERIOD = APPEAR + IGNITE + LIFT + HOLD + TAIL;

const Y_START = 20; // body top row while sitting
const TRAVEL = 34; // cells traveled (fully exits top)
const STAGGER = 0.05;
const CX = 14;

function hash(x: number, y: number, f: number): number {
  const v = Math.sin(x * 12.9 + y * 78.2 + f * 37.7) * 43758.5453;
  return v - Math.floor(v);
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, style: string, r = DOT_R) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= COLS || yi < 0 || yi >= ROWS) return;
  g.fillStyle = style;
  g.beginPath();
  g.arc(xi * DOT_P + DOT_P / 2, yi * DOT_P + DOT_P / 2, r, 0, Math.PI * 2);
  g.fill();
}

export function drawRocket(g: CanvasRenderingContext2D, t: number) {
  const tt = ((t % ROCKET_PERIOD) + ROCKET_PERIOD) % ROCKET_PERIOD;
  // dim field
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = DOT_DIM;
      g.beginPath();
      g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
      g.fill();
    }
  }
  // body top row at time tt (ease-in² acceleration)
  let y0 = Y_START;
  if (tt >= APPEAR + IGNITE) {
    const k = Math.min(1, (tt - APPEAR - IGNITE) / LIFT);
    y0 = Y_START - TRAVEL * k * k;
  }
  const frame = Math.floor(tt * 24);

  // body bulbs during appear (dist from base center)
  const bulb = (x: number, y: number): boolean => {
    if (tt >= APPEAR) return true;
    const d = Math.sqrt((x - CX) * (x - CX) + (y - (Y_START + 5)) * (y - (Y_START + 5)));
    return tt >= d * STAGGER;
  };
  const P = (dx: number, dy: number) => {
    const x = CX + dx;
    const y = y0 + dy;
    if (bulb(CX + dx, Y_START + dy)) dot(g, x, y, DOT_LIT);
  };

  // nose cone triangle apex (0) → base row 3
  for (let r = 0; r <= 3; r++) {
    for (let dx = -r; dx <= r; dx++) {
      if (Math.abs(dx) === r || r === 3) P(dx, r);
    }
  }
  // body rect cols ±(2..3)? body width: cols CX-3..CX+3 rows 3..10
  for (let dx = -3; dx <= 3; dx++) {
    P(dx, 3);
    P(dx, 10);
  }
  for (let dy = 3; dy <= 10; dy++) {
    P(-3, dy);
    P(3, dy);
  }
  // window ring r1.5 at (0,5)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const d = Math.sqrt((x - CX) * (x - CX) + (y - (Y_START + 5)) * (y - (Y_START + 5)));
      if (Math.abs(d - 1.5) <= 0.6 && bulb(x, y)) dot(g, x, y0 + (y - Y_START), DOT_LIT);
    }
  }
  // fins
  const fins: [number, number][] = [[-3, 8], [-4, 9], [-5, 10], [-5, 11], [3, 8], [4, 9], [5, 10], [5, 11]];
  for (const [dx, dy] of fins) P(dx, dy);

  // flame: grows during ignite, full in lift; flickers
  const flameOn = tt >= APPEAR;
  const flameGrow = tt < APPEAR + IGNITE ? (tt - APPEAR) / IGNITE : 1;
  const flameGone = tt >= APPEAR + IGNITE + LIFT;
  if (flameOn && !flameGone && flameGrow > 0) {
    const len = Math.round(2 + 3 * flameGrow);
    for (let r = 0; r < len; r++) {
      const half = 1 + Math.round(r * 0.7);
      for (let dx = -half; dx <= half; dx++) {
        if (hash(dx, r, frame) < 0.72) {
          const core = Math.abs(dx) <= 1 && r < 2;
          dot(g, CX + dx, y0 + 11 + r, core ? HOT : DOT_LIT);
        }
      }
    }
  }

  // smoke puffs: 8 spawned during lift, expand + fade + drift down
  for (let i = 0; i < 8; i++) {
    const birth = APPEAR + IGNITE + (i / 8) * LIFT * 0.9;
    const age = tt - birth;
    if (age < 0 || age > 1.2) continue;
    const k = age / 1.2;
    const px = CX + (i % 2 === 0 ? -1 : 1) * (1 + i * 0.4);
    const py = Y_START + 12 + age * 2;
    const pr = 1 + age * 2.2;
    const alpha = (1 - k) * 0.5;
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const d = Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
        if (Math.abs(d - pr) <= 0.7) {
          g.fillStyle = `rgba(${SMOKE},${alpha.toFixed(3)})`;
          g.beginPath();
          g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
          g.fill();
        }
      }
    }
  }
}
