import { KeyboardEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from 'framer-motion';
import { ChevronLeft, ChevronRight, Expand, Images, Play, X } from 'lucide-react';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import { supabase } from '../lib/supabase';

interface GalleryMedia {
  id: string;
  project_id: string;
  media_type: 'photo' | 'video';
  source_type: 'upload' | 'embed';
  url: string;
  order_index: number;
  caption?: string | null;
  alt_text?: string | null;
}

interface ProjectGalleryProps {
  projectId: string;
  projectTitle: string;
  refreshKey?: number;
}

function getYouTubeId(url: string): string | null {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/);
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function getEmbedInfo(url: string) {
  const youtubeId = getYouTubeId(url);
  if (youtubeId) {
    return {
      provider: 'YouTube',
      embedSrc: `https://www.youtube.com/embed/${youtubeId}?rel=0`,
      thumbnail: `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`,
    };
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'Vimeo',
      embedSrc: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnail: null,
    };
  }

  return { provider: 'Video', embedSrc: url, thumbnail: null };
}

export default function ProjectGallery({ projectId, projectTitle, refreshKey = 0 }: ProjectGalleryProps) {
  const [media, setMedia] = useState<GalleryMedia[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const reduceMotion = useReducedMotion();

  const fetchMedia = useCallback(async () => {
    setLoading(true);

    const extendedResult = await supabase
      .from('project_media')
      .select('id,project_id,media_type,source_type,url,order_index,caption,alt_text')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (!extendedResult.error) {
      setMedia((extendedResult.data ?? []) as GalleryMedia[]);
      setLoading(false);
      return;
    }

    const fallbackResult = await supabase
      .from('project_media')
      .select('id,project_id,media_type,source_type,url,order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    setMedia(fallbackResult.error ? [] : ((fallbackResult.data ?? []) as GalleryMedia[]));
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    // Re-run after an admin upload or deletion from the manager below the gallery.
    void refreshKey;
    setActiveIndex(0);
    void fetchMedia();
  }, [fetchMedia, refreshKey]);

  const activeItem = media[activeIndex];
  const activeDescription = activeItem?.caption?.trim() || `Screen ${activeIndex + 1} from ${projectTitle}`;

  const navigate = useCallback(
    (direction: -1 | 1) => {
      if (media.length < 2) return;
      setActiveIndex((current) => (current + direction + media.length) % media.length);
    },
    [media.length],
  );

  const handleKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'ArrowLeft') {
      event.preventDefault();
      navigate(-1);
    }
    if (event.key === 'ArrowRight') {
      event.preventDefault();
      navigate(1);
    }
  };

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipePower = Math.abs(info.offset.x) * info.velocity.x;
    if (info.offset.x < -70 || swipePower < -7000) navigate(1);
    if (info.offset.x > 70 || swipePower > 7000) navigate(-1);
  };

  const thumbnails = useMemo(
    () =>
      media.map((item) => {
        if (item.media_type === 'photo') return { kind: 'image' as const, src: item.url };
        if (item.source_type === 'upload') return { kind: 'video' as const, src: item.url };
        const embed = getEmbedInfo(item.url);
        return embed.thumbnail
          ? { kind: 'image' as const, src: embed.thumbnail }
          : { kind: 'embed' as const, label: embed.provider };
      }),
    [media],
  );

  if (loading) {
    return (
      <section className="project-gallery border-y border-ink/10 py-10" aria-label="Project screenshots">
        <div className="aspect-video animate-pulse bg-ink/5" />
      </section>
    );
  }

  if (!activeItem) {
    return (
      <section className="project-gallery border-y border-ink/10 py-14" aria-label="Project screenshots">
        <div className="flex min-h-52 flex-col items-center justify-center gap-3 border border-dashed border-ink/20 px-6 text-center">
          <Images size={22} className="text-ink-muted" aria-hidden="true" />
          <p className="font-serif text-xl text-ink">Product screens are being prepared.</p>
          <p className="max-w-md text-sm leading-relaxed text-ink-muted">
            The case study is available now; the visual walkthrough will appear here as screenshots are added.
          </p>
        </div>
      </section>
    );
  }

  return (
    <>
      <section
        className="project-gallery border-y border-ink/10 py-10"
        aria-roledescription="carousel"
        aria-label={`${projectTitle} product screens`}
        tabIndex={0}
        onKeyDown={handleKeyDown}
      >
        <div className="mb-5 flex items-end justify-between gap-4">
          <div>
            <p className="terminal-text mb-2 text-xs uppercase tracking-[0.18em] text-ink-muted">Inside the product</p>
            <h2 className="font-serif text-2xl text-ink md:text-3xl">Screens and interactions.</h2>
          </div>
          <span className="terminal-text shrink-0 text-xs text-ink-muted" aria-live="polite">
            {String(activeIndex + 1).padStart(2, '0')} / {String(media.length).padStart(2, '0')}
          </span>
        </div>

        <div className="project-slider relative touch-pan-y overflow-hidden border border-ink/15 bg-ink/[0.035]">
          <motion.div
            className="flex cursor-grab active:cursor-grabbing"
            animate={{ x: `-${activeIndex * 100}%` }}
            transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 290, damping: 32, mass: 0.85 }}
            drag={media.length > 1 ? 'x' : false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            onDragEnd={handleDragEnd}
          >
            {media.map((item, index) => (
              <div
                key={item.id}
                className="flex aspect-video min-w-full items-center justify-center"
                aria-hidden={index !== activeIndex}
              >
                {item.media_type === 'photo' && (
                  <button
                    type="button"
                    onClick={() => {
                      setActiveIndex(index);
                      setLightboxOpen(true);
                    }}
                    className="group relative h-full w-full cursor-zoom-in"
                    aria-label={`Expand ${item.caption?.trim() || `screen ${index + 1} from ${projectTitle}`}`}
                    tabIndex={index === activeIndex ? 0 : -1}
                  >
                    <img
                      src={item.url}
                      alt={item.alt_text?.trim() || `${projectTitle} product screenshot ${index + 1}`}
                      className="pointer-events-none h-full w-full select-none object-contain"
                      draggable={false}
                    />
                    <span className="absolute bottom-4 right-4 inline-flex items-center gap-2 border border-white/20 bg-black/65 px-3 py-2 text-xs uppercase tracking-wide text-white opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                      <Expand size={13} aria-hidden="true" /> Open gallery
                    </span>
                  </button>
                )}

                {item.media_type === 'video' && item.source_type === 'upload' && (
                  <MediaPlayer src={item.url} playsInline className="h-full w-full">
                    <MediaProvider />
                    <DefaultVideoLayout icons={defaultLayoutIcons} />
                  </MediaPlayer>
                )}

                {item.media_type === 'video' && item.source_type === 'embed' && (
                  <iframe
                    src={getEmbedInfo(item.url).embedSrc}
                    className="h-full w-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={item.alt_text?.trim() || `${projectTitle} project video ${index + 1}`}
                    tabIndex={index === activeIndex ? 0 : -1}
                  />
                )}
              </div>
            ))}
          </motion.div>

          {media.length > 1 && (
            <>
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="absolute left-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center border border-white/25 bg-black/65 text-white transition-colors hover:bg-black md:left-5"
                aria-label="Previous project screen"
              >
                <ChevronLeft size={19} aria-hidden="true" />
              </button>
              <button
                type="button"
                onClick={() => navigate(1)}
                className="absolute right-3 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center border border-white/25 bg-black/65 text-white transition-colors hover:bg-black md:right-5"
                aria-label="Next project screen"
              >
                <ChevronRight size={19} aria-hidden="true" />
              </button>
            </>
          )}
        </div>

        <div className="mt-4 flex min-h-10 items-start justify-between gap-6">
          <p className="max-w-2xl text-sm leading-relaxed text-ink-muted">{activeDescription}</p>
          {activeItem.media_type === 'video' && (
            <span className="terminal-text inline-flex items-center gap-1.5 text-xs uppercase text-ink-muted">
              <Play size={12} aria-hidden="true" /> Video
            </span>
          )}
        </div>

        {media.length > 1 && (
          <div className="scrollbar-none mt-5 flex snap-x gap-3 overflow-x-auto pb-1" aria-label="Choose a project screen">
            {media.map((item, index) => {
              const thumbnail = thumbnails[index];
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setActiveIndex(index)}
                  className={`relative h-16 w-24 shrink-0 snap-start overflow-hidden border transition-all md:h-20 md:w-32 ${
                    index === activeIndex ? 'border-ink opacity-100' : 'border-ink/15 opacity-50 hover:opacity-85'
                  }`}
                  aria-label={`Show screen ${index + 1}`}
                  aria-current={index === activeIndex ? 'true' : undefined}
                >
                  {thumbnail.kind === 'image' && (
                    <img src={thumbnail.src} alt="" className="h-full w-full object-cover" />
                  )}
                  {thumbnail.kind === 'video' && (
                    <video src={thumbnail.src} className="h-full w-full object-cover" muted preload="metadata" />
                  )}
                  {thumbnail.kind === 'embed' && (
                    <span className="grid h-full w-full place-items-center bg-ink text-xs text-cream">{thumbnail.label}</span>
                  )}
                  {item.media_type === 'video' && (
                    <span className="absolute inset-0 grid place-items-center bg-black/20 text-white">
                      <Play size={16} aria-hidden="true" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </section>

      <AnimatePresence>
        {lightboxOpen && (
          <GalleryLightbox
            items={media}
            projectTitle={projectTitle}
            index={activeIndex}
            onClose={() => setLightboxOpen(false)}
            onNavigate={navigate}
            onSelect={setActiveIndex}
          />
        )}
      </AnimatePresence>
    </>
  );
}

function GalleryLightbox({
  items,
  projectTitle,
  index,
  onClose,
  onNavigate,
  onSelect,
}: {
  items: GalleryMedia[];
  projectTitle: string;
  index: number;
  onClose: () => void;
  onNavigate: (direction: -1 | 1) => void;
  onSelect: (index: number) => void;
}) {
  const reduceMotion = useReducedMotion();
  const item = items[index];
  const description = item.caption?.trim() || `Screen ${index + 1} from ${projectTitle}`;

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const handleKey = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft') onNavigate(-1);
      if (event.key === 'ArrowRight') onNavigate(1);
    };
    window.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKey);
    };
  }, [onClose, onNavigate]);

  const handleDragEnd = (_event: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    const swipePower = Math.abs(info.offset.x) * info.velocity.x;
    if (info.offset.x < -70 || swipePower < -7000) onNavigate(1);
    if (info.offset.x > 70 || swipePower > 7000) onNavigate(-1);
  };

  return (
    <motion.div
      className="fixed inset-0 z-[80] flex flex-col bg-black/95 p-4 text-white md:p-8"
      role="dialog"
      aria-modal="true"
      aria-label={`${projectTitle} screenshot viewer`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <div className="mb-4 flex items-center justify-between gap-4">
        <span className="terminal-text text-xs uppercase tracking-[0.16em] text-white/65">
          {String(index + 1).padStart(2, '0')} / {String(items.length).padStart(2, '0')}
        </span>
        <button
          type="button"
          onClick={onClose}
          className="grid h-10 w-10 place-items-center border border-white/25"
          aria-label="Close screenshot viewer"
        >
          <X size={18} aria-hidden="true" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1 overflow-hidden" onClick={(event) => event.stopPropagation()}>
        <motion.div
          className="flex h-full cursor-grab active:cursor-grabbing"
          animate={{ x: `-${index * 100}%` }}
          transition={reduceMotion ? { duration: 0 } : { type: 'spring', stiffness: 290, damping: 32, mass: 0.85 }}
          drag={items.length > 1 ? 'x' : false}
          dragConstraints={{ left: 0, right: 0 }}
          dragElastic={0.1}
          onDragEnd={handleDragEnd}
        >
          {items.map((slide, slideIndex) => (
            <div key={slide.id} className="flex h-full min-w-full items-center justify-center px-12 md:px-20">
              {slide.media_type === 'photo' && (
                <img
                  src={slide.url}
                  alt={slide.alt_text?.trim() || `${projectTitle} product screenshot ${slideIndex + 1}`}
                  className="pointer-events-none max-h-full max-w-full select-none object-contain"
                  draggable={false}
                />
              )}
              {slide.media_type === 'video' && slide.source_type === 'upload' && (
                <MediaPlayer src={slide.url} playsInline className="max-h-full w-full max-w-6xl">
                  <MediaProvider />
                  <DefaultVideoLayout icons={defaultLayoutIcons} />
                </MediaPlayer>
              )}
              {slide.media_type === 'video' && slide.source_type === 'embed' && (
                <iframe
                  src={getEmbedInfo(slide.url).embedSrc}
                  className="aspect-video max-h-full w-full max-w-6xl"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={slide.alt_text?.trim() || `${projectTitle} project video ${slideIndex + 1}`}
                />
              )}
            </div>
          ))}
        </motion.div>
        {items.length > 1 && (
          <>
            <button
              type="button"
              onClick={() => onNavigate(-1)}
              className="absolute left-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center border border-white/25 bg-black/70 md:left-3"
              aria-label="Previous project screen"
            >
              <ChevronLeft size={20} aria-hidden="true" />
            </button>
            <button
              type="button"
              onClick={() => onNavigate(1)}
              className="absolute right-0 top-1/2 grid h-10 w-10 -translate-y-1/2 place-items-center border border-white/25 bg-black/70 md:right-3"
              aria-label="Next project screen"
            >
              <ChevronRight size={20} aria-hidden="true" />
            </button>
          </>
        )}
      </div>
      <p className="mx-auto mt-4 max-w-2xl text-center text-sm text-white/70">{description}</p>
      {items.length > 1 && (
        <div className="scrollbar-none mx-auto mt-4 flex max-w-full gap-2 overflow-x-auto pb-1" aria-label="Choose gallery item">
          {items.map((slide, slideIndex) => {
            const embed = slide.source_type === 'embed' ? getEmbedInfo(slide.url) : null;
            const thumbnail = slide.media_type === 'photo' ? slide.url : embed?.thumbnail;
            return (
              <button
                key={slide.id}
                type="button"
                onClick={(event) => {
                  event.stopPropagation();
                  onSelect(slideIndex);
                }}
                className={`relative h-12 w-20 shrink-0 overflow-hidden border transition-opacity ${
                  slideIndex === index ? 'border-white opacity-100' : 'border-white/25 opacity-45 hover:opacity-80'
                }`}
                aria-label={`Show gallery item ${slideIndex + 1}`}
                aria-current={slideIndex === index ? 'true' : undefined}
              >
                {thumbnail ? (
                  <img src={thumbnail} alt="" className="h-full w-full object-cover" />
                ) : slide.source_type === 'upload' ? (
                  <video src={slide.url} className="h-full w-full object-cover" muted preload="metadata" />
                ) : (
                  <span className="grid h-full w-full place-items-center bg-white/10 text-[10px] uppercase text-white/70">Video</span>
                )}
                {slide.media_type === 'video' && (
                  <span className="absolute inset-0 grid place-items-center bg-black/25 text-white">
                    <Play size={12} aria-hidden="true" />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </motion.div>
  );
}
