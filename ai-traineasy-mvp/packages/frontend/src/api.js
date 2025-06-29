export const API_BASE = 'http://127.0.0.1:8000';

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

export async function createProject(name) {
  try {
    const res = await fetch(`${API_BASE}/projects/create`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
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
    const res = await fetch(`${API_BASE}/projects`);
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
      headers: { 'Content-Type': 'application/json' },
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
  const res = await fetch(`${API_BASE}/projects/${projectId}/data`, {
    method: 'POST',
    body: form
  });
  return res.ok ? res.json() : null;
}

export async function predict(projectId, inputs) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ inputs })
  });
  if (!res.ok) throw new Error(`Prediction failed: ${res.status}`);
  return res.json();
}

export async function fetchLogs(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/logs`);
  if (!res.ok) throw new Error(`Logs fetch failed: ${res.status}`);
  return res.text();
}

export async function pauseTraining(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/train/pause`, {
    method: 'POST'
  });
  return res.ok ? res.json() : null;
}

export async function startTraining(projectId, cpuPercent) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/train`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cpu_percent: cpuPercent }),
  });
  if (!res.ok) throw new Error(`Train failed: ${res.status}`);
  return res.json();
}

export async function resumeTraining(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/train/resume`, {
    method: 'POST'
  });
  return res.ok ? res.json() : null;
}

export async function fetchTrainingLog(projectId) {
  const res = await fetch(`${API_BASE}/projects/${projectId}/training-log`);
  return res.ok ? res.json() : null;
}

export async function fetchSystemInfo() {
  try {
    const res = await fetch(`${API_BASE}/system-info`);
    if (!res.ok) throw new Error(`Status ${res.status}`);
    return await res.json();
  } catch (e) {
    console.error("fetchSystemInfo error:", e);
    return null;
  }
}

export async function downloadHuggingFaceModel(modelId, projectId) {
  const form = new FormData();
  form.append('model_id', modelId);
  form.append('project_id', projectId);
  const res = await fetch(`${API_BASE}/download-hf-model`, {
    method: 'POST',
    body: form
  });
  return res.ok ? res.json() : { success: false, error: 'Network error' };
}