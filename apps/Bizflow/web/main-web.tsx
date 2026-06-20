// 1. Ensure a `process` global exists before the preload runs (import first).
import "./web-polyfill";

// 2. Run BizFlow's real preload. With Vite aliasing `electron` to our browser
//    shim, this sets window.api / window.electron exactly as in the desktop app
//    — but every call now travels over HTTP to the bridge server.
import "../src/preload/index";

// 3. Boot the real BizFlow React app, unchanged.
import "../src/renderer/src/assets/main.css";
import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "../src/renderer/src/App";
import ErrorBoundary from "../src/renderer/src/components/ErrorBoundary";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>
);
