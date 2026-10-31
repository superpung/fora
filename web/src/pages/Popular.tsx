import { useMemo } from "react";
import { Link } from "react-router-dom";
import { motion, type Variants } from "framer-motion";
import { useConference } from "../lib/conference-store";
import { useFollow } from "../lib/follow-store";
import { useHeat } from "../lib/heat-store";
import { useI18n } from "../lib/i18n-store";
import { useStickyState } from "../lib/sticky-state";
import { collectFollowedItems } from "../lib/export";
import { pageVariants, easeOut } from "../lib/motion";
import Icon from "../components/Icon";
import StarButton from "../components/StarButton";
import HeatValue from "../components/HeatValue";
import SegmentedControl from "../components/SegmentedControl";
import Disclosure from "../components/Disclosure";
import AgendaRow from "../components/AgendaRow";
import { ForumSummary, ForumActions } from "../components/ForumRowParts";
import { formatDate } from "../lib/data";

const rankedRow: Variants = {
  initial: { opacity: 0, y: 12 },
  animate: (index: number) => ({ opacity: 1, y: 0,
    transition: { duration: 0.4, ease: easeOut, delay: Math.min(index, 5) * 0.025 } }),
};
export default function Popular() {
  const views = useConference();
  const { id, conference } = views;
  const { data, status, refresh } = useHeat();
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
    <div className="section__head">
      <div className="section__titlerow">
        <span className="section__icon" aria-hidden><Icon name="chart" size={19} /></span>
        <h2 className="section__title">{t("nav.popular")}</h2>
      </div>
      <div className="section__controls">
        <SegmentedControl value={kind} onChange={setKind} label={zh ? "热门类别" : "Popular category"} options={[
          { value: "forums", label: <><Icon name="forums" size={13} /><span className="segtoggle__label">{zh ? "论坛" : "Forums"}</span></> },
          { value: "talks", label: <><Icon name="keynotes" size={13} /><span className="segtoggle__label">{zh ? "报告" : "Reports"}</span></> },
        ]} />
        <button className="btn btn--ghost" onClick={refresh} aria-label={zh ? "刷新热度" : "Refresh heat"}
          title={zh ? "刷新热度" : "Refresh heat"}><Icon name="refresh" size={14} /></button>
      </div>
    </div>
    <Disclosure label={zh ? "热度算法" : "Scoring"} icon="chart">
      <ul>
        <li>{zh ? "热度是加权关注值，不是人数或百分比。仅统计开启“参与统计”的账号。" : "Heat measures weighted interest, not people or percentages. Only participating accounts contribute."}</li>
        <li className="mono">{zh ? "热度" : "Heat"} = round(100 × log₂(1 + {zh ? "加权关注" : "weighted interest"}))</li>
        <li>{zh ? "论坛：直接关注贡献 3；每场直接关注的报告贡献 1，同账号最多 3，两种取较大值。" : "Forum: a direct follow contributes 3; each directly followed report contributes 1, capped at 3 per account. Use the larger contribution."}</li>
        <li>{zh ? "报告：直接关注贡献 3；关注所属论坛则将 1 平均分给其报告，同账号取较大值。关注讲者不计入。" : "Report: a direct follow contributes 3; a forum follow shares 1 across its reports. Use the larger contribution per account. Speaker follows are excluded."}</li>
        <li>{zh ? "数据快照最长缓存 5 分钟；刷新或重新进入页面时读取。" : "Snapshots are cached for up to five minutes and checked on refresh or navigation."}</li>
      </ul>
    </Disclosure>
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
                      {slot.start ? ` · ${slot.start}${slot.end ? `–${slot.end}` : ""}` : ""}
                    </span>)}
                </span>
              </ForumSummary>
            </Link>
            <ForumActions code={forum.code} />
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
