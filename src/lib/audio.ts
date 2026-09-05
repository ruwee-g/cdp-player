// Singleton HTMLAudio + Web Audio graph for visualizer + EQ-ready.
// Frontend plays files via Tauri asset protocol (convertFileSrc).
//
// State lives on globalThis (not module scope): Vite HMR replaces modules on
// every edit, which would otherwise fork a second Audio element + AudioContext
// while App's once-mounted listeners and the analyser stay wired to the old
// ones — playback-security desync with a dead visualizer.

type AudioSingletons = {
  audio: HTMLAudioElement | null;
  ctx: AudioContext | null;
  analyser: AnalyserNode | null;
  source: MediaElementAudioSourceNode | null;
};

function singletons(): AudioSingletons {
  const g = globalThis as unknown as { __cdp_audio?: AudioSingletons };
  if (!g.__cdp_audio) {
    g.__cdp_audio = { audio: null, ctx: null, analyser: null, source: null };
  }
  return g.__cdp_audio;
}

export function getAudio(): HTMLAudioElement {
  const s = singletons();
  if (!s.audio) {
    s.audio = new Audio();
    s.audio.preload = "auto";
    s.audio.crossOrigin = "anonymous";
  }
  return s.audio;
}

export function getAnalyser(): AnalyserNode | null {
  const s = singletons();
  try {
    if (!s.ctx) {
      const AC = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      s.ctx = new AC();
    }
    if (!s.analyser) {
      s.analyser = s.ctx.createAnalyser();
      s.analyser.fftSize = 128;
      s.analyser.smoothingTimeConstant = 0.82;
    }
    if (!s.source) {
      s.source = s.ctx.createMediaElementSource(getAudio());
      s.source.connect(s.analyser);
      s.analyser.connect(s.ctx.destination);
    }
    if (s.ctx.state === "suspended") void s.ctx.resume();
    return s.analyser;
  } catch {
    return null;
  }
}

export function analyserData(): Uint8Array | null {
  const a = getAnalyser();
  if (!a) return null;
  const buf = new Uint8Array(a.frequencyBinCount);
  a.getByteFrequencyData(buf);
  return buf;
}

export function analyserTimeData(): Uint8Array | null {
  const a = getAnalyser();
  if (!a) return null;
  const buf = new Uint8Array(a.fftSize); // time-domain samples = fftSize
  a.getByteTimeDomainData(buf);
  return buf;
}

// WKWebView only reliably resumes an AudioContext synchronously inside a
// user-gesture handler (rAF/effect-time resume() calls may be ignored forever).
// Call this from click handlers and the audio 'play' event.
export function resumeAudio(): void {
  try {
    const s = singletons();
    if (s.ctx && s.ctx.state === "suspended") void s.ctx.resume();
  } catch {
    /* noop */
  }
}

// Backup: resume on any pointer/key gesture (capture phase).
export function ensureGestureResume(): () => void {
  const h = () => resumeAudio();
  window.addEventListener("pointerdown", h, { capture: true });
  window.addEventListener("keydown", h, { capture: true });
  return () => {
    window.removeEventListener("pointerdown", h, { capture: true });
    window.removeEventListener("keydown", h, { capture: true });
  };
}
