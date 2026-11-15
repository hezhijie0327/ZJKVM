# DESIGN.md — ZJKVM design language (ZJ family app-form extension)

ZJKVM is the first **app-form** member of the ZJ design family (see zjblog
`DESIGN.md`): the blog defines the family syntax; this document validates its
extension to a real-time control interface. The six family principles are
unchanged (warm-paper / ink / amber-gold, content first, paper physics, zero
webfont, fast, restraint); this document records only KVM-specific extensions and
deviations, all registered.

## 1. Tokens: inherited from the family verbatim, zero changes

`src/styles/tokens.css` is **byte-identical** to zjblog (copy and use): 19
`@property`-registered color tokens, two levels of warm shadows, three-track
system fonts, 5 keyframes. KVM adds no new color tokens — all state semantics
land on existing tokens:

| Semantics | token |
| --- | --- |
| Connected | `--ok` (status-bar VIDEO/SERIAL/DEMO dots and outlines) |
| Connecting | `--warning` |
| Recording | `--danger` (pulsing dot + REC timer) |
| Lit / emphasis | `--accent-strong` + `--accent-contrast` (LED lights, selected segment, primary button) |
| Stage ground | `--surface-2` + horizontal ruled-line paper texture (32px rhythm, same language as the blog's 31px ruled lines) |

The theme mechanism is ported verbatim: the `.dark` class, whole-page token
cross-fade (0.3s) + 350ms stand-down, the `<head>` anti-flicker script,
theme-color dual-meta convergence. **Difference**: KVM adds a manual three-state
cycle (auto→light→dark, persisted by `lib/theme.ts setThemeStyle`), because users
watching a monitor feed need to force light mode.

## 2. Layout: from "page" to "stage"

The blog's Shell (navigation / body / footer) becomes **navigation / stage /
status bar** here:

```
Navigation   h-14 sticky frosted glass, serif wordmark ZJKVM + gold period (family signature, verbatim)
  └─ Status info menu  Activity icon button → popover: stats (resolution/frame rate) · demo (stoppable)
                  · HID · LED · firmware chips; the REC timer bar lives on the navigation's right as a danger chip
Stage        flex-1 full-bleed, horizontal ruled-line paper texture ground, video object-contain centered
  ├─ Toolbar     top floating glass pill (free drag + collapse, identical on both form factors);
  │             Devices (device panel: capture card / serial / audio managed together, plus video settings) · Keyboard · Mouse
  ├─ No-signal state   serif heading + wiring diagram (WiringDiagram) + paper-strip connect button
  ├─ Waiting chip   pending hint when the stream is attached but has no dimensions
  └─ No-HDMI state  escalates to the wiring guide after a 3s grace period
Statusbar    bottom footer: centered copyright line (family verbatim, text-xs text-ink-3; shown at md+,
             on mobile carried by the in-App md:hidden footer bar)
```

**Feedback and actions separated (registered)**: device **readback** feedback is
gathered into the navigation's status info menu; connection actions are gathered
into the toolbar's **device panel** (capture-card connection and display settings
/ HID serial / microphone permission and volume); the device panel auto-expands
on cold start / no signal (the connection gate has been retired). The earlier
"bottom chip pill" and "in-video REC badge" have moved to the navigation and the
navigation REC bar respectively (851cd67 / 9581589), and the `pictureRectAtom`
publication chain retired with them (removed in the 2026-11 audit).

### Space and hierarchy guidelines (the app-form version of family §6)

- **Spacing scale**: Tailwind's default 4px base; no homemade scale. The only
  exception is **derived alignment**: the virtual keyboard's numpad
  `mt-[2.625rem]` = key height 36px (`.kvm-key` 2.25rem) + 6px gutter, shifted
  down one row to align with the main block — the value follows the keyboard
  geometry, it is not a fourth scale; recompute it whenever the keyboard row
  spacing changes.
- **Content column**: family §6's `container mx-auto` yields to the **full-bleed
  stage** in app form (registered deviation): navigation/stage/footer are
  full-width; floating layers and the video OSD use 12px-class edge insets
  (`left-3` class), and the video content area insets 10px.
