# AUDIT.md — ZJKVM audit playbook

Reusable playbook for full ZJKVM audits. Audits run in rounds: bootstrap → gates →
test matrix → browser measurement → fixes → regression → docs; at the end of each
round, new lessons are backfilled per §8 — never audit the same mistake twice.

Goal: **audit in rounds until a round produces no new findings**. The playbook
registers only procedures, matrices, recipes, and long-term accepted contracts;
per-round results, version snapshots, and concrete fix lists go into commit
history and commit messages, not into this file.

## 1. Environment setup

```sh
pnpm install            # single lockfile (pnpm); no CI, all gates run locally
pnpm dev                # dev server :3010 — with no hardware, "Demo mode" gives the full testable surface
pnpm build              # tsc --noEmit + vite build (both must pass)
```

- **Hardware is not an audit prerequisite**: Demo mode (virtual capture card +
  virtual HID) covers the entire interaction surface except real serial-port
  enumeration; real hardware only verifies connection timing (§4 real-device rows).
- Audit probe assertions run in **demo mode**: `window.__zjkvmDemo.state` is the
  command-echo test hook (keyboard/mouse report state, `demo-video.ts attachDebugHook`).
- Build-artifact verification always means `pnpm build` then inspect `dist/`; the
  Lighthouse gate ships its own static server mirroring the production build and
  does not depend on a dev instance.

## 2. Quality gates (every round, before browser work)

```sh
pnpm lint               # biome check: zero errors, zero warnings (incl. formatting)
pnpm tsc                # strict: zero errors
pnpm build              # artifacts build successfully
pnpm run audit          # Lighthouse desktop: all four category scores meet the §2 gate
LH_FORM_FACTOR=mobile pnpm run audit   # mobile must meet the gate too
```

- Gate thresholds: Performance ≥ 90 / Accessibility 100 / Best Practices 100 /
  SEO 100 (both form factors). On an anomalous performance score, re-run once
  as-is before concluding — a one-off dip from marginal run-to-run variance is
  not a product problem.
- `!` lines in audit output are insights (improvement opportunities), not gate
  failures; the gate only looks at category scores.
- The machine needs Chromium/Edge; the script auto-detects (darwin: Edge →
  Chrome → Chromium); `CHROME_PATH` can override.
- Known insights (accepted, do not chase repeatedly): single page, single chunk —
  `unused-javascript` is expected for a bundled SPA; the CSS-only blocking in
  `render-blocking-insight` is a registered contract (DESIGN.md §8); the fifth
  category `agentic-browsing` scores 98 because of the ard-schema `text/html`
  entry type — the console entry really is an HTML page, the standard
  discovery-type set has no "interactive application page" slot, and switching to
  a fake type would be an honesty problem — **accept 98**; the gate only checks
  the four categories.
- **`pnpm audit` (without `run`) is the registry security audit**; under npmmirror
  it errors outright (`ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS`) — do not treat it as
  a gate failure.

## 3. Dependency updates (every round)

```sh
pnpm outdated
pnpm update             # in-range only; to pin use pnpm add pkg@<pin>
```

- After upgrading: `pnpm lint && pnpm tsc && pnpm build` all green →
  `pnpm run audit` on both form factors → regress the affected surfaces.
- Heavy-dependency regression points for this project: **lucide-react** (icon
  shapes, inline SVG), **vite** (artifact structure + CSS splitting),
  **wrangler** (deployment contract), **biome** (an upgrade may prompt a config
  migration — `biome migrate --write` suffices, the diff should touch only schema
  lines), **lighthouse** (scoring methodology and new categories).
- Major-version upgrades get their own task; they do not hitch a ride on an
  audit round.

## 4. Functional test matrix

