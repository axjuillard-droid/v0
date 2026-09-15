export interface FileRecord {
  id: string;
  nom_fichier: string;
  chemin_complet: string;
  taille: number;
  taille_lisible?: string;
  extension: string;
  date_modification: string;
  date_indexation: string;
  nas_origine: string;
  est_vide: boolean;
  tags?: string[];
  nas?: string;
}

export interface ExtensionStat {
  key: string;
  count: number;
  size: number;
}

export interface NasStat {
  key: string;
  count: number;
  size: number;
}

export interface StatsResponse {
  total_files: number;
  total_size: number;
  empty_files: number;
  top_extensions: ExtensionStat[];
  by_nas: NasStat[];
  latest_file: {
    nom_fichier: string;
    date_modification: string;
    nas?: string;
    nas_origine: string;
  } | null;
}

export interface SearchResult {
  total: number;
  results: FileRecord[];
  from: number;
  size: number;
}

// Interfaces pour les requêtes de recherche et autres onglets à venir...
export interface SearchParams {
  q?: string;
  nas?: string[];
  source?: string[];
  ext?: string[];
  empty?: boolean;
  tags?: string[];
  sort?: string;
  order?: 'asc' | 'desc';
  from?: number;
  size?: number;
  date_mode?: string;
  date_start?: string;
  date_end?: string;
  search_mode?: 'intelligent' | 'stricte';
  search_field?: 'chemin_complet' | 'nom_fichier';
}
