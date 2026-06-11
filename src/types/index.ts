export type UploadStatus = 'idle' | 'uploading' | 'done' | 'error';
export type TranscriptionStatus = 'idle' | 'processing' | 'done' | 'error';
export type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export interface AudioFile {
  file: File;
  id: string | null;
}

export interface AppState {
  audioFile: AudioFile | null;
  uploadStatus: UploadStatus;
  uploadProgress: number;
  transcriptionStatus: TranscriptionStatus;
  transcript: string;
  saveStatus: SaveStatus;
}
