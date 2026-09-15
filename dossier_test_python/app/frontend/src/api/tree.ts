import client from './client';

export interface TreeItem {
  id?: string;
  name: string;
  path: string;
  type: 'folder' | 'file';
  size?: number;
  extension?: string;
  date_modification?: string;
  tags?: string[];
  est_vide?: boolean;
  date_indexation?: string;
  nas_origine?: string;
  sourceLabel?: string;
  nas?: string;
  proprietaire?: string;
}

export interface TreeResponse {
  path: string;
  parent: string | null;
  children: TreeItem[];
}

export const fetchTreeContents = async (
  nas: string = 'PIQUE-NIQUE',
  path?: string,
  source?: string
): Promise<TreeResponse> => {
  const currentPath = path || "";
  try {
    const { data } = await client.get('/tree', {
      params: { nas, path, source }
    });
    if (data && data.children) {
      return data;
    }
    return {
      path: currentPath,
      parent: null,
      children: []
    };
  } catch (err) {
    return {
      path: currentPath,
      parent: null,
      children: []
    };
  }
};
