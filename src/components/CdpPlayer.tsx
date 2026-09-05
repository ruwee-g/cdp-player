import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { beginManualDrag } from "@/lib/windowDrag";
import { DotPlay, DotPause, DotPrev, DotNext, DotFolder, DotDisc, dotSize } from "./icons";
import Disc from "./Disc";
import DotVisualizer, { VISUAL_MODES, type VisualMode } from "./DotVisualizer";
import IdleAnim, { IDLE_NAMES, type IdleName } from "./IdleAnim";
import { usePlayer, currentTrack } from "@/stores/player";

// Manual window dragging (frameless window: CSS drag regions don't apply).
// Skips anything interactive — buttons, inputs and .no-drag zones
// (pills, volume, title seek, cover) keep working untouched.
export function dragWindow(e: React.PointerEvent) {
  void beginManualDrag(e);
}

// 3-layer physical glass button:
// 1 - dark substrate (.cdp-btn, inner shadow), 2 - lucide icon, 3 - glass cap (.cdp-glass)
// Title marquee, memoized so progress ticks (4Hz store updates) never
// touch it: same label → same DOM → CSS animation runs uninterrupted.
const TitleMarquee = memo(function TitleMarquee({ label }: { label: string }) {
  return (
    <span
      className="cdp-marquee"
      style={{ animationDuration: `${Math.max(6, label.length * 0.28)}s` }}
    >
      <span>{label}</span>
      <span aria-hidden>{label}</span>
    </span>
  );
});

function GlassPill({
  children,
  onClick,
  label,
  small = false,
  dim = false,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  small?: boolean;
  dim?: boolean;
}) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.88 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      onClick={onClick}
      className={`no-drag cdp-btn font-bauhaus flex items-center justify-center lowercase ${
        dim ? "text-[#8a8a8e]" : "text-[#e8b800]"
      } ${
        small ? "h-8 min-w-[84px] px-2 text-[10px]" : "h-9 min-w-16 px-4 text-[13px]"
      }`}
    >
      <span className="relative z-[1] flex items-center">{children}</span>
      <span className="cdp-glass" />
    </motion.button>
  );
}

function GlassSquare({  children,
  onClick,
  label,
  style,
}: {
  children: React.ReactNode;
  onClick?: () => void;
  label: string;
  style?: React.CSSProperties;
}) {
  return (
    <motion.button
      aria-label={label}
      title={label}
      whileTap={{ scale: 0.85, rotate: -8 }}
      transition={{ type: "spring", stiffness: 500, damping: 22 }}
      onClick={onClick}
      style={style}
      className="no-drag cdp-btn flex h-8 w-8 items-center justify-center text-[#e8b800]"
    >
      <span className="relative z-[1] flex items-center">{children}</span>
      <span className="cdp-glass" />
    </motion.button>
  );
}

