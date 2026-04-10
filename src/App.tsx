import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import Preloader from './components/Preloader';
import Cursor from './components/Cursor';
import NoiseOverlay from './components/NoiseOverlay';
import Nav from './components/Nav';
import Hero from './components/Hero';
import About from './components/About';
import Projects from './components/Projects';
import InferenceTerminal from './components/Terminal';
import Stack from './components/Stack';
import Contact from './components/Contact';

export default function App() {
  const [loaded, setLoaded] = useState(false);

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
            <Nav />
            <main className="bg-cream min-h-screen">
              <Hero />
              <About />
              <Projects />
              <InferenceTerminal />
              <Stack />
              <Contact />
            </main>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
