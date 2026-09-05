// Real Tetris mechanics — standalone dot-matrix loop.
// 10-wide well, pieces fall with scripted shifts (one rotates mid-air),
// lock, DOUBLE line clear with flash + collapse, second wave, fade → loop.
// Same dot language: 28×28 grid, pitch 10, radius 4.5. Block = 2×2 dots.

import { DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "./dotAnims";

const COLS = 28;
const ROWS = 28;
const FIELD_X = 4; // dot-col of block column 0 (20 dots wide)
const FLOOR_Y = 23; // dot-row of the floor; block row 0 = dot rows 22..23

const FALL = 1.1;
const SLOT = 1.9;
const FLASH_AT = 11.4;
const FLASH_SECS = 1.0;
const COLLAPSE_AT = FLASH_AT + FLASH_SECS;
const FADE_AT = 17.6;
const FADE_SECS = 1.0;
export const TETRIS_PERIOD = 19.2;

type Cell = [number, number]; // block units
type Drop = {
  cells: Cell[];
  rotCells?: Cell[]; // shown after rotAt (mid-air spin demo)
  rotAt?: number;
  spawnX: number; // block x at spawn
  slotX: number;
  slotY: number;
  start: number;
};

const DROPS: Drop[] = [
  { cells: [[-1, 0], [0, 0], [1, 0], [2, 0]], spawnX: 4, slotX: 1, slotY: 0, start: 0 }, // I
  { cells: [[-1, 0], [0, 0], [1, 0], [2, 0]], spawnX: 4, slotX: 5, slotY: 0, start: SLOT }, // I
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], spawnX: 4, slotX: 8, slotY: 0, start: 2 * SLOT }, // O
  { cells: [[-1, 0], [0, 0], [1, 0], [0, 1]], spawnX: 4, slotX: 4, slotY: 1, start: 3 * SLOT }, // T
  { cells: [[0, 0], [1, 0], [2, 0], [2, 1]], spawnX: 4, slotX: 0, slotY: 1, start: 4 * SLOT }, // J
  { cells: [[1, 0], [2, 0], [0, 1], [1, 1]], spawnX: 4, slotX: 5, slotY: 1, start: 5 * SLOT }, // S → DOUBLE
  { cells: [[0, 0], [1, 0], [0, 1], [1, 1]], spawnX: 4, slotX: 0, slotY: 0, start: 12.8 }, // O wave 2
  {
    cells: [[-1, 0], [0, 0], [1, 0], [0, 1]],
    rotCells: [[0, -1], [0, 0], [0, 1], [-1, 0]],
    rotAt: 0.5,
    spawnX: 4,
    slotX: 7,
    slotY: 1,
    start: 14.7,
  }, // T spins mid-air
];

/** Locked grid (block cells) at time t, post-collapse included. */
function gridAt(t: number): Set<string> {
  const g = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  // wave 1 locks (drops 0..5)
  for (let i = 0; i < 6; i++) {
    const p = DROPS[i]!;
    if (t < p.start + FALL) continue;
    for (const [cx, cy] of p.cells) g.add(key(p.slotX + cx, p.slotY + cy));
  }
  if (t < COLLAPSE_AT) return g;
  // collapse rows 0..1 away, everything above falls 2
  const h = new Set<string>();
  for (const k of g) {
    const [x, y] = k.split(",").map(Number);
    if (y < 2) continue;
    h.add(key(x, y - 2));
  }
  // wave 2 locks
  for (let i = 6; i < 8; i++) {
    const p = DROPS[i]!;
    if (t < p.start + FALL) continue;
    for (const [cx, cy] of p.cells) h.add(key(p.slotX + cx, p.slotY + cy));
  }
  return h;
}

export function drawTetris(g: CanvasRenderingContext2D, t: number) {
  const tt = ((t % TETRIS_PERIOD) + TETRIS_PERIOD) % TETRIS_PERIOD;
  // dim field
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      g.fillStyle = DOT_DIM;
      g.beginPath();
      g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
      g.fill();
    }
  }
  if (tt >= FADE_AT + FADE_SECS) return;
  let alpha = 1;
  if (tt >= FADE_AT) alpha = Math.max(0, 1 - (tt - FADE_AT) / FADE_SECS);

  const block = (bx: number, by: number, a = 1) => {
    for (let dx = 0; dx < 2; dx++) {
      for (let dy = 0; dy < 2; dy++) {
        const x = FIELD_X + bx * 2 + dx;
        const y = FLOOR_Y - by * 2 - dy;
        if (x < 0 || x >= COLS || y < 0 || y >= ROWS) continue;
        g.globalAlpha = a * alpha;
        g.fillStyle = DOT_LIT;
        g.beginPath();
        g.arc(x * DOT_P + DOT_P / 2, y * DOT_P + DOT_P / 2, DOT_R, 0, Math.PI * 2);
        g.fill();
        g.globalAlpha = 1;
      }
    }
  };

  // line-clear flash: blink the locked grid
  if (tt >= FLASH_AT && tt < COLLAPSE_AT) {
    const on = Math.floor(((tt - FLASH_AT) / FLASH_SECS) * 6) % 2 === 0;
    const a = (on ? 1 : 0.15) * alpha;
    for (const k of gridAt(tt)) {
      const [x, y] = k.split(",").map(Number);
      block(x, y, a);
    }
    return;
  }

  // locked cells
  for (const k of gridAt(tt)) {
    const [x, y] = k.split(",").map(Number);
    block(x, y, 1);
  }

  // falling piece
  for (let i = 0; i < DROPS.length; i++) {
    const p = DROPS[i]!;
    if (tt < p.start || tt >= p.start + FALL) continue;
    const k = (tt - p.start) / FALL;
    const dyBlocks = Math.round((1 - k) * (1 - k) * 14); // ease-in drop
    const x = p.spawnX + (p.slotX - p.spawnX) * Math.min(1, (tt - p.start) / 0.6);
    const cells = p.rotCells && p.rotAt !== undefined && tt - p.start >= p.rotAt ? p.rotCells : p.cells;
    for (const [cx, cy] of cells) {
      block(Math.round(x + cx), p.slotY + cy + dyBlocks, 1);
    }
  }
}