| Surface | Action | Expected |
|---|---|---|
| Cold start | Load `/` (no hardware) | No-signal state: serif heading + wiring diagram (WiringDiagram) + connect button; no console errors |
| Demo mode | About page "试用演示模式" (Try demo mode) | Test pattern on screen, a single demo toast, status chips lit; `window.__zjkvmDemo` ready |
| Device panel | Toolbar device button | Three sections VIDEO · SERIAL · AUDIO; permission chips read-only; auto-expanded on cold start; button states honest when no hardware |
| Virtual keyboard | Toolbar keyboard button | Float/drawer rises; after clicking a key, `__zjkvmDemo.state` echoes the corresponding HID report; modifier keys sticky; both Esc and the close button dismiss it |
| Physical keyboard forwarding | Type keys with the page focused | Keystrokes land in `__zjkvmDemo.state`; auto-paused while an input is focused; not forwarded during IME composition |
| Mouse absolute mode | Move/click on the video | Coordinates mapped through videoRect (letterbox + rotation + scale inverse solve); demo echoes absolute-coordinate reports |
| Mouse relative mode / trackpad | Switch to relative, then drag | ±127 delta reports; touch: one finger = cursor, two fingers = wheel |
| Scroll wheel | Scroll over the video | Direction invertible, interval adjustable (mouse panel); demo echoes wheel reports |
| Shortcuts / macros | Keyboard panel chips | Combos sent instantly; sequence macros key-by-key at the interval; BIOS-class keys reachable |
| Clipboard paste | Paste preview | Key-by-key typing at adjustable speed, preview panel, cancel button usable even before typing starts, cancellable mid-way |
| Screenshot / recording | Toolbar | PNG download + copy; WebM recording with REC timer; a disk-write failure stops the session immediately; a lost save stream also stops it |
| Picture-in-picture | PiP button | Monitor mini-window floats out (when supported); the button does not appear when unsupported |
| LED / firmware readback | After connecting | NUM/CAPS/SCRL three lights track real state; firmware-version chip; 3s polling, transient failures silent |
| Theme | Cycle button auto→light→dark | Whole-page cross-fade; persists across reload; button label and icon update with the state |
| Language | zh↔en | All UI copy flips, `html.lang` stays in sync, persisted |
| Settings persistence | Change any setting, then reload | `zjkvm-*` keys restored item by item (resolution/rotation/scale/mouse mode/toolbar position/keyboard position) |
| Toolbar drag | Drag the toolbar | Free drag on both form factors + remembered position; clamp uses the actual pill width |
| Status info menu | Navigation activity button | Stats (resolution/frame rate), demo (stoppable), HID, LED, firmware chips; with no signal the stats chip shows the "No HDMI signal" copy |
| Overlay focus | Open/close each overlay | Every item of the §4.0 contract holds |
| No-signal retry | Connect a capture card with no HDMI | After a 3s grace period it escalates to the wiring guide; on stream loss it auto-reconnects twice (400ms/2500ms), then gives up with a toast |
| Mobile | 375×812 | No horizontal overflow; virtual-keyboard control cluster hidden; touch gestures usable; footer copyright line |

### 4.0 Overlay and focus contract (every item is an assertion)

- **Modal**: on open, focus the panel (`tabIndex=-1`); Tab is trapped within the
  panel; on close, focus returns to the trigger button; Esc / scrim click as
  usual. Assert `dialog.contains(activeElement)`.
- **Popover**: on close, focus returns to the trigger button (except when closed
  by an outside pointerdown — focus stays where the user clicked, disclosure
  pattern); assert that after close `activeElement` is the trigger button.
- **Disclosure buttons always use `aria-expanded`** (IconButton `expanded` prop),
  never aria-pressed; the record button is the exception — it is a state button
  and uses aria-pressed.
- **Dropdown**: ArrowDown/Up opens and moves through options, Home/End jumps to
  the ends, opening focuses the selected item (APG listbox); the trigger button
  carries aria-expanded/haspopup.
- **Virtual keyboard**: Esc closes it (the event keeps propagating — Esc is also
  injected into the target machine, KVM semantics); window blur releases all held
  keys (same family as the physical-forwarding blur guard).
- **When demo-card autoplay is refused** (`play()` NotAllowedError without user
  activation), Stage attaches a one-shot pointerdown/keydown retry — assert that
  "after a trusted click, `video.paused === false`".

### 4.1 Real-device rows (with a NanoKVM-USB)

- Serial connection must happen inside a user gesture (`requestPort`); a saved
  device id only pre-fills the device panel, **never autoplays**.
