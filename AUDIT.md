# AUDIT.md — ZJKVM audit playbook

ZJKVM 全量审计的可复用手册,参考 zjblog `AUDIT.md` 的骨架,沉淀自 2026-11
首轮全量审计(依赖升级 / 代码结构 / noVNC 交互对标 / 浏览器实测 /
响应式走查 / Lighthouse 双端门禁 / 文档同步)。下一轮审计照此执行:
bootstrap → 门禁 → 测试矩阵 → 浏览器测量 → 修复 → 回归 → 文档。

**2026-11 首轮结果**:6×P1 + ~30×P2 全部修复,门禁四类双端 100×8,浏览器
功能探针 13/13 PASS,截图走查(320/375/768/1440 × 明暗 × 交互态)合格。
本轮教训已回填各节;下一轮从 §2 门禁起步即可。

目标设定:**按轮审计,直到一轮审计不再产生新发现为止**。每个修复都要重跑
其影响面的回归 + lint/tsc 门禁;每轮结束把新教训落进 AGENTS.md / DESIGN.md,
同一错误不审计两次。

## 1. 环境准备

```sh
pnpm install            # 唯一 lockfile(pnpm);无 CI,全部门禁本地跑
pnpm dev                # dev 服务器 :3010 —— 无硬件时点「演示模式」即得完整可测面
pnpm build              # tsc --noEmit + vite build(两者都必须过)
```

- **硬件不是审计前提**:Demo 模式(虚拟采集卡 + 虚拟 HID)覆盖除真实串口
  枚举外的全部交互面;真实硬件只验连接时序(§4 真机行)。
- 审计用的探针断言跑在 **demo 模式**上:`window.__zjkvmDemo.state` 是指令
  回显测试钩子(键盘/鼠标报文状态,`demo-video.ts attachDebugHook`)。
- 构建产物验证一律 `pnpm build` 后看 `dist/`;Lighthouse 门禁自带静态服务
  镜像生产构建,不依赖 dev 实例。

## 2. 质量门禁(每轮,浏览器工作之前)

```sh
pnpm lint               # biome check 零错误零警告(含格式)
pnpm tsc                # strict 零错误
pnpm build              # 产物生成成功
pnpm audit              # Lighthouse 桌面端:四类分数达 §2 门禁
LH_FORM_FACTOR=mobile pnpm audit   # 移动端同样达门禁
```

- 门禁线:Performance ≥ 90 / Accessibility 100 / Best Practices 100 /
  SEO 100(双端)。**本轮目标四类全 100**,若移动端性能因环境方差掉分,
  原样重跑一次再定结论(zjblog 教训:边缘页有运行间方差)。
- audit 输出的 `!` 行是 insight(改进机会),不是门禁失败;门禁只看类别分。
- 本机需 Chromium/Edge,脚本自动探测(darwin:Edge → Chrome → Chromium),
  `CHROME_PATH` 可指定。
- 已知 insight(接受现状,勿反复追):本站单页单 chunk,`unused-javascript`
  类 insight 对整包 SPA 属预期;`render-blocking-insight` 的 CSS 唯一阻塞是
  登记契约(DESIGN.md §8);Lighthouse 13 新增第五类 `agentic-browsing` 98 分
  来自 ard-schema 的 `text/html` 非标准发现类型 —— 控制台入口确实是 HTML 页,
  改成假类型是诚实性问题,**接受 98**(2026-11 登记;标准类型集只覆盖
  agent-card/skills/registry 族,没有「交互式应用页」位)。
- **`pnpm audit`(无 run)在 npmmirror registry 下直接报错**
  (`ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`)—— 别把它当门禁失败。

## 3. 依赖更新(每轮)

```sh
pnpm outdated
pnpm update             # 只动 in-range;pin 用 pnpm add pkg@<pin>
```

- 升级后:`pnpm lint && pnpm tsc && pnpm build` 全绿 → 双端 `pnpm audit` →
  回归受影响面。
- 本项目重依赖的回归点:**lucide-react**(图标形态,内联 SVG)、**vite**
  (产物结构 + CSS 拆分)、**wrangler**(部署契约)、**biome**(配置迁移
  提示 —— 2.6.7 曾提示 migrate,跑 `biome migrate --write` 即可)、
  **lighthouse**(分数口径)。
