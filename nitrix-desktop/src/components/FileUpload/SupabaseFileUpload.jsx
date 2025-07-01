import React, { useState, useCallback } from 'react';
import { storage, db, auth } from '../../lib/supabase';

const SupabaseFileUpload = ({ projectId, onFileUploaded }) => {
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [error, setError] = useState('');
  const [dragActive, setDragActive] = useState(false);

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

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setError('File size must be less than 10MB');
      return;
    }

    await uploadFile(file);
  };

  const uploadFile = async (file) => {
    setUploading(true);
    setError('');
    setUploadProgress(0);

    try {
      const user = await auth.getCurrentUser();
      if (!user) {
        throw new Error('User not authenticated');
      }

      // Create unique file path
      const timestamp = Date.now();
      const filePath = `${user.id}/${projectId}/${timestamp}_${file.name}`;

      // Upload file to Supabase Storage
      const { data: uploadData, error: uploadError } = await storage.uploadFile(
        'project-files', 
        filePath, 
        file
      );

      if (uploadError) throw uploadError;

      // Analyze file if it's CSV
      let fileAnalysis = {};
      if (file.type === 'text/csv' || file.name.endsWith('.csv')) {
        fileAnalysis = await analyzeCSVFile(file);
      }

      // Save file metadata to database
      const fileMetadata = {
        project_id: projectId,
        user_id: user.id,
        filename: file.name,
        file_path: filePath,
        file_size: file.size,
        mime_type: file.type,
        columns_info: fileAnalysis.columns || null,
        row_count: fileAnalysis.rowCount || null
      };

      const { data: dbData, error: dbError } = await db.files.create(fileMetadata);
      
      if (dbError) throw dbError;

      // Get public URL for the file
      const publicUrl = storage.getPublicUrl('project-files', filePath);

      setUploadProgress(100);
      
      // Notify parent component
      if (onFileUploaded) {
        onFileUploaded({
          ...dbData[0],
          publicUrl: publicUrl.data.publicUrl,
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
          const lines = csv.split('\n');
          
          if (lines.length < 2) {
            resolve({ columns: [], rowCount: 0 });
            return;
          }

          // Get headers
          const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
          
          // Analyze first few rows to determine data types
          const sampleRows = lines.slice(1, Math.min(6, lines.length));
          const columnTypes = {};
          
          headers.forEach((header, index) => {
            const values = sampleRows
              .map(row => row.split(',')[index])
              .filter(val => val && val.trim() !== '');
            
            if (values.length === 0) {
              columnTypes[header] = 'string';
              return;
            }

            // Determine type based on sample values
            const isNumeric = values.every(val => !isNaN(val) && !isNaN(parseFloat(val)));
            const isInteger = isNumeric && values.every(val => Number.isInteger(parseFloat(val)));
            
            if (isInteger) {
              columnTypes[header] = 'integer';
            } else if (isNumeric) {
              columnTypes[header] = 'float';
            } else {
              columnTypes[header] = 'string';
            }
          });

          resolve({
            columns: headers.map(header => ({
              name: header,
              type: columnTypes[header],
              nullable: true
            })),
            rowCount: lines.length - 1, // Exclude header
            headers
          });
        } catch (error) {
          console.error('CSV analysis error:', error);
          resolve({ columns: [], rowCount: 0 });
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
              <p className="text-lg font-medium text-green-700">Uploading...</p>
              <div className="w-full bg-green-200 rounded-full h-2 mt-2">
                <div
                  className="bg-green-600 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${uploadProgress}%` }}
                ></div>
              </div>
              <p className="text-sm text-green-600 mt-1">{uploadProgress}% complete</p>
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

      {/* File Type Info */}
      <div className="mt-4 text-center">
        <p className="text-xs text-gray-500">
          Supported formats: CSV, Excel (.xlsx, .xls) • Max size: 10MB
        </p>
      </div>
    </div>
  );
};

export default SupabaseFileUpload;