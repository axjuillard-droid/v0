import client from './client';

export interface AgePoint {
  date: string;
  group?: string;
  count: number;
  size: number;
}

export interface AgeDistributionResponse {
  modifications: AgePoint[];
  creations: AgePoint[];
}



export const fetchAgeDistribution = async (params?: { group_by?: string; nas?: string[]; source?: string[] }): Promise<AgeDistributionResponse> => {
  const { data } = await client.get('/stats/age-distribution', { params });
  return data;
};
