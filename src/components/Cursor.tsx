import { useEffect, useRef } from 'react';

export default function Cursor() {
  const trackerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const tracker = trackerRef.current;
    if (!tracker) {
      return;
    }

    if (window.matchMedia('(pointer: coarse)').matches) {
      tracker.style.display = 'none';
      return;
    }

    const handleMove = (event: MouseEvent) => {
      tracker.style.left = `${event.clientX}px`;
      tracker.style.top = `${event.clientY}px`;
    };

    document.addEventListener('mousemove', handleMove, { passive: true });

    return () => {
      document.removeEventListener('mousemove', handleMove);
    };
  }, []);

  return <div ref={trackerRef} className="cursor-adaptive-tracker" aria-hidden="true" />;
}
