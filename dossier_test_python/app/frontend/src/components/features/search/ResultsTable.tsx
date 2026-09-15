import { useSearch } from '../../../hooks/useSearch';
import { useSearchStore } from '../../../store/searchStore';
import { FileRow } from './FileRow';

export const ResultsTable = () => {
  const { data, isLoading, isError } = useSearch();
  const { from, size, setPage, hasPerformedSearch } = useSearchStore();

  if (!hasPerformedSearch) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center py-24 text-text3">
        <div className="animate-[spin_1s_linear_infinite] text-4xl">⟳</div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="text-center p-16 text-text3">
        <div className="text-5xl mb-4">⚡</div>
        <h3 className="text-danger font-semibold text-base mb-2">Erreur de recherche</h3>
      </div>
    );
  }

  if (!data?.results?.length) {
    return (
      <div className="text-center p-16 text-text3">
        <div className="text-5xl mb-4">🔭</div>
        <h3 className="text-text2 font-semibold text-base mb-2">Aucun résultat</h3>
        <p className="text-sm">Essayez d'autres mots-clés ou de réinitialiser les filtres.</p>
      </div>
    );
  }

  const currentPage = Math.floor((from || 0) / (size || 20));
  const pages = Math.ceil(data.total / (size || 20));

  const renderPagination = () => {
    if (pages <= 1) return null;
    
    let start = Math.max(0, currentPage - 3);
    let end = Math.min(pages - 1, start + 6);
    start = Math.max(0, end - 6);

    const buttons = [];
    if (start > 0) {
      buttons.push(
        <button key="first" onClick={() => setPage(0)} className="w-9 h-9 rounded-lg border border-border2 bg-transparent text-text2 text-[0.85rem] hover:bg-surface2 transition-colors flex items-center justify-center">1</button>
      );
      buttons.push(<span key="dots1" className="text-text3 px-1">…</span>);
    }

    for (let i = start; i <= end; i++) {
      buttons.push(
        <button 
          key={i} 
          onClick={() => setPage(i)} 
          className={`w-9 h-9 rounded-lg border flex items-center justify-center text-[0.85rem] transition-colors ${
            i === currentPage 
              ? "bg-gradient-to-br from-accent to-accent2 border-transparent text-white font-bold" 
              : "border-border2 bg-transparent text-text2 hover:bg-surface2 hover:text-text"
          }`}
        >
          {i + 1}
        </button>
      );
    }

    if (end < pages - 1) {
      buttons.push(<span key="dots2" className="text-text3 px-1">…</span>);
      buttons.push(
        <button key="last" onClick={() => setPage(pages - 1)} className="w-9 h-9 rounded-lg border border-border2 bg-transparent text-text2 text-[0.85rem] hover:bg-surface2 transition-colors flex items-center justify-center">{pages}</button>
      );
    }

    return (
      <div className="flex items-center justify-center gap-1.5 py-6">
        <button disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-border2 text-text2 hover:bg-surface2 disabled:opacity-35 disabled:cursor-not-allowed">‹</button>
        {buttons}
        <button disabled={currentPage >= pages - 1} onClick={() => setPage(currentPage + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-border2 text-text2 hover:bg-surface2 disabled:opacity-35 disabled:cursor-not-allowed">›</button>
      </div>
    );
  };

  const startDoc = (from || 0) + 1;
  const endDoc = Math.min((from || 0) + (size || 20), data.total);

  return (
    <div data-tour="search-results-area">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2 px-1">
        <div className="text-[0.85rem] text-text3">
          <strong className="text-text">{data.total?.toLocaleString('fr-FR')}</strong> résultat{data.total > 1 ? 's' : ''} · affichage {startDoc}–{endDoc}
        </div>
      </div>

      <div className="overflow-x-auto rounded-[20px] border border-border">
        <table className="w-full border-collapse text-[0.85rem] text-left">
          <thead>
            <tr>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap">Nom</th>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap">Chemin</th>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap">Ext.</th>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap">Taille</th>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap">Modifié</th>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap">Source</th>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap">Tags</th>
              <th className="py-3.5 px-4 text-[0.72rem] font-semibold uppercase tracking-wider text-text3 bg-bg3 border-b border-border whitespace-nowrap"></th>
            </tr>
          </thead>
          <tbody>
            {data.results.map((file: any) => (
              <FileRow key={file.id} file={file} />
            ))}
          </tbody>
        </table>
      </div>

      {renderPagination()}
    </div>
  );
};
