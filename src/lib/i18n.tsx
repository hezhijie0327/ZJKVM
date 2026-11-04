/** Minimal typed i18n: React context + en/zh dictionaries (the two locales the
 *  family ships complete). Adding a locale = adding one dictionary file. */

import { createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState } from "react";
import * as storage from "@/lib/storage";
import { setTranslator } from "@/state/t";

export type Lang = "en" | "zh";

const en = {
  "app.consoleTitle": "USB KVM Console",
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
  "browser.serialMissing":
    "This browser does not support Web Serial. Use desktop Chrome or Edge for keyboard/mouse injection.",
  "browser.secureMissing": "A secure context (HTTPS or localhost) is required for camera and serial access.",
  "browser.mediaMissing": "This browser does not support media device enumeration.",
  "connect.title": "Connect device",
  "connect.descVideo": "Select your capture card to open the HDMI preview of the target machine.",
  "connect.descSerial":
    "Connect the serial port of your KVM hardware — keyboard and mouse injection ride on this link.",
  "connect.desc": "Pick the capture card and open the HID serial port. Everything stays local in your browser.",
  "connect.video": "Capture card",
  "connect.videoAuto": "Auto detect",
  "connect.openVideo": "Open video",
  "connect.serial": "HID serial port",
  "connect.serialButton": "Open serial port",
  "connect.serialHint": "Pick the USB serial device of your KVM dongle (CH9329).",
  "connect.demo": "Demo mode",
  "connect.demoHint": "Try the full console without hardware — a virtual capture card plus a visual HID echo.",
  "connect.connecting": "Connecting…",
  "connect.cameraDenied": "Camera permission was denied. Enable it in the browser site settings, then retry.",
  "connect.noVideo": "No capture device found.",
  "connect.authHint":
    "List empty? Click “Open video” once to grant camera access — the capture card is then recognized automatically.",
  "connect.skipVideo": "Skip video",
  "nav.theme": "Theme",
  "nav.lang": "Language",
  "nav.help": "About",
  "about.demoButton": "Try demo mode",
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
  "led.num": "NUM",
  "led.caps": "CAPS",
  "led.scroll": "SCRL",
  "led.hint": "Target keyboard lock states, read from the device",
  "status.hid": "HID",
  "status.mic": "Mic",
  "status.disconnectVideo": "Disconnect video",
  "status.disconnectSerial": "Disconnect serial",
  "status.demoStop": "Stop demo mode",
  "status.hidHint": "USB enumeration on the controlled machine — dim means key/mouse injections have no receiver",
  "status.video": "VIDEO",
  "status.serial": "SERIAL",
  "status.demo": "DEMO",
  "status.fw": "FW {v}",
  "stage.noSignal": "Waiting for video",
  "stage.noHdmi": "NO HDMI SIGNAL — connect the target machine's video output to the dongle",
  "stage.openSettings": "Open the toolbar to pick a capture card, or reconnect from the console menu.",
  "tb.video": "Video",
  "tb.audio": "Audio",
  "tb.keyboard": "Keyboard",
  "tb.mouse": "Mouse",
  "tb.record": "Record",
  "tb.screenshot": "Screenshot",
  "tb.pip": "Picture in picture",
  "tb.fullscreen": "Fullscreen",
  "tb.collapse": "Collapse toolbar",
  "tb.expand": "Expand toolbar",
  "video.resolution": "Resolution",
  "video.rotation": "Rotation",
  "video.scale": "Zoom",
  "video.device": "Capture device",
  "video.customAdd": "Add custom resolution",
  "video.width": "Width",
  "video.height": "Height",
  "video.customExists": "Already exists",
  "video.stats": "Stats overlay",
  "audio.volume": "Volume",
  "audio.sound": "Sound",
  "audio.mute": "Mute",
  "audio.mic": "Microphone",
  "audio.micRequest": "Grant microphone",
  "audio.micGranted": "Granted",
  "audio.micFail": "Microphone permission denied — check the browser site settings.",
  "toast.micGranted": "Microphone granted — capture-card audio joins on reopen",
  "audio.micGrantedHint": "Mic granted — reopen the video if the capture card audio is still missing.",
  "audio.micHint": "Mic not granted — click MIC in the status bar below to enable capture-card audio.",
  "audio.noAudio": "The current stream carries no audio track.",
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
  "rec.start": "Record",
  "rec.stop": "Stop",
  "rec.hint": "Records the stream as WebM, written to disk while recording.",
  "rec.fallbackHint": "Streaming file writes are unsupported here; the file downloads when you stop.",
  "rec.screenshot": "Snapshot",
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
  "toast.videoLostGiveUp": "Video signal lost — click the status bar to reconnect",
  "toast.serialFail": "Could not open the serial port",
  "toast.serialReconnected": "Serial reconnected automatically",
  "toast.macSent": "{name} sent",
} as const;

export type TKey = keyof typeof en;

