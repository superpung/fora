import { Suspense } from "react";
import { Outlet, Navigate, useParams, useLocation } from "react-router-dom";
import Nav from "./Nav";
import Footer from "./Footer";
import PageLoader from "./PageLoader";
import { ConferenceProvider } from "../lib/conference";
import { FollowProvider } from "../lib/follow";
import { hasConference } from "../lib/conferences";

// Layout for a single conference (`/:conf/...`). It validates the id from the
// URL, then loads that conference's data and scopes the personal-agenda follows
// to it. The nav renders immediately (it only needs the lightweight manifest);
// the page area suspends behind <Suspense> until the dataset has loaded.
export default function ConferenceLayout() {
  const { conf } = useParams();
  const location = useLocation();
  if (!hasConference(conf)) return <Navigate to="/" replace />;
  return (
    <>
      <Nav confId={conf} />
      <Suspense fallback={<PageLoader />}>
        <ConferenceProvider id={conf}>
          {/* Keyed by conference so switching remounts follows with that
              conference's own saved agenda. */}
          <FollowProvider key={conf} confId={conf}>
            {/* Keyed by pathname so each page remounts and replays its enter
                animation, while the nav / provider persist across navigation. */}
            <main key={location.pathname}>
              <Outlet />
            </main>
          </FollowProvider>
          <Footer />
        </ConferenceProvider>
      </Suspense>
    </>
  );
}
