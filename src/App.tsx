import React, { useState, useCallback, useRef, useEffect } from 'react';
import UploadSection from './components/UploadSection';
import TranscriptionSection from './components/TranscriptionSection';
import EditorSection from './components/EditorSection';
import { uploadAudio, startTranscription, saveTranscript } from './api/transcription';
import { useDebounce } from './hooks/useDebounce';
import type { AppState } from './types';

// ─── .doc download ────────────────────────────────────────────────────────────
// Generates a minimal RTF file that Word and LibreOffice can open natively.
// RTF is universally supported and requires zero dependencies.
function downloadAsDoc(text: string, fileName: string): void {
  const escaped = text
    .replace(/\\/g, '\\\\')
    .replace(/\{/g, '\\{')
    .replace(/\}/g, '\\}')
    .split('\n')
    .map((line) => (line.trim() === '' ? '\\par' : line + '\\par'))
    .join('\n');

  const rtf = `{\\rtf1\\ansi\\deff0
{\\fonttbl{\\f0\\froman\\fprq2\\fcharset0 Times New Roman;}}
{\\colortbl ;\\red0\\green0\\blue0;}
\\widowctrl\\hyphauto
\\f0\\fs24\\cf1
${escaped}
}`;

  const blob = new Blob([rtf], { type: 'application/rtf' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName.replace(/\.[^.]+$/, '') + '.doc';
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Initial state ────────────────────────────────────────────────────────────
const INITIAL: AppState = {
  audioFile: null,
  uploadStatus: 'idle',
  uploadProgress: 0,
  transcriptionStatus: 'idle',
  transcript: '',
  saveStatus: 'idle',
};

// ─── App ──────────────────────────────────────────────────────────────────────
const App: React.FC = () => {
  const [state, setState] = useState<AppState>(INITIAL);

  // Track whether transcript has unsaved changes for auto-save
  const lastSavedRef = useRef<string>('');
  
  const transcriptionRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (state.uploadStatus === 'done') {
      transcriptionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.uploadStatus]);

  useEffect(() => {
    if (state.transcriptionStatus === 'done') {
      editorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [state.transcriptionStatus]);

  // ── File select ─────────────────────────────────────────────────────────────
  const handleFileSelect = useCallback((file: File) => {
    setState((s) => ({
      ...s,
      audioFile: { file, id: null },
      uploadStatus: 'idle',
      uploadProgress: 0,
      // Reset downstream state when a new file is picked
      transcriptionStatus: 'idle',
      transcript: '',
      saveStatus: 'idle',
    }));
    lastSavedRef.current = '';
  }, []);

  // ── Upload ──────────────────────────────────────────────────────────────────
  const handleUpload = useCallback(async () => {
    if (!state.audioFile) return;

    setState((s) => ({ ...s, uploadStatus: 'uploading', uploadProgress: 0 }));

    try {
      const result = await uploadAudio(state.audioFile.file, (pct) => {
        setState((s) => ({ ...s, uploadProgress: pct }));
      });

      setState((s) => ({
        ...s,
        audioFile: { ...s.audioFile!, id: result.fileId },
        uploadStatus: 'done',
        uploadProgress: 100,
      }));
    } catch {
      setState((s) => ({ ...s, uploadStatus: 'error' }));
    }
  }, [state.audioFile]);

  // ── Transcription ───────────────────────────────────────────────────────────
  const handleStartTranscription = useCallback(async () => {
    if (!state.audioFile?.id) return;

    setState((s) => ({ ...s, transcriptionStatus: 'processing', transcript: '' }));

    try {
      const result = await startTranscription(state.audioFile.id);
      setState((s) => ({
        ...s,
        transcriptionStatus: 'done',
        transcript: result.text,
        saveStatus: 'idle',
      }));
      lastSavedRef.current = result.text;
    } catch {
      setState((s) => ({ ...s, transcriptionStatus: 'error' }));
    }
  }, [state.audioFile]);

  // ── Transcript change ───────────────────────────────────────────────────────
  const handleTranscriptChange = useCallback((text: string) => {
    setState((s) => ({ ...s, transcript: text, saveStatus: 'idle' }));
  }, []);

  // ── Save ────────────────────────────────────────────────────────────────────
  const handleSave = useCallback(async () => {
    if (!state.transcript.trim()) return;

    setState((s) => ({ ...s, saveStatus: 'saving' }));
    try {
      await saveTranscript(state.transcript);
      lastSavedRef.current = state.transcript;
      setState((s) => ({ ...s, saveStatus: 'saved' }));
    } catch {
      setState((s) => ({ ...s, saveStatus: 'error' }));
    }
  }, [state.transcript]);

  // ── Auto-save (debounced, 4 s after last keystroke) ─────────────────────────
  useDebounce(
    () => {
      const hasChanges =
        state.transcript.trim() !== '' &&
        state.transcript !== lastSavedRef.current &&
        state.saveStatus !== 'saving';

      if (hasChanges) handleSave();
    },
    4000,
    [state.transcript]
  );

  // ── Download ────────────────────────────────────────────────────────────────
  const handleDownload = useCallback(() => {
    const fileName = state.audioFile?.file.name ?? 'transcript';
    downloadAsDoc(state.transcript, fileName);
  }, [state.transcript, state.audioFile]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-inner">
          <div className="header-logo">
            <span className="logo-icon">🎙</span>
            <span className="logo-text">Sermon Transcription</span>
          </div>
          <span className="header-version">v1.0</span>
        </div>
      </header>

      <main className="app-main">
        <UploadSection
          audioFile={state.audioFile?.file ?? null}
          uploadStatus={state.uploadStatus}
          uploadProgress={state.uploadProgress}
          onFileSelect={handleFileSelect}
          onUpload={handleUpload}
        />

        <div className="section-divider" />

        <div ref={transcriptionRef} className="section-wrapper">
          <TranscriptionSection
            uploadStatus={state.uploadStatus}
            transcriptionStatus={state.transcriptionStatus}
            onStart={handleStartTranscription}
          />
        </div>

        <div className="section-divider" />

        <div ref={editorRef} className="section-wrapper">
          <EditorSection
            transcript={state.transcript}
            transcriptionStatus={state.transcriptionStatus}
            saveStatus={state.saveStatus}
            onChange={handleTranscriptChange}
            onSave={handleSave}
            onDownload={handleDownload}
          />
        </div>
      </main>

      <footer className="app-footer">
        Internal tool · Audio Transcription System
      </footer>
    </div>
  );
};

export default App;
