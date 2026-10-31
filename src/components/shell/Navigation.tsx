import { useSetAtom } from "jotai";
import { Info, Languages, Moon, Sun, SunMoon } from "lucide-react";
import { useRef, useState } from "react";
import { IconButton } from "@/components/ui/IconButton";
import { Popover } from "@/components/ui/Popover";
import { cn } from "@/lib/cn";
import { type Lang, useI18n } from "@/lib/i18n";
import { LIST_ROW } from "@/lib/styles";
import { nextThemeStyle, readThemeStyle, setThemeStyle } from "@/lib/theme";
import { aboutOpenAtom } from "@/state/atoms";

/** Navigation bar: sticky glass, serif wordmark with the family golden period. */
export function Navigation() {
  const { t, lang, setLang } = useI18n();
  const setAboutOpen = useSetAtom(aboutOpenAtom);
  const [langOpen, setLangOpen] = useState(false);
  const langAnchorRef = useRef<HTMLButtonElement>(null);

  const cycleTheme = () => {
    setThemeStyle(nextThemeStyle(readThemeStyle()));
  };

  const langOptions: { value: Lang; label: string }[] = [
    { value: "zh", label: "简体中文" },
    { value: "en", label: "English" },
  ];

  return (
    <header className="app-bar sticky top-0 z-50 border-b border-line/80 bg-bg/80 backdrop-blur-md">
      <nav className="container mx-auto flex h-14 items-center justify-between gap-3 px-4">
        <div className="flex min-w-0 items-baseline">
          <span className="font-serif text-xl font-semibold tracking-tight text-ink">
            ZJKVM
            <span aria-hidden="true" className="ms-[0.14em] inline-block size-[0.25em] rounded-full bg-accent-strong" />
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-0.5">
          <IconButton label={`${t("nav.theme")} (${readThemeStyle()})`} onClick={cycleTheme}>
            <SunMoon aria-hidden="true" className="theme-icon theme-icon-auto size-4" />
            <Sun aria-hidden="true" className="theme-icon theme-icon-light size-4" />
            <Moon aria-hidden="true" className="theme-icon theme-icon-dark size-4" />
          </IconButton>

          <div className="relative">
            <IconButton
              ref={langAnchorRef}
              label={t("nav.lang")}
              active={langOpen}
              onClick={() => setLangOpen((open) => !open)}
            >
              <Languages aria-hidden="true" className="size-4" />
            </IconButton>
            <Popover
              open={langOpen}
              onClose={() => setLangOpen(false)}
              side="bottom"
              align="end"
              anchorRef={langAnchorRef}
              className="w-44"
            >
              <div className="divide-y divide-line/70">
                {langOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      setLang(option.value);
                      setLangOpen(false);
                    }}
                    className={cn(
                      LIST_ROW,
                      "px-4 py-3 text-sm",
                      lang === option.value ? "text-accent" : "text-ink hover:bg-surface-2",
                    )}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </Popover>
          </div>

          <IconButton label={t("nav.help")} onClick={() => setAboutOpen(true)}>
            <Info aria-hidden="true" className="size-4" />
          </IconButton>
        </div>
      </nav>
    </header>
  );
}
