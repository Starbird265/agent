import React, { useState, useCallback } from 'react';
import { localDB } from '../../lib/localDB';

const LocalFileUpload = ({ projectId, onFileUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);

  const handleDrag = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFiles(e.dataTransfer.files);
    }
  }, []);

  const handleFiles = async (files) => {
    const file = files[0];
    if (!file) return;

    // Validate file type
    const allowedTypes = ['text/csv', 'application/vnd.ms-excel', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'];
    if (!allowedTypes.includes(file.type) && !file.name.endsWith('.csv')) {
      setError('Please upload a CSV or Excel file');
      return;
    }

    // Validate file size (100MB limit for local storage)
    if (file.size > 100 * 1024 * 1024) {
      setError('File size must be less than 100MB');
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError('');
    setUploadProgress(0);
    setAnalysisResult(null);

    try {
      // Simulate upload progress
      for (let i = 0; i <= 50; i += 10) {
        setUploadProgress(i);
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Analyze file if it's CSV
      let fileAnalysis = {};
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        fileAnalysis = await analyzeCSVFile(file);
        setAnalysisResult(fileAnalysis);
      }

      setUploadProgress(80);

      // Save file to local storage
      const savedFile = await localDB.saveDataset(projectId, file, fileAnalysis);
      
      setUploadProgress(100);
      
      // Notify parent component
      if (onFileUploaded) {
        onFileUploaded({
          ...savedFile,
          analysis: fileAnalysis
        });
      }

      setTimeout(() => {
        setUploading(false);
        setUploadProgress(0);
      }, 1000);

    } catch (err) {
      console.error('Upload error:', err);
      setError(err.message || 'Upload failed');
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const analyzeCSVFile = async (file) => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const csv = e.target.result;
          const lines = csv.split('\n').filter(line => line.trim() !== '');
          
          if (lines.length < 2) {
            resolve({ columns: [], rowCount: 0, preview: [] });
            return;
          }

          // Get headers
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Analyze first few rows to determine data types
          const sampleRows = lines.slice(1, Math.min(11, lines.length));
          const columnTypes = {};
          const columnStats = {};
          
          headers.forEach((header, index) => {
            const values = sampleRows
              .map(row => {
                const cells = row.split(',');
                return cells[index] ? cells[index].trim().replace(/"/g, '') : '';
              })
              .filter(val => val !== '');
            
            if (values.length === 0) {
              columnTypes[header] = 'string';
              columnStats[header] = { unique: 0, nulls: sampleRows.length };
              return;
            }

            // Determine type based on sample values
            const numericValues = values.filter(val => !isNaN(val) && !isNaN(parseFloat(val)));
            const isNumeric = numericValues.length > values.length * 0.8;
            const isInteger = isNumeric && numericValues.every(val => Number.isInteger(parseFloat(val)));
            
            if (isInteger) {
              columnTypes[header] = 'integer';
            } else if (isNumeric) {
              columnTypes[header] = 'float';
            } else {
              columnTypes[header] = 'string';
            }

            // Calculate basic stats
            columnStats[header] = {
              unique: new Set(values).size,
              nulls: sampleRows.length - values.length,
              samples: values.slice(0, 5)
            };
          });

          // Create preview data
          const preview = sampleRows.slice(0, 5).map(row => {
            const cells = row.split(',');
            const rowData = {};
            headers.forEach((header, index) => {
              rowData[header] = cells[index] ? cells[index].trim().replace(/"/g, '') : '';
            });
            return rowData;
          });

          resolve({
            columns: headers.map(header => ({
              name: header,
              type: columnTypes[header],
              unique: columnStats[header].unique,
              nulls: columnStats[header].nulls,
              samples: columnStats[header].samples
            })),
            rowCount: lines.length - 1, // Exclude header
            headers,
            preview,
            totalRows: lines.length - 1,
            totalColumns: headers.length
          });
        } catch (error) {
          console.error('CSV analysis error:', error);
          resolve({ columns: [], rowCount: 0, preview: [], error: error.message });
        }
      };
      reader.readAsText(file);
    });
  };

  return (
    <div className="w-full">
      {/* Upload Area */}
      <div
        className={`relative border-2 border-dashed rounded-lg p-8 text-center transition-all duration-200 ${
          dragActive
            ? 'border-blue-500 bg-blue-50'
            : uploading
            ? 'border-green-500 bg-green-50'
            : error
            ? 'border-red-500 bg-red-50'
            : 'border-gray-300 hover:border-gray-400 bg-gray-50'
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
      >
        {uploading ? (
          <div className="space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto"></div>
            <div>
              <p className="text-lg font-medium text-green-700">Processing locally...</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-green-600 mt-1">{uploadProgress}% complete</p>
              {uploadProgress < 60 && (
                <p className="text-xs text-green-500 mt-1">Saving to your device...</p>
              )}
              {uploadProgress >= 60 && uploadProgress < 90 && (
                <p className="text-xs text-green-500 mt-1">Analyzing data structure...</p>
              )}
              {uploadProgress >= 90 && (
                <p className="text-xs text-green-500 mt-1">Finalizing...</p>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="mx-auto">
              {error ? (
                <svg className="w-12 h-12 text-red-500 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"></path>
                </svg>
              ) : (
                <svg className="w-12 h-12 text-gray-400 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
                </svg>
              )}
            </div>
            
            <div>
              <p className="text-lg font-medium text-gray-700">
                {error ? 'Upload Failed' : 'Upload your dataset'}
              </p>
              <p className="text-sm text-gray-500 mt-1">
                {error ? error : 'Drag and drop your CSV file here, or click to select'}
              </p>
              {!error && (
                <p className="text-xs text-green-600 mt-2">
                  🔒 File will be stored locally on your device
                </p>
              )}
            </div>

            {!error && (
              <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                <label className="cursor-pointer bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors font-medium">
                  Choose File
                  <input
                    type="file"
                    className="hidden"
                    accept=".csv,.xlsx,.xls"
                    onChange={(e) => handleFiles(e.target.files)}
                  />
                </label>
                <span className="text-sm text-gray-500">or drag and drop</span>
              </div>
            )}

            {error && (
              <button
                onClick={() => setError('')}
                className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors font-medium"
              >
                Try Again
              </button>
            )}
          </div>
        )}
      </div>

      {/* File Analysis Results */}
      {analysisResult && !error && (
        <div className="mt-6 bg-white border border-gray-200 rounded-lg p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Dataset Analysis</h3>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-blue-600">{analysisResult.totalRows}</div>
              <div className="text-sm text-blue-700">Total Rows</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-green-600">{analysisResult.totalColumns}</div>
              <div className="text-sm text-green-700">Total Columns</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-2xl font-bold text-purple-600">
                {analysisResult.columns.filter(col => col.type === 'float' || col.type === 'integer').length}
              </div>
              <div className="text-sm text-purple-700">Numeric Columns</div>
            </div>
          </div>

          <div className="mb-6">
            <h4 className="font-medium text-gray-700 mb-3">Column Information</h4>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Column</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Unique</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Sample Values</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {analysisResult.columns.slice(0, 10).map((column, index) => (
                    <tr key={index}>
                      <td className="px-4 py-2 text-sm font-medium text-gray-900">{column.name}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                          column.type === 'integer' ? 'bg-blue-100 text-blue-800' :
                          column.type === 'float' ? 'bg-green-100 text-green-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {column.type}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-sm text-gray-500">{column.unique}</td>
                      <td className="px-4 py-2 text-sm text-gray-500">
                        {column.samples && column.samples.slice(0, 3).join(', ')}
                        {column.samples && column.samples.length > 3 && '...'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center">
              <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <span className="text-sm font-medium text-green-800">Privacy Confirmed</span>
            </div>
            <p className="text-sm text-green-700 mt-1">
              Your dataset has been analyzed and stored locally. No data was sent to external servers.
            </p>
          </div>
        </div>
      )}

      {/* File Type Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Supported formats: CSV, Excel (.xlsx, .xls) • Max size: 100MB • Stored locally on your device
        </p>
      </div>
    </div>
  );
};

export default LocalFileUpload;