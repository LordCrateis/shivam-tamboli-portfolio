import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUpRight, ChevronDown, LogOut, Pencil, Plus, Trash2 } from 'lucide-react';
import FadeUp from './FadeUp';
import { supabase } from '../lib/supabase';

type BlogMode = 'auto' | 'visitor' | 'team';

type RouteState =
  | { kind: 'list'; mode: BlogMode }
  | { kind: 'roles' }
  | { kind: 'detail'; slug: string };

interface BlogPost {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  published: boolean;
  published_at: string | null;
  created_at: string;
  updated_at: string;
}

interface EditorState {
  id: string | null;
  title: string;
  slug: string;
  excerpt: string;
  content: string;
  category: string;
  published: boolean;
  publishedAt: string;
}

const DEFAULT_BLOG_CATEGORIES = ['General', 'Engineering', 'Machine Learning', 'Career', 'Life'];
const CUSTOM_CATEGORY_VALUE = '__custom__';
const PG_UNDEFINED_TABLE_ERROR_CODE = '42P01';
const SEARCH_ICON_URL = 'https://cdn.jsdelivr.net/npm/lucide-static@0.468.0/icons/search.svg';

const EMPTY_EDITOR: EditorState = {
  id: null,
  title: '',
  slug: '',
  excerpt: '',
  content: '<p></p>',
  category: 'General',
  published: false,
  publishedAt: '',
};

function normalizeCategory(category: string | null | undefined): string {
  return category?.trim() || 'General';
}

function parseRoute(hashValue: string): RouteState {
  const cleaned = hashValue.replace(/^#\/?/, '');
  const [root, second, ...rest] = cleaned.split('/');

  if (root !== 'blog') {
    return { kind: 'list', mode: 'auto' };
  }

  if (!second) {
    return { kind: 'list', mode: 'auto' };
  }

  if (second === 'roles') {
    return { kind: 'roles' };
  }

  if (second === 'visitor') {
    return { kind: 'list', mode: 'visitor' };
  }

  if (second === 'team') {
    return { kind: 'list', mode: 'team' };
  }

  const slug = [second, ...rest].join('/').trim();
  if (!slug) {
    return { kind: 'list', mode: 'auto' };
  }

  return { kind: 'detail', slug: decodeURIComponent(slug) };
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-');
}

function formatDate(date: string | null | undefined): string {
  if (!date) {
    return '';
  }

  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    year: 'numeric',
  }).format(new Date(date));
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

function getReadTime(html: string): string {
  const words = stripHtml(html).split(' ').filter(Boolean).length;
  const minutes = Math.max(1, Math.round(words / 200));
  return `${minutes} min read`;
}

function sanitizeRichHtml(input: string): string {
  const wrapper = document.createElement('div');
  wrapper.innerHTML = input;

  const allowedTags = new Set([
    'p',
    'br',
    'strong',
    'b',
    'em',
    'i',
    'u',
    'ul',
    'ol',
    'li',
    'blockquote',
    'h2',
    'h3',
    'h4',
    'code',
    'pre',
    'a',
  ]);

  const sanitizeNodeRecursively = (node: Element) => {
    for (const child of Array.from(node.children)) {
      const tagName = child.tagName.toLowerCase();

      if (!allowedTags.has(tagName)) {
        child.replaceWith(...Array.from(child.childNodes));
        continue;
      }

      for (const attr of Array.from(child.attributes)) {
        const attrName = attr.name.toLowerCase();

        if (tagName === 'a' && ['href', 'target', 'rel'].includes(attrName)) {
          if (attrName === 'href') {
            const hrefValue = attr.value.trim();
            const hasProtocolRelativePrefix = /^[/\\]{2}/.test(hrefValue);
            const isRelativePath = hrefValue.startsWith('/') || hrefValue.startsWith('#');

            let safeHref = false;
            if (isRelativePath) {
              safeHref = !hasProtocolRelativePrefix;
            } else {
              try {
                const parsed = new URL(hrefValue);
                safeHref = ['http:', 'https:', 'mailto:'].includes(parsed.protocol);
              } catch {
                safeHref = false;
              }
            }

            if (!safeHref) {
              child.removeAttribute(attr.name);
            }
          }
          continue;
        }

        child.removeAttribute(attr.name);
      }

      if (tagName === 'a') {
        child.setAttribute('rel', 'noopener noreferrer');
        child.setAttribute('target', '_blank');
      }

      sanitizeNodeRecursively(child);
    }
  };

  sanitizeNodeRecursively(wrapper);
  return wrapper.innerHTML;
}

