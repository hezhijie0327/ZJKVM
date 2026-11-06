/** Stream recorder: WebM via MediaRecorder. Frames stream into a private
 *  OPFS scratch file so long recordings never sit in memory and no dialog
 *  interrupts the start; the single save interaction happens at stop — a
 *  save picker (pre-filled) when the platform supports it, a plain download
 *  otherwise. Cancelling the picker falls back to a download so the footage
 *  is never lost. No OPFS/FS Access → in-memory chunks, downloaded on stop. */

import { type SaveFilePicker, supportsSaveFilePicker } from "@/lib/browser";

export class StreamRecorder {
  private recorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private writer: FileSystemWritableFileStream | null = null;
  private scratch: FileSystemFileHandle | null = null;
  private scratchName: string | null = null;

  get recording(): boolean {
    return this.recorder?.state === "recording";
  }

  async start(stream: MediaStream, onError?: (error: unknown) => void): Promise<void> {
    if (this.recording) return;

    this.chunks = [];
    this.writer = null;
    this.scratch = null;
    this.scratchName = null;

    this.scratchName = `zjkvm-recording-${timestamp()}.webm`;
    try {
      const root = await navigator.storage.getDirectory();
      // sweep scratch files orphaned by a session that died mid-save
      try {
        for await (const [name, handle] of root.entries()) {
          if (name !== this.scratchName && name.startsWith("zjkvm-recording-") && handle.kind === "file") {
            await root.removeEntry(name).catch(() => {});
          }
        }
      } catch {
        // best effort
      }
      this.scratch = await root.getFileHandle(this.scratchName, { create: true });
      this.writer = await this.scratch.createWritable();
    } catch {
      this.scratch = null; // no OPFS → memory chunks
      this.writer = null;
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

  /** Stop and save — the single save interaction happens here, at the end.
   *  @returns the blob only when the caller must download it (picker
   *  unsupported/cancelled); null when it was already written to the chosen
   *  file. */
  async stop(): Promise<Blob | null> {
    const recorder = this.recorder;
    if (!recorder || recorder.state === "inactive") return null;

    const stopped = new Promise<void>((resolve) => {
      recorder.onstop = () => resolve();
    });
    recorder.stop();
    await stopped;
    this.recorder = null;

    // collect the footage: memory chunks, or the OPFS scratch file
    const memoryBlob = this.writer ? null : new Blob(this.chunks, { type: "video/webm" });
    this.chunks = [];
    if (this.writer) {
      try {
        await this.writer.close();
      } catch {
        // best effort
      }
      this.writer = null;
    }
    const scratchFile = this.scratch ? await this.scratch.getFile().catch(() => null) : null;

    // the single save: picker (pre-filled) when supported
    let savedToDisk = false;
    if (supportsSaveFilePicker()) {
      try {
        const picker = (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker;
        const handle = await picker?.({
          suggestedName: this.scratchName ?? `zjkvm-recording-${timestamp()}.webm`,
          types: [{ description: "WebM video", accept: { "video/webm": [".webm"] } }],
        });
        if (handle) {
          const writable = await handle.createWritable();
          if (scratchFile) await writable.write(scratchFile);
          if (memoryBlob) await writable.write(memoryBlob);
          await writable.close();
          savedToDisk = true;
        }
      } catch {
        savedToDisk = false; // cancelled / write failed — download below
      }
    }

    // drop the OPFS scratch entry either way
    if (this.scratchName) {
      try {
        const root = await navigator.storage.getDirectory();
        await root.removeEntry(this.scratchName);
      } catch {
        // ignore
      }
    }
    this.scratch = null;
    this.scratchName = null;

    if (savedToDisk) return null;
    if (!memoryBlob && scratchFile) return scratchFile; // download the OPFS copy
    return memoryBlob;
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
