import { Card } from '../../ui/Card';
import { Folder, Database, FileWarning, Search } from '../../common/Icons';
import { StatsResponse } from '../../../types';

const fmt = (n?: number | null) => {
  if (n === undefined || n === null || isNaN(n)) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};

const fmtNum = (n?: number | null) => {
  if (n === undefined || n === null || isNaN(n)) return '—';
  return n.toLocaleString('fr-FR');
};

export const StatsCards = ({ data }: { data: StatsResponse }) => {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
      <Card className="p-5">
        <div className="text-xs text-text3 uppercase tracking-widest mb-2 font-medium">Total fichiers</div>
        <div className="text-3xl font-bold tracking-tight">{fmtNum(data.total_files)}</div>
        <Folder className="absolute top-4 right-4 w-6 h-6 text-text opacity-25" />
      </Card>
      
      <Card className="p-5">
        <div className="text-xs text-text3 uppercase tracking-widest mb-2 font-medium">Volume total</div>
        <div className="text-3xl font-bold tracking-tight">{fmt(data.total_size)}</div>
        <Database className="absolute top-4 right-4 w-6 h-6 text-text opacity-25" />
      </Card>

      <Card className="p-5">
        <div className="text-xs text-text3 uppercase tracking-widest mb-2 font-medium">Fichiers vides</div>
        <div className="text-3xl font-bold tracking-tight text-warn">{fmtNum(data.empty_files)}</div>
        {data.total_files > 0 && (
          <div className="text-xs text-text3 mt-1">
            {((data.empty_files / data.total_files) * 100).toFixed(1)}% du total
          </div>
        )}
        <FileWarning className="absolute top-4 right-4 w-6 h-6 text-text opacity-25" />
      </Card>

      <Card className="p-5">
        <div className="text-xs text-text3 uppercase tracking-widest mb-2 font-medium">Sources</div>
        <div className="text-3xl font-bold tracking-tight">{data.by_nas.length}</div>
        <Search className="absolute top-4 right-4 w-6 h-6 text-text opacity-25" />
      </Card>
    </div>
  );
};