- **Corner-radius vocabulary**: buttons/pills `rounded-full`, cards/drawers
  `rounded-2xl`, small pieces `rounded-lg/xl` — three tiers, no arbitrary-value
  radii.
- **Surface hierarchy**: `--bg` (page) → `--surface` (cards/chips) →
  `--surface-2` (hover/stage ground), three levels, no more; stage ground =
  `--surface-2` + horizontal ruled-line paper texture (32px rhythm) is a
  registered surface repurposing.
- **Two elevation tiers**: `shadow-card` (static) → `shadow-pop`
  (floating/popover); bare box-shadows are forbidden.
- **z-index ladder (registered; new overlay layers take a seat before getting
  styles)**:

  | Value | Layer | Contents |
  | --- | --- | --- |
  | 20 | Stage info | No-signal state / HDMI warning (in-video hints) |
  | 30 | Video OSD + keyboard drawer | REC badge; the virtual keyboard sits **deliberately** below the toolbar tree (toolbar and popovers stay usable) |
  | 40 | Floating pills | Toolbar tree / chip pill and demo banner / video panel |
  | 50 | Shell | Navigation bar |
  | 90 | Popovers | Toolbar popovers |
  | 100 | Modal scrim | `MODAL_SCRIM` (About / paste preview) |
  | 110 | toast | Global notifications |
- **Touch targets**: the baseline follows the family rules (buttons `h-10`, icon
  buttons `size-9`, navigation `h-14`); inside the chip pill it is dense OSD
  syntax — `STATUS_CHIP` (h-6) and the collapse/expand round buttons (size-6/7)
  run at the family §9 registered 24px floor, with hit margin carried by the
  pill's `py-1.5`, scroll rows, and adjacent spacing — a refinement of the above,
  not a relaxation.

## 3. Fragment library: `src/lib/styles.ts`

Family fragments (ICON_BTN / CARD / BTN_PRIMARY / PAPER_STRIP / CHIP / META /
EYEBROW / TAPE…) are synced verbatim with zjblog. **New ZJKVM fragments (family
rule ②: register before use)**:

| Fragment | Purpose |
| --- | --- |
| `PANEL_ROW` / `PANEL_COL` | Panel row: label left, control right (wide controls use the column variant); the compact sibling of LIST_ROW |
| `SEGMENT` / `SEGMENT_ITEM_ON/OFF` | Segmented control: surface-2 track + accent-strong selected pill (family tab language) |
| `PANEL_STATE_CHIP` | In-panel status chip: same scale as the h-8 row buttons |
| `TOOLBAR` / `TOOLBAR_DIVIDER` | Floating glass-pill toolbar (bg-bg/80 + backdrop-blur-md, same material as the navigation) |
| `STATUS_CHIP` | Status-info-menu chip: h-6 mono rounded outline |
| `MODAL_SCRIM` | Family modal scrim (ink/30 + blur; the panel is self-assembled by Modal from CARD, fade in/out + 240ms unmount fallback) |

> 2026-11 audit cleanup: four consumer-less fragments deleted — KEY (keycaps use
> the `.kvm-key` composition directly), MODAL_PANEL, SHEET (float/drawer
> self-assemble their shell), GHOST_TEXT (the no-signal ghost watermark retired
> with 2ab66d0); the family-section CARD_HOVER/STRIP_PAPER/ALERT_DANGER/SECTION
> are **kept for family sync** (two-way sync with zjblog; this app has no
> consumers yet — do not delete).

## 4. Where paper physics lands in the app

The family principle of restraint tightens on a real-time interface: tape, torn
paper, and slight tilt appear only on **one-off paper surfaces** (macro
management, the top edge of the virtual keyboard) and never enter the video layer
that repaints every second:

- **Macro management**: two-corner tape at the top right; keys use `MONO_CHIP`
- **Virtual keyboard**: bottom drawer + single tape at the top left; keys
  `.kvm-key` (surface face, mono 11px, pressed state accent-strong +
  translateY(1px) physical sink)
