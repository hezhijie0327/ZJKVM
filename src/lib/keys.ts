/** Human-readable key labels for event.code values (family MONO_CHIP style
 *  data, shared by macros + shortcuts capture UI). */

const SPECIAL: Record<string, string> = {
  ControlLeft: "Ctrl",
  ControlRight: "Ctrl",
  ShiftLeft: "Shift",
  ShiftRight: "Shift",
  AltLeft: "Alt",
  AltRight: "Alt",
  MetaLeft: "Win",
  MetaRight: "Win",
  Escape: "Esc",
  Backspace: "⌫",
  CapsLock: "Caps",
  Enter: "⏎",
  Tab: "Tab",
  Space: "␣",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Delete: "Del",
  Insert: "Ins",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
  PrintScreen: "PrtSc",
  ScrollLock: "ScrLk",
  Pause: "Pause",
  ContextMenu: "Menu",
  NumpadEnter: "Num⏎",
  Backquote: "`",
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

const PUNCTUATION_KEY_TO_CHAR: Record<string, string> = {
  Minus: "-",
  Equal: "=",
  BracketLeft: "[",
  BracketRight: "]",
  Backslash: "\\",
  Semicolon: ";",
  Quote: "'",
  Backquote: "`",
  Comma: ",",
  Period: ".",
  Slash: "/",
};

export function keyLabel(code: string): string {
  if (SPECIAL[code]) return SPECIAL[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Num${code.slice(6)}`;
  if (code.startsWith("F") && /^F\d+$/.test(code)) return code;
  return PUNCTUATION_KEY_TO_CHAR[code] ?? code;
}

/** "Ctrl + Alt + Del" style combo label. */
export function formatKeys(keys: string[]): string {
  return keys.map(keyLabel).join(" + ");
}
