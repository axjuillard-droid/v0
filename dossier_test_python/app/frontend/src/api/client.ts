// Remplacement d'Axios par l'API native fetch du navigateur

interface RequestConfig {
  params?: Record<string, any>;
  headers?: Record<string, string>;
  timeout?: number;
}

// Calcul dynamique de la racine API pour supporter tout déploiement en sous-dossier / reverse-proxy (ex: /applications/catalogue/)
export const getApiPrefix = (): string => {
  // Utilise l'URL relative au chemin actuel du navigateur (sans couper les sous-dossiers de reverse-proxy)
  const path = window.location.pathname;
  // Si le path finit par une page HTML ou sous-route, on garde le dossier parent
  const baseFolder = path.substring(0, path.lastIndexOf('/') + 1) || '/';
  // Ex: si baseFolder est '/applications/catalogue/', retourne '/applications/catalogue/api'
  // si baseFolder est '/', retourne '/api'
  const prefix = baseFolder.endsWith('/') ? baseFolder + 'api' : baseFolder + '/api';
  return prefix.replace(/\/+/g, '/'); // Évite les doubles slashes //
};

const buildUrl = (url: string, params?: Record<string, any>): string => {
  const endpoint = url.startsWith('/') ? url : '/' + url;
  let fullUrl = getApiPrefix() + endpoint;
  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, val]) => {
      if (val !== undefined && val !== null) {
        if (Array.isArray(val)) {
          val.forEach(v => searchParams.append(key, v));
        } else {
          searchParams.append(key, val.toString());
        }
      }
    });
    const qs = searchParams.toString();
    if (qs) {
      fullUrl += '?' + qs;
    }
  }
  return fullUrl;
};

const handleResponse = async (response: Response) => {
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch (e) {
      errorData = { error: response.statusText };
    }
    
    // Détecter si la base de données est déconnectée ou inaccessible
    if (
      errorData.error && (
        errorData.error.includes("Aucune URL de base de données") ||
        errorData.error.includes("connection to server") ||
        errorData.error.includes("Connection refused") ||
        errorData.error.includes("connexion impossible")
      )
    ) {
      window.dispatchEvent(new Event('db-disconnected'));
    }
    
    // Mimique le comportement d'Axios pour la gestion des erreurs
    const error = new Error(errorData.error || 'Request failed');
    (error as any).response = {
      status: response.status,
      data: errorData
    };
    throw error;
  }
  
  const data = await response.json();
  return { data };
};

const fetchWithTimeout = async (url: string, options: RequestInit, timeoutMs: number = 10000): Promise<Response> => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal
    });
    clearTimeout(id);
    window.dispatchEvent(new Event('server-connected'));
    return response;
  } catch (error) {
    clearTimeout(id);
    window.dispatchEvent(new Event('server-disconnected'));
    throw error;
  }
};

let activeRequestsCount = 0;

const notifyRequestStart = () => {
  activeRequestsCount++;
  window.dispatchEvent(new CustomEvent('api-request-change', { detail: { activeCount: activeRequestsCount, loading: true } }));
};

const notifyRequestEnd = () => {
  activeRequestsCount = Math.max(0, activeRequestsCount - 1);
  window.dispatchEvent(new CustomEvent('api-request-change', { detail: { activeCount: activeRequestsCount, loading: activeRequestsCount > 0 } }));
};

const client = {
  async get(url: string, config?: RequestConfig) {
    const fullUrl = buildUrl(url, config?.params);
    const headers = { ...config?.headers };
    
    notifyRequestStart();
    try {
      const response = await fetchWithTimeout(fullUrl, {
        method: 'GET',
        headers
      }, config?.timeout);
      
      return await handleResponse(response);
    } finally {
      notifyRequestEnd();
    }
  },

  async post(url: string, data?: any, config?: RequestConfig) {
    const endpoint = url.startsWith('/') ? url : '/' + url;
    const fullUrl = getApiPrefix() + endpoint;
    const headers = { ...config?.headers };
    
    let body: any;
    if (data instanceof FormData) {
      // Pour le FormData, le navigateur définit lui-même le Content-Type avec le boundary
      body = data;
    } else {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(data);
    }

    notifyRequestStart();
    try {
      const response = await fetchWithTimeout(fullUrl, {
        method: 'POST',
        headers,
        body
      }, config?.timeout);
      
      return await handleResponse(response);
    } finally {
      notifyRequestEnd();
    }
  }
};

export default client;
