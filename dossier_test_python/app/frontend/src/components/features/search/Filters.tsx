import { useRef } from 'react';
import { useSearchStore } from '../../../store/searchStore';
import { useSearch } from '../../../hooks/useSearch';
import { FileWarning, Download } from '../../common/Icons';
import { cn } from '../../ui/Card';
import { useGuide } from '../../../context/GuideContext';
import { executeWithDemoExplanation } from '../../../utils/demoExplanation';
import { DEMO_EXPLANATIONS } from '../../../utils/demoExplanationsData';

export const Filters = () => {
  const { isDemoMode } = useGuide();
  const sortSelectRef = useRef<HTMLSelectElement>(null);
  const orderSelectRef = useRef<HTMLSelectElement>(null);

  const { empty, sort, order, setFilters, q, tags, source, ext, date_mode, date_start, date_end, search_mode } = useSearchStore();
  const { data } = useSearch();

  const exportCSV = () => {
    const params = new URLSearchParams();
    if (q) params.append('q', q);
    if (search_mode) params.append('search_mode', search_mode);
    source?.forEach(s => params.append('source', s));
    ext?.forEach(e => params.append('ext', e));
    if (empty) params.append('empty', 'true');
    if (sort) params.append('sort', sort);
    if (order) params.append('order', order);
    if (date_mode) params.append('date_mode', date_mode);
    if (date_start) params.append('date_start', date_start);
    if (date_end) params.append('date_end', date_end);
    tags?.forEach(t => params.append('tags', t));

    window.location.href = '/api/export/csv?' + params.toString();
  };

  const hasFilters = Boolean(
    q || 
    (source && source.length > 0) || 
    (ext && ext.length > 0) || 
    empty || 
    (tags && tags.length > 0)
  );
  const showExport = hasFilters || (data?.total && data.total > 0);

  return (
    <div className="flex flex-wrap items-center gap-2.5 p-3.5 px-4 bg-surface border border-border rounded-radius mb-5">
      <button 
        onClick={() =>
          executeWithDemoExplanation(
            isDemoMode,
            DEMO_EXPLANATIONS.emptyFilesOnly(!!empty),
            () => setFilters({ empty: !empty })
          )
        }
        className={cn(
          "flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-all duration-200 ease-in-out cursor-pointer",
          empty 
            ? "bg-amber-500/15 border-amber-500/40 text-amber-200 shadow-sm" 
            : "border-border2 bg-bg/40 text-text2 hover:border-amber-500/40 hover:text-amber-200"
        )}
      >
        <FileWarning className="w-3.5 h-3.5 text-amber-400" />
        <span>Fichiers vides seulement</span>
      </button>

      <div className="flex-1 min-w-[20px]" />

      <div className="flex items-center gap-2">
        {showExport && (
          <button 
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.exportCSV(data?.total || 0),
                exportCSV
              )
            }
            className="flex items-center gap-1.5 px-3 py-1.5 text-[0.78rem] bg-surface border border-border2 text-text2 rounded hover:bg-surface2 hover:text-text transition-colors mr-2 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" /> Exporter CSV ({data?.total?.toLocaleString('fr-FR') || 0})
          </button>
        )}

        <span className="text-[0.8rem] text-text3">Trier par</span>
        <select 
          ref={sortSelectRef}
          value={sort || 'date_modification'}
          onMouseDown={(e) => {
            if (isDemoMode) {
              e.preventDefault();
              const sortLabel = sort === 'taille' ? 'Taille' : sort === 'nom_fichier.keyword' ? 'Nom' : 'Date';
              executeWithDemoExplanation(
                true,
                DEMO_EXPLANATIONS.sortBy(sortLabel),
                () => {
                  setTimeout(() => {
                    if (sortSelectRef.current) {
                      if (typeof (sortSelectRef.current as any).showPicker === 'function') {
                        (sortSelectRef.current as any).showPicker();
                      } else {
                        sortSelectRef.current.focus();
                      }
                    }
                  }, 100);
                }
              );
            }
          }}
          onChange={(e) => setFilters({ sort: e.target.value })}
          className="py-1.5 px-2 bg-transparent text-[0.8rem] text-text outline-none focus:text-accent cursor-pointer"
        >
          <option value="date_modification" className="bg-bg2">Date</option>
          <option value="taille" className="bg-bg2">Taille</option>
          <option value="nom_fichier.keyword" className="bg-bg2">Nom</option>
        </select>
        
        <select 
          ref={orderSelectRef}
          value={order || 'desc'}
          onMouseDown={(e) => {
            if (isDemoMode) {
              e.preventDefault();
              executeWithDemoExplanation(
                true,
                DEMO_EXPLANATIONS.sortOrder(order === 'desc' ? 'desc' : 'asc'),
                () => {
                  setTimeout(() => {
                    if (orderSelectRef.current) {
                      if (typeof (orderSelectRef.current as any).showPicker === 'function') {
                        (orderSelectRef.current as any).showPicker();
                      } else {
                        orderSelectRef.current.focus();
                      }
                    }
                  }, 100);
                }
              );
            }
          }}
          onChange={(e) => setFilters({ order: e.target.value as 'asc' | 'desc' })}
          className="py-1.5 px-2 bg-transparent text-[0.8rem] text-text outline-none focus:text-accent cursor-pointer"
        >
          <option value="desc" className="bg-bg2">↓ Desc</option>
          <option value="asc" className="bg-bg2">↑ Asc</option>
        </select>
      </div>
    </div>
  );
};
