import React, { useEffect, useState, useCallback } from 'react';
import { useGuide } from '../../context/GuideContext';
import { Info } from './Icons';

interface HighlightItem {
  id: string;
  selector: string;
  title: string;
  description: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

const DISCOVERY_ITEMS: HighlightItem[] = [
  // Uniquement les 2 éléments d'aide de la page de connexion (GatePage)
  {
    id: 'eye',
    selector: '[data-tour="btn-toggle-eye"]',
    title: 'Petit Œil',
    description: 'Afficher ou masquer l\'URL de la base de données démo.',
    position: 'bottom',
  },
  {
    id: 'connect',
    selector: '[data-tour="btn-submit-connect"]',
    title: 'Se connecter',
    description: 'Lancer l\'accès immédiat au catalogue en mode Démo.',
    position: 'bottom',
  },
];

export const DemoDiscoveryOverlay: React.FC = () => {
  const { isDemoMode, showDiscoveryTooltips, toggleDiscoveryTooltips } = useGuide();
  const [activeRects, setActiveRects] = useState<Array<{ item: HighlightItem; rect: DOMRect }>>([]);

  const updatePositions = useCallback(() => {
    if (!isDemoMode || !showDiscoveryTooltips) {
      setActiveRects([]);
      return;
    }

    const found: Array<{ item: HighlightItem; rect: DOMRect }> = [];
    DISCOVERY_ITEMS.forEach((item) => {
      const el = document.querySelector(item.selector);
      if (el) {
        const rect = el.getBoundingClientRect();
        if (rect.width > 0 && rect.height > 0 && rect.top >= -100 && rect.top <= window.innerHeight + 100) {
          found.push({ item, rect });
        }
      }
    });
    setActiveRects(found);
  }, [isDemoMode, showDiscoveryTooltips]);

  useEffect(() => {
    if (!isDemoMode || !showDiscoveryTooltips) return;

    updatePositions();
    const interval = setInterval(updatePositions, 300);
    window.addEventListener('resize', updatePositions);
    window.addEventListener('scroll', updatePositions, true);

    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', updatePositions);
      window.removeEventListener('scroll', updatePositions, true);
    };
  }, [isDemoMode, showDiscoveryTooltips, updatePositions]);

  if (!isDemoMode) return null;

  return (
    <div className="fixed inset-0 z-[9990] pointer-events-none overflow-hidden font-sans">
      {/* Affichage des conseils uniquement s'il y a des éléments actifs sur la page (GatePage) */}
      {showDiscoveryTooltips && activeRects.length > 0 && (
        <div className="absolute top-3 left-4 z-[10000] pointer-events-auto">
          <button
            onClick={toggleDiscoveryTooltips}
            className="flex items-center gap-1.5 text-[10px] bg-[#190918]/90 hover:bg-red-900/80 border border-red-500/60 text-red-300 px-3 py-1.5 rounded-full shadow-[0_0_14px_rgba(239,68,68,0.3)] backdrop-blur-md transition-colors cursor-pointer font-bold"
            title={showDiscoveryTooltips ? "Masquer les bulles d'aide" : "Afficher les bulles d'aide"}
          >
            {showDiscoveryTooltips ? "✕ Masquer les conseils" : "💡 Afficher les conseils"}
          </button>
        </div>
      )}

      {showDiscoveryTooltips &&
        activeRects.map(({ item, rect }) => {
          const topPos = rect.bottom + 8;
          const leftPos = Math.max(12, Math.min(window.innerWidth - 260, rect.left + rect.width / 2 - 120));

          return (
            <React.Fragment key={item.id}>
              {/* Cadre Néon Rouge */}
              <div
                className="absolute rounded-xl ring-2 ring-red-500/80 shadow-[0_0_25px_rgba(239,68,68,0.5)] animate-pulse pointer-events-none transition-all duration-200"
                style={{
                  top: `${rect.top - 4}px`,
                  left: `${rect.left - 4}px`,
                  width: `${rect.width + 8}px`,
                  height: `${rect.height + 8}px`,
                }}
              />

              {/* Infobulle Rouge Explicative */}
              <div
                className="absolute z-[9995] pointer-events-auto w-[240px] bg-[#12070d]/95 border border-red-500/50 rounded-xl p-3 shadow-[0_8px_30px_rgba(0,0,0,0.8)] backdrop-blur-xl animate-in fade-in zoom-in-95 duration-200"
                style={{
                  top: `${topPos}px`,
                  left: `${leftPos}px`,
                }}
              >
                <div className="flex items-center justify-between mb-1 pb-1 border-b border-red-500/20">
                  <div className="flex items-center gap-1.5 text-red-400 font-bold text-xs uppercase tracking-wider">
                    <Info className="w-3.5 h-3.5 shrink-0" />
                    <span>{item.title}</span>
                  </div>
                </div>
                <p className="text-[11px] text-red-200/90 leading-snug font-medium">
                  {item.description}
                </p>
              </div>
            </React.Fragment>
          );
        })}
    </div>
  );
};
