import React, { useEffect, useState } from 'react';
import { fetchLogs } from '../api';

export default function TrainingFeedback({ projectId }) {
  const [logs, setLogs] = useState('');
  
  useEffect(() => {
    // Poll logs every 2 seconds
    const interval = setInterval(async () => {
      const text = await fetchLogs(projectId);
      setLogs(text);
    }, 2000);
    return () => clearInterval(interval);
  }, [projectId]);

  return (
    <div className="p-6 rounded-2xl bg-black/90 shadow-lg border border-blue-900 flex flex-col gap-4 mt-8">
      <h2 className="font-bold text-lg mb-2 text-green-300 flex items-center gap-2">
        <span className="inline-block bg-green-900/40 text-green-300 rounded-full p-2 text-lg">📋</span>
        Training Logs
      </h2>
      <pre className="bg-black/70 p-4 rounded-xl text-green-200 font-mono text-sm overflow-auto max-h-72 border border-green-900 shadow-inner">
        {logs}
      </pre>
    </div>
  );
}