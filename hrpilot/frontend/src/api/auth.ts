import api from './client';

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  role: 'ADMIN' | 'EMPLOYEE';
  companyId: string;
}

export interface AuthResponse {
  token: string;
  userId: string;
  email: string;
  role: 'ADMIN' | 'EMPLOYEE';
  companyId: string;
}

export const login = async (data: LoginRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/v1/auth/login', data);
  return response.data;
};

export const register = async (data: RegisterRequest): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/v1/auth/register', data);
  return response.data;
};

export const googleLogin = async (credential: string): Promise<AuthResponse> => {
  const response = await api.post<AuthResponse>('/api/v1/auth/google', { credential });
  return response.data;
};
