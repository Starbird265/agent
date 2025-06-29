export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// Consistent header function for all authenticated requests
function getAuthenticatedHeaders(isFormData = false) {
  const headers = {};
  // Prioritize JWT token if available (for future-proofing)
  const token = localStorage.getItem('accessToken');
  // Vite exposes env variables prefixed with VITE_
  const apiKey = import.meta.env.VITE_API_KEY;

  if (token) {
    // If we were to use JWT with the backend:
    // headers['Authorization'] = `Bearer ${token}`;
    // However, current backend uses X-API-Key, so we'll use that if no JWT.
    // For now, we will prefer API Key as backend is not JWT ready.
  }

  if (apiKey) {
    headers['X-API-Key'] = apiKey;
  } else if (!token) {
    // If neither JWT nor API key is available, critical auth info is missing.
    // This shouldn't happen if .env is set up correctly for VITE_API_KEY.
    console.warn('API Key is missing. Ensure VITE_API_KEY is set in your .env file and rebuild if necessary.');
  }


  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

export async function pingServer() { // Public endpoint, no auth needed
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

// Centralized error handler for API calls
async function handleApiResponse(response) {
    if (!response.ok) {
        let errorDetail = `Request failed with status: ${response.status}`;
        try {
            const errData = await response.json();
            errorDetail = errData.detail || errorDetail;
        } catch (e) {
            // Ignore if error response is not JSON, use status text or generic message
            errorDetail = response.statusText || errorDetail;
        }
        throw new Error(errorDetail);
    }
    // For 204 No Content, res.json() would fail. Check status explicitly.
    if (response.status === 204) {
        return null; // Or { success: true } if appropriate
    }
    return response.json();
}


export async function createProject(name) {
  try {
    const res = await fetch(`${API_BASE}/projects/create`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(),
      body: JSON.stringify({ name })
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('createProject error:', err);
    throw err; // Re-throw for component to handle
  }
}

export async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`, { headers: getAuthenticatedHeaders() });
    const data = await handleApiResponse(res);
    return data || []; // Ensure it returns an array even if data is null (e.g. from 204)
  } catch (err) {
    console.error('fetchProjects error:', err);
    throw err;
  }
}

export async function saveSchema(projectId, schema) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/schema`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(),
      body: JSON.stringify(schema)
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('saveSchema error:', err);
    throw err;
  }
}

export async function uploadDataset(projectId, file) {
  const form = new FormData();
  form.append('file', file);
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/data`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(true), // Pass true for FormData
      body: form
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('uploadDataset error:', err);
    throw err;
  }
}

export async function predict(projectId, inputs) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/predict`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(),
      body: JSON.stringify({ inputs })
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('predict error:', err);
    throw err;
  }
}

export async function fetchLogs(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/logs`, { headers: getAuthenticatedHeaders() });
    if (!res.ok) { // Plain text response, handle differently if error
        const errorDetail = await res.text() || `Logs fetch failed: ${res.status}`;
        throw new Error(errorDetail);
    }
    return res.text();
  } catch (err) {
    console.error('fetchLogs error:', err);
    throw err;
  }
}

export async function startTraining(projectId, cpuPercent, selectedDevice = 'cpu') {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(),
      // Payload will be updated in the next step to include selectedDevice
      body: JSON.stringify({ cpu_percent: cpuPercent, device: selectedDevice }),
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('startTraining error:', err);
    throw err;
  }
}

export async function fetchTrainStatus(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train/status`, { headers: getAuthenticatedHeaders() });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('fetchTrainStatus error:', err);
    // Specific handling for UI if needed, or rethrow
    // For UI consistency, it might expect a certain structure on error.
    // throw err;
    return { success: false, error: err.message, status: 'api_error' }; // Keep similar error structure as before
  }
}

export async function fetchTrainHistory(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train/history`, {
      headers: getAuthenticatedHeaders(),
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('fetchTrainHistory error:', err);
    throw err;
  }
}

export async function exportModel(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/export`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(),
    });

    if (res.status === 402) { // Payment Required specific handling
      let errorDetail = 'Export limit reached or payment required.';
      try {
        const errData = await res.json(); // Try to parse JSON error
        errorDetail = errData.detail || errorDetail;
      } catch (e) { /* Ignore if error response is not JSON */ }
      throw new Error(errorDetail);
    }

    if (!res.ok) { // General error handling for non-402 errors
        return await handleApiResponse(res); // Use centralized handler
    }

    // Process the file download for successful responses (e.g., 200 OK with blob)
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    // Try to get filename from Content-Disposition header if backend sets it
    const disposition = res.headers.get('content-disposition');
    let filename = `${projectId}-model.export`; // Default filename
    if (disposition && disposition.indexOf('attachment') !== -1) {
        const filenameRegex = /filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/;
        const matches = filenameRegex.exec(disposition);
        if (matches != null && matches[1]) {
          filename = matches[1].replace(/['"]/g, '');
        }
    }
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    a.remove();
    return { success: true, message: "Model download initiated." };

  } catch (err) {
    console.error('exportModel error:', err);
    throw err;
  }
}

export async function upgradePlan(email, planType) {
  try {
    const res = await fetch(`${API_BASE}/billing/upgrade`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(),
      body: JSON.stringify({ user_email: email, plan_type: planType }),
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('upgradePlan error:', err);
    throw err;
  }
}

// userLogin and userSignup manage tokens, so they don't use getAuthenticatedHeaders
export async function userLogin(email, password) {
    const res = await fetch(`${API_BASE}/auth/token`, { // Assuming this is the token endpoint
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, // FastAPI's OAuth2PasswordRequestForm
        body: new URLSearchParams({ username: email, password: password })
    });
    // If login is successful, backend returns token. handleApiResponse will parse it.
    // If login fails, backend returns error (e.g. 401), handleApiResponse will throw.
    return await handleApiResponse(res);
}

export async function userSignup(email, password, inviteCode) {
    const res = await fetch(`${API_BASE}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' }, // Signup takes JSON
        body: JSON.stringify({ email, password, invite_code: inviteCode })
    });
    return await handleApiResponse(res);
}


export async function fetchCurrentUser() {
  // This endpoint should ideally be protected by JWT if login provides one.
  // For now, it will use X-API-Key via getAuthenticatedHeaders.
  // The backend /users/me needs to be updated to use the chosen auth method.
  try {
    const res = await fetch(`${API_BASE}/users/me`, { headers: getAuthenticatedHeaders() });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('fetchCurrentUser error:', err);
    // Allow App.jsx to handle null user if fetch fails, don't throw globally here
    return null;
  }
}

export async function cancelTraining(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train/cancel`, {
      method: 'POST',
      headers: getAuthenticatedHeaders(), // Ensure this uses API key
    });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('cancelTraining error:', err);
    throw err;
  }
}

// Placeholder for fetching system info (e.g., GPU availability)
// This would be a new endpoint on the backend.
export async function fetchSystemInfo() {
  try {
    // Assuming a new backend endpoint like /system/info
    // This endpoint might or might not require authentication depending on sensitivity.
    // For now, let's assume it's okay to use getAuthenticatedHeaders or could be public.
    const res = await fetch(`${API_BASE}/system/info`, { headers: getAuthenticatedHeaders() });
    return await handleApiResponse(res);
  } catch (err) {
    console.error('fetchSystemInfo error:', err);
    // It's crucial for UI elements, so perhaps return a default or throw
    // For now, rethrow so the caller can decide on fallback.
    throw err;
  }
}