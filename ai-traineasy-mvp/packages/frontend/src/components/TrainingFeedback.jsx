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
    <div className="mt-6 p-4 border rounded bg-black text-green-200 font-mono text-sm overflow-auto" style={{ maxHeight: '300px' }}>
      <h2 className="font-semibold mb-2">📋 Training Logs</h2>
      <pre>{logs}</pre>
    </div>
  );
}