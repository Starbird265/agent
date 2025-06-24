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
    <div className="mt-6 p-4 border rounded bg-white shadow">
      <h2 className="text-lg font-semibold mb-2">🧩 Label Columns</h2>
      <div className="mb-4">
        <label className="font-medium">Input Columns:</label>
        <div className="flex flex-wrap gap-2 mt-1">
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
              className={`px-3 py-1 border rounded ${
                inputs.includes(col)
                  ? 'bg-blue-500 text-white'
                  : 'bg-gray-100'
              }`}
            >
              {col}
            </button>
          ))}
        </div>
      </div>

      <div className="mb-4">
        <label className="font-medium">Output Column:</label>
        <select
          className="ml-2 border px-2 py-1 rounded"
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
        className="bg-green-600 text-white px-4 py-2 rounded"
      >
        Save Schema
      </button>
    </div>
  );
};

export default LabelingTool;