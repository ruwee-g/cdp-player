// Audio cassette — standalone dot-matrix loop.
// Rises from below, holds, leaves upward. Twin reels rotate while visible.
// Same dot language: 28×28 grid, pitch 10, radius 4.5.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "../dotAnims";

const COLS = 28;
const ROWS = 28;

// Timeline: enter 2s (smooth) → hold 1s → exit 1.2s → tail 0.3s.
const ENTER = 2.0;
const HOLD = 1.0;
const EXIT = 1.2;
const TAIL = 0.3;
export const CASSETTE_PERIOD = ENTER + HOLD + EXIT + TAIL;

const Y_OFF = 30; // starts/ends fully outside the frame

// Cassette geometry in global cells (before rise offset).
const BODY = { x0: 4, x1: 23, y0: 9, y1: 18 };
const REELS = [
  { x: 9, y: 13 },
  { x: 18, y: 13 },
];
const REEL_R = 2.5;
const SPOKES = 3;
const SPIN = 5; // rad per sec

function smooth(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

/** Vertical offset at loop time t: +30 (below) → 0 → −30 (above). */
export function cassetteY(t: number): number {
  if (t < ENTER) return Y_OFF * (1 - smooth(t / ENTER));
  if (t < ENTER + HOLD) return 0;
  if (t < ENTER + HOLD + EXIT) return -Y_OFF * ((t - ENTER - HOLD) / EXIT);
  return -Y_OFF;
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, style: string) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= COLS || yi < 0 || yi >= ROWS) return;
  g.fillStyle = style;
  g.beginPath();
  g.arc(xi * DOT_P + DOT_P / 2, yi * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
  g.fill();
}

export function drawCassette(g: CanvasRenderingContext2D, t: number) {
  // dim field
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = DOT_DIM;
      g.beginPath();
      g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
      g.fill();
    }
  }

  const yo = cassetteY(t);
  const Y = (y: number) => y + yo;
  const S = DOT_LIT;

  // body outline
  for (let x = BODY.x0; x <= BODY.x1; x++) {
    dot(g, x, Y(BODY.y0), S);
    dot(g, x, Y(BODY.y1), S);
  }
  for (let y = BODY.y0; y <= BODY.y1; y++) {
    dot(g, BODY.x0, Y(y), S);
    dot(g, BODY.x1, Y(y), S);
  }

  // trapezoid bottom window: diagonals + sill
  for (let r = 0; r <= 2; r++) {
    dot(g, 6 + r, Y(15 + r), S);
    dot(g, 21 - r, Y(15 + r), S);
  }
  for (let x = 8; x <= 19; x++) dot(g, x, Y(17), S);

  // reels: rings + rotating spokes
  const a = t * SPIN;
  for (const [ri, rc] of REELS.entries()) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const d = Math.sqrt((x - rc.x) * (x - rc.x) + (y - rc.y) * (y - rc.y));
        if (Math.abs(d - REEL_R) <= 0.6) dot(g, x, Y(y), S);
      }
    }
    const phase = ri === 0 ? a : -a;
    for (let k = 0; k < SPOKES; k++) {
      const ang = phase + (k * 2 * Math.PI) / SPOKES;
      for (let rr = 1; rr <= 2; rr++) {
        dot(g, rc.x + Math.cos(ang) * rr, Y(rc.y + Math.sin(ang) * rr), S);
      }
    }
    dot(g, rc.x, Y(rc.y), S); // hub
  }
}
