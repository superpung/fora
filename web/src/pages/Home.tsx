import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { conference, days, stats, formatDate, venueName } from "../lib/data";
import { pageVariants, stagger, riseItem, scaleItem } from "../lib/motion";
import Reveal from "../components/Reveal";
import CountUp from "../components/CountUp";
import type { Talk } from "../types";

const periodLabel: Record<string, string> = {
  morning: "上午",
  afternoon: "下午",
  evening: "晚上",
};

export default function Home() {
  const keynotes: Talk[] = days
    .flatMap((d) => d.blocks)
    .filter((b) => b.kind === "keynotes")
    .flatMap((b) => b.talks ?? [])
    .filter((t) => t.type === "keynote");

  const forums = conference.forums ?? [];
  const sponsoredForums = forums.filter((f) => f.sponsor);

  return (
    <motion.div variants={pageVariants} initial="initial" animate="animate" exit="exit">
      {/* ---------- HERO ---------- */}
      <section className="hero">
        <div className="hero__glow" aria-hidden />
        <div className="container hero__inner">
          <motion.div variants={stagger(0.1, 0.09)} initial="initial" animate="animate">
            <motion.div variants={riseItem} className="eyebrow hero__eyebrow">
              {conference.edition} · {formatDate(conference.start_date).md}–
              {formatDate(conference.end_date).md}
            </motion.div>
            <motion.h1 variants={riseItem} className="hero__title">
              {conference.name.zh}
            </motion.h1>
            <motion.div variants={riseItem} className="hero__subtitle">
              {conference.name.en}
            </motion.div>
            <motion.p variants={riseItem} className="hero__meta">
              {conference.venues?.map((v) => v.name.zh).join(" · ")}
            </motion.p>
            <motion.div variants={riseItem} className="hero__cta">
              <Link to="/schedule" className="btn btn--primary">
                查看完整日程
              </Link>
              <Link to="/committee" className="btn btn--ghost">
                大会委员会
              </Link>
            </motion.div>
          </motion.div>

          <motion.div
            className="hero__stats"
            variants={stagger(0.35, 0.1)}
            initial="initial"
            animate="animate"
          >
            {[
              { n: stats.days, label: "会期天数" },
              { n: stats.forums, label: "技术论坛" },
              { n: stats.keynotes, label: "主旨报告" },
              { n: stats.committeeMembers, label: "委员会成员" },
            ].map((s) => (
              <motion.div key={s.label} variants={scaleItem} className="stat">
                <div className="stat__num">
                  <CountUp to={s.n} />
                </div>
                <div className="stat__label">{s.label}</div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* ---------- 四天概览 ---------- */}
      <section className="container section">
        <Reveal>
          <div className="section__head">
            <div className="eyebrow">日程概览</div>
            <h2 className="section__title">四天，一览全局</h2>
          </div>
        </Reveal>
        <div className="daygrid">
          {days.map((d, i) => {
            const { md, weekday } = formatDate(d.date);
            const ov = d.overview ?? {};
            return (
              <Reveal key={d.date} delay={i * 0.06}>
                <Link to={`/schedule#${d.date}`} className="daycard">
                  <div className="daycard__top">
                    <span className="daycard__date">{md}</span>
                    <span className="daycard__wd">{weekday}</span>
                  </div>
                  <div className="daycard__venue">{venueName(d.venue_id)}</div>
                  <div className="daycard__periods">
                    {(["morning", "afternoon", "evening"] as const).map((p) =>
                      (ov[p] ?? []).length ? (
                        <div key={p} className="daycard__period">
                          <span className="daycard__plabel">{periodLabel[p]}</span>
                          <span className="daycard__pitems">
                            {(ov[p] ?? []).join("、")}
                          </span>
                        </div>
                      ) : null,
                    )}
                  </div>
                  <span className="daycard__arrow">→</span>
                </Link>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------- 主旨报告 ---------- */}
      <section className="container section">
        <Reveal>
          <div className="section__head">
            <div className="eyebrow">Keynotes</div>
            <h2 className="section__title">大会主旨报告</h2>
            <p className="section__desc">
              {keynotes.length} 场特邀主旨报告，汇聚院士与产业领军者。
            </p>
          </div>
        </Reveal>
        <div className="keynotes">
          {keynotes.map((t, i) => {
            const sp = t.speakers?.[0];
            return (
              <Reveal key={i} delay={(i % 3) * 0.05}>
                <div className="keynote">
                  <div className="keynote__speaker">
                    <span className="keynote__name">{sp?.name}</span>
                    {sp?.honorifics?.map((h) => (
                      <span key={h} className="tag tag--code">{h}</span>
                    ))}
                  </div>
                  <div className="keynote__aff">{sp?.affiliation_raw}</div>
                  <div className="keynote__topic">
                    {t.title_status === "tbd" ? (
                      <span className="tag tag--tbd">题目待定</span>
                    ) : (
                      t.title?.zh
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </section>

      {/* ---------- 论坛专场 ---------- */}
      <section className="container section">
        <Reveal>
          <div className="section__head">
            <div className="eyebrow">Forums</div>
            <h2 className="section__title">{forums.length} 场平行技术论坛</h2>
            <p className="section__desc">
              含 {sponsoredForums.length} 场企业与实验室专场。点击进入日程逐场浏览。
            </p>
          </div>
        </Reveal>
        <div className="chipwrap">
          {forums.map((f, i) => (
            <motion.div
              key={f.code}
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.6 }}
              transition={{ duration: 0.3, delay: Math.min(i * 0.012, 0.4) }}
            >
              <Link to={`/forum/${f.code}`} className="fchip">
                <span className="fchip__code">{f.code}</span>
                <span className="fchip__title">{f.title.zh}</span>
                {f.sponsor && <span className="tag tag--sponsor">{f.sponsor}</span>}
              </Link>
            </motion.div>
          ))}
        </div>
      </section>
    </motion.div>
  );
}