const zh: Record<TKey, string> = {
  "app.consoleTitle": "USB KVM 控制台",
  "common.ok": "确定",
  "common.cancel": "取消",
  "common.close": "关闭",
  "common.delete": "删除",
  "common.save": "保存",
  "common.add": "添加",
  "common.apply": "应用",
  "common.reset": "重置",
  "common.default": "默认",
  "common.custom": "自定义",
  "common.on": "开",
  "common.off": "关",
  "common.auto": "自动",
  "common.unknown": "未知",
  "common.copy": "复制",
  "common.copied": "已复制",
  "common.download": "下载",
  "common.retry": "重试",
  "common.connect": "连接",
  "common.disconnect": "断开",
  "browser.serialMissing": "当前浏览器不支持 Web Serial,键鼠注入需要桌面版 Chrome / Edge。",
  "browser.secureMissing": "摄像头与串口访问需要安全上下文(HTTPS 或 localhost)。",
  "browser.mediaMissing": "当前浏览器不支持媒体设备枚举。",
  "connect.title": "连接设备",
  "connect.descVideo": "选择你的采集卡,打开目标机的 HDMI 视频预览。",
  "connect.descSerial": "连接 KVM 硬件的串口,键鼠注入经由这条链路送达目标机。",
  "connect.desc": "选择采集卡并打开 HID 串口,所有数据都只在你本地的浏览器与设备之间流转。",
  "connect.video": "采集卡",
  "connect.videoAuto": "自动检测",
  "connect.openVideo": "打开视频",
  "connect.serial": "HID 串口",
  "connect.serialButton": "打开串口",
  "connect.serialHint": "选择 KVM 硬件对应的 USB 串口设备(CH9329)。",
  "connect.demo": "演示模式",
  "connect.demoHint": "无硬件也能体验完整控制台:虚拟采集卡 + 键鼠注入可视化回显。",
  "connect.connecting": "连接中…",
  "connect.cameraDenied": "摄像头权限被拒绝,请在浏览器站点设置中开启后重试。",
  "connect.noVideo": "未找到采集设备。",
  "connect.authHint": "列表为空时,点击一次「打开视频」授权摄像头,采集卡即可自动识别。",
  "connect.skipVideo": "暂不用视频",
  "nav.theme": "主题",
  "nav.lang": "语言",
  "nav.help": "关于",
  "about.demoButton": "试用演示模式",
  "about.demoRunning": "演示运行中",
  "about.demoNote": "模拟采集卡与键鼠注入,无需真实硬件。",
  "toast.demoStarted": "演示模式已开启",
  "about.title": "关于 ZJKVM",
  "about.feature1": "HDMI 采集预览,最高 4K60,支持旋转与缩放",
  "about.feature2": "完整键鼠注入,物理键盘转发安全适配省电策略",
  "about.feature3": "视频录制与一键截图,全部保存在本机",
  "about.feature4": "任意 Chromium 浏览器即可运行,支持 Windows / macOS / Linux 目标机",
  "about.blurb":
    "ZJKVM 把一张 USB 采集卡和一颗 CH9329 HID 芯片,变成跑在浏览器里的完整 KVM 控制台——键入的内容与画面不出本机。",
  "about.demo":
    "演示模式模拟了整条链路:画布测试卡代替采集卡,每一条键鼠注入报文都会回显在画面上,无需硬件即可验证键盘、鼠标、宏与 LED 读取。",
  "led.num": "NUM",
  "led.caps": "CAPS",
  "led.scroll": "SCRL",
  "led.hint": "目标机键盘锁定状态,来自设备回读",
  "status.hid": "HID",
  "status.mic": "麦克风",
  "status.disconnectVideo": "断开视频",
  "status.disconnectSerial": "断开串口",
  "status.demoStop": "停止演示",
  "status.hidHint": "被控机的 USB 枚举状态,熄灭表示键鼠注入没有接收端",
  "status.video": "视频",
  "status.serial": "串口",
  "status.demo": "演示",
  "status.fw": "固件 {v}",
  "stage.noSignal": "等待视频信号",
  "stage.noHdmi": "HDMI 无信号——请将被控机的视频输出接入采集卡",
  "stage.openSettings": "打开工具栏选择采集卡,或在控制台菜单中重新连接。",
  "tb.video": "视频",
  "tb.audio": "音频",
  "tb.keyboard": "键盘",
  "tb.mouse": "鼠标",
  "tb.record": "录制",
  "tb.screenshot": "截图",
  "tb.pip": "画中画",
  "tb.fullscreen": "全屏",
  "tb.collapse": "收起工具栏",
  "tb.expand": "展开工具栏",
  "video.resolution": "分辨率",
  "video.rotation": "旋转",
  "video.scale": "缩放",
  "video.device": "采集设备",
  "video.customAdd": "添加自定义分辨率",
  "video.width": "宽",
  "video.height": "高",
  "video.customExists": "已存在",
  "video.stats": "统计浮层",
  "audio.volume": "音量",
  "audio.sound": "声音",
  "audio.mute": "静音",
  "audio.mic": "麦克风",
  "audio.micRequest": "授权麦克风",
  "audio.micGranted": "已授权",
  "audio.micFail": "麦克风授权被拒绝——请检查浏览器站点设置。",
  "toast.micGranted": "麦克风已授权,重开后混入采集卡音频",
  "audio.micGrantedHint": "麦克风已授权,若仍无采集卡音频请重开视频。",
  "audio.micHint": "麦克风未授权——点击底部状态栏的“麦克风”开启采集卡音频。",
  "audio.noAudio": "当前视频流没有音轨。",
  "kb.enable": "转发物理键盘",
  "kb.virtual": "虚拟键盘",
  "kb.paste": "剪贴板粘贴",
  "kb.captureHint": "输入框获得焦点,键盘转发已暂停。",
  "paste.title": "粘贴到目标机",
  "paste.placeholder": "输入或粘贴文本(仅支持 ASCII)…",
  "paste.send": "预览并输入",
  "paste.previewTitle": "粘贴预览",
  "paste.charCount": "{n} 个字符",
  "paste.progress": "已输入 {typed}/{n}",
  "paste.cancel": "取消",
  "paste.confirm": "开始输入",
  "paste.sending": "发送中…",
  "paste.speed": "输入速度",
  "paste.slow": "慢",
  "paste.normal": "标准",
  "paste.fast": "快",
  "paste.nonAscii": "已跳过 {n} 个非 ASCII 字符(HID 无法映射)。",
  "paste.empty": "没有可输入的内容。",
  "paste.sent": "已输入 {n} 个字符",
  "vk.title": "虚拟键盘",
  "mouse.mode": "模式",
  "mouse.absolute": "绝对",
  "mouse.relative": "相对",
  "mouse.style": "光标",
  "mouse.styleDefault": "默认",
  "mouse.styleGrab": "抓取",
  "mouse.styleCross": "十字",
  "mouse.styleHidden": "隐藏",
  "mouse.wheelDir": "滚轮方向",
  "mouse.forward": "正向",
  "mouse.reverse": "反向",
  "mouse.wheelSpeed": "滚轮速度",
  "mouse.jiggler": "鼠标晃动器",
  "mouse.jigglerHint": "空闲 15 秒后自动轻微移动光标,防止目标机休眠。",
  "mouse.relativeHint": "点击画面锁定指针,按 Esc 退出。",
  "rec.start": "录制",
  "rec.stop": "停止",
  "rec.hint": "将视频流录制成 WebM,边录边写入磁盘。",
  "rec.fallbackHint": "当前浏览器不支持边录边写盘,停止录制后一次性下载。",
  "rec.screenshot": "截图",
  "settings.language": "语言",
  "demo.banner": "演示模式——未连接真实硬件,键鼠注入报文会回显在测试卡上。",
  "toast.snapSaved": "截图已保存",
  "toast.snapCopied": "截图已复制到剪贴板",
  "toast.snapFail": "截图失败",
  "toast.pipFail": "画中画打开失败",
  "toast.recSaved": "录制已保存",
  "toast.recFail": "录制失败",
  "toast.connected": "设备已连接",
  "toast.disconnected": "设备连接已断开",
  "toast.videoFail": "无法打开采集卡",
  "toast.videoLost": "视频信号丢失,正在自动重连…",
  "toast.videoLostGiveUp": "视频信号丢失——点击状态栏视频可重连",
  "toast.serialFail": "串口打开失败",
  "toast.serialReconnected": "串口已自动重连",
  "toast.macSent": "已发送 {name}",
};

