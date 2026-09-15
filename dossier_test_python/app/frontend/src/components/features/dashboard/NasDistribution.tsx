import { useEffect, useState } from 'react';
import { Card } from '../../ui/Card';
import { NasStat } from '../../../types';

const fmt = (n: number) => {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};

export const NasDistribution = ({ data }: { data: NasStat[] }) => {
  const maxNas = data[0]?.count || 1;
  const [widths, setWidths] = useState<number[]>([]);

  useEffect(() => {
    setTimeout(() => {
      setWidths(data.map(nas => (nas.count / maxNas) * 100));
    }, 100);
  }, [data, maxNas]);

  return (
    <Card className="p-6">
      <div className="text-sm font-semibold text-text2 uppercase tracking-wider mb-5 flex items-center gap-2">
        📁 Répartition par Source
      </div>
      <div className="flex flex-col gap-2.5">
        {data.length === 0 && <p className="text-text3 text-sm">Aucune donnée</p>}
        {data.map((nas, idx) => (
          <div key={nas.key}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-jetbrains text-text">
                📁 {nas.key}
              </span>
              <span className="text-[0.72rem] text-text3">
                {nas.count.toLocaleString('fr-FR')} fichiers · {fmt(nas.size)}
              </span>
            </div>
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-accent2 to-pink-500 transition-all duration-700 ease-out"
                style={{ width: `${widths[idx] || 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
