import { useLocation, useParams } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useI18n } from "../lib/i18n-store";
import { useTitle } from "../lib/use-title";

const PAGE_LABEL_KEY: Record<string, string> = {
  schedule: "schedule.title",
  speakers: "speakers.title",
  committee: "committee.title",
  organizations: "orgs.title",
};

// Keeps document.title in sync with the active conference and page. Rendered
// inside ConferenceProvider (so useConference works) — one place instead of a
// hook in every page. For a forum it uses the forum's own name; for the known
// sub-pages a translated label; the conference dashboard just shows the conf name.
export default function DocumentTitle() {
  const { meta, getForum } = useConference();
  const { pathname } = useLocation();
  const { code } = useParams();
  const { t, lang } = useI18n();

  const segments = pathname.split("/").filter(Boolean); // ["conf", "page", ...]
  const page = segments[1];
  let label: string | undefined;
  if (page === "forum" && code) {
    label = getForum(code)?.title.zh;
  } else if (page && PAGE_LABEL_KEY[page]) {
    label = t(PAGE_LABEL_KEY[page]);
  }

  const confName = lang === "en" ? (meta.name.en ?? meta.name.zh) : meta.name.zh;
  useTitle(label, confName);
  return null;
}
