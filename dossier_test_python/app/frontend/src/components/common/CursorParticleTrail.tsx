import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
}

const COLORS = [
  '#6c8fff', // Blue accent
  '#a78bfa', // Purple accent
  '#34d399', // Green success
  '#f472b6', // Pink / Clothilde
  '#38bdf8', // Cyan
  '#fbbf24', // Amber
];

export const CursorParticleTrail: React.FC<{ active?: boolean }> = ({ active = true }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number | null>(null);
  const lastMouseRef = useRef<{ x: number; y: number; time: number } | null>(null);

  useEffect(() => {
    if (!active) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    handleResize();
    window.addEventListener('resize', handleResize);

    const handleMouseMove = (e: MouseEvent) => {
      const { clientX: x, clientY: y } = e;
      const now = performance.now();

      // Émettre 2 à 4 particules par mouvement
      const count = 3;
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 1.5 + 0.5;
        const color = COLORS[Math.floor(Math.random() * COLORS.length)];

        particlesRef.current.push({
          x: x + (Math.random() - 0.5) * 8,
          y: y + (Math.random() - 0.5) * 8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.5,
          size: Math.random() * 3 + 2,
          color,
          alpha: 0.9,
          life: 0,
          maxLife: Math.random() * 25 + 25, // ~400-800ms
        });
      }

      // Limiter le nombre total de particules
      if (particlesRef.current.length > 50) {
        particlesRef.current = particlesRef.current.slice(-50);
      }

      lastMouseRef.current = { x, y, time: now };
    };

    window.addEventListener('mousemove', handleMouseMove);

    const loop = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const updated: Particle[] = [];
      for (const p of particlesRef.current) {
        p.life += 1;
        p.x += p.vx;
        p.y += p.vy;
        p.alpha = Math.max(0, 1 - p.life / p.maxLife);

        if (p.life < p.maxLife) {
          updated.push(p);

          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = p.color;
          ctx.shadowColor = p.color;
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }

      particlesRef.current = updated;
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [active]);

  if (!active) return null;

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-[99999]"
      style={{ background: 'transparent' }}
    />
  );
};
