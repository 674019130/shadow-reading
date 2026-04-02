<div align="center">

# Shadow Reading

**An immersive English speaking practice tool built on the shadow reading method (影子跟读法)**

Listen to native speakers, follow along like a shadow, and build fluency through daily guided sessions.

[![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

![Home](docs/screenshot-home.png)

## Practice Mode

Full-screen immersive interface with waveform audio player, synchronized subtitles, and a 5-phase guided session flow.

![Practice](docs/screenshot-practice.png)

## Double-click Dictionary

Double-click any word in the subtitles for instant bilingual lookup — English definition + Chinese translation, with pronunciation and examples.

![Dictionary](docs/screenshot-dictionary.png)

## Features

```
 Listen  ───▶  Read  ───▶  Shadow  ───▶  Record  ───▶  Retell
  3 min        3 min       10 min         3 min         1 min
```

- **Waveform Audio Player** — wavesurfer.js with speed control (0.5x – 1.5x), skip, and restart
- **Synchronized Subtitles** — SRT/VTT/JSON parsing with binary search time sync and auto-scroll
- **5-Phase Guided Practice** — structured 20-minute sessions following proven shadowing methodology
- **Sentence Loop** — click any subtitle to seek; press `L` to loop the current sentence
- **Voice Recording** — record yourself and compare side-by-side with the original audio
- **Bilingual Dictionary** — double-click any word for instant EN/CN definition lookup
- **YouTube Import** — paste a URL to auto-download audio + English subtitles via yt-dlp
- **Local File Import** — drag and drop MP3 + SRT file pairs
- **Progress Tracking** — practice streak calendar, comprehension trends, session history
- **Session Assessment** — rate your performance with comprehension %, sync loss count, and notes
- **Keyboard-First** — full shortcut support for distraction-free practice

## Keyboard Shortcuts

| Key | Action |
|:---:|--------|
| <kbd>Space</kbd> | Play / Pause |
| <kbd>R</kbd> | Start / Stop recording |
| <kbd>L</kbd> | Toggle sentence loop |
| <kbd>S</kbd> | Toggle subtitle visibility |
| <kbd>← →</kbd> | Skip back / forward 5s |
| <kbd>↑ ↓</kbd> | Speed up / down |

## Getting Started

**Prerequisites:** Node.js 20+, pnpm, yt-dlp (for YouTube import), ffmpeg

```bash
git clone https://github.com/674019130/shadow-reading.git
cd shadow-reading
pnpm install
pnpm dev
# → http://localhost:3000
```

A built-in TED Talk is included as starter material. Import more via YouTube URL or local files.

## Tech Stack

| Category | Technology |
|----------|-----------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4, OKLCH color system |
| Audio | wavesurfer.js |
| Recording | Web MediaRecorder API |
| Storage | Dexie.js (IndexedDB) |
| State | Zustand |
| Charts | Recharts |
| Dictionary | [Free Dictionary API](https://dictionaryapi.dev) + [MyMemory](https://mymemory.translated.net) |
| Import | yt-dlp + ffmpeg |

## Project Structure

```
src/
├── app/                      # Pages + API routes
│   ├── page.tsx              # Home dashboard
│   ├── practice/[id]/        # Practice mode
│   ├── materials/            # Material library
│   ├── progress/             # Progress dashboard
│   └── api/                  # Upload, serve, YouTube
├── components/
│   ├── practice/             # AudioPlayer, SubtitleDisplay, RecordingPanel,
│   │                         # SessionTimer, DictionaryPopup, AssessmentDialog
│   ├── materials/            # MaterialsLibrary, ImportDialog
│   ├── progress/             # ProgressDashboard
│   └── layout/               # AppShell, Sidebar
├── stores/                   # Zustand practice session store
└── lib/                      # DB, SRT parser, recorder, types
```

## License

MIT
