import React, { useState, useEffect, useCallback } from 'react';
import { startTraining, fetchTrainStatus } from '../api';
import TrainingHistory from './TrainingHistory';

export default function TrainingWizard({ projectId, schema, systemInfo }) { // Added systemInfo prop
  const [jobStatus, setJobStatus] = useState('idle');
  const [cpuPercent, setCpuPercent] = useState(100);
  const [selectedDevice, setSelectedDevice] = useState('cpu'); // New state for selected device
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
    if (pollingIntervalId) {
        clearInterval(pollingIntervalId);
        setPollingIntervalId(null);
    }
    // Reset selected device to CPU if systemInfo isn't loaded yet or if project changes
    // This ensures we don't try to use a device that might not be available for the new context.
    setSelectedDevice('cpu');
    if (projectId && schema) {
        pollStatus();
    }
  }, [projectId, schema, pollStatus]); // Added pollStatus back as it's stable with useCallback

  const handleStart = async () => {
    if (!projectId) return;
    setJobStatus('starting...');
    setErrorMessage('');
    try {
      // Pass selectedDevice to startTraining API call
      const response = await startTraining(projectId, cpuPercent, selectedDevice);
      if (response && response.success && response.status === 'queued') {
        setJobStatus('queued');
      } else {
        setJobStatus('failed');
        setErrorMessage(response ? response.message || response.detail || 'Failed to start training.' : 'No response from server.');
      }
    } catch (error) {
      console.error("Error starting training:", error);
      setJobStatus('failed');
      setErrorMessage(error.message || 'An error occurred while trying to start training.');
    }
  };

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

  const availableDevices = systemInfo?.accelerators
    ? Object.entries(systemInfo.accelerators)
        .filter(([_, available]) => available)
        .map(([device]) => device)
    : ['cpu']; // Default to CPU if systemInfo not loaded or no accelerators

  // Ensure 'cpu' is always an option and default if current selectedDevice isn't available
  useEffect(() => {
    if (systemInfo && !availableDevices.includes(selectedDevice)) {
      setSelectedDevice('cpu');
    }
  }, [systemInfo, availableDevices, selectedDevice]);


  return (
    <div className="mt-6 p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">🚀 Training Controls</h2>

      <div className="grid grid-cols-2 gap-4 mb-4">
        <div>
          <label className="block text-sm font-medium">
            CPU Limit: {cpuPercent}%
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={cpuPercent}
            onChange={(e) => setCpuPercent(Number(e.target.value))}
            className="w-full mt-1"
            disabled={jobStatus === 'queued' || jobStatus === 'running' || jobStatus === 'starting...'}
          />
        </div>
        <div>
          <label htmlFor="device-select" className="block text-sm font-medium">Compute Device:</label>
          <select
            id="device-select"
            value={selectedDevice}
            onChange={(e) => setSelectedDevice(e.target.value)}
            className="mt-1 block w-full py-2 px-3 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
            disabled={jobStatus === 'queued' || jobStatus === 'running' || jobStatus === 'starting...' || !systemInfo}
          >
            {availableDevices.length === 0 && <option value="cpu">CPU (Default)</option> /* Fallback if somehow list is empty */}
            {availableDevices.map(dev => (
              <option key={dev} value={dev}>
                {dev.toUpperCase()}
              </option>
            ))}
          </select>
        </div>
      </div>

      <p>Status: <strong>{jobStatus === 'api_error' ? 'Error fetching status' : jobStatus.replace(/_/g, ' ')}</strong></p>
      {errorMessage && <p className="text-red-500 text-sm mt-1">{errorMessage}</p>}

      <div className="mt-3">
        <button
          onClick={handleStart}
          disabled={buttonDisabled}
          className={`w-full px-4 py-2 rounded text-white ${
            buttonDisabled ? 'bg-gray-400 cursor-not-allowed' : 'bg-purple-600 hover:bg-purple-700'
          }`}
        >
          {buttonText}
        </button>
      </div>

      {/* Render TrainingHistory component */}
      {projectId && <TrainingHistory projectId={projectId} status={jobStatus} />}
    </div>
  );
}