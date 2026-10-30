export interface Resolution {
  width: number;
  height: number;
}

export type Rotation = 0 | 90 | 180 | 270;

export interface MediaDevice {
  deviceId: string;
  label: string;
  groupId: string;
  kind: MediaDeviceKind;
}

export type VideoState = "disconnected" | "connecting" | "connected";
export type SerialState = "unsupported" | "disconnected" | "connecting" | "connected";

export interface ShortcutMacro {
  id: string;
  name: string;
  /** event.code list, ordered */
  keys: string[];
  /** chord = all keys held together; sequence = press/release one by one */
  mode: "chord" | "sequence";
  /** repeat count for sequence mode (BIOS boot-key spam etc.) */
  repeat: number;
}

export interface LedState {
  num: boolean;
  caps: boolean;
  scroll: boolean;
}
