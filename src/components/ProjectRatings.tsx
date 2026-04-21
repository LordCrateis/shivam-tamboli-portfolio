import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';

interface ProjectRatingsProps {
  projectId: string;
}

interface RatingRow {
  value: number;
}

function clampRating(value: number): number {
  return Math.max(0, Math.min(5, value));
}

function StarRow({ value }: { value: number }) {
  const percentage = `${(clampRating(value) / 5) * 100}%`;

  return (
    <span className="relative inline-block leading-none text-sm" aria-hidden="true">
      <span className="text-ink/20">☆☆☆☆☆</span>
      <span className="absolute inset-0 overflow-hidden whitespace-nowrap text-[#2a9d8f]" style={{ width: percentage }}>
        ★★★★★
      </span>
    </span>
  );
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

export default function ProjectRatings({ projectId }: ProjectRatingsProps) {
  const [average, setAverage] = useState(0);
  const [count, setCount] = useState(0);
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [thanksVisible, setThanksVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const displayAverage = useMemo(() => (count === 0 ? 0 : Math.round(average * 10) / 10), [average, count]);

  const loadRatings = async () => {
    const { data, error: queryError } = await supabase.from('project_ratings').select('value').eq('project_uuid', projectId);

    if (queryError) {
      setError('Unable to load ratings right now.');
      setAverage(0);
      setCount(0);
      return;
    }

    const rows = (data ?? []) as RatingRow[];
    if (rows.length === 0) {
      setAverage(0);
      setCount(0);
      return;
    }

    const sum = rows.reduce((acc, row) => acc + row.value, 0);
    setCount(rows.length);
    setAverage(sum / rows.length);
    setError(null);
  };

  useEffect(() => {
    void loadRatings();

    const channel = supabase
      .channel(`project-ratings-${projectId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'project_ratings', filter: `project_uuid=eq.${projectId}` },
        () => {
          void loadRatings();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId]);

  const submitRating = async (value: number) => {
    setSubmitting(true);
    setError(null);

    const { error: insertError } = await supabase.from('project_ratings').insert({
      project_uuid: projectId,
      value,
    });

    if (insertError) {
      setError('Unable to submit your rating right now.');
      setSubmitting(false);
      return;
    }

    setThanksVisible(true);
    window.setTimeout(() => setThanksVisible(false), 1800);
    setSubmitting(false);
    void loadRatings();
  };

  return (
    <div className="mt-4 border-t border-ink/10 pt-3">
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {Array.from({ length: 5 }, (_, index) => {
          const value = index + 1;
          const isFilled = (hoveredValue ?? 0) >= value;

          return (
            <button
              key={value}
              type="button"
              disabled={submitting}
              onMouseEnter={() => setHoveredValue(value)}
              onMouseLeave={() => setHoveredValue(null)}
              onFocus={() => setHoveredValue(value)}
              onBlur={() => setHoveredValue(null)}
              onClick={() => submitRating(value)}
              className={`text-xl leading-none transition-colors ${isFilled ? 'text-[#2a9d8f]' : 'text-ink/30'} disabled:opacity-60`}
              aria-label={`Rate ${value} star${value > 1 ? 's' : ''}`}
            >
              {isFilled ? '★' : '☆'}
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 text-sm">
        <StarRow value={displayAverage} />
        <span className="font-bold text-ink">★ {displayAverage.toFixed(1)}</span>
        <span className="text-ink-muted">({count} ratings)</span>
      </div>

      {thanksVisible && <p className="mt-1 text-xs text-[#2a9d8f]">Thanks for rating!</p>}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}
