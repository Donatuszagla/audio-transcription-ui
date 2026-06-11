/**
 * API Integration Layer
 * ─────────────────────────────────────────────────────────────────────────────
 * Connects to the FastAPI backend at http://localhost:8000
 *
 * Backend flow:
 *   1. uploadAudio()        → POST /transcribe  (uploads file + queues job)
 *                             returns job_id stored as fileId
 *   2. startTranscription() → GET  /status/{job_id}  (polls until done)
 *                             returns full transcript text
 *   3. saveTranscript()     → localStorage backup (no backend endpoint yet)
 * ─────────────────────────────────────────────────────────────────────────────
 */
 
// Base URL — set VITE_API_URL in .env to override for production
const API_BASE = (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8000';
 
// How often to poll /status while transcription is running
const POLL_INTERVAL_MS = 5_000;
 
// Give up polling after this long (3 hours — enough for the longest sermon)
const POLL_TIMEOUT_MS = 3 * 60 * 60 * 1_000;
 
// ─── Types ────────────────────────────────────────────────────────────────────
 
export interface UploadResult {
  fileId: string;   // job_id from the backend
  fileName: string;
  durationSeconds?: number;
}
 
export interface TranscriptionResult {
  jobId: string;
  text: string;
  confidence?: number;
  durationSeconds?: number;
}
 
export interface SaveResult {
  savedAt: string;
  transcriptId: string;
}
 
// Shape of GET /status/{job_id} response from FastAPI
interface StatusResponse {
  job_id: string;
  status: 'queued' | 'processing' | 'done' | 'failed';
  filename: string;
  elapsed_seconds: number;
  error: string | null;
  result: {
    text: string;
    language: string;
    duration: number;
    segments: { start: number; end: number; text: string }[];
    model: string;
    meta: {
      inference_seconds: number;
      real_time_factor: number;
      segment_count: number;
    };
  } | null;
}
 
// ─── Internal helpers ─────────────────────────────────────────────────────────
 
async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    let detail = `HTTP ${res.status}`;
    try {
      const body = await res.json();
      detail = body.detail ?? body.message ?? detail;
    } catch { /* ignore parse error */ }
    throw new Error(detail);
  }
  return res;
}
 
/**
 * Poll GET /status/{jobId} every POLL_INTERVAL_MS until done or failed.
 */
async function pollUntilDone(jobId: string): Promise<StatusResponse> {
  const deadline = Date.now() + POLL_TIMEOUT_MS;
 
  while (Date.now() < deadline) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
 
    const res  = await apiFetch(`/status/${jobId}`);
    const data: StatusResponse = await res.json();
 
    if (data.status === 'done')   return data;
    if (data.status === 'failed') throw new Error(data.error ?? 'Transcription failed on server.');
    // 'queued' | 'processing' → keep polling
  }
 
  throw new Error(
    `Transcription timed out after ${POLL_TIMEOUT_MS / 60_000} minutes. ` +
    'The audio may be too long or the server is overloaded.'
  );
}
 
// ─── Upload ───────────────────────────────────────────────────────────────────
 
/**
 * Upload an audio file to POST /transcribe.
 *
 * The backend both receives the file AND queues the transcription job in one
 * request. The job_id it returns is stored as fileId and passed to
 * startTranscription() for polling.
 *
 * Uses XMLHttpRequest instead of fetch so we get real upload progress events.
 */
export function uploadAudio(
  file: File,
  onProgress: (pct: number) => void
): Promise<UploadResult> {
  return new Promise((resolve, reject) => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('language', 'en');
    formData.append('clean_output', 'true');
 
    const xhr = new XMLHttpRequest();
 
    xhr.upload.addEventListener('progress', (e) => {
      if (e.lengthComputable) {
        onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
 
    xhr.addEventListener('load', () => {
      if (xhr.status === 202) {
        try {
          const body = JSON.parse(xhr.responseText);
          onProgress(100);
          resolve({
            fileId:   body.job_id,   // job_id is used as fileId going forward
            fileName: file.name,
          });
        } catch {
          reject(new Error('Invalid JSON response from server.'));
        }
      } else {
        let detail = `Upload failed (HTTP ${xhr.status})`;
        try {
          const body = JSON.parse(xhr.responseText);
          detail = body.detail ?? detail;
        } catch { /* ignore */ }
        reject(new Error(detail));
      }
    });
 
    xhr.addEventListener('error',   () => reject(new Error('Network error — is the API server running?')));
    xhr.addEventListener('timeout', () => reject(new Error('Upload timed out.')));
 
    xhr.open('POST', `${API_BASE}/transcribe`);
    xhr.timeout = 30 * 60 * 1_000;   // 30 min ceiling for very large files
    xhr.send(formData);
  });
}
 
// ─── Transcription ────────────────────────────────────────────────────────────
 
/**
 * Poll GET /status/{fileId} until the transcription job finishes.
 *
 * fileId here is the job_id returned by uploadAudio().
 * Checks every 5 seconds — large-v3 on CPU can take 30–90 min for long audio.
 */
export async function startTranscription(
  fileId: string
): Promise<TranscriptionResult> {
  const data = await pollUntilDone(fileId);
 
  if (!data.result) {
    throw new Error('Job completed but the server returned no transcript.');
  }
 
  return {
    jobId:           data.job_id,
    text:            data.result.text,
    durationSeconds: data.result.duration,
  };
}
 
// ─── Save ─────────────────────────────────────────────────────────────────────
 
/**
 * Save the transcript.
 *
 * Currently backs up to localStorage so the text survives a page refresh.
 *
 * To wire up a real backend endpoint, replace the body with:
 *
 *   const res = await apiFetch('/transcripts', {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ text }),
 *   });
 *   return res.json();
 */
export async function saveTranscript(text: string): Promise<SaveResult> {
  const savedAt      = new Date().toISOString();
  const transcriptId = `local_${Date.now()}`;
 
  try {
    localStorage.setItem(
      'sermon_transcript_backup',
      JSON.stringify({ savedAt, text })
    );
  } catch {
    // localStorage quota exceeded — ignore silently
  }
 
  return { savedAt, transcriptId };
}
 
