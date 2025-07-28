import { getToken } from './api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const apiClient = {
  async request(endpoint, { body, signal, ...customConfig } = {}) {
    const token = getToken();
    const sessionToken = localStorage.getItem('session_token');

    const headers = { 'Content-Type': 'application/json' };
    if (token) {
      headers.Authorization = `Bearer ${token}`;
    }
    if (sessionToken) {
      headers['X-Session-Token'] = sessionToken;
    }

    const config = {
      method: body ? 'POST' : 'GET',
      ...customConfig,
      headers: {
        ...headers,
        ...customConfig.headers,
      },
      signal,
    };

    if (body) {
      config.body = JSON.stringify(body);
    }

    const response = await fetch(`${API_BASE}${endpoint}`, config);
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'API request failed');
    }
    return await response.json();
  },

  get(endpoint, customConfig = {}) {
    return this.request(endpoint, { ...customConfig, method: 'GET' });
  },

  post(endpoint, body, customConfig = {}) {
    return this.request(endpoint, { body, ...customConfig, method: 'POST' });
  },

  put(endpoint, body, customConfig = {}) {
    return this.request(endpoint, { body, ...customConfig, method: 'PUT' });
  },

  delete(endpoint, customConfig = {}) {
    return this.request(endpoint, { ...customConfig, method: 'DELETE' });
  },
};

export default apiClient;
