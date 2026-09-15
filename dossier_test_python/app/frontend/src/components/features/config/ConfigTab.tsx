import { useState, useEffect, useRef } from 'react';
import { fetchScanStatus, uploadExternalScan } from '../../../api/scan';
import { getApiPrefix } from '../../../api/client';
import { Spinner } from '../../ui/Spinner';
import { CheckCircle2, AlertCircle, Folder, Download, Settings, Zap } from '../../common/Icons';
import { useApiQuery } from '../../../hooks/useApi';
import { useGuide } from '../../../context/GuideContext';
import { executeWithDemoExplanation } from '../../../utils/demoExplanation';
import { DEMO_EXPLANATIONS } from '../../../utils/demoExplanationsData';

interface PackageLog {
  id: number;
  batchNum: number;
  count: number;
  time: string;
  totalSoFar: number;
}

export const ConfigTab = () => {
  const { isDemoMode } = useGuide();
  const [scanMessage, setScanMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isIndexing, setIsIndexing] = useState(false);
  const [isDraggingOver, setIsDraggingOver] = useState(false);
  const [indexingProgress, setIndexingProgress] = useState<{ currentBatch: number; uploadedCount: number; statusText: string } | null>(null);
  const [packageLogs, setPackageLogs] = useState<PackageLog[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (logsEndRef.current) logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [packageLogs]);

  const { refetch: refetchStatus } = useApiQuery(fetchScanStatus, []);

  const getTimeString = () => new Date().toLocaleTimeString('fr-FR', { hour12: false });

  // ─────────────────────────────────────────────────────────────────────────────
  // TRAITEMENT D'UN FICHIER JSON D'EXPORTATION (OFFLINE / FALLBACK)
  // ─────────────────────────────────────────────────────────────────────────────
  const processJsonContent = async (jsonText: string) => {
    let payloadData: any;
    try {
      payloadData = JSON.parse(jsonText);
    } catch (e) {
      throw new Error("Le fichier déposé n'est pas un JSON valide.");
    }

    const nas = payloadData.nas || 'NAS-LOCAL';
    const label = payloadData.label || 'Cellule-Principale';
    const scannedRootPath = payloadData.scanned_root_path || '';
    const outilSource = payloadData.outil_source || 'json_import';
    const rawFiles: any[] = Array.isArray(payloadData.files) ? payloadData.files : [];

    if (rawFiles.length === 0) {
      throw new Error("Le fichier JSON ne contient aucun fichier indexé dans l'attribut 'files'.");
    }

    setIsIndexing(true);
    setScanMessage(null);
    setPackageLogs([]);
    setIndexingProgress({ currentBatch: 0, uploadedCount: 0, statusText: `Lecture du fichier JSON (${rawFiles.length.toLocaleString()} fichiers)...` });

    const BATCH_SIZE = 2000;
    const totalBatches = Math.ceil(rawFiles.length / BATCH_SIZE);
    let uploadedCount = 0;

    for (let batchIdx = 0; batchIdx < totalBatches; batchIdx++) {
      const isFirst = batchIdx === 0;
      const isLast = batchIdx === totalBatches - 1;
      const chunkFiles = rawFiles.slice(batchIdx * BATCH_SIZE, (batchIdx + 1) * BATCH_SIZE);

      setIndexingProgress({
        currentBatch: batchIdx + 1,
        uploadedCount,
        statusText: `Transmission du Paquet #${batchIdx + 1} / ${totalBatches} (${chunkFiles.length.toLocaleString()} fichiers)...`
      });

      await uploadExternalScan({
        nas,
        label,
        scanned_root_path: scannedRootPath,
        outil_source: outilSource,
        is_first_chunk: isFirst,
        is_last_chunk: isLast,
        files: chunkFiles
      });

      uploadedCount += chunkFiles.length;

      setPackageLogs(prev => [...prev, {
        id: Date.now() + Math.random(),
        batchNum: batchIdx + 1,
        count: chunkFiles.length,
        time: getTimeString(),
        totalSoFar: uploadedCount
      }]);
    }

    setScanMessage({
      type: 'success',
      text: `✓ Import réussi ! ${uploadedCount.toLocaleString()} fichiers réconciliés et inscrits dans PostgreSQL (Source: ${outilSource}).`
    });
    setIsIndexing(false);
    refetchStatus();
    window.dispatchEvent(new Event('query-invalidate-all'));
  };

  const handleFileDrop = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingOver(false);

    const files = e.dataTransfer.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    if (!file.name.endsWith('.json')) {
      setScanMessage({ type: 'error', text: "Veuillez déposer un fichier d'export au format .json" });
      return;
    }

    try {
      const text = await file.text();
      await processJsonContent(text);
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err.message || "Erreur lors de l'importation du fichier JSON." });
      setIsIndexing(false);
    }
  };

  const handleFileInputChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    try {
      const text = await file.text();
      await processJsonContent(text);
    } catch (err: any) {
      setScanMessage({ type: 'error', text: err.message || "Erreur lors de l'importation du fichier JSON." });
    } finally {
      setIsIndexing(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="animate-in fade-in duration-500 max-w-[1100px] mx-auto pb-20">
      <div className="mb-8 text-center">
        <h2 className="text-2xl font-black mb-2 text-white inline-flex items-center justify-center gap-2.5">
          <Settings className="w-6 h-6 text-accent shrink-0" />
          <span>Indexation du Catalogue NAS via Outils Locaux</span>
        </h2>
      </div>

      <div className="flex flex-col gap-8 max-w-[900px] mx-auto">

        {/* ── MODULE 1 : TÉLÉCHARGEMENT DE L'OUTIL CLIENT ───────────────────── */}
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-custom">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center text-accent">
              <Download className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Étape 1 : Télécharger l'Outil de Scan Local</h3>
            </div>
          </div>

          {/* CARD EXE (pleine largeur) */}
          <div className="bg-bg/60 border border-accent/50 hover:border-accent rounded-xl p-5 flex flex-col md:flex-row md:items-center gap-5 transition-all duration-200 ease-in-out group relative overflow-hidden shadow-[0_4px_20px_rgba(99,102,241,0.08)]">
            <div className="flex items-center gap-3 flex-1">
              <div className="w-10 h-10 rounded-lg bg-accent/20 border border-accent/30 flex items-center justify-center text-accent shrink-0">
                <Zap className="w-5 h-5 text-accent" />
              </div>
              <div>
                <h4 className="font-extrabold text-sm text-text group-hover:text-accent transition-colors duration-200">
                  Application C# (.EXE) + Config pré-remplie
                </h4>
              </div>
            </div>
            <a
              href={`${getApiPrefix()}/download/scanner-exe`}
              download="scan_nas_pack.zip"
              onClick={(e) => {
                if (isDemoMode) {
                  e.preventDefault();
                  executeWithDemoExplanation(
                    true,
                    DEMO_EXPLANATIONS.scanDownloadExe,
                    () => {
                      window.location.href = `${getApiPrefix()}/download/scanner-exe`;
                    }
                  );
                }
              }}
              className="shrink-0 py-3 px-6 bg-accent hover:bg-accent/90 text-white rounded-lg font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all duration-200 ease-in-out cursor-pointer text-center"
            >
              <Download className="w-4 h-4" />
              <span>Télécharger le pack (.zip)</span>
            </a>
          </div>
        </div>

        {/* ── MODULE 2 : FALLBACK DÉCONNECTÉ (DÉPÔT DU JSON) ────────────────── */}
        <div className="bg-surface border border-border rounded-2xl p-6 md:p-8 shadow-custom">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full bg-surface2 border border-border2 flex items-center justify-center text-text2">
              <Folder className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-lg text-text">Étape 2 : Importer un Fichier de Scan JSON</h3>
            </div>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            accept=".json"
            onChange={handleFileInputChange}
            className="hidden"
          />

          {isIndexing ? (
            <div className="bg-bg border border-accent/40 rounded-xl p-6 flex flex-col gap-5 animate-in fade-in duration-300">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Spinner className="w-6 h-6 border-accent border-t-transparent" />
                  <div>
                    <span className="text-xs font-bold text-accent uppercase tracking-wider block">
                      Ingestion du Fichier JSON dans PostgreSQL...
                    </span>
                    <span className="font-extrabold text-sm text-text">
                      {indexingProgress?.statusText || "Traitement..."}
                    </span>
                  </div>
                </div>
                <span className="text-xs font-mono font-bold text-accent bg-accent/15 px-3 py-1.5 rounded-lg border border-accent/30 flex items-center gap-1.5">
                  <span>Paquet N°</span>
                  <strong className="text-sm">{indexingProgress?.currentBatch || 1}</strong>
                </span>
              </div>

              <div className="w-full bg-surface border border-border2 h-3 rounded-full overflow-hidden p-0.5">
                <div className="bg-accent h-full rounded-full animate-pulse transition-all duration-300 w-full" />
              </div>

              {/* CONSOLE DES PAQUETS TRANSMIS */}
              <div className="mt-2 bg-[#0c0d14] border border-border2/80 rounded-xl p-3 flex flex-col gap-2 font-mono text-xs max-h-[180px] overflow-y-auto">
                <div className="text-[10px] font-bold text-text3/70 uppercase tracking-wider flex items-center justify-between border-b border-border2/40 pb-1.5">
                  <span>Progression de l'ingestion SQL</span>
                  <span className="text-accent">{packageLogs.length} paquets écrits</span>
                </div>
                {packageLogs.map((log) => (
                  <div key={log.id} className="flex items-center justify-between py-1 border-b border-border2/20 last:border-0 text-text2 hover:text-text transition-colors">
                    <div className="flex items-center gap-2">
                      <span className="text-success font-bold">✓</span>
                      <span className="text-text3 text-[10px] bg-surface2 px-1.5 py-0.5 rounded font-bold">[{log.time}]</span>
                      <span className="font-semibold text-accent">Paquet #{log.batchNum}</span>
                      <span>: {log.count.toLocaleString()} fichiers réconciliés en BDD</span>
                    </div>
                    <span className="text-[11px] font-bold text-text3 font-mono">
                      Cumul : {log.totalSoFar.toLocaleString()}
                    </span>
                  </div>
                ))}
                <div ref={logsEndRef} />
              </div>
            </div>
          ) : (
            <div
              onDragEnter={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragOver={(e) => { e.preventDefault(); setIsDraggingOver(true); }}
              onDragLeave={(e) => { e.preventDefault(); setIsDraggingOver(false); }}
              onDrop={handleFileDrop}
              onClick={() => {
                executeWithDemoExplanation(
                  isDemoMode,
                  DEMO_EXPLANATIONS.scanDepositJson,
                  () => fileInputRef.current?.click()
                );
              }}
              className={`w-full py-10 px-6 rounded-2xl transition-all flex flex-col items-center justify-center gap-3 cursor-pointer text-center border-2 border-dashed ${
                isDraggingOver
                  ? "border-accent bg-accent/10 scale-[1.01]"
                  : "border-border2/60 hover:border-accent/80 bg-bg/40"
              }`}
            >
              <div className="w-12 h-12 rounded-xl bg-surface2 flex items-center justify-center text-accent">
                <Folder className="w-6 h-6" />
              </div>
              <div>
                <span className="font-extrabold text-sm text-text block mb-1">
                  Glisser-déposer
                </span>
                <span className="text-xs text-text3">
                  ou cliquez pour parcourir vos fichiers
                </span>
              </div>
            </div>
          )}

          {scanMessage && (
            <div className={`mt-6 p-4 rounded-xl border flex gap-3 text-xs leading-snug animate-in fade-in duration-200 ${
              scanMessage.type === 'success'
                ? 'bg-success/10 border-success/30 text-success font-semibold'
                : 'bg-danger/10 border-danger/30 text-danger font-semibold'
            }`}>
              {scanMessage.type === 'success' ? <CheckCircle2 className="w-5 h-5 shrink-0" /> : <AlertCircle className="w-5 h-5 shrink-0" />}
              <span>{scanMessage.text}</span>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
