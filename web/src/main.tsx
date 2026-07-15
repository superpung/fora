import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import "./styles/app.css";
import { ThemeProvider } from "./lib/theme";
import { I18nProvider } from "./lib/i18n";
import App from "./App";

// Follows are per-conference, so FollowProvider is mounted inside the conference
// layout (ConferenceLayout), not globally. Theme is a site-wide preference.
createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <I18nProvider>
          <App />
        </I18nProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
