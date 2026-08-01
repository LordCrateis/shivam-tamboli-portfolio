import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ChevronLeft,
  ChevronRight,
  Image as ImageIcon,
  Link as LinkIcon,
  Play,
  Plus,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { MediaPlayer, MediaProvider } from '@vidstack/react';
import { defaultLayoutIcons, DefaultVideoLayout } from '@vidstack/react/player/layouts/default';
import '@vidstack/react/player/styles/default/theme.css';
import '@vidstack/react/player/styles/default/layouts/video.css';

interface MediaRecord {
  id: string;
  project_id: string;
  media_type: 'photo' | 'video';
  source_type: 'upload' | 'embed';
  url: string;
  order_index: number;
}

interface ProjectMediaProps {
  projectId: string;
  isAdminSession: boolean;
  isHovered?: boolean;
}

const BUCKET = 'project-media';
const FADE_WIDTH = 96; // px, matches the w-16 fade overlay

function uploadFileWithProgress(
  file: File,
  bucket: string,
  path: string,
  accessToken: string,
  onProgress: (percent: number) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const url = `${import.meta.env.VITE_SUPABASE_URL}/storage/v1/object/${bucket}/${path}`;

    xhr.open('POST', url, true);
    xhr.setRequestHeader('Authorization', `Bearer ${accessToken}`);
    xhr.setRequestHeader('Content-Type', file.type);
    xhr.setRequestHeader('x-upsert', 'false'); // set 'true' if you want overwrite allowed

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const percent = Math.round((event.loaded / event.total) * 100);
        onProgress(percent);
      }
    };

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        resolve();
      } else {
        reject(new Error(`Upload failed: ${xhr.status} ${xhr.responseText}`));
      }
    };

    xhr.onerror = () => reject(new Error('Network error during upload'));

    xhr.send(file);
  });
}

function extractStoragePath(publicUrl: string): string | null {
  const marker = `/object/public/${BUCKET}/`;
  const index = publicUrl.indexOf(marker);
  if (index === -1) {
    return null;
  }
  return publicUrl.slice(index + marker.length);
}

function getYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{11})/,
  );
  return match ? match[1] : null;
}

function getVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

function getEmbedInfo(url: string): { provider: 'youtube' | 'vimeo' | 'other'; embedSrc: string; thumbnail: string | null } {
  const ytId = getYouTubeId(url);
  if (ytId) {
    return {
      provider: 'youtube',
      embedSrc: `https://www.youtube.com/embed/${ytId}?rel=0`,
      thumbnail: `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`,
    };
  }

  const vimeoId = getVimeoId(url);
  if (vimeoId) {
    return {
      provider: 'vimeo',
      embedSrc: `https://player.vimeo.com/video/${vimeoId}`,
      thumbnail: null,
    };
  }

  return { provider: 'other', embedSrc: url, thumbnail: null };
}

function formatTime(seconds: number): string {
  if (!Number.isFinite(seconds)) return '0:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0');
  return `${mins}:${secs}`;
}



