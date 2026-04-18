import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Preloader from './components/Preloader';
import Cursor from './components/Cursor';
import NoiseOverlay from './components/NoiseOverlay';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import Stack from './components/Stack';
import Contact from './components/Contact';
import Blog from './components/Blog';

function getCurrentPage() {
  return window.location.hash.startsWith('#/blog') ? 'blog' : 'home';
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(getCurrentPage);

  useEffect(() => {
    const onHashChange = () => {
      setPage(getCurrentPage());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  return (
    <>
      <Cursor />
      <NoiseOverlay />
      <Preloader onComplete={() => setLoaded(true)} />

      <AnimatePresence>
        {loaded && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <Nav isBlogPage={page === 'blog'} />
            <main className="bg-cream min-h-screen">
              {page === 'blog' ? (
                <Blog />
              ) : (
                <>
                  <Hero />
                  <About />
                  <Projects />
                  <Stack />
                  <Contact />
                </>
              )}
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
