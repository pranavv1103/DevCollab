import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// Set header immediately on module load so any early API calls are authenticated
const _savedToken = localStorage.getItem('token');
if (_savedToken) {
  // Check token expiry before using it
  try {
    const _payload = JSON.parse(atob(_savedToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (_payload.exp && _payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      axios.defaults.headers.common['Authorization'] = `Bearer ${_savedToken}`;
    }
  } catch {
    axios.defaults.headers.common['Authorization'] = `Bearer ${_savedToken}`;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) return null;
    try {
      const payload = JSON.parse(atob(savedToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    } catch { /* keep token if parse fails */ }
    return savedToken;
  });
  const [loading, setLoading] = useState(true);

  // Intercept 401 responses globally — force logout when JWT expires.
  // Only fires when a token already exists to avoid false-positive logouts
  // caused by the brief window between login() and the useEffect([token]) run.
  useEffect(() => {
    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const isAuthRoute = error.config?.url?.includes('/api/auth/');
        const hasToken = !!localStorage.getItem('token');
        if (error.response?.status === 401 && hasToken && !isAuthRoute) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      if (!user) {
        try {
          const savedUser = localStorage.getItem('user');
          if (savedUser) setUser(JSON.parse(savedUser));
        } catch { /* ignore */ }
      }
    } else {
      delete axios.defaults.headers.common['Authorization'];
      setUser(null);
    }
    setLoading(false);
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://localhost:9090/api/auth/login', { username, password });
      const userData = { ...res.data, id: res.data.id };
      // Set header immediately so any API calls fired on navigation are authenticated.
      // Do NOT wait for the useEffect([token]) to run — it's too late.
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(res.data.token);
      setUser(userData);
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post('http://localhost:9090/api/auth/register', { username, email, password });
      return { success: true };
    } catch (error) {
      console.error("Registration failed", error);
      return { success: false, message: error.response?.data?.message || "Registration failed." };
    }
  };

  const updateUser = (updated) => {
    const newUser = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, token, login, logout, register, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
