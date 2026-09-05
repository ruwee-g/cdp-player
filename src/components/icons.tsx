// Dot-matrix SVG icons in the Bauhaus-dot style (see reference).
// Each icon is a bitmap: "#" = dot, "." = empty.
// Dots never touch: grid pitch 10, dot diameter 8.2 → 1.8px gap.
// Color inherits from parent via currentColor.

const P = 10;
const R = 4.5;

/** Dot diameter as a fraction of grid pitch (0.9) — single source of truth for dot size. */
export const DOT_FILL_RATIO = (R * 2) / P;

/** Exact rendered dot diameter for an icon of `renderedSize` px with `gridRows` rows. */
export function dotSize(renderedSize: number, gridRows: number) {
  return (renderedSize / gridRows) * DOT_FILL_RATIO;
}

function Dots({ map }: { map: string[] }) {
  const rows = map.length;
  const cols = Math.max(...map.map((r) => r.length));
  const circles: React.ReactNode[] = [];
  map.forEach((row, y) => {
    [...row].forEach((ch, x) => {
      if (ch === "#") {
        circles.push(
          <circle key={`${x}-${y}`} cx={x * P + P / 2} cy={y * P + P / 2} r={R} fill="currentColor" />,
        );
      }
    });
  });
  return (
    <svg
      viewBox={`0 0 ${cols * P} ${rows * P}`}
      width="100%"
      height="100%"
      preserveAspectRatio="xMidYMid meet"
      aria-hidden
    >
      {circles}
    </svg>
  );
}

function makeIcon(map: string[]) {
  const rows = map.length;
  const cols = Math.max(...map.map((r) => r.length));
  return function DotIcon({ size = 16 }: { size?: number }) {
    return (
      <span
        style={{ display: "inline-flex", width: (size * cols) / rows, height: size, flexShrink: 0 }}
      >
        <Dots map={map} />
      </span>
    );
  };
}

export const DotPlay = makeIcon([
  "#..",
  "##.",
  "###",
  "##.",
  "#..",
]);

export const DotPause = makeIcon([
  "##.##",
  "##.##",
  "##.##",
  "##.##",
  "##.##",
]);

export const DotPrev = makeIcon([
  "#...##",
  "#..###",
  "#.####",
  "#..###",
  "#...##",
]);

export const DotNext = makeIcon([
  "##...#",
  "###..#",
  "####.#",
  "###..#",
  "##...#",
]);

export const DotEject = makeIcon([
  "..#..",
  ".###.",
  "#####",
  ".....",
  "#####",
  "#####",
]);

export const DotFolder = makeIcon([
  "###....",
  "#######",
  "#.....#",
  "#.....#",
  "#######",
  "#######",
]);

export const DotDisc = makeIcon([
  ".###.",
  "#####",
  "##.##",
  "#####",
  ".###.",
]);

export const DotRepeat = makeIcon([
  "..###..",
  ".#...#.",
  "#.....#",
  "#.....#",
  "#.....#",
  ".#...#.",
  "..###.#",
]);

export const DotOne = makeIcon([
  ".#.",
  "##.",
  ".#.",
  ".#.",
  "###",
]);

// Repeat-loop candidates, same grid language (pitch 10, R 4.5).
// R1: circular arrow. R2: classic double-arrow. R3: rounded-square loop.
// R4: bold ring with head.
export const DotRepeatR1 = makeIcon([
  "..#####.",
  ".#....##",
  "#......#",
  "#......#",
  "#......#",
  ".#....#.",
  "..####..",
]);

export const DotRepeatR2 = makeIcon([
  ".......##",
  "#########",
  ".......##",
  ".........",
  "##.......",
  "#########",
  "##.......",
]);

export const DotRepeatR3 = makeIcon([
  ".#####..",
  "#.....##",
  "#......#",
  "#......#",
  "#......#",
  "#......#",
  ".######.",
]);

export const DotRepeatR4 = makeIcon([
  "..###..",
  ".#####.",
  "###.###",
  "##...##",
  "###.###",
  ".#####.",
  "..##.#.",
]);

// Second batch: latin R (regular + bold) and ring loops, both directions.
export const DotRepeatR5 = makeIcon([
  "####.",
  "#...#",
  "#...#",
  "####.",
  "#.#..",
  "#..#.",
  "#...#",
]);

export const DotRepeatR6 = makeIcon([
  "####..",
  "#...#.",
  "#...#.",
  "####..",
  "#.#...",
  "#..#..",
  "#...#.",
]);

export const DotRepeatR7 = makeIcon([
  "..###.#",
  ".#...##",
  "#.....#",
  "#.....#",
  "#.....#",
  ".#...#.",
  "..###..",
]);

export const DotRepeatR8 = makeIcon([
  "..###..",
  ".#...#.",
  "#.....#",
  "#.....#",
  "#.....#",
  "##...#.",
  ".####..",
]);
