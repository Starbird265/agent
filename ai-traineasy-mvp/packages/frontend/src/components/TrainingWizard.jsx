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
    <div className="p-6 rounded-2xl bg-white/90 shadow-lg border border-blue-100 flex flex-col gap-6 mt-8">
      <h2 className="text-xl font-bold mb-2 text-blue-700 flex items-center gap-2">
        <span className="inline-block bg-blue-100 text-blue-700 rounded-full p-2 text-lg">🚀</span>
        Training Controls
      </h2>

      {/* GPU Toggle */}
      {sysInfo?.gpu_available && (
        <label className="flex items-center gap-2 mb-4 text-blue-700 font-medium">
          <input
            type="checkbox"
            checked={useGpu}
            onChange={() => setUseGpu(prev => !prev)}
            className="accent-blue-600 w-5 h-5"
          />
          Use GPU ({sysInfo.gpu_names.join(', ')})
        </label>
      )}

      {/* CPU Slider only if not using GPU */}
      {!useGpu && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-blue-700 mb-1">
            CPU Limit: <span className="font-bold">{cpuPercent}%</span>
          </label>
          <input
            type="range"
            min="10"
            max="100"
            value={cpuPercent}
            onChange={(e) => setCpuPercent(Number(e.target.value))}
            className="w-full accent-blue-600"
          />
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className="text-gray-600">Current status:</span>
        <span className={`font-bold ${status === 'running' ? 'text-green-600' : status === 'paused' ? 'text-yellow-500' : 'text-blue-700'}`}>{status}</span>
      </div>
      <div className="flex flex-wrap gap-3 mt-3">
        <button
          onClick={handleStart}
          disabled={status === 'running'}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 text-white rounded-lg shadow hover:from-purple-700 hover:to-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Start
        </button>
        <button
          onClick={handlePause}
          disabled={status !== 'running'}
          className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow hover:from-yellow-500 hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Pause
        </button>
        <button
          onClick={handleResume}
          disabled={status !== 'paused'}
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Resume
        </button>
      </div>

      {trainingLog && (
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100 text-sm">
          <h3 className="font-semibold mb-2 text-blue-700 flex items-center gap-2">🧠 AutoML Results</h3>
          <p className="mb-2"><strong>Problem:</strong> {trainingLog.problem_type}</p>
          <ul className="list-disc ml-6 mb-2">
            {Object.entries(trainingLog.scores).map(([model, score]) => (
              <li key={model}>
                <span className="font-medium text-blue-900">{model}</span>: <span className="text-blue-700">{score.toFixed(4)}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2">✅ <strong>Selected:</strong> <span className="text-green-700 font-bold">{trainingLog.selected_model}</span></p>
        </div>
      )}
    </div>
  );
}