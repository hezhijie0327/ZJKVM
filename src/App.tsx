import { getDefaultStore, useAtomValue, useSetAtom } from "jotai";
import { useEffect, useState } from "react";
import { ConnectGate } from "@/components/connect/ConnectGate";
import { MouseInput } from "@/components/input/AbsoluteMouse";
import { PhysicalKeyboard } from "@/components/input/PhysicalKeyboard";
import { VirtualKeyboard } from "@/components/keyboard/VirtualKeyboard";
import { AboutModal } from "@/components/shell/AboutModal";
import { Navigation } from "@/components/shell/Navigation";
import { Statusbar } from "@/components/shell/Statusbar";
import { Stage } from "@/components/stage/Stage";
import { Toasts } from "@/components/ui/Toasts";
import { mouseJiggler } from "@/lib/mouse-jiggler";
import * as storage from "@/lib/storage";
import { watchSystemTheme } from "@/lib/theme";
import {
  connectGateOpenAtom,
  customResolutionsAtom,
  demoModeAtom,
  jigglerAtom,
  macrosAtom,
  mouseModeAtom,
  mouseStyleAtom,
  resolutionAtom,
  rotationAtom,
  scaleModeAtom,
  serialStateAtom,
  statsVisibleAtom,
  toolbarCollapsedAtom,
  toolbarPosAtom,
  videoDeviceIdAtom,
  videoStateAtom,
  virtualKeyboardOpenAtom,
  wheelDirectionAtom,
  wheelIntervalAtom,
} from "@/state/atoms";
import { connectVideo, refreshVideoDevices, watchVideoHotplug } from "@/state/connection";

export default function App() {
  const [aboutOpen, setAboutOpen] = useState(false);

  const gateOpen = useAtomValue(connectGateOpenAtom);
  const setGateOpen = useSetAtom(connectGateOpenAtom);
  const virtualKeyboardOpen = useAtomValue(virtualKeyboardOpenAtom);
  const setVirtualKeyboardOpen = useSetAtom(virtualKeyboardOpenAtom);

  /* Boot: theme watching, device lists + hotplug, connect gate */
  useEffect(() => {
    watchSystemTheme();
    const unwatch = watchVideoHotplug();
    return unwatch;
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const store = getDefaultStore();
      if (
        store.get(videoStateAtom) === "disconnected" &&
        store.get(serialStateAtom) === "disconnected" &&
        !store.get(demoModeAtom)
      ) {
        setGateOpen(true);
      }
    }, 500);
    return () => window.clearTimeout(timer);
  }, [setGateOpen]);

  /* Jiggler mode follows the atom (also on boot) */
  const jiggler = useAtomValue(jigglerAtom);
  useEffect(() => {
    mouseJiggler.setMode(jiggler);
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
  const macros = useAtomValue(macrosAtom);
  const statsVisible = useAtomValue(statsVisibleAtom);
  const toolbarCollapsed = useAtomValue(toolbarCollapsedAtom);
  const toolbarPos = useAtomValue(toolbarPosAtom);

  useEffect(() => storage.setVideoDeviceId(videoDeviceId), [videoDeviceId]);
  useEffect(() => storage.setVideoResolution(resolution), [resolution]);
  useEffect(() => {
    try {
      localStorage.setItem("zjkvm-custom-resolutions", JSON.stringify(customResolutions));
    } catch {
      // ignore
    }
  }, [customResolutions]);
  useEffect(() => storage.setScaleMode(scaleMode), [scaleMode]);
  useEffect(() => storage.setVideoRotation(rotation), [rotation]);
  useEffect(() => storage.setMouseStyle(mouseStyle), [mouseStyle]);
  useEffect(() => storage.setMouseMode(mouseMode), [mouseMode]);
  useEffect(() => storage.setWheelDirection(wheelDirection), [wheelDirection]);
  useEffect(() => storage.setWheelInterval(wheelInterval), [wheelInterval]);
  useEffect(() => storage.setMacros(macros), [macros]);
  useEffect(() => storage.setStatsVisible(statsVisible), [statsVisible]);
  useEffect(() => storage.setToolbarCollapsed(toolbarCollapsed), [toolbarCollapsed]);
  useEffect(() => storage.setToolbarPos(toolbarPos), [toolbarPos]);

  /* Auto-open the saved capture card on boot (camera only; serial needs a click) */
  useEffect(() => {
    const saved = getDefaultStore().get(videoDeviceIdAtom);
    if (saved) {
      void refreshVideoDevices().then(() => connectVideo());
    }
  }, []);

  return (
    <div className="flex min-h-dvh flex-col bg-bg pb-[calc(3.75rem+env(safe-area-inset-bottom))] text-ink md:pb-0">
      <a
        href="#video"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-100 focus:rounded-full focus:bg-accent-strong focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-accent-contrast"
      >
        Video
      </a>

      <Navigation onAbout={() => setAboutOpen(true)} />

      <Stage />

      <Statusbar />

      <PhysicalKeyboard />
      <MouseInput />
      {virtualKeyboardOpen && <VirtualKeyboard onClose={() => setVirtualKeyboardOpen(false)} />}

      <ConnectGate open={gateOpen} onClose={() => setGateOpen(false)} />
      <AboutModal open={aboutOpen} onClose={() => setAboutOpen(false)} />
      <Toasts />
    </div>
  );
}
