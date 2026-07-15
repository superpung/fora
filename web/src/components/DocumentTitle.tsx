import { useLocation, useParams } from "react-router-dom";
import { useConference } from "../lib/conference-store";
import { useTitle } from "../lib/use-title";

const PAGE_LABEL: Record<string, string> = {
  schedule: "完整日程",
  speakers: "讲者",
  committee: "委员会",
  organizations: "组织与赞助",
};

// Keeps document.title in sync with the active conference and page. Rendered
// inside ConferenceProvider (so useConference works) — one place instead of a
// hook in every page. For a forum it uses the forum's own name; for the known
// sub-pages a fixed label; the conference dashboard just shows the conf name.
export default function DocumentTitle() {
  const { meta, getForum } = useConference();
  const { pathname } = useLocation();
  const { code } = useParams();

  const segments = pathname.split("/").filter(Boolean); // ["conf", "page", ...]
  const page = segments[1];
  let label: string | undefined;
  if (page === "forum" && code) {
    label = getForum(code)?.title.zh;
  } else if (page) {
    label = PAGE_LABEL[page];
  }

  useTitle(label, meta.name.zh);
  return null;
}