interface BlogProps {
  isAdminSession: boolean;
}

export default function Blog({ isAdminSession }: BlogProps) {
  const currentYear = new Date().getFullYear();
  const contentRef = useRef<HTMLDivElement | null>(null);
  const isUserEditingRef = useRef(false);
  const selectionRef = useRef<Range | null>(null);

  const [hashValue, setHashValue] = useState(window.location.hash || '#/blog');
  const route = useMemo(() => parseRoute(hashValue), [hashValue]);
  const activeMode =
    route.kind === 'list'
      ? route.mode === 'auto'
        ? isAdminSession
          ? 'team'
          : 'visitor'
        : route.mode
      : 'visitor';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [activePost, setActivePost] = useState<BlogPost | null>(null);
  const [editor, setEditor] = useState<EditorState>(EMPTY_EDITOR);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [blogError, setBlogError] = useState<string | null>(null);
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);
  const [categoryOptions, setCategoryOptions] = useState<string[]>(DEFAULT_BLOG_CATEGORIES);
  const [searchQuery, setSearchQuery] = useState('');
  const normalizedBlogSearch = searchQuery.trim().toLowerCase();
  const filteredPosts = useMemo(() => {
    if (!normalizedBlogSearch) {
      return posts;
    }

    return posts.filter((post) => {
      const searchable = [
        post.title,
        post.excerpt,
        normalizeCategory(post.category),
        stripHtml(post.content),
      ]
        .join(' ')
        .toLowerCase();

      return searchable.includes(normalizedBlogSearch);
    });
  }, [posts, normalizedBlogSearch]);

  const saveEditorSelection = () => {
    const editorElement = contentRef.current;
    if (!editorElement) {
      selectionRef.current = null;
      return;
    }

    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0) {
      selectionRef.current = null;
      return;
    }

    const range = selection.getRangeAt(0);
    const common = range.commonAncestorContainer;
    const insideEditor = editorElement.contains(
      common.nodeType === Node.ELEMENT_NODE ? common : common.parentNode,
    );

    selectionRef.current = insideEditor ? range.cloneRange() : null;
  };

  const restoreEditorSelection = () => {
    const selection = window.getSelection();
    if (!selection || !selectionRef.current) {
      return;
    }

    selection.removeAllRanges();
    selection.addRange(selectionRef.current);
  };

  const syncEditorContent = () => {
    const latestContent = contentRef.current?.innerHTML ?? '';
    setEditor((prev) => ({ ...prev, content: latestContent }));
  };

  const isMissingBlogsTableError = (error: { code?: string; message?: string } | null) =>
    error?.code === PG_UNDEFINED_TABLE_ERROR_CODE ||
    /relation ["']?public\.blogs["']? does not exist/i.test(error?.message ?? '');

  useEffect(() => {
    const onHashChange = () => setHashValue(window.location.hash || '#/blog');
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    if (isUserEditingRef.current) {
      isUserEditingRef.current = false;
      return;
    }

    if (contentRef.current && contentRef.current.innerHTML !== editor.content) {
      contentRef.current.innerHTML = editor.content;
    }
  }, [editor.content]);

  useEffect(() => {
    const loadCategories = async () => {
      if (!isAdminSession) {
        return;
      }

      const { data, error } = await supabase.from('blogs').select('category');
      if (error || !data) {
        return;
      }

      const next = new Set(DEFAULT_BLOG_CATEGORIES);
      data.forEach((row) => {
        const category = normalizeCategory(row.category as string | null | undefined);
        if (category) {
          next.add(category);
        }
      });
      setCategoryOptions(Array.from(next));
    };

    void loadCategories();
  }, [isAdminSession]);

  useEffect(() => {
    const load = async () => {
      setBlogError(null);
      setLoading(true);

      if (route.kind === 'roles') {
        setLoading(false);
        return;
      }

      if (route.kind === 'list') {
        let query = supabase
          .from('blogs')
          .select('id,title,slug,excerpt,content,category,published,published_at,created_at,updated_at')
          .order('created_at', { ascending: false });

        if (activeMode === 'visitor') {
          query = query.eq('published', true);
        }

        const { data, error } = await query;
        if (error) {
          if (activeMode === 'visitor' || isMissingBlogsTableError(error)) {
            setBlogError(null);
          } else {
            setBlogError('Unable to load posts right now.');
          }
          setPosts([]);
        } else {
          setPosts(data ?? []);
        }
      }

      if (route.kind === 'detail') {
        let query = supabase
          .from('blogs')
          .select('id,title,slug,excerpt,content,category,published,published_at,created_at,updated_at')
          .eq('slug', route.slug)
          .limit(1);

        if (!isAdminSession) {
          query = query.eq('published', true);
        }

        const { data, error } = await query.maybeSingle();
        if (error) {
          if (!isAdminSession || isMissingBlogsTableError(error)) {
            setBlogError(null);
          } else {
            setBlogError('Unable to load this post right now.');
          }
          setActivePost(null);
        } else {
          setActivePost(data ?? null);
        }
      }

      setLoading(false);
    };

    void load();
  }, [route, activeMode, isAdminSession]);

  const openNewEditor = () => {
    setEditor(EMPTY_EDITOR);
  };

  const openEditorForPost = (post: BlogPost) => {
    setEditor({
      id: post.id,
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      content: post.content,
      category: normalizeCategory(post.category),
      published: post.published,
      publishedAt: post.published_at ? post.published_at.slice(0, 10) : '',
    });
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setEditor(EMPTY_EDITOR);
    window.location.hash = '/blog';
  };

  const handleSave = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setBlogError(null);

    const sanitizedContent = sanitizeRichHtml(editor.content).trim();
    const title = editor.title.trim();
    const slug = slugify(editor.slug || title);

    if (!title || !slug || !sanitizedContent) {
      setSaving(false);
      setBlogError('Title, slug, and content are required.');
      return;
    }

    const payload = {
      title,
      slug,
      excerpt: editor.excerpt.trim(),
      content: sanitizedContent,
      category: normalizeCategory(editor.category),
      published: editor.published,
      published_at: editor.publishedAt || null,
    };

    if (editor.id) {
      const { error } = await supabase.from('blogs').update(payload).eq('id', editor.id);
      if (error) {
        setBlogError('Unable to save this post right now.');
        setSaving(false);
        return;
      }
    } else {
      const { error } = await supabase.from('blogs').insert(payload);
      if (error) {
        setBlogError('Unable to save this post right now.');
        setSaving(false);
        return;
      }
    }

    const { data, error } = await supabase
      .from('blogs')
      .select('id,title,slug,excerpt,content,category,published,published_at,created_at,updated_at')
      .order('created_at', { ascending: false });

    if (error) {
      setBlogError(isMissingBlogsTableError(error) ? null : 'Unable to refresh posts right now.');
    } else {
      setPosts(data ?? []);
      setEditor(EMPTY_EDITOR);
      const categoryFromEditor = normalizeCategory(editor.category);
      if (!categoryOptions.includes(categoryFromEditor)) {
        setCategoryOptions((prev) => [...prev, categoryFromEditor]);
      }
    }

    setSaving(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('blogs').delete().eq('id', id);
    if (error) {
      setBlogError('Unable to delete this post right now.');
      return;
    }

    setPendingDeleteId(null);
    setPosts((prev) => prev.filter((post) => post.id !== id));
    if (editor.id === id) {
      setEditor(EMPTY_EDITOR);
    }
  };

  const handlePublishToggle = async (post: BlogPost) => {
    const { error } = await supabase
      .from('blogs')
      .update({ published: !post.published })
      .eq('id', post.id);

    if (error) {
      setBlogError('Unable to update publish status right now.');
      return;
    }

    setPosts((prev) =>
      prev.map((item) => (item.id === post.id ? { ...item, published: !item.published } : item)),
    );
  };

  const runCommand = (command: string, value?: string) => {
    contentRef.current?.focus();
    restoreEditorSelection();
    document.execCommand(command, false, value);
    saveEditorSelection();
    syncEditorContent();
  };

  const insertList = (listType: 'ul' | 'ol') => {
    runCommand(listType === 'ul' ? 'insertUnorderedList' : 'insertOrderedList');
  };

  const selectedCategoryValue = categoryOptions.includes(editor.category)
    ? editor.category
    : CUSTOM_CATEGORY_VALUE;

  return (
    <section className="pt-28 pb-20 px-6 md:px-12 lg:px-16 min-h-screen">
      <FadeUp>
        <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-10">
          Journal — {currentYear}
        </p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <h1
          className="font-serif text-ink leading-[0.95] tracking-tight mb-8"
          style={{ fontSize: 'clamp(2.8rem, 8vw, 7rem)' }}
        >
          Blog.
        </h1>
      </FadeUp>

      <FadeUp delay={0.14}>
        <p className="font-sans text-base md:text-lg text-ink-muted max-w-2xl leading-relaxed mb-12">
          Essays, build logs, and machine learning notes — now powered by your Supabase backend.
        </p>
      </FadeUp>

      {route.kind === 'roles' && isAdminSession && (
        <FadeUp delay={0.2}>
          <div className="grid md:grid-cols-2 gap-6 max-w-4xl mb-12">
            <button
              onClick={() => {
                window.location.hash = '/blog/visitor';
              }}
              className="text-left border border-ink/15 p-6 hover:border-ink/40 transition-colors"
              data-cursor="pointer"
            >
              <p className="terminal-text text-xs text-ink-muted uppercase mb-3">Read only</p>
              <h2 className="font-serif text-3xl text-ink mb-3">Visitor</h2>
              <p className="font-sans text-sm text-ink-muted leading-relaxed">
                Preview the same published-only listing public users see.
              </p>
            </button>

            <button
              onClick={() => {
                window.location.hash = '/blog/team';
              }}
              className="text-left border border-ink/15 p-6 hover:border-ink/40 transition-colors"
              data-cursor="pointer"
            >
              <p className="terminal-text text-xs text-ink-muted uppercase mb-3">Editor access</p>
              <h2 className="font-serif text-3xl text-ink mb-3">Team</h2>
              <p className="font-sans text-sm text-ink-muted leading-relaxed">
                Open the full listing with add, edit, delete, and publish controls.
              </p>
            </button>
          </div>
        </FadeUp>
      )}

      {route.kind === 'list' && (
        <>
          <FadeUp delay={0.18}>
            <div className="mb-8">
              <label htmlFor="blog-search" className="terminal-text text-xs text-ink-muted uppercase mb-2 block">
                Search blogs
              </label>
              <div className="relative max-w-xl">
                <img
                  src={SEARCH_ICON_URL}
                  alt=""
                  aria-hidden="true"
                  className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 opacity-50"
                />
                <input
                  id="blog-search"
                  type="search"
                  value={searchQuery}
                  onChange={(event) => setSearchQuery(event.target.value)}
                  placeholder="Search by title, category, or keywords"
                  className="w-full border border-ink/20 bg-transparent py-3 pl-11 pr-4 text-sm text-ink outline-none focus-visible:ring-2 focus-visible:ring-ink/35 focus-visible:ring-offset-1 focus-visible:ring-offset-cream"
                />
              </div>
            </div>
          </FadeUp>

          {isAdminSession && activeMode === 'team' && (
            <FadeUp delay={0.2}>
              <div className="flex flex-wrap items-center justify-between gap-4 mb-8 border border-ink/15 p-4">
                <p className="terminal-text text-xs text-ink-muted uppercase">
                  Admin mode active — full editor access
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={openNewEditor}
                    className="inline-flex items-center gap-2 bg-ink text-cream px-3 py-2 text-xs uppercase tracking-wide"
                    data-cursor="pointer"
                  >
                    <Plus size={14} />
                    New Post
                  </button>
                  <button
                    onClick={() => {
                      window.location.hash = '/blog/roles';
                    }}
                    className="border border-ink/20 px-3 py-2 text-xs uppercase tracking-wide text-ink"
                    data-cursor="pointer"
                  >
                    Modes
                  </button>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center gap-2 border border-ink/20 px-3 py-2 text-xs uppercase tracking-wide text-ink"
                    data-cursor="pointer"
                  >
                    <LogOut size={14} />
                    Logout
                  </button>
                </div>
              </div>
            </FadeUp>
          )}

          {isAdminSession && activeMode === 'team' && (
            <FadeUp delay={0.22}>
              <form onSubmit={handleSave} className="border border-ink/15 p-6 mb-12 space-y-4">
                <h3 className="font-serif text-2xl text-ink">
                  {editor.id ? 'Edit Post' : 'Create Post'}
                </h3>

                <div className="grid md:grid-cols-2 gap-4">
                  <input
                    value={editor.title}
                    onChange={(event) => setEditor((prev) => ({ ...prev, title: event.target.value }))}
                    placeholder="Title"
                    className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                    required
                  />
                  <input
                    value={editor.slug}
                    onChange={(event) => setEditor((prev) => ({ ...prev, slug: event.target.value }))}
                    placeholder="Slug (optional, auto-generated from title)"
                    className="border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                  />
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative">
                    <select
                      value={selectedCategoryValue}
                      onChange={(event) => {
                        if (event.target.value === CUSTOM_CATEGORY_VALUE) {
                          setEditor((prev) => ({
                            ...prev,
                            category: categoryOptions.includes(prev.category) ? '' : prev.category,
                          }));
                          return;
                        }

                        setEditor((prev) => ({ ...prev, category: event.target.value }));
                      }}
                      aria-label="Post category"
                      className="blog-category-select"
                    >
                      {categoryOptions.map((category) => (
                        <option key={category} value={category}>
                          {category}
                        </option>
                      ))}
                      <option value={CUSTOM_CATEGORY_VALUE}>Custom...</option>
                    </select>
                    <ChevronDown
                      size={14}
                      className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-ink-muted"
                    />
                  </div>

                  <label className="flex items-center gap-2 border border-ink/20 px-4 py-3 text-sm text-ink">
                    <input
                      type="checkbox"
                      checked={editor.published}
                      onChange={(event) => setEditor((prev) => ({ ...prev, published: event.target.checked }))}
                    />
                    Published
                  </label>
                </div>

                {selectedCategoryValue === CUSTOM_CATEGORY_VALUE && (
                  <input
                    value={editor.category}
                    onChange={(event) => setEditor((prev) => ({ ...prev, category: event.target.value }))}
                    placeholder="Custom category"
                    className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                    required
                  />
                )}

                <div className="space-y-2">
                  <label className="terminal-text text-xs text-ink-muted uppercase">Published date</label>
                  <input
                    type="date"
                    value={editor.publishedAt}
                    onChange={(event) => setEditor((prev) => ({ ...prev, publishedAt: event.target.value }))}
                    className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none"
                  />
                </div>

                <textarea
                  value={editor.excerpt}
                  onChange={(event) => setEditor((prev) => ({ ...prev, excerpt: event.target.value }))}
                  placeholder="Excerpt"
                  className="w-full border border-ink/20 bg-transparent px-4 py-3 text-sm outline-none min-h-24"
                />

                <div className="border border-ink/20">
                  <div className="flex flex-wrap gap-2 border-b border-ink/15 p-3">
                    <button
                      type="button"
                      onClick={() => runCommand('bold')}
                      className="border border-ink/20 px-2 py-1 text-xs cursor-pointer"
                    >
                      Bold
                    </button>
                    <button
                      type="button"
                      onClick={() => runCommand('italic')}
                      className="border border-ink/20 px-2 py-1 text-xs cursor-pointer"
                    >
                      Italic
                    </button>
                    <button
                      type="button"
                      onClick={() => insertList('ul')}
                      className="border border-ink/20 px-2 py-1 text-xs cursor-pointer"
                    >
                      Bullet List
                    </button>
                    <button
                      type="button"
                      onClick={() => insertList('ol')}
                      className="border border-ink/20 px-2 py-1 text-xs cursor-pointer"
                    >
                      Numbered List
                    </button>
                  </div>
                  <div
                    ref={contentRef}
                    contentEditable
                    className="editor-rich-content min-h-52 p-4 outline-none text-sm leading-relaxed"
                    onInput={(event) =>
                      (() => {
                        isUserEditingRef.current = true;
                        saveEditorSelection();
                        setEditor((prev) => ({
                          ...prev,
                          content: (event.target as HTMLDivElement).innerHTML,
                        }));
                      })()
                    }
                    onKeyUp={saveEditorSelection}
                    onMouseUp={saveEditorSelection}
                    suppressContentEditableWarning
                  />
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="bg-ink text-cream px-4 py-2 text-xs uppercase tracking-wide disabled:opacity-60"
                    data-cursor="pointer"
                  >
                    {saving ? 'Saving…' : editor.id ? 'Update Post' : 'Publish Post'}
                  </button>
                  {editor.id && (
                    <button
                      type="button"
                      onClick={openNewEditor}
                      className="border border-ink/20 px-4 py-2 text-xs uppercase tracking-wide"
                      data-cursor="pointer"
                    >
                      Clear
                    </button>
                  )}
                </div>
              </form>
            </FadeUp>
          )}

          {loading && <p className="text-sm text-ink-muted">Loading posts…</p>}
          {blogError && <p className="text-sm text-red-600 mb-4">{blogError}</p>}
          {!loading && !blogError && filteredPosts.length === 0 && (
            <p className="text-sm text-ink-muted mb-4">
              {normalizedBlogSearch ? 'No blog posts match this search.' : 'No posts yet.'}
            </p>
          )}

          <div className="border-t border-ink/10 divide-y divide-ink/10">
            {filteredPosts.map((post, idx) => (
              <FadeUp key={post.id} delay={0.18 + idx * 0.04}>
                <article className="py-8">
                  <div className="flex flex-col lg:flex-row lg:items-start gap-5 lg:gap-8">
                    <p className="terminal-text text-xs text-ink-muted shrink-0 w-8 mt-1">
                      {String(idx + 1).padStart(2, '0')}
                    </p>

                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mb-3">
                        <span className="terminal-text text-xs text-ink-muted">
                          {formatDate(post.published_at || post.created_at)}
                        </span>
                        <span className="terminal-text text-xs text-ink-muted">{getReadTime(post.content)}</span>
                        <span className="terminal-text text-xs border border-ink/20 px-2 py-0.5 text-ink-muted">
                          {normalizeCategory(post.category)}
                        </span>
                        {!post.published && (
                          <span className="terminal-text text-xs border border-ink/20 px-2 py-0.5 text-ink-muted">
                            Draft
                          </span>
                        )}
                      </div>

                      <a
                        href={`#/blog/${encodeURIComponent(post.slug)}`}
                        className="font-serif text-2xl md:text-3xl text-ink mb-3 inline-block hover:opacity-70 transition-opacity"
                        data-cursor="pointer"
                      >
                        {post.title}
                      </a>

                      <p className="font-sans text-sm md:text-base text-ink-muted leading-relaxed max-w-3xl">
                        {post.excerpt || 'No excerpt provided.'}
                      </p>

                      {isAdminSession && activeMode === 'team' && (
                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            onClick={() => openEditorForPost(post)}
                            className="inline-flex items-center gap-1 border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            <Pencil size={12} />
                            Edit
                          </button>
                          <button
                            onClick={() => handlePublishToggle(post)}
                            className="border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            {post.published ? 'Mark Draft' : 'Publish'}
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(post.id)}
                            className="inline-flex items-center gap-1 border border-red-300 text-red-600 px-3 py-1.5 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            <Trash2 size={12} />
                            Delete
                          </button>
                        </div>
                      )}
                      {isAdminSession && activeMode === 'team' && pendingDeleteId === post.id && (
                        <div className="mt-3 flex flex-wrap items-center gap-2 border border-red-200 bg-red-50/40 px-3 py-2">
                          <p className="text-xs text-red-700">Delete this post permanently?</p>
                          <button
                            onClick={() => handleDelete(post.id)}
                            className="border border-red-300 text-red-700 px-2 py-1 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            Confirm
                          </button>
                          <button
                            onClick={() => setPendingDeleteId(null)}
                            className="border border-ink/20 text-ink px-2 py-1 text-xs uppercase tracking-wide"
                            data-cursor="pointer"
                          >
                            Cancel
                          </button>
                        </div>
                      )}
                    </div>

                    <ArrowUpRight size={18} className="text-ink-muted lg:mt-1 shrink-0" />
                  </div>
                </article>
              </FadeUp>
            ))}
          </div>
        </>
      )}

      {route.kind === 'roles' && !isAdminSession && (
        <FadeUp delay={0.2}>
          <div className="border-t border-ink/10 pt-6">
            <a
              href="#/blog"
              className="terminal-text text-xs text-ink-muted hover:text-ink uppercase"
              data-cursor="pointer"
            >
              ← Back to blog list
            </a>
          </div>
        </FadeUp>
      )}

      {route.kind === 'detail' && (
        <FadeUp delay={0.2}>
          {loading && <p className="text-sm text-ink-muted">Loading post…</p>}
          {blogError && <p className="text-sm text-red-600">{blogError}</p>}

          {!loading && !activePost && !blogError && <p className="text-sm text-ink-muted">This post is unavailable.</p>}

          {activePost && (
            <article className="max-w-4xl">
              <p className="terminal-text text-xs text-ink-muted uppercase mb-4">
                {normalizeCategory(activePost.category)}
              </p>
              <h2 className="font-serif text-4xl md:text-6xl text-ink leading-tight mb-4">{activePost.title}</h2>
              <p className="terminal-text text-xs text-ink-muted mb-10">
                {formatDate(activePost.published_at || activePost.created_at)} · {getReadTime(activePost.content)}
              </p>

              <div
                className="blog-rich-content font-sans text-base md:text-lg text-ink leading-relaxed space-y-4 [&_a]:underline [&_a]:underline-offset-2"
                dangerouslySetInnerHTML={{
                  __html: sanitizeRichHtml(activePost.content),
                }}
              />

              <div className="mt-12">
                <a
                  href="#/blog"
                  className="terminal-text text-xs text-ink-muted hover:text-ink uppercase"
                  data-cursor="pointer"
                >
                  ← Back to blog list
                </a>
              </div>
            </article>
          )}
        </FadeUp>
      )}
    </section>
  );
}
