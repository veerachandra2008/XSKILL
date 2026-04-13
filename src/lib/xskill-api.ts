const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.trim() || '';
const DIRECT_API_BASE_URL = API_BASE_URL || 'http://127.0.0.1:5001';

export function getApiBaseUrl() {
  return DIRECT_API_BASE_URL;
}

export function buildApiUrl(path: string) {
  return API_BASE_URL ? `${API_BASE_URL}${path}` : path;
}

export function getToken() {
  if (typeof window === 'undefined') {
    return null;
  }

  return localStorage.getItem('token');
}

export function createAuthHeaders(includeJson = true) {
  const headers: HeadersInit = {};
  const token = getToken();

  if (includeJson) {
    headers['Content-Type'] = 'application/json';
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  return headers;
}
