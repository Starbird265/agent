export const API_BASE =
  import.meta.env.VITE_API_URL || 'http://localhost:8000';

// Token management
export function getToken() {
  return localStorage.getItem('access_token');
}

export function setToken(token) {
  localStorage.setItem('access_token', token);
}

export function removeToken() {
  localStorage.removeItem('access_token');
}

// Authentication headers
function getAuthHeaders() {
  const token = getToken();
  const sessionToken = localStorage.getItem('session_token');
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(sessionToken ? { 'X-Session-Token': sessionToken } : {})
  };
}

export async function pingServer() {
  try {
    const res = await fetch(`${API_BASE}/`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data.status;
  } catch (err) {
    console.error('pingServer error:', err);
    return 'Service Unavailable';
  }
}

// Authentication functions
export async function login(username, password) {
  try {
    const formData = new FormData();
    formData.append('username', username);
    formData.append('password', password);
    
    const res = await fetch(`${API_BASE}/auth/token`, {
      method: 'POST',
      body: formData
    });
    
    if (!res.ok) {
      throw new Error('Login failed');
    }
    
    const data = await res.json();
    setToken(data.access_token);
    return { success: true, user: data };
  } catch (err) {
    console.error('Login error:', err);
    return { success: false, error: err.message };
  }
}

export async function register(username, email, password, fullName = '') {
  try {
    const res = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        username, 
        email, 
        password, 
        full_name: fullName 
      })
    });
    
    if (!res.ok) {
      const error = await res.json();
      throw new Error(error.detail || 'Registration failed');
    }
    
    return { success: true, user: await res.json() };
  } catch (err) {
    console.error('Registration error:', err);
    return { success: false, error: err.message };
  }
}

export async function getCurrentUser() {
  try {
    const res = await fetch(`${API_BASE}/auth/me`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      throw new Error('Failed to get user info');
    }
    
    return await res.json();
  } catch (err) {
    console.error('Get user error:', err);
    return null;
  }
}

export function logout() {
  removeToken();
}

export async function createProject(name) {
  try {
    const res = await fetch(`${API_BASE}/projects/create`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ name })
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('Create project error:', err);
    return { success: false, error: err.message };
  }
}

export async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    const data = await res.json();
    return data.success ? data.projects : [];
  } catch (err) {
    console.error('Fetch projects error:', err);
    return [];
  }
}

export async function saveSchema(projectId, schema) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/schema`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify(schema)
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('saveSchema error:', err);
    return { success: false, error: err.message };
  }
}

export async function uploadDataset(projectId, file) {
  try {
    const form = new FormData();
    form.append('file', file);
    
    const res = await fetch(`${API_BASE}/projects/${projectId}/data`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: form
    });
    
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('Upload dataset error:', err);
    return { success: false, error: err.message };
  }
}

export async function predict(projectId, inputs) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/predict`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ inputs })
    });
    
    if (!res.ok) {
      throw new Error(`Prediction failed: ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('Prediction error:', err);
    throw err;
  }
}

export async function fetchLogs(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/logs`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      throw new Error(`Logs fetch failed: ${res.status}`);
    }
    
    return await res.text();
  } catch (err) {
    console.error('Fetch logs error:', err);
    throw err;
  }
}

export async function startTraining(projectId, cpuPercent) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        ...getAuthHeaders()
      },
      body: JSON.stringify({ cpu_percent: cpuPercent }),
    });
    
    if (!res.ok) {
      throw new Error(`Train failed: ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('Start training error:', err);
    throw err;
  }
}

export async function fetchTrainingLog(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/training-log`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      return null;
    }
    
    return await res.json();
  } catch (err) {
    console.error('Fetch training log error:', err);
    return null;
  }
}

export async function fetchSystemInfo() {
  try {
    const res = await fetch(`${API_BASE}/system-info`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      throw new Error(`Status ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error("fetchSystemInfo error:", err);
    return null;
  }
}

export async function downloadHuggingFaceModel(modelId, projectId) {
  try {
    const form = new FormData();
    form.append('model_id', modelId);
    form.append('project_id', projectId);
    
    const res = await fetch(`${API_BASE}/download-hf-model`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: form
    });
    
    return res.ok ? await res.json() : { success: false, error: 'Network error' };
  } catch (err) {
    console.error('Download HF model error:', err);
    return { success: false, error: err.message };
  }
}

export async function searchHuggingFaceModels(query) {
  try {
    const res = await fetch(`${API_BASE}/search-hf-models?q=${encodeURIComponent(query)}`, {
      headers: getAuthHeaders()
    });
    
    if (!res.ok) {
      throw new Error(`Search failed: ${res.status}`);
    }
    
    return await res.json();
  } catch (err) {
    console.error('Search HF models error:', err);
    return [];
  }
}