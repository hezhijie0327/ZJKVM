import { KeycodeMap } from "@/lib/device/keymap";
import type { TKey } from "@/lib/i18n/en";
import { t } from "@/state/t";

/** Demo capture card: a canvas test card rendered at 24 fps and offered as a
 *  synthetic MediaStream, so the entire console works (and is testable)
 *  without hardware. It echoes keyboard reports and mouse position/buttons
 *  back onto the picture — an honest visualization of what the device would
 *  inject into the target machine. */

export interface DemoVideoState {
  /** last 8-byte keyboard report */
  keys: number[];
  /** last non-zero keyboard report (held on screen until the next press) */
  keysEcho: number[];
  mouseX: number; // 0..1
  mouseY: number; // 0..1
  buttons: number;
  wheel: number;
  /** incrementing per received report — liveness proof in recordings */
  reportCount: number;
}

export interface DemoStream {
  stream: MediaStream;
  state: DemoVideoState;
  stop: () => void;
}

const W = 1280;
const H = 720;

const BAR_COLORS = ["#c0c0c0", "#c0c000", "#00c0c0", "#00c000", "#c000c0", "#c00000", "#0000c0"];

/* ── Key name decode: usage → localized keycap name ──────────────────────── */

const USAGE_TO_CODE: Record<number, string> = Object.fromEntries(
  Object.entries(KeycodeMap).map(([code, usage]) => [usage, code]),
);
/** Modifier bits (report byte 0, LSB first) → wordbook keys */
const MOD_KEYS = [
  "demo.mod.lctrl",
  "demo.mod.lshift",
  "demo.mod.lalt",
  "demo.mod.lmeta",
  "demo.mod.rctrl",
  "demo.mod.rshift",
  "demo.mod.ralt",
  "demo.mod.rmeta",
] as const;
/** Keys whose zh name differs from en — everything else derives from the code */
const LOCALIZED: Record<string, TKey> = {
  Enter: "demo.key.enter",
  Backspace: "demo.key.backspace",
  Space: "demo.key.space",
  CapsLock: "demo.key.capslock",
  Insert: "demo.key.insert",
  Delete: "demo.key.delete",
  NumLock: "demo.key.numlock",
  ScrollLock: "demo.key.scrolllock",
  PrintScreen: "demo.key.printscreen",
  NumpadEnter: "demo.key.numpadenter",
  NumpadAdd: "demo.key.numpadadd",
  NumpadSubtract: "demo.key.numpadsub",
  NumpadMultiply: "demo.key.numpadmult",
  NumpadDivide: "demo.key.numpaddiv",
  NumpadDecimal: "demo.key.numpaddot",
};
/** Glyph-identical names derive straight from the code (KeyQ → Q, F5 → F5) */
const GLYPHS: Record<string, string> = {
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
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Home: "Home",
  End: "End",
  PageUp: "PgUp",
  PageDown: "PgDn",
  Tab: "Tab",
  Escape: "Esc",
};

function keyName(usage: number): string {
  const code = USAGE_TO_CODE[usage];
  if (!code) return `0x${usage.toString(16)}`;
  const localized = LOCALIZED[code];
  return localized ? t(localized) : derivedName(code);
}

function derivedName(code: string): string {
  if (/^Key[A-Z]$/.test(code)) return code.slice(3);
  if (/^Digit[0-9]$/.test(code)) return code.slice(5);
  if (/^Numpad[0-9]$/.test(code)) return code.slice(6);
  if (/^F([1-9]|1[0-2])$/.test(code)) return code;
  return GLYPHS[code] ?? code;
}

