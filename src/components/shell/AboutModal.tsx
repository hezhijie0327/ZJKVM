import { useAtomValue } from "jotai";
import { MonitorPlay, X } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { supportsSerial } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, META, MONO_CHIP, PAPER_STRIP, STRIP_PRIMARY, TAPE } from "@/lib/styles";
import { demoModeAtom, firmwareAtom, serialStateAtom } from "@/state/atoms";
import { startDemo, stopDemoMode } from "@/state/connection";
import { pushToast } from "@/state/toast";

/** About dialog: product introduction, live capability report, demo entry. */
export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const firmware = useAtomValue(firmwareAtom);
  const serialState = useAtomValue(serialStateAtom);
  const demo = useAtomValue(demoModeAtom);

  const toggleDemo = () => {
    if (demo) {
      stopDemoMode();
    } else {
      startDemo();
      pushToast(t("toast.demoStarted"));
    }
  };

  return (
    <Modal open={open} onClose={onClose} label={t("about.title")}>
      <div className="relative border-b border-line/70 px-6 pt-6 pb-5">
        <span aria-hidden="true" className={cn(TAPE, "-top-2 left-8 w-20 -rotate-6 bg-accent-soft/80")} />
        <button
          type="button"
          aria-label={t("common.close")}
          title={t("common.close")}
          onClick={onClose}
          className="absolute top-3 right-3 grid size-8 place-items-center rounded-full text-ink-2 transition-colors hover:bg-surface-2 hover:text-ink"
        >
          <X aria-hidden="true" className="size-4" />
        </button>
        <p className={EYEBROW}>ZJKVM 1.0</p>
        <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-ink">{t("about.title")}</h2>
      </div>

      <div className="space-y-4 px-6 py-5 text-sm leading-relaxed text-ink-2">
        <p>{t("about.blurb")}</p>

        {/* Feature list */}
        <ul className="space-y-1.5">
          {[t("about.feature1"), t("about.feature2"), t("about.feature3"), t("about.feature4")].map((f) => (
            <li key={f} className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 size-1.5 shrink-0 rounded-full bg-accent-strong" />
              <span>{f}</span>
            </li>
          ))}
        </ul>

        {/* Live capability report */}
        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={MONO_CHIP}>{supportsSerial() ? "Web Serial ✓" : "Web Serial ✗"}</span>
          <span className={MONO_CHIP}>{serialState === "connected" ? "HID ✓" : "HID —"}</span>
          {firmware && <span className={MONO_CHIP}>{t("status.fw", { v: firmware })}</span>}
          <span className={MONO_CHIP}>CH9329 57600 8N1</span>
        </div>

        {/* Demo entry */}
        <div className="border-t border-line/70 pt-4">
          <button
            type="button"
            onClick={toggleDemo}
            className={cn(
              PAPER_STRIP,
              STRIP_PRIMARY,
              "flex w-full items-center justify-center gap-2",
              demo && "opacity-70",
            )}
          >
            <MonitorPlay aria-hidden="true" className="size-4" />
            {demo ? t("about.demoStop") : t("about.demoButton")}
          </button>
          <p className={cn(META, "mt-2")}>{t("about.demoNote")}</p>
        </div>
      </div>
    </Modal>
  );
}
