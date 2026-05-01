import { createRoot } from "react-dom/client";
import "./index.css";

const rootEl = document.getElementById("root")!;

/**
 * Last-resort fallback if React itself never mounts (e.g. import-time error
 * in a module loaded before any boundary). Paints a minimal "Something went
 * wrong" screen directly into #root so the user never sees a silent blank page.
 */
function paintFatalFallback(message: string) {
  if (rootEl.childElementCount > 0) return; // React already rendered something
  rootEl.innerHTML = `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;
                font-family:system-ui,sans-serif;background:#0f172a;color:#e2e8f0;padding:24px;">
      <div style="max-width:560px;text-align:center;">
        <p style="font-size:12px;letter-spacing:.2em;text-transform:uppercase;color:#94a3b8;margin:0 0 8px;">
          Fatal error
        </p>
        <h1 style="font-size:24px;margin:0 0 12px;">Something went wrong</h1>
        <pre style="font-size:12px;white-space:pre-wrap;text-align:left;color:#fca5a5;
                    background:#1e293b;padding:12px;border-radius:8px;overflow:auto;max-height:40vh;">${message
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")}</pre>
        <button onclick="window.location.reload()"
                style="margin-top:16px;padding:8px 20px;background:#06b6d4;color:#0f172a;
                       border:0;border-radius:6px;font-weight:600;cursor:pointer;">
          Reload
        </button>
      </div>
    </div>`;
}

window.addEventListener("error", (e) => {
  // eslint-disable-next-line no-console
  console.error("[global error]", e.error ?? e.message);
  paintFatalFallback(String(e.error?.stack ?? e.message ?? "Unknown error"));
});

window.addEventListener("unhandledrejection", (e) => {
  // eslint-disable-next-line no-console
  console.error("[unhandled rejection]", e.reason);
  paintFatalFallback(String(e.reason?.stack ?? e.reason ?? "Unhandled promise rejection"));
});

async function bootstrap() {
  const [{ default: App }, { ErrorBoundary }] = await Promise.all([
    import("./App.tsx"),
    import("./shared/components/ErrorBoundary"),
  ]);

  createRoot(rootEl).render(
    <ErrorBoundary label="App">
      <App />
    </ErrorBoundary>
  );
}

try {
  bootstrap().catch((err) => {
    // eslint-disable-next-line no-console
    console.error("[bootstrap failed]", err);
    paintFatalFallback(String((err as Error)?.stack ?? err));
  });
} catch (err) {
  // eslint-disable-next-line no-console
  console.error("[mount failed]", err);
  paintFatalFallback(String((err as Error)?.stack ?? err));
}
