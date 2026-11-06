# AGENTS.md — ZJKVM

Browser-based USB KVM console for the NanoKVM-USB dongle, restyled as an app-form member of the ZJ design family (zjblog). React 19 + TypeScript strict + Vite 8 + Tailwind v4 + jotai. No component library, no router — single page.

## Commands

```bash
pnpm dev            # dev server on :3010 — no hardware? click "Demo mode" (演示模式)
pnpm build          # tsc --noEmit && vite build (both must pass)
pnpm lint           # biome check (formatter + linter; biome.json excludes src/styles/** — Tailwind directives break its CSS parser)
pnpm lint:fix       # biome check --write
pnpm audit          # Lighthouse gate on dist/: desktop AND LH_FORM_FACTOR=mobile must stay 100/100/100/100 (perf floor 90)
pnpm icons          # regenerate PWA PNGs (scripts/generate-icons.mjs, zero-dep PNG encoder)
```

Package manager is pnpm. `pnpm-workspace.yaml` whitelists esbuild's build script.

## Architecture & layer rules

- `src/lib/device/` — **byte-exact protocol layer, do not "clean up"**: `proto.ts` (CH9329 frame `[57 AB 00 CMD LEN DATA… SUM]`, SUM includes heads), `keymap.ts`/`charcodes.ts` (HID tables ported from NanoKVM-USB). Changing framing breaks real hardware.
- HID transport is abstracted as `HidLink` (`device.ts`): `SerialDevice` (real) and `DemoDevice` (simulated) both implement it. UI code must use `getActiveLink()`/`requireLink()` — never touch serial directly.
- Demo mode (`demo-video.ts` + `demo-device.ts`): canvas test card as synthetic MediaStream; `window.__zjkvmDemo.state` is the test hook for verifying keyboard/mouse reports without hardware. Demo canvas freezes when the tab is hidden (rAF pause) — that's expected, not a bug.
- `src/state/connection.ts` owns all connect/disconnect/LED-polling logic as plain functions over jotai's default store (it runs outside React). Non-React i18n goes through `state/t.ts` (translator installed by `I18nProvider`).
- Physical keyboard forwarding (`input/PhysicalKeyboard.tsx`) must keep its guards: IME composition skip, Windows AltGr strip, macOS Meta release, and the `input/textarea/select/[contenteditable]` auto-pause. Virtual keys use pointer events (pointerdown/up), quick-key chips use click.
- Absolute-mouse coordinates go through `stage/videoRect.ts` (letterbox + rotation + zoom + inverse-rotation) — do not map client coords directly onto the video element.

## Design language (family contract)

- `src/styles/tokens.css`, `base.css`, `behaviors.css` are **byte-exact copies of zjblog's** — keep in two-way sync. Theme = `.dark` class + `@property` cross-fade; never add raw colors or `text-gray-*`; tokens only.
- Recurring class strings belong in `src/lib/styles.ts` fragments (family section kept in sync with zjblog; ZJKVM additions must be registered there first). Global entry: `styles/global.css` (has `@source "../"` — required for Tailwind v4 utility generation).
- `DESIGN.md` documents the family extensions and the KVM-specific deviations (toolbar/statusbar-as-footer, paper-decor restraint). Read it + README.md (protocol section) before touching styles or `lib/device/`.

## Conventions

- Biome: 2-space, 120 cols, double quotes, named exports only (`export default` only for `App.tsx`). Unused suppression comments are flagged — keep `biome-ignore` lines directly above the exact node.
- i18n: all UI strings via `useI18n().t()`; wordbooks live in `lib/i18n/` — `en.ts` is the baseline and source of `TKey`, `zh.ts` mirrors it key-for-key, and `lib/i18n.tsx` holds the provider/logic (same split as zjblog). Adding a locale = new `lib/i18n/<tag>.ts` + register in `CATALOGS`. Module-scope code uses `state/t.ts`.
- Settings persist under `zjkvm-*` localStorage keys via `lib/storage.ts`; atoms initialize from it, `App.tsx` owns the persist effects.
- Accessibility floor: a11y Lighthouse 100 — icon buttons need aria-label, switches are `role="switch"`, decorative tape/ghost text is `aria-hidden` + `pointer-events-none`, reduced-motion must keep working.
- Serial connects only inside a user gesture (`navigator.serial.requestPort()`); video is the same — nothing may call `getUserMedia` without a click. The saved device id prefills the device panel, it never autoplay-connects.

## Gotchas

- Web Serial / keyboard.lock / showSaveFilePicker are Chromium-desktop-only — always gate via `lib/browser.ts` capability checks, never assume.
- `index.html` ships an inline theme bootstrap script (anti-FOUC); keep it in sync with `lib/theme.ts` if the storage key changes.
- Lighthouse SEO requires `public/robots.txt`, `llms.txt`, `.well-known/ard.json` (audit falls back to index.html otherwise and fails) — keep them when changing the build.
