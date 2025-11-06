'use client';

import { useState } from 'react';

interface Material {
  id: string;
  file_name: string;
  file_size: number;
  category: string;
  created_at: string;
  visibility?: string;
  is_owner?: boolean;
  owner?: { full_name: string; email: string };
}

interface KnowledgeTabProps {
  materials: Material[];
  onFileUpload: (event: React.ChangeEvent<HTMLInputElement>) => Promise<void>;
  onDeleteMaterial: (id: string) => Promise<void>;
  uploadingFile: boolean;
  uploadMessage: string;
  uploadMessageType: 'success' | 'error' | '';
}

export default function KnowledgeTab({ 
  materials, 
  onFileUpload, 
  onDeleteMaterial,
  uploadingFile,
  uploadMessage,
  uploadMessageType
}: KnowledgeTabProps) {
  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <div className="bg-white rounded-lg border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Knowledge Base Materials</h3>
        <p className="text-sm text-gray-600 mb-4">
          Upload PDFs, presentations, or documents that contain sales guides, product information, or company materials. 
          The AI will use this information to provide better assistance.
        </p>
        
        {uploadMessage && (
          <div className={`mb-4 p-3 rounded-lg border text-sm ${
            uploadMessageType === 'success' 
              ? 'bg-green-50 text-green-800 border-green-200' 
              : 'bg-red-50 text-red-800 border-red-200'
          }`}>
            {uploadMessage}
          </div>
        )}
        
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-[#F95B14] transition-colors">
          <input
            type="file"
            accept=".pdf,.docx,.txt,.pptx"
            className="hidden"
            id="knowledge-upload"
            onChange={onFileUpload}
            disabled={uploadingFile}
          />
          <label htmlFor="knowledge-upload" className="cursor-pointer">
            {uploadingFile ? (
              <>
                <div className="relative w-16 h-16 mx-auto mb-3">
                  <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-gray-200"></div>
                  <div className="absolute top-0 left-0 w-full h-full rounded-full border-4 border-transparent border-t-[#F95B14] animate-spin"></div>
                </div>
                <p className="text-sm font-medium text-gray-900">Uploading...</p>
              </>
            ) : (
              <>
                <svg className="w-12 h-12 mx-auto mb-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                <p className="text-sm font-medium text-gray-900">Click to upload files</p>
                <p className="text-xs text-gray-500 mt-1">PDF, DOCX, TXT, PPTX (Max 10MB)</p>
              </>
            )}
          </label>
        </div>
      </div>

      {/* Materials List */}
      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Uploaded Materials ({materials.length})</h3>
        </div>
        <div className="divide-y divide-gray-200">
          {materials.length === 0 && (
            <div className="px-6 py-8 text-center text-gray-500">
              <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm">No materials uploaded yet</p>
              <p className="text-xs mt-1">Upload your first document above</p>
            </div>
          )}
          {materials.map((material) => (
            <div key={material.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition-colors">
              <div className="flex items-center gap-4 flex-1">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{material.file_name}</p>
                    {material.visibility && (
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        material.visibility === 'organization' ? 'bg-green-100 text-green-700' :
                        material.visibility === 'team' ? 'bg-blue-100 text-blue-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {material.visibility === 'organization' ? '🌐 Org' :
                         material.visibility === 'team' ? '👥 Team' :
                         '🔒 Private'}
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-gray-500">
                    {material.category} • {(material.file_size / 1024).toFixed(1)} KB • {new Date(material.created_at).toLocaleDateString()}
                  </p>
                  {material.owner && !material.is_owner && (
                    <p className="text-xs text-gray-400 mt-1">
                      By: {material.owner.full_name || material.owner.email}
                    </p>
                  )}
                </div>
              </div>
              {material.is_owner && (
                <button
                  onClick={() => onDeleteMaterial(material.id)}
                  className="text-red-600 hover:text-red-800 transition-colors"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </button>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

