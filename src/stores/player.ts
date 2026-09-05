import { create } from "zustand";
import { persist } from "zustand/middleware";
import { getAnalyser, resumeAudio } from "@/lib/audio";

// Attach/resume the Web Audio graph synchronously inside the user gesture
// (store actions are invoked from click handlers). WKWebView ignores
// resume() calls made outside a gesture (rAF, effects), leaving the
// AudioContext suspended forever with zeroed analyser data.
function kickAudio() {
  getAnalyser();
  resumeAudio();
}

export type Track = {
  path: string;
  title: string;
  artist: string;
  album: string;
  duration_secs: number;
  has_cover: boolean;
};

export type RepeatMode = "off" | "all" | "one";

type PlayerState = {
  tracks: Track[];
  index: number;
  isPlaying: boolean;
  coverUrl: string | null;
  progress: number; // 0..1
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  repeat: RepeatMode;
  setTracks: (t: Track[]) => void;
  playAt: (i: number) => void;
  toggle: () => void;
  next: () => void;
  prev: () => void;
  setPlaying: (p: boolean) => void;
  setCover: (u: string | null) => void;
  setProgress: (progress: number, currentTime: number, duration: number) => void;
  setVolume: (v: number) => void;
  toggleMute: () => void;
  cycleRepeat: () => void;
};

export const usePlayer = create<PlayerState>()(
  persist(
    (set, get) => ({
  tracks: [],
  index: -1,
  isPlaying: false,
  coverUrl: null,
  progress: 0,
  currentTime: 0,
  duration: 0,
  volume: 0.9,
  muted: false,
  repeat: "off",
  setTracks: (tracks) => set({ tracks }),
  playAt: (index) => {
    kickAudio();
    set({ index, isPlaying: true });
  },
  toggle: () => {
    kickAudio();
    const { index, tracks } = get();
    if (index < 0 && tracks.length > 0) {
      set({ index: 0, isPlaying: true });
    } else {
      set((s) => ({ isPlaying: !s.isPlaying }));
    }
  },
  next: () => {
    kickAudio();
    const { index, tracks } = get();
    if (!tracks.length) return;
    set({ index: (index + 1) % tracks.length, isPlaying: true });
  },
  prev: () => {
    kickAudio();
    const { index, tracks } = get();
    if (!tracks.length) return;
    set({ index: (index - 1 + tracks.length) % tracks.length, isPlaying: true });
  },
  setPlaying: (isPlaying) => set({ isPlaying }),
  setCover: (coverUrl) => set({ coverUrl }),
  setProgress: (progress, currentTime, duration) => set({ progress, currentTime, duration }),
  setVolume: (volume) =>
    set((s) => ({ volume, muted: volume > 0 ? false : s.muted })),
  toggleMute: () =>
    set((s) => (s.muted ? { muted: false, volume: s.volume > 0 ? s.volume : 0.5 } : { muted: true })),
  cycleRepeat: () =>
    set((s) => ({ repeat: s.repeat === "off" ? "all" : s.repeat === "all" ? "one" : "off" })),
    }),
    {
      name: "cdp-player",
      // Persist library + prefs only. Playback position, cover art (heavy
      // base64) and transient flags re-resolve on launch; no autoplay
      // (webviews require a user gesture). Stale paths skip via onError.
      partialize: (s) => ({
        tracks: s.tracks,
        index: s.index,
        volume: s.volume,
        repeat: s.repeat,
      }),
    },
  ),
);

export const currentTrack = (s: PlayerState) =>
  s.index >= 0 && s.index < s.tracks.length ? s.tracks[s.index] : null;