- CH9329 re-enumeration auto-rebind: after connecting, macOS tears down the /dev
  node → `disconnect` event → the matching `connect` event silently reopens (no
  second picker); 5 consecutive flap-outs trip the circuit breaker — give up with
  a toast. Rebind itself triggers re-enumeration, so without the breaker it would
  loop forever.
- The first action after a successful connect/rebind is the keyboard+mouse reset
  report (§6 race four-check); keys left dangling at the moment of disconnect
  must be zeroed on reconnect.
- LED polling: real lock-key state, `CHIP_VERSION`, `IS_CONNECTED` readback.

### 4.2 noVNC interaction benchmarking

Benchmark KVM interaction logic item by item against noVNC (the de-facto standard
VNC client); each item is tagged with its criticality, and any item that fails
the check is fixed on its own:

- **Blur releases all keys** (core): on window blur / page hide, release every
  held key — otherwise Ctrl/Alt stays stuck on the remote after switching back.
  Check the three entry points: physical forwarding `handleBlur`, the
  virtual-keyboard blur effect, and reset-on-serial-reconnect.
- **Input throttling** (core): high-frequency input must have rate control —
  mousemove throttling (pacedWrite 8ms serial chain), wheel direction/interval
  adjustable, recomputation on remote geometry change bounded. Absolute
  coordinates go through the `videoRect.ts` inverse solve; client coordinates are
  never mapped directly onto the video element.
- **Focus model** (core): the trigger holds focus, panels/overlays return focus to
  the trigger on close, and key-sending paths never steal canvas focus (the §4.0
  contract is this principle in DOM form).
- **Shortcut policy**: forward everything, intercept nothing (noVNC semantics);
  ZJKVM's auto-pause on input surfaces is a safer variation — kept.
- **Clipboard confirmation panel**: paste preview + cancellable even before typing
  starts — more conservative than noVNC's browser-permission-dependent path — kept.
- **Touch gestures**: the gesture state machine disambiguates (one-finger
  tap/drag, two-finger wheel, long-press right-click); the 650px threshold must
  mount/unmount reactively on `matchMedia` change — a one-shot matchMedia read is
  left stranded after a viewport reshape.
- **Connection state machine** (core): connecting/connected/disconnected one-way;
  disconnect distinguishes "never connected" from "connection interrupted";
  videoState/serialState are isomorphic.
- **keyboard.lock**: fullscreen locks OS keys, gated through
  `supportsKeyboardLock()`; a failed fullscreen request does not lock keys; the
  mobile branch's target element must be truly mounted (the lesson from a missing
  ref disabling the whole keyboard is already in the §6 race/mount review).
- **Registered deviations (deliberately not adopted)**: side-docked toolbar (the
  floating pill is family syntax), idle auto-fade (a persistent toolbar is KVM
  semantics), Wake Lock (no need), beforeunload session warning (no volatile
  remote session).

## 5. Browser measurement recipes

Three classes of "fake bug" traps (rule out the trap before drawing product
conclusions):

1. **Render pipeline freeze**: page-wide rAF never fires → all IO/animations stop.
   Probe: race `new Promise(r => requestAnimationFrame(r))` against a 1.5s
   timeout. While frozen, **React events and rendering are still alive** (after a
   click the panel is already in the DOM — only the entrance animation is stuck at
   the opacity:0 first frame) — DOM-level functional assertions are valid, but
   visual assertions and every IO/animation-dependent measurement are void;
   switch to CDP headless (below) or a fresh browser. The demo video is rAF-driven,
   so all of its visual measurements are void while frozen. Also: the demo canvas
   pausing frames while the tab is hidden is **designed behavior** (rAF pause),
   not a bug.
2. **Locator click timeout**: switch to coordinate clicks (first
   `scrollIntoView({behavior:"instant"})` — the site is scroll-behavior smooth) or
   dispatch directly inside evaluate. Synthetic KeyboardEvents do not trigger
   React form submission — submission assertions always coordinate-click the
   button.
3. **Full-page screenshot svh/dvh reflow**: `fullPage:true` stretches
   viewport-unit elements into artifacts — use a fixed viewport + stepped-scroll
   screenshots instead.

Headless essentials:

- Drive headless Edge/Chromium directly over a bare CDP WebSocket (spawn + poll
  `/json/version`; do not rely on launcher output); a fresh browser instance per
  measurement surface, each with a unique profile directory (reusing a profile
  hits SingletonLock and refuses to start).
