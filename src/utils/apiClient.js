import { auth } from '../firebase/config';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

/**
 * Wrapper around fetch that automatically attaches the Firebase ID token
 * as an Authorization header for backend API requests.
 */
export async function authFetch(url, options = {}) {
  const token = await auth.currentUser?.getIdToken();

  const headers = {
    ...(options.headers || {}),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const fullUrl = url.startsWith('http') ? url : `${API_BASE_URL}${url}`;

  return fetch(fullUrl, {
    ...options,
    headers,
  });
}

export { API_BASE_URL };
