import React from 'react';

export interface ExplanationData {
  title: string;
  icon?: string;
  category?: string;
  description: string;
  details?: string[];
  actionText?: string;
  onConfirm?: () => void;
}

interface DemoExplanationModalProps {
  isOpen: boolean;
  onClose: () => void;
  data: ExplanationData | null;
}

export const DemoExplanationModal: React.FC<DemoExplanationModalProps> = ({
  isOpen,
  onClose,
  data,
}) => {
  if (!isOpen || !data) return null;

  const handleConfirm = () => {
    onClose();
    if (data.onConfirm) {
      // Execute the pending action after closing modal
      setTimeout(() => {
        data.onConfirm?.();
      }, 50);
    }
  };

  return (
    <div 
      className="fixed inset-0 z-[99999] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="relative bg-[#140810]/95 border border-red-500/50 shadow-[0_0_50px_rgba(239,68,68,0.35)] max-w-lg w-full rounded-2xl p-6 text-text overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow décoratif rouge */}
        <div className="absolute -top-20 -left-20 w-40 h-40 bg-red-600/20 rounded-full blur-3xl pointer-events-none" />

        {/* En-tête du Modal */}
        <div className="flex items-center justify-between mb-4 border-b border-red-500/20 pb-3">
          <div className="flex items-center gap-3">
            <span className="text-2xl p-2 bg-red-950/80 rounded-xl border border-red-500/40 shrink-0">
              {data.icon || '💡'}
            </span>
            <div>
              <h3 className="text-lg font-bold text-white leading-tight">
                {data.title}
              </h3>
            </div>
          </div>
        </div>

        {/* Corps du message */}
        <div className="space-y-4 text-sm text-red-100/90 leading-relaxed mb-6">
          <p className="font-medium text-white/95">
            {data.description}
          </p>

          {data.details && data.details.length > 0 && (
            <div className="bg-black/40 border border-red-500/20 rounded-xl p-3.5 space-y-2">
              <span className="text-[11px] uppercase font-mono font-bold text-red-400 tracking-wider block mb-1">
                Ce que cette fonction permet :
              </span>
              <ul className="space-y-1.5 text-xs text-text2">
                {data.details.map((point, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-red-400 font-bold">•</span>
                    <span>{point}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

        </div>

        {/* Pied de page avec bouton d'exécution */}
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl bg-surface border border-border2 hover:border-red-500/50 text-xs font-semibold text-text2 hover:text-white transition-all cursor-pointer"
          >
            Annuler
          </button>
          <button
            onClick={handleConfirm}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs tracking-wide shadow-[0_0_15px_rgba(239,68,68,0.4)] transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <span>{data.actionText || "J'ai compris & Exécuter"}</span>
            <span>→</span>
          </button>
        </div>
      </div>
    </div>
  );
};
