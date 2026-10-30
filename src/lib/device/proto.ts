/** CH9329-compatible command frame protocol (byte-exact port of the
 *  NanoKVM-USB browser lib — do not change framing here).
 *
 *  Frame: [0x57][0xAB][ADDR][CMD][LEN][DATA…][SUM]
 *  SUM covers HEAD1+HEAD2+ADDR+CMD+LEN+ΣDATA, masked to one byte.
 *  Decoding scans the stream for the 57 AB head, then validates the sum. */

export enum CmdEvent {
  GET_INFO = 0x01,
  SEND_KB_GENERAL_DATA = 0x02,
  SEND_KB_MEDIA_DATA = 0x03,
  SEND_MS_ABS_DATA = 0x04,
  SEND_MS_REL_DATA = 0x05,
  SEND_MY_HID_DATA = 0x06,
  READ_MY_HID_DATA = 0x87,
  GET_PARA_CFG = 0x08,
  SET_PARA_CFG = 0x09,
  GET_USB_STRING = 0x0a,
  SET_USB_STRING = 0x0b,
  SET_DEFAULT_CFG = 0x0c,
  RESET = 0x0f,
}

export class CmdPacket {
  readonly HEAD1 = 0x57;
  readonly HEAD2 = 0xab;

  ADDR = 0x00;
  CMD = 0x00;
  LEN = 0x00;
  DATA: number[] = [];
  SUM = 0x00;

  /** Pass addr=-1/cmd=-1 with a raw byte buffer to decode a response frame. */
  constructor(addr = 0x00, cmd = 0x00, data: number[] = []) {
    if (addr < 0 || cmd < 0) {
      this.decode(data);
      return;
    }
    this.save(addr, cmd, data);
  }

  encode(): number[] {
    return [this.HEAD1, this.HEAD2, this.ADDR, this.CMD, this.LEN, ...this.DATA, this.SUM];
  }

  decode(data: number[]): number {
    const headerIndex = this.findHead(data);
    if (headerIndex < 0) {
      return -1;
    }
    if (data.length - headerIndex < 6) {
      return -1;
    }

    const addr = data[headerIndex + 2];
    const cmd = data[headerIndex + 3];
    const dataLen = data[headerIndex + 4];
    if (dataLen === undefined || data.length < headerIndex + 3 + dataLen + 1) {
      return -1;
    }

    const sum = data[headerIndex + 5 + dataLen];
    let s = 0;
    for (let i = headerIndex; i < headerIndex + 4 + dataLen; i++) {
      s += data[i] ?? 0;
    }
    if (sum === undefined || (s & 0xff) !== sum) {
      return -1;
    }

    this.ADDR = addr ?? 0;
    this.CMD = cmd ?? 0;
    this.LEN = dataLen;
    this.DATA = data.slice(headerIndex + 5, headerIndex + 5 + this.LEN);
    this.SUM = sum;
    return 0;
  }

  private findHead(lst: number[]): number {
    for (let i = 0; i <= lst.length - 2; i++) {
      if (lst[i] === this.HEAD1 && lst[i + 1] === this.HEAD2) {
        return i;
      }
    }
    return -1;
  }

  private save(addr: number, cmd: number, data: number[]): void {
    this.ADDR = addr;
    this.CMD = cmd;
    this.DATA = data;
    this.LEN = data.length;
    this.SUM = this.HEAD1 + this.HEAD2 + this.ADDR + this.CMD + this.LEN;
    for (const i of this.DATA) {
      this.SUM += i;
    }
    this.SUM &= 0xff;
  }
}

export class InfoPacket {
  CHIP_VERSION = "V0.0";
  IS_CONNECTED = false;
  NUM_LOCK = false;
  CAPS_LOCK = false;
  SCROLL_LOCK = false;

  constructor(data: number[]) {
    const versionByte = data[0];
    if (versionByte === undefined || versionByte < 0x30) {
      throw new Error("version error");
    }

    const version = 1.0 + (versionByte - 0x30) / 10;
    this.CHIP_VERSION = `V${version.toFixed(1)}`;

    this.IS_CONNECTED = data[1] !== 0;

    const ledByte = data[2] ?? 0;
    this.NUM_LOCK = getBit(ledByte, 0) === 1;
    this.CAPS_LOCK = getBit(ledByte, 1) === 1;
    this.SCROLL_LOCK = getBit(ledByte, 2) === 1;
  }
}

function getBit(number: number, bitPosition: number): number {
  return (number >> bitPosition) & 1;
}
