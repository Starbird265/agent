import { fetchProjects, saveSchema, predict, fetchLogs } from '../api';

describe('API Tests', () => {
  beforeEach(() => {
    global.fetch = jest.fn();
  });

  test('fetchProjects handles network errors', async () => {
    fetch.mockRejectedOnce(new Error('Network failure'));
    const result = await fetchProjects();
    expect(result).toEqual([]);
  });

  test('saveSchema returns null on server error', async () => {
    fetch.mockResolvedValue({ ok: false });
    const result = await saveSchema('123', {});
    expect(result).toBeNull();
  });

  test('predict throws structured error', async () => {
    fetch.mockResolvedValue({ ok: false, status: 504 });
    await expect(predict('123', [])).rejects.toThrow('Prediction failed: 504');
  });

  test('fetchLogs handles non-200 responses', async () => {
    fetch.mockResolvedValue({ ok: false, status: 403 });
    await expect(fetchLogs('123')).rejects.toThrow('Logs fetch failed: 403');
  });
});