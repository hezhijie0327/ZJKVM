# ZJKVM 设计语言 —— ZJ 家族 app 形态扩展

ZJKVM 是 ZJ 设计家族(参见 zjblog `DESIGN.md`)的第一个 **app 形态**成员:博客定义了家族语法,这里验证它在实时控制界面上的扩展。家族六原则不变(暖纸墨金、内容优先、纸感物理、零 webfont、快、克制),本文只记录 KVM 专属的扩展与偏差,全部已登记。

## 1. Token:家族原样继承,零改动

`src/styles/tokens.css` 与 zjblog **逐字节一致**(拷贝即用):19 个 `@property` 注册的颜色 token、两级暖阴影、三轨道系统字体、5 个 keyframes。KVM 没有新增任何颜色 token —— 状态语义全部落在既有 token 上:

| 语义 | token |
| --- | --- |
| 连接正常 | `--ok`(状态栏 VIDEO/SERIAL/DEMO 圆点与描边) |
| 连接中 | `--warning` |
| 录制中 | `--danger`(脉冲点 + REC 计时) |
| 点亮/强调 | `--accent-strong` + `--accent-contrast`(LED 灯、选中段、主按钮) |
| 舞台底 | `--surface-2` + 横线纸纹(32px 节奏,与 blog 31px 行线同语言) |

主题机制原样移植:`.dark` class、整页 token 交叉淡化(0.3s)+ 350ms stand-down、`<head>` 防闪脚本、theme-color 双 meta 收敛。**差异**:KVM 增加了手动三态循环(auto→light→dark,`lib/theme.ts setThemeStyle` 持久化),因为监控画面的用户需要强制亮色。

## 2. 布局:从"页面"到"舞台"

博客的 Shell(导航/正文/页脚)在这里变成 **导航 / 舞台 / 状态栏**:

```
Navigation   h-14 sticky 毛玻璃,serif 词标 ZJKVM + 金色句点(家族签名,原样)
Stage        flex-1 满幅,横线纸纹底,视频 object-contain 居中
  ├─ 统计浮层   左上,mono STATUS_CHIP(分辨率 · fps)
  ├─ 工具栏     顶部悬浮玻璃胶囊(draggable,fine pointer);移动端 fixed 底部
  └─ 无信号态   hollow-text 幽灵水印 "NO SIGNAL" + serif 标题 + 纸片按钮
Statusbar    h-9 单行 mono footer(家族 META 语言):连接芯片 · LED · 固件 · REC
```

**家族偏差(已登记)**:博客的页脚是居中版权行;KVM 的底部信息带是左信息右元数据的 mono 状态栏 —— 它就是 app 的页脚,版权行仍在其右端。移动端 app 容器加 `pb-20` 让状态栏避开底部工具栏。

## 3. 片段库:`src/lib/styles.ts`

家族片段(ICON_BTN / CARD / BTN_PRIMARY / PAPER_STRIP / CHIP / META / EYEBROW / TAPE…)与 zjblog 逐字同步。**ZJKVM 新增片段(家族规则②:先登记后使用)**:

| 片段 | 用途 |
| --- | --- |
| `PANEL_ROW` | 面板行:label 左控制右,LIST_ROW 的紧凑兄弟 |
| `SEGMENT` / `SEGMENT_ITEM_ON/OFF` | 分段控件:surface-2 轨道 + accent-strong 选中胶囊(家族 tab 语言) |
| `TOOLBAR` / `TOOLBAR_DIVIDER` | 悬浮玻璃胶囊工具栏(bg-bg/80 + backdrop-blur-md,与导航同材质) |
| `STATUS_CHIP` | 状态栏/浮层芯片:h-6 mono 圆角描边 |
| `KEY` | 虚拟键盘按键(皮肤在 `.kvm-key`) |
| `MODAL_SCRIM` / `MODAL_PANEL` | 家族模态:ink/30 背板 + 淡入淡出 + 240ms 卸载兜底 |
| `SHEET` | 底部抽屉(虚拟键盘) |
| `GHOST_TEXT` | GHOST_DATE 的内容无关版(无信号水印) |

## 4. 纸感物理在 app 里的落点

克制的家族原则在实时界面上收紧:胶带、撕纸、微倾斜只出现在**一次性纸面**(连接门、宏管理、虚拟键盘的顶部边缘),绝不进入每秒重绘的视频层:

- **连接门**:顶部单条胶带(seed 固定旋转),行式列表,主操作是 `STRIP_PRIMARY` 金色撕纸条("演示模式")
- **宏管理**:右上角双角胶带,按键用 `MONO_CHIP`
- **虚拟键盘**:底部抽屉 + 左上单胶带,按键 `.kvm-key`(surface 面、mono 11px、按下 accent-strong + translateY(1px) 物理下沉)
- **无信号**:`hollow-text` 幽灵水印 + 纸片按钮
- **不使用**:paper-note 横线纸(与舞台纸纹打架)、postmark、marker-strip

## 5. 动效

全部沿用家族 keyframes(fade-up 入场 / fade-in / fade-out 0.16s + 240ms 兜底卸载 / reduced-motion 全局压平)。新增唯一动画:`kvm-pulse`(录制点呼吸,1.2s),同样尊重 reduced-motion。主题切换沿用 stand-down 窗口。

## 6. 可访问性

- 工具栏 `role="toolbar"`,每个图标钮必带 `aria-label` + `title`;分段控件 `role="radiogroup"`;开关 `role="switch"` + `aria-checked`
- LED 芯片 `role="img"` + `aria-label="CAPS on/off"`;REC 计时 `aria-live="polite"`
- 焦点环 2px accent(家族 base.css 原样);触控目标 ≥ 36px;`pointer:coarse` 下输入控件 16px 防 iOS 缩放
- 跳转链接直达 `#video`;弹层 Esc 可退、外部 pointerdown 关闭

## 7. 响应式契约

| 断点 | 布局 |
| --- | --- |
| `md`(768) | 工具栏:顶部胶囊 ⇄ 底部固定条(面板从下往上弹);导航标题副文字显隐 |
| `650px` | 触屏手势启停阈值(继承原版) |
| 虚拟键盘控制簇 | `md` 以下隐藏(移动端只留主键区 + 方向键) |

字号全端恒定(界面 text-sm、meta text-xs 12px 地板,家族规则)。

## 8. 性能与 SEO 契约(家族 §15 的 KVM 版)

- `pnpm audit` 门禁:Performance ≥ 90(桌面实测 100)/ A11y / BP / SEO = 100,双档位(桌面+`LH_FORM_FACTOR=mobile`)都必须通过
- 零 webfont、零图片资源(图标 = 内联 lucide SVG;logo = 代码生成 PNG)
- JS 单包 360KB(114KB gzip),React 19 + jotai;首屏无阻塞 JS(CSS 唯一渲染阻塞)
- Agentic 友好:`robots.txt` / `llms.txt` / `.well-known/ard.json`(家族 agentic browsing 立场的延续)

## 9. 双向同步清单

改这里也要改那边(反之亦然):

- `src/styles/tokens.css` ←→ zjblog `src/styles/tokens.css`(逐字节)
- `src/lib/styles.ts` 家族片段区 ←→ zjblog `src/lib/styles.ts`
- `src/styles/base.css` / `behaviors.css` ←→ 同名文件
- `lib/theme.ts` / index.html 防闪脚本 ←→ zjblog `lib/theme.ts` + THEME_BOOTSTRAP
