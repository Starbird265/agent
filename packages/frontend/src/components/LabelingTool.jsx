import React, { useEffect, useState } from 'react';

const LabelingTool = ({ data, onSchemaSave }) => {
  const [columns, setColumns] = useState([]);
  const [inputs, setInputs] = useState([]);
  const [output, setOutput] = useState('');

  useEffect(() => {
    if (data.length > 0) {
      setColumns(Object.keys(data[0]));
    }
  }, [data]);

  const handleSubmit = () => {
    if (inputs.length && output) {
      onSchemaSave({ inputs, output });
    } else {
      alert('Please select at least one input and one output column.');
    }
  };

  return (
    <div className="p-6 rounded-2xl bg-white/90 shadow-lg border border-blue-100 flex flex-col gap-6 mt-8">
      <h2 className="text-xl font-bold mb-2 text-blue-700 flex items-center gap-2">
        <span className="inline-block bg-blue-100 text-blue-700 rounded-full p-2 text-lg">🧩</span>
        Label Columns
      </h2>
      <div className="mb-4">
        <label className="font-semibold text-gray-700">Input Columns:</label>
        <div className="flex flex-wrap gap-2 mt-2">
          {columns.map(col => (
            <button
              key={col}
              onClick={() =>
                setInputs(prev =>
                  prev.includes(col)
                    ? prev.filter(c => c !== col)
                    : [...prev, col]
                )
              }
              className={`px-4 py-2 rounded-lg border transition-all duration-150 font-medium shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-200 ${
                inputs.includes(col)
                  ? 'bg-blue-600 text-white border-blue-600 shadow-md'
                  : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="font-semibold text-gray-700">Output Column:</label>
        <select
          className="ml-2 border border-blue-200 px-3 py-2 rounded-lg bg-white focus:ring-2 focus:ring-blue-200"
          value={output}
          onChange={e => setOutput(e.target.value)}
        >
          <option value="">Select column</option>
          {columns.map(col => (
            <option key={col} value={col}>
              {col}
            </option>
          ))}
        </select>
      </div>

      <button
        onClick={handleSubmit}
        className="mt-2 px-6 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg shadow hover:from-green-600 hover:to-emerald-600 font-semibold text-lg"
      >
        Save Schema
      </button>
    </div>
  );
};

export default LabelingTool;