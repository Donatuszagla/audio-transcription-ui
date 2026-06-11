import React, { useRef, useCallback } from 'react';
import type { UploadStatus } from '../types';

interface Props {
  audioFile: File | null;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  onFileSelect: (file: File) => void;
  onUpload: () => void;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const ACCEPTED_TYPES = '.mp3,.wav,.m4a,.ogg,.flac,.aac';

const UploadSection: React.FC<Props> = ({
  audioFile,
  uploadStatus,
  uploadProgress,
  onFileSelect,
  onUpload,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      const file = e.dataTransfer.files?.[0];
      if (file) onFileSelect(file);
    },
    [onFileSelect]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  }, []);

  const isUploading = uploadStatus === 'uploading';
  const isDone = uploadStatus === 'done';

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">Upload Audio</h2>
      </div>

      <div
        className={`drop-zone${audioFile ? ' drop-zone--has-file' : ''}`}
        onClick={() => !isUploading && inputRef.current?.click()}
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
        aria-label="Click or drag to select audio file"
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_TYPES}
          onChange={handleFileChange}
          style={{ display: 'none' }}
          disabled={isUploading}
        />

        {audioFile ? (
          <div className="file-info">
            <span className="file-icon">🎵</span>
            <div className="file-details">
              <span className="file-name">{audioFile.name}</span>
              <span className="file-size">{formatBytes(audioFile.size)}</span>
            </div>
            {!isUploading && !isDone && (
              <span className="file-change">click to change</span>
            )}
          </div>
        ) : (
          <div className="drop-placeholder">
            <span className="drop-icon">⬆</span>
            <span className="drop-text">Drop audio file here or click to browse</span>
            <span className="drop-hint">MP3, WAV, M4A, FLAC, AAC, OGG</span>
          </div>
        )}
      </div>

      {isUploading && (
        <div className="progress-wrap">
          <div className="progress-bar">
            <div
              className="progress-fill"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
          <span className="progress-label">{uploadProgress}%</span>
        </div>
      )}

      {uploadStatus === 'error' && (
        <p className="status-msg status-msg--error">Upload failed. Please try again.</p>
      )}

      {isDone && (
        <p className="status-msg status-msg--ok">✓ Uploaded successfully</p>
      )}

      <button
        className="btn btn--primary"
        onClick={onUpload}
        disabled={!audioFile || isUploading || isDone}
      >
        {isUploading ? `Uploading… ${uploadProgress}%` : isDone ? 'Uploaded' : 'Upload File'}
      </button>
    </section>
  );
};

export default React.memo(UploadSection);
