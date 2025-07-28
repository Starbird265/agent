import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDataset } from '../api';
import Papa from 'papaparse';

export default function DatasetBuilder({ project, onDataLoaded }) {
  const [preview, setPreview] = useState([]);
  const [error, setError] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    setIsLoading(true);
    setError(null);

    try {
      // 1) Persist file to backend
      const result = await uploadDataset(project.id, file);
      if (!result?.success) {
        throw new Error(result?.error || 'Upload failed');
      }

      // 2) Read and preview locally
      const text = await file.text();
      let data = [];
      if (file.name.endsWith('.json')) {
        data = JSON.parse(text);
      } else if (file.name.endsWith('.csv')) {
        const parsed = Papa.parse(text, { header: true });
        data = parsed.data;
      } else {
        throw new Error('Unsupported file type. Please upload a CSV or JSON file.');
      }
      setPreview(data.slice(0, 5));
      onDataLoaded(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, [project.id, onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop, disabled: isLoading });

  return (
    <div className="p-6 border-2 border-dashed border-blue-300 rounded-2xl bg-white/80 shadow-lg flex flex-col items-center transition-all duration-200">
      <div {...getRootProps()} className={`cursor-pointer p-8 w-full text-center rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-200 ${isLoading ? 'opacity-50' : ''}`}>
        <input {...getInputProps()} />
        {isLoading ? (
          <div className="flex items-center justify-center">
            <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-blue-700" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <p className="text-blue-700 font-semibold text-lg">Processing...</p>
          </div>
        ) : isDragActive ? (
          <p className="text-blue-700 font-semibold text-lg">Drop your file here …</p>
        ) : (
          <p className="text-gray-500 text-lg">Drag & drop <span className='font-semibold text-blue-600'>CSV/JSON</span> here, or <span className='underline text-blue-600'>click to select</span></p>
        )}
      </div>

      {error && (
        <div className="w-full mt-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded-lg">
          <p><strong>Error:</strong> {error}</p>
        </div>
      )}

      {preview.length > 0 && (
        <div className="w-full mt-6 overflow-x-auto">
          <table className="table-auto w-full text-sm rounded-xl overflow-hidden shadow border border-blue-100 bg-white">
            <thead className="bg-blue-50">
              <tr>
                {Object.keys(preview[0]).map(col => (
                  <th key={col} className="px-3 py-2 border-b text-blue-700 font-semibold">{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {preview.map((row, idx) => (
                <tr key={idx} className="even:bg-blue-50">
                  {Object.values(row).map((val, i) => (
                    <td key={i} className="px-3 py-2 border-b text-gray-700">{String(val)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}