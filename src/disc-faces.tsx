// Branded retro disc faces — 4 variants for review on the test page.
// SVG, viewBox 200×200, Bauhaus type, CDP branding.

const HOLE_BG = "#141416"; // test cell bg (punched center hole)

function Hole({ ring = "#2f2f33" }: { ring?: string }) {
  return (
    <>
      <circle cx="100" cy="100" r="15" fill={HOLE_BG} />
      <circle cx="100" cy="100" r="15" fill="none" stroke={ring} strokeWidth="2.5" />
      <circle cx="100" cy="100" r="4" fill={ring} />
    </>
  );
}

function FaceA() {
  return (
    <svg viewBox="0 0 200 200" style={{ width: 220, height: 220 }}>
      <defs>
        <path id="discA-arc" d="M 100,100 m -68,0 a 68,68 0 1,1 136,0 a 68,68 0 1,1 -136,0" />
        <path id="discA-arc-b" d="M 100,100 m -68,0 a 68,68 0 0,0 136,0" />
      </defs>
      <circle cx="100" cy="100" r="96" fill="#f1ead9" />
      <circle cx="100" cy="100" r="86" fill="none" stroke="#e8b800" strokeWidth="7" />
      <text fontFamily="Righteous, sans-serif" fontSize="13" letterSpacing="3" fill="#2f2f33">
        <textPath href="#discA-arc">CDP • STEREO MUSIC PLAYER • RETRO SOUND •</textPath>
      </text>
      <text fontFamily="Righteous, sans-serif" fontSize="10" letterSpacing="2" fill="#2f2f33" textAnchor="middle">
        <textPath href="#discA-arc-b" startOffset="50%">designed by ruwee</textPath>
      </text>
      <circle cx="100" cy="100" r="30" fill="#e8b800" />
      <text x="100" y="107" textAnchor="middle" fontFamily="Righteous, sans-serif" fontSize="20" fill="#2f2f33">
        CDP
      </text>
      <Hole />
    </svg>
  );
}

function FaceB() {
  return (
    <svg viewBox="0 0 200 200" style={{ width: 220, height: 220 }}>
      <defs>
        <clipPath id="discB-clip">
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>
      <g clipPath="url(#discB-clip)">
        <rect x="0" y="0" width="200" height="200" fill="#f3ecdd" />
        <rect x="0" y="0" width="200" height="96" fill="#e8b800" />
        <rect x="0" y="88" width="200" height="24" fill="#2f2f33" />
        <text x="100" y="106" textAnchor="middle" fontFamily="Righteous, sans-serif" fontSize="17" letterSpacing="4" fill="#e8b800">
          CDP • CDP • CDP
        </text>
        <text x="100" y="152" textAnchor="middle" fontFamily="Righteous, sans-serif" fontSize="15" letterSpacing="6" fill="#2f2f33">
          STEREO
        </text>
      </g>
      <circle cx="100" cy="100" r="96" fill="none" stroke="#2f2f33" strokeWidth="3" />
      <Hole />
    </svg>
  );
}

function FaceC() {
  return (
    <svg viewBox="0 0 200 200" style={{ width: 220, height: 220 }}>
      <defs>
        <linearGradient id="discC-base" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#e8e6e1" />
          <stop offset="0.5" stopColor="#f2f0eb" />
          <stop offset="1" stopColor="#c9c6bf" />
        </linearGradient>
      </defs>
      <circle cx="100" cy="100" r="96" fill="url(#discC-base)" />
      {Array.from({ length: 10 }).map((_, i) => (
        <circle
          key={i}
          cx="100"
          cy="100"
          r={36 + i * 6}
          fill="none"
          stroke="rgba(0,0,0,0.10)"
          strokeWidth="1.5"
        />
      ))}
      <path d="M 20,60 A 90,90 0 0,1 90,14" fill="none" stroke="rgba(255,0,128,0.22)" strokeWidth="10" />
      <path d="M 110,186 A 90,90 0 0,1 180,140" fill="none" stroke="rgba(0,255,180,0.22)" strokeWidth="10" />
      <circle cx="100" cy="100" r="30" fill="#2f2f33" />
      <text x="100" y="107" textAnchor="middle" fontFamily="Righteous, sans-serif" fontSize="19" fill="#e8b800">
        CDP
      </text>
      <Hole ring="#e8b800" />
    </svg>
  );
}

function FaceD() {
  const wedges = Array.from({ length: 12 });
  const pt = (ang: number, r: number): string =>
    `${(100 + r * Math.cos(ang)).toFixed(1)},${(100 + r * Math.sin(ang)).toFixed(1)}`;
  return (
    <svg viewBox="0 0 200 200" style={{ width: 220, height: 220 }}>
      <defs>
        <clipPath id="discD-clip">
          <circle cx="100" cy="100" r="96" />
        </clipPath>
      </defs>
      <g clipPath="url(#discD-clip)">
        <rect x="0" y="0" width="200" height="200" fill="#f3ecdd" />
        {wedges.map((_, i) => {
          const a0 = (i / 12) * Math.PI * 2;
          const a1 = ((i + 1) / 12) * Math.PI * 2;
          return i % 2 === 0 ? (
            <polygon key={i} points={`100,100 ${pt(a0, 100)} ${pt(a1, 100)}`} fill="#e8b800" />
          ) : null;
        })}
      </g>
      <circle cx="100" cy="100" r="96" fill="none" stroke="#2f2f33" strokeWidth="4" />
      <circle cx="100" cy="100" r="32" fill="#2f2f33" />
      <text x="100" y="108" textAnchor="middle" fontFamily="Righteous, sans-serif" fontSize="21" fill="#e8b800">
        CDP
      </text>
      <Hole />
    </svg>
  );
}

const FACES: { name: string; desc: string; el: React.ReactNode }[] = [
  { name: "A — cream label", desc: "желтое кольцо + круговая надпись", el: <FaceA /> },
  { name: "B — bauhaus band", desc: "полосы + бегущий CDP", el: <FaceB /> },
  { name: "C — grooves", desc: "дорожки + темный пятак", el: <FaceC /> },
  { name: "D — sunburst", desc: "солнце-лучи + темный центр", el: <FaceD /> },
];

export default function DiscFaces() {
  return (
    <>
      <div className="font-bauhaus mt-4 text-[22px] lowercase text-[#e8b800]">disc faces</div>
      <div className="grid grid-cols-2 gap-8">
        {FACES.map((f) => (
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
