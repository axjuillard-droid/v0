import { Search, ChevronDown } from '../../common/Icons';
import { useSearchStore } from '../../../store/searchStore';
import { useSourcesLists, useTagsList, useExtensionsList } from '../../../hooks/useSearch';
import { useState, useRef, useEffect } from 'react';
import { cn } from '../../ui/Card';
import { useGuide } from '../../../context/GuideContext';
import { executeWithDemoExplanation } from '../../../utils/demoExplanation';
import { DEMO_EXPLANATIONS } from '../../../utils/demoExplanationsData';

const PREDEFINED_TAGS = ["à archiver", "projet terminé", "doublon probable", "à vérifier", "important", "temporaire"];

export const SearchBar = () => {
  const { isDemoMode } = useGuide();
  const {
    q, nas, source, ext, tags, date_mode, date_start, date_end,
    setQuery, setFilters, toggleTag, toggleNas, toggleSource, toggleExtension, reset,
    search_mode, setSearchMode,
    search_field, setSearchField
  } = useSearchStore();
  const { data: sourcesLists } = useSourcesLists();
  const { data: serverTags } = useTagsList();
  const { data: extensionsList } = useExtensionsList();

  const [localQ, setLocalQ] = useState(q || '');

  useEffect(() => {
    setLocalQ(q || '');
  }, [q]);

  // Debounce 500ms — ne tire que si ≥ 2 caractères (ou vide pour réinitialiser)
  useEffect(() => {
    const trimmed = localQ.trim();
    const shouldFire = trimmed === '' || trimmed.length >= 2;
    if (!shouldFire) return;

    const timer = setTimeout(() => {
      if (localQ !== q) {
        setQuery(localQ);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [localQ, q, setQuery]);

  // Touche Entrée : déclenche immédiatement si ≥ 2 caractères
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      const trimmed = localQ.trim();
      if (trimmed === '' || trimmed.length >= 2) {
        setQuery(localQ);
      }
    }
  };

  const [tagDropdownOpen, setTagDropdownOpen] = useState(false);
  const [nasDropdownOpen, setNasDropdownOpen] = useState(false);
  const [sourceDropdownOpen, setSourceDropdownOpen] = useState(false);
  const [extDropdownOpen, setExtDropdownOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const dropdownRef = useRef<HTMLDivElement>(null);
  const nasDropdownRef = useRef<HTMLDivElement>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);
  const extDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setTagDropdownOpen(false);
      }
      if (nasDropdownRef.current && !nasDropdownRef.current.contains(e.target as Node)) {
        setNasDropdownOpen(false);
      }
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) {
        setSourceDropdownOpen(false);
      }
      if (extDropdownRef.current && !extDropdownRef.current.contains(e.target as Node)) {
        setExtDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);

    return () => {
      document.removeEventListener('mousedown', handleClick);
    };
  }, []);

  const allTags = Array.from(new Set([...PREDEFINED_TAGS, ...(serverTags || [])]));
  // Extensions : dynamiques depuis la base, triées par nombre de fichiers (déjà triées par le backend)
  const inputRef = useRef<HTMLInputElement>(null);
  const dateSelectRef = useRef<HTMLSelectElement>(null);
  const skipNextFocusDemoRef = useRef(false);

  const dynamicExtensions = extensionsList || [];
  const activeFiltersCount = (nas?.length || 0) + (source?.length || 0) + (ext?.length || 0) + (tags?.length || 0) + (date_mode ? 1 : 0);

  // Indicateur : si localQ a moins de 2 chars (mais pas vide), prévenir l'utilisateur
  const showMinCharsHint = localQ.trim().length === 1;

  return (
    <div className="flex flex-col gap-2.5 mb-5 w-full">
      <div className="flex flex-wrap items-center gap-2.5 w-full">
        {/* Barre de recherche */}
        <div className="flex-1 min-w-[220px] relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-text3 pointer-events-none" />
          <input
            ref={inputRef}
            type="search"
            data-tour="input-search-query"
            value={localQ}
            onFocus={() => {
              if (isDemoMode) {
                if (skipNextFocusDemoRef.current) {
                  skipNextFocusDemoRef.current = false;
                  return;
                }
                executeWithDemoExplanation(
                  true,
                  DEMO_EXPLANATIONS.searchQueryInput,
                  () => {
                    skipNextFocusDemoRef.current = true;
                    setTimeout(() => {
                      inputRef.current?.focus();
                    }, 100);
                  }
                );
              }
            }}
            onBlur={() => {
              skipNextFocusDemoRef.current = false;
            }}
            onChange={(e) => setLocalQ(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Rechercher..."
            className={cn(
              "w-full py-2.5 pl-10 pr-3.5 bg-surface border rounded-radius text-text text-sm outline-none transition-all focus:shadow-[0_0_0_3px_rgba(108,143,255,0.15)]",
              showMinCharsHint
                ? "border-amber-500/60 focus:border-amber-500"
                : "border-border2 focus:border-accent"
            )}
          />
          {showMinCharsHint && (
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-amber-400 font-medium pointer-events-none">
              min. 2 car.
            </span>
          )}
        </div>

        {/* Toggle Champ de recherche */}
        <div className="relative group flex items-center bg-bg3 border border-border2 rounded-radius p-0.5 select-none h-[38px]">
          <button
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.searchField('chemin_complet'),
                () => setSearchField('chemin_complet')
              )
            }
            className={cn(
              "h-full px-3 rounded-[10px] text-xs font-semibold transition-all cursor-pointer",
              search_field !== 'nom_fichier'
                ? "bg-accent text-white shadow-sm"
                : "text-text3 hover:text-text2"
            )}
          >
            Chemin
          </button>
          <button
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.searchField('nom_fichier'),
                () => setSearchField('nom_fichier')
              )
            }
            className={cn(
              "h-full px-3 rounded-[10px] text-xs font-semibold transition-all cursor-pointer",
              search_field === 'nom_fichier'
                ? "bg-accent text-white shadow-sm"
                : "text-text3 hover:text-text2"
            )}
          >
            Nom
          </button>
          {/* Tooltip */}
          <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2.5 hidden group-hover:block bg-bg2 border border-border2 text-text2 text-[11px] rounded-lg p-3 w-[260px] shadow-custom z-[100] pointer-events-none">
            <p className="font-semibold text-text mb-1">🎯 Champ de recherche :</p>
            <p className="mb-1"><span className="text-accent font-bold">Chemin :</span> Recherche dans le chemin complet (dossier + nom).</p>
            <p><span className="text-accent font-bold">Nom :</span> Recherche uniquement dans le nom du fichier.</p>
          </div>
        </div>

        {/* Toggle Mode de recherche avec Tooltip */}
        <div className="relative group flex items-center bg-bg3 border border-border2 rounded-radius p-0.5 select-none h-[38px]">
          <button
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.searchMode('intelligent'),
                () => setSearchMode('intelligent')
              )
            }
            className={cn(
              "h-full px-4 rounded-[10px] text-xs font-semibold transition-all cursor-pointer",
              search_mode === 'intelligent'
                ? "bg-accent text-white shadow-sm"
                : "text-text3 hover:text-text2"
            )}
          >
            Intelligent
          </button>
          <button
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.searchMode('stricte'),
                () => setSearchMode('stricte')
              )
            }
            className={cn(
              "h-full px-4 rounded-[10px] text-xs font-semibold transition-all cursor-pointer",
              search_mode === 'stricte'
                ? "bg-accent text-white shadow-sm"
                : "text-text3 hover:text-text2"
            )}
          >
            Strict
          </button>

          {/* Tooltip */}
          <div className="absolute bottom-full right-1/2 translate-x-1/2 mb-2.5 hidden group-hover:block bg-bg2 border border-border2 text-text2 text-[11px] rounded-lg p-3 w-[280px] shadow-custom z-[100] pointer-events-none">
            <p className="font-semibold text-text mb-1">💡 Mode de recherche :</p>
            <p className="mb-1"><span className="text-accent font-bold">Intelligent :</span> Recherche tolérante (accents ignorés, recherche approximative, synonymes).</p>
            <p><span className="text-accent font-bold">Strict :</span> Recherche exacte sur la chaîne de caractères saisie.</p>
          </div>
        </div>

        {/* Bouton de bascule Filtres */}
        <button
          data-tour="btn-toggle-filters"
          onClick={() =>
            executeWithDemoExplanation(
              isDemoMode,
              DEMO_EXPLANATIONS.filtersToggle(!showAdvanced),
              () => setShowAdvanced(!showAdvanced)
            )
          }
          className={cn(
            "flex items-center gap-2 py-2 px-3.5 border rounded-radius text-xs font-semibold transition-all cursor-pointer h-[38px] bg-surface",
            showAdvanced || activeFiltersCount > 0
              ? "border-accent text-accent bg-accent/5"
              : "border-border2 text-text2 hover:border-accent hover:text-text"
          )}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon>
          </svg>
          <span>Filtres</span>
          {activeFiltersCount > 0 && (
            <span className="flex items-center justify-center bg-accent text-white text-[10px] w-5 h-5 rounded-full font-bold ml-0.5">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {/* Bouton Réinitialiser */}
        <button
          onClick={() =>
            executeWithDemoExplanation(
              isDemoMode,
              DEMO_EXPLANATIONS.resetForm,
              () => {
                reset();
                setLocalQ('');
                setShowAdvanced(false);
              }
            )
          }
          className="px-4 py-2 bg-surface border border-border2 text-text2 rounded-radius text-xs font-semibold hover:bg-surface2 hover:text-text transition-colors h-[38px]"
        >
          Réinitialiser
        </button>
      </div>

      {/* Zone de filtres avancés collapsible */}
      {showAdvanced && (
        <div data-tour="search-filters-bar" className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3.5 w-full mt-1 bg-bg2/40 border border-border/80 rounded-radius p-4 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Dropdown EDS Multi-choix */}
          <div className="relative" ref={nasDropdownRef}>
            <button 
              data-tour="filter-eds-dropdown"
              onClick={() =>
                executeWithDemoExplanation(
                  isDemoMode,
                  DEMO_EXPLANATIONS.edsFilterDropdown,
                  () => setNasDropdownOpen(!nasDropdownOpen)
                )
              }
              className={cn(
                "flex items-center justify-between gap-1.5 py-2 px-3 bg-surface border border-border2 rounded-radius text-text2 text-xs cursor-pointer w-full hover:border-accent transition-colors h-[38px]",
                nas?.length ? "border-accent text-text" : ""
              )}
            >
              <span>{nas?.length ? `EDS (${nas.length})` : 'Tous les EDS'}</span>
              <ChevronDown className="w-4 h-4 text-text3" />
            </button>
            
            {nasDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded-radius p-2 w-full min-w-[180px] max-h-[240px] overflow-y-auto shadow-custom">
                {sourcesLists?.nas_list && sourcesLists.nas_list.length > 0 ? (
                  sourcesLists.nas_list.map((n: string) => (
                    <label key={n} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[0.82rem] hover:bg-surface2 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={nas?.includes(n) || false}
                        onChange={() => toggleNas(n)}
                        className="accent-accent"
                      />
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border2 bg-surface text-text2">
                        {n}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-xs text-text3 p-2 text-center">Aucun EDS disponible</div>
                )}
              </div>
            )}
          </div>

          {/* Dropdown Cellules Multi-choix */}
          <div className="relative" ref={sourceDropdownRef}>
            <button 
              data-tour="filter-cellule-dropdown"
              onClick={() =>
                executeWithDemoExplanation(
                  isDemoMode,
                  DEMO_EXPLANATIONS.sourceFilterDropdown,
                  () => setSourceDropdownOpen(!sourceDropdownOpen)
                )
              }
              className={cn(
                "flex items-center justify-between gap-1.5 py-2 px-3 bg-[#171f33] border border-border2 rounded-radius text-text2 text-xs cursor-pointer w-full hover:border-accent transition-colors h-[38px]",
                source?.length ? "border-accent text-text" : ""
              )}
            >
              <span>{source?.length ? `Cellules (${source.length})` : 'Toutes les Cellules'}</span>
              <ChevronDown className="w-4 h-4 text-text3" />
            </button>
            
            {sourceDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded-radius p-2 w-full min-w-[200px] max-h-[240px] overflow-y-auto shadow-custom">
                {sourcesLists?.label_list && sourcesLists.label_list.length > 0 ? (
                  sourcesLists.label_list.map((src: string) => (
                    <label key={src} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[0.82rem] hover:bg-surface2 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={source?.includes(src) || false}
                        onChange={() => toggleSource(src)}
                        className="accent-accent"
                      />
                      <span className="text-xs px-2 py-0.5 rounded-full border border-border2 bg-surface text-text2">
                        {src}
                      </span>
                    </label>
                  ))
                ) : (
                  <div className="text-xs text-text3 p-2 text-center">Aucune cellule disponible</div>
                )}
              </div>
            )}
          </div>

          {/* Dropdown Extensions Multi-choix — dynamique depuis la base */}
          <div className="relative" ref={extDropdownRef}>
            <button 
              onClick={() =>
                executeWithDemoExplanation(
                  isDemoMode,
                  DEMO_EXPLANATIONS.extFilterDropdown,
                  () => setExtDropdownOpen(!extDropdownOpen)
                )
              }
              className={cn(
                "flex items-center justify-between gap-1.5 py-2 px-3 bg-surface border border-border2 rounded-radius text-text2 text-xs cursor-pointer w-full hover:border-accent transition-colors h-[38px]",
                ext?.length ? "border-accent text-text" : ""
              )}
            >
              <span>{ext?.length ? `Extensions (${ext.length})` : 'Toutes extensions'}</span>
              <ChevronDown className="w-4 h-4 text-text3" />
            </button>
            
            {extDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded-radius p-2 w-full min-w-[200px] max-h-[280px] overflow-y-auto shadow-custom">
                {dynamicExtensions.length > 0 ? (
                  dynamicExtensions.map(({ ext: e, count }) => (
                    <label key={e} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[0.82rem] hover:bg-surface2 transition-colors">
                      <input 
                        type="checkbox" 
                        checked={ext?.includes(e) || false}
                        onChange={() => toggleExtension(e)}
                        className="accent-accent"
                      />
                      <span className="flex-1 text-xs px-2 py-0.5 rounded-full border border-border2 bg-surface text-text2 uppercase font-jetbrains">
                        {e}
                      </span>
                      <span className="text-[10px] text-text3 shrink-0">{count.toLocaleString('fr-FR')}</span>
                    </label>
                  ))
                ) : (
                  <div className="text-xs text-text3 p-2 text-center">Chargement...</div>
                )}
              </div>
            )}
          </div>

          {/* Dropdown Tags */}
          <div className="relative" ref={dropdownRef}>
            <button 
              onClick={() =>
                executeWithDemoExplanation(
                  isDemoMode,
                  DEMO_EXPLANATIONS.tagFilterDropdown,
                  () => setTagDropdownOpen(!tagDropdownOpen)
                )
              }
              className={cn(
                "flex items-center justify-between gap-1.5 py-2 px-3 bg-surface border border-border2 rounded-radius text-text2 text-xs cursor-pointer w-full hover:border-accent transition-colors h-[38px]",
                tags?.length ? "border-accent text-text" : ""
              )}
            >
              <span>{tags?.length ? `Tags (${tags.length})` : 'Tags'}</span>
              <ChevronDown className="w-4 h-4 text-text3" />
            </button>
            
            {tagDropdownOpen && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-bg2 border border-border2 rounded-radius p-2 w-full min-w-[200px] max-h-[240px] overflow-y-auto shadow-custom">
                {allTags.map(tag => (
                  <label key={tag} className="flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer text-[0.82rem] hover:bg-surface2 transition-colors">
                    <input 
                      type="checkbox" 
                      checked={tags?.includes(tag) || false}
                      onChange={() => toggleTag(tag)}
                      className="accent-accent"
                    />
                    <span className="text-xs px-2 py-0.5 rounded-full border border-border2 bg-surface">
                      {tag}
                    </span>
                  </label>
                ))}
              </div>
            )}
          </div>

          {/* Filtre de date */}
          <div className="col-span-full border-t border-border/40 pt-3.5 mt-1 flex flex-wrap items-center gap-3">
            <span className="text-xs text-text3 font-semibold">Filtrer par date :</span>
            <select
              ref={dateSelectRef}
              value={date_mode || ''}
              onMouseDown={(e) => {
                if (isDemoMode) {
                  e.preventDefault();
                  executeWithDemoExplanation(
                    true,
                    DEMO_EXPLANATIONS.dateFilterSelect,
                    () => {
                      setTimeout(() => {
                        if (dateSelectRef.current) {
                          if (typeof (dateSelectRef.current as any).showPicker === 'function') {
                            (dateSelectRef.current as any).showPicker();
                          } else {
                            dateSelectRef.current.focus();
                          }
                        }
                      }, 100);
                    }
                  );
                }
              }}
              onChange={(e) => setFilters({ date_mode: e.target.value, date_start: '', date_end: '' })}
              className="py-1.5 px-3 bg-surface border border-border2 rounded-radius text-text text-xs outline-none cursor-pointer min-w-[160px] focus:border-accent transition-colors h-[34px]"
            >
              <option value="" className="bg-bg2">Toutes les dates</option>
              <option value="between" className="bg-bg2">Entre deux dates...</option>
              <option value="after" className="bg-bg2">Après le...</option>
              <option value="before" className="bg-bg2">Avant le...</option>
            </select>

            {date_mode === 'after' && (
              <input
                type="date"
                value={date_start || ''}
                onChange={(e) => setFilters({ date_start: e.target.value })}
                className="py-1.5 px-3 bg-surface border border-border2 rounded-radius text-text text-xs outline-none focus:border-accent text-text h-[34px]"
              />
            )}

            {date_mode === 'before' && (
              <input
                type="date"
                value={date_end || ''}
                onChange={(e) => setFilters({ date_end: e.target.value })}
                className="py-1.5 px-3 bg-surface border border-border2 rounded-radius text-text text-xs outline-none focus:border-accent text-text h-[34px]"
              />
            )}

            {date_mode === 'between' && (
              <div className="flex items-center gap-2">
                <input
                  type="date"
                  value={date_start || ''}
                  onChange={(e) => setFilters({ date_start: e.target.value })}
                  className="py-1.5 px-3 bg-surface border border-border2 rounded-radius text-text text-xs outline-none focus:border-accent text-text h-[34px]"
                />
                <span className="text-xs text-text3 font-medium">au</span>
                <input
                  type="date"
                  value={date_end || ''}
                  onChange={(e) => setFilters({ date_end: e.target.value })}
                  className="py-1.5 px-3 bg-surface border border-border2 rounded-radius text-text text-xs outline-none focus:border-accent text-text h-[34px]"
                />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
