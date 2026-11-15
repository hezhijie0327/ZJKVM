# AGENTS.md

ZJKVM is a browser-based USB KVM console for the NanoKVM-USB dongle, restyled as an app-form member of the ZJ design family (zjblog).

## HANDOVER.md

When a multi-step task is interrupted, write progress to `HANDOVER.md` so the next session can pick up where you left off. Include: what was done, what remains, key decisions made, and the next concrete step. Delete the file when the task is complete.

## Behavioral Guidelines

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

### 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

### 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

**Additional rules:**
- Be concise in output but thorough in reasoning.
- Do not re-read files you have already read.
- User instructions always override this file.
- Don't wrestle with indentation in the Edit tool — focus on logic, let the project's formatter fix formatting. Use `sed` or `python3` freely when the Edit tool struggles with whitespace.

## Git commit convention

Every commit subject starts with a type prefix — `feat` / `fix` / `chore` / `docs` / `revert` / `refactor` / `perf` / `test` / `build` — optionally scoped: `fix(toolbar): ...`. Subject: imperative, lowercase start, no trailing period, aim ≤ 72 chars; detail goes in the body after a blank line (why, not what); breaking changes take `!` before the colon or a `BREAKING CHANGE:` body footer. Never rewrite pushed history.

- Commit incrementally — one logical change per commit, after lint and tests pass. Present changes for review before committing.
- PRs: link the issue, summarize the change and verification (tests/benchmarks), and include config/log/pprof evidence for bug fixes.

### Co-Author Format

- Always add co-author information. If closing an issue in commit text, verify against `main` first: `gh issue view <issue-id>`.
- Only ONE co-author line is allowed. If multiple agents contributed, aggregate into ONE entry.

Format: `Co-authored-by: <AgentName> <Email>`

Valid examples (choose EXACTLY ONE):

```
Co-authored-by: ZCode <noreply@z.ai>
```

## Documentation format

Family-wide Markdown rules, shared verbatim across all ZJ projects:

- **Language**: AGENTS.md, AUDIT.md, DESIGN.md and other agent-facing docs are English; README.md is Chinese (human-facing). Keep literal UI strings and code identifiers verbatim.
- **AGENTS.md skeleton** — generic sections first, then project; omit sections that don't apply, keep the order:
  `# AGENTS.md` → 1–2 sentence intro (what the project is + key doc links) → Behavioral Guidelines → Git commit convention → Documentation format → Project → Commands → Architecture → Conventions (Gotchas as a subsection) → project-specific sections → Key Docs.
