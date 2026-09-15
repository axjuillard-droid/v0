import { SearchBar } from './SearchBar';
import { Filters } from './Filters';
import { ResultsTable } from './ResultsTable';

export const SearchTab = () => {
  return (
    <div data-tour="search-tab-panel" className="animate-in fade-in duration-500">
      <SearchBar />
      <Filters />
      <ResultsTable />
    </div>
  );
};