- **No signal**: `hollow-text` ghost watermark + paper-strip button
- **Not used**: paper-note ruled paper (clashes with the stage paper texture),
  postmark, marker-strip

## 5. Motion

Everything reuses the family keyframes (fade-up entrance / fade-in / fade-out
0.16s + 240ms fallback unmount / reduced-motion global flattening). The only new
animation: `kvm-pulse` (recording-dot breathing, 1.2s), which also respects
reduced-motion. Theme switching reuses the stand-down window.

## 6. Accessibility

- Toolbar `role="toolbar"`; every icon button must carry `aria-label` + `title`;
  panel/overlay trigger buttons carry `aria-expanded` (IconButton `expanded`
  prop); segmented controls `role="radiogroup"`; toggles `role="switch"` +
  `aria-checked`
- LED/HID chips `role="img"` + `aria-label` of the form `CAPS 开/关` ("CAPS
  On/Off"; the state words come from the `common.on/off` dictionary keys); REC
  timer digits are `aria-hidden`, and recording **start/stop** events are
  announced by a persistent sr-only `role="status"` (not every second)
- Overlay focus contract (since 2026-11): Modal focuses the panel on open, traps
  Tab, returns focus to the trigger on close; Popover returns focus to the trigger
  on close (except outside-pointerdown close — focus stays where the user
  clicked); Dropdown lists ArrowUp/Down/Home/End + focus the selected item on open
  (APG listbox)
- Focus ring 2px accent (family base.css verbatim); touch targets per the §2
  guidelines (baseline 36–40px, chip layer at the registered 24px floor); input
  controls 16px under `pointer:coarse` to prevent iOS zoom
- Skip link goes straight to `#video` (copy from the dictionary); overlays dismiss
  on Esc and close on outside pointerdown; the virtual keyboard closes on Esc +
  window blur releases held keys (same guard as physical forwarding)
- Capability banner: on startup in non-Chromium / non-secure contexts, a
  `role="status"` notice appears below the navigation (the three browser.* keys);
  on Chromium desktop it never renders — no Lighthouse CLS impact

## 7. Responsive contract

| Breakpoint | Layout |
| --- | --- |
| `md` (768) | Toolbar: top pill ⇄ bottom fixed bar (panels spring up from below); navigation title subtitle shows/hides |
| `650px` | Touch-gesture enable/disable threshold (inherited from the original) |
| Virtual-keyboard control cluster | Hidden below `md` (mobile keeps only the main key area + arrow keys) |

Font sizes are constant across all form factors (UI text-sm, meta text-xs 12px
floor — family rule).

## 8. Performance and SEO contract (the KVM version of family §15)

- `pnpm audit` gate: Performance ≥ 90 (measured 100) / A11y / BP / SEO = 100, both
  form factors (desktop + `LH_FORM_FACTOR=mobile`) must pass; the fifth category
  `agentic-browsing` scores 98 because of the ard-schema `text/html` non-standard
  discovery type — the console entry **really is** an HTML page; registered as an
  accepted insight (§AUDIT.md), not chased
- Zero webfont, zero image assets (icons = inline lucide SVG; logo =
  code-generated PNG)
- Single JS bundle ≈378KB (≈119KB gzip), React 19 + jotai; no render-blocking JS
  on first paint (CSS is the only render blocker)
- 1Hz telemetry does not re-render the stage tree: `useVideoStats` is isolated in
  the `VideoStatsBridge` child component (2026-11); Popover `onClose` is pinned
  with `useCallback` to avoid reinstalling document listeners every second
- Agentic-friendly: `robots.txt` / `llms.txt` / `.well-known/ard.json` (continuing
  the family's agentic-browsing stance)

## 9. Two-way sync checklist

Change here, change there too (and vice versa):

- `src/styles/tokens.css` ←→ zjblog `src/styles/tokens.css` (byte-identical)
- `src/lib/styles.ts` family fragment section ←→ zjblog `src/lib/styles.ts`
- `src/styles/base.css` / `behaviors.css` ←→ the same-named files
- `lib/theme.ts` / index.html anti-flicker script ←→ zjblog `lib/theme.ts` + THEME_BOOTSTRAP
