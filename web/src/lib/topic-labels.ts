import type { Lang } from "./i18n-store";
import vocabulary from "../../../source/topics.json";

// Display labels for the enrichment topic vocabulary. A talk's
// `enrichment.topics[]` stores VOCABULARY KEYS, and `source/topics.json` is the
// single authority for those keys and their bilingual labels.
//
// That file is imported DIRECTLY — there is deliberately no hand-copied table
// here. A copy would silently drift the moment the pipeline's vocabulary grew,
// and the drift would surface as topics rendering as bare keys, or as an English
// query failing to reach a Chinese topic. One source, no sync step.
//
// Labels are what let an English query reach a Chinese topic: a search for
// "in-memory computing" meets 存算一体's label "Compute-in-Memory". Keys remain
// the contract and labels are cosmetic, so an unknown key falls back to itself
// and a vocabulary the pipeline extends still renders correctly.
//
// Like every other use of `enrichment`, these labels are AI-derived and only
// reach the UI when the AI-content toggle is on.

interface TopicEntry {
  key: string;
  zh: string;
  en: string;
  /** Grouping in source/topics.json, for readability there only. */
  category?: string;
}

const TOPIC_LABELS: ReadonlyMap<string, TopicEntry> = new Map(
  (vocabulary.topics as TopicEntry[]).map((t) => [t.key, t]),
);

/** Localised label for a topic key (falls back to the key itself). */
export function topicLabel(key: string, lang: Lang): string {
  const l = TOPIC_LABELS.get(key);
  if (!l) return key;
  return lang === "en" ? l.en : l.zh;
}

/** The family a topic belongs to in the vocabulary (`se`, `systems`, `ai`, …),
    or undefined for a key the vocabulary does not carry. The topic graph groups
    by it — see `CATEGORY_HUE` in lib/topics.ts. */
export function topicCategory(key: string): string | undefined {
  return TOPIC_LABELS.get(key)?.category;
}

/** Both labels plus the key, lowercased — the text a topic contributes to a
    search/ranking document, so either language reaches the same talks. */
export function topicSearchText(key: string): string {
  const l = TOPIC_LABELS.get(key);
  return (l ? `${key} ${l.zh} ${l.en}` : key).toLowerCase();
}

/** The names this topic goes by, lowercased — the key and each label, with
    "A / B" labels split into their alternatives (存算一体 / CIM). Used to spot a
    topic the user named in prose. */
export function topicAliases(key: string): string[] {
  const l = TOPIC_LABELS.get(key);
  const parts = l ? [key, ...l.zh.split("/"), ...l.en.split("/")] : [key];
  return [...new Set(parts.map((p) => p.trim().toLowerCase()).filter((p) => p.length > 1))];
}
