import { useEffect, useRef, useState } from "react";
import {
  heartMask,
  A_VARIANTS,
  drawBloomFrame,
  bloomPeriod,
  DOT_COLS,
  DOT_ROWS,
  DOT_P,
} from "@/lib/dotAnims";
import { drawHeartFinale, A2_PERIOD } from "@/lib/heartFinale";
import { drawSleepy, SLEEPY_PERIOD } from "@/lib/sleepy";
import { drawCassette, CASSETTE_PERIOD } from "@/lib/archive/cassette";
import { drawEnvelope, ENVELOPE_PERIOD } from "@/lib/archive/envelope";
import { drawAlarm, ALARM_PERIOD } from "@/lib/alarm";
import { drawRocket, ROCKET_PERIOD } from "@/lib/rocket";
import { drawTetris, TETRIS_PERIOD } from "@/lib/tetris";
import { drawFireworks, FIREWORKS_PERIOD } from "@/lib/fireworks";
import { drawUmbrella, UMBRELLA_PERIOD } from "@/lib/umbrella";
import DiscFaces from "./disc-faces";
import { DotRepeatR1, DotRepeatR2, DotRepeatR3, DotRepeatR4 } from "./components/icons";
import { DotRepeatR5, DotRepeatR6, DotRepeatR7, DotRepeatR8 } from "./components/icons";

const INFO = heartMask();

type Cell = {
  title: string;
  desc: string;
  period: number;
  draw: (g: CanvasRenderingContext2D, t: number) => void;
};

function DotCell({ cell, t0 }: { cell: Cell; t0: number }) {
  const ref = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    let raf = 0;
    const draw = () => {
      const cv = ref.current;
      const g = cv?.getContext("2d");
      if (cv && g) {
        g.clearRect(0, 0, cv.width, cv.height);
        const t = ((performance.now() - t0) / 1000) % cell.period;
        cell.draw(g, t);
      }
      raf = requestAnimationFrame(draw);
    };
    raf = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(raf);
  }, [cell, t0]);

  return (
    <div className="flex flex-col items-center gap-2">
      <canvas
        ref={ref}
        width={DOT_COLS * DOT_P}
        height={DOT_ROWS * DOT_P}
        style={{ width: 220, height: 220 }}
        className="rounded-2xl bg-[#141416]"
      />
      <div className="font-bauhaus text-[15px] lowercase text-[#e8b800]">{cell.title}</div>
      <div className="font-bauhaus text-[11px] lowercase text-white/40">{cell.desc}</div>
    </div>
  );
}

const CELLS: Cell[] = [
  {
    title: "A1 — hold 2s",
    desc: A_VARIANTS[0]!.desc,
    period: bloomPeriod(INFO, A_VARIANTS[0]!.params),
    draw: (g, t) => drawBloomFrame(g, INFO, A_VARIANTS[0]!.params, t),
  },
  {
    title: "A2 — finale",
    desc: "saved build → heartFinale.ts",
    period: A2_PERIOD,
    draw: (g, t) => drawHeartFinale(g, t),
  },
  {
    title: "cassette",
    desc: "rise 2s · hold 1s · exit 1.2s · reels spin",
    period: CASSETTE_PERIOD,
    draw: (g, t) => drawCassette(g, t),
  },
  {
    title: "sleepy",
    desc: "closed eyes · Z sway · vanish outside→in",
    period: SLEEPY_PERIOD,
    draw: (g, t) => drawSleepy(g, t),
  },
  {
    title: "envelope",
    desc: "snap in · flap opens · letter rises · vanish",
    period: ENVELOPE_PERIOD,
    draw: (g, t) => drawEnvelope(g, t),
  },
  {
    title: "alarm",
    desc: "hammer strikes · arcs · hands tick",
    period: ALARM_PERIOD,
    draw: (g, t) => drawAlarm(g, t),
  },
  {
    title: "rocket",
    desc: "ignite · liftoff · smoke puffs",
    period: ROCKET_PERIOD,
    draw: (g, t) => drawRocket(g, t),
  },
  {
    title: "tetris",
    desc: "10-wide well · shifts + spin · double clear",
    period: TETRIS_PERIOD,
    draw: (g, t) => drawTetris(g, t),
  },
  {
    title: "fireworks",
    desc: "3 volleys · gravity sparks · flash cores",
    period: FIREWORKS_PERIOD,
    draw: (g, t) => drawFireworks(g, t),
  },
  {
    title: "umbrella",
    desc: "canopy sweep · rain from top · splash",
    period: UMBRELLA_PERIOD,
    draw: (g, t) => drawUmbrella(g, t),
  },
];

export default function DotsTest() {
  const [t0, setT0] = useState(() => performance.now());
  return (
    <div className="flex h-full flex-col items-center gap-6 overflow-y-auto bg-black py-10">
      <div className="font-bauhaus text-[22px] lowercase text-[#e8b800]">
        dots anims test
      </div>
      <button
        onClick={() => setT0(performance.now())}
        className="font-bauhaus rounded-full bg-[#e8b800] px-6 py-2 text-[13px] lowercase text-black"
      >
        replay all
      </button>
      <div className="grid grid-cols-2 gap-8">
        {CELLS.map((c) => (
          <DotCell key={c.title} cell={c} t0={t0} />
        ))}
      </div>
      <div className="font-bauhaus max-w-[520px] px-6 text-center text-[11px] lowercase leading-relaxed text-white/40">
        same dots: pitch 10 · radius 4.5 · #e8b800 on #2b2b2b
      </div>
      <DiscFaces />
      <div className="font-bauhaus mt-4 text-[22px] lowercase text-[#e8b800]">
        repeat loops
      </div>
      <div className="grid grid-cols-2 gap-8">
        {[
          { name: "R1 — circular arrow", C: DotRepeatR1 },
          { name: "R2 — double arrow", C: DotRepeatR2 },
          { name: "R3 — square loop", C: DotRepeatR3 },
          { name: "R4 — bold ring", C: DotRepeatR4 },
          { name: "R5 — latin R", C: DotRepeatR5 },
          { name: "R6 — bold R", C: DotRepeatR6 },
          { name: "R7 — loop, head up-right", C: DotRepeatR7 },
          { name: "R8 — loop, head down-left", C: DotRepeatR8 },
        ].map(({ name, C }) => (
          <div key={name} className="flex flex-col items-center gap-2">
            <div className="flex items-center justify-center rounded-2xl bg-[#2f2f33] p-6 text-[#e8b800]">
              <C size={56} />
            </div>
            <div className="font-bauhaus text-[15px] lowercase text-[#e8b800]">{name}</div>
            <div className="font-bauhaus text-[11px] lowercase text-white/40">
              same grid: pitch 10 · R 4.5 · shown 56px, ships at 18px like folder
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
