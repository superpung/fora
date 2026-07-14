import { motion } from "framer-motion";
import { conference } from "../lib/data";
import { pageVariants, stagger, riseItem } from "../lib/motion";
import Reveal from "../components/Reveal";
import Icon from "../components/Icon";
import Avatar from "../components/Avatar";

export default function Committee() {
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
          <h2 className="section__title">大会委员会</h2>
        </div>
        <p className="section__desc">
          {committees.reduce((n, c) => n + c.members.length, 0)} 位专家 ·
          {committees.length} 个委员会角色
        </p>
      </div>

      <div className="committees">
        {committees.map((c) => (
          <Reveal key={c.role.zh} className="cmt">
            <div className="cmt__head">
              <h3 className="cmt__role">{c.role.zh}</h3>
              {c.ordering_note && (
                <span className="cmt__note">{c.ordering_note}</span>
              )}
              <span className="cmt__count">{c.members.length}</span>
            </div>
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
                    {m.affiliation_raw && (
                      <div className="member__aff">{m.affiliation_raw}</div>
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