- 2026-11 审计快照(in-range 全动):jotai 3.0.1→3.0.2、lucide-react
  1.67→1.72、biome 2.6.4→2.6.7、tailwindcss 4.3.4→4.3.5、vite 8.3.5→8.3.8、
  @vitejs/plugin-react 6.2.1→6.3.0、chrome-launcher 1.2.2→1.2.3、
  wrangler 4.156.2→4.161.0;零 major 跳变。biome 2.6.7 会提示
  `biome migrate --write`(diff 仅 schema 行)。
- 大版本升级单独立项,不搭审计便车。

## 4. 功能测试矩阵

| 面 | 操作 | 预期 |
|---|---|---|
| 冷启动 | 载入 `/`(无硬件) | no-signal 态:serif 标题 + 接线图(WiringDiagram)+ 连接按钮;无控制台报错 |
| 演示模式 | 点「演示模式」 | 测试卡入画、演示横幅、状态芯片点亮;`window.__zjkvmDemo` 就绪 |
| 设备面板 | 工具栏设备钮 | VIDEO · SERIAL · AUDIO 三分区;权限芯片只读;冷启动自动展开;无硬件时按钮态诚实(disabled + 提示) |
| 虚拟键盘 | 工具栏键盘钮 | 底部抽屉上浮;点键后 `__zjkvmDemo.state` 回显对应 HID 报文;修饰键有粘滞态;Esc/关闭钮收起 |
| 物理键盘转发 | 页面聚焦后敲键 | 按键进 `__zjkvmDemo.state`;输入框聚焦时自动暂停(textarea/select/contenteditable);IME 组合期不转发 |
| 鼠标绝对模式 | 画面上移动/点击 | 坐标经 videoRect 映射(letterbox + 旋转 + 缩放反解);demo 回显绝对坐标报文 |
| 鼠标相对模式 / 触控板 | 切相对后拖动 | ±127 增量报文;触屏单指=光标、双指=滚轮(650px 阈值) |
| 滚轮 | 画面上滚 | 方向可翻转、间隔可调(鼠标面板);demo 回显 wheel 报文 |
| 快捷键 / 宏 | 键盘面板 chips | 组合键即时发送;序列宏按 interval 逐键;BIOS 类按键(如 Ctrl+Alt+Del)可达 |
| 剪贴板粘贴 | 粘贴预览 | 逐键输入可调速、预览面板、中途可取消 |
| 截图 / 录制 | 工具栏 | PNG 下载+复制;WebM 录制 REC 徽章呼吸 + 计时;保存走 showSaveFilePicker(Chromium) |
| 画中画 | PiP 钮 | 监视小窗浮出(支持时);不支持时按钮隐藏/禁用 |
| LED / 固件回读 | 连接后 | NUM/CAPS/SCRL 三灯随真实状态;固件版本芯片;3s 轮询、失败静默但 console.warn 一次 |
| 主题 | 循环按钮 auto→light→dark | 整页交叉淡化;刷新后持久;首帧无闪烁(bootstrap 脚本) |
| 语言 | zh↔en | 全部 UI 文案翻转、`html.lang` 同步、持久化 |
| 设置持久化 | 改任意设置后刷新 | `zjkvm-*` 键逐项还原(分辨率/旋转/缩放/鼠标模式/工具栏位/键盘位) |
| 工具栏拖拽 | 拖动工具栏 | 桌面自由拖 + 记忆位置;移动端同样可拖/收起(471924e) |
| 状态胶囊 | 展开状态栏 | 演示横幅 + 反馈芯片;md+ 停靠画面底边内侧;收起后只剩圆钮 |
| 关于模态 | 关于钮 | 家族模态:背板点击/Esc 关、焦点归还 |
| 鼠标滚轮 / 徽章 | 画面内 | REC 徽章骑 pictureRect(letterbox 感知),不压工具栏 |
| 无信号重试 | 连接无 HDMI 的采集卡 | 3s 宽限后升级为接线指南;断流自动重连两次(400ms/2500ms)后放弃并 toast |
| 移动端 | 375×812 | 无横向溢出;虚拟键盘控制簇隐藏;触屏手势可用;页脚版权行 |

### 4.0 弹层与焦点契约(2026-11 新增回归点,一轮审计的教训)

- **Modal**:打开即聚焦面板(`tabIndex=-1`)、Tab 圈定在面板内、关闭归还
  触发钮;Esc/背板点击照旧。断言 `dialog.contains(activeElement)`。
