import { useAtomValue, useSetAtom } from "jotai";
import { useEffect } from "react";
import { MouseInput } from "@/components/input/AbsoluteMouse";
import { PhysicalKeyboard } from "@/components/input/PhysicalKeyboard";
import { VirtualKeyboard } from "@/components/keyboard/VirtualKeyboard";
import { AboutModal } from "@/components/shell/AboutModal";
import { Navigation } from "@/components/shell/Navigation";
import { Statusbar } from "@/components/shell/Statusbar";
import { Stage } from "@/components/stage/Stage";
import { Toasts } from "@/components/ui/Toasts";
import { siteConfig } from "@/config/site";
import { isSecureContext, supportsMediaDevices, supportsSerial } from "@/lib/browser";
import { useI18n } from "@/lib/i18n";
import { mouseJiggler } from "@/lib/mouse-jiggler";
import * as storage from "@/lib/storage";
import { watchSystemTheme } from "@/lib/theme";
import {
  aboutOpenAtom,
  customResolutionsAtom,
  jigglerAtom,
  mouseModeAtom,
  mouseStyleAtom,
  resolutionAtom,
  rotationAtom,
  scaleModeAtom,
  toolbarCollapsedAtom,
  toolbarPosAtom,
  videoDeviceIdAtom,
  virtualKeyboardOpenAtom,
  wheelDirectionAtom,
  wheelIntervalAtom,
} from "@/state/atoms";
import { checkCamera, checkMic, watchVideoHotplug } from "@/state/connection";

export default function App() {
  const { t } = useI18n();
  const aboutOpen = useAtomValue(aboutOpenAtom);
  const setAboutOpen = useSetAtom(aboutOpenAtom);

  const virtualKeyboardOpen = useAtomValue(virtualKeyboardOpenAtom);
  const setVirtualKeyboardOpen = useSetAtom(virtualKeyboardOpenAtom);

  /* Boot: theme watching, device lists + hotplug, permission probes */
  useEffect(() => {
    const unwatchTheme = watchSystemTheme();
    const unwatch = watchVideoHotplug();
    void checkMic();
    void checkCamera();
    return () => {
      unwatchTheme();
      unwatch();
    };
  }, []);

  /* Jiggler mode follows the atom (also on boot) and persists with the
     other preferences — the panel's atom setter shadows storage.setJiggler,
     so the write must happen here. */
  const jiggler = useAtomValue(jigglerAtom);
  useEffect(() => {
    mouseJiggler.setMode(jiggler);
    storage.setJiggler(jiggler);
  }, [jiggler]);

  /* Preference persistence — one write per changed slice */
  const videoDeviceId = useAtomValue(videoDeviceIdAtom);
  const resolution = useAtomValue(resolutionAtom);
  const customResolutions = useAtomValue(customResolutionsAtom);
  const scaleMode = useAtomValue(scaleModeAtom);
  const rotation = useAtomValue(rotationAtom);
  const mouseStyle = useAtomValue(mouseStyleAtom);
  const mouseMode = useAtomValue(mouseModeAtom);
  const wheelDirection = useAtomValue(wheelDirectionAtom);
  const wheelInterval = useAtomValue(wheelIntervalAtom);
  const toolbarCollapsed = useAtomValue(toolbarCollapsedAtom);
  const toolbarPos = useAtomValue(toolbarPosAtom);

  useEffect(() => storage.setVideoDeviceId(videoDeviceId), [videoDeviceId]);
  useEffect(() => storage.setVideoResolution(resolution), [resolution]);
  useEffect(() => storage.setCustomResolutions(customResolutions), [customResolutions]);
  useEffect(() => storage.setScaleMode(scaleMode), [scaleMode]);
  useEffect(() => storage.setVideoRotation(rotation), [rotation]);
  useEffect(() => storage.setMouseStyle(mouseStyle), [mouseStyle]);
  useEffect(() => storage.setMouseMode(mouseMode), [mouseMode]);
  useEffect(() => storage.setWheelDirection(wheelDirection), [wheelDirection]);
  useEffect(() => storage.setWheelInterval(wheelInterval), [wheelInterval]);
  useEffect(() => storage.setToolbarCollapsed(toolbarCollapsed), [toolbarCollapsed]);
  useEffect(() => storage.setToolbarPos(toolbarPos), [toolbarPos]);

  /* Video never connects on its own — every getUserMedia is behind a click.
     The saved device id is a prefill for the device panel, not an autoplay
     permission; the cold-start effect opens that panel instead. */

  return (
    <div className="flex min-h-dvh flex-col bg-bg text-ink">
      <a
        href="#video"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-full focus:bg-accent-strong focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-contrast"
      >
        {t("nav.skipVideo")}
      </a>

      <Navigation />
      <CapabilityBanner />

      <Stage />

      <Statusbar />

      {/* Mobile: the ZJBlog-style footer line — the desktop statusbar strip is
          hidden on small screens, so the copyright keeps its centered home. */}
      <div className="flex h-9 items-center justify-center border-t border-line/80 bg-bg text-xs text-ink-3 md:hidden">
        <span aria-hidden="true">
          © {new Date().getFullYear()} {siteConfig.copyright}
        </span>
      </div>

      <PhysicalKeyboard />
      <MouseInput />
      {virtualKeyboardOpen && <VirtualKeyboard onClose={() => setVirtualKeyboardOpen(false)} />}

      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <Toasts />
    </div>
  );
}

/** Honest capability notice: the KVM stack (serial injection, capture-card
 *  video, keyboard lock) is Chromium-desktop on a secure context. Browsers
 *  without it used to render silently dead buttons — say it up front. */
function CapabilityBanner() {
  const { t } = useI18n();
  const missing: string[] = [];
  if (!isSecureContext()) missing.push(t("browser.secureMissing"));
  if (!supportsSerial()) missing.push(t("browser.serialMissing"));
  if (!supportsMediaDevices()) missing.push(t("browser.mediaMissing"));
  if (missing.length === 0) return null;
  return (
    <div role="status" className="border-b border-warning/40 bg-warning/10 px-4 py-2 text-center text-xs text-ink-2">
      {missing.join(" · ")}
    </div>
  );
}
