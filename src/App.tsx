import { useEffect, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
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
import { supabase } from './lib/supabase';
import { getAdminAvatarUrl, isAdminEmail } from './lib/admin';
console.log('admin route:', import.meta.env.VITE_ADMIN_ROUTE)
type AppPage = 'home' | 'blog' | 'admin';
const ADMIN_OAUTH_REDIRECT_HASH = '/';
// 'admin' is an ephemeral OAuth trigger state for the secret route, not a rendered page.

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE;

function getCurrentPage(): AppPage {
  if (window.location.hash.startsWith(`#/${ADMIN_ROUTE}`)) {
    return 'admin';
  }

  return window.location.hash.startsWith('#/blog') ? 'blog' : 'home';
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(getCurrentPage);
  const [session, setSession] = useState<Session | null>(null);

  const isAdminSession = isAdminEmail(session?.user?.email);
  const adminAvatarUrl = getAdminAvatarUrl(session?.user?.user_metadata);

  useEffect(() => {
    const onRouteChange = () => {
      setPage(getCurrentPage());
      window.scrollTo({ top: 0, behavior: 'auto' });
    };

    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);

    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  useEffect(() => {
    const syncSession = async (nextSession: Session | null) => {
      if (!nextSession) {
        setSession(null);
        return;
      }

      if (!isAdminEmail(nextSession.user.email)) {
        setSession(null);
        await supabase.auth.signOut();
        return;
      }

      setSession(nextSession);
    };

    void supabase.auth.getSession().then(({ data }) => syncSession(data.session));

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      void syncSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (page !== 'admin' || isAdminSession) {
      return;
    }

    // OAuth redirect URL note: if your deployed domain differs, configure the allowed redirect in Supabase Auth settings.
    void supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}${ADMIN_OAUTH_REDIRECT_HASH}`,
      },
    });
  }, [page, isAdminSession]);

  useEffect(() => {
    if (isAdminSession && page === 'admin') {
      window.location.hash = '/blog';
      setPage('blog');
    }
  }, [isAdminSession, page]);

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
            <Nav isBlogPage={page === 'blog'} isAdminSession={isAdminSession} adminAvatarUrl={adminAvatarUrl} />
            <main className="bg-cream min-h-screen">
              {page === 'blog' ? (
                <Blog isAdminSession={isAdminSession} />
              ) : (
                <>
                  <Hero />
                  <About />
                  <Projects isAdminSession={isAdminSession} />
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
