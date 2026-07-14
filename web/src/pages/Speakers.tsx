import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  formatDate,
  periodLabel,
  categoryLabel,
  type SpeakerAgg,
  type SpeakerTalk,
  type SpeakerCategory,
} from "../lib/data";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { pageVariants } from "../lib/motion";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";

// Which speaker cards are open, kept module-level so the state survives a trip
// to a forum page and back (paired with scroll restoration for req: browser Back
// returns you to exactly where you were).
const openCards = new Set<string>();

function TalkLine({ t }: { t: SpeakerTalk }) {
  const { id: confId } = useConference();
  const dateInfo = t.date ? formatDate(t.date) : null;
  const no = t.talkIndex != null ? String(t.talkIndex + 1).padStart(2, "0") : null;
  const body = (
    <span className="sptalk__body">
      <span className="sptalk__title">
        {no && <span className="sptalk__no mono">{no}</span>}
        {t.titleStatus === "tbd" ? (
          <span className="muted-i">题目待定</span>
        ) : (
          t.talkTitle?.zh
        )}
      </span>
      <span className="sptalk__meta">
        {t.isKeynote ? (
          <span className="sptalk__forum">{t.forumTitle}</span>
        ) : (
          <span className="sptalk__forum mono">{t.forumCode}</span>
        )}
        {t.room && (
          <span className="sptalk__room mono">
            <Icon name="pin" size={11} /> {t.room}
          </span>
        )}
        {dateInfo && (
          <span className="mono">
            {dateInfo.md}
            {t.period ? ` ${periodLabel[t.period]}` : ""}
          </span>
        )}
        {t.start && (
          <span className="sptalk__time mono">
            <Icon name="clock" size={11} /> {t.start}
            {t.end ? `–${t.end}` : ""}
          </span>
        )}
      </span>
    </span>
  );

  // keynotes aren't a forum page; forum talks deep-link to their 1-based position
  return t.forumCode ? (
    <Link
      to={`/${confId}/forum/${t.forumCode}#talk-${(t.talkIndex ?? 0) + 1}`}
      className="sptalk sptalk--link"
    >
      {body}
      <Icon name="chevron-right" size={16} />
    </Link>
  ) : (
    <div className="sptalk">{body}</div>
  );
}

