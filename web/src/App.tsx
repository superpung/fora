import { lazy, Suspense } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";

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
      <ScrollToTop />
      <Nav />
      <main>
        <Suspense fallback={null}>
          <AnimatePresence mode="wait">
            <Routes location={location} key={location.pathname}>
              <Route path="/" element={<Home />} />
              <Route path="/schedule" element={<Schedule />} />
              <Route path="/speakers" element={<Speakers />} />
              <Route path="/forum/:code" element={<ForumDetail />} />
              <Route path="/committee" element={<Committee />} />
              <Route path="/organizations" element={<Organizations />} />
            </Routes>
          </AnimatePresence>
        </Suspense>
      </main>
      <Footer />
    </>
  );
}
