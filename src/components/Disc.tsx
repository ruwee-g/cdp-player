import { useRef } from "react";
import { motion, useMotionValue, useAnimationFrame } from "motion/react";
import { beginManualDrag } from "@/lib/windowDrag";

// Transparent top, 3 layers:
// 1 - pocket substrate (.cdp-pocket), 2 - disc (spins with inertia), 3 - glass over whole zone.
// Rotation decelerates ~2s on pause via rAF velocity.
export default function Disc({ playing }: { playing: boolean }) {
  const rotate = useMotionValue(0);
  const angle = useRef(0);
  const vel = useRef(0);
  const last = useRef<number | null>(null);

  useAnimationFrame((t) => {
    if (last.current == null) {
      last.current = t;
      return;
    }
    const dt = Math.min((t - last.current) / 1000, 0.05);
    last.current = t;
    const target = playing ? 110 : 0; // deg per second
    const tau = 0.8; // ~2s to fully stop
    const k = 1 - Math.exp(-dt / tau);
    vel.current += (target - vel.current) * k;
    if (target === 0 && Math.abs(vel.current) < 0.05) vel.current = 0;
    angle.current = (angle.current + vel.current * dt) % 360;
    rotate.set(angle.current);
  });

  return (
    <div className="pointer-events-none absolute inset-x-0 top-0 z-0">
      {/* explicit window drag handle over the exposed disc zone (0–112px).
          Nothing interactive lives here, so no target filtering needed. */}
      <div
        className="pointer-events-auto absolute inset-x-0 top-0 z-20 h-28 cursor-grab active:cursor-grabbing"
        onPointerDown={(e) => {
          void beginManualDrag(e);
        }}
      />
      {/* layer 1: pocket substrate — full player width */}
      <div className="cdp-pocket relative h-40 w-full overflow-hidden rounded-t-[24px]">
        {/* layer 2: disc */}
        <motion.div
          initial={false}
          className="absolute left-1/2 top-5 -translate-x-1/2"
        >
          <motion.div
            style={{ rotate }}
            className="relative h-80 w-80 rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.35)] ring-4 ring-white/70"
          >
            {/* branded cream label — disc face A */}
            <svg viewBox="0 0 200 200" className="h-full w-full">
              <defs>
                <path
                  id="discPlayer-arc"
                  d="M 100,100 m -68,0 a 68,68 0 1,1 136,0 a 68,68 0 1,1 -136,0"
                />
              </defs>
              <circle cx="100" cy="100" r="98" fill="#f1ead9" />
              <circle cx="100" cy="100" r="86" fill="none" stroke="#e8b800" strokeWidth="7" />
              <text
                fontFamily="Righteous, sans-serif"
                fontSize="13"
                letterSpacing="3"
                fill="#2f2f33"
              >
                <textPath href="#discPlayer-arc">
                  CDP • STEREO MUSIC PLAYER • RETRO SOUND •
                </textPath>
              </text>
              <circle cx="100" cy="100" r="30" fill="#e8b800" />
              <text
                x="100"
                y="107"
                textAnchor="middle"
                fontFamily="Righteous, sans-serif"
                fontSize="20"
                fill="#2f2f33"
              >
                CDP
              </text>
              <circle cx="100" cy="100" r="14" fill="#ffffff" />
              <circle cx="100" cy="100" r="14" fill="none" stroke="rgba(0,0,0,0.12)" strokeWidth="2" />
              <circle cx="100" cy="100" r="4" fill="#2b2b2e" />
            </svg>
          </motion.div>
        </motion.div>
        {/* layer 3: glass over the whole transparent zone */}
        <div className="cdp-pocket-glass" />
      </div>
    </div>
  );
}
