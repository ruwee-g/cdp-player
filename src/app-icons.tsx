// App icon candidates — 4 variants, dot-matrix note in our dot language.
// Shown on the design lab page (#dots-test).

import { DotNote } from "./components/icons";

function Shell({
  bg,
  children,
}: {
  bg: string;
  children: React.ReactNode;
}) {
  return (
    <svg viewBox="0 0 128 128" style={{ width: 160, height: 160 }}>
      <rect x="4" y="4" width="120" height="120" rx="28" fill={bg} />
      {children}
    </svg>
  );
}

// note bitmap is 9×13 → rendered 46×66, centered
function Note({ color, x = 41, y = 31 }: { color: string; x?: number; y?: number }) {
  return (
    <g transform={`translate(${x},${y}) scale(5.1)`} fill={color}>
      {[
        [5, 0], [6, 0], [7, 0], [8, 0],
        [5, 1], [6, 1], [7, 1], [8, 1],
        [5, 2], [6, 2],
        [5, 3], [6, 3],
        [5, 4], [6, 4],
        [5, 5], [6, 5],
        [5, 6], [6, 6],
        [5, 7], [6, 7],
        [5, 8], [6, 8],
        [1, 9], [2, 9], [3, 9], [4, 9], [5, 9], [6, 9], [7, 9],
        [0, 10], [1, 10], [2, 10], [3, 10], [4, 10], [5, 10],
        [0, 11], [1, 11], [2, 11], [3, 11], [4, 11], [5, 11],
        [1, 12], [2, 12], [3, 12], [4, 12],
      ].map(([cx, cy], i) => (
        <circle key={i} cx={cx + 0.5} cy={cy + 0.5} r="0.45" />
      ))}
    </g>
  );
}

function IconA() {
  return (
    <Shell bg="#2f2f33">
      <Note color="#e8b800" />
    </Shell>
  );
}

function IconB() {
  return (
    <Shell bg="#f3ecdd">
      <Note color="#2f2f33" />
    </Shell>
  );
}

function IconC() {
  return (
    <Shell bg="#e8b800">
      <Note color="#2f2f33" />
    </Shell>
  );
}

function IconD() {
  return (
    <Shell bg="#1a1a1c">
      <circle cx="64" cy="64" r="44" fill="#f3ecdd" />
      <circle cx="64" cy="64" r="44" fill="none" stroke="#e8b800" strokeWidth="4" />
      <Note color="#e8b800" x={41} y={31} />
    </Shell>
  );
}

const ICONS: { name: string; desc: string; el: React.ReactNode }[] = [
  { name: "A — dark + yellow note", desc: "как кнопки плеера", el: <IconA /> },
  { name: "B — cream + dark note", desc: "как корпус", el: <IconB /> },
  { name: "C — yellow + dark note", desc: "максимум внимания", el: <IconC /> },
  { name: "D — disc", desc: "мини-диск с нотой", el: <IconD /> },
];

export { DotNote };

export default function AppIcons() {
  return (
    <>
      <div className="font-bauhaus mt-4 text-[22px] lowercase text-[#e8b800]">app icons</div>
      <div className="grid grid-cols-2 gap-8">
        {ICONS.map((f) => (
          <div key={f.name} className="flex flex-col items-center gap-2">
            <div className="rounded-2xl bg-[#141416] p-3">{f.el}</div>
            <div className="font-bauhaus text-[15px] lowercase text-[#e8b800]">{f.name}</div>
            <div className="font-bauhaus text-[11px] lowercase text-white/40">{f.desc}</div>
          </div>
        ))}
      </div>
    </>
  );
}
