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
import Profile from './components/Profile';
import BlogReports from './components/BlogReports';
import FlamolinaChat from './components/FlamolinaChat';
import ProjectPage from './components/ProjectPage';
import { hasSupabaseConfig, supabase } from './lib/supabase';
import { getAdminAvatarUrl, isAdminEmail } from './lib/admin';

type AppPage = 'home' | 'blog' | 'admin' | 'reports' | 'profile' | 'project';
const ADMIN_OAUTH_REDIRECT_HASH = '/';
// 'admin' is an ephemeral OAuth trigger state for the secret route, not a rendered page.

const ADMIN_ROUTE = import.meta.env.VITE_ADMIN_ROUTE;

function getCurrentPage(): AppPage {
  if (window.location.hash.startsWith('#/reports')) {
    return 'reports';
  }
  if (window.location.hash.startsWith(`#/${ADMIN_ROUTE}`)) {
    return 'admin';
  }
  if (window.location.hash.startsWith('#/profile')) {
    return 'profile';
  }
  if (window.location.hash.startsWith('#/projects/')) {
    return 'project';
  }
  return window.location.hash.startsWith('#/blog') ? 'blog' : 'home';
}

function getCurrentProjectSlug(): string {
  if (!window.location.hash.startsWith('#/projects/')) return '';
  return window.location.hash.slice('#/projects/'.length).split(/[?#]/)[0] || '';
}

export default function App() {
  const [loaded, setLoaded] = useState(false);
  const [page, setPage] = useState(getCurrentPage);
  const [projectSlug, setProjectSlug] = useState(getCurrentProjectSlug);
  const [session, setSession] = useState<Session | null>(null);

  const isAdminSession = isAdminEmail(session?.user?.email);
  const adminAvatarUrl = getAdminAvatarUrl(session?.user?.user_metadata);

  useEffect(() => {
    const onRouteChange = () => {
      setPage(getCurrentPage());
      setProjectSlug(getCurrentProjectSlug());
      if (window.location.hash.startsWith('#/')) {
        window.scrollTo({ top: 0, behavior: 'auto' });
      }
    };

    window.addEventListener('hashchange', onRouteChange);
    window.addEventListener('popstate', onRouteChange);

    return () => {
      window.removeEventListener('hashchange', onRouteChange);
      window.removeEventListener('popstate', onRouteChange);
    };
  }, []);

  useEffect(() => {
    if (!hasSupabaseConfig) {
      setSession(null);
      return;
    }

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
    } = supabase.auth.onAuthStateChange((event, nextSession) => {
      if (event === 'SIGNED_OUT') {
        setSession(null);
        return;
      }
      void syncSession(nextSession);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if ((page !== 'admin' && page !== 'reports') || isAdminSession) {
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

  const handleLogout = () => {
    void supabase.auth.signOut();
  };

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
      <FlamolinaChat />
      <Preloader onComplete={() => setLoaded(true)} />

      <AnimatePresence>
        {loaded && (
          <motion.div
            key="main"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
          >
            <Nav
              isBlogPage={page !== 'home'}
              isAdminSession={isAdminSession}
              adminAvatarUrl={adminAvatarUrl}
              onLogout={handleLogout}
            />
            <main className="bg-cream min-h-screen">
              {page === 'blog' ? (
                <Blog isAdminSession={isAdminSession} adminAvatarUrl={adminAvatarUrl} />
              ) : page === 'reports' ? (
                <BlogReports isAdminSession={isAdminSession} />
              ) : page === 'profile' ? (
                <Profile isAdminSession={isAdminSession} />
              ) : page === 'project' ? (
                <ProjectPage slug={projectSlug} isAdminSession={isAdminSession} />
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
