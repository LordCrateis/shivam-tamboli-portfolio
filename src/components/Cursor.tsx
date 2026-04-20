import { useEffect, useRef } from 'react';

interface NodePoint {
  x: number;
  y: number;
  vx: number;
  vy: number;
}

interface TrailLine {
  nodes: NodePoint[];
  spring: number;
  friction: number;
}

const DARK_COLOR = { r: 17, g: 17, b: 17 };
const LIGHT_COLOR = { r: 234, g: 232, b: 223 };
const TRAILS = 16;
const SIZE = 36;
const DAMPENING = 0.24;
const TENSION = 0.97;
const BASE_FRICTION = 0.52;

function parseRgb(input: string): [number, number, number, number] | null {
  const match = input
    .replace(/\s+/g, '')
    .match(/^rgba?\((\d+),(\d+),(\d+)(?:,([01]?(?:\.\d+)?))?\)$/i);

  if (!match) {
    return null;
  }

  return [
    Number(match[1]),
    Number(match[2]),
    Number(match[3]),
    match[4] === undefined ? 1 : Number(match[4]),
  ];
}

function luminance(r: number, g: number, b: number): number {
  const toLinear = (channel: number) => {
    const s = channel / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function isDarkSurface(x: number, y: number): boolean {
  let node: HTMLElement | null = document.elementFromPoint(x, y) as HTMLElement | null;

  while (node) {
    const computed = window.getComputedStyle(node);
    const parsed = parseRgb(computed.backgroundColor);
    if (parsed && parsed[3] > 0.08) {
      return luminance(parsed[0], parsed[1], parsed[2]) < 0.24;
    }
    node = node.parentElement;
  }

  return false;
}

export default function Cursor() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const context = canvas.getContext('2d');
    if (!context) {
      return;
    }

    const position = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    let colorMix = 0;
    let colorTarget = 0;
    let frameId = 0;
    let running = true;

    const createLine = (spring: number): TrailLine => ({
      spring,
      friction: BASE_FRICTION + 0.01 * Math.random() - 0.003,
      nodes: Array.from({ length: SIZE }, () => ({
        x: position.x,
        y: position.y,
        vx: 0,
        vy: 0,
      })),
    });

    const lines = Array.from({ length: TRAILS }, (_, index) => createLine(0.36 + (index / TRAILS) * 0.028));

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    const handleMove = (event: MouseEvent | TouchEvent) => {
      if ('touches' in event) {
        if (event.touches.length === 0) {
          return;
        }
        position.x = event.touches[0].clientX;
        position.y = event.touches[0].clientY;
      } else {
        position.x = event.clientX;
        position.y = event.clientY;
      }
      colorTarget = isDarkSurface(position.x, position.y) ? 1 : 0;
    };

    const renderLine = (line: TrailLine) => {
      let spring = line.spring;
      const first = line.nodes[0];

      first.vx += (position.x - first.x) * spring;
      first.vy += (position.y - first.y) * spring;

      for (let i = 0; i < line.nodes.length; i += 1) {
        const node = line.nodes[i];
        if (i > 0) {
          const prev = line.nodes[i - 1];
          node.vx += (prev.x - node.x) * spring;
          node.vy += (prev.y - node.y) * spring;
          node.vx += prev.vx * DAMPENING;
          node.vy += prev.vy * DAMPENING;
        }

        node.vx *= line.friction;
        node.vy *= line.friction;
        node.x += node.vx;
        node.y += node.vy;
        spring *= TENSION;
      }

      const start = line.nodes[0];
      context.beginPath();
      context.moveTo(start.x, start.y);

      for (let i = 1; i < line.nodes.length - 1; i += 1) {
        const current = line.nodes[i];
        const next = line.nodes[i + 1];
        const x = 0.5 * (current.x + next.x);
        const y = 0.5 * (current.y + next.y);
        context.quadraticCurveTo(current.x, current.y, x, y);
      }

      const secondLast = line.nodes[line.nodes.length - 2];
      const last = line.nodes[line.nodes.length - 1];
      context.quadraticCurveTo(secondLast.x, secondLast.y, last.x, last.y);
      context.stroke();
      context.closePath();
    };

    const render = () => {
      if (!running) {
        return;
      }

      colorMix += (colorTarget - colorMix) * 0.09;
      const r = Math.round(DARK_COLOR.r + (LIGHT_COLOR.r - DARK_COLOR.r) * colorMix);
      const g = Math.round(DARK_COLOR.g + (LIGHT_COLOR.g - DARK_COLOR.g) * colorMix);
      const b = Math.round(DARK_COLOR.b + (LIGHT_COLOR.b - DARK_COLOR.b) * colorMix);

      context.clearRect(0, 0, canvas.width, canvas.height);
      context.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.22)`;
      context.lineWidth = 1;

      lines.forEach((line) => renderLine(line));

      frameId = window.requestAnimationFrame(render);
    };

    resize();
    document.addEventListener('mousemove', handleMove, { passive: true });
    document.addEventListener('touchstart', handleMove, { passive: true });
    document.addEventListener('touchmove', handleMove, { passive: true });
    window.addEventListener('resize', resize);
    frameId = window.requestAnimationFrame(render);

    return () => {
      running = false;
      window.cancelAnimationFrame(frameId);
      document.removeEventListener('mousemove', handleMove);
      document.removeEventListener('touchstart', handleMove);
      document.removeEventListener('touchmove', handleMove);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return <canvas ref={canvasRef} className="pointer-events-none fixed inset-0 z-[10000]" aria-hidden="true" />;
}