- **Popover**:关闭归还触发钮(外部 pointerdown 关闭除外 —— 焦点留在用户
  点击处,披露件模式);断言关闭后 `activeElement` 是触发钮。
- **面板/弹层触发钮一律 `aria-expanded`**(IconButton `expanded` prop)——
  一轮审计发现全站披露钮都只有 `aria-pressed`,已全量补齐。
- **Dropdown**:ArrowDown/Up 打开并移动选项、Home/End 跳端、打开聚焦选中项
  (APG listbox);触发钮自带 aria-expanded/haspopup。
- **虚拟键盘**:Esc 可关(事件继续传播,Esc 同样注入目标机 —— KVM 语义);
  窗口 blur 释放全部按住的键(noVNC 对标项,与物理转发的 blur 守卫同族)。
- **演示卡自动播放被拒**(headless/自动化语境 `play()` NotAllowedError)时,
  Stage 挂一次性 pointerdown/keydown 重试 —— 断言「可信点击后
  `video.paused === false`」。

### 4.1 真机行(有 NanoKVM-USB 时)

- 串口连接必须发生在用户手势内(`requestPort`);保存的 device id 只预填
  设备面板,**绝不 autoplay**。
- CH9329 重枚举自动 rebind:连接后 macOS 拆 /dev 节点 → `disconnect` 事件 →
  匹配的 `connect` 事件静默重开(不弹第二次选择器);连续 5 次闪断后放弃并
  toast。
- LED 轮询:真实锁定键状态、`CHIP_VERSION`、`IS_CONNECTED` 回读。

### 4.2 noVNC 交互对标(2026-11 新增;首轮结论已回填)

对标 noVNC(VNC 客户端事实标准)逐项核对 KVM 交互逻辑。首轮审计的采纳结果:

- **blur 全键释放**(noVNC `KeyTable` 于 window blur 全释放,防切窗卡键):
  物理转发已有 `handleBlur`;虚拟键盘与串口重连即重置已补(2026-11)。
  **核心,已对齐。**
- **输入节流**:noVNC mousemove 17ms / 滚轮 50px 累积成步 / resize 100ms
  —— ZJKVM absolute 走 pacedWrite 8ms 串行化、滚轮走 wheelInterval 设置,
  语义等价。**已对齐,勿重复改。**
- **焦点模型**:noVNC 点击画布即聚焦 canvas、发送按键后焦点归还 —— KVM 的
  面板/弹层焦点契约(§4.0)是同一原则的 DOM 形态。**已对齐。**
- **快捷键策略**:noVNC 全转发不拦截;ZJKVM 自动暂停输入面是更安全的变化,
  保留。
- **剪贴板确认面板**:noVNC 无(靠浏览器权限);ZJKVM 的粘贴预览更保守,
  保留。`paste.cancel` 现在未输入时也可用(2026-11)。
- **触摸手势**:noVNC 单指 tap/双指滚轮/longpress 右键 + 手势状态机消歧;
  ZJKVM `touchpad.ts` 同族语义(650px 阈值已改为 matchMedia change 响应式)。
- **状态机**:noVNC connecting/connected/disconnecting/disconnected 严格单向
  + 断线区分文案;ZJKVM videoState/serialState 同构。**已对齐。**
- **keyboard.lock 全屏锁键**:已在用(gated by supportsKeyboardLock;一轮
  修复了移动分支 toolbarRef 缺失导致的全屏失效)。
- **未采纳(登记理由)**:侧边吸附工具栏(悬浮胶囊是家族语法);空闲自动
  淡出(工具栏常驻是 KVM 语义,与 noVNC 观看场景不同);Wake Lock(暂无
  需求);beforeunload 会话警告(KVM 无易失远端会话,断开无害)。

## 5. 浏览器测量配方

继承 zjblog `AUDIT.md` §6 的三个「假 bug」陷阱(先排除陷阱再定产品结论):

