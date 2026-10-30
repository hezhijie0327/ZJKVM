# ZJKVM

**ZJ 设计语言的 USB KVM 控制台** —— 基于 NanoKVM-USB 链路协议独立实现的网页端 KVM,界面与 [ZJBlog](../blog) 家族完全一致:暖纸底、墨色文字、琥珀金点缀。

<div aria-hidden="true">warm paper · ink text · amber gold</div>

## 功能

### 继承自 NanoKVM-USB(协议字节级兼容)

| 模块 | 说明 |
| --- | --- |
| 视频采集 | `getUserMedia` + UVC 采集卡,分辨率预设/自定义、旋转 0/90/180/270、缩放 auto~200% |
| 键盘注入 | Web Serial(57600 8N1)→ CH9329 帧 → USB HID Boot 协议 8 字节报告,6 键无冲 |
| 鼠标注入 | 绝对模式(12bit,letterbox/旋转/缩放坐标修正)+ 相对模式(Pointer Lock)+ 触屏手势 |
| 虚拟键盘 | 自研实现(原版依赖 400KB 键盘库),修饰键锁存语义与原版一致 |
| 剪贴板粘贴 | 逐键输入,`\n`→Enter、`\t`→Tab,非 ASCII 字符明确提示跳过数量 |
| 快捷键 | 组合键(chord ≤6 键)发送,Win/Cmd 需全屏 + `navigator.keyboard.lock()` |
| 录制 | MediaRecorder → WebM,优先 `showSaveFilePicker` 边录边写盘,回退内存下载 |
| 多语言 | 简体中文 / English 完整覆盖 |

### 查缺补漏 —— 我们自己增强的能力

| 增强 | 原版状态 |
| --- | --- |
| **LED 同步指示**(NUM/CAPS/SCRL)+ 固件版本号 | `GET_INFO` 是死代码,UI 从未展示;现每 3s 轮询回读 |
| **截图**(PNG 下载 + 剪贴板复制) | 完全没有 |
| **画中画**(PiP 小窗监视) | 完全没有 |
| **音量/静音控制** | 完全没有(音频授权流程还粗暴地断流重连,已修复) |
| **序列宏 + 重复次数**(BIOS 刷键、按键序列) | 只有组合键 |
| **Demo 演示模式**(虚拟采集卡 + HID 回显测试卡) | 无硬件完全无法使用;现在整条链路可视化验证 |
| **设备热插拔监听**(`devicechange`) | 不监听,拔线后设备列表过期 |
| **断连恢复**(串口断开 → 提示 + 一键重连/重开门) | 断开后无引导 |
| **旋转/缩放下的绝对坐标修正** | 原版只修 letterbox,旋转后坐标漂移 |
| **输入框自动暂停键盘转发** | 需手动开关,在粘贴框打字会漏进目标机 |
| **亮色/暗色/跟随系统三态主题** | 硬编码纯暗色 |
| **设置导出/导入(JSON)** | 无 |
| **统计浮层**(实际分辨率 + 实测帧率) | 无 |
| 能力检测兜底(Safari/Firefox 提示、非安全上下文提示) | 有检测函数但 UI 未用 |

### 修复的原版 Bug

- **鼠标晃动器发错命令**:`sendJiggle()` 把鼠标报告塞进 `sendKeyboardData`(CMD 0x02),真机上静默失效 → 改用 `sendMouseData`
- `requestPort()` 用户取消 → 未捕获的 Promise 拒绝
- `getInfo` 空响应 → `InfoPacket` NaN 版本号(因从未被调用而未暴露)→ 严格校验响应帧
- 粘贴时非 ASCII 字符被静默丢弃 → 明确计数提示

## 协议(与 NanoKVM-USB 字节级一致)

```
帧: [0x57][0xAB][ADDR=0x00][CMD][LEN][DATA…][SUM]
SUM = (0x57+0xAB+ADDR+CMD+LEN+ΣDATA) & 0xFF

0x01 GET_INFO          → 版本/连接态/LED
0x02 SEND_KB_GENERAL   DATA = 8B HID 键盘报告 [mod][0][key×6]
0x04 SEND_MS_ABS       DATA = [0x02][buttons][x_lo][x_hi][y_lo][y_hi][wheel](12bit,0-4096)
0x05 SEND_MS_REL       DATA = [0x01][buttons][dx][dy][wheel](补码 ±127)
```

视频无自建协议:采集卡是标准 UVC 设备,浏览器原生解码;音频按 `groupId` 与视频配对。

## 开发

```bash
pnpm install
pnpm dev        # http://localhost:3010(无硬件直接点"演示模式")
pnpm build      # tsc --noEmit && vite build
pnpm lint       # biome check
pnpm audit      # Lighthouse 门禁(桌面;LH_FORM_FACTOR=mobile 切移动档)
pnpm icons      # 重新生成 PWA 图标(零依赖 PNG 编码器)
```

要求:桌面版 Chrome / Edge(Web Serial + secure context)。其他浏览器可用 Demo 模式体验完整界面。

## 设计语言

见 [DESIGN.md](./DESIGN.md) —— 本项目是 ZJ 设计家族的第一个 app 形态成员,token 与片段库与 zjblog 双向同步。
