import { Suspense, useMemo, useState } from "react";
import { Outlet, Navigate, useParams, useLocation } from "react-router-dom";
import Nav from "./Nav";
import PageLoader from "./PageLoader";
import DocumentTitle from "./DocumentTitle";
import SearchPalette from "./SearchPalette";
import { ConferenceProvider } from "../lib/conference";
import { FollowProvider } from "../lib/follow";
import { FollowActionsBridge } from "../lib/follow-actions";
import { SearchCtx } from "../lib/search-store";
import { hasConference } from "../lib/conferences";

// Layout for a single conference (`/:conf/...`). It validates the id from the
// URL, then loads that conference's data and scopes the personal-agenda follows
// to it. The nav renders immediately (it only needs the lightweight manifest);
// the page area suspends behind <Suspense> until the dataset has loaded.
export default function ConferenceLayout() {
  const { conf } = useParams();
  const location = useLocation();
  // Search-palette open state lives here so the nav's search button (outside the
  // conference providers) and the palette (inside them, where the dataset is
  // available) share it.
  const [searchOpen, setSearchOpen] = useState(false);
  const searchUI = useMemo(() => ({ open: searchOpen, setOpen: setSearchOpen }), [searchOpen]);
  if (!hasConference(conf)) return <Navigate to="/" replace />;
  return (
    <SearchCtx.Provider value={searchUI}>
      <Nav confId={conf} />
      <Suspense fallback={<PageLoader />}>
        <ConferenceProvider id={conf}>
          <DocumentTitle />
          {/* Keyed by conference so switching remounts follows with that
              conference's own saved agenda. */}
          <FollowProvider key={conf} confId={conf}>
            {/* Publishes this conference's import/export/clear actions up to the
                nav account menu (the nav renders outside these providers). */}
            <FollowActionsBridge />
            {/* Global search over the loaded conference; mounted here so it can
                read the dataset via useConference. */}
            <SearchPalette />
            {/* Keyed by pathname so each page remounts and replays its enter
                animation, while the nav / provider persist across navigation. */}
            <main key={location.pathname}>
              <Outlet />
            </main>
          </FollowProvider>
        </ConferenceProvider>
      </Suspense>
    </SearchCtx.Provider>
  );
}
