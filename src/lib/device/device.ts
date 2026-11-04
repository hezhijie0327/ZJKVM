/** HID link abstraction: the real CH9329 serial device and the demo virtual
 *  device both implement this, so the whole UI runs unchanged in demo mode. */

import { CmdEvent, CmdPacket, InfoPacket } from "@/lib/device/proto";
import { SerialLink } from "@/lib/device/serial";

export interface HidLink {
  readonly kind: "serial" | "demo";
  readonly connected: boolean;
  onDisconnected: (() => void) | null;
  getInfo(): Promise<InfoPacket>;
  sendKeyboardData(report: number[]): Promise<void>;
  sendMouseData(report: number[]): Promise<void>;
  close(): Promise<void>;
}

export class SerialDevice implements HidLink {
  readonly kind = "serial" as const;
  onDisconnected: (() => void) | null = null;
  private addr = 0x00;
  private serial = new SerialLink();

  get connected(): boolean {
    return this.isOpen;
  }
  private isOpen = false;

  /* Command frames must not hit the wire back-to-back. Toggle keys (macOS
   * browsers emit CapsLock keydown+keyup within the same millisecond) used to
   * lose their first frame on the CH9329 — the target machine never saw the
   * switch, so it took two presses. Serialization + a small gap fixes every
   * injection path (physical keys, virtual keys, macros, paste) at once. */
  private static readonly INTER_FRAME_GAP_MS = 8;
  private writeChain: Promise<void> = Promise.resolve();
  private lastWriteAt = 0;

  private pacedWrite(data: number[]): Promise<void> {
    const run = this.writeChain.then(async () => {
      const wait = SerialDevice.INTER_FRAME_GAP_MS - (Date.now() - this.lastWriteAt);
      if (wait > 0) {
        await new Promise((resolve) => setTimeout(resolve, wait));
      }
      this.lastWriteAt = Date.now();
      await this.serial.write(data);
    });
    // keep the chain alive after a failed write
    this.writeChain = run.then(
      () => {},
      () => {},
    );
    return run;
  }

  async open(onDisconnected?: () => void): Promise<void> {
    // requestPort() must run inside a user gesture — callers guarantee that.
    const port = await navigator.serial.requestPort();
    await this.openPort(port, onDisconnected);
  }

  /** Reopen an already-granted port without the chooser (serial rebind after
   *  the CH9329 re-enumerates itself mid-session). */
  async openPort(port: SerialPort, onDisconnected?: () => void): Promise<void> {
    await this.serial.init({
      port: port as unknown as Parameters<SerialLink["init"]>[0]["port"],
      onDisconnect: () => {
        this.isOpen = false;
        this.onDisconnected?.();
      },
    });
    if (onDisconnected) {
      this.onDisconnected = onDisconnected;
    }
    this.isOpen = true;
  }

  async getInfo(): Promise<InfoPacket> {
    const exchange = async (): Promise<InfoPacket> => {
      // Anything buffered before a new request is a stale fragment.
      this.serial.flush();
      await this.pacedWrite(new CmdPacket(this.addr, CmdEvent.GET_INFO).encode());
      const rsp = await this.serial.read(14);
      // The constructor already ran the frame decode; a failed decode leaves CMD=0.
      const packet = new CmdPacket(-1, -1, rsp);
      if (packet.CMD !== CmdEvent.GET_INFO || packet.DATA.length === 0) {
        throw new Error(`invalid info response (${rsp.length} bytes)`);
      }
      return new InfoPacket(packet.DATA);
    };
    try {
      return await exchange();
    } catch {
      // One retry rides out a response split across USB packets.
      return exchange();
    }
  }

  async sendKeyboardData(report: number[]): Promise<void> {
    await this.pacedWrite(new CmdPacket(this.addr, CmdEvent.SEND_KB_GENERAL_DATA, report).encode());
  }

  async sendMouseData(report: number[]): Promise<void> {
    if (report.length === 0) return;
    const cmdEvent = report[0] === 0x01 ? CmdEvent.SEND_MS_REL_DATA : CmdEvent.SEND_MS_ABS_DATA;
    await this.pacedWrite(new CmdPacket(this.addr, cmdEvent, report).encode());
  }

  async close(): Promise<void> {
    this.isOpen = false;
    await this.serial.close();
  }
}

/** Active link singleton. Components depend on this module, not on a concrete
 *  device class, so demo mode swaps in transparently. */
let activeLink: HidLink | null = null;

export function setActiveLink(link: HidLink | null): void {
  activeLink = link;
}

export function getActiveLink(): HidLink | null {
  return activeLink;
}

export function requireLink(): HidLink {
  if (!activeLink) {
    throw new Error("no device connected");
  }
  return activeLink;
}
