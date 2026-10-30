/** Snapshot: grab the current video frame as PNG. Returns the blob; clipboard
 *  copy is attempted by the caller (needs focus + permission, so it degrades
 *  to a plain download). */

export async function captureFrame(video: HTMLVideoElement): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("canvas 2d unavailable");
  }
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob);
      } else {
        reject(new Error("toBlob failed"));
      }
    }, "image/png");
  });
}

export async function copyBlobToClipboard(blob: Blob): Promise<void> {
  const item = new ClipboardItem({ [blob.type]: blob });
  await navigator.clipboard.write([item]);
}
