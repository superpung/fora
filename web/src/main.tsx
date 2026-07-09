import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./styles/global.css";
import "./styles/app.css";
import { ThemeProvider } from "./lib/theme";
import { FollowProvider } from "./lib/follow";
import App from "./App";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <FollowProvider>
          <App />
        </FollowProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
);