1. **渲染管线冻结**:整页 rAF 永不触发 → IO/动画全停。探测:
   `new Promise(r => requestAnimationFrame(r))` 与 1.5s 超时 race。**demo
   画面是 rAF 驱动的 —— 冻结时 demo 视觉测量全部作废**,换新浏览器重试。
   2026-11 实锤(ZCode IAB):冻结时 **React 事件与渲染仍然存活**(点击后面板
   已入 DOM,只是 `animate-fade-up` 卡在 opacity:0 起始帧)—— IAB 可做 DOM
   级功能断言,视觉断言一律走 CDP headless(§5 配方)。
   注意:标签页隐藏时 demo canvas 冻结是**设计行为**(rAF 暂停,AGENTS.md
   已登记),勿当 bug。
1b. **headless 里 demo 画面空白 ≠ bug**:`play()` 无用户激活会被拒
   (NotAllowedError),视频停在 0 帧,舞台看似无信号。现 Stage 已有
   「首次可信交互重试播放」兜底 —— 探针用 CDP `Input.dispatchMouseEvent`
   可信点击踢一次再断言画面。
2. **locator 点击超时**:改坐标点击(先 `scrollIntoView({behavior:"instant"})`,
   全站 scroll-behavior smooth)或 evaluate 内直接派发。合成 KeyboardEvent
   不触发 React 表单提交 —— 提交类断言一律坐标点击按钮。
3. **全页截图 svh 重排**:`fullPage:true` 会把 `min-h-dvh` 撑出伪影 ——
   固定视口 + 步进滚动截图代替。

headless 要点:

- `--headless=new` 默认跟随系统深色;验亮色显式 `classList.remove("dark")`。
- getUserMedia 在无头态会因无摄像头设备失败 —— **demo 模式不依赖真实设备**,
  探针统一从 demo 进入。
- Web Serial / keyboard.lock / showSaveFilePicker 无头不可用,断言这些按钮
  的 **gating 态**(可见性/禁用/提示文案)而非真实连接。
- 视口敏感测量用 CDP `Emulation.setDeviceMetricsOverride`(macOS 无 zjblog
  记录的 Windows 492px 钳制问题,但统一走 CDP 更稳)。

### 5.1 程序化探针(每轮)

```js
// 1. 横向溢出扫(375/320 视口):scrollWidth > innerWidth 的元素应为 0
//    (登记例外:320px 下工具栏 dock 为 overflow-x-auto 滚动行,裁切属设计)
// 2. a11y 快扫:button[aria-label] 覆盖率 100%(icon-only 按钮);
//    role="switch" 的开关 aria-checked 同步;披露钮 aria-expanded
// 3. demo 指令回显:虚拟键盘/鼠标操作后 __zjkvmDemo.state 断言
// 4. 控制台零错误:整轮交互后 error/warn 清单(已知登记项除外)
```

- **断言读 JSON 数组别按 hex 找**:`__zjkvmDemo.state.keysEcho` 是十进制
  数组(`[0,0,4,…]` = A 键 0x04),`String.includes("0x04")` 恒假 —— 一轮
  探针两处「FAIL」都是这个断言格式错,不是产品 bug。
- **死键扫描脚本**(i18n 维度):全仓 grep 每个词库键的引用,排除
  `src/lib/i18n/` 目录 —— **目录跳过判断要带尾部语境**(`/i18n/` 匹配不到
  `lib/i18n` 本身,一轮脚本因此把词库文件算进 body,死键恒 0)。

### 5.2 截图走查

固定视口 + 步进滚动:320 / 375 / 768 / 1440 四档 × 明暗两主题;交互态
(虚拟键盘开、设备面板开、关于模态、演示横幅)。禁止 fullPage。

## 6. 代码审计维度(扫查清单)

并行派 Explore 只读代理 + 自查,覆盖:

0. **协议层红线**:`lib/device/proto.ts` / `keymap.ts` / `charcodes.ts`
   **字节级不动**(AGENTS.md);审查只确认「没人动过」(git log + 与
   NanoKVM-USB 上游对照),发现"顺手清理"要回滚。
1. **传输抽象**:UI 代码只经 `getActiveLink()`/`requireLink()`,grep 全仓
   确认无直接 serial 触碰;DemoDevice/SerialDevice 双实现同步新增接口方法。
2. **性能**:高频路径(useVideoStats、指针移动、轮询)无每帧 setState 风暴;
   事件监听/observer/timer 全部有清理;rAF 循环在隐藏时停(demo 冻结契约);
   依赖变更后 chunk 体积与 DESIGN.md §8 登记值同量级。