const LOCALES: Record<Lang, Record<TKey, string>> = { en, zh };

function detectLang(): Lang {
  const saved = storage.getLanguage();
  if (saved === "en" || saved === "zh") return saved;
  return navigator.language.toLowerCase().startsWith("zh") ? "zh" : "en";
}

interface I18nContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TKey, vars?: Record<string, string | number>) => string;
}

const I18nContext = createContext<I18nContextValue | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(detectLang);

  useEffect(() => {
    document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";
  }, [lang]);

  const setLang = useCallback((next: Lang) => {
    setLangState(next);
    storage.setLanguage(next);
  }, []);

  const t = useCallback(
    (key: TKey, vars?: Record<string, string | number>) => {
      let text = LOCALES[lang][key] ?? LOCALES.en[key] ?? key;
      if (vars) {
        for (const [name, value] of Object.entries(vars)) {
          text = text.replaceAll(`{${name}}`, String(value));
        }
      }
      return text;
    },
    [lang],
  );

  // Non-React modules (connection manager, recorder) share the same translator
  useEffect(() => {
    setTranslator(t);
  }, [t]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nContextValue {
  const ctx = useContext(I18nContext);
  if (!ctx) {
    throw new Error("useI18n must be used within I18nProvider");
  }
  return ctx;
}
