import client from './client';
import { FileRecord } from '../types';

export const fetchHeaviest = async (n: number, source: string[], nas?: string[]): Promise<FileRecord[]> => {
  const { data } = await client.get('/heaviest', { params: { n, source, nas } });
  return data.results || [];
};
