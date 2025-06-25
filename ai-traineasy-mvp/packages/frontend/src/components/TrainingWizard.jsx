import React, { useState, useEffect, useCallback } from 'react';
import { startTraining, fetchTrainStatus } from '../api';
import TrainingHistory from './TrainingHistory'; // Import TrainingHistory

export default function TrainingWizard({ projectId, schema }) {
  // jobStatus can be: idle, starting, queued, running, finished, failed, api_error, not_started
  const [jobStatus, setJobStatus] = useState('idle');
  const [cpuPercent, setCpuPercent] = useState(100);
  const [errorMessage, setErrorMessage] = useState('');
  const [pollingIntervalId, setPollingIntervalId] = useState(null);

  const POLLING_INTERVAL = 3000; // 3 seconds

  const pollStatus = useCallback(async () => {
    if (!projectId) return;

    try {
      const data = await fetchTrainStatus(projectId);
      if (data && data.status) {
        setJobStatus(data.status); // Backend status: not_started, queued, running, finished, failed
        if (data.status === 'failed' && data.error) {
          setErrorMessage(data.detail || data.error);
        } else {
          setErrorMessage('');
        }
        if (data.status === 'finished' || data.status === 'failed' || data.status === 'api_error') {
          if (pollingIntervalId) clearInterval(pollingIntervalId);
          setPollingIntervalId(null);
        }
      } else if (data && data.success === false && data.status === 'api_error') {
        // Handle API call failure specifically
        setJobStatus('api_error');
        setErrorMessage(data.error || 'Error fetching training status.');
        if (pollingIntervalId) clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }
    } catch (error) {
      console.error("Error polling status:", error);
      setJobStatus('api_error'); // Or a more specific error state
      setErrorMessage('Failed to connect to server for status update.');
      if (pollingIntervalId) clearInterval(pollingIntervalId);
      setPollingIntervalId(null);
    }
  }, [projectId, pollingIntervalId]);

  // Effect for polling
  useEffect(() => {
    if (jobStatus === 'queued' || jobStatus === 'running') {
      if (!pollingIntervalId) { // Start polling if not already
        const intervalId = setInterval(pollStatus, POLLING_INTERVAL);
        setPollingIntervalId(intervalId);
      }
    } else { // Not queued or running, so stop polling
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
      }
    }
    // Cleanup function to clear interval when component unmounts or dependencies change
    return () => {
      if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
      }
    };
  }, [jobStatus, pollStatus, pollingIntervalId]);


  // Effect to fetch initial status when component mounts or projectId changes
  // This helps if the page is reloaded or component re-rendered while a job is active.
  useEffect(() => {
    setJobStatus('idle'); // Reset status on projectId change
    setErrorMessage('');
    if (pollingIntervalId) { // Clear previous polling
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
    }
    if (projectId && schema) { // schema check ensures we don't poll for projects not ready for training
        pollStatus(); // Initial status check
    }
  }, [projectId, schema]); // Removed pollStatus from deps to avoid loop, it's stable due to useCallback

  const handleStart = async () => {
    if (!projectId) return;
    setJobStatus('starting...'); // Indicate an attempt to start
    setErrorMessage('');
    try {
      const response = await startTraining(projectId, cpuPercent);
      if (response && response.success && response.status === 'queued') {
        setJobStatus('queued'); // Set to queued, polling will take over
        // pollStatus(); // Initial poll right after starting
      } else {
        setJobStatus('failed'); // Or 'idle' if you prefer
        setErrorMessage(response ? response.detail || 'Failed to start training.' : 'No response from server.');
      }
    } catch (error) {
      console.error("Error starting training:", error);
      setJobStatus('failed');
      setErrorMessage(error.message || 'An error occurred while trying to start training.');
    }
  };

  // Pause and Resume buttons are removed as backend functionality is removed.

  let buttonText = 'Start Training';
  let buttonDisabled = false;

  switch (jobStatus) {
    case 'starting...':
      buttonText = 'Starting...';
      buttonDisabled = true;
      break;
    case 'queued':
      buttonText = 'Training Queued...';
      buttonDisabled = true;
      break;
    case 'running':
      buttonText = 'Training Running...';
      buttonDisabled = true;
      break;
    case 'finished':
      buttonText = 'Training Finished';
      buttonDisabled = false; // Allow re-start
      break;
    case 'failed':
      buttonText = 'Training Failed (Retry?)';
      buttonDisabled = false; // Allow re-start
      break;
    case 'api_error':
      buttonText = 'Status Error (Retry Start?)';
      buttonDisabled = false;
      break;
    case 'not_started': // From backend, treat as idle for button
    case 'idle':
    default:
      buttonText = 'Start Training';
      buttonDisabled = false;
      break;
  }


  return (
    <div className="mt-6 p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">🚀 Training Controls</h2>

      {/* CPU slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          CPU Limit: {cpuPercent}% (Adjust before starting)
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={cpuPercent}
          onChange={(e) => setCpuPercent(Number(e.target.value))}
          className="w-full"
          disabled={jobStatus === 'queued' || jobStatus === 'running' || jobStatus === 'starting...'}
        />
      </div>

      <p>Status: <strong>{jobStatus === 'api_error' ? 'Error fetching status' : jobStatus}</strong></p>
      {errorMessage && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}

      <div className="space-x-2 mt-3">
        <button
          onClick={handleStart}
          disabled={buttonDisabled}
          className={`px-4 py-2 rounded text-white ${
            buttonDisabled ? 'bg-gray-400' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {buttonText}
        </button>
        {/* Pause and Resume buttons have been removed */}
      </div>

      {/* Render TrainingHistory component */}
      {projectId && <TrainingHistory projectId={projectId} status={jobStatus} />}
    </div>
  );
}