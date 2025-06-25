import React, { useEffect, useState, useCallback } from 'react';
import { fetchTrainHistory, cancelTraining } from '../api';

export default function TrainingHistory({ projectId, status }) {
  const [history, setHistory] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pollingIntervalId, setPollingIntervalId] = useState(null);

  const POLLING_INTERVAL = 5000; // 5 seconds

  const loadHistory = useCallback(async (isSilent = false) => {
    if (!projectId) {
      setHistory([]); // Clear history if no project ID
      return;
    }
    if (!isSilent) setIsLoading(true);
    setError(null);
    try {
      const data = await fetchTrainHistory(projectId);
      setHistory(data || []); // Ensure history is an array even if API returns null
    } catch (e) {
      console.error("Failed to load training history:", e);
      setError(e.message || 'Failed to load history.');
      setHistory([]); // Clear history on error
    } finally {
      if (!isSilent) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadHistory(); // Initial load

    // Set up polling if the job status suggests it might still be active
    // or if we want to refresh history periodically regardless of wizard's main job status.
    // For simplicity, let's poll if projectId is present.
    // Polling will stop if component unmounts or projectId changes.
    if (projectId) {
        const intervalId = setInterval(() => loadHistory(true), POLLING_INTERVAL);
        setPollingIntervalId(intervalId);
        return () => clearInterval(intervalId);
    } else {
        // Clear interval if projectId becomes null
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
        setHistory([]); // Clear history if no project
    }
  }, [projectId, loadHistory]); // status is not included here to avoid too frequent polling restarts, loadHistory depends on projectId

  // This effect is to specifically reload history when the job status from TrainingWizard changes,
  // as that's a strong signal that something might have updated (e.g., job finished, user cancelled).
  useEffect(() => {
    if (projectId) {
        // A small delay can sometimes be useful if status changes right after an action like cancel
        // to give backend time to update history, but often direct load is fine.
        loadHistory();
    }
  }, [status, projectId, loadHistory]);


  const handleCancel = async () => {
    if (!projectId) return;
    setError(null); // Clear previous errors
    const confirmCancel = window.confirm("Are you sure you want to cancel this training job?");
    if (confirmCancel) {
      try {
        setIsLoading(true); // Indicate activity
        const result = await cancelTraining(projectId);
        console.log('Cancel training result:', result);
        // The status prop from TrainingWizard will change, triggering a history reload via the other useEffect.
        // Or, we can force a reload here too.
        await loadHistory();
      } catch (e) {
        console.error("Failed to cancel training:", e);
        setError(e.message || 'Failed to cancel training.');
      } finally {
        setIsLoading(false);
      }
    }
  };

  const showCancelButton = status === 'queued' || status === 'running';

  if (!projectId) {
    return null; // Don't render anything if there's no project
  }

  return (
    <div className="mt-6 p-4 border rounded bg-white shadow">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-lg font-semibold">📜 Training History</h2>
        {isLoading && <p className="text-sm text-gray-500">Loading history...</p>}
      </div>

      {error && <p className="text-red-500 py-2">Error: {error}</p>}

      {history.length === 0 && !isLoading && !error && (
        <p className="text-gray-500">No history yet for this project.</p>
      )}

      {history.length > 0 && (
        <ul className="list-none text-sm space-y-1 max-h-60 overflow-y-auto pr-2">
          {history.map((h, idx) => (
            <li key={idx} className="p-1 border-b border-gray-200 last:border-b-0">
              <span className={`font-semibold ${
                h.event === 'failed' || h.event === 'submission_failed' || h.event === 'cancellation_actioned' ? 'text-red-500' :
                h.event === 'finished' ? 'text-green-500' :
                h.event === 'running' ? 'text-blue-500' :
                h.event === 'queued' ? 'text-yellow-600' : ''
              }`}>
                {h.event.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </span>
              <span className="text-gray-600"> at {new Date(h.timestamp * 1000).toLocaleString()}</span>
              {h.details && typeof h.details === 'object' && (
                <div className="text-xs text-gray-500 pl-2">
                  {Object.entries(h.details).map(([key, value]) => (
                    <div key={key}>{key.replace(/_/g, ' ')}: {String(value)}</div>
                  ))}
                </div>
              )}
               {h.error && typeof h.error === 'string' && ( // For submission_failed event
                <div className="text-xs text-red-400 pl-2">
                  Error: {h.error}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {showCancelButton && (
        <button
          onClick={handleCancel}
          disabled={isLoading}
          className={`mt-3 bg-red-600 text-white px-4 py-2 rounded ${isLoading ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-700'}`}
        >
          {isLoading ? 'Cancelling...' : 'Cancel Training'}
        </button>
      )}
    </div>
  );
}