export function createDemoStream(): DemoStream {
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new Error("canvas 2d unavailable");
  }
  const ctx: CanvasRenderingContext2D = context;

  const state: DemoVideoState = {
    keys: [0, 0, 0, 0, 0, 0, 0, 0],
    keysEcho: [0, 0, 0, 0, 0, 0, 0, 0],
    mouseX: 0.5,
    mouseY: 0.5,
    buttons: 0,
    wheel: 0,
    reportCount: 0,
  };

  let raf = 0;
  let sweep = 0;

  function draw(): void {
    const now = new Date();
    sweep = (sweep + 1.7) % (W + 200);

    // Warm dark studio backdrop (family dark palette)
    ctx.fillStyle = "#1b1a18";
    ctx.fillRect(0, 0, W, H);

    // Ruled paper grid
    ctx.strokeStyle = "rgba(56, 52, 47, 0.6)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= W; x += 64) {
      ctx.moveTo(x + 0.5, 0);
      ctx.lineTo(x + 0.5, H);
    }
    for (let y = 0; y <= H; y += 64) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(W, y + 0.5);
    }
    ctx.stroke();

    // SMPTE-flavored color bars strip
    const barW = W / BAR_COLORS.length;
    BAR_COLORS.forEach((color, i) => {
      ctx.fillStyle = color;
      ctx.globalAlpha = 0.85;
      ctx.fillRect(i * barW, 40, barW - 4, 56);
    });
    ctx.globalAlpha = 1;

    // Liveness sweep line
    ctx.strokeStyle = "#fec843";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(sweep - 100, 120);
    ctx.lineTo(sweep - 100, H - 120);
    ctx.stroke();

    // Title
    ctx.fillStyle = "#eceae4";
    ctx.font = "600 44px ui-sans-serif, system-ui, sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(`ZJKVM ${t("demo.title")}`, 48, 200);

    ctx.fillStyle = "#a8a399";
    ctx.font = "24px ui-monospace, Menlo, monospace";
    ctx.fillText(`${W}×${H} · 24fps · ${t("demo.uvc")}`, 48, 236);

    // Clock
    const clock = now.toLocaleTimeString("en-GB");
    ctx.fillStyle = "#fec843";
    ctx.font = "700 72px ui-monospace, Menlo, monospace";
    ctx.textAlign = "right";
    ctx.fillText(clock, W - 48, 220);

    // Keyboard report echo (holds the last non-zero report so typing is visible)
    ctx.textAlign = "left";
    ctx.fillStyle = "#a8a399";
    ctx.font = "20px ui-monospace, Menlo, monospace";
    const released = state.keys.every((b) => b === 0);
    ctx.fillText(`${t("demo.hidLabel")} — ${released ? t("demo.hidReleased") : t("demo.hidHeld")}`, 48, 320);
    ctx.fillStyle = "#eceae4";
    ctx.font = "700 30px ui-monospace, Menlo, monospace";
    const echo = released ? state.keysEcho : state.keys;
    const hex = echo.map((b) => b.toString(16).padStart(2, "0").toUpperCase()).join(" ");
    ctx.fillText(hex || "00", 48, 360);

    // Pressed-key decode in the UI language (keycap names via the wordbook)
    const mod = echo[0] ?? 0;
    const names = [
      ...MOD_KEYS.filter((_, i) => (mod >> i) & 1).map((k) => t(k)),
      ...echo
        .slice(1)
        .filter((b) => b !== 0)
        .map(keyName),
    ].join(" + ");
    ctx.fillStyle = "#fec843";
    ctx.font = "24px ui-monospace, Menlo, monospace";
    ctx.fillText(names ? `${t("demo.keysLabel")} ${names}` : t("demo.keysNone"), 48, 404);

    // Mouse echo
    ctx.fillStyle = "#a8a399";
    ctx.font = "20px ui-monospace, Menlo, monospace";
    ctx.fillText(t("demo.mouseLabel"), 48, 470);
    const btnNames = ["L", "R", "M", "B4", "B5"];
    const activeBtns = btnNames.filter((_, i) => (state.buttons >> i) & 1);
    ctx.fillStyle = "#eceae4";
    ctx.font = "700 26px ui-monospace, Menlo, monospace";
    ctx.fillText(
      `x ${(state.mouseX * W).toFixed(0)}  y ${(state.mouseY * H).toFixed(0)}  [${activeBtns.join("+") || "—"}]  wheel ${state.wheel > 0 ? "+" : ""}${state.wheel}`,
      48,
      506,
    );

    ctx.fillStyle = "#a8a399";
    ctx.font = "20px ui-monospace, Menlo, monospace";
    ctx.fillText(`${t("demo.reports")}: ${state.reportCount}`, 48, 652);

    // Cursor crosshair
    const cx = state.mouseX * W;
    const cy = state.mouseY * H;
    const pressed = state.buttons !== 0;
    ctx.strokeStyle = pressed ? "#f87171" : "#fec843";
    ctx.lineWidth = pressed ? 4 : 2;
    ctx.beginPath();
    ctx.arc(cx, cy, pressed ? 22 : 16, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx - 30, cy);
    ctx.lineTo(cx + 30, cy);
    ctx.moveTo(cx, cy - 30);
    ctx.lineTo(cx, cy + 30);
    ctx.stroke();

    raf = requestAnimationFrame(draw);
  }

  raf = requestAnimationFrame(draw);

  const stream = canvas.captureStream(24);

  return {
    stream,
    state,
    stop() {
      cancelAnimationFrame(raf);
      stream.getTracks().forEach((track) => {
        track.stop();
      });
    },
  };
}

// Testing hook: lets automated checks (and curious users) read the live HID
// echo state — window.__zjkvmDemo.state
declare global {
  interface Window {
    __zjkvmDemo?: DemoStream;
  }
}

export function attachDebugHook(demo: DemoStream): void {
  window.__zjkvmDemo = demo;
}
