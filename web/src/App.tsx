import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import Nav from "./components/Nav";
import Footer from "./components/Footer";
import ScrollToTop from "./components/ScrollToTop";
import Home from "./pages/Home";
import Schedule from "./pages/Schedule";
import ForumDetail from "./pages/ForumDetail";
import Committee from "./pages/Committee";
import Organizations from "./pages/Organizations";

export default function App() {
  const location = useLocation();
  return (
    <>
      <ScrollToTop />
      <Nav />
      <main>
        <AnimatePresence mode="wait">
          <Routes location={location} key={location.pathname}>
            <Route path="/" element={<Home />} />
            <Route path="/schedule" element={<Schedule />} />
            <Route path="/forum/:code" element={<ForumDetail />} />
            <Route path="/committee" element={<Committee />} />
            <Route path="/organizations" element={<Organizations />} />
          </Routes>
        </AnimatePresence>
      </main>
      <Footer />
    </>
  );
}
