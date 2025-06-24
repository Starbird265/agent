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
    <div className="p-4 border-2 border-dashed rounded">
      <div {...getRootProps()} className="cursor-pointer p-6 text-center">
        <input {...getInputProps()} />
        {isDragActive
          ? <p>Drop your file here …</p>
          : <p>Drag & drop CSV/JSON here, or click to select</p>}
      </div>

      {preview.length > 0 && (
        <table className="table-auto w-full mt-4 text-sm">
          <thead>
            <tr>
              {Object.keys(preview[0]).map(col => (
                <th key={col} className="px-2 py-1 border">{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {preview.map((row, idx) => (
              <tr key={idx}>
                {Object.values(row).map((val, i) => (
                  <td key={i} className="px-2 py-1 border">{val}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}