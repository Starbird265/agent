import apiClient from './apiClient';

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
  const data = await apiClient.get('/');
  return data.status;
}

// Authentication functions
export async function login(username, password) {
  const formData = new FormData();
  formData.append('username', username);
  formData.append('password', password);

  const data = await apiClient.post('/auth/token', formData, {
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
  });

  setToken(data.access_token);
  return { success: true, user: data };
}

export async function register(username, email, password, fullName = '') {
  const user = await apiClient.post('/auth/register', {
    username,
    email,
    password,
    full_name: fullName,
  });
  return { success: true, user };
}

export async function getCurrentUser() {
  return await apiClient.get('/auth/me');
}

export function logout() {
  removeToken();
}

export async function createProject(name) {
  return await apiClient.post('/projects/create', { name });
}

export async function fetchProjects() {
  const data = await apiClient.get('/projects');
  return data.success ? data.projects : [];
}

export async function saveSchema(projectId, schema) {
  return await apiClient.post(`/projects/${projectId}/schema`, schema);
}

export async function uploadDataset(projectId, file) {
  const form = new FormData();
  form.append('file', file);
  return await apiClient.post(`/projects/${projectId}/data`, form, {
    headers: { 'Content-Type': undefined },
  });
}

export async function predict(projectId, inputs) {
  return await apiClient.post(`/projects/${projectId}/predict`, { inputs });
}

export async function fetchLogs(projectId) {
  return await apiClient.get(`/projects/${projectId}/logs`);
}

export async function startTraining(projectId, cpuPercent) {
  return await apiClient.post(`/projects/${projectId}/train`, {
    cpu_percent: cpuPercent,
  });
}

export async function fetchTrainingLog(projectId) {
  return await apiClient.get(`/projects/${projectId}/training-log`);
}

export async function fetchSystemInfo() {
  return await apiClient.get('/system-info');
}

export async function downloadHuggingFaceModel(modelId, projectId) {
  const form = new FormData();
  form.append('model_id', modelId);
  form.append('project_id', projectId);
  return await apiClient.post('/download-hf-model', form, {
    headers: { 'Content-Type': undefined },
  });
}

export async function searchHuggingFaceModels(query) {
  return await apiClient.get(`/search-hf-models?q=${encodeURIComponent(query)}`);
}