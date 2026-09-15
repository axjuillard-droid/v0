import React from 'react';
import { X, CheckCircle2, Search, Folder, Settings, Scale, Broom, TrendingUp } from '../common/Icons';

export type CatalogueFeature = {
  id: string;
  label: string;
  icon: React.FC<{ className?: string }>;
};

export const ALL_FEATURES: CatalogueFeature[] = [
  {
    id: 'search',
    label: 'Recherche',
    icon: Search,
  },
  {
    id: 'tree',
    label: 'Arborescence',
    icon: Folder,
  },
  {
    id: 'config',
    label: 'Scan',
    icon: Settings,
  },
  {
    id: 'heaviest',
    label: 'Fichiers lourds',
    icon: Scale,
  },
  {
    id: 'cleanup',
    label: 'Nettoyage',
    icon: Broom,
  },
  {
    id: 'evolution',
    label: 'Évolution',
    icon: TrendingUp,
  },
];

export const DEFAULT_ENABLED_FEATURES = ['search', 'tree', 'config'];

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  enabledFeatures: string[];
  onToggleFeature: (featureId: string) => void;
  onResetDefaults: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  enabledFeatures,
  onToggleFeature,
  onResetDefaults,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[9999] bg-[#070a13]/85 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div data-tour="settings-modal-card" className="bg-[#0c1222] border border-accent/30 rounded-2xl max-w-md w-full p-6 shadow-[0_25px_60px_-15px_rgba(0,0,0,0.9)] ring-1 ring-white/10 relative overflow-hidden flex flex-col gap-5 animate-in zoom-in-95 duration-200">
        {/* Accent top bar */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent via-accent2 to-blue-500" />

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-accent/15 border border-accent/30 flex items-center justify-center text-accent">
              <Settings className="w-4 h-4" />
            </div>
            <h3 className="text-lg font-bold text-text">Paramètres du Catalogue</h3>
          </div>
          <button
            onClick={onClose}
            className="text-text3 hover:text-text p-1.5 rounded-lg hover:bg-surface transition-colors cursor-pointer"
            title="Fermer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* List of features */}
        <div className="flex flex-col gap-2.5 max-h-[70vh] overflow-y-auto pr-1">
          {ALL_FEATURES.map((feature) => {
            const isEnabled = enabledFeatures.includes(feature.id);
            const IconComponent = feature.icon;
            return (
              <div
                key={feature.id}
                data-tour={`settings-toggle-${feature.id}`}
                onClick={() => onToggleFeature(feature.id)}
                className={`p-3.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                  isEnabled
                    ? 'bg-surface/60 border-accent/40 shadow-sm'
                    : 'bg-bg3/30 border-border/40 opacity-60 hover:opacity-90'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${isEnabled ? 'bg-accent/20 text-accent' : 'bg-surface2 text-text3'}`}>
                    <IconComponent className="w-4 h-4" />
                  </div>
                  <span className="font-bold text-sm text-text">{feature.label}</span>
                </div>

                {/* Switch Toggle */}
                <div className="shrink-0">
                  <div
                    className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
                      isEnabled ? 'bg-accent' : 'bg-bg3 border border-border'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-border/40 text-xs">
          <button
            onClick={onResetDefaults}
            className="text-text3 hover:text-accent underline cursor-pointer"
          >
            Réinitialiser par défaut
          </button>
          <button
            data-tour="btn-submit-settings"
            onClick={onClose}
            className="px-5 py-2 bg-accent hover:bg-accent/90 text-white font-bold rounded-xl shadow-md transition-all cursor-pointer flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>Valider</span>
          </button>
        </div>
      </div>
    </div>
  );
};
