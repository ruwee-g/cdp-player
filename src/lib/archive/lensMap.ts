// Runtime SDF displacement map for the liquid-glass rim lens.
// Neutral 128,128 in the flat center, smooth ramp to an outward push at the
// rim — the same SDF technique as Apple's Liquid Glass web replicas.
// Applied with a NEGATIVE feDisplacementMap scale (magnifying lens look).

export type Field = { dist: number; nx: number; ny: number };

/** Rounded-box SDF (negative inside) + outward normal via numeric gradient. */
export function pillSDF(
  x: number,
  y: number,
  W: number,
  H: number,
  r: number,
): Field {
  const sdf = (px: number, py: number): number => {
    const qx = Math.abs(px - W / 2) - (W / 2 - r);
    const qy = Math.abs(py - H / 2) - (H / 2 - r);
    const ax = Math.max(qx, 0);
    const ay = Math.max(qy, 0);
    return Math.sqrt(ax * ax + ay * ay) + Math.min(Math.max(qx, qy), 0) - r;
  };
  const e = 0.75;
  const dx = (sdf(x + e, y) - sdf(x - e, y)) / (2 * e);
  const dy = (sdf(x, y + e) - sdf(x, y - e)) / (2 * e);
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  return { dist: sdf(x, y), nx: dx / len, ny: dy / len };
}

/** 0 deep inside → 1 at the rim and outside (smoothstep over rim width). */
export function edgeMask(dist: number, rimW: number): number {
  const t = Math.min(1, Math.max(0, 1 + dist / rimW));
  return t * t * (3 - 2 * t);
}

/**
 * Render a W×H displacement map PNG data URL for a pill of the same size.
 * R = X push, G = Y push (128 = neutral). Regenerate when the element size
 * changes; a 340×50 map is ~17k px and renders in under a millisecond.
 */
export function makePillDisplacementMap(w: number, h: number, radius: number, rim = 0): string {
  const W = Math.max(8, Math.round(w));
  const H = Math.max(8, Math.round(h));
  const r = Math.min(radius, H / 2);
  const rimW = rim > 0 ? rim : r;
  const cv = document.createElement("canvas");
  cv.width = W;
  cv.height = H;
  const g = cv.getContext("2d");
  if (!g) return "";
  const img = g.createImageData(W, H);
  const d = img.data;
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const f = pillSDF(x + 0.5, y + 0.5, W, H, r);
      const m = edgeMask(f.dist, rimW);
      const o = (y * W + x) * 4;
      d[o] = Math.round(128 + f.nx * m * 127);
      d[o + 1] = Math.round(128 + f.ny * m * 127);
      d[o + 2] = 128;
      d[o + 3] = 255;
    }
  }
  g.putImageData(img, 0, 0);
  return cv.toDataURL("image/png");
}
