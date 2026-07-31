import { useAi } from "../lib/ai-store";
import { AiBadge } from "./AiMark";

// The one-line TL;DR of a talk — AI-generated, so it renders under the same
// governance contract as everything else derived from `talk.enrichment`:
// shown only while useAi().enabled, always carrying a provenance mark, and
// never replacing or editing the conference's own title/abstract (the full
// abstract stays exactly where it was, one tap away).
//
// Every surface renders it through this component so the gate and the mark
// cannot drift apart. Surfaces additionally place <AiNote /> once — see
// ForumDetail / SearchPalette. The text itself comes from `talkSummaryText`
// (ai-store), so non-React callers read the field exactly as the UI does.

/** The marked TL;DR line. Renders nothing when AI content is switched off or
    the talk has no summary, so a summary-less talk (and the whole app with the
    switch off) looks exactly as it did before this feature.
    `oneline` clips to a single ellipsised line for fixed-height list rows. */
export default function TalkSummary({
  text,
  oneline = false,
  className,
}: {
  text: string | null;
  oneline?: boolean;
  className?: string;
}) {
  const { enabled } = useAi();
  if (!enabled || !text) return null;
  return (
    <span
      className={`talksum${oneline ? " talksum--oneline" : ""}${
        className ? ` ${className}` : ""
      }`}
    >
      <AiBadge className="talksum__badge" />
      <span className="talksum__text">{text}</span>
    </span>
  );
}
