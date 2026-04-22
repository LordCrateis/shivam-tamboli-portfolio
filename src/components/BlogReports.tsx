import { useEffect, useMemo, useState } from 'react';
import FadeUp from './FadeUp';
import { supabase } from '../lib/supabase';

interface BlogReportsProps {
  isAdminSession: boolean;
}

interface BlogCommentReport {
  id: string;
  comment_id: string;
  alias: string;
  comment_text: string;
  created_at: string;
}

interface ReportBlogReference {
  blogId: string;
  slug: string;
  title: string;
}

function formatReportTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value));
}

export default function BlogReports({ isAdminSession }: BlogReportsProps) {
  const [reports, setReports] = useState<BlogCommentReport[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);
  const [blogRefsByCommentId, setBlogRefsByCommentId] = useState<Record<string, ReportBlogReference | null>>({});

  const reportCountLabel = useMemo(() => `${reports.length.toString().padStart(2, '0')} entries`, [reports.length]);

  const loadReports = async () => {
    if (!isAdminSession) {
      setReports([]);
      return;
    }

    setLoading(true);
    setError(null);

    const { data, error: reportsError } = await supabase
      .from('blog_comment_reports')
      .select('id,comment_id,alias,comment_text,created_at')
      .order('created_at', { ascending: false });

    if (reportsError) {
      setError('Unable to load reports right now.');
      setReports([]);
      setBlogRefsByCommentId({});
      setLoading(false);
      return;
    }

    const typedReports = (data ?? []) as BlogCommentReport[];
    setReports(typedReports);

    const commentIds = Array.from(new Set(typedReports.map((report) => report.comment_id)));
    if (commentIds.length === 0) {
      setBlogRefsByCommentId({});
      setLoading(false);
      return;
    }

    const { data: commentRows } = await supabase
      .from('blog_comments')
      .select('id,blogs(id,title,slug)')
      .in('id', commentIds);

    const nextRefs: Record<string, ReportBlogReference | null> = {};
    commentIds.forEach((commentId) => {
      nextRefs[commentId] = null;
    });

    (commentRows ?? []).forEach((row) => {
      const commentId = row.id as string;
      const blog = (row.blogs as { id?: string; title?: string; slug?: string } | null) ?? null;
      if (!blog?.id || !blog.slug || !blog.title) {
        return;
      }

      nextRefs[commentId] = {
        blogId: blog.id,
        slug: blog.slug,
        title: blog.title,
      };
    });

    setBlogRefsByCommentId(nextRefs);
    setLoading(false);
  };

  useEffect(() => {
    void loadReports();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdminSession]);

  const handleDeleteComment = async (report: BlogCommentReport) => {
    setActiveAction(`delete-comment-${report.id}`);
    setError(null);

    const { error: deleteCommentError } = await supabase.from('blog_comments').delete().eq('id', report.comment_id);
    if (deleteCommentError) {
      setError('Unable to delete this comment right now.');
      setActiveAction(null);
      return;
    }

    setReports((prev) => prev.filter((item) => item.id !== report.id));
    setActiveAction(null);
  };

  const handleIgnore = async (reportId: string) => {
    setActiveAction(`ignore-${reportId}`);
    setError(null);

    const { error: deleteReportError } = await supabase.from('blog_comment_reports').delete().eq('id', reportId);
    if (deleteReportError) {
      setError('Unable to ignore this report right now.');
      setActiveAction(null);
      return;
    }

    setReports((prev) => prev.filter((item) => item.id !== reportId));
    setActiveAction(null);
  };

  if (!isAdminSession) {
    return (
      <section className="pt-28 pb-20 px-6 md:px-12 lg:px-16 min-h-screen">
        <FadeUp>
          <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-8">Reports — restricted</p>
          <a
            href="#/blog"
            className="inline-flex border border-ink/20 px-3 py-2 text-xs uppercase tracking-wide text-ink"
            data-cursor="pointer"
          >
            Back to Blog
          </a>
        </FadeUp>
      </section>
    );
  }

  return (
    <section className="pt-28 pb-20 px-6 md:px-12 lg:px-16 min-h-screen">
      <FadeUp>
        <p className="terminal-text text-xs text-ink-muted tracking-widest uppercase mb-10">Admin logs — reports</p>
      </FadeUp>

      <FadeUp delay={0.08}>
        <h1 className="font-serif text-ink leading-[0.95] tracking-tight mb-4" style={{ fontSize: 'clamp(2.4rem, 6vw, 5rem)' }}>
          Comment Reports.
        </h1>
      </FadeUp>

      <FadeUp delay={0.12}>
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4 border border-ink/15 p-4">
          <p className="terminal-text text-xs text-[#2a9d8f] uppercase">{reportCountLabel}</p>
          <a href="#/blog/team" className="border border-ink/20 px-3 py-2 text-xs uppercase tracking-wide text-ink" data-cursor="pointer">
            Back to admin blog
          </a>
        </div>
      </FadeUp>

      {loading && <p className="text-sm text-ink-muted">Loading reports…</p>}
      {error && <p className="text-sm text-red-600">{error}</p>}
      {!loading && reports.length === 0 && <p className="text-sm text-ink-muted">No reports found.</p>}

      <div className="space-y-3">
        {reports.map((report) => {
          const blogReference = blogRefsByCommentId[report.comment_id];
          return (
            <FadeUp key={report.id} delay={0.15}>
              <article className="border border-ink/10 p-4">
                <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span className="terminal-text text-xs text-[#2a9d8f] uppercase">{report.alias}</span>
                  <span className="terminal-text text-xs text-ink-muted uppercase">{formatReportTimestamp(report.created_at)}</span>
                  {blogReference ? (
                    <a
                      href={`#/blog/${encodeURIComponent(blogReference.slug)}`}
                      className="terminal-text text-xs uppercase text-ink-muted hover:text-ink"
                      data-cursor="pointer"
                    >
                      Blog: {blogReference.title}
                    </a>
                  ) : (
                    <span className="terminal-text text-xs uppercase text-ink-muted">Blog: unavailable</span>
                  )}
                </div>

                <p className="text-sm text-ink-muted leading-relaxed">{report.comment_text}</p>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => void handleDeleteComment(report)}
                    disabled={activeAction === `delete-comment-${report.id}`}
                    className="border border-[#2a9d8f]/40 px-3 py-1.5 text-[10px] uppercase tracking-wide text-[#2a9d8f] disabled:opacity-60"
                  >
                    Delete Comment
                  </button>
                  <button
                    type="button"
                    onClick={() => void handleIgnore(report.id)}
                    disabled={activeAction === `ignore-${report.id}`}
                    className="border border-ink/20 px-3 py-1.5 text-[10px] uppercase tracking-wide text-ink-muted disabled:opacity-60"
                  >
                    Ignore
                  </button>
                </div>
              </article>
            </FadeUp>
          );
        })}
      </div>
    </section>
  );
}
