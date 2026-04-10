import { motion, useScroll, useTransform } from 'framer-motion';

const NAV_LINKS = [
  { label: 'About', href: '#about' },
  { label: 'Work', href: '#work' },
  { label: 'Stack', href: '#stack' },
  { label: 'Contact', href: '#contact' },
];

export default function Nav() {
  const { scrollY } = useScroll();
  const borderOpacity = useTransform(scrollY, [0, 80], [0, 0.12]);
  const borderColor = useTransform(borderOpacity, (v) => `rgba(17,17,17,${v})`);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 md:px-12 lg:px-16 py-4 bg-cream/90 backdrop-blur-sm border-b"
      style={{ borderBottomColor: borderColor }}
    >
      <motion.a
        href="#"
        className="font-serif text-ink text-lg tracking-tight"
        data-cursor="pointer"
        whileHover={{ opacity: 0.6 }}
        transition={{ duration: 0.2 }}
      >
        ST
      </motion.a>

      <div className="hidden md:flex items-center gap-8">
        {NAV_LINKS.map((link) => (
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

      <a
        href="mailto:shivamtamboli@example.com"
        className="font-sans text-xs bg-ink text-cream px-4 py-2 hover:bg-ink-light transition-colors duration-200 tracking-wide"
        data-cursor="pointer"
      >
        Get in Touch
      </a>
    </motion.nav>
  );
}
