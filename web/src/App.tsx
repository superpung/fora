import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ScrollManager from "./components/ScrollManager";

// Route-level code splitting: each page ships as its own chunk so the initial
// download is just the shell (nav/footer/router), not every page at once.
const Home = lazy(() => import("./pages/Home"));
const Schedule = lazy(() => import("./pages/Schedule"));
const Speakers = lazy(() => import("./pages/Speakers"));
const ForumDetail = lazy(() => import("./pages/ForumDetail"));
const Committee = lazy(() => import("./pages/Committee"));
const Organizations = lazy(() => import("./pages/Organizations"));

export default function App() {
  const location = useLocation();
  return (
    <>
      <ScrollManager />
      <Nav />
      <main>
        {/* key by pathname so each page remounts and plays its enter animation;
            no AnimatePresence — route-level exit stacks pages and deadlocks on
            #hash navigation (see motion.ts pageVariants). */}
        <Suspense fallback={null}>
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/speakers" element={<Speakers />} />
            <Route path="/forum/:code" element={<ForumDetail />} />
            <Route path="/committee" element={<Committee />} />
            <Route path="/organizations" element={<Organizations />} />
          </Routes>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
