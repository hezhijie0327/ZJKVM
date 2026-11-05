/** Module-level translate bridge: connection.ts and other non-React modules
 *  need t() outside the render tree; the I18nProvider installs the live
 *  translator on mount so they always speak the current language. */

import type { TKey } from "@/lib/i18n/en";

type Translator = (key: TKey, vars?: Record<string, string | number>) => string;

let translate: Translator = (key) => key;

export function setTranslator(fn: Translator): void {
  translate = fn;
}

export function t(key: TKey, vars?: Record<string, string | number>): string {
  return translate(key, vars);
}
