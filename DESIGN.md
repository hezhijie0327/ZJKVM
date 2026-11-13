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
  └─ 状态信息菜单  Activity 图标钮 → popover:统计(分辨率/帧率)· 演示(可停)
                  · HID · LED · 固件芯片;REC 计时条以危险芯片住在导航右侧
Stage        flex-1 满幅,横线纸纹底,视频 object-contain 居中
  ├─ 工具栏     顶部悬浮玻璃胶囊(free drag + 收起,双端一致);
  │             设备(设备面板:采集卡/串口/音频 统一管理,连带画面设置)· 键盘 · 鼠标
  ├─ 无信号态   serif 标题 + 接线图(WiringDiagram)+ 连接纸片按钮
  ├─ 等待芯片   stream 已接但无尺寸时的 pending 提示
  └─ 无 HDMI 态 3s 宽限后升级为接线指南
Statusbar    底部页脚:居中版权行(家族原样,text-xs text-ink-3;md+ 显示,
             移动端由 App 内 md:hidden 页脚条承担)
```

**反馈与动作分离(已登记)**:设备**回读**的反馈信息收进导航的状态信息菜单;连接动作统一收进工具栏的**设备面板**(采集卡连接与显示设置 / HID 串口 / 麦克风授权与音量),冷启动/无信号时自动展开设备面板(连接门已退役)。更早版本的「底部芯片胶囊」与「画面内 REC 徽章」已分别迁往导航与导航 REC 条(851cd67 / 9581589),`pictureRectAtom` 发布链路随之退役(2026-11 审计移除)。

### 空间与层级 guideline(家族 §6 的 app 版)

- **间距刻度**:Tailwind 默认 4px 基数,不自造刻度。唯一例外是**派生对位**:虚拟键盘小键盘 `mt-[2.625rem]` = 键高 36px(`.kvm-key` 2.25rem)+ 沟 6px,下移一行与主块对齐——数值随键盘几何走,不是第四种刻度;键盘行距改动时同步重算。
- **版心**:家族 §6 的 `container mx-auto` 在 app 形态让位给**满幅舞台**(注册偏差):导航/舞台/页脚全宽;悬浮层与画面 OSD 用 12px 级贴边距(`left-3` 级),画面内容区内缩 10px。
- **圆角词汇**:钮/胶囊 `rounded-full`、卡片/抽屉 `rounded-2xl`、小件 `rounded-lg/xl` —— 三档止步,无任意值圆角。
- **表面层级**:`--bg`(页)→ `--surface`(卡/芯片)→ `--surface-2`(悬停/舞台底)三级止步;舞台底 = `--surface-2` + 横线纸纹(32px 节奏)是登记的表面挪用。
- **elevation 两档**:`shadow-card`(静态)→ `shadow-pop`(悬浮/弹出),禁止裸写盒阴影。
- **z-index 阶梯(登记,新叠加层先入座再写样式)**:

  | 值 | 层 | 内容 |
  | --- | --- | --- |
  | 20 | 舞台信息 | 无信号态 / HDMI 警告(画面内提示) |
  | 30 | 画面 OSD + 键盘抽屉 | REC 徽章;虚拟键盘**刻意**压在工具栏树下(工具栏与 popover 保持可用) |
  | 40 | 悬浮胶囊 | 工具栏树 / 芯片胶囊与演示横幅 / 视频面板 |
  | 50 | 壳层 | 导航栏 |
  | 90 | 弹出层 | 工具栏 popover |
  | 100 | 模态背板 | `MODAL_SCRIM`(关于 / 粘贴预览) |
  | 110 | toast | 全局通知 |
- **触控目标**:基线走家族规则(按钮 `h-10`、图标钮 `size-9`、导航 `h-14`);芯片胶囊内是密集 OSD 语法,`STATUS_CHIP`(h-6)与收起/展开圆钮(size-6/7)按家族 §9 的 24px 注册地板执行,命中余量由胶囊 `py-1.5`、滚动行与相邻间距承担 —— 是对上文的精确化,不是放宽。

## 3. 片段库:`src/lib/styles.ts`

家族片段(ICON_BTN / CARD / BTN_PRIMARY / PAPER_STRIP / CHIP / META / EYEBROW / TAPE…)与 zjblog 逐字同步。**ZJKVM 新增片段(家族规则②:先登记后使用)**:

| 片段 | 用途 |
| --- | --- |
| `PANEL_ROW` / `PANEL_COL` | 面板行:label 左控制右(宽控件用列变体),LIST_ROW 的紧凑兄弟 |
| `SEGMENT` / `SEGMENT_ITEM_ON/OFF` | 分段控件:surface-2 轨道 + accent-strong 选中胶囊(家族 tab 语言) |
| `PANEL_STATE_CHIP` | 面板内状态芯片:与 h-8 行按钮同刻度 |
| `TOOLBAR` / `TOOLBAR_DIVIDER` | 悬浮玻璃胶囊工具栏(bg-bg/80 + backdrop-blur-md,与导航同材质) |
| `STATUS_CHIP` | 状态信息菜单芯片:h-6 mono 圆角描边 |
| `MODAL_SCRIM` | 家族模态背板(ink/30 + blur;面板由 Modal 用 CARD 自组,淡入淡出 + 240ms 卸载兜底) |

> 2026-11 审计清理:KEY(键帽直接用 `.kvm-key` 组合)、MODAL_PANEL、SHEET(浮窗/抽屉自组 shell)、GHOST_TEXT(无信号幽灵水印已随 2ab66d0 退役)四个无消费片段删除;家族段的 CARD_HOVER/STRIP_PAPER/ALERT_DANGER/SECTION 是**家族同步保留**(zjblog 两向同步,本应用暂无消费者,勿删)。

## 4. 纸感物理在 app 里的落点

克制的家族原则在实时界面上收紧:胶带、撕纸、微倾斜只出现在**一次性纸面**(宏管理、虚拟键盘的顶部边缘),绝不进入每秒重绘的视频层:

- **宏管理**:右上角双角胶带,按键用 `MONO_CHIP`
- **虚拟键盘**:底部抽屉 + 左上单胶带,按键 `.kvm-key`(surface 面、mono 11px、按下 accent-strong + translateY(1px) 物理下沉)
- **无信号**:`hollow-text` 幽灵水印 + 纸片按钮
- **不使用**:paper-note 横线纸(与舞台纸纹打架)、postmark、marker-strip

## 5. 动效

全部沿用家族 keyframes(fade-up 入场 / fade-in / fade-out 0.16s + 240ms 兜底卸载 / reduced-motion 全局压平)。新增唯一动画:`kvm-pulse`(录制点呼吸,1.2s),同样尊重 reduced-motion。主题切换沿用 stand-down 窗口。

## 6. 可访问性

- 工具栏 `role="toolbar"`,每个图标钮必带 `aria-label` + `title`;面板/弹层触发钮带 `aria-expanded`(IconButton `expanded` prop);分段控件 `role="radiogroup"`;开关 `role="switch"` + `aria-checked`
- LED/HID 芯片 `role="img"` + `aria-label` 形如 `CAPS 开/关`(状态词走 `common.on/off` 词库键);REC 计时数字 `aria-hidden`,录制**开始/停止**事件由常驻 sr-only `role="status"` 播报(不逐秒播报)
- 弹层焦点契约(2026-11 起):Modal 打开聚焦面板、Tab 圈定、关闭归还触发钮;Popover 关闭归还触发钮(外部 pointerdown 关闭除外 —— 焦点留在用户点击处);Dropdown 列表 ArrowUp/Down/Home/End + 打开聚焦选中项(APG listbox)
- 焦点环 2px accent(家族 base.css 原样);触控目标按 §2 guideline(基线 36–40px,芯片层 24px 注册地板);`pointer:coarse` 下输入控件 16px 防 iOS 缩放
- 跳转链接直达 `#video`(文案走词库);弹层 Esc 可退、外部 pointerdown 关闭;虚拟键盘 Esc 可关 + 窗口 blur 释放按住的键(与物理转发同守卫)
- 能力横幅:非 Chromium / 非安全上下文启动时导航下出现一条 `role="status"` 提示(browser.* 三键),Chromium 桌面恒不渲染 —— Lighthouse CLS 无影响

