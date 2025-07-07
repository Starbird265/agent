import React, { useState, useRef } from 'react';

const TrainingWizard = React.memo(function TrainingWizard({ projectId, schema }) {
  const [status, setStatus] = useState('idle');
  const [cpuPercent, setCpuPercent] = useState(100);
  const [useGpu, setUseGpu] = useState(false);
  const [trainingLog, setTrainingLog] = useState(null);
  const [isExpanded, setIsExpanded] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef();
  const lastAction = useRef();

  // Simulate training process offline
  const handleStart = () => {
    setStatus('starting...');
    setIsLoading(true);
    setTrainingLog(null);
    setTimeout(() => {
      setStatus('running');
      // Simulate log and results
      let progress = 0;
      let fakeScores = {
        'RandomForest': Math.random() * 0.2 + 0.7,
        'XGBoost': Math.random() * 0.2 + 0.7,
        'LightGBM': Math.random() * 0.2 + 0.7,
        'LogisticRegression': Math.random() * 0.2 + 0.6
      };
      let selectedModel = Object.entries(fakeScores).sort((a, b) => b[1] - a[1])[0][0];
      const logObj = {
        problem_type: 'classification',
        scores: fakeScores,
        selected_model: selectedModel
      };
      setTrainingLog(logObj);
      setTimeout(() => {
        setStatus('completed');
        setIsLoading(false);
        // Save a mock model to localStorage
        localStorage.setItem(`model_${projectId}`, JSON.stringify({ trained: true, schema, selectedModel, date: new Date().toISOString() }));
      }, 2000);
    }, 1200);
  };

  const handlePause = () => {
    setStatus('paused');
    // For demo, just pause the UI
  };

  const handleResume = () => {
    setStatus('running');
    // For demo, just resume the UI
  };

  return (
    <div className="p-6 rounded-2xl bg-white/90 shadow-lg border border-blue-100 flex flex-col gap-6 mt-8">
      <h2 className="text-xl font-bold mb-2 text-blue-700 flex items-center gap-2">
        <span className="inline-block bg-blue-100 text-blue-700 rounded-full p-2 text-lg">🚀</span>
        Training Controls
      </h2>

      {/* GPU Toggle (simulated) */}
      <div className="flex items-center gap-2 mb-2">
        <input type="checkbox" id="gpu" checked={useGpu} onChange={e => setUseGpu(e.target.checked)} />
        <label htmlFor="gpu" className="text-sm text-gray-700">Use GPU (simulated)</label>
      </div>
      {/* CPU Slider only if not using GPU */}
      {!useGpu && (
        <div className="mb-4">
          <label className="block text-sm font-medium text-blue-700 mb-1" htmlFor="cpu-slider">
            CPU Limit: <span className="font-bold">{cpuPercent}%</span>
          </label>
          <input
            id="cpu-slider"
            type="range"
            min="10"
            max="100"
            value={cpuPercent}
            onChange={(e) => setCpuPercent(Number(e.target.value))}
            className="w-full accent-blue-600"
            aria-describedby="cpu-description"
          />
          <div id="cpu-description" className="sr-only">
            Select percentage of CPU cores to use for training
          </div>
        </div>
      )}

      <div className="flex items-center gap-4">
        <span className="text-gray-600">Current status:</span>
        <span className={`font-bold ${status === 'running' ? 'text-green-600 running-pulse' : status === 'paused' ? 'text-yellow-500' : 'text-blue-700'}`}>
  {status}
  {status === 'running' && <span className="ml-2">▶</span>}
</span>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-3 w-full">
        <button
          aria-label="Start training session"
          onClick={handleStart}
          disabled={status === 'running' || isLoading}
          className="px-6 py-2 bg-gradient-to-r from-purple-600 to-indigo-500 text-white rounded-lg shadow-lg hover:shadow-xl hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-[1.03] active:scale-95 transform-gpu"
          style={{ transform: 'translateZ(0)' }}
        >
          {isLoading ? (
            <div className="inline-flex items-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>Starting</span>
            </div>
          ) : 'Start'}
        </button>
        <button
          onClick={handlePause}
          disabled={status !== 'running'}
          className="px-6 py-2 bg-gradient-to-r from-yellow-400 to-yellow-500 text-white rounded-lg shadow-lg hover:shadow-xl hover:to-yellow-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-[1.03] active:scale-95 transform-gpu"
        >
          Pause
        </button>
        <button
          onClick={handleResume}
          disabled={status !== 'paused'}
          className="px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow-lg hover:shadow-xl hover:to-emerald-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 ease-out hover:scale-[1.03] active:scale-95 transform-gpu"
        >
          Resume
        </button>
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg animate-fade-in">
          <div className="flex justify-between items-center">
            <p className="text-red-600 font-medium">🚨 Error: {error}</p>
            <button
              onClick={() => lastAction.current?.()}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors text-sm font-medium"
            >
              Retry
            </button>
          </div>
          <p className="mt-3 text-red-500 text-sm">Check your resources and try again</p>
        </div>
      )}

      {trainingLog && (
        <div className="mt-6 bg-blue-50 rounded-xl border border-blue-100 overflow-hidden transition-all duration-300">
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-full p-4 text-left flex items-center justify-between hover:bg-blue-100 transition-colors"
          >
            <h3 className="font-semibold text-blue-700 flex items-center gap-2">
              🧠 AutoML Results
              <span className="text-blue-400 text-sm font-normal">({Object.keys(trainingLog.scores).length} models)</span>
            </h3>
            <svg className={`w-5 h-5 transform transition-transform ${isExpanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          <div className={`px-4 pb-4 text-sm ${isExpanded ? 'animate-slide-down' : 'hidden'}`}>
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
        </div>
      )}
    </div>
  );
});

export default TrainingWizard;