- `--headless=new` follows the system dark mode by default; to verify light mode,
  set the class and `data-theme-mode` explicitly.
- **Without user activation, `play()` is always refused**: the stream is alive but
  the video sits at frame 0 and the stage looks like no signal — Stage's one-shot
  trusted-interaction retry exists for exactly this; probes use CDP
  `Input.dispatchMouseEvent` to kick it with a trusted click before asserting the
  video.
- Web Serial / keyboard.lock / showSaveFilePicker are unavailable headless; assert
  these buttons' **gating state** (visibility / disabled / hint copy), not real
  connections.
- Viewport-sensitive measurements use CDP `Emulation.setDeviceMetricsOverride`.

### 5.1 Programmatic probes (every round)

```js
// 1. Horizontal-overflow scan (375/320 viewports): elements with scrollWidth > innerWidth should be 0
//    (registered exception: at 320px the toolbar dock is an overflow-x-auto scroll row; clipping is by design)
// 2. a11y quick scan: button[aria-label] coverage 100% (icon-only buttons);
//    role="switch" toggles keep aria-checked in sync; disclosure buttons aria-expanded
// 3. Demo command echo: assert __zjkvmDemo.state after virtual keyboard/mouse operations
// 4. Zero console errors: error/warn list after a full round of interaction (known registered items excepted)
```

- **Match echo arrays in decimal**: `__zjkvmDemo.state.keysEcho` is a decimal JSON
  array (`[0,0,4,…]` = the A key, 0x04); matching the string `"0x04"` is always
  false.
- **mermaid-style lazy-rendered content**: not compiled at build time — "build
  green" does not mean the diagram is valid. After a syntax change, stepped-scroll
  the dev page to trigger compilation and assert the placeholder contains an svg
  with no error panel (this applies equally to any future IO-triggered content).
- **Dead-key scan script** (i18n dimension): grep the whole repo for references to
  every dictionary key; when excluding directories, path-fragment matching must
  not swallow the dictionaries themselves (`includes("/i18n")` excludes the
  dictionary files too — that is exactly how the always-zero dead-key false
  negative arose). Baseline = en/zh key counts equal and every key has a consumer.

### 5.2 Screenshot walkthrough

Fixed viewport + stepped scroll: four sizes 320 / 375 / 768 / 1440 × both
light/dark themes; interaction states (virtual keyboard open, device panel open,
info menu open, About modal, demo banner). fullPage is forbidden.

## 6. Code audit dimensions (scan checklist)

Dispatch parallel read-only Explore agents + self-review, covering:

0. **Protocol-layer red line**: `lib/device/proto.ts` / `keymap.ts` /
   `charcodes.ts` are **byte-frozen** (AGENTS.md); the review only confirms
   "nobody touched them" (git log + diff against NanoKVM-USB upstream); any
   "drive-by cleanup" must be rolled back.
1. **Transport abstraction**: UI code goes only through
   `getActiveLink()`/`requireLink()`; grep the whole repo to confirm no direct
   serial access; DemoDevice/SerialDevice both implement newly added interface
   methods in sync.
2. **Performance**: high-frequency paths (useVideoStats, pointer movement,
   polling) isolate updates in dedicated subscriber components — 1Hz telemetry
   must not re-render the stage tree; overlay onClose is pinned with useCallback
   (a parent re-rendering at 1Hz makes an unstable closure reinstall document
   listeners every second); every event listener / observer / timer has cleanup,
   drag-style window listeners attach unmount cleanup; `useRef(new X())` becomes
   lazy initialization; rAF loops stop while hidden (demo freeze contract); chunk
   size is in the same magnitude as the DESIGN.md §8 registered value.
3. **Animation completeness**: conditionally rendered surfaces have enter/exit
   animations + an unmount fallback; disclosures have aria-expanded; looping
   animations such as the REC breathing respect reduced-motion.
4. **i18n**: EN/zh key sets equal and every key has a consumer (script scan,
   §5.1); hardcoded user-visible strings are limited to the whitelist (brand
   names, protocol names, the ESC keycap, wiring-diagram model text, navigation
   eyebrow-style group labels STATUS/PASTE/VIDEO — registered design-language
   items); new copy enters the dictionary before being wired up.
