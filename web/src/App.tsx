import { lazy, Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import ScrollManager from "./components/ScrollManager";
import ConferenceLayout from "./components/ConferenceLayout";
import PageLoader from "./components/PageLoader";

// Route-level code splitting: each page ships as its own chunk so the initial
// download is just the shell (nav/footer/router), not every page at once.
const Hub = lazy(() => import("./pages/Hub"));
const Home = lazy(() => import("./pages/Home"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Speakers = lazy(() => import("./pages/Speakers"));
const ForumDetail = lazy(() => import("./pages/ForumDetail"));
const Committee = lazy(() => import("./pages/Committee"));
const Organizations = lazy(() => import("./pages/Organizations"));

export default function App() {
  return (
    <>
      <ScrollManager />
      {/* The site hosts several conferences. `/` is the conference hub; each
          conference lives under `/:conf/...`. ConferenceLayout loads the active
          conference's data and provides it to its child routes. */}
      <Routes>
        <Route
          path="/"
          element={
            <Suspense fallback={<PageLoader />}>
              <Hub />
            </Suspense>
          }
        />
        <Route path="/:conf" element={<ConferenceLayout />}>
          <Route index element={<Home />} />
          <Route path="schedule" element={<Schedule />} />
          <Route path="speakers" element={<Speakers />} />
          <Route path="committee" element={<Committee />} />
          <Route path="organizations" element={<Organizations />} />
          <Route path="forum/:code" element={<ForumDetail />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}
