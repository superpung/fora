import { useState, useEffect, useRef, useLayoutEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useParams, Link, useLocation, useNavigate } from "react-router-dom";
import { formatDate } from "../lib/data";
import { useConference } from "../lib/conference-store";
import { useFollow, talkId } from "../lib/follow-store";
import { useI18n } from "../lib/i18n-store";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import PosterModal from "../components/PosterModal";
import type { PosterSpec, PosterMeta } from "../lib/poster";
import type { Person, Talk } from "../types";

/** "2025年11月27–30日" — a compact CN date range, collapsing shared year/month. */
function confDateRange(start: string, end: string): string {
  const [ys, ms, ds] = start.split("-").map((n) => parseInt(n, 10));
  const [ye, me, de] = end.split("-").map((n) => parseInt(n, 10));
  if (!ye || !me || !de || (ys === ye && ms === me && ds === de))
    return `${ys}年${ms}月${ds}日`;
  if (ys === ye && ms === me) return `${ys}年${ms}月${ds}–${de}日`;
  if (ys === ye) return `${ys}年${ms}月${ds}日–${me}月${de}日`;
  return `${ys}年${ms}月${ds}日–${ye}年${me}月${de}日`;
}

function accentColor(): string {
  if (typeof document === "undefined") return "#0070f3";
  return (
    getComputedStyle(document.documentElement).getPropertyValue("--accent").trim() ||
    "#0070f3"
  );
}

const toMin = (t: string): number => {
  const [h, m] = t.split(":").map((x) => parseInt(x, 10));
  return h * 60 + (m || 0);
};

/** Some forums run two (or more) rooms in parallel but store the whole agenda as
    one flat talks[] — the second room's schedule is appended after the first and
    its clock resets to the morning. When forum.room names N rooms, split the
    talks back into N tracks at each backward time jump, mapping track k to the
    k-th room. Returns null when the shape doesn't match (single room, or the
    reset-count ≠ room-count — e.g. a multi-day competition), so those forums keep
    the normal single continuous timeline. */
function splitParallelTracks(
  talks: Talk[],
  rooms: string[],
): { room: string; talks: { t: Talk; i: number }[] }[] | null {
  if (rooms.length < 2) return null;
  const segs: { t: Talk; i: number }[][] = [];
  let cur: { t: Talk; i: number }[] = [];
  let prev = -1;
  talks.forEach((t, i) => {
    const s = t.start ? toMin(t.start) : null;
    if (s !== null && prev !== -1 && s < prev && cur.length) {
      segs.push(cur);
      cur = [];
    }
    if (s !== null) prev = s;
    cur.push({ t, i });
  });
  if (cur.length) segs.push(cur);
  if (segs.length !== rooms.length) return null;
  return segs.map((tk, k) => ({ room: rooms[k], talks: tk }));
}

