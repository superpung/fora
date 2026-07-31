import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { useSearchUI } from "../lib/search-store";
import { buildSearchIndex, searchIndex, type SearchType, type ScoredRecord } from "../lib/search";
import { easeOut } from "../lib/motion";
import Icon, { type IconName } from "./Icon";

const TYPE_ICON: Record<SearchType, IconName> = {
  talk: "keynotes",
  speaker: "user",
  forum: "forums",
  committee: "committee",
  organization: "building",
};

const TYPE_LABEL: Record<SearchType, string> = {
  talk: "search.group.talk",
  speaker: "search.group.speaker",
  forum: "search.group.forum",
  committee: "search.group.committee",
  organization: "search.group.organization",
};

// Should a bare "/" keystroke open search? Not while the user is typing in a
// field (input/textarea/select/contenteditable) — there it's a literal slash.
function isTypingTarget(el: EventTarget | null): boolean {
  const node = el as HTMLElement | null;
  if (!node) return false;
  const tag = node.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT" || node.isContentEditable;
}

export default function SearchPalette() {
  const views = useConference();
  const { open, setOpen } = useSearchUI();
  const { t, lang } = useI18n();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  // The index is pure and only depends on the dataset + language; rebuild it
  // when the conference or UI language changes, not on every keystroke.
  // `t` is memoised per language (useCallback in the i18n provider), so this
  // only rebuilds when the dataset or language actually changes.
  const index = useMemo(() => buildSearchIndex(views, views.id, lang, t), [views, lang, t]);

  const groups = useMemo(() => searchIndex(index, query), [index, query]);

  // Flatten the (already grouped) results into one ordered list so ↑/↓ move
  // across group boundaries and ↵ opens whatever is highlighted.
  const flat = useMemo<ScoredRecord[]>(() => groups.flatMap((g) => g.items), [groups]);

  // Global open shortcuts: ⌘K / Ctrl-K anywhere, or "/" when not already typing.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.key === "k" || e.key === "K") && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen(true);
      } else if (e.key === "/" && !isTypingTarget(e.target) && !open) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, setOpen]);

  // Reset + autofocus each time the palette opens.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setSelected(0);
    // Focus after the enter animation has begun so the caret lands reliably.
    const id = window.setTimeout(() => inputRef.current?.focus(), 20);
    return () => window.clearTimeout(id);
  }, [open]);

  // Keep the selection in range as results change.
  useEffect(() => {
    setSelected((s) => (flat.length === 0 ? 0 : Math.min(s, flat.length - 1)));
  }, [flat.length]);

  // Keep the highlighted row visible while arrowing through a long list.
  useEffect(() => {
    if (!open) return;
    document
      .getElementById(`search-opt-${selected}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [selected, open]);

  function go(rec: ScoredRecord) {
    setOpen(false);
    navigate(rec.to);
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelected((s) => (flat.length ? (s + 1) % flat.length : 0));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelected((s) => (flat.length ? (s - 1 + flat.length) % flat.length : 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const rec = flat[selected];
      if (rec) go(rec);
    }
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="cmdk"
          role="dialog"
          aria-modal="true"
          aria-label={t("search.open")}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.14, ease: easeOut }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <motion.div
            className="cmdk__panel"
            initial={{ opacity: 0, y: -10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            transition={{ duration: 0.18, ease: easeOut }}
            onKeyDown={onKeyDown}
          >
            <div className="cmdk__searchrow">
              <span className="cmdk__searchicon" aria-hidden>
                <Icon name="search" size={17} />
              </span>
              <input
                ref={inputRef}
                className="cmdk__input"
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={t("search.placeholder")}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setSelected(0);
                }}
                aria-label={t("search.placeholder")}
                aria-activedescendant={flat[selected] ? `search-opt-${selected}` : undefined}
              />
              <button
                className="cmdk__esc"
                onClick={() => setOpen(false)}
                aria-label={t("common.close")}
              >
                Esc
              </button>
            </div>

            <div className="cmdk__results" role="listbox">
              {query.trim() === "" ? (
                <div className="cmdk__hint">{t("search.startTyping")}</div>
              ) : flat.length === 0 ? (
                <div className="cmdk__hint">{t("search.empty")}</div>
              ) : (
                (() => {
                  let flatIdx = -1;
                  return groups.map((g) => (
                    <div className="cmdk__group" key={g.type}>
                      <div className="cmdk__grouphead">
                        <Icon name={TYPE_ICON[g.type]} size={13} />
                        <span>{t(TYPE_LABEL[g.type])}</span>
                        <span className="cmdk__groupn">{g.total}</span>
                      </div>
                      {g.items.map((rec) => {
                        flatIdx += 1;
                        const i = flatIdx;
                        const active = i === selected;
                        return (
                          <button
                            key={rec.id}
                            id={`search-opt-${i}`}
                            role="option"
                            aria-selected={active}
                            className={`cmdk__opt ${active ? "is-active" : ""}`}
                            onMouseMove={() => setSelected(i)}
                            onClick={() => go(rec)}
                          >
                            <span className="cmdk__opticon" aria-hidden>
                              <Icon name={TYPE_ICON[g.type]} size={15} />
                            </span>
                            <span className="cmdk__opttext">
                              <span className="cmdk__opttitle">
                                {rec.title || (
                                  <span className="muted-i">{t("search.talkTbd")}</span>
                                )}
                              </span>
                              {rec.subtitle && (
                                <span className="cmdk__optsub">{rec.subtitle}</span>
                              )}
                            </span>
                            <span className="cmdk__optchev" aria-hidden>
                              <Icon name="chevron-right" size={15} />
                            </span>
                          </button>
                        );
                      })}
                      {g.total > g.items.length && (
                        <div className="cmdk__more">
                          {t("search.moreInGroup", { n: g.total - g.items.length })}
                        </div>
                      )}
                    </div>
                  ));
                })()
              )}
            </div>

            <div className="cmdk__footer">
              <span><kbd>↑</kbd><kbd>↓</kbd> {t("search.footNav")}</span>
              <span><kbd>↵</kbd> {t("search.footOpen")}</span>
              <span><kbd>esc</kbd> {t("search.footClose")}</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
