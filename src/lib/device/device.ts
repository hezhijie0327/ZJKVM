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

  async open(onDisconnected?: () => void): Promise<void> {
    // requestPort() must run inside a user gesture — callers guarantee that.
    const port = await navigator.serial.requestPort();
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
    await this.serial.write(new CmdPacket(this.addr, CmdEvent.GET_INFO).encode());
    const rsp = await this.serial.read(14);
    // The constructor already ran the frame decode; a failed decode leaves CMD=0.
    const packet = new CmdPacket(-1, -1, rsp);
    if (packet.CMD !== CmdEvent.GET_INFO || packet.DATA.length === 0) {
      throw new Error("invalid info response");
    }
    return new InfoPacket(packet.DATA);
  }

  async sendKeyboardData(report: number[]): Promise<void> {
    await this.serial.write(new CmdPacket(this.addr, CmdEvent.SEND_KB_GENERAL_DATA, report).encode());
  }

  async sendMouseData(report: number[]): Promise<void> {
    if (report.length === 0) return;
    const cmdEvent = report[0] === 0x01 ? CmdEvent.SEND_MS_REL_DATA : CmdEvent.SEND_MS_ABS_DATA;
    await this.serial.write(new CmdPacket(this.addr, cmdEvent, report).encode());
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