function PersonLine({ p, role, avatarSize = 40 }: { p: Person; role?: string; avatarSize?: number }) {
  const [open, setOpen] = useState(false);
  const { isSpeaker, toggleSpeaker } = useFollow();
  const { t } = useI18n();
  const followed = p.name ? isSpeaker(p.name) : false;
  return (
    <div className="person">
      <Avatar person={p} size={avatarSize} />
      <div className="person__main">
        <div className="person__head">
          <span className="person__name">{p.name}</span>
          {p.name && (
            <button
              className={`star star--sm ${followed ? "is-on" : ""}`}
              aria-pressed={followed}
              aria-label={followed ? t("common.followRemove", { name: p.name }) : t("common.followAdd", { name: p.name })}
              title={followed ? t("common.followRemove", { name: p.name }) : t("common.followAdd", { name: p.name })}
              onClick={() => toggleSpeaker(p.name)}
            >
              <Icon name="star" filled={followed} size={15} />
            </button>
          )}
          {role && <span className="person__role">{role}</span>}
          {p.honorifics?.map((h) => (
            <span key={h} className="tag">{h}</span>
          ))}
        </div>
        <div className="person__aff">{p.affiliation_raw}</div>
        {p.bio && (
          <>
            <button className="person__toggle" onClick={() => setOpen((v) => !v)}>
              {open ? t("forum.hideBio") : t("forum.showBio")}
              <span className={`caret ${open ? "caret--up" : ""}`}>
                <Icon name="chevron-down" size={14} />
              </span>
            </button>
            <AnimatePresence initial={false}>
              {open && (
                <motion.p
                  className="person__bio"
                  initial={{ height: 0, opacity: 0, marginTop: 0 }}
                  animate={{ height: "auto", opacity: 1, marginTop: 8 }}
                  exit={{ height: 0, opacity: 0, marginTop: 0 }}
                  transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                >
                  {p.bio}
                </motion.p>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </div>
  );
}

/** A speaker who carries real detail (affiliation / bio / title / honorifics)
    deserves the full PersonLine card; a bare name (the common paper co-author)
    does not — see AuthorChip below. */
function isRichPerson(p: Person): boolean {
  return !!(
    p.affiliation_raw ||
    p.organization ||
    p.title ||
    p.bio ||
    (p.honorifics && p.honorifics.length > 0) ||
    p.photo
  );
}

/** A compact, wrappable entry for a name-only co-author. Many papers list 5–8
    authors; stacking each as a full PersonLine (big avatar + affiliation + bio
    toggle) wastes enormous vertical space, so bare names collapse into a single
    horizontal row. The colored letter avatar is kept; only the star toggles
    following (avatar + name are not clickable), matching PersonLine. */
function AuthorChip({ p }: { p: Person }) {
  const { isSpeaker, toggleSpeaker } = useFollow();
  const { t } = useI18n();
  if (!p.name) return null;
  const followed = isSpeaker(p.name);
  return (
    <span className="authorchip">
      <Avatar person={p} size={24} />
      <span className="authorchip__name">{p.name}</span>
      <button
        className={`star star--sm ${followed ? "is-on" : ""}`}
        aria-pressed={followed}
        aria-label={followed ? t("common.followRemove", { name: p.name }) : t("common.followAdd", { name: p.name })}
        title={followed ? t("common.followRemove", { name: p.name }) : t("common.followAdd", { name: p.name })}
        onClick={() => toggleSpeaker(p.name)}
      >
        <Icon name="star" filled={followed} size={13} />
      </button>
    </span>
  );
}

/** A talk abstract, clamped to three lines by default with a 展开/收起 toggle
    that animates the height open/closed (same house easing as the bio / talk
    sublist). The toggle only appears when the text actually overflows. */
function Abstract({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const { t } = useI18n();
  const [dims, setDims] = useState<{ clamped: number; full: number } | null>(null);
  const ref = useRef<HTMLParagraphElement>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const prev = el.style.height;
    el.style.height = "auto";
    const full = el.scrollHeight;
    el.style.height = prev;
    const lh = parseFloat(getComputedStyle(el).lineHeight) || 22;
    const clamped = Math.min(full, Math.round(lh * 3) + 2); // ~3 lines
    setDims({ clamped, full });
  }, [text]);
  const overflowing = dims ? dims.full - dims.clamped > 4 : false;
  return (
    <div className="talk__abstract">
      <motion.p
        ref={ref}
        className="talk__abstracttext"
        style={{ overflow: "hidden" }}
        initial={false}
        animate={{ height: dims ? (open ? dims.full : dims.clamped) : "auto" }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        {text}
      </motion.p>
      {(overflowing || open) && (
        <button className="talk__absmore" onClick={() => setOpen((v) => !v)}>
          {open ? t("common.collapse") : t("common.expand")}
          <span className={`caret ${open ? "caret--up" : ""}`}>
            <Icon name="chevron-down" size={13} />
          </span>
        </button>
      )}
    </div>
  );
}

export default function ForumDetail() {
  const { id: confId, conference, getForum, officialAssetUrl } = useConference();
  const { code } = useParams();
  const { hash } = useLocation();
  const navigate = useNavigate();
  const forum = code ? getForum(code) : undefined;
  const { isForum, toggleForum, isTalk, toggleTalk } = useFollow();
  const { t: tr, lang } = useI18n();
  const forumFollowed = code ? isForum(code) : false;
  const [copied, setCopied] = useState<number | null>(null);
  const [poster, setPoster] = useState<{ spec: PosterSpec; filename: string } | null>(null);

  // The talk pointed at by the URL hash (1-based, e.g. #talk-3) stays highlighted
  // for as long as the hash is present — it's a shareable anchor, not a flash.
  const activeId = hash.startsWith("#talk-") ? hash.slice(1) : null;
  // Prefer the official article page (general_NNNN); fall back to the CMS poster.
  const officialUrl = forum?.source_url ?? officialAssetUrl(forum?.poster?.source_url);

  // deep-link: scroll to the anchored talk when arriving with / changing #talk-<n>.
  // We scroll to the element's untransformed LAYOUT top (summed offsetTop, which
  // ignores the enter animation's transform), minus the sticky-nav height.
  //
  // The catch: the page keeps relaying out AFTER the first frame — each Abstract
  // clamps its height in a useLayoutEffect (content above the target shrinks) and
  // avatars load — so a one-shot scroll lands too low. Re-run the scroll a few
  // times over ~0.5s so the final position is measured once the layout has
  // settled. Instant scrolls (not smooth) so the corrections don't visibly jitter.
  // A regression test guards this — see web/tests/permalink-scroll.mjs.
  useEffect(() => {
    if (!activeId) return;
    if (!document.getElementById(activeId)) return;
    let cancelled = false;
    const scrollToAnchor = () => {
      const el = document.getElementById(activeId);
      if (!el || cancelled) return;
      let top = 0;
      let node: HTMLElement | null = el;
      while (node) {
        top += node.offsetTop;
        node = node.offsetParent as HTMLElement | null;
      }
      const navH =
        parseInt(
          getComputedStyle(document.documentElement).getPropertyValue("--nav-h"),
          10,
        ) || 56;
      window.scrollTo({ top: Math.max(0, top - navH - 16), behavior: "auto" });
    };
    const timers = [0, 90, 220, 450].map((d) => window.setTimeout(scrollToAnchor, d));
    return () => {
      cancelled = true;
      timers.forEach((t) => clearTimeout(t));
    };
  }, [activeId, forum]);

  // Copy a talk's shareable permalink and move the URL hash to it (so it lights up).
  function shareTalk(i: number) {
    const anchor = `talk-${i + 1}`;
    const url = `${window.location.origin}${window.location.pathname}#${anchor}`;
    navigator.clipboard?.writeText(url).catch(() => {});
    navigate(`#${anchor}`, { replace: false });
    setCopied(i);
    window.setTimeout(() => setCopied((c) => (c === i ? null : c)), 1600);
  }

  if (!forum) {
    return (
      <div className="container section">
        <p>{tr("forum.notFound", { code: code ?? "" })}</p>
        <Link to={`/${confId}/schedule`} className="linkbtn">{tr("forum.backToSchedule")}</Link>
      </div>
    );
  }

  const dateInfo = forum.day_date ? formatDate(forum.day_date, lang) : null;
  // When any talk carries a start time, render the talks on a vertical time rail;
  // otherwise fall back to the numbered card list (untimed forums / conferences).
  const timed = (forum.talks ?? []).some((t) => t.start);
  // A forum whose room lists several rooms (e.g. "厅A 、 厅B") runs those rooms
  // in parallel; split its flat agenda into one timeline per room.
  const roomParts = (forum.room ?? "")
    .split(/[、，,]/)
    .map((s) => s.trim())
    .filter(Boolean);
  const tracks = timed ? splitParallelTracks(forum.talks ?? [], roomParts) : null;

  const shareUrl = () => `${window.location.origin}${window.location.pathname}`;
  // Conference-level identity, shared by both posters.
  const confDate = confDateRange(conference.start_date, conference.end_date);
  const mainVenue =
    conference.venues?.find((v) => v.type === "main") ?? conference.venues?.[0];
  const confVenue = mainVenue?.name.zh ?? null;
  const confLocation = mainVenue?.city ? `中国·${mainVenue.city}` : null;

  // Build the forum-level share poster (title + chairs + every talk).
  function openForumPoster() {
    const f = forum!;
    const metaLines: PosterMeta[] = [];
    if (dateInfo)
      metaLines.push({
        icon: "calendar",
        text:
          `${dateInfo.md} ${dateInfo.weekday}` +
          (f.session_period ? ` · ${tr(`period.${f.session_period}`)}` : ""),
      });
    if (f.room) metaLines.push({ icon: "pin", text: f.room });
    const chairs = (f.chairs ?? []).map((c) => ({ name: c.name, aff: c.affiliation_raw }));
    const talks = (f.talks ?? []).map((t, i) => ({
      index: i + 1,
      title:
        t.title_status === "tbd" || !t.title?.zh ? tr("forum.titleTbd") : t.title.zh,
      time: t.start ? `${t.start}${t.end ? `–${t.end}` : ""}` : null,
      speakers: (t.speakers ?? []).map((s) => ({ name: s.name, aff: s.affiliation_raw })),
    }));
    setPoster({
      spec: {
        confName: conference.name.zh,
        confDate,
        confVenue,
        confLocation,
        chip: f.category?.name.zh ?? tr("poster.kindForum"),
        code: f.code,
        title: f.title.zh,
        metaLines,
        accent: accentColor(),
        qrUrl: shareUrl(),
        peopleLabel: chairs.length ? tr("forum.chairs") : undefined,
        people: chairs,
        talksLabel: talks.length ? tr("poster.talksLabel", { n: talks.length }) : undefined,
        talks,
      },
      filename: `${conference.name.zh}-${f.code}.png`,
    });
  }

  // Build a single report's share poster (title + speakers + full abstract).
  function openTalkPoster(t: Talk, i: number) {
    const f = forum!;
    const time = t.start ? `${t.start}${t.end ? `–${t.end}` : ""}` : "";
    const when = [dateInfo ? `${dateInfo.md} ${dateInfo.weekday}` : "", time]
      .filter(Boolean)
      .join(" · ");
    const metaLines: PosterMeta[] = [];
    if (when) metaLines.push({ icon: "clock", text: when });
    if (f.room) metaLines.push({ icon: "pin", text: f.room });
    metaLines.push({ icon: "forums", text: f.title.zh });
    const speakers = (t.speakers ?? []).map((s) => ({ name: s.name, aff: s.affiliation_raw }));
    const abstract = t.abstract && t.abstract_status !== "tbd" ? t.abstract : null;
    setPoster({
      spec: {
        confName: conference.name.zh,
        confDate,
        confVenue,
        confLocation,
        chip: f.category?.name.zh ?? tr("poster.kindTalk"),
        code: f.code,
        title:
          t.title_status === "tbd" || !t.title?.zh ? tr("forum.titleTbd") : t.title.zh,
        metaLines,
        accent: accentColor(),
        qrUrl: `${shareUrl()}#talk-${i + 1}`,
        peopleLabel: speakers.length ? tr("poster.speakers") : undefined,
        people: speakers,
        abstractLabel: abstract ? tr("poster.abstractLabel") : undefined,
        abstract,
      },
      filename: `${conference.name.zh}-${f.code}-${i + 1}.png`,
    });
  }

  // One talk, rendered for either the timeline rail or the numbered card list.
  // Extracted so the parallel-track branch can reuse it per track.
  function renderTalk(t: Talk, i: number) {
    const id = talkId(forum!.code, i);
    const followed = isTalk(id);
    const anchor = `talk-${i + 1}`;
    const isActive = activeId === anchor;
    const body = (
      <>
        <div className="talk__titlerow">
          {!timed && (t.start || t.end) && (
            <span className="talk__time">
              {t.start}
              {t.end ? `–${t.end}` : ""}
            </span>
          )}
          <h3 className="talk__title">
            {t.title_status === "tbd" ? (
              <span className="muted-i">{tr("forum.titleTbd")}</span>
            ) : (
              t.title?.zh
            )}
          </h3>
          <button
            className="iconbtn talk__poster"
            aria-label={tr("poster.makeTalk")}
            title={tr("poster.makeTalk")}
            onClick={() => openTalkPoster(t, i)}
          >
            <Icon name="image" size={15} />
          </button>
          <button
            className={`iconbtn talk__perma ${copied === i ? "is-copied" : ""}`}
            aria-label={tr("forum.copyLink")}
            title={copied === i ? tr("forum.linkCopied") : tr("forum.copyShareLink")}
            onClick={() => shareTalk(i)}
          >
            <Icon name={copied === i ? "check" : "link"} size={15} />
          </button>
          <button
            className={`star star--sm talk__star ${followed ? "is-on" : ""}`}
            aria-pressed={followed}
            aria-label={followed ? tr("common.talkFollowRemove") : tr("common.talkFollowAdd")}
            title={followed ? tr("common.talkFollowRemove") : tr("common.talkFollowAdd")}
            onClick={() => toggleTalk(id)}
          >
            <Icon name="star" filled={followed} size={16} />
          </button>
        </div>
        {t.flags?.length ? (
          <div className="talk__flag" title={t.flags.join("\n")}>
            <Icon name="alert" size={13} /> {tr("forum.sourceAnnotated")}
          </div>
        ) : null}
        {(() => {
          const speakers = t.speakers ?? [];
          const rich = speakers.filter(isRichPerson);
          const bare = speakers.filter((p) => !isRichPerson(p));
          return (
            <>
              {rich.map((sp, j) => (
                <PersonLine key={`r${j}`} p={sp} avatarSize={34} />
              ))}
              {bare.length > 0 && (
                <div className="talk__authors">
                  {bare.map((sp, j) => (
                    <AuthorChip key={`b${j}`} p={sp} />
                  ))}
                </div>
              )}
            </>
          );
        })()}
        {t.abstract ? (
          <Abstract text={t.abstract} />
        ) : t.abstract_status === "tbd" ? (
          <p className="talk__abstract muted-i">{tr("forum.abstractTbd")}</p>
        ) : null}
      </>
    );

    if (timed) {
      return (
        <motion.article
          key={i}
          id={anchor}
          variants={riseItem}
          className={`tlrow ${isActive ? "tlrow--active" : ""} ${
            t.start ? "" : "tlrow--notime"
          }`}
        >
          <div className="tlrow__time">
            {t.start ? (
              <>
                <span className="tlrow__start mono">{t.start}</span>
                {t.end && <span className="tlrow__end mono">{t.end}</span>}
              </>
            ) : (
              <span className="tlrow__tbd">—</span>
            )}
          </div>
          <div className="tlrow__rail" aria-hidden>
            <span className="tlrow__dot" />
          </div>
          <div className="tlrow__card">{body}</div>
        </motion.article>
      );
    }

    return (
      <motion.article
        key={i}
        id={anchor}
        variants={riseItem}
        className={`talk ${isActive ? "talk--active" : ""}`}
      >
        <div className="talk__no">{String(i + 1).padStart(2, "0")}</div>
        <div className="talk__body">{body}</div>
      </motion.article>
    );
  }

  return (
    <motion.div
      className="container section forumdetail"
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
    >
      <header className="fd__header">
        <div className="fd__titlerow">
          <h1 className="fd__title">{forum.title.zh}</h1>
          <div className="fd__actions">
            <button
              className={`followbtn ${forumFollowed ? "is-on" : ""}`}
              onClick={() => code && toggleForum(code)}
            >
              <Icon name="star" filled={forumFollowed} size={15} />
              {forumFollowed ? tr("forum.saved") : tr("forum.save")}
            </button>
            <button
              className="btn btn--ghost"
              onClick={openForumPoster}
              title={tr("poster.makeForum")}
            >
              <Icon name="image" size={15} /> {tr("poster.forum")}
            </button>
            {officialUrl && (
              <a
                className="btn btn--ghost"
                href={officialUrl}
                target="_blank"
                rel="noreferrer"
                title={tr("forum.viewOfficial")}
              >
                <Icon name="external" size={15} /> {tr("forum.official")}
              </a>
            )}
          </div>
        </div>
        <div className="fd__meta">
          <span className="fd__code">{forum.code}</span>
          {forum.category && <span className="fd__cat">{forum.category.name.zh}</span>}
          {forum.room && (
            <span className="fd__room">
              <Icon name="pin" size={13} /> {forum.room}
            </span>
          )}
          {dateInfo && (
            <span>
              <Icon name="calendar" size={13} /> {dateInfo.md} {dateInfo.weekday}
              {forum.session_period && ` · ${tr(`period.${forum.session_period}`)}`}
            </span>
          )}
          {forum.sponsor && (
            <span className="fd__sponsor">
              <Icon name="building" size={13} /> {tr("forum.sponsorSession", { sponsor: forum.sponsor })}
            </span>
          )}
        </div>
      </header>

      {forum.description && (
        <motion.p variants={riseItem} initial="initial" animate="animate" className="fd__desc">
          {forum.description}
        </motion.p>
      )}

      {forum.chairs && forum.chairs.length > 0 && (
        <section className="fd__section">
          <h2 className="fd__sectitle">{tr("forum.chairs")}</h2>
          <div className="fd__people">
            {forum.chairs.map((c, i) => (
              <PersonLine key={i} p={c} role={c.chair_role ?? tr("forum.chairRole")} />
            ))}
          </div>
        </section>
      )}

      {forum.detail_extracted && forum.talks && forum.talks.length > 0 ? (
        <section className="fd__section">
          <h2 className="fd__sectitle">
            {tr("forum.talks")} <span className="fd__seccount">{forum.talks.length}</span>
          </h2>
          {tracks ? (
            tracks.map((track, k) => (
              <div className="fd__track" key={k}>
                <div className="fd__trackhead">
                  <Icon name="pin" size={14} />
                  <span className="fd__trackroom">{track.room}</span>
                  <span className="fd__tracktag">{tr("forum.track", { n: k + 1 })}</span>
                </div>
                <motion.div
                  className="tline"
                  variants={stagger(0.04, 0.05)}
                  initial={activeId ? false : "initial"}
                  animate="animate"
                >
                  {track.talks.map(({ t, i }) => renderTalk(t, i))}
                </motion.div>
              </div>
            ))
          ) : (
            <motion.div
              className={timed ? "tline" : "tallist"}
              variants={stagger(0.04, 0.05)}
              initial={activeId ? false : "initial"}
              animate="animate"
            >
              {forum.talks.map((t, i) => renderTalk(t, i))}
            </motion.div>
          )}
        </section>
      ) : (
        <section className="fd__section">
          <div className="pending">
            <div className="pending__title">{tr("forum.pendingTitle")}</div>
            <p className="pending__text">{tr("forum.pendingText")}</p>
          </div>
        </section>
      )}

      <PosterModal
        spec={poster?.spec ?? null}
        filename={poster?.filename ?? "poster.png"}
        onClose={() => setPoster(null)}
      />
    </motion.div>
  );
}
