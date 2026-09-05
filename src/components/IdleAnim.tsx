import { useEffect, useRef } from "react";
import { drawUmbrella, UMBRELLA_PERIOD } from "@/lib/umbrella";
import { drawFireworks, FIREWORKS_PERIOD } from "@/lib/fireworks";
import { drawTetris, TETRIS_PERIOD } from "@/lib/tetris";
import { drawHeartFinale, A2_PERIOD } from "@/lib/heartFinale";
import { drawSleepy, SLEEPY_PERIOD } from "@/lib/sleepy";

export type IdleName = "umbrella" | "fireworks" | "tetris" | "heart" | "sleepy";

const ANIMS: Record<IdleName, { period: number; draw: (g: CanvasRenderingContext2D, t: number) => void }> = {
  umbrella: { period: UMBRELLA_PERIOD, draw: (g, t) => drawUmbrella(g, t) },
  fireworks: { period: FIREWORKS_PERIOD, draw: (g, t) => drawFireworks(g, t) },
  tetris: { period: TETRIS_PERIOD, draw: (g, t) => drawTetris(g, t) },
  heart: { period: A2_PERIOD, draw: (g, t) => drawHeartFinale(g, t) },
  sleepy: { period: SLEEPY_PERIOD, draw: (g, t) => drawSleepy(g, t) },
};

export const IDLE_NAMES = Object.keys(ANIMS) as IdleName[];

// Plays one idle animation once (280×280, same dot language), then onDone.
export default function IdleAnim({ name, onDone }: { name: IdleName; onDone: () => void }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    let raf = 0;
    const t0 = performance.now();
    const { period, draw } = ANIMS[name];
    const loop = () => {
      const cv = ref.current;
      const g = cv?.getContext("2d");
      const t = (performance.now() - t0) / 1000;
      if (t >= period) {
        doneRef.current();
        return;
      }
      if (cv && g) {
        g.clearRect(0, 0, cv.width, cv.height);
        draw(g, t);
      }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(raf);
  }, [name]);

  return <canvas ref={ref} width={280} height={280} className="h-full w-full" />;
}
