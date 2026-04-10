import { useEffect } from 'react';

export default function Cursor() {
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const dot = document.createElement('div');
      dot.className = 'cursor-trail-dot';
      dot.style.left = `${e.clientX}px`;
      dot.style.top = `${e.clientY}px`;
      dot.style.width = '8px';
      dot.style.height = '8px';
      document.body.appendChild(dot);

      setTimeout(() => {
        dot.style.opacity = '0';
        dot.style.width = '0px';
        dot.style.height = '0px';
      }, 20);

      setTimeout(() => dot.remove(), 520);
    };

    document.addEventListener('mousemove', onMove);
    return () => document.removeEventListener('mousemove', onMove);
  }, []);

  return null;
}