import React, { useState } from 'react';
import { startTraining, pauseTraining, resumeTraining } from '../api';

export default function TrainingWizard({ projectId, schema }) {
  const [status, setStatus] = useState('idle');
  const [cpuPercent, setCpuPercent] = useState(100);

  const handleStart = async () => {
    setStatus('starting...');
    await startTraining(projectId, cpuPercent);
    setStatus('running');
  };
  const handlePause = async () => {
    await pauseTraining(projectId);
    setStatus('paused');
  };
  const handleResume = async () => {
    await resumeTraining(projectId);
    setStatus('running');
  };

  return (
    <div className="mt-6 p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">🚀 Training Controls</h2>

      {/* CPU slider */}
      <div className="mb-4">
        <label className="block text-sm font-medium">
          CPU Limit: {cpuPercent}%
        </label>
        <input
          type="range"
          min="10"
          max="100"
          value={cpuPercent}
          onChange={(e) => setCpuPercent(Number(e.target.value))}
          className="w-full"
        />
      </div>

      <p>Current status: <strong>{status}</strong></p>
      <div className="space-x-2 mt-3">
        <button
          onClick={handleStart}
          disabled={status === 'running'}
          className="bg-purple-600 text-white px-4 py-2 rounded"
        >
          Start
        </button>
        <button
          onClick={handlePause}
          disabled={status !== 'running'}
          className="bg-yellow-500 text-white px-4 py-2 rounded"
        >
          Pause
        </button>
        <button
          onClick={handleResume}
          disabled={status !== 'paused'}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Resume
        </button>
      </div>
    </div>
  );
}