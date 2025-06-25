export const API_BASE = 'http://127.0.0.1:8000';

// Define default headers, including the API key
// In a real app, the API key should not be hardcoded like this.
// It could be configured via environment variables or a build process.
const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
  'X-API-Key': 'dev_secret_key' // As defined in backend placeholder
};

const GET_HEADERS = { // For GET requests that don't send a body
  'X-API-Key': 'dev_secret_key'
}

export async function pingServer() {
  try {
    const res = await fetch(`${API_BASE}/`, { headers: GET_HEADERS });
    if (!res.ok) throw new Error(`Status ${res.status}`);
    const data = await res.json();
    return data.status;
  } catch (err) {
    console.error('pingServer error:', err);
    return 'Service Unavailable';
  }
}

export async function createProject(name) {
  try {
    const res = await fetch(`${API_BASE}/projects/create`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify({ name })
    });
    return await res.json();
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function fetchProjects() {
  try {
    const res = await fetch(`${API_BASE}/projects`, { headers: GET_HEADERS });
    const data = await res.json();
    return data.success ? data.projects : [];
  } catch (err) {
    console.error(err);
    return [];
  }
}

export async function saveSchema(projectId, schema) {
  try {
    const res = await fetch(`${API_BASE}/projects/${projectId}/schema`, {
      method: 'POST',
      headers: DEFAULT_HEADERS,
      body: JSON.stringify(schema)
    });
    return res.ok ? res.json() : null;
  } catch (err) {
    console.error('saveSchema error:', err);
    return null;
  }
}

export async function uploadDataset(projectId, file) {
  const form = new FormData();
  form.append('file', file);
  // FormData sets its own Content-Type, so we only add X-API-Key
  const res = await fetch(`${API_BASE}/projects/${projectId}/data`, {
    method: 'POST',
    headers: { 'X-API-Key': 'dev_secret_key' },
    body: form
  });
  return res.ok ? res.json() : null;
}

export async function predict(projectId, inputs) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/predict`, {
    method: 'POST',
    headers: DEFAULT_HEADERS,
    body: JSON.stringify({ inputs })
  });
  if (!res.ok) throw new Error(`Prediction failed: ${res.status}`);
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