## 7. 响应式契约

| 断点 | 布局 |
| --- | --- |
| `md`(768) | 工具栏:顶部胶囊 ⇄ 底部固定条(面板从下往上弹);导航标题副文字显隐 |
| `650px` | 触屏手势启停阈值(继承原版) |
| 虚拟键盘控制簇 | `md` 以下隐藏(移动端只留主键区 + 方向键) |

字号全端恒定(界面 text-sm、meta text-xs 12px 地板,家族规则)。

## 8. 性能与 SEO 契约(家族 §15 的 KVM 版)

- `pnpm audit` 门禁:Performance ≥ 90(实测 100)/ A11y / BP / SEO = 100,双档位(桌面+`LH_FORM_FACTOR=mobile`)都必须通过;第五类 `agentic-browsing` 98 分来自 ard-schema 的 `text/html` 非标准发现类型 —— 控制台入口**确实是** HTML 页,登记为接受 insight(§AUDIT.md),不追
- 零 webfont、零图片资源(图标 = 内联 lucide SVG;logo = 代码生成 PNG)
- JS 单包 ≈378KB(≈119KB gzip),React 19 + jotai;首屏无阻塞 JS(CSS 唯一渲染阻塞)
- 1Hz 遥测不重渲染舞台树:`useVideoStats` 隔离在 `VideoStatsBridge` 子组件(2026-11);Popover `onClose` 用 `useCallback` 固定,避免每秒重装 document 监听
- Agentic 友好:`robots.txt` / `llms.txt` / `.well-known/ard.json`(家族 agentic browsing 立场的延续)

## 9. 双向同步清单

改这里也要改那边(反之亦然):

- `src/styles/tokens.css` ←→ zjblog `src/styles/tokens.css`(逐字节)
- `src/lib/styles.ts` 家族片段区 ←→ zjblog `src/lib/styles.ts`
- `src/styles/base.css` / `behaviors.css` ←→ 同名文件
- `lib/theme.ts` / index.html 防闪脚本 ←→ zjblog `lib/theme.ts` + THEME_BOOTSTRAP
