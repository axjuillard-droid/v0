import React from 'react';
import { Card } from '../../ui/Card';
import { Search, Folder, Settings } from '../../common/Icons';

interface DemoOverviewTabProps {
  onSelectTab: (tabId: string) => void;
  onOpenSettings?: () => void;
}

export const DemoOverviewTab: React.FC<DemoOverviewTabProps> = ({ onSelectTab, onOpenSettings }) => {
  const features = [
    {
      id: 'search',
      title: 'Recherche Avancée',
      icon: Search,
      description:
        'Recherchez en un instant parmi des millions de fichiers indexés. Utilisez la recherche par nom, extension, critères de taille, dates ou cellules.',
      actionText: 'Découvrir la Recherche',
      color: 'from-red-500/20 to-red-950/40 border-red-500/40 hover:border-red-400',
      buttonBg: 'bg-red-600 hover:bg-red-500 text-white shadow-[0_0_15px_rgba(239,68,68,0.4)]',
    },
    {
      id: 'tree',
      title: 'Arborescence des Répertoires',
      icon: Folder,
      description:
        'Parcourez la structure hiérarchique complète des dossiers NAS. Visualisez l\'arborescence, dépliez les sous-dossiers et inspectez le contenu.',
      actionText: "Explorer l'Arborescence",
      color: 'from-amber-500/20 to-red-950/40 border-amber-500/40 hover:border-amber-400',
      buttonBg: 'bg-amber-600 hover:bg-amber-500 text-white shadow-[0_0_15px_rgba(245,158,11,0.4)]',
    },
    {
      id: 'config',
      title: 'Scan & Indexation',
      icon: Settings,
      description:
        'Configurez les répertoires cibles et déclenchez des balayages (scans) automatiques pour mettre à jour la base de données PostgreSQL.',
      actionText: 'Lancer un Scan',
      color: 'from-rose-500/20 to-red-950/40 border-rose-500/40 hover:border-rose-400',
      buttonBg: 'bg-rose-600 hover:bg-rose-500 text-white shadow-[0_0_15px_rgba(244,63,94,0.4)]',
    },
    {
      id: 'settings',
      title: 'Paramètres & Options',
      icon: Settings,
      description:
        'Activez ou masquez les fonctionnalités du catalogue, gérez les options d\'affichage et personnalisez vos préférences d\'utilisation.',
      actionText: 'Ouvrir les Paramètres',
      color: 'from-orange-500/20 to-red-950/40 border-orange-500/40 hover:border-orange-400',
      buttonBg: 'bg-orange-600 hover:bg-orange-500 text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]',
      isSettings: true,
    },
  ];

  const handleAction = (feat: typeof features[0]) => {
    if (feat.isSettings) {
      if (onOpenSettings) {
        onOpenSettings();
      } else {
        window.dispatchEvent(new CustomEvent('open-settings'));
      }
    } else {
      onSelectTab(feat.id);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-6 px-4 animate-in fade-in zoom-in-95 duration-300">
      {/* Bannière de Bienvenue Démo */}
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-red-950/80 border border-red-500/50 text-red-300 text-xs font-bold uppercase tracking-widest mb-3 shadow-[0_0_20px_rgba(239,68,68,0.3)]">
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Mode Démo • Auto-découverte</span>
        </div>
        <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
          Bienvenue dans le Catalogue de Fichiers
        </h2>
      </div>

      {/* Grille des 4 fonctionnalités principales */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {features.map((feat) => {
          const IconComp = feat.icon;
          return (
            <Card
              key={feat.id}
              onClick={() => handleAction(feat)}
              className={`relative bg-gradient-to-b ${feat.color} border backdrop-blur-xl p-5 rounded-2xl flex flex-col justify-between cursor-pointer group transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_10px_35px_rgba(239,68,68,0.25)]`}
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <div className="p-2.5 bg-black/40 rounded-xl border border-white/10 group-hover:scale-110 transition-transform text-white">
                    <IconComp className="w-6 h-6" />
                  </div>
                </div>

              <h3 className="text-lg font-bold text-white mb-3 group-hover:text-red-200 transition-colors leading-snug">
                {feat.title}
              </h3>
              <p className="text-xs text-text2 leading-relaxed mb-6">
                {feat.description}
              </p>
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                handleAction(feat);
              }}
              className={`w-full py-2.5 px-3 rounded-xl text-xs font-bold tracking-wide transition-all cursor-pointer flex items-center justify-center gap-1.5 ${feat.buttonBg}`}
            >
              <span>{feat.actionText}</span>
              <span className="group-hover:translate-x-1 transition-transform">→</span>
            </button>
          </Card>
        );
      })}
      </div>
    </div>
  );
};
