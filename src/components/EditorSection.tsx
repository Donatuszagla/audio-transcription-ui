import React, { useCallback, useRef } from 'react';
import type { SaveStatus, TranscriptionStatus } from '../types';

interface Props {
  transcript: string;
  transcriptionStatus: TranscriptionStatus;
  saveStatus: SaveStatus;
  onChange: (text: string) => void;
  onSave: () => void;
  onDownload: () => void;
}

function wordCount(text: string): number {
  return text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
}

const EditorSection: React.FC<Props> = ({
  transcript,
  transcriptionStatus,
  saveStatus,
  onChange,
  onSave,
  onDownload,
}) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange(e.target.value);
    },
    [onChange]
  );

  const hasContent = transcript.trim().length > 0;
  const isSaving = saveStatus === 'saving';

  const saveBtnLabel = (() => {
    if (isSaving) return 'Saving…';
    if (saveStatus === 'saved') return '✓ Saved';
    if (saveStatus === 'error') return 'Save failed — retry';
    return 'Save Transcript';
  })();

  return (
    <section className="section section--editor">
      <div className="section-header">
        <h2 className="section-title">Editor</h2>
        {hasContent && (
          <span className="word-count">{wordCount(transcript).toLocaleString()} words</span>
        )}
      </div>

      {transcriptionStatus !== 'done' && !hasContent && (
        <p className="status-msg status-msg--muted">
          Transcript will appear here after transcription completes.
        </p>
      )}

      <textarea
        ref={textareaRef}
        className="editor-textarea"
        value={transcript}
        onChange={handleChange}
        placeholder={
          transcriptionStatus === 'processing'
            ? 'Transcribing audio, please wait…'
            : 'Transcript will appear here. You may also type or paste text directly.'
        }
        disabled={transcriptionStatus === 'processing'}
        spellCheck
        aria-label="Transcript editor"
      />

      <div className="editor-actions">
        <button
          className={`btn btn--primary${saveStatus === 'error' ? ' btn--error' : ''}`}
          onClick={onSave}
          disabled={!hasContent || isSaving}
        >
          {saveBtnLabel}
        </button>

        <button
          className="btn btn--secondary"
          onClick={onDownload}
          disabled={!hasContent}
        >
          Download .doc
        </button>

        {saveStatus === 'saved' && (
          <span className="autosave-note">auto-saved</span>
        )}
      </div>
    </section>
  );
};

export default React.memo(EditorSection);
