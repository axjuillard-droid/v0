import { useState, useEffect } from 'react';
import { Layout } from './components/layout/Layout';
import { SearchTab } from './components/features/search/SearchTab';
import { HeavyFilesTab } from './components/features/heavy/HeavyFilesTab';
import { EvolutionTab } from './components/features/evolution/EvolutionTab';
import { ConfigTab } from './components/features/config/ConfigTab';
import { CleanupTab } from './components/features/cleanup/CleanupTab';
import { GatePage } from './components/features/gate/GatePage';
import { TreeTab } from './components/features/tree/TreeTab';
import { fetchDBStatus } from './api/db';
import { Spinner } from './components/ui/Spinner';
import { useSearchStore } from './store/searchStore';
import { DemoDiscoveryOverlay } from './components/common/DemoDiscoveryOverlay';
import { DemoOverviewTab } from './components/features/demo/DemoOverviewTab';
import { DemoExplanationModal, ExplanationData } from './components/common/DemoExplanationModal';
import { useGuide } from './context/GuideContext';
import { GlobalLoadingBar } from './components/common/GlobalLoadingBar';

const App = () => {
  const { currentTab, setCurrentTab } = useSearchStore();
  const { isDemoMode, setIsDemoMode } = useGuide();
  const [dbConnected, setDbConnected] = useState<boolean | null>(null);
  const [serverConnected, setServerConnected] = useState<boolean>(true);
  const [explanationData, setExplanationData] = useState<ExplanationData | null>(null);

  useEffect(() => {
    const handleOpenDemoExplanation = (e: Event) => {
      const customEv = e as CustomEvent<ExplanationData>;
      if (customEv.detail) {
        setExplanationData(customEv.detail);
      }
    };
    window.addEventListener('open-demo-explanation', handleOpenDemoExplanation);
    return () => {
      window.removeEventListener('open-demo-explanation', handleOpenDemoExplanation);
    };
  }, []);

  // Synchroniser la classe CSS .theme-demo sur <html> quand le mode Démo change
  useEffect(() => {
    const root = document.documentElement;
    if (isDemoMode) {
      root.classList.add('theme-demo');
    } else {
      root.classList.remove('theme-demo');
    }
  }, [isDemoMode]);

  // Contrôle de santé périodique (BDD + Serveur Web) toutes les 10s
  useEffect(() => {
    const checkHealth = async () => {
      if (isDemoMode) return;
      try {
        const status = await fetchDBStatus();
        setServerConnected(true);
        if (!status.connected) {
          setDbConnected(false); // Retour automatique vers GatePage en cas de perte BDD
        } else {
          setDbConnected(true);
        }
      } catch (err) {
        setServerConnected(false);
        setDbConnected(false); // Retour automatique vers GatePage si le serveur est inatteignable
      }
    };

    checkHealth();
    const interval = setInterval(checkHealth, 10000); // Polling toutes les 10 secondes

    const handleDbDisconnect = () => {
      if (!isDemoMode) setDbConnected(false);
    };

    const handleServerDisconnect = () => {
      setServerConnected(false);
    };

    const handleServerConnect = () => {
      setServerConnected(true);
    };

    window.addEventListener('db-disconnected', handleDbDisconnect);
    window.addEventListener('server-disconnected', handleServerDisconnect);
    window.addEventListener('server-connected', handleServerConnect);

    return () => {
      clearInterval(interval);
      window.removeEventListener('db-disconnected', handleDbDisconnect);
      window.removeEventListener('server-disconnected', handleServerDisconnect);
      window.removeEventListener('server-connected', handleServerConnect);
    };
  }, [isDemoMode]);

  const handleLogout = () => {
    setIsDemoMode(false);
    setDbConnected(false);
    if (currentTab === 'overview') {
      setCurrentTab('search');
    }
  };

  const handleToggleDemoMode = (demoActive: boolean) => {
    setIsDemoMode(demoActive);
    if (demoActive) {
      setCurrentTab('overview');
    } else if (currentTab === 'overview') {
      setCurrentTab('search');
    }
  };

  if (dbConnected === null) {
    return (
      <div className="min-h-screen bg-[#070a13] flex flex-col items-center justify-center font-mono">
        <Spinner className="w-10 h-10 text-accent mb-4" />
        <span className="text-xs uppercase tracking-widest text-text3 animate-pulse">
          INITIALISATION DES PROTOCOLES MILITAIRES...
        </span>
      </div>
    );
  }

  if (!dbConnected && !isDemoMode) {
    return (
      <>
        <DemoDiscoveryOverlay />
        <GatePage 
          onConnect={(isDemo) => {
            if (isDemo) {
              setIsDemoMode(true);
              setCurrentTab('overview');
            } else {
              setDbConnected(true);
              if (currentTab === 'overview') {
                setCurrentTab('search');
              }
            }
          }} 
          onToggleDemo={handleToggleDemoMode}
        />
        <DemoExplanationModal
          isOpen={!!explanationData}
          onClose={() => setExplanationData(null)}
          data={explanationData}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-bg text-text">
      {!serverConnected && !isDemoMode && (
        <div className="fixed top-0 left-0 right-0 z-[10001] bg-red-600/95 text-white text-xs font-mono py-2 px-4 flex items-center justify-center gap-2.5 backdrop-blur-md shadow-xl border-b border-red-400/30 animate-pulse">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-white opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-white"></span>
          </span>
          <span className="font-bold tracking-wide">SERVEUR WEB DÉCONNECTÉ — Connexion réseau interrompue (Tentative de reconnexion...)</span>
        </div>
      )}
      <GlobalLoadingBar />
      <DemoDiscoveryOverlay />
      <Layout 
        currentTab={currentTab} 
        setCurrentTab={setCurrentTab}
        isDemoMode={isDemoMode}
        onToggleDemo={handleToggleDemoMode}
        onDisconnect={handleLogout}
      >
        {(currentTab === 'overview' || (isDemoMode && !['search', 'tree', 'heaviest', 'cleanup', 'evolution', 'config'].includes(currentTab))) && (
          <DemoOverviewTab onSelectTab={setCurrentTab} />
        )}
        {currentTab === 'search' && <SearchTab />}
        {currentTab === 'tree' && <TreeTab />}
        {currentTab === 'heaviest' && <HeavyFilesTab />}
        {currentTab === 'cleanup' && <CleanupTab />}
        {currentTab === 'evolution' && <EvolutionTab />}
        {currentTab === 'config' && <ConfigTab />}
      </Layout>
      <DemoExplanationModal
        isOpen={!!explanationData}
        onClose={() => setExplanationData(null)}
        data={explanationData}
      />
    </div>
  );
};

export default App;
