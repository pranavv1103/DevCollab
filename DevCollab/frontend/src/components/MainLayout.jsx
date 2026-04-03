import React, { useState, useEffect, useContext } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Sidebar from './Sidebar';
import Modal from './Modal';
import GlobalSearch from './GlobalSearch';
import NotificationsPanel from './NotificationsPanel';
import axios from 'axios';

const MainLayout = () => {
  const { logout, user } = useContext(AuthContext);
  const navigate = useNavigate();
  const [servers, setServers] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newServerName, setNewServerName] = useState('');
  const [isJoinModalOpen, setIsJoinModalOpen] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [hasUnreadNotifications, setHasUnreadNotifications] = useState(false);

  useEffect(() => {
    fetchServers();
    checkNotifications();
  }, []);
  
  const checkNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:9090/api/notifications', { withCredentials: true });
      if (res.data.some(n => !n.read)) setHasUnreadNotifications(true);
    } catch(err) { console.error(err); }
  };

  const fetchServers = async () => {
    try {
      const res = await axios.get('http://localhost:9090/api/servers');
      setServers(res.data);
    } catch (error) {
      console.error("Failed to fetch servers", error);
    }
  };

  const openCreateModal = () => {
    setNewServerName('');
    setIsModalOpen(true);
  };

  const handleCreateServer = async (e) => {
    e.preventDefault();
    if (!newServerName.trim()) return;
    try {
      const res = await axios.post('http://localhost:9090/api/servers', { name: newServerName, description: "A DevCollab Server" });
      await fetchServers();
      setIsModalOpen(false);
      navigate(`/servers/${res.data.id}`);
    } catch (error) {
      console.error("Failed to create server", error);
    }
  };

  const openJoinModal = () => {
    setInviteCode('');
    setIsJoinModalOpen(true);
  };

  const handleJoinServer = async (e) => {
    e.preventDefault();
    if (!inviteCode.trim()) return;
    try {
      const res = await axios.post(`http://localhost:9090/api/servers/${inviteCode.trim()}/join`);
      await fetchServers();
      setIsJoinModalOpen(false);
      navigate(`/servers/${res.data.id}`);
    } catch (error) {
      alert(error.response?.data?.message || "Failed to join server");
      console.error("Failed to join server", error);
    }
  };

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', background: 'var(--color-bg-base)', position: 'relative' }}>
      {/* Absolute Left Sidebar for Servers */}
      <Sidebar 
         servers={servers} 
         onCreateServer={openCreateModal} 
         onJoinServer={openJoinModal} 
         onLogout={() => { logout(); navigate('/login'); }} 
         onOpenSearch={() => setIsSearchOpen(true)}
         onToggleNotifications={() => setIsNotificationsOpen(prev => !prev)}
         hasUnreadNotifications={hasUnreadNotifications}
      />
      
      <NotificationsPanel isOpen={isNotificationsOpen} onClose={() => setIsNotificationsOpen(false)} />
      <GlobalSearch isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
      
      {/* Remaining Area for Nested Routes (Channel list + Chat Window) */}
      <main style={{ flex: 1, display: 'flex', minWidth: 0 }}>
        <Outlet />
      </main>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create a Server">
        <form onSubmit={handleCreateServer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px' }}>SERVER NAME</label>
            <input 
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg-elevation-1)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '4px', color: 'white' }}
              value={newServerName}
              onChange={e => setNewServerName(e.target.value)}
              placeholder="My awesome server"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--color-text-base)', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!newServerName.trim()}>Create</button>
          </div>
        </form>
      </Modal>

      <Modal isOpen={isJoinModalOpen} onClose={() => setIsJoinModalOpen(false)} title="Join a Server">
        <form onSubmit={handleJoinServer} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px' }}>INVITE CODE</label>
            <input 
              style={{ width: '100%', padding: '10px', backgroundColor: 'var(--color-bg-elevation-1)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '4px', color: 'white' }}
              value={inviteCode}
              onChange={e => setInviteCode(e.target.value)}
              placeholder="e.g. a1b2c3d4"
              autoFocus
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsJoinModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--color-text-base)', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!inviteCode.trim()}>Join Server</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default MainLayout;
