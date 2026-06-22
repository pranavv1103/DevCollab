import api from './client';

export interface PolicyDocument {
  id: string;
  fileName: string;
  originalName: string;
  companyId: string;
  status: 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED';
  uploadedAt: string;
  chunkCount: number;
}

export const getDocuments = async (): Promise<PolicyDocument[]> => {
  const response = await api.get<PolicyDocument[]>('/api/v1/documents');
  return response.data;
};

export const uploadDocument = async (file: File): Promise<PolicyDocument> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post<PolicyDocument>('/api/v1/documents/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return response.data;
};

export const getDocumentStatus = async (id: string): Promise<PolicyDocument> => {
  const response = await api.get<PolicyDocument>(`/api/v1/documents/${id}/status`);
  return response.data;
};
