import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { uploadDataset } from '../api';

export default function DatasetBuilder({ project, onDataLoaded }) {
  const [preview, setPreview] = useState([]);

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    // 1) Persist file to backend
    const result = await uploadDataset(project.id, file);
    if (!result?.success) {
      return alert('Upload failed');
    }
    // 2) Read and preview locally as before
    const text = await file.text();
    let data = [];
    if (file.name.endsWith('.json')) {
      data = JSON.parse(text);
    } else {
      // CSV parsing stub...
      const rows = text.trim().split(/\r?\n/);
      const headers = rows.shift().split(',');
      data = rows.map(row => headers.reduce((o, h, i) => ({ ...o, [h]: row.split(',')[i] }), {}));
    }
    setPreview(data.slice(0, 5));
    onDataLoaded(data);
  }, [project.id, onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <div className="p-6 border-2 border-dashed border-blue-300 rounded-2xl bg-white/80 shadow-lg flex flex-col items-center transition-all duration-200">
      <div {...getRootProps()} className="cursor-pointer p-8 w-full text-center rounded-xl border-2 border-blue-100 bg-gradient-to-br from-blue-50 to-blue-100 hover:shadow-xl transition-all duration-200">
        <input {...getInputProps()} />
        {isDragActive
          ? <p className="text-blue-700 font-semibold text-lg">Drop your file here …</p>
          : <p className="text-gray-500 text-lg">Drag & drop <span className='font-semibold text-blue-600'>CSV/JSON</span> here, or <span className='underline text-blue-600'>click to select</span></p>}
      </div>

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
                    <td key={i} className="px-3 py-2 border-b text-gray-700">{val}</td>
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