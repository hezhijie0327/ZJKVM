/** Web Serial transport: open at 57600 baud, write frames, read responses.
 *  Fixed vs the original: safe against a missing navigator.serial, and the
 *  disconnect handler is always registered through the same path. */

import { isDisconnectError, raceWithTimeout } from "@/lib/device/utils";

type WebSerialPort = {
  open: (options: { baudRate: number }) => Promise<void>;
  close: () => Promise<void>;
  readable: ReadableStream<Uint8Array> | null;
  writable: WritableStream<Uint8Array> | null;
};

type Options = {
  port: WebSerialPort;
  baudRate?: number;
  onDisconnect?: () => void;
};

export class SerialLink {
  readonly SERIAL_BAUD_RATE = 57600;
  readonly READ_TIMEOUT = 500;
  readonly CLEANUP_TIMEOUT = 1000;

  private instance: WebSerialPort | null = null;
  private reader: ReadableStreamDefaultReader<Uint8Array> | null = null;
  private writer: WritableStreamDefaultWriter<Uint8Array> | null = null;
  private onDisconnect?: () => void;

  /* Bytes pulled off the port but not yet consumed by a read() call. A single
   * long-lived pump keeps exactly one read() in flight — the previous
   * timeout-and-abandon approach silently dropped late chunks (losing whole
   * GET_INFO frames) and collided with the still-pending read on the next
   * call, which wedged LED/firmware polling for the entire session. */
  private buffer: number[] = [];
  private waiter: (() => void) | null = null;
  private pump: Promise<void> | null = null;

  private disconnectHandler = (event: Event) => {
    if (event.target === this.instance) {
      this.handleDisconnect();
    }
  };

  async init(options: Options): Promise<void> {
    if (this.instance) {
      await this.close();
    }

    try {
      this.instance = options.port;
      const baudRate = options.baudRate || this.SERIAL_BAUD_RATE;
      await this.instance.open({ baudRate });
    } catch (err) {
      this.instance = null;
      throw err;
    }

    if (!this.instance.readable || !this.instance.writable) {
      this.instance = null;
      throw new Error("Serial port streams not available");
    }

    this.reader = this.instance.readable.getReader();
    this.writer = this.instance.writable.getWriter();
    this.buffer.length = 0;
    this.startPump();

    if (options.onDisconnect) {
      this.onDisconnect = options.onDisconnect;
    }

    navigator.serial?.addEventListener("disconnect", this.disconnectHandler);
  }

  private handleDisconnect(): void {
    if (!this.instance) return;

    this.releaseReader();
    this.releaseWriter();
    this.instance = null;

    if (this.onDisconnect) {
      this.onDisconnect();
      this.onDisconnect = undefined;
    }

    navigator.serial?.removeEventListener("disconnect", this.disconnectHandler);
  }

  private releaseReader(): void {
    if (!this.reader) return;
    try {
      this.reader.releaseLock();
    } catch {
      // lock already released
    }
    this.reader = null;
  }

  private releaseWriter(): void {
    if (!this.writer) return;
    try {
      this.writer.releaseLock();
    } catch {
      // lock already released
    }
    this.writer = null;
  }

  async write(data: number[]): Promise<void> {
    if (!this.writer) {
      throw new Error("Serial port not initialized");
    }
    try {
      await this.writer.write(new Uint8Array(data));
    } catch (err) {
      if (isDisconnectError(err)) {
        this.handleDisconnect();
        throw new Error("Device disconnected");
      }
      throw err;
    }
  }

  /** Feed the buffer with one read() at a time for the life of the port. */
  private startPump(): void {
    const reader = this.reader;
    if (!reader || this.pump) return;
    this.pump = (async () => {
      try {
        while (this.reader === reader) {
          const response = await reader.read();
          if (response.done || !response.value) break;
          this.buffer.push(...Array.from(response.value));
          this.wake();
        }
      } catch {
        // reader cancelled or the port errored — the disconnect event / next
        // write surfaces it; reads just keep timing out on an empty buffer.
      } finally {
        if (this.reader === reader) this.pump = null;
        this.wake();
      }
    })();
  }

  private wake(): void {
    const pending = this.waiter;
    this.waiter = null;
    pending?.();
  }

  private waitForData(): Promise<void> {
    if (this.buffer.length > 0) return Promise.resolve();
    return new Promise((resolve) => {
      this.waiter = resolve;
    });
  }

  /** Discard buffered input — any bytes already buffered before a new request
   *  are stale fragments and would misalign the expected response frame. */
  flush(): void {
    this.buffer.length = 0;
  }

  /** Read up to minSize bytes, waiting at most READ_TIMEOUT for them. Extra
   *  buffered bytes stay for the next call instead of being dropped. */
  async read(minSize: number, delayAfterRead = 0): Promise<number[]> {
    if (!this.reader) {
      throw new Error("Serial port not initialized");
    }

    const deadline = Date.now() + this.READ_TIMEOUT;
    while (this.buffer.length < minSize && this.reader) {
      const remainingTime = deadline - Date.now();
      if (remainingTime <= 0) break;
      await raceWithTimeout(this.waitForData(), remainingTime);
    }

    const result = this.buffer.splice(0, minSize);
    if (delayAfterRead > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayAfterRead));
    }
    return result;
  }

  async close(): Promise<void> {
    try {
      if (this.reader) {
        await raceWithTimeout(
          this.reader.cancel().catch(() => {}),
          this.CLEANUP_TIMEOUT,
        );
        this.releaseReader();
      }

      if (this.writer) {
        await raceWithTimeout(
          this.writer.close().catch(() => {}),
          this.CLEANUP_TIMEOUT,
        );
        this.releaseWriter();
      }

      if (this.instance) {
        await this.instance.close().catch(() => {});
        this.instance = null;
      }

      navigator.serial?.removeEventListener("disconnect", this.disconnectHandler);
    } catch {
      // cleanup best-effort
    }
  }
}
