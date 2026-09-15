import { useState, useEffect, useCallback, useRef } from 'react';
import { useSearchStore } from '../../../store/searchStore';
import { fetchTreeContents, TreeItem } from '../../../api/tree';
import client from '../../../api/client';
import { 
  Folder, File, Copy, ChevronRight, ChevronDown, Loader2, 
  FileText, Image, Video, Table, Archive, Code2, Music, AlertCircle, X 
} from '../../common/Icons';
import { TagPill, TagEditor } from '../search/TagEditor';

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { 
    day: '2-digit', 
    month: 'short', 
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const fmtSize = (n?: number) => {
  if (n === undefined || n === null) return '—';
  if (n === 0) return '0 o';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};

const getFileIcon = (ext?: string, isSelected?: boolean, size = 16) => {
  const e = (ext || '').toLowerCase().replace(/^\./, '');
  const colorClass = isSelected 
    ? "text-accent" 
    : ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(e) 
      ? "text-accent" 
      : e === 'pdf' 
        ? "text-danger" 
        : ['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(e) 
          ? "text-purple-400" 
          : ['xls', 'xlsx', 'csv'].includes(e) 
            ? "text-green-400" 
            : ['doc', 'docx'].includes(e) 
              ? "text-blue-400" 
              : ['zip', 'rar', '7z', 'tar', 'gz'].includes(e) 
                ? "text-yellow-400" 
                : ['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'yml', 'yaml', 'sql'].includes(e) 
                  ? "text-text3" 
                  : ['mp3', 'wav', 'flac'].includes(e) 
                    ? "text-pink-400" 
                    : "text-text3";
  const props = { className: `shrink-0 ${colorClass}`, strokeWidth: 1.5, style: { width: size, height: size } };
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(e)) return <Image {...props} />;
  if (e === 'pdf') return <FileText {...props} />;
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(e)) return <Video {...props} />;
  if (['xls', 'xlsx', 'csv'].includes(e)) return <Table {...props} />;
  if (['doc', 'docx'].includes(e)) return <FileText {...props} />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return <Archive {...props} />;
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'yml', 'yaml', 'sql'].includes(e)) return <Code2 {...props} />;
  if (['mp3', 'wav', 'flac'].includes(e)) return <Music {...props} />;
  return <File {...props} />;
};

// Generate HSL colors for cells
const getOwnerColor = (label: string) => {
  let hash = 0;
  for (let i = 0; i < label.length; i++) {
    hash = (hash * 31 + label.charCodeAt(i)) & 0xffffffff;
  }
  const h = Math.abs(hash) % 360;
  return {
    color: `hsl(${h}, 95%, 85%)`,
    bg: `hsla(${h}, 70%, 25%, 0.45)`,
    border: `hsla(${h}, 90%, 60%, 0.5)`
  };
};

// Determine which Cellule source a path belongs to
const getPathCellule = (path: string, sources: any[], selectedEDS: string) => {
  if (!path) return null;
  const normPath = path.toLowerCase().replace(/\\/g, '/');
  return sources.find(s => {
    if (s.nas !== selectedEDS) return false;
    const normSrc = s.path.toLowerCase().replace(/\\/g, '/');
    return normPath === normSrc || normPath.startsWith(normSrc + '/');
  });
};

