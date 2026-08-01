import { useCallback, useEffect, useRef } from "react";

// A horizontal strip that scrolls when its items do not fit: the nav links, the
// timeline's day tabs, the dashboard's day pills.
//
// Scrolling alone is not enough, and the way it failed was invisible from a
// desktop: at 390px the nav showed "Dashboard  Tim" — one and a half entries,
// cut mid-word against a hard edge — while the user stood on Plan. The other
// five views simply did not appear to exist, and the bar never showed where you
// were. Nothing was overflowing the page (that was fixed separately); the strip
// was quietly holding the rest of the site out of sight.
//
// So a strip needs two things beyond `overflow-x: auto`:
//
//   1. It must show WHERE YOU ARE. The active item is brought inside on mount
//      and whenever it changes — computed and applied as `scrollLeft` rather
//      than via `scrollIntoView`, which would also scroll the page vertically
//      and drag a fixed nav or a sticky tab row along with it.
//   2. It must show THERE IS MORE. `data-edge` says which sides are still
//      scrollable, and the stylesheet fades that side out (see `.hstrip`).
//      A hard cut reads as the end of the list; a fade reads as "keep going".
//
// Both are pure presentation — no state, so no re-render on scroll.

/** Room to leave between the active item and the container edge, wide enough
    that the item never comes to rest underneath the fade. It is a maximum, not
    a promise: on a 360px phone the nav strip is barely wider than one link, and
    insisting on 28px of clearance there would push the very item we are trying
    to reveal back out of sight. */
const REVEAL_PAD = 28;

/**
 * Wires a scrolling strip: returns the ref to put on the scroll container.
 * The container must carry the `hstrip` class for the fade to render, and mark
 * its current item with `is-active`.
 *
 * `deps` are the things that move the active item — the route, the selected
 * day, the language (which re-measures every label).
 */
export function useHScroll<T extends HTMLElement>(deps: unknown[]) {
  const ref = useRef<T>(null);

  const markEdges = useCallback(() => {
    const el = ref.current;
    if (!el) return;
    // A 1px slack: fractional layout widths otherwise leave a permanent fade on
    // a strip that is not actually scrollable.
    const left = el.scrollLeft > 1;
    const right = el.scrollWidth - el.clientWidth - el.scrollLeft > 1;
    el.dataset.edge = left && right ? "both" : left ? "left" : right ? "right" : "none";
  }, []);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    markEdges();
    el.addEventListener("scroll", markEdges, { passive: true });
    // The strip's own width changes with the viewport; its content's width
    // changes when labels do. Observing the container catches the first, and
    // `deps` covers the second.
    const ro = new ResizeObserver(markEdges);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", markEdges);
      ro.disconnect();
    };
  }, [markEdges]);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const active = el.querySelector<HTMLElement>(".is-active");
    if (active) {
      const a = active.getBoundingClientRect();
      const c = el.getBoundingClientRect();
      // Only ask for clearance the strip can actually spare. Where the item is
      // nearly as wide as the strip — or wider — this falls to 0 and the item
      // simply goes flush against the edge, which is the best that fits.
      const pad = Math.max(0, Math.min(REVEAL_PAD, (c.width - a.width) / 2));
      if (a.left < c.left + pad) el.scrollLeft -= c.left + pad - a.left;
      else if (a.right > c.right - pad) el.scrollLeft += a.right - (c.right - pad);
    }
    markEdges();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [markEdges, ...deps]);

  return ref;
}
