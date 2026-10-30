import { useAtomValue } from "jotai";
import { Kbd } from "@/components/ui/Kbd";
import { Modal } from "@/components/ui/Modal";
import { supportsSerial } from "@/lib/browser";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { EYEBROW, META, MONO_CHIP, TAPE } from "@/lib/styles";
import { firmwareAtom, serialStateAtom } from "@/state/atoms";

/** About dialog: family story, protocol summary, capability report. */
export function AboutModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { t } = useI18n();
  const firmware = useAtomValue(firmwareAtom);
  const serialState = useAtomValue(serialStateAtom);

  return (
    <Modal open={open} onClose={onClose} label={t("about.title")}>
      <div className="relative border-b border-line/70 px-6 pt-6 pb-5">
        <span aria-hidden="true" className={cn(TAPE, "-top-2 left-8 w-20 -rotate-6 bg-accent-soft/80")} />
        <p className={EYEBROW}>ZJKVM 1.0</p>
        <h2 className="mt-1.5 font-serif text-2xl font-semibold tracking-tight text-ink">{t("about.title")}</h2>
      </div>

      <div className="space-y-4 px-6 py-5 text-sm leading-relaxed text-ink-2">
        <p>{t("about.blurb")}</p>
        <p>{t("about.demo")}</p>

        <div className="flex flex-wrap items-center gap-2 pt-1">
          <span className={MONO_CHIP}>{supportsSerial() ? "Web Serial ✓" : "Web Serial ✗"}</span>
          <span className={MONO_CHIP}>{serialState === "connected" ? "HID ✓" : "HID —"}</span>
          {firmware && <span className={MONO_CHIP}>{t("status.fw", { v: firmware })}</span>}
          <span className={MONO_CHIP}>CH9329 57600 8N1</span>
        </div>

        <div className="border-t border-line/70 pt-3">
          <p className={cn(META, "mb-2")}>Link protocol</p>
          <div className="flex flex-wrap gap-1.5">
            <Kbd>57 AB 00 CMD LEN DATA SUM</Kbd>
            <Kbd>0x02 KB 8B</Kbd>
            <Kbd>0x04 MS-ABS 6B</Kbd>
            <Kbd>0x05 MS-REL 4B</Kbd>
            <Kbd>0x01 GET_INFO</Kbd>
          </div>
        </div>

        <p className={META}>{t("about.credits")}</p>
      </div>
    </Modal>
  );
}
