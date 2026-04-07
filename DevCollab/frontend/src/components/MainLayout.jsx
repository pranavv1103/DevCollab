import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useNavigate, useParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Modal from './Modal';
import GlobalSearch from './GlobalSearch';
import NotificationsPanel from './NotificationsPanel';
import axios from 'axios';

const MainLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const { serverId } = useParams();
  const [servers, setServers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [newServerDesc, setNewServerDesc] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);
  const [serverError, setServerError] = useState('');
  const [joinError, setJoinError] = useState('');

  useEffect(() => {
    fetchServers();
    checkNotifications();
  }, []);

  const checkNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:9090/api/notifications');
      if (res.data.some(n => !n.read)) setHasUnreadNotifications(true);
    } catch(err) { /* silent */ }
  };

  const fetchServers = async () => {
    try {
      const res = await axios.get('http://localhost:9090/api/servers');
      setServers(res.data);
      // If no server selected and servers exist, navigate to first
      if (!serverId && res.data.length > 0) {
        navigate(`/servers/${res.data[0].id}`, { replace: true });
      }
    } catch (error) {
      console.error("Failed to fetch servers", error);
    }
  };

  const openCreateModal = () => {
    setNewServerName('');
    setNewServerDesc('');
    setServerError('');
    setIsModalOpen(true);
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    setServerError('');
    try {
      const res = await axios.post('http://localhost:9090/api/servers', {
        name: newServerName.trim(),
        description: newServerDesc.trim() || "A DevCollab Server"
      });
      const updated = await axios.get('http://localhost:9090/api/servers');
      setServers(updated.data);
      setIsModalOpen(false);
      navigate(`/servers/${res.data.id}`);
    } catch (error) {
      setServerError(error.response?.data?.message || "Failed to create server");
    }
  };

  const openJoinModal = () => {
    setInviteCode('');
    setJoinError('');
    setIsJoinModalOpen(true);
  };

  const handleJoinServer = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    setJoinError('');
    try {
      const res = await axios.post(`http://localhost:9090/api/servers/${inviteCode.trim()}/join`);
      const updated = await axios.get('http://localhost:9090/api/servers');
      setServers(updated.data);
      setIsJoinModalOpen(false);
      navigate(`/servers/${res.data.id}`);
    } catch (error) {
      setJoinError(error.response?.data?.message || "Failed to join server. Check your invite code.");
    }
  };

  const handleServerDeleted = (deletedServerId) => {
    setServers(prev => prev.filter(s => s.id !== deletedServerId));
    navigate('/');
  };

  const handleServerUpdated = (updatedServer) => {
    setServers(prev => prev.map(s => s.id === updatedServer.id ? updatedServer : s));
  };

  const markNotificationsRead = () => {
    setHasUnreadNotifications(false);
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--color-bg-base)', position: 'relative', overflow: 'hidden' }}>
      <Sidebar
        servers={servers}
        activeServerId={serverId ? parseInt(serverId) : null}
        onCreateServer={openCreateModal}
        onJoinServer={openJoinModal}
        onLogout={() => { logout(); navigate('/login'); }}
        onOpenSearch={() => setIsSearchOpen(true)}
        onToggleNotifications={() => setIsNotificationsOpen(prev => !prev)}
        hasUnreadNotifications={hasUnreadNotifications}
      />

      {isNotificationsOpen && (
        <NotificationsPanel
          isOpen={isNotificationsOpen}
          onClose={() => setIsNotificationsOpen(false)}
          onRead={markNotificationsRead}
        />
      )}
      {isSearchOpen && (
        <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      )}

      <main style={{ flex: 1, display: 'flex', minWidth: 0, overflow: 'hidden' }}>
        <Outlet context={{ onServerDeleted: handleServerDeleted, onServerUpdated: handleServerUpdated }} />
      </main>

      {/* Create Server Modal */}
      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a Server">
        <form onSubmit={handleCreateServer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {serverError && (
            <div style={{ backgroundColor: 'rgba(237,66,69,0.12)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
              {serverError}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>SERVER NAME *</label>
            <input
              style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg-elevation-1)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px', color: 'white', fontSize: '14px' }}
              value={newServerName}
              onChange={e => setNewServerName(e.target.value)}
              placeholder="My awesome workspace"
              autoFocus
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>DESCRIPTION</label>
            <input
              style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg-elevation-1)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px', color: 'white', fontSize: '14px' }}
              value={newServerDesc}
              onChange={e => setNewServerDesc(e.target.value)}
              placeholder="What's this server for?"
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '9px 18px', background: 'var(--color-bg-elevation-3)', color: 'var(--color-text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!newServerName.trim()} style={{ padding: '9px 18px', fontSize: '14px' }}>Create Server</button>
          </div>
        </form>
      </Modal>

      {/* Join Server Modal */}
      <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Join a Server">
        <form onSubmit={handleJoinServer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {joinError && (
            <div style={{ backgroundColor: 'rgba(237,66,69,0.12)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '10px 12px', borderRadius: '6px', fontSize: '13px' }}>
              {joinError}
            </div>
          )}
          <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
            Enter an invite code to join an existing server. Ask a server admin for their invite code.
          </p>
          <div>
            <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>INVITE CODE</label>
            <input
              style={{ width: '100%', padding: '10px 12px', backgroundColor: 'var(--color-bg-elevation-1)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px', color: 'white', fontSize: '14px', fontFamily: 'var(--font-family-mono)' }}
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="e.g. a1b2c3d4"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', paddingTop: '4px' }}>
            <button type="button" onClick={() => setIsJoinModalOpen(false)} style={{ padding: '9px 18px', background: 'var(--color-bg-elevation-3)', color: 'var(--color-text-muted)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!inviteCode.trim()} style={{ padding: '9px 18px', fontSize: '14px' }}>Join Server</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MainLayout;