3. **动画完整性**:条件渲染面有进出动画 + 卸载兜底;披露件有 aria-expanded;
   REC 呼吸等循环动画尊重 reduced-motion。
4. **i18n**:EN/zh 键集 diff 为空(基线 201/201,2026-11);硬编码用户可见串
   仅限白名单(品牌名、协议名、ESC 键帽、接线图型号字样);demo 测试卡文案
   已词库化(1440236/8970c0b),新增标签照此。
5. **设计 token**:无裸 hex/`text-gray-*`(tokens.css 三件与 zjblog 逐字节
   同步例外);`dark:` 零使用;新样式先入 `lib/styles.ts` 片段表。
6. **手势/输入安全**:物理键盘转发的四个守卫(IME / AltGr / Meta 释放 /
   输入面自动暂停)逐一还在;虚拟键 pointerdown/up 成对(丢 pointerup 不卡键);
   绝对坐标必经 `videoRect.ts` 反解。
7. **能力门控**:Chromium-only API(serial/keyboard.lock/showSaveFilePicker/
  PiP)全走 `lib/browser.ts` 检查;不支持的浏览器有诚实降级(Safari/移动端
  可看视频 + 触控)。
8. **用户手势红线**:serial 与 getUserMedia 必须在 click 内;saved device id
  只预填不自动连。
9. **状态机完整性**:videoState/serialState/demoMode 三态正交性 —— 任意排列
   (demo+serial、真实视频无串口、demo 中拔串口)不产生矛盾 UI;stopDemoMode
   的抑制窗口(videoRetrySuppressed)不被绕过;connectVideo 入口互斥 +
   demo 独占舞台(2026-11);camera.open 有 in-flight 代际守卫(丢败者轨道)。
10. **文档一致性**:styles.ts 片段表 = DESIGN.md §3;布局树 = DESIGN.md §2;
    README 矩阵 = 实测;「文档与实现不一致按 bug 处理」(一轮实锤:DESIGN §2
    还在描述已迁移的底部芯片胶囊)。
11. **死代码三扫**(2026-11 起每轮):① 导出函数 grep 消费者(一轮清出
    isMacHost/currentLang/hasAudio/getMode/getPressedKeyCodes/
    buildButtonReport(relative)/removeCustomResolutions);② 词库死键
    脚本化扫描(§5.1,基线 175 对齐);③ CSS 类与 atom 链路
    (pictureRectAtom 曾整链只写不读)。styles.ts **家族段**片段即使无
    消费者也是家族同步保留,只清 ZJKVM 段。
12. **竞态四查**:连接入口互斥(connectVideo double-fire)、open 并发
    (camera 代际)、失联残留状态(串口重连即发 keyboard/mouse reset,防
    目标机悬空按键)、side-effect 不进 setState updater(StrictMode 双调)。

## 7. 环境陷阱清单

- `pnpm audit`(无 run)是 pnpm 安全审计,不是本项目门禁(与 zjblog 相同)。
- audit 需本机 Chromium/Edge;审计轮先 `pnpm build`。
- **demo 冻结 ≠ bug**:隐藏标签页 demo canvas 停帧(rAF 暂停),回前台即恢复。
- 无头态 getUserMedia 无设备 → 直接走 demo;真实摄像头断言只在有头环境跑。
- 移动端语义:`LH_FORM_FACTOR=mobile` 的 Lighthouse 仿真可过,但 Web Serial
  在真实移动端不存在 —— 移动走查只验 UI 形态,不验串口功能。
- 门禁命令勿接 `| tail` 吃掉退出码(zjblog 教训:`set -o pipefail` 或直接看输出)。
- biome 升级后如提示配置迁移,`pnpm exec biome migrate --write` 后重跑 lint
  确认 diff 只有 schema 行。

## 8. 收尾闭环

1. 修复 → `pnpm lint && pnpm tsc && pnpm build` → 影响面回归(矩阵 §4 /
   探针 §5.1)→ Lighthouse 双端(审计轮)。
2. 每轮把新教训落文档:AGENTS.md(约定 + 一句话教训)、DESIGN.md(片段/
   偏差先登记后落码)、本文件(新陷阱/新配方追加到对应节)。
3. 提交风格:约定式(`fix(scope): …` / `feat(toolbar): …` / `docs: …`),
   文档与代码分开;不提交构建产物(dist/、.lighthouse-archive/ 已 ignore)。
