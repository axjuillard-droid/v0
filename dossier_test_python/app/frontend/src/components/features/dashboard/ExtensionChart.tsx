import { useEffect, useState } from 'react';
import { Card } from '../../ui/Card';
import { ExtensionStat } from '../../../types';

const fmt = (n: number) => {
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};

const extIcon = (ext?: string) => {
  const e = ext?.toLowerCase();
  const icons: Record<string, string> = { pdf:'📄', mp4:'🎬', mkv:'🎬', avi:'🎬', mov:'🎬', jpg:'🖼️', jpeg:'🖼️', png:'🖼️', gif:'🖼️', webp:'🖼️', docx:'📝', xlsx:'📊', csv:'📊', zip:'📦', txt:'📋' };
  return icons[e || ''] || '📎';
};

export const ExtensionChart = ({ data }: { data: ExtensionStat[] }) => {
  const maxExt = data[0]?.count || 1;
  const [widths, setWidths] = useState<number[]>([]);

  useEffect(() => {
    // Animation trick for the widths
    setTimeout(() => {
      setWidths(data.map(ext => (ext.count / maxExt) * 100));
    }, 100);
  }, [data, maxExt]);

  return (
    <Card className="p-6">
      <div className="text-sm font-semibold text-text2 uppercase tracking-wider mb-5 flex items-center gap-2">
        📂 Top extensions
      </div>
      <div className="flex flex-col gap-2.5">
        {data.length === 0 && <p className="text-text3 text-sm">Aucune donnée</p>}
        {data.map((ext, idx) => (
          <div key={ext.key || 'sans'}>
            <div className="flex justify-between items-baseline mb-1">
              <span className="text-sm font-jetbrains text-text">
                {extIcon(ext.key)} .{ext.key || '(sans)'}
              </span>
              <span className="text-[0.72rem] text-text3">
                {ext.count.toLocaleString('fr-FR')} fichiers · {fmt(ext.size)}
              </span>
            </div>
            <div className="h-1.5 bg-surface2 rounded-full overflow-hidden">
              <div 
                className="h-full rounded-full bg-gradient-to-r from-accent to-accent2 transition-all duration-700 ease-out"
                style={{ width: `${widths[idx] || 0}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};
