import client from './client';

export interface CleanupScanParams {
  years: number;
  nas?: string[];
  labels?: string[];
}

export const fetchCleanupScan = async (params: CleanupScanParams): Promise<any> => {
  const { data } = await client.post('/cleanup/scan', params);
  return data;
};

