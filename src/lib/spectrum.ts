// Honest spectrum display with falling peak-hold dots.
// NOTE: getByteFrequencyData bytes are ALREADY a dB mapping internally
// (-100..-30 dBFS), so we must NOT log-convert them again — that pins
// everything to the ceiling. We map the musically live byte range
// directly: typical content breathes between ~70 and ~235.

const BYTE_FLOOR = 70;
const BYTE_CEIL = 235;
const PEAK_FALL = 0.985; // peak dots fall ~full scale in 1.1s
const TOP = 0.55; // columns cover the lowest 55% of bins (~0-12kHz)

export type Spectrum = {
  peaks: Float32Array; // per-column falling peak-hold values, 0..1
};

export function createSpectrum(cols: number): Spectrum {
  return { peaks: new Float32Array(cols) };
}

/** Map analyser byte data to `cols` 0..1 levels; updates peak-hold in `st`. */
export function spectrumLevels(data: Uint8Array, cols: number, st: Spectrum): number[] {
  const bins = data.length;
  const top = Math.max(4, Math.floor(bins * TOP));
  const out: number[] = new Array(cols);
  for (let i = 0; i < cols; i++) {
    const bi = Math.min(top, Math.floor(Math.pow(i / cols, 1.15) * top));
    const byte = data[bi] ?? 0;
    // Gentle low-shelf: tame hot bass, from x0.8 at bin 0 up to x1.0 at top.
    const weighted = byte * (0.8 + (0.2 * bi) / top);
    const level = Math.min(1, Math.max(0, (weighted - BYTE_FLOOR) / (BYTE_CEIL - BYTE_FLOOR)));
    out[i] = level;
    st.peaks[i] = Math.max(level, st.peaks[i] * PEAK_FALL);
  }
  return out;
}
