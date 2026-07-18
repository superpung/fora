import { useEffect, useState } from "react";

// Touch devices have no hover, so the compressed timeline cells can't reveal
// their full content the way desktop does on hover. On a coarse pointer we
// switch to tap-to-expand: the first tap opens the card in place (with an
// explicit enter button to navigate); a second tap — or tapping another card —
// collapses it. Shared by TimeGrid and UntimedForumGrid so both boards behave
// the same on touch.
export function useCoarsePointer(): boolean {
  const [coarse, setCoarse] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mq = window.matchMedia("(hover: none)");
    const sync = () => setCoarse(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return coarse;
}
