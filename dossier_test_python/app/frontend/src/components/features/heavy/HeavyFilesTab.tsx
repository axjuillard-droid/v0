import { useState, useRef, useEffect } from 'react';
import { useApiQuery } from '../../../hooks/useApi';
import { fetchHeaviest } from '../../../api/files';
import { useSourcesLists } from '../../../hooks/useSearch';
import { Spinner } from '../../ui/Spinner';
import { Copy, Download, ChevronDown } from '../../common/Icons';
import { TagPill } from '../search/TagEditor';
import { FileRecord } from '../../../types';

const extIcon = (ext?: string) => {
  const e = ext?.toLowerCase();
  const icons: Record<string, string> = { pdf:'📄', mp4:'🎬', mkv:'🎬', avi:'🎬', mov:'🎬', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', webp:'🖼️', docx:'📝', xlsx:'📊', csv:'📊', zip:'📦', txt:'📎' };
  return icons[e || ''] || '📎';
};

const fmtSize = (n?: number) => {
  if (!n) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};

const HeavyFileRow = ({ f, index }: { f: FileRecord; index: number }) => {
  const [isNameExpanded, setIsNameExpanded] = useState(false);
  const [isPathExpanded, setIsPathExpanded] = useState(false);

  return (
    <div className="flex items-center gap-3 p-3 px-4 bg-white/[0.03] border border-white/10 rounded-radius hover:bg-surface2 hover:border-accent/40 hover:translate-x-1 transition-all group shadow-sm">
      <div className="text-[0.75rem] font-bold text-text3 w-6 text-right">#{index + 1}</div>
      <div className="flex-1 min-w-0">
        <div 
          onClick={() => setIsNameExpanded(!isNameExpanded)}
          className={`font-medium cursor-pointer transition-all hover:text-accent text-[0.95rem] ${isNameExpanded ? 'break-all' : 'truncate'}`}
          title={isNameExpanded ? "Cliquez pour réduire" : f.nom_fichier}
        >
          {extIcon(f.extension)} {f.nom_fichier}
        </div>
        <div 
          onClick={() => setIsPathExpanded(!isPathExpanded)}
          className={`text-[0.72rem] text-text3 cursor-pointer transition-all hover:text-text2 font-jetbrains mt-0.5 ${isPathExpanded ? 'break-all' : 'truncate'}`}
          title={isPathExpanded ? "Cliquez pour réduire" : f.chemin_complet}
        >
          {f.chemin_complet}
        </div>
        {f.tags && f.tags.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1.5">
            {f.tags.map(t => <TagPill key={t} tag={t} />)}
          </div>
        )}
      </div>
      <span className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(167,139,250,0.15)] text-accent2 mr-2 border border-[rgba(167,139,250,0.3)] whitespace-nowrap">
        {f.nas ? `${f.nas} / ` : ''}{f.nas_origine || '?'}
      </span>
      <div className="text-[1.05rem] font-extrabold text-white font-jetbrains whitespace-nowrap min-w-[80px] text-right drop-shadow-[0_0_8px_rgba(255,255,255,0.1)]">{fmtSize(f.taille)}</div>
      
      <button onClick={() => navigator.clipboard.writeText(f.chemin_complet)} className="opacity-0 group-hover:opacity-100 p-1.5 rounded bg-surface border border-border text-text3 hover:text-text transition-all animate-in fade-in duration-200" title="Copier le chemin">
        <Copy className="w-4 h-4" />
      </button>
    </div>
  );
};

export const HeavyFilesTab = () => {
  const [selectedNas, setSelectedNas] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  const [n, setN] = useState(10);
  
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

  const { data: sourcesLists } = useSourcesLists();
  
  const { data, isLoading, isError, error } = useApiQuery(
    () => fetchHeaviest(n, selectedLabels, selectedNas),
    [n, selectedLabels, selectedNas]
  );

  const exportHeavyCSV = () => {
    const params = new URLSearchParams({ size: n.toString() });
    selectedNas.forEach(nasName => params.append('nas', nasName));
    selectedLabels.forEach(labelName => params.append('source', labelName));
    window.location.href = '/api/export/csv?' + params.toString();
  };

  return (
    <div className="animate-in fade-in duration-500">
      <div className="flex flex-wrap items-center gap-3 mb-5">
        
        {/* EDS Dropdown (Multi-select) */}
        <div className="relative" ref={nasRef}>
          <button 
            type="button"
            onClick={() => setNasDropdownOpen(!nasDropdownOpen)}
            className="flex items-center justify-between gap-1.5 py-2.5 px-3.5 bg-surface border border-border2 rounded-radius text-text2 text-sm cursor-pointer min-w-[160px] hover:border-accent transition-colors"
          >
            <span className="truncate max-w-[120px]">
              {selectedNas.length ? `EDS (${selectedNas.length})` : 'Tous les EDS'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {nasDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded p-2 min-w-[180px] max-h-[200px] overflow-y-auto shadow-custom">
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

        {/* Cellule Dropdown (Multi-select) */}
        <div className="relative" ref={labelRef}>
          <button 
            type="button"
            onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
            className="flex items-center justify-between gap-1.5 py-2.5 px-3.5 bg-surface border border-border2 rounded-radius text-text2 text-sm cursor-pointer min-w-[160px] hover:border-accent transition-colors"
          >
            <span className="truncate max-w-[120px]">
              {selectedLabels.length ? `Cellules (${selectedLabels.length})` : 'Toutes les Cellules'}
            </span>
            <ChevronDown className="w-4 h-4" />
          </button>
          
          {labelDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded p-2 min-w-[180px] max-h-[200px] overflow-y-auto shadow-custom">
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
        
        <select 
          value={n}
          onChange={(e) => setN(Number(e.target.value))}
          className="py-2.5 px-3.5 bg-surface border border-border2 rounded-radius text-text text-sm outline-none cursor-pointer focus:border-accent"
        >
          <option value={10} className="bg-bg2">Top 10</option>
          <option value={20} className="bg-bg2">Top 20</option>
          <option value={50} className="bg-bg2">Top 50</option>
        </select>
        
        <button 
          onClick={exportHeavyCSV}
          className="flex items-center gap-1.5 px-3 py-2 text-[0.85rem] bg-surface border border-border2 text-text2 rounded hover:bg-surface2 hover:text-text transition-colors"
        >
          <Download className="w-4 h-4" /> Exporter CSV
        </button>
      </div>

      <div className="flex flex-col gap-2">
        {isLoading && (
          <div className="text-center p-16 text-text3">
            <Spinner className="w-8 h-8" />
          </div>
        )}
        
        {isError && (
          <div className="text-center p-16 text-danger">
            <div className="text-4xl mb-4">⚡</div>
            <h3 className="font-semibold">{error?.message || "Erreur de chargement"}</h3>
          </div>
        )}

        {data?.length === 0 && !isLoading && (
          <div className="text-center p-16 text-text3">
            <div className="text-5xl mb-4">🔭</div>
            <h3 className="text-text2 font-semibold">Aucun fichier trouvé</h3>
          </div>
        )}

        {data?.map((f, i) => (
          <HeavyFileRow key={f.id} f={f} index={i} />
        ))}
      </div>
    </div>
  );
};