5. **Design tokens**: no bare hex / `text-gray-*` (exception: the three style
   files byte-synced with zjblog — `tokens.css`, `base.css`, `behaviors.css`);
   zero `dark:` usage; new styles enter the `lib/styles.ts` fragment table first.
6. **Gesture/input safety**: the four physical-keyboard-forwarding guards (IME /
   AltGr / Meta release / input-surface auto-pause) are each still present;
   virtual-key pointerdown/up come in pairs (layer-switch keys press-and-release
   immediately); both blur release-all-keys paths are present; absolute
   coordinates always go through the `videoRect.ts` inverse solve; the touch
   threshold is matchMedia-reactive.
7. **Capability gating**: Chromium-only APIs (serial/keyboard.lock/
   showSaveFilePicker/PiP) all go through `lib/browser.ts` checks; unsupported
   browsers get an honest degradation (capability banner + hidden buttons), never
   a failure only at click time.
8. **User-gesture red line**: serial and getUserMedia must be inside a click; a
   saved device id only pre-fills, never auto-connects; a refused `play()` has the
   trusted-interaction retry fallback.
9. **State-machine completeness**: orthogonality of videoState/serialState/
   demoMode — no combination produces contradictory UI; demo owns the stage
   exclusively, connectVideo entry points are mutually exclusive, camera.open has
   a generation guard; stopDemoMode's suppression window (videoRetrySuppressed)
   is not bypassed.
10. **Doc consistency**: the styles.ts fragment table = DESIGN.md §3; the layout
    tree = DESIGN.md §2; the README matrix = measured reality; "a doc/implementation
    mismatch is treated as a bug".
11. **Dead-code triple scan**: ① grep consumers for every exported symbol, delete
    on zero consumers (the styles.ts family section is the exception — kept for
    two-way sync with zjblog; clean only the ZJKVM section); ② dictionary dead-key
    script scan; ③ write-only atom chains (definition + writes + no consumer =
    delete the whole chain).
12. **Race four-check**: connection entry points mutually exclusive; open-style
    concurrency has generation/sequence guards (loser tracks stop); disconnect
    residue zeroed (serial reconnect immediately sends keyboard/mouse reset); no
    side effects inside setState updaters (StrictMode double-invokes).

## 7. Environment trap list

- `pnpm audit` (without `run`) is the registry security audit, not a gate of this
  project; under this machine's npmmirror it always errors (§2).
- audit needs local Chromium/Edge; an audit round starts with `pnpm build`.
- **Demo freeze ≠ bug**: the demo canvas pauses frames in a hidden tab (rAF pause)
  and resumes in the foreground.
- Headless getUserMedia has no device → go straight to demo; real-camera
  assertions run only in headed environments.
- Headless has no user activation → `play()` is refused and the video sits at
  frame 0; kick it with a trusted click before asserting (§5).
- Mobile semantics: the `LH_FORM_FACTOR=mobile` Lighthouse emulation can pass, but
  Web Serial does not exist on real mobile — the mobile walkthrough verifies UI
  form only, not serial functionality.
- Do not pipe gate commands into `| tail` and swallow the exit code — use
  `set -o pipefail` or read the output directly.
- CSS parsers are sensitive to Tailwind directives: biome excluding `src/styles/**`
  is a registered contract — do not "fix" it.

## 8. Closing the loop

1. Fix → `pnpm lint && pnpm tsc && pnpm build` → regress the affected surfaces
   (matrix §4 / probes §5.1) → Lighthouse on both form factors (audit rounds).
2. Each round, land new lessons in the docs: AGENTS.md (conventions + one-line
   lessons), DESIGN.md (fragments/deviations registered before code), this file —
   **procedures and long-term contracts only**: new traps go to §7, new matrix
   rows to §4, new assertions to §4.0/§5.1; per-round results, version-number
   snapshots, and concrete fix lists go into commit messages, not into this file.
3. Commit style: conventional (`fix(scope): …` / `feat(toolbar): …` / `docs: …`),
   docs and code in separate commits; never commit build artifacts (dist/,
   .lighthouse-archive/ are already ignored).