export const TreeTab = () => {
  const store = useSearchStore();
  const { locateFile, setLocateFile } = store;

  // DB Sources list
  const [sources, setSources] = useState<any[]>([]);
  const [selectedEDS, setSelectedEDS] = useState<string>('');
  const [isLoadingSources, setIsLoadingSources] = useState(true);

  // Tree loading state
  const [treeLoading, setTreeLoading] = useState(false);
  const [loadingPaths, setLoadingPaths] = useState<Set<string>>(new Set());
  const [isLocatingActive, setIsLocatingActive] = useState(false);
  const [treeError, setTreeError] = useState<string | null>(null);

  // Folder contents mapping: path -> TreeItem[]
  const [loadedContents, setLoadedContents] = useState<Record<string, TreeItem[]>>({});
  
  // Set of expanded directory paths
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set());

  // Path that is currently active/selected in the details panel
  const [selectedItem, setSelectedItem] = useState<TreeItem | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  
  // Tag Editor state
  const [tagEditorOpen, setTagEditorOpen] = useState(false);

  // Refs for tracking target auto-location process
  const isLocating = useRef(false);

  // 1. Fetch sources details on mount (avec fallback pour le mode Démo)
  useEffect(() => {
    const getSources = async () => {
      setIsLoadingSources(true);
      const fallbackDemoSource = [
        { id: 1, nas: 'PIQUE-NIQUE', label: 'Cellule Démo', path: 'C:/Users/Demo/Téléchargements/apéro' }
      ];

      const dbUrl = localStorage.getItem('nas_db_url') || '';
      if (dbUrl.includes('demo')) {
        setSources(fallbackDemoSource);
        setSelectedEDS('PIQUE-NIQUE');
        setIsLoadingSources(false);
        return;
      }

      try {
        const { data } = await client.get('/sources/details');
        if (data && data.sources && data.sources.length > 0) {
          setSources(data.sources);
          const edsList = Array.from(new Set(data.sources.map((s: any) => s.nas).filter(Boolean))) as string[];
          if (edsList.length > 0) {
            setSelectedEDS(edsList[0]);
          } else {
            setSources([]);
            setSelectedEDS('');
          }
        } else {
          setSources([]);
          setSelectedEDS('');
        }
      } catch (err) {
        console.error('Failed to load sources details:', err);
        setSources([]);
        setSelectedEDS('');
      } finally {
        setIsLoadingSources(false);
      }
    };
    getSources();
  }, []);

  // 2. Fetch contents of a folder path
  const loadFolder = useCallback(async (nas: string, path: string) => {
    try {
      const response = await fetchTreeContents(nas, path);
      setLoadedContents(prev => ({
        ...prev,
        [path]: response.children
      }));
      return response.children;
    } catch (err: any) {
      console.error(`Failed to load directory ${path}:`, err);
      throw err;
    }
  }, []);

  // Toggle folder expansion
  const toggleExpand = useCallback(async (item: TreeItem) => {
    const path = item.path;
    const isExpanded = expandedPaths.has(path);
    const newExpanded = new Set(expandedPaths);

    if (isExpanded) {
      newExpanded.delete(path);
      setExpandedPaths(newExpanded);
    } else {
      newExpanded.add(path);
      setExpandedPaths(newExpanded);

      if (!loadedContents[path]) {
        setLoadingPaths(prev => new Set(prev).add(path));
        try {
          await loadFolder(item.nas || selectedEDS, path);
          setTreeError(null);
        } catch (err: any) {
          setTreeError(`Impossible de lire le dossier : ${err.message}`);
        } finally {
          setLoadingPaths(prev => {
            const next = new Set(prev);
            next.delete(path);
            return next;
          });
        }
      }
    }
  }, [expandedPaths, loadedContents, loadFolder, selectedEDS]);

  // Load root of selected EDS (e.g. drive list)
  useEffect(() => {
    if (!selectedEDS || isLocating.current) return;

    const loadRoot = async () => {
      setTreeLoading(true);
      setTreeError(null);
      setLoadedContents({});
      setExpandedPaths(new Set());
      setSelectedItem(null);
      setShowDetails(false);
      
      try {
        const response = await fetchTreeContents(selectedEDS, "");
        const newLoaded: Record<string, TreeItem[]> = {
          "": response.children
        };
        const newExpanded = new Set<string>([""]);

        // Si nous sommes sur l'EDS de Démo (PIQUE-NIQUE), pré-charger et déplier automatiquement l'arborescence
        if (selectedEDS === 'PIQUE-NIQUE') {
          const aperoPath = "C:/Users/Demo/Téléchargements/apéro";
          const fromagePath = "C:/Users/Demo/Téléchargements/apéro/fromage";

          try {
            const aperoResp = await fetchTreeContents(selectedEDS, aperoPath);
            const fromageResp = await fetchTreeContents(selectedEDS, fromagePath);

            newLoaded[aperoPath] = aperoResp.children;
            newLoaded[fromagePath] = fromageResp.children;
            newExpanded.add(aperoPath);
            newExpanded.add(fromagePath);
          } catch (e) {
            console.error("Error pre-expanding demo tree:", e);
          }
        }

        setLoadedContents(newLoaded);
        setExpandedPaths(newExpanded);
      } catch (err: any) {
        setTreeError(`Erreur lors du chargement de la racine : ${err.message}`);
      } finally {
        setTreeLoading(false);
      }
    };

    loadRoot();
  }, [selectedEDS]);

  // 3. Handle Auto-Location of files selected from Search Tab
  const autoLocateFile = useCallback(async (targetFile: any) => {
    if (isLocating.current) return;
    isLocating.current = true;
    setIsLocatingActive(true);
    setTreeLoading(true);
    setTreeError(null);

    try {
      const nasTarget = targetFile.nas || (
        sources.find(
          s => (s.label && targetFile.nas_origine && s.label.toLowerCase() === targetFile.nas_origine.toLowerCase()) ||
               (s.nas && targetFile.nas && s.nas.toLowerCase() === targetFile.nas.toLowerCase())
        )?.nas
      ) || selectedEDS || 'defaut';

      if (nasTarget !== selectedEDS) {
        setSelectedEDS(nasTarget);
      }

      const filePath = targetFile.chemin_complet || '';
      const rawNormalized = filePath.replace(/\\/g, '/');
      const segments = rawNormalized.split('/').filter(Boolean);

      const newExpanded = new Set<string>();
      newExpanded.add("");

      const newLoaded: Record<string, TreeItem[]> = {};

      // Charger la racine du NAS
      let currentChildren = await fetchTreeContents(nasTarget, "").then(r => r.children || []);
      newLoaded[""] = currentChildren;

      let matchedNode: TreeItem | null = null;

      // Parcourir chaque segment du chemin
      for (let idx = 0; idx < segments.length; idx++) {
        const seg = segments[idx].toLowerCase();
        
        // Trouver l'élément enfant correspondant au segment courant
        const found = currentChildren.find(c => {
          const cName = c.name.toLowerCase();
          const cPath = c.path.replace(/\\/g, '/').toLowerCase();
          return cName === seg || 
                 cPath === seg || 
                 cPath.endsWith('/' + seg) || 
                 cPath.startsWith(seg);
        });

        if (!found) {
          console.warn(`[autoLocateFile] Segment '${seg}' non trouvé dans l'arborescence`, currentChildren);
          break;
        }

        matchedNode = found;

        if (found.type === 'folder') {
          newExpanded.add(found.path);
          const res = await fetchTreeContents(nasTarget, found.path);
          currentChildren = res.children || [];
          newLoaded[found.path] = currentChildren;
        }
      }

      setLoadedContents(prev => ({ ...prev, ...newLoaded }));
      setExpandedPaths(prev => {
        const updated = new Set(prev);
        newExpanded.forEach(p => updated.add(p));
        return updated;
      });

      const selectedNode: TreeItem = matchedNode || {
        id: targetFile.id,
        name: targetFile.nom_fichier,
        path: targetFile.chemin_complet,
        type: 'file',
        size: targetFile.taille,
        extension: targetFile.extension,
        date_modification: targetFile.date_modification,
        tags: targetFile.tags,
        est_vide: targetFile.est_vide,
        proprietaire: targetFile.proprietaire || 'inconnu',
        date_indexation: targetFile.date_indexation,
        nas_origine: targetFile.nas_origine,
        nas: nasTarget
      };

      setSelectedItem(selectedNode);
      setShowDetails(true);

      setTimeout(() => {
        const targetId = targetFile.id;
        let element = targetId ? document.getElementById(`tree-node-${targetId}`) : null;

        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
          element.classList.add('bg-accent/25', 'border-accent/40');
          setTimeout(() => {
            element?.classList.remove('bg-accent/25', 'border-accent/40');
          }, 3000);
        }
      }, 600);

    } catch (err: any) {
      setTreeError(`Erreur lors de la localisation : ${err.message}`);
    } finally {
      setTreeLoading(false);
      setIsLocatingActive(false);
      setLocateFile(null);
      isLocating.current = false;
    }
  }, [sources, selectedEDS, setLocateFile]);

  // Run auto locate if file queued
  useEffect(() => {
    if (locateFile) {
      autoLocateFile(locateFile);
    }
  }, [locateFile, autoLocateFile]);

  // Listen to tag changes to refresh tree data
  useEffect(() => {
    const handleTagsChange = async () => {
      if (!selectedItem || selectedItem.type !== 'file' || !selectedEDS) return;
      
      const parentPath = selectedItem.path.substring(0, selectedItem.path.lastIndexOf('\\'));
      try {
        const children = await loadFolder(selectedItem.nas || selectedEDS, parentPath);
        const updatedFile = children.find(c => c.id === selectedItem.id);
        if (updatedFile) {
          setSelectedItem(updatedFile);
        }
      } catch (err) {
        console.error("Failed to refresh tags in tree:", err);
      }
    };

    window.addEventListener('query-invalidate-tagsList', handleTagsChange);
    return () => {
      window.removeEventListener('query-invalidate-tagsList', handleTagsChange);
    };
  }, [selectedItem, selectedEDS, loadFolder]);

  // Handle Copy Path
  const handleCopyPath = (path: string) => {
    navigator.clipboard.writeText(path);
  };

  // Render a single tree node (recursive component helper)
  const renderTreeNode = (item: TreeItem, depth = 0) => {
    const isFolder = item.type === 'folder';
    const isExpanded = expandedPaths.has(item.path);
    const children = loadedContents[item.path] || [];
    const isSelected = selectedItem?.path === item.path;

    const cell = getPathCellule(item.path, sources, selectedEDS);
    const celluleLabel = (item.nas_origine && item.nas_origine !== 'Toutes') ? item.nas_origine : cell?.label;
    const cellStyle = celluleLabel ? getOwnerColor(celluleLabel) : null;

    // Option B : badge uniquement si item.path === path exact de la source enregistrée (normalisé)
    const normItemPath = item.path.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '');
    const normCellPath = cell ? cell.path.toLowerCase().replace(/\\/g, '/').replace(/\/+$/, '') : '';
    const isCelluleRoot = Boolean(cell && celluleLabel && normItemPath !== '' && normItemPath === normCellPath);

    const owner = item.proprietaire || 'inconnu';
    const ownerShort = owner.split('\\').pop() || owner;
    const { color: ownerColor, bg: ownerBg, border: ownerBorder } = getOwnerColor(owner);

    const isFolderLoading = loadingPaths.has(item.path);

    return (
      <div key={item.path} className="flex flex-col select-none animate-in fade-in duration-150">
        <div className="relative w-full">
          <div 
            id={item.id ? `tree-node-${item.id}` : undefined}
            data-tour={item.name.includes('camembert') ? 'demo-tree-target-file' : undefined}
            onClick={() => {
              setSelectedItem(item);
              setShowDetails(true);
              if (isFolder) {
                toggleExpand(item);
              }
            }}
            style={{ paddingLeft: `${depth * 14 + 6}px` }}
            className={`flex items-center justify-between py-1.5 pr-2 rounded hover:bg-surface2/20 cursor-pointer transition-all relative z-10 ${
              isSelected ? 'font-medium text-text' : 'text-text2'
            }`}
          >
            <div className="flex items-center gap-2 truncate">
              {isFolder && item.path !== "" ? (
                <span className="text-text3 hover:text-text rounded transition-colors shrink-0">
                  {isFolderLoading ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                  ) : isExpanded ? (
                    <ChevronDown className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronRight className="w-3.5 h-3.5" />
                  )}
                </span>
              ) : (
                <span className="w-3.5 h-3 shrink-0" />
              )}

              <span className="shrink-0 flex items-center">
                {isFolder ? (
                  <Folder 
                    className="w-4 h-4" 
                    style={
                      isSelected 
                        ? { color: 'var(--color-accent)' } 
                        : (cellStyle ? { color: cellStyle.color } : { color: 'var(--color-text3)' })
                    } 
                  />
                ) : (
                  getFileIcon(item.extension, isSelected)
                )}
              </span>

              <span 
                className={`text-[0.8rem] truncate ${isSelected ? 'text-accent' : ''}`}
                style={(!isSelected && cellStyle) ? { color: cellStyle.color } : undefined}
              >
                {item.name === "" ? selectedEDS : item.name}
              </span>

              {isFolder && isCelluleRoot && cellStyle && celluleLabel && (
                <span 
                  className="px-1.5 py-0.5 rounded text-[0.58rem] font-semibold tracking-wider font-jetbrains border select-none"
                  style={{ color: cellStyle.color, backgroundColor: cellStyle.bg, borderColor: cellStyle.border }}
                >
                  Cellule: {celluleLabel}
                </span>
              )}
            </div>

            {!isFolder && item.proprietaire && (
              <span 
                className="px-1.5 py-0.2 rounded text-[0.62rem] font-semibold font-jetbrains opacity-80 border"
                style={{ backgroundColor: ownerBg, color: ownerColor, borderColor: ownerBorder }}
                title={`Cellule propriétaire : ${owner}`}
              >
                {ownerShort}
              </span>
            )}
          </div>

          {isSelected && (
            <div className="absolute inset-y-0 left-0 right-0 bg-surface2 border-l-[3px] border-accent pointer-events-none rounded-sm z-0" />
          )}
        </div>

        {isFolder && isExpanded && (
          <div className="flex flex-col mt-0.5 ml-2.5">
            {isFolderLoading ? (
              <div 
                className="py-1 text-[0.72rem] text-accent font-mono flex items-center gap-1.5 animate-pulse"
                style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-accent" />
                <span>Chargement du sous-dossier...</span>
              </div>
            ) : children.length === 0 ? (
              <div 
                className="py-0.5 text-[0.72rem] text-text3 italic flex items-center gap-1.5"
                style={{ paddingLeft: `${(depth + 1) * 14 + 10}px` }}
              >
                <span>Dossier vide</span>
              </div>
            ) : (
              children.map(child => renderTreeNode(child, depth + 1))
            )}
          </div>
        )}
      </div>
    );
  };

  if (isLoadingSources) {
    return (
      <div className="flex items-center justify-center p-12">
        <Loader2 className="w-6 h-6 animate-spin text-accent" />
        <span className="ml-2 text-sm text-text3">Chargement de l'arborescence...</span>
      </div>
    );
  }

  const edsList = Array.from(new Set(sources.map(s => s.nas).filter(Boolean))) as string[];

  const rootNode = selectedEDS ? {
    name: selectedEDS,
    path: "",
    type: 'folder' as const,
    nas: selectedEDS
  } : null;

  const cellStyle = selectedItem ? getPathCellule(selectedItem.path, sources, selectedEDS) : null;
  const headerCellStyle = cellStyle ? getOwnerColor(cellStyle.label) : null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 relative">
      {/* 1. Left explorer panel */}
      <div data-tour="tree-explorer-panel" className={`${showDetails ? 'lg:col-span-8' : 'lg:col-span-12'} bg-surface border border-border rounded-2xl p-6 shadow-custom flex flex-col min-h-[500px] transition-all duration-300 relative`}>
        {isLocatingActive && (
          <div className="absolute inset-0 bg-surface/60 backdrop-blur-[2px] z-50 flex flex-col items-center justify-center rounded-2xl animate-in fade-in duration-200">
            <div className="bg-bg/85 border border-border2 rounded-2xl p-6 shadow-2xl flex flex-col items-center gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-accent" />
              <span className="text-xs font-bold text-text2 uppercase tracking-wider font-mono">
                Localisation du fichier...
              </span>
              <span className="text-[10px] text-text3 text-center max-w-[200px]">
                Recherche et déploiement de l'arborescence réseau en cours
              </span>
            </div>
          </div>
        )}

        {/* TOP BAR : EXPLORATEUR EDS */}
        <div className="flex items-center justify-between gap-4 flex-wrap p-3.5 px-4 bg-bg2/70 border border-white/10 rounded-xl mb-4 shadow-sm">
          <div className="flex items-center gap-3">
            <h2 className="text-base font-bold text-text leading-tight">Explorateur EDS</h2>
          </div>

          {/* SÉLECTEUR D'EDS */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-text3 uppercase tracking-wider">EDS :</span>
            <div className="relative flex items-center">
              <select
                value={selectedEDS}
                onChange={(e) => setSelectedEDS(e.target.value)}
                className="bg-bg border border-border2 text-text text-xs rounded-lg py-1.5 pl-3 pr-8 outline-none focus:border-accent font-semibold transition-colors cursor-pointer appearance-none w-[120px]"
              >
                {edsList.map(eds => (
                  <option key={eds} value={eds} className="bg-bg2 text-text">
                    {eds}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-text3 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* CONTENU DE L'ARBORESCENCE */}
        <div className="flex-1 max-h-[600px] overflow-y-auto pr-1">
          {treeError && (
            <div className="p-3 bg-danger/10 border border-danger/20 text-danger text-xs rounded-lg mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-danger shrink-0" />
              <span>{treeError}</span>
            </div>
          )}

          {treeLoading && expandedPaths.size === 0 ? (
            <div className="flex flex-col items-center justify-center p-12">
              <Loader2 className="w-8 h-8 animate-spin text-accent mb-2" />
              <span className="text-xs text-text3 uppercase tracking-wider font-mono">Lecture de l'arborescence...</span>
            </div>
          ) : rootNode ? (
            <div className="flex flex-col gap-0.5">
              {renderTreeNode(rootNode)}
            </div>
          ) : (
            <div className="text-center p-8 text-text3 text-xs italic">Aucun stockage physique disponible.</div>
          )}
        </div>
      </div>

      {/* 2. Right details panel */}
      {showDetails && (
        <div data-tour="tree-details-panel" className="lg:col-span-4 bg-surface border border-border rounded-2xl p-6 shadow-custom flex flex-col animate-in slide-in-from-right duration-300">
          <div className="pb-4 mb-4 flex items-center justify-between border-b border-border">
            <h3 className="text-xs font-black tracking-widest text-text2 uppercase m-0">
              Détails
            </h3>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowDetails(false)}
                className="p-2 bg-bg border border-border2 hover:border-accent rounded-lg text-text3 hover:text-text transition-all flex items-center justify-center cursor-pointer"
                title="Masquer les détails"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {selectedItem ? (
            <div className="flex flex-col gap-4 flex-1">
              <div className="flex flex-col gap-3.5 bg-bg/40 border border-border2 rounded-xl p-4">
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-bg border border-border2 flex items-center justify-center shrink-0">
                    {selectedItem.type === 'folder' ? (
                      <Folder 
                        style={
                          headerCellStyle 
                            ? { color: headerCellStyle.color, width: 24, height: 24 } 
                            : { color: 'var(--color-accent)', width: 24, height: 24 }
                        } 
                      />
                    ) : (
                      getFileIcon(selectedItem.extension, false, 24)
                    )}
                  </div>
                  <div className="truncate flex-1 flex flex-col gap-1">
                    <h4 className="text-base font-bold text-text truncate m-0 leading-snug" title={selectedItem.name}>
                      {selectedItem.name === "" ? selectedEDS : selectedItem.name}
                    </h4>
                    <span className="inline-block px-2 py-0.5 rounded text-[0.55rem] font-black bg-bg/60 border border-border2 text-text3 uppercase tracking-widest w-fit">
                      {selectedItem.type === 'folder' ? 'Dossier' : selectedItem.extension || 'Fichier'}
                    </span>
                  </div>
                </div>

                <div className="border-t border-border/40 pt-3 mt-0.5 flex flex-col gap-1.5">
                  <span className="block text-[9px] font-bold text-text3 uppercase tracking-wider">Chemin complet</span>
                  <div 
                    onClick={() => handleCopyPath(selectedItem.path || selectedEDS)}
                    className="flex items-center justify-between gap-2 bg-bg/60 hover:bg-bg border border-border2 hover:border-accent rounded-lg p-2.5 px-3 text-xs text-text2 font-jetbrains break-all cursor-pointer transition-colors group/path select-all"
                    title="Cliquer pour copier le chemin"
                  >
                    <span className="flex-1 text-left block group-hover/path:text-text">{selectedItem.path || selectedEDS}</span>
                    <Copy className="w-3.5 h-3.5 text-text3 group-hover/path:text-accent shrink-0 transition-colors" />
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-4 bg-bg/20 border border-border2 p-4 rounded-xl">
                {selectedItem.type === 'file' && (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-1.5">
                        <span className="block text-[10px] font-bold text-text3 uppercase tracking-wider">Taille</span>
                        <div className="bg-bg border border-border2 rounded-lg p-3 text-xs font-bold text-text font-jetbrains leading-none flex items-center min-h-[42px]">
                          {fmtSize(selectedItem.size)}
                        </div>
                      </div>

                      <div className="flex flex-col gap-1.5">
                        <span className="block text-[10px] font-bold text-text3 uppercase tracking-wider">Modification</span>
                        <div className="bg-bg border border-border2 rounded-lg p-3 text-xs font-bold text-text font-jetbrains leading-none flex items-center min-h-[42px]">
                          {fmtDate(selectedItem.date_modification)}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col gap-2 pt-2 border-t border-border/40">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-text3 uppercase tracking-wider">Tags / Étiquettes</span>
                        <button
                          onClick={() => setTagEditorOpen(true)}
                          className="text-[11px] font-bold text-accent hover:underline cursor-pointer"
                        >
                          + Gérer les tags
                        </button>
                      </div>

                      <div className="flex flex-wrap gap-1.5">
                        {selectedItem.tags && selectedItem.tags.length > 0 ? (
                          selectedItem.tags.map(tag => (
                            <TagPill key={tag} tag={tag} />
                          ))
                        ) : (
                          <span className="text-xs text-text3 italic">Aucun tag associant ce fichier.</span>
                        )}
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-text3">
              <Folder className="w-10 h-10 mb-2 text-text3/50" />
              <p className="text-xs">Sélectionnez un élément dans l'arborescence pour afficher ses détails.</p>
            </div>
          )}
        </div>
      )}

      {/* Modal d'édition des tags */}
      {tagEditorOpen && selectedItem && selectedItem.type === 'file' && (
        <TagEditor
          fileId={selectedItem.id || ''}
          currentTags={selectedItem.tags || []}
          onClose={() => setTagEditorOpen(false)}
        />
      )}
    </div>
  );
};
