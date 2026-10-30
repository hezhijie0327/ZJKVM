/**
 * Single source of truth for design-language class fragments.
 *
 * Family fragments are kept in two-way sync with zjblog's lib/styles.ts; the
 * ZJKVM section at the bottom registers this app's additions (a new fragment
 * must be registered here first — never hand-write long class strings inside
 * components).
 */

/* ── Family fragments (zjblog lib/styles.ts) ─────────────────────────────── */

/** Round icon button (shared by navigation bar / toolbar / action areas) */
export const ICON_BTN =
  "grid size-9 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink";

/** Card container: hairline border + surface background + soft warm shadow */
export const CARD = "rounded-2xl border border-line bg-surface shadow-card";

/** Card container + deepened shadow on hover */
export const CARD_HOVER = `${CARD} transition-shadow hover:shadow-pop`;

/** Divider-row list (no bordered shell; callers compose CARD + DIVIDE_LIST for a card shell) */
export const DIVIDE_LIST = "divide-y divide-line/70";

/** Compact list row */
export const LIST_ROW =
  "group flex items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-surface-2 sm:gap-6 sm:px-6";

/** Primary action button (gold pill) */
export const BTN_PRIMARY =
  "inline-flex h-10 items-center gap-2 rounded-full bg-accent-strong px-5 text-sm font-semibold text-accent-contrast shadow-card transition-all hover:bg-accent-strong-hover hover:shadow-pop";

/** Secondary action button (outlined pill) */
export const BTN_OUTLINE =
  "inline-flex h-10 items-center gap-2 rounded-full border border-line bg-surface px-5 text-sm font-medium text-ink transition-colors hover:bg-surface-2";

/** Torn-edge paper strip button (pairs with the global .paper-strip background) */
export const PAPER_STRIP =
  "paper-strip inline-flex h-10 items-center gap-2 px-5 text-sm font-medium text-ink transition-all hover:-translate-y-0.5 hover:rotate-0 active:translate-y-0";

/** Gold paper strip action (accent-strong face, tilts left) — combine with PAPER_STRIP */
export const STRIP_PRIMARY =
  "-rotate-1 text-accent-contrast [--strip:var(--accent-strong)] hover:[--strip:var(--accent-strong-hover)]";

/** Neutral paper strip action (surface face, tilts right) — combine with PAPER_STRIP */
export const STRIP_PAPER = "rotate-1 [--strip:var(--surface)] hover:text-accent";

/** Danger alert box body (role=alert + copy stay at the call site) */
export const ALERT_DANGER = "rounded-lg border border-danger/60 bg-danger/10 p-4 text-sm";

/** Tag chip */
export const CHIP = "inline-flex items-center rounded-full border border-line px-2.5 py-0.5 text-xs text-ink-2";

/** Small mono tag chip (keyboard hints / type markers) */
export const MONO_CHIP = `${CHIP} font-mono text-xs`;

/** Mono metadata text (dates / counts / keyboard hints) */
export const META = "font-mono text-xs text-ink-3";

/** Eyebrow: small mono uppercase spaced label */
export const EYEBROW = "font-mono text-xs uppercase tracking-[0.2em] text-ink-3";

/** Tape (paper-feel decoration): translucent gold rectangle pressed over a paper edge */
export const TAPE = "pointer-events-none absolute z-10 h-6 bg-accent-soft";

/** Page-level section shell (container + uniform vertical rhythm) */
export const SECTION = "container mx-auto px-4 py-14 sm:py-20";

/* ── ZJKVM extensions (registered per family rule ②) ─────────────────────── */

/** Floating panel row: label left, control right — the standard rhythm inside
 *  toolbar popovers and settings panels (a tighter LIST_ROW sibling) */
export const PANEL_ROW = "flex min-h-11 items-center justify-between gap-4 px-4 py-2.5";

/** Segmented control shell: warm track holding pill options */
export const SEGMENT = "inline-flex items-center gap-0.5 rounded-full bg-surface-2 p-1";

/** Segmented option (selected state = accent-strong pill, family tab language) */
export const SEGMENT_ITEM =
  "inline-flex h-7 items-center justify-center gap-1 rounded-full px-3 text-xs font-medium transition-colors";
export const SEGMENT_ITEM_ON = `${SEGMENT_ITEM} bg-accent-strong text-accent-contrast`;
export const SEGMENT_ITEM_OFF = `${SEGMENT_ITEM} text-ink-2 hover:text-ink`;

/** Toolbar shell: floating draggable glass card above the video stage */
export const TOOLBAR =
  "flex items-center gap-0.5 rounded-full border border-line/80 bg-bg/80 p-1 shadow-pop backdrop-blur-md";

/** Toolbar divider dot between action groups */
export const TOOLBAR_DIVIDER = "mx-0.5 h-5 w-px bg-line";

/** Status bar chip: mono, hairline, stage-safe (sits over the statusbar) */
export const STATUS_CHIP =
  "inline-flex h-6 items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 font-mono text-[11px] text-ink-2";

/** Small key button on the virtual keyboard (visual base; .kvm-key carries the skin) */
export const KEY = "kvm-key";

/** Modal shell: scrim + floating paper panel (family modal language) */
export const MODAL_SCRIM = "fixed inset-0 z-100 flex items-center justify-center bg-ink/30 px-4 backdrop-blur-[2px]";
export const MODAL_PANEL = "relative w-full overflow-hidden text-left";

/** Bottom sheet (mobile panels / virtual keyboard) */
export const SHEET = "fixed inset-x-0 bottom-0 z-90 rounded-t-2xl border-t border-line bg-surface shadow-pop";

/** Ghost watermark: hollow outlined large mono text (family GHOST_DATE
 *  language, content-agnostic) — decorative, keep aria-hidden on consumers */
export const GHOST_TEXT =
  "hollow-text pointer-events-none absolute select-none whitespace-nowrap font-mono font-bold leading-none";