- **README.md skeleton**: `# <project>` → badge block → one-line positioning + stack + key links → 特性 → 快速开始 → 配置 / 用法 → 文档 → License (omit as needed).
- **README badges** (shields.io, after the title, in order): Version (only where a real version exists, linked to the repo's GitHub releases), License (Apache 2.0 with Commons Clause — every project), primary-language badge (Go / TypeScript / Bash / Python / Docker), Biome for TypeScript projects; pure data/config repos get License only. Version links use the real GitHub repo name.
- **Formatting**: ATX headings (`#`), never skip a level; code fences always carry a language tag (`bash`, `go`, `json`, `text` for trees); tables for structured reference; no decorative emoji in headings or bullets; bold for key terms only.

## Project

React 19 + TypeScript strict + Vite 8 + Tailwind v4 + jotai. No component library, no router — single page.

## Commands

```bash
pnpm dev            # dev server on :3010 — no hardware? click "Demo mode"
pnpm build          # tsc --noEmit && vite build (both must pass)
pnpm lint           # biome check (formatter + linter; biome.json excludes src/styles/** — Tailwind directives break its CSS parser)
pnpm lint:fix       # biome check --write
pnpm audit          # Lighthouse gate on dist/: desktop AND LH_FORM_FACTOR=mobile must stay 100/100/100/100 (perf floor 90)
pnpm icons          # regenerate PWA PNGs (scripts/generate-icons.mjs, zero-dep PNG encoder)
```

Package manager is pnpm. `pnpm-workspace.yaml` whitelists esbuild's build script.

## Architecture

- `src/lib/device/` — **byte-exact protocol layer, do not "clean up"**: `proto.ts` (CH9329 frame `[57 AB 00 CMD LEN DATA… SUM]`, SUM includes heads), `keymap.ts`/`charcodes.ts` (HID tables ported from NanoKVM-USB). Changing framing breaks real hardware.
- HID transport is abstracted as `HidLink` (`device.ts`): `SerialDevice` (real) and `DemoDevice` (simulated) both implement it. UI code must use `getActiveLink()`/`requireLink()` — never touch serial directly.
- Demo mode (`demo-video.ts` + `demo-device.ts`): canvas test card as synthetic MediaStream; `window.__zjkvmDemo.state` is the test hook for verifying keyboard/mouse reports without hardware. Demo canvas freezes when the tab is hidden (rAF pause) — that's expected, not a bug.
- `src/state/connection.ts` owns all connect/disconnect/LED-polling logic as plain functions over jotai's default store (it runs outside React). Non-React i18n goes through `state/t.ts` (translator installed by `I18nProvider`).
- Physical keyboard forwarding (`input/PhysicalKeyboard.tsx`) must keep its guards: IME composition skip, Windows AltGr strip, macOS Meta release, and the `input/textarea/select/[contenteditable]` auto-pause. Virtual keys use pointer events (pointerdown/up), quick-key chips use click.
- Absolute-mouse coordinates go through `stage/videoRect.ts` (letterbox + rotation + zoom + inverse-rotation) — do not map client coords directly onto the video element.

### Design language (family contract)

- `src/styles/tokens.css`, `base.css`, `behaviors.css` are **byte-exact copies of zjblog's** — keep in two-way sync. Theme = `.dark` class + `@property` cross-fade; never add raw colors or `text-gray-*`; tokens only.
- Recurring class strings belong in `src/lib/styles.ts` fragments (family section kept in sync with zjblog; ZJKVM additions must be registered there first). Global entry: `styles/global.css` (has `@source "../"` — required for Tailwind v4 utility generation).
- `DESIGN.md` documents the family extensions and the KVM-specific deviations (toolbar/statusbar-as-footer, paper-decor restraint). Read it + README.md (protocol section) before touching styles or `lib/device/`.

## Conventions

- Biome: 2-space, 120 cols, double quotes, named exports only (`export default` only for `App.tsx`). Unused suppression comments are flagged — keep `biome-ignore` lines directly above the exact node.
- i18n: all UI strings via `useI18n().t()`; wordbooks live in `lib/i18n/` — `en.ts` is the baseline and source of `TKey`, `zh.ts` mirrors it key-for-key, and `lib/i18n.tsx` holds the provider/logic (same split as zjblog). Adding a locale = new `lib/i18n/<tag>.ts` + register in `CATALOGS`. Module-scope code uses `state/t.ts`.
- Settings persist under `zjkvm-*` localStorage keys via `lib/storage.ts`; atoms initialize from it, `App.tsx` owns the persist effects — all writes go through the storage module, never raw `localStorage` with a hand-built key.
- Accessibility floor: a11y Lighthouse 100 — icon buttons need aria-label, switches are `role="switch"`, disclosure triggers carry `aria-expanded` (IconButton `expanded`), popovers/modals move focus in and return it on close, decorative tape/ghost text is `aria-hidden` + `pointer-events-none`, reduced-motion must keep working. AUDIT.md §4.0 is the assertion list.
- Serial connects only inside a user gesture (`navigator.serial.requestPort()`); video is the same — nothing may call `getUserMedia` without a click. The saved device id prefills the device panel, it never autoplay-connects.
- Connect flows are re-entrancy guarded (`connectVideo` mutex, `camera.open` generation guard, demo owns the stage exclusively) — don't add a new connect path without one, and don't put side effects inside setState updaters.

### Gotchas

- Web Serial / keyboard.lock / showSaveFilePicker are Chromium-desktop-only — always gate via `lib/browser.ts` capability checks, never assume; non-Chromium/insecure origins get the `browser.*` capability banner under the nav.
- `index.html` ships an inline theme bootstrap script (anti-FOUC); keep it in sync with `lib/theme.ts` if the storage key changes.
- Lighthouse SEO requires `public/robots.txt`, `llms.txt`, `.well-known/ard.json` (audit falls back to index.html otherwise and fails) — keep them when changing the build. Lighthouse 13's fifth category `agentic-browsing` scores 98 from the honest `text/html` ARD entry type — accepted insight, the gate checks the four categories only.
- `videoEl.play()` can be rejected (autoplay policy) while the stream is already live — Stage retries once on the next trusted interaction; keep that kick when touching the stage.
- HID resets ride on connect: `connection.ts` sends keyboard/mouse reports on serial open/rebind so the target machine never keeps a stuck key or button across a link drop.
- `pnpm audit` (no `run`) is the registry security audit and errors on npmmirror — the Lighthouse gate is `pnpm run audit`. Full audit playbook: AUDIT.md.
