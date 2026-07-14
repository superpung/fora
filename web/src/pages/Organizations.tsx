import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { pageVariants } from "../lib/motion";
import Reveal from "../components/Reveal";
import Icon from "../components/Icon";
import type { Organization } from "../types";

const ROLE_LABEL: Record<string, string> = {
  host: "主办单位",
  co_host: "承办单位",
  support: "协办单位",
  sponsor: "赞助单位",
};
const ROLE_ORDER = ["host", "co_host", "support", "sponsor"];

export default function Organizations() {
  const { id: confId, conference } = useConference();
  const orgs = conference.organizations ?? [];
  const grouped: Record<string, Organization[]> = {};
  for (const o of orgs) (grouped[o.role] ??= []).push(o);

  // Sponsored sessions (from each forum's sponsor field).
  const sponsoredForums = (conference.forums ?? []).filter((f) => f.sponsor);

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
            <Icon name="building" size={19} />
          </span>
          <h2 className="section__title">组织与赞助</h2>
        </div>
      </div>

      <div className="orgcols">
        {ROLE_ORDER.filter((r) => grouped[r]?.length).map((role) => (
          <Reveal key={role} className="orgcol">
            <h3 className="orgcol__title">{ROLE_LABEL[role]}</h3>
            <ul className="orglist">
              {grouped[role].map((o, i) => (
                <li key={i} className="orgitem">
                  {o.name.zh}
                  {o.sponsor_tier && (
                    <span className="tag">{o.sponsor_tier}</span>
                  )}
                </li>
              ))}
            </ul>
          </Reveal>
        ))}
      </div>

      {sponsoredForums.length > 0 && (
        <Reveal className="section" delay={0.05}>
          <h3 className="orgcol__title">企业 / 实验室专场</h3>
          <div className="sponsorwrap">
            {sponsoredForums.map((f) => (
              <Link key={f.code} to={`/${confId}/forum/${f.code}`} className="sponsorcard">
                <span className="sponsorcard__name">{f.sponsor}</span>
                <span className="sponsorcard__forum">
                  {f.code} · {f.title.zh}
                </span>
              </Link>
            ))}
          </div>
        </Reveal>
      )}
    </motion.div>
  );
}
