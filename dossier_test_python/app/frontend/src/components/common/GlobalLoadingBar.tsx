import { useState, useEffect } from 'react';

export const GlobalLoadingBar = () => {
  const [activeRequests, setActiveRequests] = useState(0);

  useEffect(() => {
    const handleRequestChange = (e: Event) => {
      const customEv = e as CustomEvent<{ activeCount: number; loading: boolean }>;
      if (customEv.detail) {
        setActiveRequests(customEv.detail.activeCount);
      }
    };
    window.addEventListener('api-request-change', handleRequestChange);
    return () => window.removeEventListener('api-request-change', handleRequestChange);
  }, []);

  if (activeRequests <= 0) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[9999] pointer-events-none">
      {/* Ligne lumineuse animée supérieure */}
      <div className="h-1 w-full bg-accent/20 overflow-hidden">
        <div className="h-full bg-accent animate-pulse shadow-[0_0_12px_rgba(59,130,246,0.9)] transition-all duration-300 w-full animate-progress" />
      </div>
      
      {/* Badge flottant en haut à droite avec pulsation */}
      <div className="absolute top-3 right-6 bg-[#0f172a]/95 backdrop-blur-md border border-accent/40 rounded-full px-3.5 py-1.5 flex items-center gap-2.5 shadow-2xl text-xs text-text shadow-accent/20 animate-fade-in">
        <span className="relative flex h-2.5 w-2.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75"></span>
          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-accent"></span>
        </span>
        <span className="font-mono text-[11px] font-medium tracking-wide text-text uppercase">
          Traitement serveur en cours... ({activeRequests} {activeRequests > 1 ? 'requêtes' : 'requête'})
        </span>
      </div>
    </div>
  );
};
