import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion, type Variants } from "framer-motion";
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
  const { lang } = useI18n();
  const zh = lang !== "en";
  const [kind, setKind] = useStickyState<"forums" | "talks">(`${id}:popular.kind`, "forums");
  const [explain, setExplain] = useState(false);
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
  return <motion.div className="container section popular" variants={pageVariants} initial="initial" animate="animate" exit="exit">
    <div className="section__head">
      <div className="section__titlerow"><span className="section__icon"><Icon name="chart" /></span>
        <h2 className="section__title">{zh ? "热门" : "Popular"}</h2></div>
      <div className="popular__controls">
        <button className="iconbtn" onClick={refresh} aria-label={zh ? "刷新热度" : "Refresh heat"}><Icon name="refresh" /></button>
        <button className="filterchip" onClick={() => setExplain(v => !v)} aria-expanded={explain}>{zh ? "热度算法" : "Scoring"}</button>
      </div>
    </div>
    <AnimatePresence initial={false}>{explain && <motion.div className="popular__explain" initial={{ height: 0, opacity: 0 }}
      animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: easeOut }}>
      <div>
        <p>{zh ? "热度是加权关注值，不是人数或百分比。仅统计开启“参与统计”的账号。" : "Heat measures weighted interest, not people or percentages. Only participating accounts contribute."}</p>
        <p className="mono">{zh ? "热度" : "Heat"} = round(100 × log₂(1 + {zh ? "加权关注" : "weighted interest"}))</p>
        <p>{zh ? "论坛：直接关注贡献 3；每场直接关注的报告贡献 1，同账号最多 3，两种取较大值。" : "Forum: a direct follow contributes 3; each directly followed report contributes 1, capped at 3 per account. Use the larger contribution."}</p>
        <p>{zh ? "报告：直接关注贡献 3；关注所属论坛则将 1 平均分给其报告，同账号取较大值。关注讲者不计入。" : "Report: a direct follow contributes 3; a forum follow shares 1 across its reports. Use the larger contribution per account. Speaker follows are excluded."}</p>
        <p>{zh ? "数据快照最长缓存 5 分钟；刷新或重新进入页面时读取。" : "Snapshots are cached for up to five minutes and checked on refresh or navigation."}</p>
      </div>
    </motion.div>}</AnimatePresence>
    <div className="popular__tabs" role="tablist" aria-label={zh ? "热门类别" : "Popular category"}>
      {(["forums", "talks"] as const).map(value => <button key={value} role="tab" aria-selected={kind === value}
        className={`filterchip ${kind === value ? "is-on" : ""}`} onClick={() => setKind(value)}>
        {value === "forums" ? (zh ? "论坛" : "Forums") : (zh ? "报告" : "Reports")}</button>)}
    </div>
    {status !== "ready" ? <div className="popular__empty" role="status">{status === "loading" ? (zh ? "加载中" : "Loading") : (zh ? "热度暂不可用" : "Heat unavailable")}</div>
      : !(kind === "forums" ? forums : talks).length ? <div className="popular__empty">{zh ? "暂无热度数据" : "No heat data yet"}</div>
      : <div key={kind} className="popular__list">
        {kind === "forums" ? forums.map((forum, index) => <motion.div key={forum.code} variants={rankedRow} custom={index} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.1 }} className="popular__row">
          <span className="popular__rank mono">{index + 1}</span>
          <div className="popular__body"><Link className="popular__title" to={`/${id}/forum/${forum.code}`}>{forum.title.zh}</Link>
            <div className="popular__meta"><span className="mono">{forum.code}</span>
              {forum.room && <span><Icon name="pin" size={12} />{forum.room}</span>}
              <span className="mono"><Icon name="calendar" size={12} />{forum.sessions?.map(s => s.date).join(" / ") || forum.day_date || (zh ? "日期待定" : "Date pending")}</span>
            </div></div>
          <div className="popular__actions"><HeatValue kind="forums" id={forum.code} />
            <StarButton active={follows.isForum(forum.code)} onClick={() => follows.toggleForum(forum.code)}
              label={`${follows.isForum(forum.code) ? (zh ? "取消关注" : "Unfollow") : (zh ? "关注" : "Follow")} ${forum.title.zh}`} /></div>
        </motion.div>) : talks.map((talk, index) => <motion.div key={talk.followId} variants={rankedRow} custom={index} initial="initial" whileInView="animate" viewport={{ once: true, amount: 0.1 }} className="popular__row">
          <span className="popular__rank mono">{index + 1}</span>
          <div className="popular__body"><Link className="popular__title" to={talk.code ? `/${id}/forum/${talk.code}#${talk.anchor}` : `/${id}/schedule#${talk.date}`}>{talk.title}</Link>
            <div className="popular__meta">
              <span><Icon name="user" size={12} />{talk.speakers || (zh ? "讲者待定" : "Speaker pending")}</span>
              <span><Icon name="pin" size={12} />{talk.room || (zh ? "地点待定" : "Room pending")}</span>
              <span className="mono" title={talk.approx && talk.start ? (zh ? "借用论坛时段" : "Forum time window") : undefined}><Icon name="clock" size={12} />
                {talk.date || (zh ? "日期待定" : "Date pending")} {talk.approx && talk.start ? "~" : ""}{talk.start || (zh ? "时间待定" : "Time pending")}{talk.end ? `–${talk.end}` : ""}</span>
            </div></div>
          <div className="popular__actions"><HeatValue kind="talks" id={talk.followId!} />
            <StarButton active={follows.isTalk(talk.followId!)} onClick={() => follows.toggleTalk(talk.followId!)}
              label={`${follows.isTalk(talk.followId!) ? (zh ? "取消关注" : "Unfollow") : (zh ? "关注" : "Follow")} ${talk.title}`} /></div>
        </motion.div>)}
      </div>}
  </motion.div>;
}
