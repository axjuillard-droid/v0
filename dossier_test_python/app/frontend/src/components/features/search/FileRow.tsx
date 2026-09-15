import { useState } from 'react';
import { FileRecord } from '../../../types';
import { TagPill, TagEditor } from './TagEditor';
import { Copy, File, FileText, Image, Video, Table, Archive, Code2, Music, Folder } from '../../common/Icons';
import { useSearchStore } from '../../../store/searchStore';
import { useGuide } from '../../../context/GuideContext';
import { executeWithDemoExplanation } from '../../../utils/demoExplanation';
import { DEMO_EXPLANATIONS } from '../../../utils/demoExplanationsData';

const fmtDate = (d?: string) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' });
};

// Fallback client-side — utilisé uniquement si taille_lisible n'est pas encore en base
const fmtSize = (n?: number) => {
  if (!n) return '—';
  if (n >= 1e12) return (n / 1e12).toFixed(2) + ' To';
  if (n >= 1e9) return (n / 1e9).toFixed(2) + ' Go';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + ' Mo';
  if (n >= 1e3) return (n / 1e3).toFixed(0) + ' Ko';
  return n + ' o';
};

const displaySize = (file: FileRecord) => file.taille_lisible || fmtSize(file.taille);

const getFileIcon = (ext?: string) => {
  const e = (ext || '').toLowerCase().replace(/^\./, '');
  const props = { className: "w-4 h-4", strokeWidth: 1.5 };
  if (['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp'].includes(e)) return <Image {...props} className="text-accent" />;
  if (e === 'pdf') return <FileText {...props} className="text-danger" />;
  if (['mp4', 'avi', 'mkv', 'mov', 'wmv'].includes(e)) return <Video {...props} className="text-purple-400" />;
  if (['xls', 'xlsx', 'csv'].includes(e)) return <Table {...props} className="text-green-400" />;
  if (['doc', 'docx'].includes(e)) return <FileText {...props} className="text-blue-400" />;
  if (['zip', 'rar', '7z', 'tar', 'gz'].includes(e)) return <Archive {...props} className="text-yellow-400" />;
  if (['js', 'ts', 'tsx', 'jsx', 'py', 'html', 'css', 'json', 'yml', 'yaml', 'sql'].includes(e)) return <Code2 {...props} className="text-text3" />;
  if (['mp3', 'wav', 'flac'].includes(e)) return <Music {...props} className="text-pink-400" />;
  return <File {...props} className="text-text3" />;
};

