"use client";

import { useEffect } from "react";

/**
 * Warns the user when navigating away with unsaved changes.
 * Covers both full page loads/unloads and in-app SPA navigation
 * (Next.js App Router navigations go through history.pushState).
 */
export function useUnsavedGuard(active: boolean, message = "You have unsaved changes. Leave without saving?") {
  useEffect(() => {
    if (!active) return;

    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = message;
      return message;
    }

    const originalPush = history.pushState.bind(history);
    const originalReplace = history.replaceState.bind(history);

    function guarded<T extends typeof history.pushState>(original: T, args: Parameters<T>) {
      if (!window.confirm(message)) {
        throw new DOMException("Navigation cancelled to preserve unsaved changes", "AbortError");
      }
      return (original as (...a: unknown[]) => void)(...args);
    }

    history.pushState = function (...args: Parameters<typeof history.pushState>) {
      return guarded(originalPush, args);
    };
    history.replaceState = function (...args: Parameters<typeof history.replaceState>) {
      return guarded(originalReplace, args);
    };

    window.addEventListener("beforeunload", onBeforeUnload);

    return () => {
      history.pushState = originalPush;
      history.replaceState = originalReplace;
      window.removeEventListener("beforeunload", onBeforeUnload);
    };
  }, [active, message]);
}
