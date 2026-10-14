import { motion } from "framer-motion";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import Reveal from "../components/Reveal";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";
import SourceNotes from "../components/SourceNotes";

export default function Committee() {
  const { conference } = useConference();
  const { t } = useI18n();
  const committees = conference.committees ?? [];
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
            <Icon name="committee" size={19} />
          </span>
          <h2 className="section__title">{t("committee.title")}</h2>
        </div>
      </div>

      <SourceNotes flags={conference.extra?.flags} />
      <div className="committees">
        {committees.map((c) => (
          <Reveal key={c.role.zh} className="cmt">
            <div className="cmt__head">
              <h3 className="cmt__role">{c.role.zh}</h3>
              {c.ordering_note && (
                <span className="cmt__note">{c.ordering_note}</span>
              )}
              <span className="cmt__count">{c.extra?.members_status === "not_published" ? t("committee.pending") : c.members.length}</span>
            </div>
            <SourceNotes flags={c.extra?.flags} />
            <motion.div
              className="cmt__grid"
              variants={stagger(0, 0.03)}
              initial="initial"
              whileInView="animate"
              viewport={{ once: true, amount: 0.1 }}
            >
              {c.members.map((m, i) => (
                <motion.div key={i} variants={riseItem} className="member">
                  <Avatar person={m} size={34} />
                  <div className="member__info">
                    <div className="member__name">{m.name}</div>
                    {(m.affiliation_raw || m.title) && (
                      <div className="member__aff">
                        {[m.affiliation_raw, m.title && !m.affiliation_raw?.includes(m.title) ? m.title : null].filter(Boolean).join(" · ")}
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </Reveal>
        ))}
      </div>
    </motion.div>
  );
}
