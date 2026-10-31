import { useSetAtom } from "jotai";
import { useRef } from "react";
import { Button } from "@/components/ui/Button";
import { ROW_LABEL } from "@/components/ui/Kbd";
import { cn } from "@/lib/cn";
import { useI18n } from "@/lib/i18n";
import { downloadBlob } from "@/lib/recorder";
import * as storage from "@/lib/storage";
import { DIVIDE_LIST, META, PANEL_ROW } from "@/lib/styles";
import { aboutOpenAtom, connectGateOpenAtom, toolbarPosAtom } from "@/state/atoms";
import { disconnectAll } from "@/state/connection";
import { pushToast } from "@/state/toast";

export function SettingsPanel() {
  const { t } = useI18n();
  const setGateOpen = useSetAtom(connectGateOpenAtom);
  const setToolbarPos = useSetAtom(toolbarPosAtom);
  const setAboutOpen = useSetAtom(aboutOpenAtom);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const openAbout = () => {
    setAboutOpen(true);
  };

  const exportSettings = () => {
    const json = storage.exportSettings();
    downloadBlob(new Blob([json], { type: "application/json" }), "zjkvm-settings.json");
  };

  const importSettings = async (file: File) => {
    const json = await file.text();
    const count = storage.importSettings(json);
    if (count === null) {
      pushToast(t("settings.importFail"), "danger");
      return;
    }
    pushToast(t("settings.imported", { n: count }));
    // settings take effect after reload (camera/serial reopen fresh)
    window.setTimeout(() => window.location.reload(), 800);
  };

  const resetSettings = () => {
    storage.resetSettings();
    setToolbarPos({ x: 0, y: 0 });
    pushToast(t("settings.resetDone"));
  };

  return (
    <div className={DIVIDE_LIST}>
      <div className={PANEL_ROW}>
        <span className={ROW_LABEL}>{t("tb.settings")}</span>
        <span className={META}>zjkvm-*</span>
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <span className={ROW_LABEL}>{t("settings.export")}</span>
        <Button className="h-9 px-4" onClick={exportSettings}>
          JSON ↓
        </Button>
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <span className={ROW_LABEL}>{t("settings.import")}</span>
        <Button className="h-9 px-4" onClick={() => fileInputRef.current?.click()}>
          JSON ↑
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="application/json"
          className="sr-only"
          aria-label={t("settings.import")}
          onChange={(event) => {
            const file = event.target.files?.[0];
            if (file) void importSettings(file);
            event.target.value = "";
          }}
        />
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <span className={ROW_LABEL}>{t("settings.reset")}</span>
        <Button variant="danger" className="h-9 px-4" onClick={resetSettings}>
          {t("common.reset")}
        </Button>
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <span className={ROW_LABEL}>{t("common.disconnect")}</span>
        <Button
          variant="danger"
          className="h-9 px-4"
          onClick={async () => {
            await disconnectAll();
            setGateOpen(true);
          }}
        >
          {t("common.disconnect")}
        </Button>
      </div>

      <div className={cn(PANEL_ROW, "flex-wrap")}>
        <span className={ROW_LABEL}>{t("settings.about")}</span>
        <Button className="h-9 px-4" onClick={openAbout}>
          {t("nav.help")}
        </Button>
      </div>

      <p className={cn(META, "px-4 py-3")}>{t("about.credits")}</p>
    </div>
  );
}
