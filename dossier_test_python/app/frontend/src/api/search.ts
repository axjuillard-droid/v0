import client from './client';
import { SearchResult, SearchParams } from '../types';

export const fetchSearch = async (params: SearchParams): Promise<SearchResult> => {
  try {
    const { data } = await client.get('/search', { params });
    if (data && data.results) {
      return data;
    }
    return { total: 0, results: [], from: 0, size: 20 };
  } catch (err) {
    return { total: 0, results: [], from: 0, size: 20 };
  }
};

export interface SourcesResponse {
  sources: string[];
  nas_list: string[];
  label_list: string[];
}

export const fetchSources = async (): Promise<string[]> => {
  try {
    const { data } = await client.get('/sources');
    return data.sources || [];
  } catch (err) {
    return [];
  }
};

export const fetchSourcesLists = async (): Promise<SourcesResponse> => {
  try {
    const { data } = await client.get('/sources');
    if (data && data.nas_list) {
      return data;
    }
    return {
      sources: [],
      nas_list: [],
      label_list: []
    };
  } catch (err) {
    return {
      sources: [],
      nas_list: [],
      label_list: []
    };
  }
};

export const fetchTagsList = async (): Promise<string[]> => {
  try {
    const { data } = await client.get('/tags/list');
    return data.tags || [];
  } catch (err) {
    return [];
  }
};

export const updateTags = async (fileId: string, tags: string[]): Promise<any> => {
  try {
    const { data } = await client.post('/tags', { file_id: fileId, tags });
    return data;
  } catch (err) {
    return { status: 'error' };
  }
};

export interface ExtensionItem {
  ext: string;
  count: number;
}

export const fetchExtensionsList = async (): Promise<ExtensionItem[]> => {
  try {
    const { data } = await client.get('/extensions');
    return data.extensions || [];
  } catch (err) {
    return [];
  }
};
