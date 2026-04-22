import { FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronDown, Heart, MoreHorizontal, Pin, PinOff, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';

const ALIAS_STORAGE_KEY = 'portfolio_alias';
const ADMIN_REPLY_LABEL = 'Admin · Shivam';
const COMMENT_RATE_LIMIT_KEY = 'portfolio_comment_last';
const COMMENT_RATE_LIMIT_MS = 60_000;
const COMMENT_RATE_LIMIT_FUTURE_SKEW_MS = 5_000;
const COMMENTS_PAGE_SIZE = 10;



interface BlogInteractionsProps {
  blogId: string;
  isAdminSession: boolean;
  adminAvatarUrl?: string | null;
}

interface BlogComment {
  id: string;
  alias: string;
  text: string;
  created_at: string;
  edited_at: string | null;
  pinned: boolean;
}

interface BlogReply {
  id: string;
  comment_id: string;
  alias: string;
  text: string;
  created_at: string;
  is_admin: boolean;
  admin_avatar_url: string | null;
}

interface CommentWithReplies extends BlogComment {
  replies: BlogReply[];
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function getAliasFromStorage(): string {
  try {
    return localStorage.getItem(ALIAS_STORAGE_KEY)?.trim() ?? '';
  } catch {
    return '';
  }
}

function saveAliasToStorage(alias: string): void {
  try {
    localStorage.setItem(ALIAS_STORAGE_KEY, alias);
  } catch {
    // Ignore storage failures silently.
  }
}

function getFingerprint(): string {
  const key = 'portfolio_fp';
  let fp = localStorage.getItem(key);
  if (!fp) {
    fp = crypto.randomUUID();
    localStorage.setItem(key, fp);
  }
  return fp;
}

export default function BlogInteractions({ blogId, isAdminSession, adminAvatarUrl }: BlogInteractionsProps) {
  const [likeCount, setLikeCount] = useState(0);
  const [commentCount, setCommentCount] = useState(0);
  const [isLikedPulse, setIsLikedPulse] = useState(false);

  const [expanded, setExpanded] = useState(false);
  const [alias, setAlias] = useState('');
  const [commentText, setCommentText] = useState('');
  const [comments, setComments] = useState<CommentWithReplies[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [loadingMoreComments, setLoadingMoreComments] = useState(false);
  const [currentCommentsPage, setCurrentCommentsPage] = useState(0);
  const [hasMoreComments, setHasMoreComments] = useState(true);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [commentNotice, setCommentNotice] = useState<string | null>(null);
  const [replyDrafts, setReplyDrafts] = useState<Record<string, string>>({});
  const [activeReplyComposer, setActiveReplyComposer] = useState<string | null>(null);
  const [expandedReplies, setExpandedReplies] = useState<Record<string, boolean>>({});
  const [openMenuCommentId, setOpenMenuCommentId] = useState<string | null>(null);
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null);
  const [editedCommentText, setEditedCommentText] = useState('');
  const [pendingReportCommentId, setPendingReportCommentId] = useState<string | null>(null);
  const [commentActionNotice, setCommentActionNotice] = useState<{ commentId: string; message: 'Copied' | 'Reported' } | null>(
    null,
  );
  const commentIdsRef = useRef<string[]>([]);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const actionNoticeTimeoutRef = useRef<number | null>(null);

  const commentIds = useMemo(() => comments.map((item) => item.id), [comments]);

  useEffect(() => {
    commentIdsRef.current = commentIds;
  }, [commentIds]);

  const ensureAlias = (): string | null => {
    const directAlias = alias.trim();
    if (directAlias) {
      return directAlias;
    }

    const prompted = window.prompt('Enter an alias to comment:')?.trim() ?? '';
    if (!prompted) {
      return null;
    }

    setAlias(prompted);
    saveAliasToStorage(prompted);
    return prompted;
  };

  const loadLikeCount = async () => {
    const { data, error } = await supabase
      .from('blogs')
      .select('like_count')
      .eq('id', blogId)
      .maybeSingle<{ like_count: number | null }>();

    if (error) {
      return;
    }

    setLikeCount(data?.like_count ?? 0);
  };

  const loadCommentCount = async () => {
    const { count } = await supabase
      .from('blog_comments')
      .select('id', { count: 'exact', head: true })
      .eq('blog_id', blogId);

    setCommentCount(count ?? 0);
  };

  const loadComments = async (page = 0, append = false) => {
    if (append) {
      setLoadingMoreComments(true);
    } else {
      setLoadingComments(true);
    }
    setCommentsError(null);

    const { data: commentRows, error: commentError } = await supabase
      .from('blog_comments')
      .select('id,alias,text,created_at,edited_at,pinned')
      .eq('blog_id', blogId)
      .order('pinned', { ascending: false })
      .order('created_at', { ascending: false })
      .range(page * COMMENTS_PAGE_SIZE, page * COMMENTS_PAGE_SIZE + COMMENTS_PAGE_SIZE - 1);

    if (commentError) {
      setCommentsError('Unable to load comments right now.');
      if (!append) {
        setComments([]);
      }
      setLoadingComments(false);
      setLoadingMoreComments(false);
      return;
    }

    const typedComments = (commentRows ?? []) as BlogComment[];
    if (typedComments.length === 0) {
      if (!append) {
        setComments([]);
      }
      setHasMoreComments(false);
      setCurrentCommentsPage(page);
      setLoadingComments(false);
      setLoadingMoreComments(false);
      return;
    }

    const ids = typedComments.map((item) => item.id);
    const { data: replyRows } = await supabase
      .from('blog_comment_replies')
      .select('id,comment_id,alias,text,created_at,is_admin,admin_avatar_url')
      .in('comment_id', ids)
      .order('created_at', { ascending: true });

    const repliesByComment = new Map<string, BlogReply[]>();
    ((replyRows ?? []) as BlogReply[]).forEach((reply) => {
      const current = repliesByComment.get(reply.comment_id) ?? [];
      current.push(reply);
      repliesByComment.set(reply.comment_id, current);
    });

    const nextComments = typedComments.map((comment) => ({
      ...comment,
      replies: repliesByComment.get(comment.id) ?? [],
    }));

    setComments((prev) => {
      if (!append) {
        return nextComments;
      }
      const existingIds = new Set(prev.map((item) => item.id));
      return [...prev, ...nextComments.filter((item) => !existingIds.has(item.id))];
    });
    setHasMoreComments(typedComments.length === COMMENTS_PAGE_SIZE);
    setCurrentCommentsPage(page);
    setLoadingComments(false);
    setLoadingMoreComments(false);
  };

  useEffect(() => {
    setAlias(getAliasFromStorage());
    void loadLikeCount();
    void loadCommentCount();

    const channel = supabase
      .channel(`blog-interactions-${blogId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'blogs', filter: `id=eq.${blogId}` },
        (payload) => {
          const nextLikeCount = (payload.new as { like_count?: number | null }).like_count;
          if (typeof nextLikeCount === 'number') {
            setLikeCount(nextLikeCount);
          }
        },
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'blog_comments', filter: `blog_id=eq.${blogId}` },
        () => {
          void loadCommentCount();
          if (expanded) {
            void loadComments();
          }
        },
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'blog_comment_replies' }, (payload) => {
        const nextCommentId =
          (payload.new as { comment_id?: string } | null)?.comment_id ??
          (payload.old as { comment_id?: string } | null)?.comment_id;
        if (expanded && nextCommentId && commentIdsRef.current.includes(nextCommentId)) {
          void loadComments();
        }
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [blogId, expanded]);

  useEffect(() => {
    if (!expanded) {
      return;
    }
    void loadComments();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  useEffect(() => {
    if (!openMenuCommentId) {
      return;
    }

    const handlePointerDown = (event: MouseEvent) => {
      if (menuRef.current?.contains(event.target as Node)) {
        return;
      }
      setOpenMenuCommentId(null);
    };

    document.addEventListener('mousedown', handlePointerDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
    };
  }, [openMenuCommentId]);

  useEffect(
    () => () => {
      if (actionNoticeTimeoutRef.current) {
        window.clearTimeout(actionNoticeTimeoutRef.current);
      }
    },
    [],
  );

  const handleAliasChange = (value: string) => {
    setAlias(value);
    saveAliasToStorage(value.trim());
  };

  const handleLike = async () => {
  const { data, error } = await supabase.rpc('increment_blog_like', {
    blog_uuid: blogId,
    fingerprint: getFingerprint(),
  });

  if (!error && typeof data === 'number') {
    setLikeCount(data);
  }

  setIsLikedPulse(true);
  window.setTimeout(() => setIsLikedPulse(false), 700);
};

  const handleCommentSubmit = async (event: FormEvent) => {
    event.preventDefault();
    const finalAlias = ensureAlias();
    const text = commentText.trim();

    if (!finalAlias || !text) {
      return;
    }

    const now = Date.now();
    try {
      const lastRaw = localStorage.getItem(COMMENT_RATE_LIMIT_KEY);
      const lastTimestamp = lastRaw ? parseInt(lastRaw, 10) : 0;
      if (
        Number.isNaN(lastTimestamp) ||
        lastTimestamp < 0 ||
        lastTimestamp > now + COMMENT_RATE_LIMIT_FUTURE_SKEW_MS
      ) {
        localStorage.removeItem(COMMENT_RATE_LIMIT_KEY);
      } else if (lastTimestamp > 0 && now - lastTimestamp < COMMENT_RATE_LIMIT_MS) {
        setCommentNotice('Please wait before commenting again.');
        return;
      }
    } catch {
      // Ignore storage access errors and continue.
    }

    const { error } = await supabase.from('blog_comments').insert({
      blog_id: blogId,
      alias: finalAlias,
      text,
      pinned: false,
    });

    if (error) {
      setCommentsError('Unable to post your comment right now.');
      return;
    }

    try {
      localStorage.setItem(COMMENT_RATE_LIMIT_KEY, String(now));
    } catch {
      // Ignore storage access errors silently.
    }

    setCommentNotice(null);
    setCommentText('');
    setExpanded(true);
    void loadComments();
    void loadCommentCount();
  };

  const handleReplySubmit = async (commentId: string, event: FormEvent) => {
    event.preventDefault();
    const finalAlias = ensureAlias();
    const text = (replyDrafts[commentId] ?? '').trim();

    if (!finalAlias || !text) {
      return;
    }

    const { error } = await supabase.from('blog_comment_replies').insert({
      comment_id: commentId,
      alias: finalAlias,
      text,
      is_admin: isAdminSession,
      admin_avatar_url: isAdminSession ? adminAvatarUrl ?? null : null,
    });

    if (error) {
      setCommentsError('Unable to post your reply right now.');
      return;
    }

    setReplyDrafts((prev) => ({ ...prev, [commentId]: '' }));
    setExpandedReplies((prev) => ({ ...prev, [commentId]: true }));
    setActiveReplyComposer(null);
    void loadComments();
  };

  const pinComment = async (commentId: string) => {
    const { error } = await supabase.from('blog_comments').update({ pinned: true }).eq('id', commentId);
    if (error) {
      setCommentsError('Unable to pin this comment right now.');
      return;
    }

    void loadComments();
  };

  const unpinComment = async (commentId: string) => {
    const { error } = await supabase.from('blog_comments').update({ pinned: false }).eq('id', commentId);
    if (error) {
      setCommentsError('Unable to unpin this comment right now.');
      return;
    }

    void loadComments();
  };

  const deleteComment = async (commentId: string) => {
  const { error } = await supabase.from('blog_comments').delete().eq('id', commentId);
  console.log('delete error:', error);
  if (error) {
    setCommentsError('Unable to delete this comment right now.');
    return;
  }
  void loadComments();
  void loadCommentCount();
};

  const deleteReply = async (replyId: string) => {
    const { error } = await supabase.from('blog_comment_replies').delete().eq('id', replyId);
    if (error) {
      setCommentsError('Unable to delete this reply right now.');
      return;
    }

    void loadComments();
  };

  const showCommentActionNotice = (commentId: string, message: 'Copied' | 'Reported') => {
    if (actionNoticeTimeoutRef.current) {
      window.clearTimeout(actionNoticeTimeoutRef.current);
    }

    setCommentActionNotice({ commentId, message });
    actionNoticeTimeoutRef.current = window.setTimeout(() => {
      setCommentActionNotice(null);
    }, 1600);
  };

  const saveEditedComment = async (commentId: string) => {
    const text = editedCommentText.trim();
    if (!text) {
      return;
    }

    const { error } = await supabase.from('blog_comments').update({ text }).eq('id', commentId);
    if (error) {
      setCommentsError('Unable to edit this comment right now.');
      return;
    }

    setEditingCommentId(null);
    setEditedCommentText('');
    void loadComments();
  };

  const selfDeleteComment = async (commentId: string) => {
    const { error } = await supabase.from('blog_comments').delete().eq('id', commentId);
    if (error) {
      setCommentsError('Unable to delete this comment right now.');
      return;
    }

    if (editingCommentId === commentId) {
      setEditingCommentId(null);
      setEditedCommentText('');
    }
    if (pendingReportCommentId === commentId) {
      setPendingReportCommentId(null);
    }
    setOpenMenuCommentId(null);
    void loadComments();
    void loadCommentCount();
  };

  const submitCommentReport = async (commentId: string, comment: CommentWithReplies) => {
    const { error } = await supabase.from('blog_comment_reports').insert({
      comment_id: commentId,
      comment_text: comment.text,
      alias: comment.alias,
    });
    if (error) {
      setCommentsError('Unable to report this comment right now.');
      return;
    }

    setPendingReportCommentId(null);
    showCommentActionNotice(commentId, 'Reported');
  };

  const copyCommentText = async (commentId: string, text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      showCommentActionNotice(commentId, 'Copied');
    } catch {
      setCommentsError('Unable to copy this comment right now.');
    }
  };

  return (
    <div className="mt-5 border-t border-ink/10 pt-4">
      <div className="flex flex-wrap items-center gap-4">
        <button
          type="button"
          onClick={handleLike}
          className="inline-flex items-center gap-2 border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide text-ink"
        >
          <Heart
            size={14}
            className={isLikedPulse ? 'text-[#e63946]' : 'text-ink-muted'}
            fill={isLikedPulse ? '#e63946' : 'none'}
          />
          Like
          <span className="text-ink">({likeCount})</span>
        </button>

        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="inline-flex items-center gap-2 border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide text-ink"
        >
          Comments ({commentCount})
          <ChevronDown size={14} className={`transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </button>
      </div>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${expanded ? 'max-h-[2000px] opacity-100 mt-4' : 'max-h-0 opacity-0'}`}
      >
        <div className="border border-ink/15 p-4 space-y-4">
          <div className="space-y-2">
            <label className="terminal-text text-xs text-ink-muted uppercase">Alias</label>
            <input
              value={alias}
              onChange={(event) => handleAliasChange(event.target.value)}
              placeholder="Choose an alias"
              className="w-full border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none"
            />
          </div>

          <form className="space-y-2" onSubmit={handleCommentSubmit}>
            <textarea
              value={commentText}
              onChange={(event) => {
                setCommentText(event.target.value);
                if (commentNotice) {
                  setCommentNotice(null);
                }
              }}
              placeholder="Write a comment"
              className="w-full min-h-24 border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none"
            />
            <button type="submit" className="border border-ink/20 px-3 py-2 text-xs uppercase tracking-wide text-ink">
              Post Comment
            </button>
            {commentNotice && <p className="text-xs text-ink-muted">{commentNotice}</p>}
          </form>

          {loadingComments && <p className="text-xs text-ink-muted">Loading comments…</p>}
          {commentsError && <p className="text-xs text-red-600">{commentsError}</p>}

          {!loadingComments && comments.length === 0 && <p className="text-xs text-ink-muted">No comments yet.</p>}

          <div className="space-y-3">
            {comments.map((comment) => (
              <div key={comment.id} className="border border-ink/10 p-3">
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <p className="font-semibold text-sm text-ink">{comment.alias}</p>
                  {comment.pinned && (
                    <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[#2a9d8f]">
                      <Pin size={10} fill="currentColor" />
                      Pinned
                    </span>
                  )}
                  <span className="text-xs text-ink-muted">{formatTimestamp(comment.created_at)}</span>
                  {comment.edited_at && <span className="text-xs text-ink-muted">edited</span>}
                  <div className="ml-auto flex items-center gap-2">
                    <div ref={openMenuCommentId === comment.id ? menuRef : null} className="relative">
                      <button
                        type="button"
                        onClick={() => setOpenMenuCommentId((prev) => (prev === comment.id ? null : comment.id))}
                        className="inline-flex items-center justify-center text-[#2a9d8f]"
                        aria-label="Comment actions"
                      >
                        <MoreHorizontal size={14} />
                      </button>
                      {openMenuCommentId === comment.id && (
                        <div className="absolute right-0 top-5 z-10 min-w-28 border border-ink/15 bg-cream p-1 shadow-sm">
                          {comment.alias === alias ? (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditedCommentText(comment.text);
                                  setEditingCommentId(comment.id);
                                  setOpenMenuCommentId(null);
                                }}
                                className="block w-full px-2 py-1 text-left text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                onClick={() => void selfDeleteComment(comment.id)}
                                className="block w-full px-2 py-1 text-left text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                              >
                                Delete
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setPendingReportCommentId(comment.id);
                                  setOpenMenuCommentId(null);
                                }}
                                className="block w-full px-2 py-1 text-left text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                              >
                                Report
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuCommentId(null);
                                  void copyCommentText(comment.id, comment.text);
                                }}
                                className="block w-full px-2 py-1 text-left text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                              >
                                Copy
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                    {isAdminSession && (
                      <div className="inline-flex items-center gap-2">
                        {comment.pinned ? (
                          <button
                            type="button"
                            onClick={() => unpinComment(comment.id)}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                          >
                            <PinOff size={11} />
                            Unpin
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => pinComment(comment.id)}
                            className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                          >
                            <Pin size={11} />
                            Pin
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => deleteComment(comment.id)}
                          className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                        >
                          <Trash2 size={11} />
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                </div>
                {editingCommentId === comment.id ? (
                  <div className="space-y-2">
                    <textarea
                      value={editedCommentText}
                      onChange={(event) => setEditedCommentText(event.target.value)}
                      className="w-full min-h-20 border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none"
                    />
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => void saveEditedComment(comment.id)}
                        className="border border-[#2a9d8f]/40 px-2 py-1 text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                      >
                        Save
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingCommentId(null);
                          setEditedCommentText('');
                        }}
                        className="border border-ink/20 px-2 py-1 text-[10px] uppercase tracking-wide text-ink-muted"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-ink-muted leading-relaxed">{comment.text}</p>
                )}

                {pendingReportCommentId === comment.id && comment.alias !== alias && (
                  <div className="mt-2 flex flex-wrap items-center gap-2 border border-[#2a9d8f]/30 bg-[#2a9d8f]/5 px-2 py-1.5">
                    <p className="text-[10px] uppercase tracking-wide text-[#2a9d8f]">
                      Are you sure you want to report this comment?
                    </p>
                    <button
                      type="button"
                      onClick={() => void submitCommentReport(comment.id, comment)}
                      className="border border-[#2a9d8f]/40 px-2 py-0.5 text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setPendingReportCommentId(null)}
                      className="border border-ink/20 px-2 py-0.5 text-[10px] uppercase tracking-wide text-ink-muted"
                    >
                      No
                    </button>
                  </div>
                )}

                {commentActionNotice?.commentId === comment.id && (
                  <p className="mt-2 text-[10px] uppercase tracking-wide text-[#2a9d8f]">{commentActionNotice.message}</p>
                )}

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setActiveReplyComposer((prev) => (prev === comment.id ? null : comment.id))}
                    className="text-xs uppercase tracking-wide text-ink-muted"
                  >
                    Reply
                  </button>
                  {comment.replies.length > 0 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedReplies((prev) => ({
                          ...prev,
                          [comment.id]: !prev[comment.id],
                        }))
                      }
                      className="text-xs uppercase tracking-wide text-ink-muted"
                    >
                      {expandedReplies[comment.id] ? 'Hide replies' : `Show replies (${comment.replies.length})`}
                    </button>
                  )}
                </div>

                {activeReplyComposer === comment.id && (
                  <form className="mt-3 space-y-2" onSubmit={(event) => handleReplySubmit(comment.id, event)}>
                    <textarea
                      value={replyDrafts[comment.id] ?? ''}
                      onChange={(event) =>
                        setReplyDrafts((prev) => ({
                          ...prev,
                          [comment.id]: event.target.value,
                        }))
                      }
                      placeholder="Write a reply"
                      className="w-full min-h-20 border border-ink/20 bg-transparent px-3 py-2 text-sm text-ink outline-none"
                    />
                    <button
                      type="submit"
                      className="border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide text-ink"
                    >
                      Post Reply
                    </button>
                  </form>
                )}

                {expandedReplies[comment.id] && comment.replies.length > 0 && (
                  <div className="mt-3 border-l border-ink/15 pl-3 space-y-2">
                    {comment.replies.map((reply) => (
                      <div key={reply.id} className="border border-ink/10 p-2">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          {reply.is_admin ? (
                            <>
                              <span className="inline-flex h-5 w-5 items-center justify-center overflow-hidden rounded-full border border-[#2a9d8f]/40 bg-[#2a9d8f]/10">
                                {reply.admin_avatar_url ? (
                                  <img
                                    src={reply.admin_avatar_url}
                                    alt="Admin avatar"
                                    className="h-full w-full object-cover"
                                  />
                                ) : (
                                  <span className="text-[9px] font-bold text-[#2a9d8f]">A</span>
                                )}
                              </span>
                              <span className="text-xs font-bold text-[#2a9d8f]">{ADMIN_REPLY_LABEL}</span>
                            </>
                          ) : (
                            <span className="text-xs font-semibold text-ink">{reply.alias}</span>
                          )}
                          <span className="text-[11px] text-ink-muted">{formatTimestamp(reply.created_at)}</span>
                          {isAdminSession && (
                            <button
                              type="button"
                              onClick={() => deleteReply(reply.id)}
                              className="ml-auto inline-flex items-center gap-1 text-[10px] uppercase tracking-wide text-[#2a9d8f]"
                            >
                              <Trash2 size={11} />
                              Delete
                            </button>
                          )}
                        </div>
                        <p className="text-sm text-ink-muted leading-relaxed">{reply.text}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
          {!loadingComments && comments.length > 0 && (
            <div className="pt-1">
              {hasMoreComments ? (
                <button
                  type="button"
                  onClick={() => void loadComments(currentCommentsPage + 1, true)}
                  disabled={loadingMoreComments}
                  className="border border-ink/20 px-3 py-1.5 text-xs uppercase tracking-wide text-ink disabled:opacity-60"
                >
                  {loadingMoreComments ? 'Loading…' : 'Load more'}
                </button>
              ) : (
                <p className="text-xs text-ink-muted">No more comments</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