export default function ProjectMedia({ projectId, isAdminSession, isHovered }: ProjectMediaProps) {
  const [media, setMedia] = useState<MediaRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [showAddPanel, setShowAddPanel] = useState(false);
  const [addKind, setAddKind] = useState<'photo' | 'video'>('photo');
  const [addMode, setAddMode] = useState<'upload' | 'embed'>('upload');
  const [embedUrl, setEmbedUrl] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);

  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const fetchMedia = useCallback(async () => {
    setLoading(true);
    const { data, error: fetchError } = await supabase
      .from('project_media')
      .select('id,project_id,media_type,source_type,url,order_index')
      .eq('project_id', projectId)
      .order('order_index', { ascending: true });

    if (fetchError) {
      setError('Unable to load media right now.');
    } else {
      setError(null);
      setMedia((data ?? []) as MediaRecord[]);
    }
    setLoading(false);
  }, [projectId]);

  useEffect(() => {
    void fetchMedia();
  }, [fetchMedia]);

  const updateScrollFade = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollFade();
    window.addEventListener('resize', updateScrollFade);
    return () => window.removeEventListener('resize', updateScrollFade);
  }, [updateScrollFade, media]);

  const scrollBy = (amount: number) => {
    scrollRef.current?.scrollBy({ left: amount, behavior: 'smooth' });
  };

  const resetAddPanel = () => {
    setShowAddPanel(false);
    setAddKind('photo');
    setAddMode('upload');
    setEmbedUrl('');
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    setUploadProgress(0);
    setError(null);

    const path = `${projectId}/${crypto.randomUUID()}-${file.name}`;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const accessToken = sessionData.session?.access_token;
      if (!accessToken) {
        setError('Not authenticated.');
        setUploading(false);
        setUploadProgress(null);
        return;
      }

      await uploadFileWithProgress(file, BUCKET, path, accessToken, (percent) => {
        setUploadProgress(percent);
      });

      const { data: publicUrlData } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const nextOrder = media.reduce((max, item) => Math.max(max, item.order_index), 0) + 1;

      const { error: insertError } = await supabase.from('project_media').insert({
        project_id: projectId,
        media_type: addKind,
        source_type: 'upload',
        url: publicUrlData.publicUrl,
        order_index: nextOrder,
      });

      if (insertError) {
        setError('Could not save this media item.');
      } else {
        await fetchMedia();
        resetAddPanel();
      }
    } catch (err) {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(null);
    }
  };

  const handleEmbedSubmit = async () => {
    if (!embedUrl.trim()) return;
    setUploading(true);
    setError(null);

    const nextOrder = media.reduce((max, item) => Math.max(max, item.order_index), 0) + 1;
    const { error: insertError } = await supabase.from('project_media').insert({
      project_id: projectId,
      media_type: 'video',
      source_type: 'embed',
      url: embedUrl.trim(),
      order_index: nextOrder,
    });

    if (insertError) {
      setError('Could not save this video link.');
    } else {
      await fetchMedia();
      resetAddPanel();
    }
    setUploading(false);
  };

  const handleDelete = async (item: MediaRecord) => {
    const { error: deleteError } = await supabase.from('project_media').delete().eq('id', item.id);
    if (deleteError) {
      setError('Unable to delete this item right now.');
      return;
    }

    if (item.source_type === 'upload') {
      const path = extractStoragePath(item.url);
      if (path) {
        await supabase.storage.from(BUCKET).remove([path]);
      }
    }

    setPendingDeleteId(null);
    await fetchMedia();
  };

  const thumbnailFor = useMemo(
    () => (item: MediaRecord) => {
      if (item.media_type === 'photo') {
        return { kind: 'image' as const, src: item.url };
      }
      if (item.source_type === 'upload') {
        return { kind: 'video-file' as const, src: item.url };
      }
      const info = getEmbedInfo(item.url);
      return info.thumbnail
        ? { kind: 'image' as const, src: info.thumbnail }
        : { kind: 'video-embed' as const, provider: info.provider };
    },
    [],
  );

  const totalTileCount = media.length + (isAdminSession ? 1 : 0);
  const isCompactLayout = media.length <= 4;

  if (!isAdminSession && media.length === 0 && !loading) {
    return null;
  }

  return (
    <div className="mt-4 border-t border-ink/10 pt-4" onClick={(event) => event.stopPropagation()}>
      <div className={isCompactLayout ? 'relative' : 'relative max-w-[600px] mx-auto'}>
        {canScrollLeft && (
          <>
            <div
              className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 bg-gradient-to-r from-cream via-cream/80 to-transparent"
              style={{ width: FADE_WIDTH }}
            />
            {isHovered && (
              <div
                className="pointer-events-none absolute left-0 top-0 bottom-0 z-[11] bg-gradient-to-r from-black/[0.04] to-transparent"
                style={{ width: FADE_WIDTH }}
              />
            )}
            <button
              type="button"
              onClick={() => scrollBy(-240)}
              className="absolute left-0 top-1/2 z-20 -translate-y-1/2 border border-ink/20 bg-cream p-1 text-ink-muted"
              aria-label="Scroll media left"
            >
              <ChevronLeft size={14} />
            </button>
          </>
        )}

        {canScrollRight && (
          <>
            <div
              className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 bg-gradient-to-l from-cream via-cream/80 to-transparent"
              style={{ width: FADE_WIDTH }}
            />
            {isHovered && (
              <div
                className="pointer-events-none absolute right-0 top-0 bottom-0 z-[11] bg-gradient-to-l from-black/[0.04] to-transparent"
                style={{ width: FADE_WIDTH }}
              />
            )}
            <button
              type="button"
              onClick={() => scrollBy(240)}
              className="absolute right-0 top-1/2 z-20 -translate-y-1/2 border border-ink/20 bg-cream p-1 text-ink-muted"
              aria-label="Scroll media right"
            >
              <ChevronRight size={14} />
            </button>
          </>
        )}

        <div
          ref={scrollRef}
          onScroll={updateScrollFade}
          className={
  isCompactLayout
    ? 'flex flex-wrap justify-center gap-3 pb-1'
    : 'flex gap-3 overflow-x-auto scrollbar-none pb-1'
}
        >
          {media.map((item, index) => {
            const thumb = thumbnailFor(item);
            return (
              <div key={item.id} className="group relative h-28 w-28 shrink-0 md:h-32 md:w-32">
                <button
                  type="button"
                  onClick={() => setLightboxIndex(index)}
                  className="relative h-full w-full overflow-hidden border border-ink/15 bg-ink/5"
                  data-cursor="pointer"
                >
                  {thumb.kind === 'image' && (
                    <img src={thumb.src} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                  {thumb.kind === 'video-file' && (
                    <video src={thumb.src} className="h-full w-full object-cover" muted preload="metadata" />
                  )}
                  {thumb.kind === 'video-embed' && (
                    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-obsidian text-paper">
                      <Play size={18} />
                      <span className="terminal-text text-[10px] uppercase">{thumb.provider}</span>
                    </div>
                  )}

                  {item.media_type === 'video' && thumb.kind !== 'video-embed' && (
                    <span className="absolute inset-0 flex items-center justify-center bg-black/25">
                      <Play size={18} className="text-white" />
                    </span>
                  )}
                </button>

                {isAdminSession && (
                  <button
                    type="button"
                    onClick={() => setPendingDeleteId(item.id)}
                    className="absolute right-1 top-1 hidden border border-red-300 bg-cream p-1 text-red-600 group-hover:block"
                    aria-label="Delete media"
                    data-cursor="pointer"
                  >
                    <Trash2 size={12} />
                  </button>
                )}

                {pendingDeleteId === item.id && (
                  <div className="absolute inset-0 z-30 flex flex-col items-center justify-center gap-1 bg-cream/95 p-2 text-center">
                    <p className="text-[10px] text-red-700">Delete this?</p>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => handleDelete(item)}
                        className="border border-red-300 px-2 py-0.5 text-[10px] uppercase text-red-700"
                      >
                        Yes
                      </button>
                      <button
                        type="button"
                        onClick={() => setPendingDeleteId(null)}
                        className="border border-ink/20 px-2 py-0.5 text-[10px] uppercase text-ink"
                      >
                        No
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {isAdminSession && (
            <button
              type="button"
              onClick={() => setShowAddPanel((prev) => !prev)}
              className="flex h-28 w-28 shrink-0 flex-col items-center justify-center gap-1 border border-dashed border-ink/25 text-ink-muted md:h-32 md:w-32"
              data-cursor="pointer"
            >
              <Plus size={18} />
              <span className="terminal-text text-[10px] uppercase">Add</span>
            </button>
          )}
        </div>
      </div>

      {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

      {isAdminSession && showAddPanel && (
        <div className="mt-3 border border-ink/15 p-3">
          <div className="mb-3 flex flex-wrap gap-2">
            {(['photo', 'video'] as const).map((kind) => (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  setAddKind(kind);
                  setAddMode('upload');
                }}
                className={`terminal-text px-3 py-1.5 text-xs uppercase tracking-wide ${
                  addKind === kind ? 'bg-ink text-cream' : 'border border-ink/20 text-ink-muted'
                }`}
              >
                {kind}
              </button>
            ))}
          </div>

          {addKind === 'video' && (
            <div className="mb-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setAddMode('upload')}
                className={`terminal-text inline-flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-wide ${
                  addMode === 'upload' ? 'bg-ink text-cream' : 'border border-ink/20 text-ink-muted'
                }`}
              >
                <Upload size={12} /> Upload file
              </button>
              <button
                type="button"
                onClick={() => setAddMode('embed')}
                className={`terminal-text inline-flex items-center gap-1 px-3 py-1.5 text-xs uppercase tracking-wide ${
                  addMode === 'embed' ? 'bg-ink text-cream' : 'border border-ink/20 text-ink-muted'
                }`}
              >
                <LinkIcon size={12} /> Paste link
              </button>
            </div>
          )}

          {addMode === 'upload' ? (
            <div className="flex flex-col gap-2">
              <label className="flex cursor-pointer items-center gap-2 border border-ink/20 px-4 py-3 text-sm text-ink-muted">
                <ImageIcon size={14} />
                {uploading ? 'Uploading…' : addKind === 'photo' ? 'Choose a photo' : 'Choose a video file'}
                <input
                  type="file"
                  accept={addKind === 'photo' ? 'image/*' : 'video/*'}
                  className="hidden"
                  disabled={uploading}
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleFileUpload(file);
                  }}
                />
              </label>

              {uploadProgress !== null && (
                <div className="w-full h-2 bg-ink/10 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-ink transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-wrap gap-2">
              <input
                value={embedUrl}
                onChange={(event) => setEmbedUrl(event.target.value)}
                placeholder="YouTube or Vimeo URL"
                className="flex-1 border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
              />
              <button
                type="button"
                onClick={handleEmbedSubmit}
                disabled={uploading || !embedUrl.trim()}
                className="bg-ink px-4 py-2 text-xs uppercase tracking-wide text-cream disabled:opacity-60"
              >
                {uploading ? 'Saving…' : 'Add'}
              </button>
            </div>
          )}
        </div>
      )}

      <AnimatePresence>
        {lightboxIndex !== null && media[lightboxIndex] && (
          <Lightbox
            items={media}
            index={lightboxIndex}
            onClose={() => setLightboxIndex(null)}
            onNavigate={setLightboxIndex}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function Lightbox({
  items,
  index,
  onClose,
  onNavigate,
}: {
  items: MediaRecord[];
  index: number;
  onClose: () => void;
  onNavigate: (index: number) => void;
}) {
  const item = items[index];

  useEffect(() => {
    document.body.style.overflow = 'hidden';
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
      if (event.key === 'ArrowLeft' && index > 0) onNavigate(index - 1);
      if (event.key === 'ArrowRight' && index < items.length - 1) onNavigate(index + 1);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [index, items.length, onClose, onNavigate]);

  return (
    <motion.div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-6"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
    >
      <button
        type="button"
        onClick={onClose}
        className="absolute right-6 top-6 border border-white/20 p-2 text-white"
        aria-label="Close"
      >
        <X size={18} />
      </button>

      {index > 0 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(index - 1);
          }}
          className="absolute left-4 top-1/2 -translate-y-1/2 border border-white/20 p-2 text-white md:left-8"
          aria-label="Previous"
        >
          <ChevronLeft size={20} />
        </button>
      )}

      {index < items.length - 1 && (
        <button
          type="button"
          onClick={(event) => {
            event.stopPropagation();
            onNavigate(index + 1);
          }}
          className="absolute right-4 top-1/2 -translate-y-1/2 border border-white/20 p-2 text-white md:right-8"
          aria-label="Next"
        >
          <ChevronRight size={20} />
        </button>
      )}

      <motion.div
        initial={{ scale: 0.96, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.96, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        style={{ width: '70vw', maxHeight: '80vh' }}
        className="relative"
        onClick={(event) => event.stopPropagation()}
      >
        {item.media_type === 'photo' && (
          <img src={item.url} alt="" className="max-h-[80vh] w-full object-contain" />
        )}

        {item.media_type === 'video' && item.source_type === 'upload' && (
  <MediaPlayer src={item.url} playsInline className="w-full overflow-hidden rounded-lg border border-white/10 max-h-[80vh]">
    <MediaProvider />
    <DefaultVideoLayout icons={defaultLayoutIcons} />
  </MediaPlayer>
)}

        {item.media_type === 'video' && item.source_type === 'embed' && (
          <div className="aspect-video w-full border border-white/10 bg-black">
            <iframe
              src={getEmbedInfo(item.url).embedSrc}
              className="h-full w-full"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              title="Project video"
            />
          </div>
        )}
      </motion.div>
    </motion.div>
  );
}