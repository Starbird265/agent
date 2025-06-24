import React, { useState, useEffect } from 'react';
import { startTraining, pauseTraining, resumeTraining, fetchSystemInfo } from '../api';
import { fetchTrainingLog } from '../api';

export default function TrainingWizard({ projectId, schema }) {
  const [status, setStatus] = useState('idle');
  const [cpuPercent, setCpuPercent] = useState(100);
  const [useGpu, setUseGpu] = useState(false);
  const [sysInfo, setSysInfo] = useState(null);
  const [trainingLog, setTrainingLog] = useState(null);

  useEffect(() => {
    fetchSystemInfo().then(setSysInfo);
  }, []);

  const handleStart = async () => {
    setStatus('starting...');
    await startTraining(projectId, cpuPercent, useGpu).then(() => {
      setStatus('running');
      setTimeout(() => fetchTrainingLog(projectId).then(setTrainingLog), 2000);
    });
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

      {/* GPU Toggle */}
      {sysInfo?.gpu_available && (
        <label className="flex items-center gap-2 mb-4">
          <input
            type="checkbox"
            checked={useGpu}
            onChange={() => setUseGpu(prev => !prev)}
          />
          Use GPU ({sysInfo.gpu_names.join(', ')})
        </label>
      )}

      {/* CPU Slider only if not using GPU */}
      {!useGpu && (
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
      )}

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
{trainingLog && (
  <div className="mt-4 p-3 bg-gray-50 rounded border text-sm">
    <h3 className="font-semibold mb-1">🧠 AutoML Results</h3>
    <p><strong>Problem:</strong> {trainingLog.problem_type}</p>
    <ul className="list-disc ml-6">
      {Object.entries(trainingLog.scores).map(([model, score]) => (
        <li key={model}>
          {model}: {score.toFixed(4)}
        </li>
      ))}
    </ul>
    <p className="mt-2">✅ <strong>Selected:</strong> {trainingLog.selected_model}</p>
  </div>
)}