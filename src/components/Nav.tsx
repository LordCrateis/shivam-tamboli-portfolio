import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform } from 'framer-motion';
import { Menu, X } from 'lucide-react';
import ThemeToggle from './ThemeToggle';

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Stack', href: '#stack' },
  { label: 'Contact', href: '#contact' },
  { label: 'Profile', href: '#/profile' },
  { label: 'Blog', href: '#/blog' },
];

const BLOG_NAV_LINKS = [
  { label: 'Home', href: '#' },
  { label: 'Contact', href: 'mailto:shivamrtamboli62@gmail.com' },
];

interface NavProps {
  isBlogPage?: boolean;
  isAdminSession?: boolean;
  adminAvatarUrl?: string | null;
  onLogout?: () => void;
}

export default function Nav({
  isBlogPage = false,
  isAdminSession = false,
  adminAvatarUrl = null,
  onLogout,
}: NavProps) {
  const [showFlyBubble, setShowFlyBubble] = useState(false);

  const handleAvatarClick = () => {
    setShowFlyBubble(true);
    setTimeout(() => setShowFlyBubble(false), 1800);
  };
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 0.12]);
  const borderColor = useTransform(borderOpacity, (v) => `rgba(17,17,17,${v})`);
  const links = isBlogPage ? BLOG_NAV_LINKS : NAV_LINKS;
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const menuButtonRef = useRef<HTMLButtonElement | null>(null);
  const menuPanelRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    setIsMenuOpen(false);
  }, [isBlogPage]);

  useEffect(() => {
    if (!isMenuOpen) {
      return;
    }

    const panel = menuPanelRef.current;
    if (!panel) {
      return;
    }

    const focusableElements = Array.from(
      panel.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'),
    );
    const menuButton = menuButtonRef.current;

    const first = focusableElements[0];
    const last = focusableElements[focusableElements.length - 1];

    first?.focus();

    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMenuOpen(false);
        return;
      }

      if (event.key !== 'Tab' || focusableElements.length === 0) {
        return;
      }

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', handleKeydown);
    return () => {
      document.removeEventListener('keydown', handleKeydown);
      menuButton?.focus();
    };
  }, [isMenuOpen]);

  return (
    <>
      <motion.nav
        className="fixed top-0 left-0 right-0 z-[60] flex items-center justify-between px-6 md:px-12 lg:px-16 py-4 bg-cream/90 backdrop-blur-sm border-b"
        style={{ borderBottomColor: borderColor }}
      >
        {isAdminSession && adminAvatarUrl ? (
          <div className="relative">
            <motion.button
              type="button"
              onClick={handleAvatarClick}
              className="block"
              data-cursor="pointer"
              whileHover={{ opacity: 0.85 }}
              whileTap={{ scale: 0.92 }}
              transition={{ duration: 0.2 }}
              aria-label="Admin avatar"
            >
              <img
                src={adminAvatarUrl}
                alt="Admin avatar"
                className="h-8 w-8 rounded-full border border-ink/20 object-cover"
                referrerPolicy="no-referrer"
              />
            </motion.button>

            <AnimatePresence>
              {showFlyBubble && (
                <motion.div
                  initial={{ opacity: 0, y: -8, scale: 0.9 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -8, scale: 0.9 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  style={{ transformOrigin: 'top center' }}
                  className="absolute left-1/2 top-full z-10 mt-2 -translate-x-1/2"
                >
                  <button
                    type="button"
                    onClick={() => {
                      setShowFlyBubble(false);
                      onLogout?.();
                    }}
                    className="relative whitespace-nowrap rounded-2xl border border-ink/15 bg-cream px-4 py-2 font-serif text-base text-ink shadow-md hover:bg-ink hover:text-cream transition-colors duration-150"
                    data-cursor="pointer"
                  >
                    Fly
                    <span className="absolute -top-1.5 left-1/2 h-2.5 w-2.5 -translate-x-1/2 rotate-45 border-l border-t border-ink/15 bg-cream" />
                  </button>
                  <span className="absolute -top-3 left-[calc(50%-10px)] h-1.5 w-1.5 rounded-full bg-cream border border-ink/15" />
                  <span className="absolute -top-5 left-[calc(50%-16px)] h-1 w-1 rounded-full bg-cream border border-ink/15" />
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <motion.a
            href="#"
            className="font-serif text-ink text-lg tracking-tight"
            data-cursor="pointer"
            whileHover={{ opacity: 0.6 }}
            transition={{ duration: 0.2 }}
          >
            ST
          </motion.a>
        )}

        <div className="hidden md:flex items-center gap-8">
          {links.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="font-sans text-xs text-ink-muted hover:text-ink transition-colors duration-200 tracking-wide uppercase"
              data-cursor="pointer"
            >
              {link.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <ThemeToggle />

          <a
            href="mailto:shivamrtamboli62@gmail.com"
            className="hidden md:inline-block font-sans text-xs bg-ink text-cream px-4 py-2 hover:bg-ink-light transition-colors duration-200 tracking-wide"
            data-cursor="pointer"
          >
            Get in Touch
          </a>
          <button
            type="button"
            className="md:hidden inline-flex items-center justify-center border border-ink/20 p-2 text-ink"
            onClick={() => setIsMenuOpen((prev) => !prev)}
            aria-label={isMenuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={isMenuOpen}
            ref={menuButtonRef}
            data-cursor="pointer"
          >
            {isMenuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </motion.nav>

      <AnimatePresence>
        {isMenuOpen && (
          <>
            <motion.div
              className="fixed inset-0 z-40 bg-black/45"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              role="presentation"
              aria-hidden="true"
              onClick={() => setIsMenuOpen(false)}
            />
            <motion.aside
              className="fixed top-0 right-0 bottom-0 z-50 w-[min(20rem,85vw)] bg-cream border-l border-ink/15 px-6 pt-24 pb-8 flex flex-col"
              role="dialog"
              aria-modal="true"
              aria-labelledby="mobile-menu-title"
              ref={menuPanelRef}
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ duration: 0.24, ease: 'easeOut' }}
            >
              <h2 id="mobile-menu-title" className="sr-only">
                Mobile navigation menu
              </h2>
              <div className="flex flex-col gap-6">
                {links.map((link) => (
                  <a
                    key={link.label}
                    href={link.href}
                    className="font-sans text-xs text-ink-muted hover:text-ink transition-colors duration-200 tracking-wide uppercase"
                    onClick={() => setIsMenuOpen(false)}
                    data-cursor="pointer"
                  >
                    {link.label}
                  </a>
                ))}
                <div className="flex items-center gap-3 pt-2">
                  <ThemeToggle />

                  <a
                    href="mailto:shivamrtamboli62@gmail.com"
                    className="font-sans text-xs bg-ink text-cream px-4 py-2 hover:bg-ink-light transition-colors duration-200 tracking-wide w-fit"
                    onClick={() => setIsMenuOpen(false)}
                    data-cursor="pointer"
                  >
                    Get in Touch
                  </a>
                </div>
              </div>
            </motion.aside>
          </>
        )}
      </AnimatePresence>
    </>
  );
}