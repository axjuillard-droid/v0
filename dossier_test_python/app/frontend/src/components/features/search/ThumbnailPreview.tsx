import { useState, useRef, useEffect } from 'react';
import { ImageIcon, FileText, Video, Table, FileType, Archive, Code2, Music, File, Loader2 } from '../../common/Icons';
import { cn as clsx } from '../../ui/Card';

interface ThumbnailPreviewProps {
  filePath: string;
  extension: string;
}

const SUPPORTED_IMAGES = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.tiff'];
const SUPPORTED_PDFS = ['.pdf'];
const SUPPORTED_VIDEOS = ['.mp4', '.avi', '.mkv', '.mov', '.wmv'];

export const ThumbnailPreview = ({ filePath, extension }: ThumbnailPreviewProps) => {
  const [isHovered, setIsHovered] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0, showUp: false });
  const containerRef = useRef<HTMLDivElement>(null);

  const ext = (extension || '').toLowerCase();
  if (!ext.startsWith('.')) {
    // Handling cases where extension might not have a dot
    var extWithDot = '.' + ext;
  } else {
    var extWithDot = ext;
  }

  const isThumbnailPossible = 
    SUPPORTED_IMAGES.includes(extWithDot) || 
    SUPPORTED_PDFS.includes(extWithDot) || 
    SUPPORTED_VIDEOS.includes(extWithDot);

  const getFallbackIcon = (size: number = 20) => {
    const props = { className: `w-${size/4} h-${size/4}`, strokeWidth: 1.5 };
    if (SUPPORTED_IMAGES.includes(extWithDot)) return <ImageIcon {...props} className={clsx(props.className, "text-accent")} />;
    if (SUPPORTED_PDFS.includes(extWithDot)) return <FileText {...props} className={clsx(props.className, "text-danger")} />;
    if (SUPPORTED_VIDEOS.includes(extWithDot)) return <Video {...props} className={clsx(props.className, "text-purple-400")} />;
    if (['.xls', '.xlsx', '.csv'].includes(extWithDot)) return <Table {...props} className={clsx(props.className, "text-green-400")} />;
    if (['.doc', '.docx'].includes(extWithDot)) return <FileType {...props} className={clsx(props.className, "text-blue-400")} />;
    if (['.zip', '.rar', '.7z', '.tar', '.gz'].includes(extWithDot)) return <Archive {...props} className={clsx(props.className, "text-yellow-400")} />;
    if (['.js', '.ts', '.py', '.html', '.css', '.json', '.yml', '.yaml'].includes(extWithDot)) return <Code2 {...props} className={clsx(props.className, "text-text3")} />;
    if (['.mp3', '.wav', '.flac'].includes(extWithDot)) return <Music {...props} className={clsx(props.className, "text-pink-400")} />;
    return <File {...props} className={clsx(props.className, "text-text3")} />;
  };

  useEffect(() => {
    if (isHovered && containerRef.current) {
      const rect = containerRef.current.getBoundingClientRect();
      const spaceAbove = rect.top;
      const spaceRight = window.innerWidth - rect.right;
      
      let top = rect.top + (rect.height / 2) - 100;
      let left = rect.right + 10;
      
      // Ajustement intelligent si ça dépasse en bas ou en haut
      if (top < 10) top = 10;
      if (top + 200 > window.innerHeight - 10) top = window.innerHeight - 210;

      // Si pas de place à droite, on met à gauche
      if (spaceRight < 220 && spaceAbove > 220) {
          left = rect.left - 210;
      }

      setPopoverPos({ top, left, showUp: false });
    }
  }, [isHovered]);

  const thumbnailUrl = `/api/thumbnail?path=${encodeURIComponent(filePath)}`;

  return (
    <div 
      ref={containerRef}
      className="relative flex items-center justify-center w-6 h-6 rounded bg-surface2 border border-border/50 overflow-hidden cursor-help"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setIsLoading(true); // Reset for next hover
        setError(false);
      }}
    >
      <div className="opacity-70 group-hover:opacity-100 transition-opacity">
        {getFallbackIcon(16)}
      </div>

      {isHovered && isThumbnailPossible && (
        <div 
          className="fixed z-[9999] w-[200px] h-[200px] bg-surface/95 border border-border shadow-2xl rounded-lg overflow-hidden glass flex items-center justify-center p-1 animate-in fade-in zoom-in-95 duration-200 pointer-events-none"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
           {isLoading && !error && (
             <div className="absolute inset-0 flex items-center justify-center bg-surface/30 backdrop-blur-sm">
               <Loader2 className="w-6 h-6 text-accent animate-spin" />
             </div>
           )}
           {error ? (
              <div className="flex flex-col items-center gap-2 text-text3">
                {getFallbackIcon(32)}
                <span className="text-[0.6rem] uppercase font-bold tracking-tighter opacity-50">Aperçu indisponible</span>
              </div>
           ) : (
             <img 
               src={thumbnailUrl} 
               alt="Thumbnail"
               className={clsx("w-full h-full object-contain transition-opacity duration-300", isLoading ? "opacity-0" : "opacity-100")}
               onLoad={() => setIsLoading(false)}
               onError={() => {
                 setIsLoading(false);
                 setError(true);
               }}
             />
           )}
        </div>
      )}
    </div>
  );
};
