import { useState, useRef, useEffect } from 'react';
import { useUpdateTags, useTagsList } from '../../../hooks/useSearch';

const PREDEFINED_TAGS = ["à archiver", "projet terminé", "doublon probable", "à vérifier", "important", "temporaire"];

export const tagColor = (tag: string) => {
  let hash = 0;
  for (let i = 0; i < tag.length; i++) hash = (hash * 31 + tag.charCodeAt(i)) & 0xffffffff;
  const h = Math.abs(hash) % 360;
  return `hsl(${h},60%,60%)`;
};

export const TagPill = ({ tag, onRemove }: { tag: string; onRemove?: () => void }) => {
  const color = tagColor(tag);
  const bg = color.replace('60%,60%', '60%,60%').replace('hsl', 'hsla').replace(')', ',0.18)');
  const border = color.replace('60%,60%', '60%,60%').replace('hsl', 'hsla').replace(')', ',0.4)');
  
  return (
    <span 
      className="inline-flex items-center px-1.5 py-[1px] rounded-full text-[0.65rem] font-semibold whitespace-nowrap cursor-default"
      style={{ background: bg, color, border: `1px solid ${border}` }}
    >
      {tag}
      {onRemove && (
        <button onClick={onRemove} className="ml-1 opacity-70 hover:opacity-100 text-[0.7rem] leading-none" title="Retirer">×</button>
      )}
    </span>
  );
};

export const TagEditor = ({ fileId, currentTags, onClose }: { fileId: string; currentTags: string[]; onClose: () => void }) => {
  const [tags, setTags] = useState<string[]>(currentTags || []);
  const [input, setInput] = useState('');
  const { data: serverTags } = useTagsList();
  const { mutateAsync: saveTags } = useUpdateTags();
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  const allTags = Array.from(new Set([...PREDEFINED_TAGS, ...(serverTags || [])]));
  const suggestions = allTags
    .filter(t => !tags.includes(t) && t.toLowerCase().includes(input.toLowerCase()))
    .slice(0, 8);

  const handleAdd = (val: string) => {
    const t = val.trim();
    if (t && !tags.includes(t)) setTags([...tags, t]);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleAdd(input);
    }
  };

  const onSave = async () => {
    await saveTags({ fileId, tags });
    onClose();
  };

  return (
    <div className="absolute z-[9000] bg-bg2 border border-border2 rounded-radius p-3.5 w-[260px] shadow-custom" style={{ top: '100%', marginTop: '8px' }}>
      <h4 className="text-[0.8rem] mb-2.5 text-text2">✏️ Tags</h4>
      <input 
        ref={inputRef}
        type="text" 
        value={input}
        onChange={e => setInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Nouveau tag…" 
        className="w-full px-2.5 py-1.5 bg-bg3 border border-border2 rounded-lg text-text text-[0.82rem] outline-none mb-2 focus:border-accent"
      />
      
      <div className="flex flex-wrap gap-1 mb-2">
        {suggestions.map(t => (
          <span 
            key={t}
            onClick={() => handleAdd(t)}
            className="px-2 py-0.5 rounded-full text-[0.7rem] bg-surface2 text-text2 cursor-pointer border border-border hover:bg-[rgba(108,143,255,0.2)] hover:text-accent hover:border-[rgba(108,143,255,0.4)] transition-colors"
          >
            <TagPill tag={t} />
          </span>
        ))}
      </div>
      
      <div className="text-[0.72rem] text-text3 mb-1.5">Tags actuels :</div>
      <div className="flex flex-wrap gap-1 mb-2.5 min-h-[24px]">
        {tags.length === 0 ? (
          <span className="text-[0.75rem] text-text3">Aucun tag</span>
        ) : (
          tags.map(t => <TagPill key={t} tag={t} onRemove={() => setTags(tags.filter(x => x !== t))} />)
        )}
      </div>
      
      <div className="flex gap-1.5">
        <button onClick={onSave} className="flex-1 px-3 py-1.5 bg-gradient-to-br from-accent to-accent2 text-white rounded text-[0.78rem] font-semibold hover:opacity-85">
          Enregistrer
        </button>
        <button onClick={onClose} className="px-3 py-1.5 bg-surface border border-border2 text-text2 rounded text-[0.78rem] hover:bg-surface2 hover:text-text">
          Annuler
        </button>
      </div>
    </div>
  );
};
