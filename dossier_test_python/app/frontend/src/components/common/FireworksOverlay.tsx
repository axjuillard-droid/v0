import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  decay: number;
}

interface FireworksOverlayProps {
  isActive: boolean;
  onClose: () => void;
}

export const FireworksOverlay: React.FC<FireworksOverlayProps> = ({ isActive, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mousePosRef = useRef<{ x: number; y: number }>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });

  useEffect(() => {
    if (!isActive) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let autoBurstInterval: any;

    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    const colors = [
      '#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f43f5e',
      '#38bdf8', '#e879f9', '#f97316', '#a3e635', '#ffffff'
    ];

    const createBurst = (x: number, y: number, count = 25) => {
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const speed = Math.random() * 6 + 2;
        particlesRef.current.push({
          x,
          y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          alpha: 1.0,
          color: colors[Math.floor(Math.random() * colors.length)],
          size: Math.random() * 3 + 2,
          decay: Math.random() * 0.02 + 0.015,
        });
      }
    };

    // Burst initial au centre/position actuelle
    createBurst(mousePosRef.current.x, mousePosRef.current.y, 50);

    // Suivi dynamique de la souris
    const handleMouseMove = (e: MouseEvent) => {
      mousePosRef.current = { x: e.clientX, y: e.clientY };
      createBurst(e.clientX, e.clientY, 8);
    };

    // Clic n'importe où pour fermer et retourner à la page principale
    const handleGlobalClick = (e: MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('click', handleGlobalClick, { capture: true });

    // Bursts automatiques continus
    autoBurstInterval = setInterval(() => {
      createBurst(mousePosRef.current.x, mousePosRef.current.y, 15);
    }, 250);

    const render = () => {
      ctx.fillStyle = 'rgba(7, 10, 19, 0.25)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      for (let i = particlesRef.current.length - 1; i >= 0; i--) {
        const p = particlesRef.current[i];
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.08; // gravité
        p.vx *= 0.98;
        p.vy *= 0.98;
        p.alpha -= p.decay;

        if (p.alpha <= 0) {
          particlesRef.current.splice(i, 1);
          continue;
        }

        ctx.save();
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('click', handleGlobalClick, { capture: true });
      clearInterval(autoBurstInterval);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isActive, onClose]);

  if (!isActive) return null;

  return (
    <div className="fixed inset-0 z-[100000] cursor-pointer">
      <canvas ref={canvasRef} className="absolute inset-0 block w-full h-full" />
      
      {/* Banner d'information */}
      <div className="absolute bottom-10 left-1/2 -translate-x-1/2 bg-bg2/90 border border-accent/60 backdrop-blur-xl px-7 py-4 rounded-2xl shadow-[0_0_35px_rgba(108,143,255,0.4)] text-center animate-in fade-in slide-in-from-bottom-5 duration-500 pointer-events-none select-none">
        <p className="text-lg font-black bg-gradient-to-r from-accent via-text to-accent2 bg-clip-text text-transparent mb-1">
          🎉 Démonstration terminée avec succès !
        </p>
        <p className="text-xs text-text2 font-semibold flex items-center justify-center gap-2">
          <span>✨ Bougez votre souris pour les feux d'artifice</span>
          <span className="text-text3">•</span>
          <span className="text-accent font-bold">Cliquez n'importe où pour revenir à la page principale</span>
        </p>
      </div>
    </div>
  );
};