export default function CdpPlayer({
  onAddMusic,
  onToggle,
  onNext,
  onPrev,
  onRepeat,
  onSeek,
  onVolume,
}: {
  onAddMusic: () => void;
  onToggle: () => void;
  onNext: () => void;
  onPrev: () => void;
  onRepeat: () => void;
  onSeek: (ratio: number) => void;
  onVolume: (ratio: number) => void;
}) {
  const isPlaying = usePlayer((s) => s.isPlaying);
  const progress = usePlayer((s) => s.progress);
  const volume = usePlayer((s) => s.volume);
  const muted = usePlayer((s) => s.muted);
  const coverUrl = usePlayer((s) => s.coverUrl);
  const repeat = usePlayer((s) => s.repeat);
  const track = usePlayer(currentTrack);
  const volRef = useRef<HTMLDivElement>(null);
  const titleRef = useRef<HTMLDivElement>(null);
  // Same dot diameter as the play icon (rendered at 20px, 5 grid rows).
  const VOL_DOT = dotSize(20, 5);
  // Same density as the icon: pitch 10 / diameter 9 → gap = dot / 9.
  const VOL_GAP = VOL_DOT / 9;
  const VOL_ROWS_FILL = 9; // 36px pill / 4px pitch wall-to-wall
  const [volCols, setVolCols] = useState(27);
  const [visualMode, setVisualMode] = useState<VisualMode>("spectrum");
  const [showCover, setShowCover] = useState(true);
  const [idleAnim, setIdleAnim] = useState<IdleName | null>(null);
  const lastIdle = useRef<IdleName | null>(null);
  const idle = !isPlaying;

  // Idle rotation: when nothing plays (pause or no file), every 10s of rest
  // a random saved animation plays once on the mini screen, then we return
  // to whatever was showing (cover or visualizer).
  useEffect(() => {
    if (!idle) {
      setIdleAnim(null);
      return;
    }
    if (idleAnim) return; // animation playing — onDone reschedules
    const timer = window.setTimeout(() => {
      const pool = IDLE_NAMES.filter((n) => n !== lastIdle.current);
      const pick = pool[Math.floor(Math.random() * pool.length)] ?? IDLE_NAMES[0]!;
      lastIdle.current = pick;
      setIdleAnim(pick);
    }, 10_000);
    return () => window.clearTimeout(timer);
  }, [idle, idleAnim]);
  const coverRef = useRef<HTMLDivElement>(null);

  // Dots fill the whole pill edge-to-edge; the container's 20px radius +
  // overflow:hidden clips corner dots, so the rounded ends are made of dots.
  useLayoutEffect(() => {
    const el = volRef.current;
    if (!el) return;
    const pitch = VOL_DOT + VOL_GAP;
    const update = () => setVolCols(Math.max(8, Math.floor(el.clientWidth / pitch)));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [VOL_DOT, VOL_GAP]);

  // Horizontal trackpad swipe over the cover switches exactly one visualizer
  // mode per swipe, no matter how long the swipe is: deltaX accumulates until
  // a threshold, then a lock holds until the gesture ends (160ms of silence
  // or a direction flip starts a new gesture).
  useEffect(() => {
    const el = coverRef.current;
    if (!el) return;
    let acc = 0;
    let locked = false;
    let endTimer = 0;
    const THRESHOLD = 50;
    const IDLE_MS = 160;
    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
      e.preventDefault();
      window.clearTimeout(endTimer);
      endTimer = window.setTimeout(() => {
        acc = 0;
        locked = false;
      }, IDLE_MS);
      if (locked) return;
      if (acc !== 0 && Math.sign(e.deltaX) !== Math.sign(acc)) acc = 0;
      acc += e.deltaX;
      if (Math.abs(acc) >= THRESHOLD) {
        locked = true;
        const dir = acc < 0 ? 1 : -1; // swipe left → next mode
      setVisualMode((m) => VISUAL_MODES[(VISUAL_MODES.indexOf(m) + dir + VISUAL_MODES.length) % VISUAL_MODES.length]);
      setShowCover(false);
      setIdleAnim(null);
      }
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      window.clearTimeout(endTimer);
      el.removeEventListener("wheel", onWheel);
    };
  }, []);

  // Wheel over the volume pill adjusts volume with a small step.
  useEffect(() => {
    const el = volRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const st = usePlayer.getState();
      const cur = st.muted ? 0 : st.volume;
      // Normalize line-mode deltas (Firefox) to pixels.
      const d = e.deltaY * (e.deltaMode === 1 ? 16 : 1);
      // Mouse notch → fixed 8% step; trackpad (small deltas) → high gain,
      // one confident swipe covers the whole range.
      const delta =
        Math.abs(d) >= 50
          ? Math.sign(d) * -0.08
          : Math.min(0.15, Math.max(-0.15, -d * 0.003));
      if (delta !== 0) st.setVolume(Math.min(1, Math.max(0, cur + delta)));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const seekFromClientX = (el: HTMLDivElement | null, clientX: number, fn: (r: number) => void) => {
    if (!el) return;
    const r = el.getBoundingClientRect();
    if (r.width <= 0) return;
    fn(Math.min(1, Math.max(0, (clientX - r.left) / r.width)));
  };

  const titleLabel = track ? `${track.artist} – ${track.title}` : "drop a folder to play";

  return (
    <div className="relative w-[380px]">
      <Disc playing={isPlaying} />

      {/* cream plastic body — molded shell, window drag handle */}
      <motion.div
        layout
        onPointerDown={dragWindow}
        className="drag cdp-shell relative z-10 mt-28 flex aspect-square w-full flex-col justify-between rounded-[28px] p-5 pt-6"
      >
        {/* molded seam */}
        <div className="cdp-seam" />

        {/* add-music (top-left) + grille + brand | cover */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex flex-1 flex-col items-start justify-start gap-2 self-stretch">
            <div className="flex items-center gap-2">
              <GlassSquare onClick={onAddMusic} label="add music" style={{ borderRadius: 12 }}>
                <DotFolder size={18} />
              </GlassSquare>
              <GlassPill small dim={repeat === "off"} onClick={onRepeat} label={`repeat ${repeat}`}>
                <span className="whitespace-nowrap">{repeat === "one" ? "repeat one" : "repeat"}</span>
              </GlassPill>
            </div>
            <div className="cdp-grille min-h-[51px] w-full flex-1 rounded-xl" />
            <div>
              <div className="cdp-emboss font-bauhaus text-[16px] lowercase leading-none">cdp</div>
              <div className="cdp-micro font-bauhaus mt-1 text-[9px] lowercase tracking-wider">
                stereo music player · designed by ruwee
              </div>
            </div>
          </div>

          {/* cover / visualizer + mode indicator */}
          <div className="flex shrink-0 flex-col items-center gap-1.5">
            <motion.div
              layout
              ref={coverRef}
              onClick={() => {
                if (idleAnim) setIdleAnim(null);
                else setShowCover((v) => !v);
              }}
              title={showCover ? "show visualizer" : "show cover"}
              className="no-drag relative h-28 w-28 cursor-pointer overflow-hidden rounded-[20px] bg-[#2f2f33] shadow-inner"
            >
            <AnimatePresence mode="wait">
              {idleAnim ? (
                <motion.div
                  key={`idle-${idleAnim}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="h-full w-full"
                >
                  <IdleAnim name={idleAnim} onDone={() => setIdleAnim(null)} />
                </motion.div>
              ) : !showCover ? (
                  <motion.div
                    key="visual"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.3 }}
                    className="h-full w-full"
                  >
                    <DotVisualizer active={isPlaying} mode={visualMode} />
                  </motion.div>
                ) : coverUrl ? (
                  <motion.img
                    key={coverUrl}
                    src={coverUrl}
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.45 }}
                    className="h-full w-full object-cover"
                    alt="cover"
                  />
                ) : (
                  <motion.div
                    key="placeholder"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="flex h-full w-full flex-col items-center justify-center gap-1 text-[#e8b800]"
                  >
                    <DotDisc size={32} />
                    <span className="font-bauhaus text-[13px] lowercase">cover</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        </div>

        {/* controls + title as one unit — internal gap is exact, not distributed */}
        <div className="cdp-tray mt-3 p-3">
        <div className="flex items-center gap-2">
          <GlassPill label="previous track" onClick={onPrev}>
            <DotPrev size={20} />
          </GlassPill>
          <GlassPill label={isPlaying ? "pause" : "play"} onClick={onToggle}>
            {isPlaying ? <DotPause size={20} /> : <DotPlay size={20} />}
          </GlassPill>
          <GlassPill label="next track" onClick={onNext}>
            <DotNext size={20} />
          </GlassPill>

          {/* volume slider: dot-matrix fill, dots light up left-to-right by level */}
          <div
            ref={volRef}
            className="no-drag cdp-btn relative h-9 flex-1 cursor-pointer"
            onPointerDown={(e) => {
              e.currentTarget.setPointerCapture?.(e.pointerId);
              seekFromClientX(volRef.current, e.clientX, onVolume);
            }}
            onPointerMove={(e) => {
              if (e.buttons & 1) seekFromClientX(volRef.current, e.clientX, onVolume);
            }}
          >
            <div
              className="absolute inset-0 z-[1] grid"
              style={{
                gridTemplateColumns: `repeat(${volCols}, 1fr)`,
                gridTemplateRows: `repeat(${VOL_ROWS_FILL}, 1fr)`,
              }}
            >
              {Array.from({ length: volCols * VOL_ROWS_FILL }).map((_, i) => {
                const col = i % volCols;
                const on = !muted && (col + 0.5) / volCols <= volume;
                return (
                  <span
                    key={i}
                    className="rounded-full"
                    style={{
                      background: on ? "#e8b800" : "#2b2b2b",
                      width: VOL_DOT,
                      height: VOL_DOT,
                      placeSelf: "center",
                    }}
                  />
                );
              })}
            </div>
            {/* liquid glass over the whole pill */}
            <span className="cdp-glass" />
          </div>
          {/* LED: lit while playing */}
          <span className={`cdp-led${isPlaying ? " on" : ""}`} title={isPlaying ? "playing" : "paused"} />
        </div>

        {/* title bar doubles as track progress: fill behind, drag to seek */}
        <div
          ref={titleRef}
          className="no-drag relative mt-3 cursor-pointer overflow-hidden rounded-full bg-[#2f2f33] px-0 py-1.5 text-center shadow"
          onPointerDown={(e) => {
            e.currentTarget.setPointerCapture?.(e.pointerId);
            seekFromClientX(titleRef.current, e.clientX, onSeek);
          }}
          onPointerMove={(e) => {
            if (e.buttons & 1) seekFromClientX(titleRef.current, e.clientX, onSeek);
          }}
        >
          <motion.div
            className="absolute inset-y-0 left-0 w-full origin-left bg-[#e8b800]/25"
            animate={{ scaleX: progress }}
            transition={{ ease: "linear", duration: 0.25 }}
          />
          <AnimatePresence mode="wait">
            <motion.div
              key={track ? track.path : "empty"}
              initial={{ y: 12, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -12, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="font-bauhaus relative overflow-hidden whitespace-nowrap text-[30px] lowercase tracking-wide text-[#e8b800]"
            >
              <TitleMarquee label={titleLabel} />
            </motion.div>
          </AnimatePresence>
          {/* edge tint glass */}
          <span className="cdp-capsule-glass" />
        </div>
        </div>
      </motion.div>
    </div>
  );
}
