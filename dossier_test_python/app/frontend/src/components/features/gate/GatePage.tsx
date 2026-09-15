import React, { useState, useEffect } from 'react';
import { connectDB } from '../../../api/db';
import { Spinner } from '../../ui/Spinner';
import { ShieldAlert, Database, Eye, EyeOff, CheckCircle2 } from '../../common/Icons';
import { useGuide } from '../../../context/GuideContext';

interface GatePageProps {
  onConnect: (isDemo?: boolean) => void;
  onToggleDemo?: (active: boolean) => void;
}

export const GatePage: React.FC<GatePageProps> = ({ onConnect, onToggleDemo }) => {
  const [dbUrl, setDbUrl] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showAdminConfig, setShowAdminConfig] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [isDemoView, setIsDemoView] = useState(false);

  const { setIsDemoMode } = useGuide();

  useEffect(() => {
    if (!isDemoView) {
      const savedUrl = localStorage.getItem('nas_db_url') || 'postgresql://postgres:postgres@localhost:5432/catalogue_metadata';
      setDbUrl(savedUrl);
    }
  }, [isDemoView]);

  const handleDemoClick = () => {
    localStorage.setItem('nas_enabled_features', JSON.stringify(['search', 'tree', 'config']));
    window.dispatchEvent(new Event('storage'));

    setIsDemoView(true);
    setDbUrl('postgresql://demo_patsimar:secnum2026@server-nas-db.marine.local:5432/catalogue_demo');
    setShowPassword(false);
    setIsDemoMode(true);
    if (onToggleDemo) onToggleDemo(true);
  };

  const attemptConnection = async (urlToTry?: string) => {
    setIsPending(true);
    setErrorMessage(null);
    setIsSuccess(false);
    const targetUrl = urlToTry || dbUrl || 'postgresql://postgres:postgres@localhost:5432/catalogue_metadata';

    try {
      await connectDB(targetUrl);
      setIsSuccess(true);
      localStorage.setItem('nas_db_url', targetUrl);

      setTimeout(() => {
        onConnect();
      }, 1000);
    } catch (err: any) {
      const errorMsg = err.response?.data?.error || err.message || "Le serveur de base de données est inatteignable.";
      setErrorMessage(errorMsg);
    } finally {
      setIsPending(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isDemoView) {
      setIsSuccess(true);
      setTimeout(() => {
        onConnect(true);
      }, 600);
      return;
    }
    await attemptConnection();
  };

  return (
    <div className="min-h-screen bg-bg text-text font-sans flex flex-col items-center justify-start pt-8 md:pt-12 relative overflow-hidden p-6">
      {/* Background grid & glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(16,28,54,0.4)_0%,transparent_100%)] pointer-events-none" />
      <div className="absolute inset-0 bg-[linear-gradient(rgba(108,143,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(108,143,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] pointer-events-none" />

      {/* Bouton Mode Démo */}
      <div className="absolute top-4 right-4 z-20 group">
        <button
          onClick={handleDemoClick}
          className="px-3.5 py-2 bg-surface/60 hover:bg-surface border border-white/10 hover:border-accent rounded-xl text-xs font-bold text-text hover:text-accent transition-all cursor-pointer shadow-md flex items-center gap-2"
        >
          <Eye className="w-3.5 h-3.5 text-text2 group-hover:text-accent" />
          <span>Mode Démo</span>
        </button>
      </div>

      {/* Header */}
      <div className="mb-8 flex flex-col items-center z-10 text-center">
        <div className="flex items-center justify-center gap-10 mb-10">
          <img src="/logo_marine.png" alt="Marine Nationale" className="h-16 md:h-20 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(108,143,255,0.2)]" />
          <img src="/marine.png" alt="Marine" className="h-16 md:h-20 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(108,143,255,0.2)]" />
          <img src="/logo_CENTEX.png" alt="CENTEX" className="h-16 md:h-20 w-auto object-contain filter drop-shadow-[0_0_8px_rgba(108,143,255,0.2)]" />
        </div>
        <h1 className="text-3xl md:text-4xl font-black tracking-tight text-white">
          Catalogue de Fichiers
        </h1>
      </div>

      {/* Card principale d'avertissement / Connexion */}
      <div className="w-full max-w-[740px] bg-bg2/80 border border-white/10 rounded-2xl p-8 md:p-10 backdrop-blur-2xl shadow-xl z-10 flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-7 h-7 text-amber-400 shrink-0" />
            <div>
              <h2 className="text-xl font-bold text-text tracking-wide">
                Serveur de Base de Données Inaccessible
              </h2>
            </div>
          </div>
        </div>

        {/* Boutons d'action principaux */}
        <div className="flex flex-col sm:flex-row gap-3 mt-2">
          <button
            onClick={() => attemptConnection()}
            disabled={isPending || isSuccess}
            className="flex-1 bg-accent hover:bg-accent/90 text-white py-3.5 px-6 rounded-xl font-extrabold shadow-md hover:shadow-lg disabled:opacity-40 transition-all flex items-center justify-center gap-2.5 text-sm uppercase cursor-pointer"
          >
            {isPending ? (
              <>
                <Spinner className="w-4 h-4 border-white border-t-transparent" />
                <span>Vérification...</span>
              </>
            ) : (
              <>
                <Database className="w-4 h-4 text-white" />
                <span>Réessayer la connexion</span>
              </>
            )}
          </button>

          <button
            onClick={handleDemoClick}
            className="px-6 py-3.5 bg-surface/60 hover:bg-surface border border-white/10 hover:border-white/20 rounded-xl text-sm font-bold text-text2 hover:text-white transition-all cursor-pointer flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4 text-text2" />
            <span>Mode Démonstration</span>
          </button>
        </div>

        {/* Section admin masquée par défaut */}
        <div className="pt-2 mt-2">
          <button
            type="button"
            onClick={() => setShowAdminConfig(!showAdminConfig)}
            className="text-xs font-medium text-text3 hover:text-accent transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <span>{showAdminConfig ? "▲ Masquer la configuration réseau avancée" : "▼ Configuration réseau avancée (Administration)"}</span>
          </button>

          {showAdminConfig && (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4 mt-4 animate-fade-in">
              <div className="relative">
                <label className="block text-[11px] font-bold text-text3 uppercase tracking-wider mb-2">
                  Chaîne de connexion PostgreSQL (Override Admin)
                </label>
                <div className="relative rounded-xl bg-[#070b14]/90 border border-border2 focus-within:border-accent flex items-center pr-3">
                  <input
                    type={showPassword ? "text" : "password"}
                    placeholder="postgresql://user:password@host:5432/db"
                    value={dbUrl}
                    onChange={(e) => setDbUrl(e.target.value)}
                    className="w-full bg-transparent text-text text-xs font-mono py-3 pl-4 pr-10 outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="text-text3 hover:text-accent p-1.5"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="py-2.5 px-4 bg-surface/90 hover:bg-accent/20 border border-border2 rounded-lg text-xs font-bold text-text hover:text-accent transition-all cursor-pointer self-end"
              >
                Tester cette URL BDD
              </button>
            </form>
          )}
        </div>

        {/* Feedback states */}
        {isSuccess && (
          <div className="p-4 rounded-xl bg-success/10 border border-success/20 text-success text-xs flex gap-2.5 items-center animate-fade-in">
            <CheckCircle2 className="w-5 h-5 shrink-0 text-success" />
            <span>Connexion rétablie avec succès ! Redirection vers le catalogue...</span>
          </div>
        )}

        {errorMessage && (
          <div className="p-4 rounded-xl bg-danger/10 border border-danger/20 text-danger text-xs flex gap-2.5 items-center animate-fade-in">
            <ShieldAlert className="w-5 h-5 shrink-0 text-danger" />
            <div>
              <span className="font-bold block uppercase tracking-wider text-[10px]">Détail technique de l'erreur :</span>
              <span className="font-mono text-[11px] text-danger/90">{errorMessage}</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
