<div align="center">

# Shadow Reading

**A personal daily English training tool for listening, reading, shadowing, recording, and retelling.**

把英文材料导入进来，按 20 分钟左右的轻量流程练一遍：先听懂，再看懂，再跟读，最后录音和复述。

[![Next.js](https://img.shields.io/badge/Next.js_16-000?logo=nextdotjs&logoColor=white)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React_19-61DAFB?logo=react&logoColor=000)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS_4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

</div>

---

![Home](docs/screenshot-home.png)

## What It Does

Shadow Reading is built around one repeatable daily loop:

```text
Listen -> Read -> Shadow -> Record -> Retell
```

The app gives each phase a clear focus, but phase changes are manual. Timers can suggest that it is time to move on, while the user stays in control of when to advance.

## Core Workflow

1. Import or create a material.
2. Confirm sentence units and optional Chinese translations.
3. Practice through the five phases.
4. Loop difficult sentences with a small lead-in and tail buffer.
5. Record yourself and retell the material from memory.

![Practice](docs/screenshot-practice.png)

## Features

- **Five-phase practice flow**: blind listening, detailed reading, shadowing, recording, and retelling.
- **Manual phase progression**: the current audio/video is reset at phase boundaries so each stage starts cleanly.
- **Text-to-material import**: paste English text, check grammar, rewrite it naturally, generate AI speech, then practice it immediately.
- **Editable sentence units**: automatic sentence splitting uses `sentence-splitter`, then lets you edit, split, and merge rows before saving.
- **Chinese translations**: generate per-sentence Chinese translations during text import and show bilingual lines during reading.
- **Audio and video import**: upload local audio/video files with optional SRT, VTT, TXT, or JSON subtitles.
- **YouTube import**: paste a YouTube URL to download audio and English subtitles through `yt-dlp`.
- **Buffered sentence loop**: loop the current sentence with adjusted start/end boundaries instead of cutting too tightly.
- **Bilingual dictionary**: double-click a word for English definitions, Chinese translation, and US/UK pronunciation rows.
- **Local-first materials**: imported and generated materials are stored locally under `data/materials`.
- **Keyboard-first practice**: playback, looping, subtitle visibility, recording, and speed controls are available from the keyboard.

![Dictionary](docs/screenshot-dictionary.png)

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

**Prerequisites:** Node.js 20+, pnpm. For YouTube import, install `yt-dlp` and `ffmpeg`.

```bash
git clone https://github.com/674019130/shadow-reading.git
cd shadow-reading
pnpm install
pnpm dev
```

Open `http://localhost:3000`. To use another port:

```bash
PORT=3100 pnpm dev
```

A built-in TED Talk is included as starter material. New materials can come from pasted text, local audio/video files, or YouTube.

## Environment Variables

OpenAI is only required for AI text revision and AI speech generation. The rest of the app can still run without it.

| Variable | Required | Purpose |
|----------|----------|---------|
| `OPENAI_API_KEY` | For text revision and speech | Enables pasted-text checking, rewriting, and TTS generation |
| `OPENAI_TEXT_MODEL` | No | Overrides the text revision model, default `gpt-4.1-mini` |
| `OPENAI_TTS_MODEL` | No | Overrides the speech model, default `gpt-4o-mini-tts` |
| `LIBRETRANSLATE_URL` | No | Preferred LibreTranslate endpoint for Chinese translation |
| `LIBRETRANSLATE_URLS` | No | Comma-separated LibreTranslate endpoints to try |
| `LIBRETRANSLATE_API_KEY` | No | API key for LibreTranslate-compatible endpoints |

Chinese translation uses free providers opportunistically, currently MyMemory and LibreTranslate-compatible endpoints. Availability and translation quality can vary.

## Material Storage

```text
data/
├── materials/
│   ├── index.json        # local material index
│   └── *.mp3 / *.mp4    # uploaded or generated media
└── youtube-cache/        # cached YouTube downloads

public/
└── starter-materials/    # built-in starter audio and subtitles
```

Generated text materials save AI speech as local media and store estimated subtitle timings from the confirmed sentence rows.

## Verification

```bash
pnpm lint
node --experimental-strip-types --test \
  tests/server-materials.test.mts \
  tests/text-material.test.mts \
  tests/practice-store.test.mts \
  tests/loop-range.test.mts
pnpm build
```

## Tech Stack

| Category | Technology |
|----------|------------|
| Framework | Next.js 16, React 19, TypeScript |
| Styling | Tailwind CSS 4 |
| Audio | wavesurfer.js |
| Video | Native HTML video |
| Recording | Web MediaRecorder API |
| Local DB | Dexie.js and local JSON material index |
| State | Zustand |
| Charts | Recharts |
| Sentence splitting | sentence-splitter |
| Dictionary | Free Dictionary API + MyMemory |
| AI text and speech | OpenAI Responses API + Audio Speech API |
| Import | Local upload, YouTube through yt-dlp and ffmpeg |

## Notes

- Generated speech subtitle timing is estimated from confirmed sentence lengths, not word-level forced alignment.
- Free translation is best treated as a draft. The text import screen allows manual correction before saving.
- Local uploaded media is served with range requests so audio and video seeking works in the practice page.

## License

MIT
