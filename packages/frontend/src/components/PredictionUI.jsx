import React, { useState } from 'react';

export default function PredictionUI({ projectId, schema }) {
  const [form, setForm] = useState(
    schema.inputs.reduce((acc, col) => ({ ...acc, [col]: '' }), {})
  );
  const [result, setResult] = useState(null);

  const handleChange = (col, val) => {
    setForm(prev => ({ ...prev, [col]: val }));
  };

  const handlePredict = () => {
    // Simulate prediction using the mock model from localStorage
    const model = JSON.parse(localStorage.getItem(`model_${projectId}`) || '{}');
    if (!model.trained) {
      setResult({ error: 'No trained model found. Please train a model first.' });
      return;
    }
    // For demo, just echo the input and selected model
    setResult({
      input: { ...form },
      model: model.selectedModel || 'DemoModel',
      prediction: 'DemoResult',
      info: 'This is a simulated prediction. Replace with real logic for production.'
    });
  };

  return (
    <div className="p-6 rounded-2xl bg-white/90 shadow-lg border border-blue-100 flex flex-col gap-6 mt-8">
      <h2 className="text-xl font-bold mb-2 text-blue-700 flex items-center gap-2">
        <span className="inline-block bg-blue-100 text-blue-700 rounded-full p-2 text-lg">🔮</span>
        Make a Prediction
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {schema.inputs.map(col => (
          <div key={col} className="flex flex-col gap-1">
            <label className="block text-sm font-medium text-blue-700">{col}</label>
            <input
              type="text"
              value={form[col]}
              onChange={(e) => handleChange(col, e.target.value)}
              className="mt-1 block w-full border border-blue-200 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-200 text-base shadow-sm"
              placeholder={`Enter ${col}`}
            />
          </div>
        ))}
      </div>

      <button
        onClick={handlePredict}
        className="mt-4 px-6 py-2 bg-gradient-to-r from-blue-600 to-indigo-500 text-white rounded-lg shadow hover:from-blue-700 hover:to-indigo-600 font-semibold text-lg"
      >
        Run Prediction
      </button>

      {result && (
        <div className="mt-6 p-4 bg-blue-50 rounded-xl border border-blue-100">
          <p className="font-medium text-blue-700 mb-1">Predictions:</p>
          <pre className="bg-blue-100 p-2 rounded text-blue-900 text-sm overflow-x-auto">{JSON.stringify(result, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}