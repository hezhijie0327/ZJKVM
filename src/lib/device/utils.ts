export function raceWithTimeout<T>(promise: Promise<T>, timeout: number): Promise<T | null> {
  return Promise.race([
    promise,
    new Promise<null>((resolve) => {
      setTimeout(() => resolve(null), timeout);
    }),
  ]);
}

export function isDisconnectError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const name = error.name;
  const message = error.message;
  return (
    name === "NetworkError" ||
    name === "InvalidStateError" ||
    name === "NotFoundError" ||
    /disconnected|device has been lost|the device has been closed/i.test(message)
  );
}
