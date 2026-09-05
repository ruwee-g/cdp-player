// Alarm clock — standalone dot-matrix loop.
// Bell snaps in → hammer strikes alternating sides with expanding sound
// arcs while the bell shakes → hands tick → all fades → loop.
// Same dot language: 28×28 grid, pitch 10, radius 4.5.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "./dotAnims";

const COLS = 28;
const ROWS = 28;
const C = { x: 14, y: 15 };
const BELL_R = 7;
const TOP_BELLS = [
  { x: 8, y: 6 },
  { x: 20, y: 6 },
];
const TOP_R = 2;
const RING_HZ = 2.5; // strikes per second (each side alternating)

const APPEAR = 0.5;
const RING = 3.0;
const OUTRO = 0.5;
export const ALARM_PERIOD = APPEAR + RING + OUTRO;

const STAGGER = 0.04;

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
}

function dot(g: CanvasRenderingContext2D, x: number, y: number, style: string, alpha: number, r = DOT_R) {
  const xi = Math.round(x);
  const yi = Math.round(y);
  if (xi < 0 || xi >= COLS || yi < 0 || yi >= ROWS) return;
  g.globalAlpha = alpha;
  g.fillStyle = style;
  g.beginPath();
  g.arc(xi * DOT_P + DOT_P / 2, yi * DOT_P + DOT_P / 2, r, 0, Math.PI * 2);
  g.fill();
  g.globalAlpha = 1;
}

export function drawAlarm(g: CanvasRenderingContext2D, t: number) {
  const tt = ((t % ALARM_PERIOD) + ALARM_PERIOD) % ALARM_PERIOD;
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
  if (tt > ALARM_PERIOD - OUTRO) global = Math.max(0, 1 - (tt - (ALARM_PERIOD - OUTRO)) / OUTRO);
  const ringing = tt >= APPEAR && tt < APPEAR + RING;

  // bell shake during ringing (±1 cell at strike rate)
  const shake = ringing ? Math.round(Math.sin(tt * RING_HZ * 2 * Math.PI)) : 0;
  const bx = C.x + shake;

  const body = (x: number, y: number, a: number) => dot(g, x, y, DOT_LIT, a * global);

  // main bell outline (bulb appear from bell center)
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      const d = dist(x, y, C.x, C.y);
      if (Math.abs(d - BELL_R) > 0.6) continue;
      const onAt = d * STAGGER;
      if (tt < onAt) continue;
      body(x + shake, y, 1);
    }
  }
  // top bells: upper-half rings
  for (const tb of TOP_BELLS) {
    for (let y = 0; y < ROWS; y++) {
      for (let x = 0; x < COLS; x++) {
        const d = dist(x, y, tb.x, tb.y);
        if (Math.abs(d - TOP_R) > 0.6 || y > tb.y + 0.5) continue;
        const onAt = dist(x, y, C.x, C.y) * STAGGER;
        if (tt < onAt) continue;
        body(x + shake, y, 1);
      }
    }
  }
  // legs
  const legs: [number, number][] = [
    [10, 21], [9, 22], [9, 23], [8, 24],
    [18, 21], [19, 22], [19, 23], [20, 24],
  ];
  for (const [x, y] of legs) {
    if (tt >= dist(x, y, C.x, C.y) * STAGGER) body(x + shake, y, 1);
  }

  if (tt < APPEAR) return;

  // hammer between the top bells, striking alternating sides
  const sw = ringing ? Math.sin(tt * RING_HZ * 2 * Math.PI) : 0;
  const hx = C.x + sw * 3;
  const hy = 5 + Math.abs(Math.cos(tt * RING_HZ * 2 * Math.PI)) * -1;
  dot(g, C.x + shake, 7, DOT_LIT, global); // hammer pivot post
  dot(g, hx + shake, hy, DOT_LIT, global, DOT_R * 1.25); // hammer head

  // hands: minute ticks 6° every 0.5s, hour creeps
  const minA = -Math.PI / 2 + Math.floor(tt / 0.5) * ((6 * Math.PI) / 180);
  const hourA = -Math.PI / 2 + 1.1 + tt * 0.02;
  for (let r = 1; r <= 4.5; r += 1) {
    dot(g, bx + Math.cos(minA) * r, C.y + Math.sin(minA) * r, DOT_LIT, global);
  }
  for (let r = 1; r <= 3; r += 1) {
    dot(g, bx + Math.cos(hourA) * r, C.y + Math.sin(hourA) * r, DOT_LIT, global);
  }
  dot(g, bx, C.y, DOT_LIT, global, DOT_R * 1.2); // center pin

  // sound arcs: alternating sides, expanding
  if (ringing) {
    const side = Math.sin(tt * RING_HZ * 2 * Math.PI) > 0 ? -1 : 1;
    const pulse = Math.abs(Math.sin(tt * RING_HZ * 2 * Math.PI));
    for (const rr of [10.5, 12.5]) {
      for (let a = 0; a <= 10; a++) {
        // upper-side quadrant arcs fanning out left/right
        const base = side < 0 ? Math.PI - 0.55 : -0.55;
        const ax = bx + Math.cos(base + (a / 10) * 1.1) * rr;
        const ay = C.y - 2 + Math.sin(base + (a / 10) * 1.1) * rr * 0.6;
        dot(g, ax, ay, DOT_LIT, pulse * global * (rr > 11 ? 0.7 : 1));
      }
    }
  }
}
