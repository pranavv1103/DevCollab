import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch { return null; }
  });
  const [token, setToken] = useState(localStorage.getItem('token') || null);
  const [loading, setLoading] = useState(true);

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
