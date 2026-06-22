import React, { useState, useCallback } from 'react';
import NavBar from '../components/NavBar';
import { uploadDocument, getDocuments, PolicyDocument } from '../api/documents';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

/**
 * Admin page for uploading and managing HR policy documents.
 * Only visible to ADMIN users (enforced in NavBar and by the backend).
 *
 * Beginners' note:
 * @tanstack/react-query handles data fetching with:
 * - useQuery: fetches data and caches it; auto-refetches when stale
 * - useMutation: handles POST/PUT/DELETE operations; invalidates the cache on success
 */
const AdminPage: React.FC = () => {
  const [dragOver, setDragOver] = useState(false);
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
    refetchInterval: 5000,  // poll every 5s to pick up status changes (PROCESSING → INDEXED)
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadDocument(file),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
    },
  });

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && file.type === 'application/pdf') {
      uploadMutation.mutate(file);
    }
  }, [uploadMutation]);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) uploadMutation.mutate(file);
  };

  const statusBadge = (status: PolicyDocument['status']) => {
    const colors: Record<string, string> = {
      PENDING: 'bg-yellow-100 text-yellow-700',
      PROCESSING: 'bg-blue-100 text-blue-700',
      INDEXED: 'bg-green-100 text-green-700',
      FAILED: 'bg-red-100 text-red-700',
    };
    const icons: Record<string, string> = {
      PENDING: '⏳', PROCESSING: '🔄', INDEXED: '✅', FAILED: '❌'
    };
    return (
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${colors[status]}`}>
        {icons[status]} {status}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <NavBar />
      <div className="max-w-4xl mx-auto w-full px-4 py-6">
        <h2 className="text-xl font-semibold text-gray-800 mb-6">📄 Policy Document Management</h2>

        {/* Upload zone */}
        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          className={`border-2 border-dashed rounded-2xl p-10 text-center mb-8 transition ${
            dragOver ? 'border-blue-500 bg-blue-50' : 'border-gray-300 bg-white'
          }`}
        >
          <p className="text-gray-500 mb-2">Drag & drop a PDF here, or</p>
          <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg text-sm font-medium transition">
            Browse File
            <input type="file" accept=".pdf" className="hidden" onChange={handleFileInput} />
          </label>
          {uploadMutation.isPending && (
            <p className="mt-3 text-blue-600 text-sm animate-pulse">Uploading and starting ingestion...</p>
          )}
          {uploadMutation.isSuccess && (
            <p className="mt-3 text-green-600 text-sm">✅ Upload successful! Processing in background.</p>
          )}
          {uploadMutation.isError && (
            <p className="mt-3 text-red-600 text-sm">❌ Upload failed. Check that you have ADMIN role.</p>
          )}
        </div>

        {/* Documents table */}
        <div className="bg-white rounded-2xl shadow overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
              <tr>
                <th className="text-left px-4 py-3">Document</th>
                <th className="text-left px-4 py-3">Status</th>
                <th className="text-left px-4 py-3">Chunks</th>
                <th className="text-left px-4 py-3">Uploaded</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {isLoading && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">Loading...</td></tr>
              )}
              {!isLoading && documents.length === 0 && (
                <tr><td colSpan={4} className="text-center py-8 text-gray-400">No documents uploaded yet.</td></tr>
              )}
              {documents.map((doc) => (
                <tr key={doc.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium text-gray-800">{doc.originalName}</td>
                  <td className="px-4 py-3">{statusBadge(doc.status)}</td>
                  <td className="px-4 py-3 text-gray-500">{doc.chunkCount || '-'}</td>
                  <td className="px-4 py-3 text-gray-400">
                    {new Date(doc.uploadedAt).toLocaleDateString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminPage;
