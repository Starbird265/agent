import { useState, useEffect } from 'react';
import { downloadHuggingFaceModel } from '../api';

function getDownloadedModels(projectId) {
  // List models from the backend (by reading the project folder)
  return fetch(`/projects/${projectId}/hf_models`)
    .then(res => res.ok ? res.json() : [])
    .catch(() => []);
}

export default function HuggingFaceModelDownloader({ projectId, onDownload }) {
  const [modelId, setModelId] = useState('');
  const [search, setSearch] = useState('');
  const [results, setResults] = useState([]);
  const [status, setStatus] = useState('idle');
  const [message, setMessage] = useState('');
  const [downloaded, setDownloaded] = useState([]);

  useEffect(() => {
    if (projectId) {
      getDownloadedModels(projectId).then(setDownloaded);
    }
  }, [projectId, status]);

  // Search Hugging Face models
  const handleSearch = async () => {
    setResults([]);
    setStatus('searching');
    setMessage('');
    try {
      const res = await fetch(`/search-hf-models?q=${encodeURIComponent(search)}`);
      const data = await res.json();
      if (Array.isArray(data)) setResults(data);
      else setMessage(data.error || 'No results');
    } catch (e) {
      setMessage('Search failed');
    }
    setStatus('idle');
  };

  const handleDownload = async (id) => {
    setModelId(id);
    setStatus('downloading');
    setMessage('');
    const result = await downloadHuggingFaceModel(id, projectId);
    if (result.success) {
      setStatus('success');
      setMessage(result.message);
      if (onDownload) onDownload(id);
      getDownloadedModels(projectId).then(setDownloaded);
    } else {
      setStatus('error');
      setMessage(result.error || 'Download failed');
    }
  };

  const handleDelete = async (id) => {
    setStatus('deleting');
    setMessage('');
    await fetch(`/projects/${projectId}/hf_models/${id}`, { method: 'DELETE' });
    getDownloadedModels(projectId).then(setDownloaded);
    setStatus('idle');
  };

  return (
    <div className="card flex flex-col gap-4 mt-4">
      <h2 className="text-lg font-semibold text-blue-700">Download Model from Hugging Face</h2>
      <div className="flex gap-2">
        <input
          type="text"
          className="border border-blue-200 px-3 py-2 rounded-lg focus:ring-2 focus:ring-blue-200 flex-grow"
          placeholder="Search models (e.g. bert, gpt2)"
          value={search}
          onChange={e => setSearch(e.target.value)}
          disabled={status === 'searching' || status === 'downloading'}
        />
        <button
          onClick={handleSearch}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg shadow hover:bg-blue-700 disabled:opacity-50"
          disabled={!search || status === 'searching' || status === 'downloading'}
        >
          {status === 'searching' ? 'Searching...' : 'Search'}
        </button>
      </div>
      {results.length > 0 && (
        <div className="bg-blue-50 rounded-lg p-2 mt-2 max-h-64 overflow-y-auto">
          <ul className="divide-y divide-blue-100">
            {results.map(m => (
              <li key={m.modelId} className="py-2 flex flex-col gap-1">
                <span className="font-semibold text-blue-900">{m.modelId}</span>
                <span className="text-xs text-gray-500">{m.description}</span>
                <div className="flex gap-2 items-center mt-1">
                  <span className="text-xs text-gray-400">{m.pipeline_tag}</span>
                  <span className="text-xs text-gray-400">👍 {m.likes}</span>
                  <span className="text-xs text-gray-400">⬇️ {m.downloads}</span>
                  <button
                    onClick={() => handleDownload(m.modelId)}
                    className="ml-auto px-3 py-1 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded shadow hover:from-blue-700 hover:to-indigo-600 text-xs disabled:opacity-50"
                    disabled={status === 'downloading'}
                  >
                    {status === 'downloading' && modelId === m.modelId ? 'Downloading...' : 'Download'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
      {/* List downloaded models */}
      {downloaded.length > 0 && (
        <div className="bg-green-50 rounded-lg p-2 mt-2">
          <h3 className="font-semibold text-green-700 mb-2">Downloaded Models</h3>
          <ul className="divide-y divide-green-100">
            {downloaded.map(id => (
              <li key={id} className="py-2 flex items-center gap-2">
                <span className="font-mono text-green-900">{id}</span>
                <button
                  onClick={() => handleDelete(id)}
                  className="ml-auto px-2 py-1 bg-red-500 text-white rounded text-xs hover:bg-red-600"
                  disabled={status === 'deleting'}
                >Delete</button>
              </li>
            ))}
          </ul>
        </div>
      )}
      {message && (
        <div className={`text-sm ${status === 'success' ? 'text-green-600' : 'text-red-600'}`}>{message}</div>
      )}
    </div>
  );
}
