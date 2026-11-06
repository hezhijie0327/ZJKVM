import { siteConfig } from "@/config/site";

/** Bottom bar: the family copyright footer (ZJBlog grammar). The old
 *  status-chips pill moved into the top bar's info menu, and the demo
 *  explainer became a start-of-session toast — this bar is just the footer
 *  now. Ground = the stage's surface-2 so the page reads as one surface
 *  (bg-bg fought the stage's lighter paper). */
export function Statusbar() {
  const currentYear = new Date().getFullYear();
  return (
    <footer className="hidden shrink-0 border-t border-line/80 bg-surface-2 md:block">
      <div className="flex h-9 items-center justify-center text-xs text-ink-3">
        <span aria-hidden="true">
          © {currentYear} {siteConfig.copyright}
        </span>
      </div>
    </footer>
  );
}
