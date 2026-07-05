"use client";

import { useEffect } from "react";

/** Registers the app-shell service worker. Production only — registering a
 * service worker during `next dev` is a well-known source of exactly the
 * bug we hit: it can intercept navigation requests and serve stale or
 * malformed responses while webpack/HMR is rebuilding chunks underneath it.
 * Silently no-ops on unsupported browsers too. */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") {
      // Actively unregister any SW left over from a previous production
      // build or an earlier buggy version, so dev never runs with one.
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
      return;
    }

    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Non-fatal — app works fully without the service worker.
      });
    });
  }, []);

  return null;
}
