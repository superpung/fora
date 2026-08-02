import type { Talk } from "../types";

/** A talk's own title, or null when the source published none.
 *
 *  Only `confirmed` counts. The other two states also put words in the title
 *  column, and neither of them is a title: `tbd` is the placeholder the source
 *  prints for a title still to come ("（待确认）"), and `unknown` is what it
 *  prints for a slot that has no title of its own — a competition team's
 *  defence, a panel's guest row. Ranking, planning and the topic map ask this
 *  question, and for them the answer has to be no, or a label the source reused
 *  across seven slots becomes seven identical talks.
 */
export function ownTitle(t: Talk): string | null {
  if (t.title_status && t.title_status !== "confirmed") return null;
  return t.title?.zh || null;
}

/** What to put where the title goes.
 *
 *  `own` false means the text is the source's label for the slot, not a title,
 *  so callers mute it the way they already muted the pending-title line. The
 *  fallback is only reached when the source printed nothing at all.
 */
export function titleLine(t: Talk, fallback: string): { text: string; own: boolean } {
  const own = ownTitle(t);
  if (own !== null) return { text: own, own: true };
  return { text: t.title?.zh || fallback, own: false };
}
