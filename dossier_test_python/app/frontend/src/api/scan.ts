import client from './client';

export interface ScanStatusResponse {
  status: 'idle' | 'running' | 'success' | 'error';
  progress: string;
  scanned_files: number;
  last_run: string | null;
  error: string | null;
}

export const fetchScanStatus = async (): Promise<ScanStatusResponse> => {
  const { data } = await client.get('/scan/status');
  return data;
};

export interface NasLockStatus {
  locked: boolean;
  nas: string;
  label?: string;
  debut?: string;
  fichiers?: number;
  message?: string;
}

/** Vérifie si un NAS est actuellement en cours de scan par une autre session. */
export const fetchLockStatus = async (nas: string): Promise<NasLockStatus> => {
  const { data } = await client.get('/scan/lock-status', { params: { nas } });
  return data;
};

export const fetchSourcesDetails = async (): Promise<any[]> => {
  const { data } = await client.get('/sources/details');
  return data.sources || [];
};



export const uploadExternalScan = async (payload: {
  nas: string;
  label: string;
  scanned_root_path: string;
  outil_source?: string;
  is_first_chunk?: boolean;
  is_last_chunk?: boolean;
  files: any[];
}): Promise<{ ok: boolean; message: string; result?: any }> => {
  const { data } = await client.post('/scan/external-upload', payload, { timeout: 600000 });
  return data;
};

