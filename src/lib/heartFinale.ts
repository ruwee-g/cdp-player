// A2 FINALE — saved standalone snapshot.
// Timeline: appear (snap bulbs inside→out, 1.35× pop) → hold 1s →
// global pop all (0.35s) → hold 0.5s → global pop all → hold 1s →
// vanish inside→out → loop. Period ≈ 5s.
// Shares only the dot language + heart mask with dotAnims; the timeline
// here is frozen and independent of the test-engine presets.

import { heartMask, DOT_P, DOT_R, DOT_LIT, DOT_DIM } from "./dotAnims";

export const HEART = heartMask();

const STAGGER = 0.045;
const POP_SCALE = 1.35;
const POP_SECS = 0.38;
const H1 = 1.0;
const GPOP = 0.35;
const H2 = 0.5;
const H3 = 1.0;
const TAIL = 0.2;
const SNAP_POP_SECS = 0.16;

const REVEAL_TOTAL = HEART.maxDist * STAGGER + POP_SECS;
const G1 = REVEAL_TOTAL + H1;
const G2 = G1 + GPOP + H2;
const FADE_START = G2 + GPOP + H3;

export const A2_PERIOD = FADE_START + HEART.maxDist * STAGGER + TAIL;

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
export function drawHeartFinale(g: CanvasRenderingContext2D, t: number) {
  const { mask, dist, cols, rows } = HEART;
  const tt = ((t % A2_PERIOD) + A2_PERIOD) % A2_PERIOD;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const i = y * cols + x;
      if (!mask[i]) {
        baseDot(g, x, y);
        continue;
      }
      const onAt = dist[i] * STAGGER;
      const offAt = FADE_START + dist[i] * STAGGER;
      if (tt < onAt || tt >= offAt || tt >= A2_PERIOD - 0.05) {
        baseDot(g, x, y);
        continue;
      }
      const sinceOn = tt - onAt;
      const snapK = sinceOn < SNAP_POP_SECS ? 1 - sinceOn / SNAP_POP_SECS : 0;
      const allPop = Math.max(bell(tt, G1, GPOP), bell(tt, G2, GPOP));
      const k = Math.max(snapK, allPop);
      g.fillStyle = DOT_LIT;
      g.beginPath();
      g.arc(
        x * DOT_P + DOT_P / 2,
        y * DOT_P + DOT_P / 2,
        DOT_R * (1 + (POP_SCALE - 1) * k),
        0,
        Math.PI * 2,
      );
      g.fill();
    }
  }
}
