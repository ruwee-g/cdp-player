// Fireworks — standalone dot-matrix loop.
// Three volleys from different launch points: shell rises 0.5s → burst of
// 24 sparks with gravity and fade → next volley → hold → loop.
// Same dot language: 28×28 grid, pitch 10, radius 4.5.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "./dotAnims";

const COLS = 28;
const ROWS = 28;
const HOT = "#fff6c9";

const RISE = 0.5;
const BURST_LIFE = 1.1;
const VOLLEYS: { sx: number; bx: number; by: number; start: number }[] = [
  { sx: 8, bx: 8, by: 10, start: 0 },
  { sx: 20, bx: 20, by: 8, start: 1.3 },
  { sx: 14, bx: 14, by: 11, start: 2.6 },
];
const HOLD = 0.6;
export const FIREWORKS_PERIOD = 2.6 + RISE + BURST_LIFE + HOLD; // 4.8

const SPARKS = 24;

export function drawFireworks(g: CanvasRenderingContext2D, t: number) {
  const tt = ((t % FIREWORKS_PERIOD) + FIREWORKS_PERIOD) % FIREWORKS_PERIOD;
  // dim field
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = DOT_DIM;
      g.beginPath();
      g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
      g.fill();
    }
  }
  const puff = (x: number, y: number, style: string, alpha: number, r = DOT_R) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= COLS || yi < 0 || yi >= ROWS) return;
    g.globalAlpha = alpha;
    g.fillStyle = style;
    g.beginPath();
    g.arc(xi * DOT_P + DOT_P / 2, yi * DOT_P + DOT_P / 2, r, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
  };

  VOLLEYS.forEach((v, vi) => {
    const tRise = tt - v.start;
    // rising shell with a short trail
    if (tRise >= 0 && tRise < RISE) {
      const k = tRise / RISE;
      const y = 26 - (26 - v.by) * k * k;
      puff(v.sx, y, HOT, 1, DOT_R * 1.2);
      puff(v.sx, y + 1.5, DOT_LIT, 0.6);
      puff(v.sx, y + 3, DOT_LIT, 0.3);
      return;
    }
    // burst
    const age = tRise - RISE;
    if (age < 0 || age > BURST_LIFE) return;
    const fade = 1 - age / BURST_LIFE;
    for (let i = 0; i < SPARKS; i++) {
      const ang = (i / SPARKS) * Math.PI * 2 + vi * 0.7;
      const speed = 6 + ((i * 37 + vi * 11) % 5); // 6..10 cells/s
      const px = v.bx + Math.cos(ang) * speed * age;
      const py = v.by + Math.sin(ang) * speed * age + 3 * age * age; // gravity
      const style = i % 4 === 0 ? HOT : DOT_LIT;
      puff(px, py, style, fade * (i % 4 === 0 ? 1 : 0.9));
    }
    // white flash core right at burst
    if (age < 0.12) puff(v.bx, v.by, HOT, 1 - age / 0.12, DOT_R * 1.6);
  });
}
