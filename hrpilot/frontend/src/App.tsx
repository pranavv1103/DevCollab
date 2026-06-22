import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import LoginPage from './pages/LoginPage';
import ChatPage from './pages/ChatPage';
import AgentPage from './pages/AgentPage';
import AdminPage from './pages/AdminPage';

/** Simple guard — redirects to /login if no token stored */
const PrivateRoute: React.FC<{ element: React.ReactElement }> = ({ element }) => {
  const token = localStorage.getItem('token');
  return token ? element : <Navigate to="/login" replace />;
};

export default function App() {
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID ?? '';

  return (
    <GoogleOAuthProvider clientId={googleClientId}>
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/chat" element={<PrivateRoute element={<ChatPage />} />} />
        <Route path="/agent" element={<PrivateRoute element={<AgentPage />} />} />
        <Route path="/admin" element={<PrivateRoute element={<AdminPage />} />} />
        <Route path="*" element={<Navigate to="/chat" replace />} />
      </Routes>
    </BrowserRouter>
    </GoogleOAuthProvider>
  );
}
