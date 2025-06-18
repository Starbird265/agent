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