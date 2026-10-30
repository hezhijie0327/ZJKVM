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
  "about.title": "About ZJKVM",
  "about.blurb":
    "A USB KVM console built on the NanoKVM-USB link protocol (CH9329 frames over Web Serial, UVC capture via getUserMedia), restyled in the ZJ design language — warm paper, ink text, amber gold.",
  "about.demo":
    "Demo mode simulates the whole stack: a canvas test card stands in for the capture card and every HID report is echoed back onto it, so keyboard, mouse, macros and the LED reader can be exercised without hardware.",
  "about.credits": "Protocol reference: NanoKVM-USB (sipeed). This console is an independent implementation.",
  "led.num": "NUM",
  "led.caps": "CAPS",
  "led.scroll": "SCRL",
  "led.hint": "Target keyboard lock states, read from the device",
  "status.video": "VIDEO",
  "status.serial": "SERIAL",
  "status.demo": "DEMO",
  "status.fw": "FW {v}",
  "stage.noSignal": "Waiting for video",
  "stage.openSettings": "Open the toolbar to pick a capture card, or reconnect from the console menu.",
  "tb.video": "Video",
  "tb.audio": "Audio",
  "tb.keyboard": "Keyboard",
  "tb.mouse": "Mouse",
  "tb.record": "Record",
  "tb.screenshot": "Screenshot",
  "tb.pip": "Picture in picture",
  "tb.settings": "Settings",
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
  "audio.mute": "Mute",
  "audio.mic": "Microphone",
  "audio.micRequest": "Grant microphone",
  "audio.micHint": "After granting, reopen the video to mix in the capture card audio.",
  "audio.noAudio": "The current stream carries no audio track.",
  "kb.enable": "Forward physical keyboard",
  "kb.virtual": "Virtual keyboard",
  "kb.paste": "Clipboard paste",
  "kb.macros": "Shortcuts & macros",
  "kb.quick": "Quick keys",
  "kb.captureHint": "An input field has focus — forwarding paused.",
  "paste.title": "Paste to target machine",
  "paste.placeholder": "Type or paste text (ASCII)…",
  "paste.send": "Type it out",
  "paste.speed": "Typing speed",
  "paste.slow": "Slow",
  "paste.normal": "Standard",
  "paste.fast": "Fast",
  "paste.nonAscii": "Skipped {n} non-ASCII character(s) — HID cannot map them.",
  "paste.empty": "Nothing to type.",
  "paste.sent": "Typed {n} characters",
  "macro.title": "Shortcuts & macros",
  "macro.add": "Capture combo",
  "macro.play": "Send",
  "macro.mode": "Mode",
  "macro.modeChord": "Chord",
  "macro.modeSeq": "Sequence",
  "macro.repeat": "Repeat",
  "macro.times": "{n}×",
  "macro.captureHint": "Press the combo (up to 6 keys)…",
  "macro.sysHint": "OS-level keys (Win/Cmd) need fullscreen with keyboard lock.",
  "macro.playing": "Sending…",
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
  "settings.export": "Export settings",
  "settings.import": "Import settings",
  "settings.imported": "Settings imported ({n} keys)",
  "settings.importFail": "Not a ZJKVM settings backup.",
  "settings.reset": "Reset settings",
  "settings.resetDone": "Settings cleared — reload to apply defaults.",
  "settings.about": "About",
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
  "toast.serialFail": "Could not open the serial port",
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
  "about.title": "关于 ZJKVM",
  "about.blurb":
    "基于 NanoKVM-USB 链路协议(CH9329 串口帧 + getUserMedia 视频采集)独立实现的 USB KVM 控制台,界面采用 ZJ 设计语言——暖纸底、墨色文字、琥珀金点缀。",
  "about.demo":
    "演示模式模拟了整条链路:画布测试卡代替采集卡,每一条键鼠注入报文都会回显在画面上,无需硬件即可验证键盘、鼠标、宏与 LED 读取。",
  "about.credits": "协议参考:NanoKVM-USB(sipeed)。本控制台为独立实现。",
  "led.num": "NUM",
  "led.caps": "CAPS",
  "led.scroll": "SCRL",
  "led.hint": "目标机键盘锁定状态,来自设备回读",
  "status.video": "视频",
  "status.serial": "串口",
  "status.demo": "演示",
  "status.fw": "固件 {v}",
  "stage.noSignal": "等待视频信号",
  "stage.openSettings": "打开工具栏选择采集卡,或在控制台菜单中重新连接。",
  "tb.video": "视频",
  "tb.audio": "音频",
  "tb.keyboard": "键盘",
  "tb.mouse": "鼠标",
  "tb.record": "录制",
  "tb.screenshot": "截图",
  "tb.pip": "画中画",
  "tb.settings": "设置",
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
  "audio.mute": "静音",
  "audio.mic": "麦克风",
  "audio.micRequest": "授权麦克风",
  "audio.micHint": "授权后需重新打开视频,才能混入采集卡音频。",
  "audio.noAudio": "当前视频流没有音轨。",
  "kb.enable": "转发物理键盘",
  "kb.virtual": "虚拟键盘",
  "kb.paste": "剪贴板粘贴",
  "kb.macros": "快捷键与宏",
  "kb.quick": "快捷键组",
  "kb.captureHint": "输入框获得焦点,键盘转发已暂停。",
  "paste.title": "粘贴到目标机",
  "paste.placeholder": "输入或粘贴文本(仅支持 ASCII)…",
  "paste.send": "逐键输入",
  "paste.speed": "输入速度",
  "paste.slow": "慢",
  "paste.normal": "标准",
  "paste.fast": "快",
  "paste.nonAscii": "已跳过 {n} 个非 ASCII 字符(HID 无法映射)。",
  "paste.empty": "没有可输入的内容。",
  "paste.sent": "已输入 {n} 个字符",
  "macro.title": "快捷键与宏",
  "macro.add": "捕获组合键",
  "macro.play": "发送",
  "macro.mode": "模式",
  "macro.modeChord": "同时",
  "macro.modeSeq": "依次",
  "macro.repeat": "重复",
  "macro.times": "{n} 次",
  "macro.captureHint": "按下组合键(最多 6 键)…",
  "macro.sysHint": "系统级按键(Win/Cmd)需在全屏 + 键盘锁定模式下使用。",
  "macro.playing": "发送中…",
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
  "settings.export": "导出设置",
  "settings.import": "导入设置",
  "settings.imported": "设置已导入({n} 项)",
  "settings.importFail": "不是有效的 ZJKVM 设置备份。",
  "settings.reset": "恢复默认设置",
  "settings.resetDone": "设置已清空,刷新页面后生效。",
  "settings.about": "关于",
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
  "toast.serialFail": "串口打开失败",
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
