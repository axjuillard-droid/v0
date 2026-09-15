import { useState, useRef, useEffect } from 'react';
import { fetchCleanupScan } from '../../../api/cleanup';
import { useSourcesLists } from '../../../hooks/useSearch';
import { Spinner } from '../../ui/Spinner';
import { Copy, Download, AlertCircle, ChevronDown } from '../../common/Icons';
import { useApiMutation } from '../../../hooks/useApi';

const CATEGORY_META: Record<string, { icon: string, name: string, color: string }> = {
  fichiers_vides:       { icon:'❌', name:'Fichiers vides',         color:'text-danger' },
  doublons:             { icon:'📋', name:'Doublons',                color:'text-warn' },
};

const fmtSize = (n?: number) => {
  if (!n) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

const CleanupFileRow = ({ f }: { f: any }) => {
  const [isPathExpanded, setIsPathExpanded] = useState(false);

  return (
    <tr className="border-b border-border hover:bg-surface transition-colors">
      <td className="p-3">
        <div 
          onClick={() => setIsPathExpanded(!isPathExpanded)}
          className={`cursor-pointer transition-all hover:text-accent font-jetbrains ${isPathExpanded ? 'break-all text-accent' : 'truncate max-w-[450px] block'}`}
          title={isPathExpanded ? "Cliquez pour réduire" : f.chemin}
        >
          {f.chemin}
        </div>
      </td>
      <td className="p-3">
        {f.extension ? (
          <span className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] bg-[rgba(108,143,255,0.15)] text-accent uppercase font-jetbrains">
            {f.extension}
          </span>
        ) : '—'}
      </td>
      <td className="p-3 whitespace-nowrap">{fmtSize(f.taille)}</td>
      <td className="p-3 whitespace-nowrap">{fmtDate(f.date_modification)}</td>
      <td className="p-3">
        <span className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(167,139,250,0.15)] text-accent2 whitespace-nowrap">
          {f.nas ? `${f.nas} / ` : ''}{f.nas_origine || '?'}
        </span>
      </td>
      <td className="p-3">
        <div className="flex gap-2">
          <button 
            onClick={() => navigator.clipboard.writeText(f.chemin)} 
            className="p-1 rounded bg-surface border border-border text-text3 hover:text-text" 
            title="Copier le chemin"
          >
            <Copy className="w-3.5 h-3.5" />
          </button>
        </div>
      </td>
    </tr>
  );
};

