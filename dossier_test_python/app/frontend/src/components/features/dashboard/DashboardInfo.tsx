import { useStats } from '../../../hooks/useStats';
import { Spinner } from '../../ui/Spinner';
import { StatsCards } from './StatsCards';
import { ExtensionChart } from './ExtensionChart';
import { NasDistribution } from './NasDistribution';

export const DashboardInfo = () => {
  const { data, isLoading, error } = useStats();

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="w-8 h-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="text-center p-16 text-text3">
        <div className="text-5xl mb-4">⚡</div>
        <h3 className="text-danger font-semibold text-base mb-2">Impossible de charger les statistiques</h3>
        <p className="text-sm max-w-[360px] mx-auto">{error?.message || 'Erreur inconnue'}</p>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in duration-500">
      <StatsCards data={data} />
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        <ExtensionChart data={data.top_extensions} />
        <NasDistribution data={data.by_nas} />
      </div>
    </div>
  );
};