export const FileRow = ({ file }: { file: FileRecord }) => {
  const { isDemoMode } = useGuide();
  const [editorOpen, setEditorOpen] = useState(false);
  const [isNameExpanded, setIsNameExpanded] = useState(false);
  const [isPathExpanded, setIsPathExpanded] = useState(false);
  const store = useSearchStore();
  const q = store.q || '';
  const search_mode = store.search_mode || 'intelligent';
  const { setLocateFile, setCurrentTab } = store;

  const matchAllWords = (text: string, search: string) => {
    const words = search.split(/\s+/).filter(Boolean);
    if (words.length === 0) return false;
    return words.every(w => text.toLowerCase().includes(w.toLowerCase()));
  };

  const showExpandedName = isNameExpanded || (q && (
    search_mode === 'stricte' 
      ? file.nom_fichier.toLowerCase().includes(q.toLowerCase()) 
      : matchAllWords(file.nom_fichier, q)
  ));
  const showExpandedPath = isPathExpanded || (q && (
    search_mode === 'stricte' 
      ? file.chemin_complet.toLowerCase().includes(q.toLowerCase()) 
      : matchAllWords(file.chemin_complet, q)
  ));

  const highlightText = (text: string, search: string) => {
    if (!search) return <span>{text}</span>;

    if (search_mode === 'stricte') {
      const escapedSearch = search.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');
      const parts = text.split(new RegExp(`(${escapedSearch})`, 'gi'));
      return (
        <span>
          {parts.map((part, i) => 
            part.toLowerCase() === search.toLowerCase() 
              ? <mark key={i} className="bg-accent/20 text-accent border border-accent/30 font-bold px-1 rounded-sm">{part}</mark> 
              : part
          )}
        </span>
      );
    } else {
      const words = search.split(/\s+/).filter(Boolean);
      if (words.length === 0) return <span>{text}</span>;

      const escapedWords = words.map(w => w.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&'));
      const regex = new RegExp(`(${escapedWords.join('|')})`, 'gi');
      const parts = text.split(regex);

      const highlightColors = [
        "bg-amber-500/20 text-amber-300 border border-amber-500/30",
        "bg-cyan-500/20 text-cyan-300 border border-cyan-500/30",
        "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30",
        "bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30",
        "bg-orange-500/20 text-orange-300 border border-orange-500/30"
      ];

      return (
        <span>
          {parts.map((part, i) => {
            const lowerPart = part.toLowerCase();
            const wordIndex = words.findIndex(w => w.toLowerCase() === lowerPart);
            if (wordIndex !== -1) {
              const colorClass = highlightColors[wordIndex % highlightColors.length];
              return (
                <mark key={i} className={`${colorClass} font-semibold px-1 py-0.5 mx-0.5 rounded-md`}>
                  {part}
                </mark>
              );
            }
            return part;
          })}
        </span>
      );
    }
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(file.chemin_complet || '');
  };

  return (
    <tr className="border-b border-border hover:bg-surface transition-colors group">
      <td className="py-3.5 px-3">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded bg-surface2 border border-border/50 shrink-0">
            {getFileIcon(file.extension)}
          </div>
          <span 
            onClick={() => setIsNameExpanded(!isNameExpanded)}
            className={`font-medium cursor-pointer transition-all hover:text-accent ${showExpandedName ? 'break-all' : 'truncate max-w-[240px] block'} text-[0.85rem]`}
            title={showExpandedName ? "Cliquez pour réduire" : file.nom_fichier}
          >
            {highlightText(file.nom_fichier, q)}
          </span>
        </div>
      </td>

      <td className="py-3.5 px-3">
        <div className="flex items-center gap-2">
          <span 
            onClick={() => setIsPathExpanded(!isPathExpanded)}
            className={`cursor-pointer transition-all hover:text-text2 font-jetbrains ${showExpandedPath ? 'break-all' : 'truncate max-w-[320px] block'} text-[0.78rem] text-text3`}
            title={showExpandedPath ? "Cliquez pour réduire" : file.chemin_complet}
          >
            {highlightText(file.chemin_complet, q)}
          </span>
          <button onClick={handleCopy} className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-surface2 text-text3 hover:text-text transition-all" title="Copier le chemin">
            <Copy className="w-3.5 h-3.5" />
          </button>
          <button 
            data-tour="btn-locate-in-tree"
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.locateInTree(file.nom_fichier),
                () => {
                  setLocateFile(file);
                  setCurrentTab('tree');
                }
              )
            }
            className="p-1 rounded hover:bg-surface2 text-accent hover:text-text transition-all ml-0.5 cursor-pointer" 
            title="Localiser dans l'arborescence"
          >
            <Folder className="w-4 h-4 text-accent" />
          </button>
        </div>
      </td>
      <td className="py-3.5 px-3">
        {file.extension ? <span className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold font-jetbrains bg-[rgba(108,143,255,0.15)] text-accent uppercase tracking-wider">{file.extension}</span> : '—'}
      </td>
      <td className="py-3.5 px-3 whitespace-nowrap text-[0.85rem] font-medium">{displaySize(file)}</td>
      <td className="py-3.5 px-3 whitespace-nowrap text-[0.85rem]">{fmtDate(file.date_modification)}</td>
      <td className="py-3.5 px-3">
        <span className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] font-semibold bg-[rgba(167,139,250,0.15)] text-accent2 whitespace-nowrap">
          {file.nas ? `${file.nas} / ` : ''}{file.nas_origine || '?'}
        </span>
      </td>
      <td className="py-3.5 px-3 relative">
        <div className="flex flex-wrap gap-1 items-center">
          {file.tags?.map(t => <TagPill key={t} tag={t} />)}
          <button 
            onClick={() =>
              executeWithDemoExplanation(
                isDemoMode,
                DEMO_EXPLANATIONS.editFileTags(file.nom_fichier),
                () => setEditorOpen(true)
              )
            }
            className="px-1.5 py-0.5 rounded-full border border-dashed border-border2 text-text3 text-[0.65rem] hover:text-accent hover:border-accent transition-colors cursor-pointer" 
            title="Modifier les tags"
          >
            ＋
          </button>
        </div>
        {editorOpen && <TagEditor fileId={file.id} currentTags={file.tags || []} onClose={() => setEditorOpen(false)} />}
      </td>
      <td className="py-3.5 px-3">
        {file.est_vide && <span className="inline-block px-2 py-0.5 rounded-full text-[0.68rem] bg-danger/15 text-danger">Vide</span>}
      </td>
    </tr>
  );
};
