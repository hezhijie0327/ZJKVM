import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "@/App";
import { I18nProvider } from "@/lib/i18n";
import { applyThemeStyle, readThemeStyle } from "@/lib/theme";
import "@/styles/global.css";

// Pre-paint theme already ran inline in index.html; re-apply for HMR safety
applyThemeStyle(readThemeStyle());

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <I18nProvider>
      <App />
    </I18nProvider>
  </StrictMode>,
);
