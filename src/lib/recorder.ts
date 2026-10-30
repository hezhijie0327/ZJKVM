/** Stream recorder: WebM via MediaRecorder. Prefers streaming writes through
 *  the File System Access API (showSaveFilePicker) so long recordings never
 *  sit in memory; falls back to an in-memory blob downloaded on stop. */

import { type SaveFilePicker, supportsSaveFilePicker } from "@/lib/browser";

export type RecorderState = "idle" | "recording";

export class StreamRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private writer: FileSystemWritableFileStream | null = null;
  private saving = false;

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(stream: MediaStream, onError?: (error: unknown) => void): Promise<void> {
    if (this.recording) return;

    this.chunks = [];
    this.writer = null;
    this.saving = false;

    if (supportsSaveFilePicker()) {
      try {
        const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
        const handle = await picker?.({
          suggestedName: `zjkvm-recording-${timestamp()}.webm`,
          types: [{ description: "WebM video", accept: { "video/webm": [".webm"] } }],
        });
        if (handle) {
          this.writer = await handle.createWritable();
          this.saving = true;
        }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error; // user cancelled the save dialog — don't start
        }
        // fall through to in-memory mode
      }
    }

    const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9") ? "video/webm;codecs=vp9" : "video/webm";
    this.recorder = new MediaRecorder(stream, { mimeType: mime, videoBitsPerSecond: 8_000_000 });

    this.recorder.ondataavailable = async (event) => {
      if (event.data.size === 0) return;
      if (this.writer) {
        try {
          await this.writer.write(event.data);
        } catch (error) {
          onError?.(error);
        }
      } else {
        this.chunks.push(event.data);
      }
    };

    this.recorder.start(1000);
  }

  /** @returns the recording as a Blob (null when it was streamed to disk). */
  async stop(): Promise<Blob | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return null;

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;
    this.recorder = null;

    if (this.writer) {
      try {
        await this.writer.close();
      } catch {
        // best effort
      }
      const writer = this.writer;
      this.writer = null;
      void writer;
      return null;
    }

    const blob = new Blob(this.chunks, { type: "video/webm" });
    this.chunks = [];
    this.saving = false;
    return blob;
  }

  get isStreamingToDisk(): boolean {
    return this.saving;
  }
}

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 5000);
}
