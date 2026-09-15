import React, { createContext, useContext, useState, useEffect } from 'react';
import { SearchParams, FileRecord } from '../types';

interface SearchState extends SearchParams {
  locateFile: FileRecord | null;
  setLocateFile: (file: FileRecord | null) => void;
  currentTab: string;
  setCurrentTab: (tab: string) => void;
  hasPerformedSearch: boolean;
  setHasPerformedSearch: (val: boolean) => void;
  setQuery: (q: string) => void;
  setFilters: (filters: Partial<SearchParams>) => void;
  setPage: (page: number) => void;
  setSearchMode: (mode: 'intelligent' | 'stricte') => void;
  setSearchField: (field: 'chemin_complet' | 'nom_fichier') => void;
  toggleTag: (tag: string) => void;
  toggleNas: (nas: string) => void;
  toggleSource: (source: string) => void;
  toggleExtension: (ext: string) => void;
  reset: () => void;
}

const initialState: SearchParams = {
  q: '',
  nas: [],
  source: [],
  ext: [],
  empty: false,
  tags: [],
  sort: 'date_modification',
  order: 'desc',
  from: 0,
  size: 20,
  date_mode: '',
  date_start: '',
  date_end: '',
  search_mode: 'intelligent',
  search_field: 'chemin_complet'
};

const SearchContext = createContext<SearchState | undefined>(undefined);

export const SearchProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<SearchParams>(initialState);
  const [locateFile, setLocateFile] = useState<FileRecord | null>(null);
  const [currentTab, setCurrentTab] = useState('search');
  const [hasPerformedSearch, setHasPerformedSearch] = useState(false);

  useEffect(() => {
    const hasFilters = 
      (state.nas && state.nas.length > 0) ||
      (state.source && state.source.length > 0) ||
      (state.ext && state.ext.length > 0) ||
      (state.tags && state.tags.length > 0) ||
      !!state.date_mode;

    const sortTouched = 
      state.sort !== 'date_modification' || 
      state.order !== 'desc';

    const emptyTouched = state.empty === true;

    const pageTouched = (state.from || 0) > 0;
      
    if (!state.q && !hasFilters && !sortTouched && !emptyTouched && !pageTouched) {
      setHasPerformedSearch(false);
    } else {
      setHasPerformedSearch(true);
    }
  }, [
    state.q, 
    state.nas?.length, 
    state.source?.length, 
    state.ext?.length, 
    state.tags?.length, 
    state.date_mode, 
    state.sort, 
    state.order, 
    state.empty,
    state.from
  ]);

  const setQuery = (q: string) => {
    setState((prev) => ({ ...prev, q, from: 0 }));
  };

  const setFilters = (filters: Partial<SearchParams>) => {
    setState((prev) => ({ ...prev, ...filters, from: 0 }));
  };

  const setPage = (page: number) => {
    setState((prev) => ({ ...prev, from: page * (prev.size || 20) }));
  };

  const setSearchMode = (mode: 'intelligent' | 'stricte') => {
    setState((prev) => ({ ...prev, search_mode: mode, from: 0 }));
  };

  const setSearchField = (field: 'chemin_complet' | 'nom_fichier') => {
    setState((prev) => ({ ...prev, search_field: field, from: 0 }));
  };

  const toggleTag = (tag: string) => {
    setState((prev) => {
      const tags = prev.tags || [];
      if (tags.includes(tag)) {
        return { ...prev, tags: tags.filter(t => t !== tag), from: 0 };
      }
      return { ...prev, tags: [...tags, tag], from: 0 };
    });
  };

  const toggleNas = (n: string) => {
    setState((prev) => {
      const nas = prev.nas || [];
      if (nas.includes(n)) {
        return { ...prev, nas: nas.filter(x => x !== n), from: 0 };
      }
      return { ...prev, nas: [...nas, n], from: 0 };
    });
  };

  const toggleSource = (src: string) => {
    setState((prev) => {
      const source = prev.source || [];
      if (source.includes(src)) {
        return { ...prev, source: source.filter(s => s !== src), from: 0 };
      }
      return { ...prev, source: [...source, src], from: 0 };
    });
  };

  const toggleExtension = (extension: string) => {
    setState((prev) => {
      const ext = prev.ext || [];
      const formatted = extension.toLowerCase().replace(/^\./, '');
      if (ext.includes(formatted)) {
        return { ...prev, ext: ext.filter(e => e !== formatted), from: 0 };
      }
      return { ...prev, ext: [...ext, formatted], from: 0 };
    });
  };

  const reset = () => {
    setState(initialState);
  };

  return (
    <SearchContext.Provider value={{
      ...state,
      locateFile,
      setLocateFile,
      currentTab,
      setCurrentTab,
      hasPerformedSearch,
      setHasPerformedSearch,
      setQuery,
      setFilters,
      setPage,
      setSearchMode,
      setSearchField,
      toggleTag,
      toggleNas,
      toggleSource,
      toggleExtension,
      reset
    }}>
      {children}
    </SearchContext.Provider>
  );
};

export function useSearchStore<T = SearchState>(selector?: (state: SearchState) => T): T {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearchStore must be used within a SearchProvider');
  }
  return selector ? selector(context) : (context as unknown as T);
}
