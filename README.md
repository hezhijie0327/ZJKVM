# ZJKVM

**ZJKVM** —— 运行在浏览器里的 USB KVM 控制台,为 **NanoKVM-USB** 硬件量身打造。

基于 **Vite + React 19 纯 SPA**,Tailwind CSS v4,jotai。所有数据只在本地浏览器与设备之间流转:视频由浏览器直接解码采集卡画面(getUserMedia),键鼠指令通过 Web Serial 写入 CH9329,不经任何服务器。设计语言遵循 [DESIGN.md](./DESIGN.md)(ZJ 设计系统:暖纸底 × 墨字 × 琥珀金,零 webfont),工程契约见 [AGENTS.md](./AGENTS.md)。

## 特性

- **设备统一管理**:顶部设备面板一处连接采集卡 / HID 串口 / 麦克风与音量;状态芯片只读回读(链路 · 统计 · HID · LED · 固件)
- **采集即插即用**:自动识别与热插拔监听,断流自动重连;预设与自定义分辨率实时切换(最高 4K),旋转(0°/90°/180°/270°)与缩放(75%–200%)
- **完整键鼠注入**:物理键盘安全转发(IME / AltGr / 省电策略适配)、虚拟键盘(含小键盘)、绝对 / 相对双模式鼠标与触屏手势
- **剪贴板与宏**:剪贴板逐键输入(可调速度、预览与中途取消)、快捷键组合与序列宏(适配 BIOS 按键场景)
- **LED 与遥测回读**:NUM / CAPS / SCRL 锁定状态、固件版本、实时分辨率与实测帧率
- **效率工具**:PNG 截图(下载 + 复制)、WebM 录制(边录边写盘)、画中画监视小窗
- **演示模式**:无硬件体验完整控制台(虚拟采集卡 + 指令可视化回显)
- **简体中文 / English** 界面,亮 / 暗 / 跟随系统主题(`@property` 整页交叉淡化,首帧防闪烁)
- **Lighthouse 双端门禁**:桌面 + 移动端四项 100 分(Performance ≥ 90),零 webfont、零图片资源

## 快速开始

```bash
pnpm install        # 安装依赖(包管理器:pnpm)
pnpm dev            # 开发服务器 http://localhost:3010(无硬件?点「演示模式」)
pnpm build          # tsc --noEmit + vite build(两者都必须通过)
pnpm lint           # Biome(格式化 + Lint)
pnpm audit          # Lighthouse 门禁(先 build;LH_FORM_FACTOR=mobile 跑移动端)
pnpm icons          # 重新生成 PWA 图标(零依赖 PNG 编码器)
```

## 系统要求

| 项目 | 要求 |
| --- | --- |
| 硬件 | NanoKVM-USB(HDMI 采集 + CH9329 HID) |
| 浏览器 | 桌面版 Chrome / Edge(Web Serial 与采集卡访问需要安全上下文) |
| 系统 | macOS / Windows / Linux;移动端浏览器可观看视频并使用触控操作 |

## 工作原理

ZJKVM 与 NanoKVM-USB 通过两条本机通道通信:

- **视频**:采集卡是标准 UVC 设备,浏览器通过 `getUserMedia` 直接解码,支持按 `groupId` 配对同源音频。
- **键鼠**:Web Serial 以 57600 波特率发送 CH9329 兼容指令帧(`57 AB` 帧头 + 校验和),映射为标准 USB HID 报告——键盘 8 字节 Boot 协议、鼠标绝对(12bit)/ 相对(±127)两种模式。

## 目录结构

```
src/
├── main.tsx / App.tsx   # 启动引导 + 布局组合 + 设置持久化
├── components/
│   ├── stage/           # 舞台:视频 letterbox / 统计 / pictureRect 几何
│   ├── toolbar/         # 工具栏与面板(设备统一管理 / 键盘 / 鼠标)
│   ├── input/           # 物理键盘转发 / 绝对与相对鼠标
│   ├── keyboard/        # 虚拟键盘(皮肤在 styles/kvm.css)
│   ├── shell/           # 导航 / 状态胶囊 / 关于
│   └── ui/              # Button / Popover / Dropdown / Modal 等通用件
├── lib/
│   ├── device/          # 字节级协议层:CH9329 帧序 + HID 键表(勿动,见 AGENTS.md)
│   ├── i18n/            # 词库(EN 基准,zh 镜像)
│   ├── media/           # 采集卡与麦克风封装
│   └── styles.ts        # 设计片段库(家族片段与 ZJKVM 扩展)
├── state/               # jotai 原子与连接编排(运行于 React 之外)
├── styles/              # 设计 token 与全局样式(tokens/base/behaviors 与 zjblog 逐字节同步)
└── config/site.ts       # 站点配置
scripts/                  # Lighthouse 双端门禁 + PWA 图标生成
```

## License

[Apache License 2.0 with Commons Clause v1.0](LICENSE)