function SpeakerCard({ s }: { s: SpeakerAgg }) {
  const [open, setOpen] = useState(() => openCards.has(s.name));
  const { isSpeaker, toggleSpeaker } = useFollow();
  const followed = isSpeaker(s.name);
  const p = s.person;

  const toggle = () =>
    setOpen((v) => {
      const next = !v;
      if (next) openCards.add(s.name);
      else openCards.delete(s.name);
      return next;
    });

  return (
    <div className={`spcard ${open ? "is-open" : ""}`}>
      <div className="spcard__head">
        <Avatar person={p} size={44} />
        <button className="spcard__main" onClick={toggle} aria-expanded={open}>
          <span className="spcard__name">{p.name}</span>
          {p.affiliation_raw && <span className="spcard__aff">{p.affiliation_raw}</span>}
        </button>
        <div className="spcard__side">
          <span className="spcard__cat">{categoryLabel[s.category]}</span>
          <span className="spcard__count mono">{s.talks.length} 场</span>
          <button
            className={`star star--sm ${followed ? "is-on" : ""}`}
            aria-pressed={followed}
            aria-label={followed ? `取消关注 ${s.name}` : `关注 ${s.name}`}
            title={followed ? `取消关注 ${s.name}` : `关注 ${s.name}`}
            onClick={() => toggleSpeaker(s.name)}
          >
            <Icon name="star" filled={followed} size={15} />
          </button>
          <button
            className="spcard__toggle"
            onClick={toggle}
            aria-expanded={open}
            aria-label={open ? "收起报告" : "展开报告"}
          >
            <span className={`caret ${open ? "caret--up" : ""}`}>
              <Icon name="chevron-down" size={16} />
            </span>
          </button>
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            className="spcard__talks"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          >
            {s.talks.map((t, i) => (
              <TalkLine key={i} t={t} />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const ALPHABET = [..."ABCDEFGHIJKLMNOPQRSTUVWXYZ", "#"];

export default function Speakers() {
  const { speakerList, speakerCategoryCounts } = useConference();
  const { speakers: followedSpeakers, isSpeaker } = useFollow();
  const [query, setQuery] = useState("");
  const [onlyFollowed, setOnlyFollowed] = useState(false);
  const [cat, setCat] = useState<SpeakerCategory | "all">("all");
  const q = query.trim().toLowerCase();

  // Only offer categories that actually have members (skip empty buckets, e.g. 其他).
  const CATS: (SpeakerCategory | "all")[] = [
    "all",
    ...(["university", "research", "industry", "other"] as SpeakerCategory[]).filter(
      (c) => speakerCategoryCounts[c] > 0,
    ),
  ];

  const visible = useMemo(
    () =>
      speakerList.filter((s) => {
        if (q && !s.search.includes(q)) return false;
        if (onlyFollowed && !isSpeaker(s.name)) return false;
        if (cat !== "all" && s.category !== cat) return false;
        return true;
      }),
    // isSpeaker changes whenever the followed set changes, so it's sufficient.
    [speakerList, q, onlyFollowed, isSpeaker, cat],
  );

  // Group the (already name-sorted) list by pinyin initial for the jump index.
  const groups = useMemo(() => {
    const m = new Map<string, SpeakerAgg[]>();
    for (const s of visible) {
      const k = s.initial || "#";
      const arr = m.get(k);
      if (arr) arr.push(s);
      else m.set(k, [s]);
    }
    return [...m.entries()].sort((a, b) =>
      a[0] === "#" ? 1 : b[0] === "#" ? -1 : a[0].localeCompare(b[0]),
    );
  }, [visible]);

  const activeLetters = new Set(groups.map((g) => g[0]));

  function jump(letter: string) {
    document.getElementById(`sp-${letter}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <motion.div
      className="container section"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <div className="section__head">
        <div className="section__titlerow">
          <span className="section__icon" aria-hidden>
            <Icon name="keynotes" size={19} />
          </span>
          <h2 className="section__title">讲者</h2>
        </div>
      </div>

      <div className="sptoolbar">
        <div className="search search--wide">
          <span className="search__icon" aria-hidden>
            <Icon name="search" size={15} />
          </span>
          <input
            className="search__input"
            type="search"
            placeholder="搜索讲者 / 单位 / 报告…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="search__clear" onClick={() => setQuery("")} aria-label="清除搜索">
              <Icon name="x" size={14} />
            </button>
          )}
        </div>
        <button
          className={`filterchip ${onlyFollowed ? "is-on" : ""}`}
          onClick={() => setOnlyFollowed((v) => !v)}
        >
          <Icon name="star" filled={onlyFollowed} size={14} />
          仅关注{followedSpeakers.size ? ` ${followedSpeakers.size}` : ""}
        </button>
      </div>

      <div className="spcats">
        {CATS.map((c) => (
          <button
            key={c}
            className={`chipfilter ${cat === c ? "is-on" : ""}`}
            onClick={() => setCat(c)}
          >
            {c === "all" ? "全部" : categoryLabel[c]}
            <span className="chipfilter__n">
              {c === "all" ? speakerList.length : speakerCategoryCounts[c]}
            </span>
          </button>
        ))}
      </div>

      <div className="spresult">共 {visible.length} 位</div>

      {visible.length === 0 ? (
        <div className="dash__empty">没有符合条件的讲者。</div>
      ) : (
        <div className="splayout">
          <div className="splist">
            {groups.map(([letter, list]) => (
              <div className="spgroup" id={`sp-${letter}`} key={letter}>
                <div className="spgroup__label mono">{letter}</div>
                {list.map((s) => (
                  <SpeakerCard key={s.name} s={s} />
                ))}
              </div>
            ))}
          </div>
          <nav className="spindex" aria-label="按姓名首字母定位">
            {ALPHABET.map((L) => (
              <button
                key={L}
                className="spindex__l"
                disabled={!activeLetters.has(L)}
                onClick={() => jump(L)}
              >
                {L}
              </button>
            ))}
          </nav>
        </div>
      )}
    </motion.div>
  );
}
