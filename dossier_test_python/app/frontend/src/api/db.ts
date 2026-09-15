import client from './client';

export interface DBStatusResponse {
  connected: boolean;
  url?: string;
  error?: string;
  message?: string;
}

export const fetchDBStatus = async (): Promise<DBStatusResponse> => {
  const { data } = await client.get('/db/status');
  return data;
};

export const connectDB = async (url: string): Promise<any> => {
  const { data } = await client.post('/db/connect', { url });
  return data;
};
