// Envelope with letter — standalone dot-matrix loop.
// Body snaps in bulb-by-bulb → flap opens → letter rises → hold →
// everything vanishes outside→in → loop.
// Same dot language: 28×28 grid, pitch 10, radius 4.5.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "../dotAnims";

const COLS = 28;
const ROWS = 28;
const CX = 13.5;
const CY = 14.5;

const BODY = { x0: 5, x1: 22, y0: 14, y1: 23 };
const FLAP_CLOSED_Y = 19;
const LETTER = { x0: 9, x1: 18, h: 5 };
const LETTER_TOP = 6;
const LETTER_FROM = 18;

const STAGGER = 0.05;
const POP_SECS = 0.16;
const POP_SCALE = 1.35;
const HOLD1 = 0.5;
const FLAP_SECS = 0.5;
const RISE_SECS = 1.2;
const HOLD2 = 1.0;
const VANISH_STAGGER = 0.05;
const TAIL = 0.2;

type Cell = { x: number; y: number; d: number; flap: boolean };

function dist(ax: number, ay: number, bx: number, by: number): number {
  return Math.sqrt((ax - bx) * (ax - bx) + (ay - by) * (ay - by));
}

function buildBody(): { cells: Cell[]; maxD: number } {
  const cells: Cell[] = [];
  const seen = new Set<number>();
  const add = (x: number, y: number, flap: boolean) => {
    const xi = Math.round(x);
    const yi = Math.round(y);
    if (xi < 0 || xi >= COLS || yi < 0 || yi >= ROWS) return;
    const k = yi * COLS + xi;
    if (seen.has(k)) return;
    seen.add(k);
    cells.push({ x: xi, y: yi, d: dist(xi, yi, CX, CY), flap });
  };
  for (let x = BODY.x0; x <= BODY.x1; x++) {
    add(x, BODY.y0, false);
    add(x, BODY.y1, false);
  }
  for (let y = BODY.y0; y <= BODY.y1; y++) {
    add(BODY.x0, y, false);
    add(BODY.x1, y, false);
  }
  // closed flap V (interior part only — top edge already belongs to outline)
  for (let s = 0; s <= 9; s++) {
    const k = s / 9;
    add(BODY.x0 + k * (14 - BODY.x0), BODY.y0 + k * (FLAP_CLOSED_Y - BODY.y0), true);
    add(BODY.x1 - k * (BODY.x1 - 14), BODY.y0 + k * (FLAP_CLOSED_Y - BODY.y0), true);
  }
  let maxD = 0;
  for (const c of cells) if (c.d > maxD) maxD = c.d;
  return { cells, maxD };
}

const { cells: BODY_CELLS, maxD: MAX_D } = buildBody();

const APPEAR_END = MAX_D * STAGGER + POP_SECS;
const FLAP_START = APPEAR_END + HOLD1;
const RISE_START = FLAP_START + FLAP_SECS;
const VANISH_START = RISE_START + RISE_SECS + HOLD2;
export const ENVELOPE_PERIOD = VANISH_START + MAX_D * VANISH_STAGGER + TAIL;

function ease(t: number): number {
  const k = Math.min(1, Math.max(0, t));
  return k * k * (3 - 2 * k);
}

function dot(g: CanvasRenderingContext2D, x: number, y: number) {
  g.fillStyle = DOT_LIT;
  g.beginPath();
  g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
  g.fill();
}

export function drawEnvelope(g: CanvasRenderingContext2D, t: number) {
  const tt = ((t % ENVELOPE_PERIOD) + ENVELOPE_PERIOD) % ENVELOPE_PERIOD;
  // dim field
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = DOT_DIM;
      g.beginPath();
      g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
      g.fill();
    }
  }
  // flap apex: closed → open (flat along top edge)
  const flapY =
    tt < FLAP_START ? FLAP_CLOSED_Y : BODY.y0 + (FLAP_CLOSED_Y - BODY.y0) * (1 - ease((tt - FLAP_START) / FLAP_SECS));
  const drawFlap = (apexY: number) => {
    for (let s = 0; s <= 9; s++) {
      const k = s / 9;
      dot(g, Math.round(BODY.x0 + k * (14 - BODY.x0)), Math.round(BODY.y0 + k * (apexY - BODY.y0)));
      dot(g, Math.round(BODY.x1 - k * (BODY.x1 - 14)), Math.round(BODY.y0 + k * (apexY - BODY.y0)));
    }
  };
  // body bulbs (appear + vanish outside→in).
  // Closed-flap cells hand over to the animated flap once it starts moving.
  const flapMoving = tt >= FLAP_START && tt < VANISH_START;
  for (const c of BODY_CELLS) {
    if (c.flap && flapMoving) continue;
    const onAt = c.d * STAGGER;
    const offAt = VANISH_START + (MAX_D - c.d) * VANISH_STAGGER;
    if (tt < onAt || tt >= offAt) continue;
    const sinceOn = tt - onAt;
    const k = sinceOn < POP_SECS ? 1 - sinceOn / POP_SECS : 0;
    g.fillStyle = DOT_LIT;
    g.beginPath();
    g.arc(c.x * DOT_P + DOT_P / 2, c.y * DOT_P + DOT_P / 2, DOT_R * (1 + (POP_SCALE - 1) * k), 0, Math.PI * 2);
    g.fill();
  }
  // animated flap (after appear, before vanish)
  if (tt >= FLAP_START && tt < VANISH_START) drawFlap(flapY);
  // letter rises after flap opens
  if (tt >= RISE_START && tt < VANISH_START) {
    const y0 = LETTER_FROM - (LETTER_FROM - LETTER_TOP) * ease((tt - RISE_START) / RISE_SECS);
    for (let x = LETTER.x0; x <= LETTER.x1; x++) {
      dot(g, x, Math.round(y0));
      dot(g, x, Math.round(y0 + LETTER.h));
    }
    for (let y = Math.round(y0); y <= Math.round(y0 + LETTER.h); y++) {
      dot(g, LETTER.x0, y);
      dot(g, LETTER.x1, y);
    }
    for (let r = 1; r <= 3; r++) {
      for (let x = LETTER.x0 + 2; x <= LETTER.x1 - 2; x++) {
        dot(g, x, Math.round(y0 + r));
      }
    }
  }
}