export const CleanupTab = () => {
  const [years] = useState(2);
  const [report, setReport] = useState<any>(null);
  const [currentCategory, setCurrentCategory] = useState<string | null>(null);

  const { data: sourcesLists } = useSourcesLists();
  const [selectedNas, setSelectedNas] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  
  const [nasDropdownOpen, setNasDropdownOpen] = useState(false);
  const [labelDropdownOpen, setLabelDropdownOpen] = useState(false);
  
  const nasRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (nasRef.current && !nasRef.current.contains(e.target as Node)) {
        setNasDropdownOpen(false);
      }
      if (labelRef.current && !labelRef.current.contains(e.target as Node)) {
        setLabelDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const toggleNas = (nasName: string) => {
    setSelectedNas(prev => 
      prev.includes(nasName) 
        ? prev.filter(n => n !== nasName) 
        : [...prev, nasName]
    );
  };

  const toggleLabel = (labelName: string) => {
    setSelectedLabels(prev => 
      prev.includes(labelName) 
        ? prev.filter(l => l !== labelName) 
        : [...prev, labelName]
    );
  };

  const { mutateAsync: scan, isPending: isScanning, error: scanError } = useApiMutation(
    () => fetchCleanupScan({ years, nas: selectedNas, labels: selectedLabels }),
    {
      onSuccess: (data) => {
        setReport(data);
        setCurrentCategory(null);
      }
    }
  );

  const exportCSV = () => {
    if (!report) return;
    const rows: any[] = [];
    Object.entries(report.categories || {}).forEach(([catKey, catData]: [string, any]) => {
      if (catKey === 'doublons') {
        (catData.groups || []).forEach((g: any) => (g.files || []).forEach((f: any) => rows.push({ ...f, categorie: catKey })));
      } else {
        (catData.files || []).forEach((f: any) => rows.push({ ...f, categorie: catKey }));
      }
    });

    const header = 'chemin,taille,extension,date_modification,nas_origine,categorie_detection\n';
    const body = rows.map(r => 
      [r.chemin||'', r.taille||0, r.extension||'', r.date_modification||'', r.nas_origine||'', r.categorie||'']
        .map(v => `"${String(v).replace(/"/g, '""')}"`)
        .join(',')
    ).join('\n');

    const blob = new Blob(['\uFEFF' + header + body], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cleanup_${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const renderFilesTable = (files: any[]) => {
    return (
      <div className="overflow-x-auto rounded-[12px] border border-border">
        <table className="w-full border-collapse text-[0.85rem] text-left">
          <thead>
            <tr>
              <th className="p-3 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border">Chemin</th>
              <th className="p-3 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border">Ext.</th>
              <th className="p-3 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border">Taille</th>
              <th className="p-3 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border">Modifié</th>
              <th className="p-3 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border">Source</th>
              <th className="p-3 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border"></th>
            </tr>
          </thead>
          <tbody>
            {files.map(f => (
              <CleanupFileRow key={f.chemin} f={f} />
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderDetail = () => {
    if (!currentCategory || !report?.categories?.[currentCategory]) return null;
    const catData = report.categories[currentCategory];
    const meta = CATEGORY_META[currentCategory] || { icon: '📁', name: currentCategory, color: 'text-text' };

    return (
      <div className="mt-8">
        <h3 className="text-xl font-bold mb-4 flex items-center gap-2">
          {meta.icon} {meta.name}
        </h3>
        
        {currentCategory === 'doublons' ? (
          <div className="flex flex-col gap-6">
            {(catData.groups || []).map((g: any) => (
              <div key={g.key}>
                <div className="text-[0.78rem] text-text3 mb-1.5 px-1.5 flex items-center">
                  👥 <span className="truncate max-w-[500px] ml-1 mr-2">{g.key}</span> — {g.count} exemplaires
                </div>
                {renderFilesTable(g.files)}
              </div>
            ))}
          </div>
        ) : (
          renderFilesTable(catData.files || [])
        )}
      </div>
    );
  };

  return (
    <div className="animate-in fade-in duration-500 pb-20">
      <div className="flex flex-wrap md:flex-nowrap items-center gap-4 bg-surface border border-border rounded-xl p-5 mb-8">
        <div className="flex-1">
          <h2 className="text-lg font-bold mb-1 flex items-center gap-2">
            <div className="w-6 h-6 flex justify-center items-center bg-accent text-white rounded">
              <AlertCircle className="w-4 h-4" />
            </div> 
            Mode Nettoyage
          </h2>
        </div>
        
        <div className="flex flex-wrap items-center gap-3 border-l border-border pl-6">
          {/* EDS Dropdown */}
          <div className="relative" ref={nasRef}>
            <button 
              type="button"
              onClick={() => setNasDropdownOpen(!nasDropdownOpen)}
              className="flex items-center justify-between gap-1.5 py-2 px-3.5 bg-bg border border-border2 rounded text-text2 text-xs cursor-pointer min-w-[140px] hover:border-accent transition-colors"
            >
              <span className="truncate max-w-[100px]">
                {selectedNas.length ? `EDS (${selectedNas.length})` : 'Tous les EDS'}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {nasDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-bg2 border border-border2 rounded p-2 min-w-[180px] max-h-[200px] overflow-y-auto shadow-custom">
                {sourcesLists?.nas_list && sourcesLists.nas_list.length > 0 ? (
                  sourcesLists.nas_list.map((s: string) => (
                    <label key={s} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-surface2 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedNas.includes(s)}
                        onChange={() => toggleNas(s)}
                        className="accent-accent"
                      />
                      <span>{s}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-xs text-text3 p-2 text-center">Aucun EDS disponible</div>
                )}
              </div>
            )}
          </div>

          {/* Cellule Dropdown */}
          <div className="relative" ref={labelRef}>
            <button 
              type="button"
              onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
              className="flex items-center justify-between gap-1.5 py-2 px-3.5 bg-bg border border-border2 rounded text-text2 text-xs cursor-pointer min-w-[140px] hover:border-accent transition-colors"
            >
              <span className="truncate max-w-[100px]">
                {selectedLabels.length ? `Cellules (${selectedLabels.length})` : 'Toutes les Cellules'}
              </span>
              <ChevronDown className="w-3.5 h-3.5" />
            </button>
            
            {labelDropdownOpen && (
              <div className="absolute top-full right-0 mt-1 z-50 bg-bg2 border border-border2 rounded p-2 min-w-[180px] max-h-[200px] overflow-y-auto shadow-custom">
                {sourcesLists?.label_list && sourcesLists.label_list.length > 0 ? (
                  sourcesLists.label_list.map((l: string) => (
                    <label key={l} className="flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs hover:bg-surface2 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={selectedLabels.includes(l)}
                        onChange={() => toggleLabel(l)}
                        className="accent-accent"
                      />
                      <span>{l}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-xs text-text3 p-2 text-center">Aucune cellule disponible</div>
                )}
              </div>
            )}
          </div>
          
          <button 
            onClick={() => scan()}
            disabled={isScanning}
            className="bg-gradient-to-br from-accent to-accent2 text-white font-bold px-6 py-2.5 rounded-lg border border-[rgba(255,255,255,0.15)] shadow-custom hover:opacity-90 disabled:opacity-50 transition-all flex items-center justify-center min-w-[140px]"
          >
            {isScanning ? <Spinner className="w-4 h-4 border-white border-t-transparent" /> : "Lancer l'analyse"}
          </button>
        </div>
      </div>

      {scanError && (
        <div className="text-danger p-4 bg-danger/10 border border-danger/20 rounded-xl mb-6">
          ❌ Erreur lors de l'analyse : {scanError.message}
        </div>
      )}

      {isScanning && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <Spinner className="w-10 h-10 text-accent mb-4" />
          <span className="text-xs text-text3 uppercase tracking-widest animate-pulse font-mono">
            Analyse des fichiers en cours...
          </span>
        </div>
      )}

      {!report && !isScanning && (
        <div className="flex flex-col items-center justify-center py-20 text-center border border-dashed border-border2/60 rounded-[20px] bg-surface/10 mt-6 max-w-[680px] mx-auto animate-in fade-in duration-300">
          <span className="text-5xl mb-4 select-none">🧹</span>
          <h3 className="text-text font-bold text-base mb-1">Aucune analyse en cours</h3>
          <p className="text-xs text-text3 max-w-[400px] leading-relaxed">
            Sélectionnez vos critères de filtrage (EDS, Cellules) dans la barre ci-dessus puis cliquez sur <strong>Lancer l'analyse</strong> pour identifier les doublons et les fichiers vides.
          </p>
        </div>
      )}

      {report && (
        <>
          <div className="flex justify-end items-center mb-6">
            {report.summary?.total_candidates > 0 && (
              <button 
                onClick={exportCSV} 
                className="flex items-center gap-1.5 px-3 py-1.5 text-[0.78rem] bg-surface border border-border2 text-text2 rounded hover:bg-surface2 hover:text-text transition-colors"
              >
                <Download className="w-3.5 h-3.5" /> Exporter rapport CSV
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-8 max-w-[680px] mx-auto">
            {Object.entries(report.categories || {})
              .filter(([key]) => key === 'fichiers_vides' || key === 'doublons')
              .map(([key, data]: [string, any]) => {
                const meta = CATEGORY_META[key] || { icon: '📁', name: key, color: 'text-text' };
                const count = data.count;
                const isActive = currentCategory === key;
                return (
                  <div 
                    key={key} 
                    onClick={() => setCurrentCategory(key)}
                    className={`bg-surface border rounded-xl p-5 cursor-pointer transition-all hover:-translate-y-1 hover:shadow-custom ${isActive ? 'border-accent bg-accent/5' : 'border-border'}`}
                  >
                    <div className="text-2xl mb-2">{meta.icon}</div>
                    <div className="text-xs text-text3 font-bold uppercase tracking-wide mb-1">{meta.name}</div>
                    <div className={`text-3xl font-black mb-1 ${meta.color}`}>{count?.toLocaleString('fr-FR') || 0}</div>
                    <div className="text-[0.75rem] text-text3 mt-2 border-t border-border pt-1">
                      {fmtSize(data.total_size_bytes)} récupérables
                    </div>
                  </div>
                );
              })}
          </div>

          {renderDetail()}
        </>
      )}
    </div>
  );
};
