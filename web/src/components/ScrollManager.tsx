import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Scroll behaviour on navigation:
//  - PUSH / REPLACE (following a link): start at the top of the new page.
//  - POP (browser Back/Forward): restore the scroll position we recorded for
//    that history entry, so returning from a forum lands you back on the exact
//    speaker/row you were reading.
// Anchored (#hash) navigations are left alone — the target page scrolls itself.
const positions = new Map<string, number>();

export default function ScrollManager() {
  const location = useLocation();
  const navType = useNavigationType();
  const key = location.key;

  // Take manual control so the browser's own restoration doesn't fight ours.
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  useEffect(() => {
    if (location.hash) return; // hash target handles its own scroll

    if (navType === "POP") {
      const y = positions.get(key);
      if (y != null) {
        // Content (lazy route chunk, list height, open cards) settles over
        // several frames; keep re-applying the target until we actually reach
        // it (the page may be too short to scroll that far for a moment) or a
        // short deadline passes.
        let raf = 0;
        const deadline = performance.now() + 800;
        const apply = () => {
          // Instant, not smooth: the global `scroll-behavior: smooth` would
          // otherwise animate every re-apply and the loop would never settle.
          window.scrollTo({ top: y, left: 0, behavior: "instant" as ScrollBehavior });
          if (window.scrollY < y - 2 && performance.now() < deadline) {
            raf = requestAnimationFrame(apply);
          }
        };
        raf = requestAnimationFrame(apply);
        return () => cancelAnimationFrame(raf);
      }
    }
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [key, navType, location.hash]);

  // Continuously record the scroll offset for the current history entry.
  // Only via the scroll event — NOT on cleanup: navigating to a shorter page
  // clamps window.scrollY before cleanup runs, which would overwrite the real
  // position we need to preserve for Back.
  useEffect(() => {
    const onScroll = () => positions.set(key, window.scrollY);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [key]);

  return null;
}
