export const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://127.0.0.1:8000';

// New function to get headers with Authorization token
function getAuthHeaders(isFormData = false) {
  const headers = {};
  const token = localStorage.getItem('accessToken');

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (!isFormData) {
    headers['Content-Type'] = 'application/json';
  }
  // X-API-Key is no longer used with JWT authentication
  return headers;
}

export async function pingServer() { // Public endpoint
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

export async function createProject(name) { // Protected
  try {
    const res = await fetch(`${API_BASE}/projects/create`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ name })
    });
    // Backend's createProject now returns ProjectResponse, which is fine.
    // Error handling might need adjustment if it doesn't return {success: true} structure anymore
    if (!res.ok) { // Assuming backend returns non-2xx for errors
        const errData = await res.json().catch(() => ({ detail: `Failed to create project: ${res.status}` }));
        throw new Error(errData.detail);
    }
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function fetchProjects() { // Protected
  try {
    const res = await fetch(`${API_BASE}/projects`, { headers: getAuthHeaders() });
    if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `Failed to fetch projects: ${res.status}` }));
        throw new Error(errData.detail);
    }
    const data = await res.json();
    // Backend returns list[ProjectResponse], not {success: true, projects: ...} anymore
    return data; // Assuming it's an array of projects
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function saveSchema(projectId, schema) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/schema`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(schema)
    });
    // Assuming backend returns {success: true} or error with detail
    if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: `Failed to save schema: ${res.status}` }));
        throw new Error(errData.detail);
    }
    return await res.json();
  } catch (err) {
    console.error('saveSchema error:', err);
    return null;
  }
}

export async function uploadDataset(projectId, file) {
  const form = new FormData();
  form.append('file', file);
  const res = await fetch(`${API_BASE}/projects/${projectId}/data`, {
    method: 'POST',
    headers: getAuthHeaders(true), // Pass true for FormData
    body: form
  });
  // Assuming backend returns {success: true, filename: ...} or error with detail
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: `Failed to upload dataset: ${res.status}` }));
    throw new Error(errData.detail);
  }
  return await res.json();
}

export async function predict(projectId, inputs) { // Protected
  const res = await fetch(`${API_BASE}/projects/${projectId}/predict`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: JSON.stringify({ inputs })
  });
  if (!res.ok) {
    const errData = await res.json().catch(() => ({ detail: `Prediction failed: ${res.status}` }));
    throw new Error(errData.detail);
  }
  return res.json();
}

export async function fetchLogs(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/logs`, { headers: GET_HEADERS });
  if (!res.ok) throw new Error(`Logs fetch failed: ${res.status}`);
  return res.text();
}

// pauseTraining and resumeTraining are kept for now but should be removed
// as backend functionality was removed. Or updated if pause/resume is re-added.
export async function pauseTraining(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/train/pause`, {
    method: 'POST',
    headers: GET_HEADERS // Assuming no body, just API key
  });
  return res.ok ? res.json() : null;
}

export async function startTraining(projectId, cpuPercent) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/train`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ cpu_percent: cpuPercent }),
  });
  if (!res.ok) throw new Error(`Train failed: ${res.status}`);
  return res.json();
}

export async function resumeTraining(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/train/resume`, {
    method: 'POST',
    headers: GET_HEADERS // Assuming no body, just API key
  });
  return res.ok ? res.json() : null;
}

export async function fetchTrainStatus(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train/status`, { headers: GET_HEADERS });
    if (!res.ok) {
      // Attempt to parse error response from backend if available
      try {
        const errData = await res.json();
        throw new Error(errData.detail || `Status ${res.status}`);
      } catch {
        throw new Error(`Status ${res.status}`);
      }
    }
    return await res.json();
  } catch (err) {
    console.error('fetchTrainStatus error:', err);
    // Return a specific structure or null to indicate API call failure
    return { success: false, error: err.message, status: 'api_error' };
  }
}

