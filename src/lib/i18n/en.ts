// UI 文案基准词库（English）：TKey 的来源。
// 新增语言 = 新建 ./<tag>.ts 导出 Record<TKey, string>（Partial 亦可，
// 缺失键回退 EN）+ 在 lib/i18n.tsx 的 CATALOGS 注册。
// {name} 形式的占位符由 t(key, vars) 替换。

export const EN = {
  // 应用
  "app.consoleTitle": "USB KVM Console",

  // 通用
  "common.ok": "OK",
  "common.cancel": "Cancel",
  "common.close": "Close",
  "common.delete": "Delete",
  "common.save": "Save",
  "common.add": "Add",
  "common.apply": "Apply",
  "common.reset": "Reset",
  "common.default": "Default",
  "common.custom": "Custom",
  "common.on": "On",
  "common.off": "Off",
  "common.auto": "Auto",
  "common.unknown": "Unknown",
  "common.copy": "Copy",
  "common.copied": "Copied",
  "common.download": "Download",
  "common.retry": "Retry",
  "common.connect": "Connect",
  "common.disconnect": "Disconnect",

  // 能力检测
  "browser.serialMissing":
    "This browser does not support Web Serial. Use desktop Chrome or Edge for keyboard/mouse injection.",
  "browser.secureMissing": "A secure context (HTTPS or localhost) is required for camera and serial access.",
  "browser.mediaMissing": "This browser does not support media device enumeration.",

  // 连接与设备面板
  "connect.title": "Connect device",
  "connect.videoAuto": "Auto detect",
  "connect.openVideo": "Open video",
  "connect.cameraDenied": "Camera permission was denied. Enable it in the browser site settings, then retry.",
  "connect.serialButton": "Open serial port",
  "connect.connecting": "Connecting…",
  "connect.noVideo": "No capture device found.",
  "connect.authHint":
    "List empty? Click “Open video” once to grant camera access — the capture card is then recognized automatically.",

  // 设备面板(统一管理采集卡 / 串口 / 音频)
  "tb.devices": "Devices",
  "device.state": "Link",
  "device.connected": "Connected",
  "device.disconnected": "Disconnected",

  // 导航与关于
  "nav.theme": "Theme",
  "nav.lang": "Language",
  "nav.help": "About",
  "about.demoButton": "Try demo mode",
  "about.demoStop": "Stop demo mode",
  "about.demoRunning": "Demo running",
  "about.demoNote": "Simulates the capture card and key/mouse injection — no hardware needed.",
  "toast.demoStarted": "Demo mode started",
  "about.title": "About ZJKVM",
  "about.feature1": "HDMI capture preview at up to 4K60 with rotation and zoom",
  "about.feature2": "Full keyboard and mouse injection, including wake-lock safe physical forwarding",
  "about.feature3": "Stream recording and one-click snapshots, saved locally",
  "about.feature4": "Runs in any Chromium browser — Windows, macOS and Linux targets",
  "about.blurb":
    "ZJKVM turns a USB capture card and a CH9329 HID dongle into a full KVM console that runs entirely in your browser — nothing you type or see ever leaves your machine.",
  "about.demo":
    "No hardware at hand? Demo mode simulates the whole stack — a canvas test card stands in for the capture card and every injection is echoed back on screen.",

  // LED 锁定状态
  "led.num": "NUM",
  "led.caps": "CAPS",
  "led.scroll": "SCRL",
  "led.hint": "Target keyboard lock states, read from the device",

  // 状态芯片
  "status.hid": "HID",
  "status.mic": "Mic",
  "status.disconnectVideo": "Disconnect video",
  "status.disconnectSerial": "Disconnect serial",
  "status.demoStop": "Stop demo mode",
  "status.collapse": "Hide status chips",
  "status.expand": "Show status chips",
  "status.chips": "Connection status",
  "status.hidHint": "USB enumeration on the controlled machine — dim means key/mouse injections have no receiver",
  "status.serial": "Serial link",
  "status.demo": "DEMO",
  "status.fw": "FW {v}",
  "status.statsHint": "Capture resolution & frame rate",

  // 舞台
  "stage.noSignal": "Waiting for video",
  "stage.noHdmi": "NO HDMI SIGNAL — connect the target machine's video output to the dongle",
  "stage.openSettings": "Open the toolbar to pick a capture card, or reconnect from the console menu.",

  // 工具栏
  "tb.keyboard": "Keyboard",
  "tb.mouse": "Mouse",
  "tb.record": "Record",
  "tb.screenshot": "Screenshot",
  "tb.pip": "Picture in picture",
  "tb.fullscreen": "Fullscreen",
  "tb.collapse": "Collapse toolbar",
  "tb.expand": "Expand toolbar",

  // 视频面板
  "video.resolution": "Resolution",
  "video.rotation": "Rotation",
  "video.scale": "Zoom",
  "video.device": "Capture device",
  "video.customAdd": "Add custom resolution",
  "video.width": "Width",
  "video.height": "Height",
  "video.customExists": "Already exists",

  // 音频面板
  "audio.volume": "Volume",
  "audio.sound": "Sound",
  "audio.mute": "Mute",
  "audio.mic": "Microphone",
  "audio.micRequest": "Grant microphone",
  "audio.micGranted": "Granted",
  "audio.micFail": "Microphone permission denied — check the browser site settings.",
  "toast.micGranted": "Microphone granted — capture-card audio joins on reopen",
  "audio.micGrantedHint": "Mic granted — reopen the video if the capture card audio is still missing.",
  "audio.micHint": "Mic not granted — capture-card audio joins once granted and the video reopens.",
  "audio.noAudio": "The current stream carries no audio track.",

  // 键盘
  "kb.enable": "Forward physical keyboard",
  "kb.virtual": "Virtual keyboard",
  "kb.paste": "Clipboard paste",
  "kb.captureHint": "An input field has focus — forwarding paused.",
  "paste.title": "Paste to target machine",
  "paste.placeholder": "Type or paste text (ASCII)…",
  "paste.send": "Preview & type",
  "paste.previewTitle": "Paste preview",
  "paste.charCount": "{n} characters",
  "paste.progress": "{typed}/{n} typed",
  "paste.cancel": "Cancel",
  "paste.confirm": "Type it out",
  "paste.sending": "Sending…",
  "paste.speed": "Typing speed",
  "paste.slow": "Slow",
  "paste.normal": "Standard",
  "paste.fast": "Fast",
  "paste.nonAscii": "Skipped {n} non-ASCII character(s) — HID cannot map them.",
  "paste.empty": "Nothing to type.",
  "paste.sent": "Typed {n} characters",
  "vk.title": "Virtual keyboard",

  // 鼠标面板
  "mouse.mode": "Mode",
  "mouse.absolute": "Absolute",
  "mouse.relative": "Relative",
  "mouse.style": "Cursor",
  "mouse.styleDefault": "Default",
  "mouse.styleGrab": "Grab",
  "mouse.styleCross": "Cross",
  "mouse.styleHidden": "Hidden",
  "mouse.wheelDir": "Wheel direction",
  "mouse.forward": "Natural",
  "mouse.reverse": "Reverse",
  "mouse.wheelSpeed": "Wheel speed",
  "mouse.jiggler": "Mouse jiggler",
  "mouse.jigglerHint": "Nudges the cursor after 15 s idle to keep the target awake.",
  "mouse.relativeHint": "Click the video to lock the pointer. Press Esc to release.",

  // 录制
  "rec.start": "Record",
  "rec.stop": "Stop",
  "rec.hint": "Records the stream as WebM, written to disk while recording.",
  "rec.fallbackHint": "Streaming file writes are unsupported here; the file downloads when you stop.",
  "rec.screenshot": "Snapshot",

  // 设置与其他
  "settings.language": "Language",
  "demo.banner": "Demo mode — no hardware attached; HID reports are echoed on the test card.",
  "toast.snapSaved": "Snapshot saved",
  "toast.snapCopied": "Snapshot copied to clipboard",
  "toast.snapFail": "Snapshot failed",
  "toast.pipFail": "Picture-in-picture failed",
  "toast.recSaved": "Recording saved",
  "toast.recFail": "Recording failed",
  "toast.connected": "Device connected",
  "toast.disconnected": "Device disconnected",
  "toast.videoFail": "Could not open the capture card",
  "toast.videoLost": "Video signal lost — reconnecting…",
  "toast.videoLostGiveUp": "Video signal lost — reopen it from the toolbar",
  "toast.serialFail": "Could not open the serial port",
  "toast.serialReconnected": "Serial reconnected automatically",
  "toast.macSent": "{name} sent",
} as const;

export type TKey = keyof typeof EN;
