import { useState, useMemo, useEffect, useRef } from 'react';
import { fetchAgeDistribution } from '../../../api/evolution';

import { useSourcesLists } from '../../../hooks/useSearch';
import { Spinner } from '../../ui/Spinner';
import { ChevronDown, ChevronLeft, ChevronRight } from '../../common/Icons';

import { cn } from '../../ui/Card';
import { useApiQuery } from '../../../hooks/useApi';

const COLORS = ['#6c8fff', '#a78bfa', '#34d399', '#fbbf24', '#f87171', '#60bff8', '#f472b6', '#e879f9'];

const fmtSize = (n?: number) => {
  if (!n) return '0 o';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};


interface SvgChartProps {
  data: any[];
  keys: string[];
  colors: string[];
  metric: 'count' | 'size';
  isArea?: boolean;
}

const SvgChart: React.FC<SvgChartProps> = ({ data, keys, colors, metric, isArea = false }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });

  if (!data || data.length === 0 || keys.length === 0) {
    return (
      <div className="h-full flex flex-col justify-center items-center text-text3">
        <span className="text-4xl mb-2">📊</span>
        <span>Aucune donnée à afficher.</span>
      </div>
    );
  }

  const width = 1000;
  const height = 320;
  const paddingLeft = 80;
  const paddingRight = 30;
  const paddingTop = 20;
  const paddingBottom = 40;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;

  let maxValue = 0;
  data.forEach(d => {
    keys.forEach(k => {
      const val = Number(d[k]) || 0;
      if (val > maxValue) maxValue = val;
    });
  });
  if (maxValue === 0) maxValue = 1;

  const paddedMax = maxValue * 1.1;

  const getX = (index: number) => {
    if (data.length <= 1) return paddingLeft + chartWidth / 2;
    return paddingLeft + (index / (data.length - 1)) * chartWidth;
  };

  const getY = (val: number) => {
    return height - paddingBottom - (val / paddedMax) * chartHeight;
  };

  const gridCount = 4;
  const gridLines = Array.from({ length: gridCount + 1 }, (_, i) => {
    const val = (paddedMax / gridCount) * i;
    const y = getY(val);
    return { val, y };
  });

  const xTickInterval = Math.max(1, Math.floor(data.length / 6));

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement, MouseEvent>) => {
    if (!svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    const chartLeftPx = (paddingLeft / width) * rect.width;
    const chartWidthPx = (chartWidth / width) * rect.width;
    const percent = (mouseX - chartLeftPx) / chartWidthPx;
    const index = Math.min(data.length - 1, Math.max(0, Math.round(percent * (data.length - 1))));

    setHoverIndex(index);
    setTooltipPos({ x: e.clientX - rect.left, y: mouseY - 10 });
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  return (
    <div className="relative w-full h-full">
      <svg
        ref={svgRef}
        width="100%"
        height="100%"
        viewBox={`0 0 ${width} ${height}`}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className="overflow-visible select-none"
      >
        {isArea && keys.map((key, i) => (
          <defs key={`grad-${key}`}>
            <linearGradient id={`grad-${key}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors[i % colors.length]} stopOpacity={0.4} />
              <stop offset="100%" stopColor={colors[i % colors.length]} stopOpacity={0.0} />
            </linearGradient>
          </defs>
        ))}

        {gridLines.map((line, i) => (
          <g key={i} className="opacity-60">
            <line
              x1={paddingLeft}
              y1={line.y}
              x2={width - paddingRight}
              y2={line.y}
              stroke="var(--border2)"
              strokeWidth={1}
              strokeDasharray={i === 0 ? "0" : "4 4"}
            />
            <text
              x={paddingLeft - 10}
              y={line.y + 4}
              fill="var(--color-text2)"
              fontSize={11}
              textAnchor="end"
            >
              {metric === 'size' ? fmtSize(line.val) : Math.round(line.val).toLocaleString('fr-FR')}
            </text>
          </g>
        ))}

        {data.map((d, i) => {
          // Éviter la superposition avec la toute dernière date à droite :
          // Si on approche de la fin à moins de 75% du pas d'intervalle, on saute la date intermédiaire
          const isNearEnd = (data.length - 1 - i) < (xTickInterval * 0.75);
          if (i % xTickInterval !== 0 || (isNearEnd && i !== data.length - 1)) return null;
          return (
            <g key={i} className="opacity-95">
              {/* Petite graduation verticale */}
              <line
                x1={getX(i)}
                y1={height - paddingBottom}
                x2={getX(i)}
                y2={height - paddingBottom + 5}
                stroke="var(--border2)"
                strokeWidth={1.5}
              />
              <text
                x={getX(i)}
                y={height - 18}
                fill="var(--color-text2)"
                fontSize={10}
                textAnchor="middle"
                style={{ fontFamily: 'monospace', letterSpacing: '0.05em', fontWeight: 500 }}
              >
                {d.date}
              </text>
            </g>
          );
        })}



        {isArea && keys.map((key) => {
          const points = data.map((d, i) => `${getX(i)},${getY(Number(d[key]) || 0)}`);
          const dPath = `M ${getX(0)},${height - paddingBottom} L ${points.join(' L ')} L ${getX(data.length - 1)},${height - paddingBottom} Z`;
          return (
            <path
              key={`area-${key}`}
              d={dPath}
              fill={`url(#grad-${key})`}
            />
          );
        })}

        {keys.map((key, kIdx) => {
          const points = data.map((d, i) => `${getX(i)},${getY(Number(d[key]) || 0)}`);
          const dPath = `M ${points.join(' L ')}`;
          return (
            <path
              key={`line-${key}`}
              d={dPath}
              fill="none"
              stroke={colors[kIdx % colors.length]}
              strokeWidth={3.5}
            />
          );
        })}

        {hoverIndex !== null && (
          <line
            x1={getX(hoverIndex)}
            y1={paddingTop}
            x2={getX(hoverIndex)}
            y2={height - paddingBottom}
            stroke="var(--accent)"
            strokeWidth={1}
            strokeDasharray="3 3"
            pointerEvents="none"
          />
        )}

        {hoverIndex !== null && keys.map((key, kIdx) => {
          const val = Number(data[hoverIndex][key]) || 0;
          return (
            <circle
              key={`dot-${key}`}
              cx={getX(hoverIndex)}
              cy={getY(val)}
              r={5}
              fill="var(--bg)"
              stroke={colors[kIdx % colors.length]}
              strokeWidth={3}
              pointerEvents="none"
            />
          );
        })}
      </svg>

      {hoverIndex !== null && (
        <div
          className="absolute z-50 bg-bg2 border border-border2 rounded-lg p-3 shadow-custom text-xs pointer-events-none transition-all duration-75"
          style={{
            left: `${tooltipPos.x + 15}px`,
            top: `${Math.max(10, Math.min(height - 120, tooltipPos.y - 40))}px`,
            transform: tooltipPos.x > (width * 0.7) ? 'translateX(-110%)' : 'none'
          }}
        >
          <div className="font-semibold border-b border-border2/30 pb-1 mb-1.5 text-text">
            {data[hoverIndex].date}
          </div>
          <div className="flex flex-col gap-1">
            {keys.map((key, i) => {
              const val = Number(data[hoverIndex][key]) || 0;
              return (
                <div key={key} className="flex items-center gap-4 justify-between">
                  <span className="flex items-center gap-1.5 text-text3">
                    <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: colors[i % colors.length] }} />
                    {key}
                  </span>
                  <span className="font-bold text-text">
                    {metric === 'size' ? fmtSize(val) : val.toLocaleString('fr-FR')}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export const EvolutionTab = () => {
  const [viewMode, setViewMode] = useState<'modification' | 'creation'>('modification');
  const [metric, setMetric] = useState<'count' | 'size'>('count');
  const [dimension, setDimension] = useState<'global' | 'extension' | 'source' | 'nas'>('global');
  const [visibleGroups, setVisibleGroups] = useState<string[]>([]);
  const [legendSearch, setLegendSearch] = useState('');

  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');


  const { data: sourcesLists } = useSourcesLists();

  // Tous les EDS et cellules disponibles, initialisés avec toutes les valeurs (tout coché par défaut)
  const allNasList: string[] = sourcesLists?.nas_list ?? [];
  const allLabelList: string[] = sourcesLists?.label_list ?? [];

  const [selectedNas, setSelectedNas] = useState<string[]>([]);
  const [selectedLabels, setSelectedLabels] = useState<string[]>([]);
  // Indique si l'initialisation a déjà eu lieu (pour ne pas écraser les sélections utilisateur)
  const nasInitialized = useRef(false);
  const labelsInitialized = useRef(false);

  // Initialiser avec toutes les valeurs dès que la liste est chargée
  useEffect(() => {
    if (!nasInitialized.current && allNasList.length > 0) {
      setSelectedNas(allNasList);
      nasInitialized.current = true;
    }
  }, [allNasList.length]);

  useEffect(() => {
    if (!labelsInitialized.current && allLabelList.length > 0) {
      setSelectedLabels(allLabelList);
      labelsInitialized.current = true;
    }
  }, [allLabelList.length]);
  
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

  useEffect(() => {
    if (dimension === 'nas') setDimension('global');
  }, [viewMode]);

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

  
  // Les filtres EDS et Cellule : on n'envoie à l'API QUE les éléments décochés.
  // Si tout est coché (= rien exclu) on envoie [] pour "tous".
  // Si une sélection partielle : on envoie la liste des cochés pour filtrer.
  const nasFilter = selectedNas.length === allNasList.length ? [] : selectedNas;
  const labelsFilter = selectedLabels.length === allLabelList.length ? [] : selectedLabels;

  // 2. Charger les distributions d'âges (depuis la base)
  const { data: ageData, isLoading: isAgeLoading, isError: isAgeError } = useApiQuery(
    () => fetchAgeDistribution({ group_by: dimension === 'source' ? 'label' : dimension, nas: nasFilter, source: labelsFilter }),
    [dimension, nasFilter.join(','), labelsFilter.join(',')],
    { enabled: true }
  );

  // Préparer les données pour les distributions d'âges (création/modification)
  const ageChartData = useMemo(() => {
    if (!ageData) return [];
    const sourceList = viewMode === 'modification' ? ageData.modifications : ageData.creations;
    
    // Filtrer par date si spécifié
    const filtered = sourceList.filter(pt => {
      if (dateFrom && pt.date < dateFrom.substring(0, 7)) return false;
      if (dateTo && pt.date > dateTo.substring(0, 7)) return false;
      return true;
    });

    if (dimension === 'global') {
      return filtered.map(pt => ({
        date: pt.date,
        "Volume": metric === 'count' ? pt.count : pt.size
      }));
    } else {
      // Pivoter par groupe
      const map = new Map<string, any>();
      filtered.forEach(pt => {
        if (!map.has(pt.date)) {
          map.set(pt.date, { date: pt.date });
        }
        const grp = pt.group || 'inconnu';
        const val = metric === 'count' ? pt.count : pt.size;
        map.get(pt.date)[grp] = val;
      });
      return Array.from(map.values()).sort((a, b) => a.date.localeCompare(b.date));
    }
  }, [ageData, viewMode, metric, dimension, dateFrom, dateTo]);

  const ageLines = useMemo(() => {
    if (dimension === 'global' || ageChartData.length === 0) return [];
    const keysSet = new Set<string>();
    ageChartData.forEach(row => {
      Object.keys(row).forEach(k => {
        if (k !== 'date') {
          keysSet.add(k);
        }
      });
    });
    return Array.from(keysSet);
  }, [ageChartData, dimension]);


  // Mettre à jour les groupes visibles lorsque les lignes ou la dimension changent
  useEffect(() => {
    setLegendSearch(''); // Réinitialise la recherche lors d'un changement de dimension
    if (dimension === 'global') {
      setVisibleGroups([]);
      return;
    }
    
    // Par défaut, si c'est les extensions : on prend uniquement les 8 plus populaires ou toutes
    if (dimension === 'extension') {
      const sums: Record<string, number> = {};
      ageChartData.forEach(row => {
        Object.entries(row).forEach(([k, v]) => {
          if (k !== 'date') {
            sums[k] = (sums[k] || 0) + Number(v);
          }
        });
      });
      const sorted = Object.entries(sums)
        .sort((a, b) => b[1] - a[1])
        .map(([k]) => k);
      
      setVisibleGroups(sorted.slice(0, 8)); // Coche uniquement le top 8 par défaut
    } else {
      // Pour EDS et Cellules : on coche tout par défaut
      setVisibleGroups(ageLines);
    }
  }, [ageLines, dimension, ageChartData]);


  // Déterminer la couleur thématique selon le mode actif
  const modeColor = viewMode === 'modification' ? '#a78bfa' : '#34d399';


  const isLoading = isAgeLoading;
  const isError = isAgeError;

  if (isLoading) return <div className="p-16 text-center"><Spinner className="w-8 h-8" /></div>;
  if (isError) return <div className="p-16 text-center text-danger">Erreur de connexion au serveur BDD.</div>;


  return (
    <div className="animate-in fade-in duration-500">
      
      {/* 1. Sélecteur de Mode (Style Onglet Classique) */}
      <div className="flex gap-6 border-b border-border/60 mb-6 pb-0.5">
        <button
          onClick={() => setViewMode('modification')}
          className={cn(
            "pb-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 relative cursor-pointer",
            viewMode === 'modification' 
              ? "text-accent2" 
              : "text-text3 hover:text-text"
          )}
        >
          <span>🕰️ Âge par Date de Modification</span>
          {viewMode === 'modification' && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-accent2 rounded-t-full shadow-[0_0_8px_var(--color-accent2)]" />
          )}
        </button>
        <button
          onClick={() => setViewMode('creation')}
          className={cn(
            "pb-3.5 text-xs font-bold uppercase tracking-wider transition-all duration-200 relative cursor-pointer",
            viewMode === 'creation' 
              ? "text-success" 
              : "text-text3 hover:text-text"
          )}
        >
          <span>🆕 Âge par Date de Création</span>
          {viewMode === 'creation' && (
            <span className="absolute bottom-0 left-0 right-0 h-[3px] bg-success rounded-t-full shadow-[0_0_8px_var(--color-success)]" />
          )}
        </button>
      </div>

      {/* 2. Barre d'outils de filtres */}
      <div className="flex flex-wrap items-center gap-3 mb-6 p-4 bg-surface border border-border rounded-xl">
        <div className="flex items-center gap-1 bg-bg3 border border-border2 rounded px-1 py-1 select-none">
          <button
            type="button"
            onClick={() => setMetric(metric === 'count' ? 'size' : 'count')}
            className="p-1 hover:text-accent rounded cursor-pointer text-text3 hover:bg-surface2 transition-colors"
            title="Passer à l'autre unité"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold uppercase tracking-wider text-text px-2 min-w-[130px] text-center">
            {metric === 'count' ? '📄 Fichiers' : '💾 Taille'}
          </span>
          <button
            type="button"
            onClick={() => setMetric(metric === 'count' ? 'size' : 'count')}
            className="p-1 hover:text-accent rounded cursor-pointer text-text3 hover:bg-surface2 transition-colors"
            title="Passer à l'autre unité"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        
        <span className="text-text3 text-sm px-1">par</span>
        <select 
          value={dimension} 
          onChange={e => setDimension(e.target.value as any)} 
          className="px-3 py-2 bg-bg3 border border-border2 rounded text-sm text-text outline-none focus:border-accent"
        >
          <option value="global">Global</option>
          <option value="extension">Extension</option>
          <option value="nas">Source EDS</option>
          <option value="source">Cellule</option>
        </select>




        {/* EDS Dropdown Filter — tout coché par défaut */}
        <div className="relative" ref={nasRef}>
          <button 
            type="button"
            onClick={() => setNasDropdownOpen(!nasDropdownOpen)}
            className="flex items-center justify-between gap-1.5 py-2 px-3 bg-bg3 border border-border2 rounded text-text2 text-xs cursor-pointer min-w-[130px] hover:border-accent transition-colors"
          >
            <span className="truncate max-w-[120px]">
              {selectedNas.length === allNasList.length
                ? 'Tous les EDS'
                : selectedNas.length === 0
                  ? 'Aucun EDS'
                  : `EDS (${selectedNas.length}/${allNasList.length})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          
          {nasDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded p-2 min-w-[200px] max-h-[240px] overflow-y-auto shadow-custom">
              {/* Boutons tout cocher / tout décocher */}
              <div className="flex gap-1 mb-2 pb-2 border-b border-border2">
                <button
                  type="button"
                  onClick={() => setSelectedNas(allNasList)}
                  className="flex-1 text-[10px] font-bold px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedNas([])}
                  className="flex-1 text-[10px] font-bold px-2 py-1 rounded bg-surface text-text3 hover:bg-border2 transition-colors cursor-pointer"
                >
                  Tout décocher
                </button>
              </div>
              {allNasList.length > 0 ? (
                allNasList.map((s: string) => (
                  <label key={s} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-surface2 transition-colors">
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

        {/* Cellule Dropdown Filter — tout cochée par défaut */}
        <div className="relative" ref={labelRef}>
          <button 
            type="button"
            onClick={() => setLabelDropdownOpen(!labelDropdownOpen)}
            className="flex items-center justify-between gap-1.5 py-2 px-3 bg-bg3 border border-border2 rounded text-text2 text-xs cursor-pointer min-w-[130px] hover:border-accent transition-colors"
          >
            <span className="truncate max-w-[120px]">
              {selectedLabels.length === allLabelList.length
                ? 'Toutes les Cellules'
                : selectedLabels.length === 0
                  ? 'Aucune Cellule'
                  : `Cellules (${selectedLabels.length}/${allLabelList.length})`}
            </span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          
          {labelDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded p-2 min-w-[200px] max-h-[240px] overflow-y-auto shadow-custom">
              {/* Boutons tout cocher / tout décocher */}
              <div className="flex gap-1 mb-2 pb-2 border-b border-border2">
                <button
                  type="button"
                  onClick={() => setSelectedLabels(allLabelList)}
                  className="flex-1 text-[10px] font-bold px-2 py-1 rounded bg-accent/10 text-accent hover:bg-accent/20 transition-colors cursor-pointer"
                >
                  Tout cocher
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedLabels([])}
                  className="flex-1 text-[10px] font-bold px-2 py-1 rounded bg-surface text-text3 hover:bg-border2 transition-colors cursor-pointer"
                >
                  Tout décocher
                </button>
              </div>
              {allLabelList.length > 0 ? (
                allLabelList.map((l: string) => (
                  <label key={l} className="flex items-center gap-2 px-2 py-1.5 rounded cursor-pointer text-xs hover:bg-surface2 transition-colors">
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

        <div className="flex-1" />

        <div className="flex items-center gap-2">
          <input 
            type="date" 
            value={dateFrom} 
            onChange={e => setDateFrom(e.target.value)} 
            className="px-2 py-1.5 bg-bg3 border border-border2 rounded text-sm text-text custom-date-input" 
          />
          <span className="text-text3 text-sm">à</span>
          <input 
            type="date" 
            value={dateTo} 
            onChange={e => setDateTo(e.target.value)} 
            className="px-2 py-1.5 bg-bg3 border border-border2 rounded text-sm text-text custom-date-input" 
          />
        </div>
      </div>

      {/* 4. Graphiques */}
      <div className="h-[400px] w-full bg-surface border border-border rounded-xl p-4 mb-6 pt-6 relative overflow-hidden">
        {ageChartData.length > 0 ? (
          dimension === 'global' ? (
            <SvgChart data={ageChartData} keys={["Volume"]} colors={[modeColor]} metric={metric} isArea={true} />
          ) : (
            <SvgChart data={ageChartData} keys={visibleGroups} colors={COLORS} metric={metric} />
          )
        ) : (
          <div className="h-full flex flex-col justify-center items-center text-text3">
            <span className="text-4xl mb-2">🕰️</span>
            <span>Aucune donnée temporelle trouvée pour cette période.</span>
          </div>
        )}
      </div>

      {/* Légende interactive des courbes (EDS, Cellules, Extensions) */}
      {dimension !== 'global' && ageLines.length > 0 && (
        <div className="p-5 bg-surface border border-border rounded-xl mb-6 animate-in fade-in duration-200">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4 pb-3 border-b border-border2">
            <div>
              <h4 className="text-sm font-bold text-text">Filtrer les courbes à afficher</h4>
            </div>

            {/* Barre de recherche d'éléments */}
            <div className="flex-1 max-w-[280px]">
              <input
                type="text"
                value={legendSearch}
                onChange={e => setLegendSearch(e.target.value)}
                placeholder={
                  dimension === 'extension'
                    ? "Rechercher une extension (.zip, .pdf...)"
                    : dimension === 'source'
                      ? "Rechercher une cellule..."
                      : "Rechercher un EDS..."
                }
                className="w-full px-3 py-1.5 bg-bg3 border border-border2 rounded-lg text-xs text-text outline-none focus:border-accent placeholder:text-text3 transition-all"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setVisibleGroups(ageLines)}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-accent/10 hover:bg-accent/20 text-accent border border-accent/20 transition-all cursor-pointer"
              >
                Tout cocher
              </button>
              <button
                type="button"
                onClick={() => setVisibleGroups([])}
                className="text-[10px] font-bold px-3 py-1.5 rounded-lg bg-surface border border-border2 text-text3 hover:text-text hover:border-border transition-all cursor-pointer"
              >
                Tout décocher
              </button>
            </div>
          </div>

          <div className="flex flex-wrap gap-2 max-h-[160px] overflow-y-auto pr-1">
            {ageLines
              .filter(group => {
                const label = dimension === 'extension' ? `.${group}` : group;
                return label.toLowerCase().includes(legendSearch.toLowerCase());
              })
              .map((group) => {
                const origIdx = ageLines.indexOf(group);
                const color = COLORS[origIdx % COLORS.length];
                const isChecked = visibleGroups.includes(group);
                return (
                  <button
                    key={group}
                    type="button"
                    onClick={() => {
                      if (isChecked) {
                        setVisibleGroups(prev => prev.filter(g => g !== group));
                      } else {
                        setVisibleGroups(prev => [...prev, group]);
                      }
                    }}
                    className={cn(
                      "flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium transition-all cursor-pointer",
                      isChecked
                        ? "bg-bg3 border-border2 text-text shadow-sm"
                        : "bg-surface border-border2 opacity-40 text-text3 hover:opacity-75"
                    )}
                  >
                    <span
                      className="w-2.5 h-2.5 rounded-full"
                      style={{ backgroundColor: isChecked ? color : 'var(--text3)' }}
                    />
                    <span>{dimension === 'extension' ? `.${group}` : group}</span>
                  </button>
                );
              })}
            {ageLines.filter(group => {
              const label = dimension === 'extension' ? `.${group}` : group;
              return label.toLowerCase().includes(legendSearch.toLowerCase());
            }).length === 0 && (
              <span className="text-xs text-text3 py-2">Aucun élément ne correspond à votre recherche.</span>
            )}
          </div>
        </div>
      )}

    </div>
  );
};


