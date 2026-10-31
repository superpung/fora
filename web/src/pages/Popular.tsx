import { HeatProvider } from "../lib/heat";
import { useSync } from "../lib/sync-store";
import { useClockMs } from "../lib/use-now";
import { relativeTime } from "../lib/relative-time";
import { useMemo } from "react";
import { Link, Navigate } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { HEAT_INTERVAL_MS, useHeat } from "../lib/heat-store";
import { useI18n } from "../lib/i18n-store";
import { useStickyState } from "../lib/sticky-state";
import { collectFollowedItems } from "../lib/export";
import { pageVariants, easeOut } from "../lib/motion";
import Icon from "../components/Icon";
import StarButton from "../components/StarButton";
import HeatValue from "../components/HeatValue";
import SegmentedControl from "../components/SegmentedControl";
import AgendaRow from "../components/AgendaRow";
import { ForumSummary, ForumActions } from "../components/ForumRowParts";
import { formatDate } from "../lib/data";

const rankedRow: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: (index: number) => ({ opacity: 1, y: 0,
    transition: { duration: 0.4, ease: easeOut, delay: Math.min(index, 5) * 0.025 } }),
};
export default function Popular() {
  const { heatEnabled } = useSync();
  const { id } = useConference();
  return heatEnabled ? <HeatProvider><Rankings /></HeatProvider> : <Navigate to={`/${id}`} replace />;
}
function Freshness() {
  const { updatedAt, nextRefreshAt, refreshing } = useHeat();
  const { lang } = useI18n();
  const zh = lang !== "en";
  const now = useClockMs(1000);
  const seconds = Math.max(0, Math.ceil((nextRefreshAt - now) / 1000));
  const remaining = useMemo(() => Math.max(0, (nextRefreshAt - Date.now()) / 1000), [nextRefreshAt]);
  return <span className="heat-freshness">
    <span role="status">{refreshing ? (zh ? "更新中" : "Updating") : updatedAt ? (zh ? `${relativeTime(updatedAt, true, now)}更新` : `Updated ${relativeTime(updatedAt, false, now)}`) : ""}</span>
    {!refreshing && nextRefreshAt > 0 && <span className="meta-bit"><svg width="20" height="20" viewBox="0 0 20 20" className="heat-countdown"
      role="progressbar" aria-label={zh ? "下次更新" : "Next update"} aria-valuemin={0} aria-valuemax={100}
      aria-valuenow={Math.min(100, Math.round(seconds / (HEAT_INTERVAL_MS / 1000) * 100))}
      aria-valuetext={`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}>
      <circle cx="10" cy="10" r="8" className="heat-countdown__track" />
      <motion.circle key={nextRefreshAt} cx="10" cy="10" r="8" initial={{ pathLength: Math.min(1, remaining / (HEAT_INTERVAL_MS / 1000)) }}
        animate={{ pathLength: 0 }} transition={{ duration: remaining, ease: "linear" }} />
    </svg><span className="heat-countdown__time mono" aria-hidden>{Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}</span></span>}
  </span>;
}
function Rankings() {
  const views = useConference();
  const { id, conference } = views;
  const { data, status } = useHeat();
  const follows = useFollow();
  const { lang, t } = useI18n();
  const zh = lang !== "en";
  const [kind, setKind] = useStickyState<"forums" | "talks">(`${id}:popular.kind`, "forums");
  const reports = useMemo(() => {
    const talks = new Set([...(conference.forums ?? []).flatMap(f => f.talks ?? []), ...views.keynoteEntries.map(e => e.talk)]
      .map(t => t.id));
    // Resolve source dates, rooms and borrowed windows through the existing agenda resolver.
    return collectFollowedItems({ talks, forums: new Set(), speakers: new Set() }, views);
  }, [conference, views]);
  const forums = [...(conference.forums ?? [])].filter(f => (data?.forums[f.code] ?? 0) > 0)
    .sort((a, b) => (data?.forums[b.code] ?? 0) - (data?.forums[a.code] ?? 0) || a.code.localeCompare(b.code, "en", { numeric: true }));
  const talks = reports.filter(t => (data?.talks[t.followId!] ?? 0) > 0)
    .sort((a, b) => (data?.talks[b.followId!] ?? 0) - (data?.talks[a.followId!] ?? 0) ||
      (a.date || "9999-99-99").localeCompare(b.date || "9999-99-99") || (a.start ?? "99:99").localeCompare(b.start ?? "99:99") || a.followId!.localeCompare(b.followId!));
  return <motion.div className="container section" variants={pageVariants} initial="initial" animate="animate" exit="exit">
    <div className="section__head heat-header">
      <div className="section__titlerow heat-heading">
        <span className="section__icon" aria-hidden><Icon name="chart" size={19} /></span>
        <h2 className="section__title">{t("nav.popular")}</h2>
        <Freshness />
      </div>
      <div className="section__controls">
        <SegmentedControl value={kind} onChange={setKind} label={zh ? "热门类别" : "Popular category"} options={[
          { value: "forums", label: <><Icon name="forums" size={13} /><span className="segtoggle__label">{zh ? "论坛" : "Forums"}</span></> },
          { value: "talks", label: <><Icon name="keynotes" size={13} /><span className="segtoggle__label">{zh ? "报告" : "Reports"}</span></> },
        ]} />

      </div>
    </div>
    {status !== "ready" ? <div className="dash__empty" role="status">{status === "loading" ? (zh ? "加载中" : "Loading") : (zh ? "热度暂不可用" : "Heat unavailable")}</div>
      : !(kind === "forums" ? forums : talks).length ? <div className="dash__empty">{zh ? "暂无热度数据" : "No heat data yet"}</div>
      : kind === "forums" ? <div className="ftable" key="forums">
        {forums.map((forum, index) => <motion.div key={forum.code} className="frow" variants={rankedRow}
          custom={index} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.1 }}>
          <div className="frow__row">
            <Link className="frow__body" to={`/${id}/forum/${forum.code}`}>
              <ForumSummary forum={forum} code={forum.code} room={forum.room}>
                <span className="frow__rc">
                  {(forum.sessions?.length ? forum.sessions : [{ date: forum.day_date, start: forum.start, end: forum.end }]).map((slot, i) =>
                    <span className="frow__room" key={i}><Icon name="clock" size={12} />
                      {slot.date ? formatDate(slot.date, lang).md : (zh ? "日期待定" : "Date pending")}
                      {slot.start ? ` ${slot.start}${slot.end ? `–${slot.end}` : ""}` : ""}
                    </span>)}
                </span>
              </ForumSummary>
            </Link>
            <ForumActions code={forum.code}><HeatValue kind="forums" id={forum.code} /></ForumActions>
          </div>
        </motion.div>)}
      </div> : <div className="block" key="talks"><div className="talklist talklist--flush">
        {talks.map((talk, index) => <AgendaRow key={talk.followId} item={talk} showDate
          variants={rankedRow} custom={index} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.1 }}
          metric={<HeatValue kind="talks" id={talk.followId} />}
          actions={<StarButton active={follows.isTalk(talk.followId)} onClick={() => follows.toggleTalk(talk.followId)}
            className="star--sm talkrow__star" size={15}
            label={t(follows.isTalk(talk.followId) ? "common.talkFollowRemove" : "common.talkFollowAdd")} />} />)}
      </div></div>}
  </motion.div>;
}
