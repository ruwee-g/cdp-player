# CDP — minimal retro music player

A small cross-platform music player (macOS-first, plus Windows and Linux) with
a physical retro device look: cream plastic shell, dot-matrix icons, a branded
spinning disc and canvas visualizers. No window chrome — just the player.

## Features

- Local audio files: mp3, flac, wav, m4a/aac, ogg/opus, aiff, mp4/m4v audio
- Frameless transparent window, drag by the body or the disc
- Dot-matrix UI: transport icons, volume meter, spectrum visualizers
- 4 visualizer modes in the cover slot (spectrum, mirror, radial, wave),
  switchable with a horizontal trackpad swipe
- Idle animations: when paused, the mini screen plays a random dot-matrix
  animation every 10 seconds (heart, sleepy, cassette, rocket, tetris,
  fireworks, umbrella)
- Repeat off / all / one, seek bar, volume slider + mouse-wheel volume
- Keyboard shortcuts: `Space` play/pause, `←/→` prev/next (`Shift` = seek ∓10s),
  `↑/↓` volume, `M` mute
- Library, volume and repeat mode persist across restarts (localStorage)
- File picker (multi-select) + drag & drop of files and folders
- Tag + cover-art reading via Rust (`lofty`)

## Tech stack

- [Tauri 2](https://tauri.app/) (Rust backend) + React 19 + TypeScript + Vite
- Tailwind CSS v4, Motion, Zustand, lucide icons
- Audio playback: HTMLAudio + Web Audio `AnalyserNode` over Tauri `asset://`
  protocol; metadata via `lofty`

## Prerequisites

- Node.js 22+ and pnpm (`npm i -g pnpm`)
- Rust stable (`rustup`)
- macOS: Xcode Command Line Tools. Windows: WebView2 + VS Build Tools.
  Linux: webkit2gtk system packages (see [Tauri prerequisites](https://v2.tauri.app/start/prerequisites/))

## Develop

```bash
pnpm install
pnpm tauri dev
```

Frontend dev server runs on `http://localhost:1421` (1420 is a common
conflict — e.g. another Tauri project — so this repo uses 1421).

## Build

```bash
pnpm build          # frontend typecheck + bundle
pnpm tauri build    # native bundles: .dmg (macOS), NSIS (Windows), AppImage/deb (Linux)
```

`cargo check` / `cargo test` run inside `src-tauri/`.

## Project structure

```
src/
  App.tsx                 # wiring: audio element, dialogs, drag&drop, hotkeys
  components/
    CdpPlayer.tsx         # the player card (controls, volume, title, cover)
    Disc.tsx              # branded spinning disc (inertia physics)
    DotVisualizer.tsx     # cover-slot visualizers (4 modes)
    IdleAnim.tsx          # idle animation rotation
    icons.tsx             # hand-made dot-matrix SVG icons
  lib/
    audio.ts              # HTMLAudio + Web Audio singleton (HMR-safe)
    spectrum.ts           # dB-scale spectrum + peak-hold mapping
    dotAnims.ts           # dot animation engine + test presets
    heartFinale.ts sleepy.ts cassette.ts rocket.ts tetris.ts
    fireworks.ts umbrella.ts alarm.ts   # saved idle animations
    archive/              # retired animations (kept for reference)
  stores/player.ts        # zustand store (persisted)
  dots-test.tsx           # design lab: #dots-test route with animations,
                          # disc faces and repeat-loop icon candidates
  disc-faces.tsx          # branded disc face designs
src-tauri/
  src/lib.rs              # scan_folder / import_paths / track_cover commands
  capabilities/           # Tauri permission sets
Design/                   # designer source files (Figma exports, font)
```

Open `http://localhost:1421/#dots-test` in a browser while devving to preview
animations, disc faces and icon candidates on a separate page.

## Fonts

Display type is [Righteous](https://fonts.google.com/specimen/Righteous) by
Brian J. Bonislawsky (Astigmatic), licensed under the
[SIL Open Font License 1.1](https://scripts.sil.org/OFL) — see
`public/fonts/OFL.txt` (also copied under `Design/`).

## License

MIT © Roman Vovchenko — see [LICENSE](LICENSE).
