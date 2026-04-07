import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, AuthContext } from './context/AuthContext';
import { WebSocketProvider } from './context/WebSocketContext';
import Login from './pages/Login';
import Register from './pages/Register';
import MainLayout from './components/MainLayout';
import ServerView from './pages/ServerView';

const PrivateRoute = ({ children }) => {
  const { user, loading } = React.useContext(AuthContext);
  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--color-bg-base)' }}>
      <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ width: '40px', height: '40px', border: '3px solid var(--color-bg-elevation-3)', borderTopColor: 'var(--color-primary)', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 16px' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
        Loading DevCollab...
      </div>
    </div>
  );
  return user ? children : <Navigate to="/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <WebSocketProvider>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/" element={
              <PrivateRoute>
                <MainLayout />
              </PrivateRoute>
            }>
              <Route path="servers/:serverId/channels/:channelId" element={<ServerView />} />
              <Route path="servers/:serverId" element={<ServerView />} />
              <Route index element={<ServerView />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Router>
      </WebSocketProvider>
    </AuthProvider>
  );
}

export default App;
