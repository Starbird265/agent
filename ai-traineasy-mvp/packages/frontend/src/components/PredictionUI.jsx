import React, { useState } from 'react';
import { predict } from '../api';

export default function PredictionUI({ projectId, schema }) {
  const [form, setForm] = useState(
    schema.inputs.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
  );
  const [result, setResult] = useState(null);

  const handleChange = (col, val) => {
    setForm(prev => ({ ...prev, [col]: val }));
  };

  const handlePredict = async () => {
    try {
      const { predictions } = await predict(projectId, form);
      setResult(predictions);
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <div className="mt-6 p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">🔮 Make a Prediction</h2>

      <div className="grid grid-cols-2 gap-4">
        {schema.inputs.map(col => (
          <div key={col}>
            <label className="block text-sm font-medium">{col}</label>
            <input
              type="text"
              value={form[col]}
              onChange={(e) => handleChange(col, e.target.value)}
              className="mt-1 block w-full border px-2 py-1 rounded"
            />
          </div>
        ))}
      </div>

      <button
        onClick={handlePredict}
        className="mt-4 bg-blue-600 text-white px-4 py-2 rounded"
      >
        Run Prediction
      </button>

      {result && (
        <div className="mt-4">
          <p className="font-medium">Predictions:</p>
          <pre className="bg-gray-100 p-2 rounded">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}