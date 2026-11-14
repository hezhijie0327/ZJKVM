# AUDIT.md — ZJKVM audit playbook

ZJKVM 全量审计的可复用手册。审计按轮执行:bootstrap → 门禁 → 测试矩阵 →
浏览器测量 → 修复 → 回归 → 文档;每轮结束把新教训按 §8 回填,同一错误不
审计两次。

目标设定:**按轮审计,直到一轮审计不再产生新发现为止**。手册只登记规程、
矩阵、配方与长期接受的契约;单轮的战果、版本快照与具体修复清单进提交
历史与提交信息,不进本文件。

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
pnpm run audit          # Lighthouse 桌面端:四类分数达 §2 门禁
LH_FORM_FACTOR=mobile pnpm run audit   # 移动端同样达门禁
```

- 门禁线:Performance ≥ 90 / Accessibility 100 / Best Practices 100 /
  SEO 100(双端)。性能分异常先原样重跑一次再定结论——边缘运行间方差
  造成的单次掉分不是产品问题。
- audit 输出的 `!` 行是 insight(改进机会),不是门禁失败;门禁只看类别分。
- 本机需 Chromium/Edge,脚本自动探测(darwin:Edge → Chrome → Chromium),
  `CHROME_PATH` 可指定。
- 已知 insight(接受现状,勿反复追):单页单 chunk,`unused-javascript`
  对整包 SPA 属预期;`render-blocking-insight` 的 CSS 唯一阻塞是登记契约
  (DESIGN.md §8);第五类 `agentic-browsing` 的 98 分来自 ard-schema 的
  `text/html` 条目类型——控制台入口确实是 HTML 页,标准发现类型集没有
  「交互式应用页」位,改成假类型是诚实性问题,**接受 98**,门禁只查四类。
- **`pnpm audit`(无 run)是 registry 安全审计**,在 npmmirror 下直接报错
  (`ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`)——别把它当门禁失败。

## 3. 依赖更新(每轮)

```sh
pnpm outdated
pnpm update             # 只动 in-range;pin 用 pnpm add pkg@<pin>
```

- 升级后:`pnpm lint && pnpm tsc && pnpm build` 全绿 → 双端 `pnpm run audit`
  → 回归受影响面。
- 本项目重依赖的回归点:**lucide-react**(图标形态,内联 SVG)、**vite**
  (产物结构 + CSS 拆分)、**wrangler**(部署契约)、**biome**(升级后可能
  提示配置迁移,`biome migrate --write` 即可,diff 应仅 schema 行)、
  **lighthouse**(分数口径与新类别)。
- 大版本升级单独立项,不搭审计便车。

## 4. 功能测试矩阵

| 面 | 操作 | 预期 |
|---|---|---|
| 冷启动 | 载入 `/`(无硬件) | no-signal 态:serif 标题 + 接线图(WiringDiagram)+ 连接按钮;无控制台报错 |
| 演示模式 | 关于页「试用演示模式」 | 测试卡入画、单条演示 toast、状态芯片点亮;`window.__zjkvmDemo` 就绪 |
| 设备面板 | 工具栏设备钮 | VIDEO · SERIAL · AUDIO 三分区;权限芯片只读;冷启动自动展开;无硬件时按钮态诚实 |
| 虚拟键盘 | 工具栏键盘钮 | 浮窗/抽屉上浮;点键后 `__zjkvmDemo.state` 回显对应 HID 报文;修饰键粘滞;Esc 与关闭钮都可收 |
| 物理键盘转发 | 页面聚焦后敲键 | 按键进 `__zjkvmDemo.state`;输入框聚焦时自动暂停;IME 组合期不转发 |
| 鼠标绝对模式 | 画面上移动/点击 | 坐标经 videoRect 映射(letterbox + 旋转 + 缩放反解);demo 回显绝对坐标报文 |
| 鼠标相对模式 / 触控板 | 切相对后拖动 | ±127 增量报文;触屏单指=光标、双指=滚轮 |
| 滚轮 | 画面上滚 | 方向可翻转、间隔可调(鼠标面板);demo 回显 wheel 报文 |
| 快捷键 / 宏 | 键盘面板 chips | 组合键即时发送;序列宏按 interval 逐键;BIOS 类按键可达 |
| 剪贴板粘贴 | 粘贴预览 | 逐键输入可调速、预览面板、未输入时取消钮也可用、中途可取消 |
| 截图 / 录制 | 工具栏 | PNG 下载+复制;WebM 录制 REC 计时;写盘失败即停止会话;保存流丢失也停 |
| 画中画 | PiP 钮 | 监视小窗浮出(支持时);不支持时按钮不出现 |
| LED / 固件回读 | 连接后 | NUM/CAPS/SCRL 三灯随真实状态;固件版本芯片;3s 轮询、瞬时失败静默 |
| 主题 | 循环按钮 auto→light→dark | 整页交叉淡化;刷新后持久;按钮标签与图标随态更新 |
| 语言 | zh↔en | 全部 UI 文案翻转、`html.lang` 同步、持久化 |
| 设置持久化 | 改任意设置后刷新 | `zjkvm-*` 键逐项还原(分辨率/旋转/缩放/鼠标模式/工具栏位/键盘位) |
| 工具栏拖拽 | 拖动工具栏 | 双端自由拖 + 记忆位置;clamp 用实际 pill 宽度 |
| 状态信息菜单 | 导航活动钮 | 统计(分辨率/帧率)、演示(可停)、HID、LED、固件芯片;无信号时统计芯片显「无 HDMI」文案 |
| 弹层焦点 | 开关各弹层 | §4.0 契约逐项成立 |
| 无信号重试 | 连接无 HDMI 的采集卡 | 3s 宽限后升级为接线指南;断流自动重连两次(400ms/2500ms)后放弃并 toast |
| 移动端 | 375×812 | 无横向溢出;虚拟键盘控制簇隐藏;触屏手势可用;页脚版权行 |

### 4.0 弹层与焦点契约(每项都是断言)

- **Modal**:打开即聚焦面板(`tabIndex=-1`)、Tab 圈定在面板内、关闭归还
  触发钮;Esc/背板点击照旧。断言 `dialog.contains(activeElement)`。
- **Popover**:关闭归还触发钮(外部 pointerdown 关闭除外——焦点留在用户
  点击处,披露件模式);断言关闭后 `activeElement` 是触发钮。
- **披露钮一律 `aria-expanded`**(IconButton `expanded` prop),不再报
  aria-pressed;录制按钮例外——它是状态钮,用 aria-pressed。
- **Dropdown**:ArrowDown/Up 打开并移动选项、Home/End 跳端、打开聚焦选中项
  (APG listbox);触发钮自带 aria-expanded/haspopup。
- **虚拟键盘**:Esc 可关(事件继续传播,Esc 同样注入目标机——KVM 语义);
  窗口 blur 释放全部按住的键(与物理转发的 blur 守卫同族)。
- **演示卡自动播放被拒**(无用户激活语境 `play()` NotAllowedError)时,
  Stage 挂一次性 pointerdown/keydown 重试——断言「可信点击后
  `video.paused === false`」。

### 4.1 真机行(有 NanoKVM-USB 时)

- 串口连接必须发生在用户手势内(`requestPort`);保存的 device id 只预填
  设备面板,**绝不 autoplay**。
- CH9329 重枚举自动 rebind:连接后 macOS 拆 /dev 节点 → `disconnect` 事件 →
  匹配的 `connect` 事件静默重开(不弹第二次选择器);连续 5 次闪断熔断,
  放弃并 toast——rebind 自己也会触发重枚举,没有熔断就是无限循环。
- 连接/rebind 成功的第一个动作是 keyboard+mouse reset 报文(§6 竞态四查),
  断线瞬间的悬空按键必须在重连时清零。
- LED 轮询:真实锁定键状态、`CHIP_VERSION`、`IS_CONNECTED` 回读。

### 4.2 noVNC 交互对标

对标 noVNC(VNC 客户端事实标准)逐项核对 KVM 交互逻辑;每项标注核心程度,
核对不达标即按项修复:

- **blur 全键释放**(核心):窗口 blur / 页面隐藏时释放全部按住的键,否则
  切窗回来 Ctrl/Alt 卡死远端。核对三个入口:物理转发 `handleBlur`、虚拟
  键盘 blur effect、串口重连即 reset。
- **输入节流**(核心):高频输入必有速率控制——mousemove 节流(pacedWrite
  8ms 串行链)、滚轮方向/间隔可调、远端几何变化重算有界。绝对坐标走
  `videoRect.ts` 反解,客户端坐标不直接映射到 video 元素。
- **焦点模型**(核心):触发即持有焦点、面板/弹层关闭归还触发钮、发送按键
  的路径不抢画布焦点(§4.0 契约即此原则的 DOM 形态)。
- **快捷键策略**:全转发不拦截(noVNC 语义);ZJKVM 的输入面自动暂停是
  更安全的变化,保留。
- **剪贴板确认面板**:粘贴预览 + 未开始也可取消,比 noVNC 依赖浏览器权限
  的路径更保守,保留。
- **触摸手势**:手势状态机消歧(单指 tap/drag、双指滚轮、长按右键);
  650px 阈值必须 `matchMedia` change 响应式装卸,一次性 matchMedia 读值
  会在视口重塑后 stranded。
- **连接状态机**(核心):connecting/connected/disconnected 单向、断线区分
  「从未连上」与「连接中断」;videoState/serialState 同构。
- **keyboard.lock**:全屏锁 OS 键,门控走 `supportsKeyboardLock()`;全屏
  请求失败不锁键;移动分支的目标元素必须真实挂载(曾因 ref 缺位整键失效
  的教训已入 §6 竞态/挂载审查)。
- **登记偏差(有意不采纳)**:侧边吸附工具栏(悬浮胶囊是家族语法)、空闲
  自动淡出(工具栏常驻是 KVM 语义)、Wake Lock(无需求)、beforeunload
  会话警告(无易失远端会话)。

## 5. 浏览器测量配方

三类「假 bug」陷阱(先排除陷阱再定产品结论):

1. **渲染管线冻结**:整页 rAF 永不触发 → IO/动画全停。探测:
   `new Promise(r => requestAnimationFrame(r))` 与 1.5s 超时 race。冻结时
   **React 事件与渲染仍然存活**(点击后面板已入 DOM,只是入场动画卡在
   opacity:0 起始帧)——DOM 级功能断言可做,视觉断言与一切 IO/动画依赖的
   测量作废,换 CDP headless(下文)或新浏览器。demo 画面是 rAF 驱动的,
   冻结时其视觉测量全部作废。另:标签页隐藏时 demo canvas 停帧是**设计
   行为**(rAF 暂停),勿当 bug。
2. **locator 点击超时**:改坐标点击(先 `scrollIntoView({behavior:"instant"})`,
   全站 scroll-behavior smooth)或 evaluate 内直接派发。合成 KeyboardEvent
   不触发 React 表单提交——提交类断言一律坐标点击按钮。
3. **全页截图 svh/dvh 重排**:`fullPage:true` 会把视口单位元素撑出伪影——
   固定视口 + 步进滚动截图代替。

headless 要点:

- 用裸 CDP WebSocket 直驱 headless Edge/Chromium(spawn + 轮询
  `/json/version`,别依赖 launcher 回显);每个测量面一个新浏览器实例,
  profile 目录唯一(复用 profile 会撞 SingletonLock 直接拒启)。
- `--headless=new` 默认跟随系统深色;验亮色显式设置 class 与
  `data-theme-mode`。
- **无用户激活语境 `play()` 必被拒**:流活着但视频停在 0 帧,舞台看似无
  信号——Stage 的一次性可信交互重试就是为此;探针用 CDP
  `Input.dispatchMouseEvent` 可信点击踢一次再断言画面。
- Web Serial / keyboard.lock / showSaveFilePicker 无头不可用,断言这些按钮
  的 **gating 态**(可见性/禁用/提示文案)而非真实连接。
- 视口敏感测量用 CDP `Emulation.setDeviceMetricsOverride`。

### 5.1 程序化探针(每轮)

```js
// 1. 横向溢出扫(375/320 视口):scrollWidth > innerWidth 的元素应为 0
//    (登记例外:320px 下工具栏 dock 为 overflow-x-auto 滚动行,裁切属设计)
// 2. a11y 快扫:button[aria-label] 覆盖率 100%(icon-only 按钮);
//    role="switch" 的开关 aria-checked 同步;披露钮 aria-expanded
// 3. demo 指令回显:虚拟键盘/鼠标操作后 __zjkvmDemo.state 断言
// 4. 控制台零错误:整轮交互后 error/warn 清单(已知登记项除外)
```

- **断言回显数组按十进制找**:`__zjkvmDemo.state.keysEcho` 是十进制 JSON
  数组(`[0,0,4,…]` = A 键 0x04),按 `"0x04"` 字符串匹配恒假。
- **mermaid 类懒渲染内容**:构建期不编译,「build 绿」不代表图合法——
  语法变更后在 dev 页步进滚动触发编译,断言 placeholder 内有 svg 且无
  错误面板(本条同样适用于未来任何 IO 触发的内容)。
- **死键扫描脚本**(i18n 维度):全仓 grep 每个词库键的引用;排除目录时
  匹配路径片段要防误吞自身(`includes("/i18n")` 会连词库文件一起排除,
  死键恒 0 的假阴性就是这么来的)。基线 = en/zh 键数相等且逐键有消费方。

### 5.2 截图走查

固定视口 + 步进滚动:320 / 375 / 768 / 1440 四档 × 明暗两主题;交互态
(虚拟键盘开、设备面板开、信息菜单开、关于模态、演示横幅)。禁止 fullPage。

## 6. 代码审计维度(扫查清单)

并行派 Explore 只读代理 + 自查,覆盖:

0. **协议层红线**:`lib/device/proto.ts` / `keymap.ts` / `charcodes.ts`
   **字节级不动**(AGENTS.md);审查只确认「没人动过」(git log + 与
   NanoKVM-USB 上游对照),发现"顺手清理"要回滚。
1. **传输抽象**:UI 代码只经 `getActiveLink()`/`requireLink()`,grep 全仓
   确认无直接 serial 触碰;DemoDevice/SerialDevice 双实现同步新增接口方法。
2. **性能**:高频路径(useVideoStats、指针移动、轮询)的更新隔离在专用
   订阅组件,1Hz 遥测不重渲染舞台树;弹层 onClose 用 useCallback 固定
   (父级 1Hz 重渲染会让不稳定闭包每秒重装 document 监听);事件监听/
   observer/timer 全部有清理,拖拽类 window 监听挂卸载 cleanup;
   `useRef(new X())` 改惰性初始化;rAF 循环在隐藏时停(demo 冻结契约);
   chunk 体积与 DESIGN.md §8 登记值同量级。
3. **动画完整性**:条件渲染面有进出动画 + 卸载兜底;披露件有 aria-expanded;
   REC 呼吸等循环动画尊重 reduced-motion。
4. **i18n**:EN/zh 键集相等且逐键有消费方(脚本扫描,§5.1);硬编码用户
   可见串仅限白名单(品牌名、协议名、ESC 键帽、接线图型号字样、导航
   eyebrow 型分组标 STATUS/PASTE/VIDEO——设计语言登记项);新增文案先入
   词库再接线。
5. **设计 token**:无裸 hex/`text-gray-*`(tokens.css 三件与 zjblog 逐字节
   同步例外);`dark:` 零使用;新样式先入 `lib/styles.ts` 片段表。
6. **手势/输入安全**:物理键盘转发的四个守卫(IME / AltGr / Meta 释放 /
   输入面自动暂停)逐一还在;虚拟键 pointerdown/up 成对(层切换键即按下
   即释放);blur 全键释放双路径都在;绝对坐标必经 `videoRect.ts` 反解;
   触摸阈值 matchMedia 响应式。
7. **能力门控**:Chromium-only API(serial/keyboard.lock/showSaveFilePicker/
  PiP)全走 `lib/browser.ts` 检查;不支持的浏览器有诚实降级(能力横幅 +
  隐藏式按钮),从不在点击时才失败。
8. **用户手势红线**:serial 与 getUserMedia 必须在 click 内;saved device id
  只预填不自动连;`play()` 被拒有可信交互重试兜底。
9. **状态机完整性**:videoState/serialState/demoMode 三态正交性——任意排列
  不产生矛盾 UI;demo 独占舞台、connectVideo 入口互斥、camera.open 代际
  守卫;stopDemoMode 的抑制窗口(videoRetrySuppressed)不被绕过。
10. **文档一致性**:styles.ts 片段表 = DESIGN.md §3;布局树 = DESIGN.md §2;
    README 矩阵 = 实测;「文档与实现不一致按 bug 处理」。
11. **死代码三扫**:① 导出符号逐个 grep 消费者,零消费即删(styles.ts
    家族段例外——与 zjblog 双向同步保留,只清 ZJKVM 段);② 词库死键脚本
    扫描;③ 只写不读的 atom 链路(定义 + 写入 + 无消费者 = 整链删)。
12. **竞态四查**:连接入口互斥;open 类并发有代际/序号守卫(败者轨道
    stop);失联残留清零(串口重连即发 keyboard/mouse reset);副作用不进
    setState updater(StrictMode 双调)。

## 7. 环境陷阱清单

- `pnpm audit`(无 run)是 registry 安全审计,不是本项目门禁;本机
  npmmirror 下必报错(§2)。
- audit 需本机 Chromium/Edge;审计轮先 `pnpm build`。
- **demo 冻结 ≠ bug**:隐藏标签页 demo canvas 停帧(rAF 暂停),回前台恢复。
- 无头态 getUserMedia 无设备 → 直接走 demo;真实摄像头断言只在有头环境跑。
- 无头态无用户激活 → `play()` 被拒,画面停 0 帧;可信点击踢一次再断言(§5)。
- 移动端语义:`LH_FORM_FACTOR=mobile` 的 Lighthouse 仿真可过,但 Web Serial
  在真实移动端不存在——移动走查只验 UI 形态,不验串口功能。
- 门禁命令勿接 `| tail` 吃掉退出码——`set -o pipefail` 或直接看输出。
- CSS 解析器对 Tailwind 指令敏感:biome excludes `src/styles/**` 是登记
  契约,勿"修复"。

## 8. 收尾闭环

1. 修复 → `pnpm lint && pnpm tsc && pnpm build` → 影响面回归(矩阵 §4 /
   探针 §5.1)→ Lighthouse 双端(审计轮)。
2. 每轮把新教训落文档:AGENTS.md(约定 + 一句话教训)、DESIGN.md(片段/
   偏差先登记后落码)、本文件——**只落规程与长期契约**:新陷阱进 §7、
   新矩阵行进 §4、新断言进 §4.0/§5.1;单轮的战果、版本号快照、具体修复
   清单写进提交信息,不进本文件。
3. 提交风格:约定式(`fix(scope): …` / `feat(toolbar): …` / `docs: …`),
   文档与代码分开;不提交构建产物(dist/、.lighthouse-archive/ 已 ignore)。
