import { useCallback, useEffect } from "react";
import { invoke, convertFileSrc } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { getCurrentWebview } from "@tauri-apps/api/webview";
import { listen } from "@tauri-apps/api/event";
import CdpPlayer from "./components/CdpPlayer";
import { usePlayer, currentTrack, type Track } from "./stores/player";
import { getAudio, getAnalyser, resumeAudio, ensureGestureResume } from "./lib/audio";

export default function App() {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const track = usePlayer(currentTrack);

  const { toggle, next, prev, setPlaying, setCover, setProgress, setVolume, cycleRepeat } =
    usePlayer.getState();

  // volume init + sync mute
  useEffect(() => {
    const audio = getAudio();
    audio.volume = volume;
    audio.muted = muted;
  }, [volume, muted]);

  // Keep a suspended AudioContext alive: resume on real playback start
  // and on any user gesture (WKWebView ignores gesture-less resume()).
  // Re-bound on track change like the other element listeners.
  useEffect(() => {
    const audio = getAudio();
    const onPlay = () => resumeAudio();
    audio.addEventListener("play", onPlay);
    const dispose = ensureGestureResume();
    return () => {
      audio.removeEventListener("play", onPlay);
      dispose();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.path]);

  // load + play current track
  useEffect(() => {
    const audio = getAudio();
    if (!track) return;
    const src = convertFileSrc(track.path);
    if (audio.src !== src) {
      audio.src = src;
      getAnalyser(); // attach graph once
    }
    if (isPlaying) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
    // cover
    setCover(null);
    invoke<string | null>("track_cover", { path: track.path })
      .then((url) => setCover(url ?? null))
      .catch(() => setCover(null));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.path]);

  // play / pause toggle
  useEffect(() => {
    const audio = getAudio();
    if (isPlaying && track) {
      void audio.play().catch(() => setPlaying(false));
    } else {
      audio.pause();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isPlaying]);

  // time updates + auto-next.
  // Re-bound on track change (cleanup removes dupes): guarantees the handlers
  // always sit on the live element even if module reloads ever swap it.
  useEffect(() => {
    const audio = getAudio();
    const onTime = () => {
      const d = audio.duration || 0;
      const c = audio.currentTime || 0;
      setProgress(d > 0 ? c / d : 0, c, d);
    };
    const onEnded = () => {
      const st = usePlayer.getState();
      const { tracks, index, repeat } = st;
      // repeat-one: restart the same track
      if (repeat === "one" && index >= 0 && index < tracks.length) {
        const a = getAudio();
        a.currentTime = 0;
        void a.play().catch(() => {});
        return;
      }
      // repeat off + last track: stop at the end (manual next still wraps)
      if (repeat === "off" && index >= tracks.length - 1) {
        st.setPlaying(false);
        return;
      }
      next();
    };
    // Unplayable file → skip to next instead of stalling.
    const onError = () => {
      if (usePlayer.getState().tracks.length > 1) next();
      else setPlaying(false);
    };
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnded);
    audio.addEventListener("error", onError);
    return () => {
      audio.removeEventListener("timeupdate", onTime);
      audio.removeEventListener("ended", onEnded);
      audio.removeEventListener("error", onError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track?.path]);

  // Shared importer: scan files/folders, replace library, autoplay.
  // Used by the picker, drag & drop and OS open-with flows.
  const playPaths = useCallback(async (paths: string[]) => {
    if (!paths.length) return;
    try {
      const list = await invoke<Track[]>("import_paths", { paths });
      const st = usePlayer.getState();
      st.setTracks(list);
      if (list.length) st.playAt(0);
    } catch (e) {
      console.error(e);
    }
  }, []);

  // File picker: multi-select audio files (mp4/m4v included via filters).
  // Folders come in via drag & drop onto the window (import_paths handles both).
  const onAddMusic = useCallback(async () => {
    const sel = await open({
      multiple: true,
      directory: false,
      title: "Choose audio files",
      filters: [
        {
          name: "Audio",
          extensions: [
            "mp3", "flac", "wav", "m4a", "aac", "ogg", "opus", "aiff", "aif",
            "mp4", "m4v",
          ],
        },
      ],
    });
    if (!sel) return;
    const paths = Array.isArray(sel) ? sel : [sel];
    await playPaths(paths);
  }, [playPaths]);

  // Drag & drop files/folders anywhere onto the window.
  useEffect(() => {
    let unlisten: (() => void) | undefined;
    getCurrentWebview()
      .onDragDropEvent((event) => {
        const p = event.payload as { type: string; paths?: string[] };
        if (p.type === "drop" && p.paths?.length) {
          void playPaths(p.paths);
        }
      })
      .then((off) => {
        unlisten = off;
      })
      .catch((e) => console.error(e));
    return () => unlisten?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Files the app was opened with (double-click / Open With / second launch):
  // drain the Rust-side pending queue once, then subscribe for runtime drops.
  useEffect(() => {
    let off: (() => void) | undefined;
    invoke<string[]>("take_pending_files")
      .then((paths) => {
        if (paths.length) void playPaths(paths);
      })
      .catch((e) => console.error(e));
    listen<string[]>("open-files", (event) => {
      if (event.payload.length) void playPaths(event.payload);
    })
      .then((un) => {
        off = un;
      })
      .catch((e) => console.error(e));
    return () => off?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onSeek = useCallback((ratio: number) => {
    const audio = getAudio();
    if (audio.duration) audio.currentTime = ratio * audio.duration;
  }, []);

  const seekBy = useCallback((secs: number) => {
    const audio = getAudio();
    if (audio.duration) {
      audio.currentTime = Math.min(
        audio.duration,
        Math.max(0, audio.currentTime + secs),
      );
    }
  }, []);

  // Keyboard shortcuts: Space play/pause, ←/→ prev/next (Shift = seek ∓10s),
  // ↑/↓ volume, M mute. Window-level, ignored inside text inputs.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement | null)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;
      const st = usePlayer.getState();
      switch (e.code) {
        case "Space":
          e.preventDefault();
          st.toggle();
          break;
        case "ArrowRight":
          e.preventDefault();
          if (e.shiftKey) seekBy(10);
          else st.next();
          break;
        case "ArrowLeft":
          e.preventDefault();
          if (e.shiftKey) seekBy(-10);
          else st.prev();
          break;
        case "ArrowUp":
          e.preventDefault();
          st.setVolume(Math.min(1, st.volume + 0.08));
          break;
        case "ArrowDown":
          e.preventDefault();
          st.setVolume(Math.max(0, st.volume - 0.08));
          break;
        case "KeyM":
          st.toggleMute();
          break;
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [seekBy]);

  return (
    <div className="drag flex h-full items-center justify-center overflow-hidden bg-transparent p-5">
      <CdpPlayer
        onAddMusic={onAddMusic}
        onToggle={toggle}
        onNext={next}
        onPrev={prev}
        onRepeat={cycleRepeat}
        onSeek={onSeek}
        onVolume={(r) => setVolume(r)}
      />
    </div>
  );
}
