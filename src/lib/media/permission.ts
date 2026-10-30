/** Camera/microphone permission query + request (Chromium permission names). */

export async function checkPermission(name: "camera" | "microphone"): Promise<boolean> {
  try {
    const status = await navigator.permissions.query({ name: name as PermissionName });
    return status.state === "granted";
  } catch {
    return false;
  }
}

export async function requestPermission(name: "camera" | "microphone"): Promise<boolean> {
  try {
    const constraints = name === "camera" ? { video: true } : { audio: true };
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    stream.getTracks().forEach((track) => {
      track.stop();
    });
    return true;
  } catch {
    return false;
  }
}