export async function fetchTrainHistory(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train/history`, {
      headers: GET_HEADERS, // Uses X-API-Key
    });
    if (!res.ok) {
      // Attempt to parse error response from backend if available
      try {
        const errData = await res.json();
        throw new Error(errData.detail || `Status ${res.status}`);
      } catch {
        throw new Error(`Status ${res.status}`);
      }
    }
    return await res.json(); // an array of { event, timestamp, details? }
  } catch (err) {
    console.error('fetchTrainHistory error:', err);
    throw err; // Re-throw to be caught by calling component
  }
}

export async function exportModel(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/export`, {
      method: 'POST', // Backend endpoint is POST
      headers: DEFAULT_HEADERS, // Includes X-API-Key and Content-Type
      // No body needed for this POST request based on backend implementation
    });

    if (res.status === 402) { // Payment Required
      let errorDetail = 'Export limit reached or payment required.';
      try {
        const errData = await res.json();
        errorDetail = errData.detail || errorDetail;
      } catch (e) {
        // Ignore if error response is not JSON
      }
      throw new Error(errorDetail);
    }

    if (!res.ok) {
      // Try to get more specific error from backend if possible
      let errorDetail = `Export failed with status: ${res.status}`;
      try {
        const errData = await res.json(); // Assuming error might be JSON
        errorDetail = errData.detail || errorDetail;
      } catch (e) {
         // Ignore if error response is not JSON
      }
      throw new Error(errorDetail);
    }

    // Process the file download
    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${projectId}-model.pkl`; // Or get filename from Content-Disposition header if backend sets it
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url); // Clean up
    a.remove();
    // No explicit return value needed as it triggers a download.
    // Can return true/success if needed by caller to confirm initiation.
    return { success: true, message: "Model download initiated." };

  } catch (err) {
    console.error('exportModel error:', err);
    throw err; // Re-throw to be caught by calling component
  }
}

export async function upgradePlan(email, planType) {
  try {
    const res = await fetch(`${API_BASE}/billing/upgrade`, {
      method: 'POST',
      headers: DEFAULT_HEADERS, // Includes Content-Type and X-API-Key
      body: JSON.stringify({ user_email: email, plan_type: planType }),
    });
    if (!res.ok) {
      let errorDetail = 'Upgrade failed';
      try {
        const errData = await res.json();
        errorDetail = errData.detail || `Upgrade failed with status: ${res.status}`;
      } catch (e) {
        // Failed to parse JSON error, use status text or generic message
        errorDetail = res.statusText || `Upgrade failed with status: ${res.status}`;
      }
      throw new Error(errorDetail);
    }
    return await res.json(); // returns updated UserResponse object
  } catch (err) {
    console.error('upgradePlan error:', err);
    throw err; // Re-throw to be caught by calling component
  }
}

export async function fetchCurrentUser(userIdPlaceholder) { // userIdPlaceholder for current backend
  try {
    // In a real JWT setup, the token would be sent, and backend decodes it.
    // For now, backend's /users/me expects X-User-Id or defaults to first user.
    // We'll pass what's in localStorage if available.
    const headers = { ...GET_HEADERS };
    if (userIdPlaceholder) {
      headers['X-User-Id'] = userIdPlaceholder;
    }
    // If no userIdPlaceholder is passed, backend /users/me will default to its first user logic
    // which is fine for initial testing before full auth flow in frontend.

    const res = await fetch(`${API_BASE}/users/me`, { headers });
    if (!res.ok) {
      try {
        const errData = await res.json();
        throw new Error(errData.detail || `Status ${res.status}`);
      } catch {
        throw new Error(`Status ${res.status}`);
      }
    }
    return await res.json(); // UserResponse object
  } catch (err) {
    console.error('fetchCurrentUser error:', err);
    // Don't throw here, allow App.jsx to handle null user if fetch fails
    return null;
  }
}

export async function cancelTraining(projectId) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/train/cancel`, {
      method: 'POST',
      headers: GET_HEADERS, // POST without a body, just X-API-Key
    });
    if (!res.ok) {
      // Attempt to parse error response from backend if available
      try {
        const errData = await res.json();
        throw new Error(errData.detail || `Status ${res.status}`);
      } catch {
        throw new Error(`Status ${res.status}`);
      }
    }
    return await res.json();
  } catch (err) {
    console.error('cancelTraining error:', err);
    throw err; // Re-throw to be caught by calling component
  }
}