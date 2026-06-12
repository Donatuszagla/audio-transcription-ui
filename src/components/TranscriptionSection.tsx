import React from 'react';
import type { TranscriptionStatus, UploadStatus } from '../types';

interface Props {
  uploadStatus: UploadStatus;
  transcriptionStatus: TranscriptionStatus;
  onStart: () => void;
}

const TranscriptionSection: React.FC<Props> = ({
  uploadStatus,
  transcriptionStatus,
  onStart,
}) => {
  const canStart =
    uploadStatus === 'done' &&
    (transcriptionStatus === 'idle' || transcriptionStatus === 'error');
  const isProcessing = transcriptionStatus === 'processing';
  const isDone = transcriptionStatus === 'done';

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Transcription</h2>
      </div>

      {uploadStatus !== 'done' && transcriptionStatus === 'idle' && (
        <p className="status-msg status-msg--muted">Upload an audio file first to enable transcription.</p>
      )}

      {isProcessing && (
        <div className="processing-state">
          <div className="spinner" aria-label="Processing" />
          <div className="processing-text">
            <span className="processing-label">Transcribing audio…</span>
            <span className="processing-hint">This may take several minutes for long recordings.</span>
          </div>
        </div>
      )}

      {transcriptionStatus === 'error' && (
        <p className="status-msg status-msg--error">Transcription failed. Please try again.</p>
      )}

      {isDone && (
        <p className="status-msg status-msg--ok">✓ Transcription complete — see editor below.</p>
      )}

      <button
        className="btn btn--primary"
        onClick={onStart}
        disabled={!canStart || isProcessing}
      >
        {isProcessing
          ? 'Transcribing…'
          : isDone
          ? 'Re-Transcribe'
          : transcriptionStatus === 'error'
          ? 'Retry Transcription'
          : 'Start Transcription'}
      </button>

      {isDone && (
        <button
          className="btn btn--ghost"
          onClick={onStart}
          style={{ marginLeft: '0.75rem' }}
        >
          Re-run
        </button>
      )}
    </section>
  );
};

export default React.memo(TranscriptionSection);
