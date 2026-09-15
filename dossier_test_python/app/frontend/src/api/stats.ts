import client from './client';
import { StatsResponse } from '../types';

export const fetchStats = async (): Promise<StatsResponse> => {
  const { data } = await client.get('/stats');
  return data;
};
