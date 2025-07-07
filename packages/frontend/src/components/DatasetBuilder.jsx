
import { useCallback, useState } from 'react';
import { useDropzone } from 'react-dropzone';
import { motion } from 'framer-motion';
import ModernCard from './UI/ModernCard';
import ModernButton from './UI/ModernButton';

export default function DatasetBuilder({ project, onDataLoaded }) {

  const [preview, setPreview] = useState([]);

  // Helper to persist dataset in localStorage by project id
  const saveDatasetOffline = (projectId, data) => {
    try {
      localStorage.setItem(`dataset_${projectId}`, JSON.stringify(data));
    } catch (e) {
      if (e.name === 'QuotaExceededError') {
        alert('Storage quota exceeded. Please clear some browser data or use a smaller dataset.');
      } else {
        console.error('Failed to save dataset:', e);
        alert('Failed to save dataset locally: ' + e.message);
      }
    }
  };

  const onDrop = useCallback(async (acceptedFiles) => {
    const file = acceptedFiles[0];
    // Read and preview locally
    const text = await file.text();
    let data = [];
    if (file.name.endsWith('.json')) {
      data = JSON.parse(text);
    } else {
      // CSV parsing with better handling of quoted fields
      const lines = text.trim().split(/\r?\n/);
      const headers = lines[0].split(',').map(h => h.trim().replace(/^"|"$/g, ''));
      data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        return headers.reduce((obj, header, index) => {
          obj[header] = values[index] || '';
          return obj;
        }, {});
      });
    }
    setPreview(data.slice(0, 5));
    saveDatasetOffline(project.id, data);
    
    // Store raw CSV text for real ML engine
    localStorage.setItem(`csvData_${project.id}`, text);
    
    onDataLoaded(data, text); // Pass both parsed data and raw text
  }, [project.id, onDataLoaded]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({ onDrop });

  return (
    <ModernCard className="p-6" glow={preview.length > 0}>
      <motion.div
        {...getRootProps()}
        className={`
          cursor-pointer p-8 w-full text-center rounded-xl border-2 border-dashed
          transition-all duration-300 ease-out
          ${isDragActive 
            ? 'border-blue-500 bg-blue-50 shadow-lg' 
            : 'border-gray-300 bg-gradient-to-br from-gray-50 to-gray-100 hover:border-blue-400 hover:bg-blue-50'
          }
        `}
        whileHover={{ scale: 1.01 }}
        whileTap={{ scale: 0.99 }}
      >
        <input {...getInputProps()} />
        
        <div className="space-y-4">
          <motion.div
            className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center"
            animate={{ 
              rotate: isDragActive ? 360 : 0,
              scale: isDragActive ? 1.1 : 1
            }}
            transition={{ duration: 0.5 }}
          >
            <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </motion.div>
          
          {isDragActive ? (
            <div className="space-y-2">
              <p className="text-blue-700 font-semibold text-lg">Drop your file here!</p>
              <p className="text-blue-600 text-sm">CSV and JSON files supported</p>
            </div>
          ) : (
            <div className="space-y-2">
              <p className="text-gray-700 text-lg font-medium">
                Drag & drop your dataset here
              </p>
              <p className="text-gray-500 text-sm">
                or <span className="text-blue-600 font-semibold underline">click to browse</span>
              </p>
              <div className="flex justify-center space-x-4 mt-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                  📊 CSV
                </span>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                  📋 JSON
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {preview.length > 0 && (
        <motion.div 
          className="w-full mt-8 space-y-4"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 flex items-center">
              <span className="text-green-500 mr-2">✅</span>
              Dataset Preview
            </h3>
            <span className="text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              Showing first 5 rows
            </span>
          </div>
          
          <div className="overflow-x-auto rounded-xl shadow-lg border border-gray-200">
            <table className="table-auto w-full text-sm bg-white">
              <thead className="bg-gradient-to-r from-blue-50 to-purple-50">
                <tr>
                  {Object.keys(preview[0]).map((key, index) => (
                    <th key={key} className="px-6 py-4 text-left font-semibold text-gray-700 border-b border-gray-200">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">
                          {index + 1}
                        </span>
                        <span>{key}</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.map((row, index) => (
                  <motion.tr 
                    key={index} 
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: index * 0.1 }}
                  >
                    {Object.values(row).map((val, i) => (
                      <td key={i} className="px-6 py-4 text-gray-700">
                        <span className="inline-block max-w-xs truncate">
                          {val}
                        </span>
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
          
          <div className="flex justify-center">
            <ModernButton 
              variant="success" 
              icon="🚀"
              className="shadow-lg"
            >
              Dataset Ready - Start Training!
            </ModernButton>
          </div>
        </motion.div>
      )}
    </ModernCard>
  );
}