# Sermon Transcription UI

A minimal, production-ready React interface for uploading audio files and managing transcripts.

## Quick Start

```bash
npm install
npm run dev
```

Open http://localhost:5173

## Folder Structure

```
src/
├── api/
│   └── transcription.ts    ← All API calls (mocked, ready to integrate)
├── components/
│   ├── UploadSection.tsx    ← File upload with drag-and-drop + progress
│   ├── TranscriptionSection.tsx ← Job trigger + status display
│   └── EditorSection.tsx   ← Large text editor + save + download
├── hooks/
│   └── useDebounce.ts      ← Auto-save debounce hook
├── types/
│   └── index.ts            ← Shared TypeScript types
├── App.tsx                 ← App state, orchestration, .doc download
├── App.css                 ← All styles (CSS variables, no framework)
└── main.tsx                ← Entry point
```

## API Integration

Open `src/api/transcription.ts` and replace the mock bodies of:

| Function | Where to integrate |
|---|---|
| `uploadAudio(file, onProgress)` | `POST /api/upload` with `FormData` |
| `startTranscription(fileId)` | `POST /api/transcribe` then poll for result |
| `saveTranscript(text)` | `POST /api/transcripts` |

The function signatures are stable — don't change them, only the internals.

## Features

- Drag-and-drop or click-to-browse file selection (MP3, WAV, M4A, FLAC, AAC, OGG)
- Mocked upload with animated progress bar
- Mocked transcription with 3 s simulated processing
- Full-height resizable textarea (handles tens of thousands of words efficiently)
- Auto-save: triggers 4 s after the last keystroke (debounced)
- Manual Save button
- Download transcript as `.doc` (RTF format, opens in Word / LibreOffice / Google Docs)
- Word count display
- Fully responsive

## Build for Production

```bash
npm run build
```

Output in `dist/`.
