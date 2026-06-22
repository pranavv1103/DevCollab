import api from './client';

export interface ChatRequest {
  question: string;
  sessionId?: string;
}

export interface ChatResponse {
  sessionId: string;
  messageId: string;
  answer: string;
  sources: string;
  cacheHit: boolean;
}

export interface ChatSession {
  id: string;
  userId: string;
  companyId: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sessionId: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
  sources?: string;
  createdAt: string;
  cacheHit: boolean;
}

export const sendMessage = async (data: ChatRequest): Promise<ChatResponse> => {
  const response = await api.post<ChatResponse>('/api/v1/chat/message', data);
  return response.data;
};

export const getSessions = async (): Promise<ChatSession[]> => {
  const response = await api.get<ChatSession[]>('/api/v1/chat/sessions');
  return response.data;
};

export const getMessages = async (sessionId: string): Promise<ChatMessage[]> => {
  const response = await api.get<ChatMessage[]>(`/api/v1/chat/sessions/${sessionId}/messages`);
  return response.data;
};

export interface AgentRequest {
  question: string;
  context?: string;
}

export const askAgent = async (data: AgentRequest): Promise<{ answer: string }> => {
  const response = await api.post<{ answer: string }>('/api/v1/agent/ask', data);
  return response.data;
};
