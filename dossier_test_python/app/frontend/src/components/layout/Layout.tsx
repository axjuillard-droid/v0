import { useState, useEffect } from 'react';
import { cn } from '../ui/Card';
import { SettingsModal, ALL_FEATURES, DEFAULT_ENABLED_FEATURES } from './SettingsModal';
import { Eye, Settings, Sparkles, ChevronDown, ChevronUp } from '../common/Icons';
import { executeWithDemoExplanation } from '../../utils/demoExplanation';
import { DEMO_EXPLANATIONS } from '../../utils/demoExplanationsData';

export const Layout = ({
  children,
  currentTab,
  setCurrentTab,
  isDemoMode,
  onToggleDemo,
  onDisconnect,
}: {
  children: React.ReactNode;
  currentTab: string;
  setCurrentTab: (id: string) => void;
  isDemoMode?: boolean;
  onToggleDemo?: (active: boolean) => void;
  onDisconnect?: () => void;
}) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem('app-theme') || 'standard';
  });
  const [showTransition, setShowTransition] = useState(false);
  const [particles, setParticles] = useState<any[]>([]);
  const [headerVisible, setHeaderVisible] = useState(() => {
    return localStorage.getItem('header-visible') !== 'false';
  });

  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Liste des fonctionnalités activées (défaut : Recherche, Arborescence, Scan)
  const [enabledFeatures, setEnabledFeatures] = useState<string[]>(() => {
    const saved = localStorage.getItem('nas_enabled_features');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed;
        }
      } catch (e) {
        // Fallback
      }
    }
    return DEFAULT_ENABLED_FEATURES;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'clothilde') {
      root.classList.add('theme-clothilde');
    } else {
      root.classList.remove('theme-clothilde');
    }
    localStorage.setItem('app-theme', theme);
  }, [theme]);

  useEffect(() => {
    const handleStorageChange = () => {
      const saved = localStorage.getItem('nas_enabled_features');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setEnabledFeatures(parsed);
          }
        } catch (e) {}
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  useEffect(() => {
    const handleOpenSettings = () => setIsSettingsOpen(true);
    window.addEventListener('open-settings', handleOpenSettings);
    return () => window.removeEventListener('open-settings', handleOpenSettings);
  }, []);

  const toggleFeature = (featureId: string) => {
    let next: string[];
    if (enabledFeatures.includes(featureId)) {
      if (enabledFeatures.length === 1) return; // Conserver au moins un onglet actif
      next = enabledFeatures.filter((id) => id !== featureId);
    } else {
      next = [...enabledFeatures, featureId];
    }
    setEnabledFeatures(next);
    localStorage.setItem('nas_enabled_features', JSON.stringify(next));

    if (!next.includes(currentTab)) {
      setCurrentTab(next[0] || 'search');
    }
  };

  const resetDefaults = () => {
    setEnabledFeatures(DEFAULT_ENABLED_FEATURES);
    localStorage.setItem('nas_enabled_features', JSON.stringify(DEFAULT_ENABLED_FEATURES));
    if (!DEFAULT_ENABLED_FEATURES.includes(currentTab)) {
      setCurrentTab('search');
    }
  };

  // Les onglets affichés dans la barre de navigation dépendent de enabledFeatures
  const visibleTabs = ALL_FEATURES.filter((tab) => enabledFeatures.includes(tab.id));
  const baseTabs = visibleTabs.filter((tab) => ['search', 'tree', 'config'].includes(tab.id));
  const newTabs = visibleTabs.filter((tab) => !['search', 'tree', 'config'].includes(tab.id));

  const handleTabClick = (tabId: string, label: string) => {
    executeWithDemoExplanation(
      isDemoMode,
      DEMO_EXPLANATIONS.navTab(tabId, label),
      () => setCurrentTab(tabId)
    );
  };

  return (
    <div data-tour="app-main-layout" className="max-w-[1400px] mx-auto px-6 relative z-10">
      <header
        data-tour="layout-header-area"
        className={cn(
          'border-b border-border flex items-center justify-between gap-4 flex-wrap transition-all duration-300 ease-in-out overflow-hidden',
          headerVisible ? 'max-h-[200px] py-3.5 pb-3 opacity-100' : 'max-h-0 py-0 pb-0 opacity-0 border-transparent'
        )}
      >
        <div className="flex items-center gap-3 shrink-0">
          <div className="flex items-center gap-2 bg-surface/20 p-1 px-2 rounded-lg">
            <img src="/logo_marine.png" alt="Marine Nationale" className="h-8 md:h-9 w-auto object-contain" />
            <img src="/marine.png" alt="Marine" className="h-8 md:h-9 w-auto object-contain" />
            <img src="/logo_CENTEX.png" alt="CENTEX" className="h-8 md:h-9 w-auto object-contain" />
          </div>
          <div className="h-7 w-[1px] bg-border mx-0.5" />
          <div>
            <h1 className="text-lg md:text-xl font-bold tracking-tight m-0 leading-tight">
              Catalogue de Fichiers
            </h1>
          </div>
        </div>

        {/* Espaceur central & Badge Mode Démo placé entre Catalogue de Fichiers et les boutons */}
        <div className="hidden md:flex flex-1 items-center justify-center">
          {isDemoMode && (
            <div className="flex items-center gap-2 bg-[#190918]/90 border border-red-500/60 shadow-[0_0_12px_rgba(239,68,68,0.3)] backdrop-blur-md px-4 py-1.5 rounded-full text-xs font-bold text-red-200 animate-in fade-in duration-300">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
              <span className="flex items-center gap-1.5">
                <Eye className="w-3.5 h-3.5 text-red-400" /> Mode Démo • Auto-découverte
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 shrink-0">
          {/* Bouton Bascule Mode Démo (Rouge) */}
          <button
            onClick={() => {
              if (onToggleDemo) {
                onToggleDemo(!isDemoMode);
              }
            }}
            className={cn(
              "flex items-center gap-1.5 py-1.5 px-3 border rounded-full text-xs font-bold transition-all cursor-pointer shadow-custom",
              isDemoMode
                ? "bg-red-950/80 border-red-500 text-red-200 hover:bg-red-900 shadow-[0_0_10px_rgba(239,68,68,0.4)]"
                : "bg-surface border-border2 hover:border-accent text-text2 hover:text-accent"
            )}
            title={isDemoMode ? "Quitter le Mode Démo (Revenir au mode connecté standard)" : "Basculer en Mode Démo (Thème Rouge)"}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>{isDemoMode ? "Mode Démo (Actif)" : "Mode Démo"}</span>
          </button>

          {/* Bouton Paramètres */}
          <button
            data-tour="btn-open-settings"
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.openSettings,
                () => setIsSettingsOpen(true)
              )
            }
            className="flex items-center gap-1.5 py-1.5 px-3 bg-surface border border-border2 hover:border-accent rounded-full text-xs font-semibold text-text2 hover:text-accent transition-all cursor-pointer shadow-custom"
            title="Gérer les fonctionnalités du catalogue"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Paramètres</span>
          </button>

          {/* Bouton Mode Clothilde */}
          <button
            onClick={() => {
              const runThemeToggle = () => {
                if (theme === 'standard') {
                  const emojis = ['🌸', '🌺', '💮', '🏵️', '🌼'];
                  const list = [];
                  for (let i = 0; i < 50; i++) {
                    const angle = Math.random() * Math.PI * 2;
                    const distance = 120 + Math.random() * 320;
                    list.push({
                      id: i,
                      emoji: emojis[Math.floor(Math.random() * emojis.length)],
                      dx: Math.cos(angle) * distance,
                      dy: Math.sin(angle) * distance,
                      rot: 180 + Math.random() * 540,
                      scale: 0.6 + Math.random() * 0.9,
                      delay: Math.random() * 3.2,
                    });
                  }
                  setParticles(list);
                  setTheme('clothilde');
                  setShowTransition(true);
                  setTimeout(() => {
                    setShowTransition(false);
                  }, 5000);
                } else {
                  setTheme('standard');
                }
              };

              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.toggleClothilde(theme),
                runThemeToggle
              );
            }}
            className="flex items-center gap-1.5 py-1.5 px-3 bg-surface border border-border2 hover:border-accent rounded-full text-xs font-semibold text-text2 hover:text-accent transition-all cursor-pointer shadow-custom"
            title="Changer de thème"
          >
            {theme === 'clothilde' ? (
              <>
                <Settings className="w-3.5 h-3.5" />
                <span>Mode Standard</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                <span>Mode Clothilde</span>
              </>
            )}
          </button>

          {isDemoMode ? (
            <div className="flex items-center gap-2.5 text-xs text-text3">
              <div className="w-2 h-2 rounded-full bg-accent shadow-[0_0_8px_var(--color-accent)] animate-[pulse_2s_infinite]" />
              <span className="font-bold text-accent">Démo (Rouge)</span>
              {onDisconnect && (
                <button
                  onClick={onDisconnect}
                  className="ml-1 px-2.5 py-1 bg-surface border border-border2 hover:border-danger rounded-lg text-[10px] font-bold text-text2 hover:text-danger transition-colors cursor-pointer"
                  title="Quitter le mode Démo"
                >
                  Déconnexion
                </button>
              )}
            </div>
          ) : (
            onDisconnect && (
              <button
                onClick={onDisconnect}
                className="px-2.5 py-1 bg-surface border border-border2 hover:border-danger rounded-lg text-[10px] font-bold text-text2 hover:text-danger transition-colors cursor-pointer"
                title="Fermer la session"
              >
                Déconnexion
              </button>
            )
          )}
        </div>
      </header>

      <div className="flex justify-between items-center flex-wrap gap-3 border-b border-border pb-1">
        <nav className="flex gap-1 pt-3 flex-wrap items-center">
          {isDemoMode && currentTab !== 'overview' && (
            <button
              onClick={() => handleTabClick('overview', 'Menu Démo')}
              className="mr-2 px-3 py-1.5 rounded-lg bg-red-950/90 hover:bg-red-900 border border-red-500/70 text-red-200 text-xs font-extrabold transition-all cursor-pointer flex items-center gap-1.5 shadow-[0_0_10px_rgba(239,68,68,0.3)] hover:scale-105 animate-in fade-in duration-200"
              title="Retourner au menu principal d'accueil du Mode Démo"
            >
              <span>← Menu Démo</span>
            </button>
          )}

          {baseTabs.map((tab) => {
            const IconComp = tab.icon;
            return (
              <button
                key={tab.id}
                data-tour={`tab-${tab.id}`}
                onClick={() => handleTabClick(tab.id, tab.label)}
                className={cn(
                  'px-[16px] py-2 rounded-lg border border-transparent bg-transparent text-text2 text-sm font-semibold transition-all duration-200 ease-in-out cursor-pointer flex items-center gap-2',
                  'hover:bg-surface hover:text-text hover:border-white/10',
                  currentTab === tab.id && (
                    isDemoMode
                      ? 'bg-red-600 border-2 border-red-500 text-white font-black shadow-[0_0_20px_rgba(239,68,68,0.85),0_0_35px_rgba(239,68,68,0.5)] ring-2 ring-red-500/60 relative z-10'
                      : 'bg-accent border-2 border-accent text-white font-black shadow-[0_0_20px_rgba(91,130,246,0.75),0_0_35px_rgba(91,130,246,0.45)] ring-2 ring-accent/50 relative z-10'
                  )
                )}
              >
                {typeof IconComp === 'function' && <IconComp className="w-4 h-4 shrink-0" />}
                <span>{tab.label}</span>
              </button>
            );
          })}

          {newTabs.length > 0 && (
            <div data-tour="navbar-newly-added-tabs" className="flex gap-1">
              {newTabs.map((tab) => {
                const IconComp = tab.icon;
                return (
                  <button
                    key={tab.id}
                    data-tour={`tab-${tab.id}`}
                    onClick={() => handleTabClick(tab.id, tab.label)}
                    className={cn(
                      'px-[16px] py-2 rounded-lg border border-transparent bg-transparent text-text2 text-sm font-semibold transition-all duration-200 ease-in-out cursor-pointer flex items-center gap-2',
                      'hover:bg-surface hover:text-text hover:border-white/10',
                      currentTab === tab.id && (
                        isDemoMode
                          ? 'bg-red-600 border-2 border-red-500 text-white font-black shadow-[0_0_20px_rgba(239,68,68,0.85),0_0_35px_rgba(239,68,68,0.5)] ring-2 ring-red-500/60 relative z-10'
                          : 'bg-accent border-2 border-accent text-white font-black shadow-[0_0_20px_rgba(91,130,246,0.75),0_0_35px_rgba(91,130,246,0.45)] ring-2 ring-accent/50 relative z-10'
                      )
                    )}
                  >
                    {typeof IconComp === 'function' && <IconComp className="w-4 h-4 shrink-0" />}
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}
        </nav>

        <button
          data-tour="btn-toggle-header"
          onClick={() => {
            const nextVal = !headerVisible;
            executeWithDemoExplanation(
              isDemoMode,
              DEMO_EXPLANATIONS.toggleHeader(headerVisible),
              () => {
                setHeaderVisible(nextVal);
                localStorage.setItem('header-visible', String(nextVal));
              }
            );
          }}
          className="mt-3 px-3.5 py-1.5 bg-surface/40 hover:bg-surface2 hover:text-accent rounded-lg text-text3 transition-all duration-200 ease-in-out cursor-pointer text-xs font-semibold flex items-center gap-1.5 shadow-sm border border-transparent hover:border-white/10"
          title={headerVisible ? "Masquer le bandeau supérieur" : "Afficher le bandeau supérieur"}
        >
          {headerVisible ? (
            <>
              <ChevronUp className="w-3.5 h-3.5" />
              <span>Masquer l'en-tête</span>
            </>
          ) : (
            <>
              <ChevronDown className="w-3.5 h-3.5" />
              <span>Afficher l'en-tête</span>
            </>
          )}
        </button>
      </div>

      <main key={currentTab} className="py-5 animate-in fade-in slide-in-from-bottom-2 duration-300">{children}</main>

      {/* Modal des Paramètres de Fonctionnalités */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        enabledFeatures={enabledFeatures}
        onToggleFeature={toggleFeature}
        onResetDefaults={resetDefaults}
      />

      {/* Transition Fleur Mode Clothilde */}
      {showTransition && (
        <div className="fixed inset-0 z-[99999] bg-[#0f050e]/95 backdrop-blur-md flex flex-col items-center justify-center overflow-hidden animate-in fade-in duration-500">
          <div className="absolute inset-0 pointer-events-none overflow-hidden">
            {particles.map((p) => (
              <span
                key={p.id}
                className="absolute text-3xl select-none animate-flower-burst"
                style={{
                  left: '50%',
                  top: '50%',
                  animationDelay: `${p.delay}s`,
                  '--dx': `${p.dx}px`,
                  '--dy': `${p.dy}px`,
                  '--rot': `${p.rot}deg`,
                  '--scale': p.scale,
                } as React.CSSProperties}
              >
                {p.emoji}
              </span>
            ))}
          </div>

          <div className="relative flex flex-col items-center gap-5 z-10">
            <div className="w-28 h-28 flex items-center justify-center text-7xl animate-[spin_3s_linear_infinite] filter drop-shadow-[0_0_15px_rgba(244,114,182,0.6)] select-none">
              🌸
            </div>
            <div className="text-pink-300 font-bold tracking-[0.25em] text-xs uppercase animate-pulse font-jetbrains">
              Transformation Clothilde...
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
