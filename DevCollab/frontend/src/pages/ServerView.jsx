import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate, useOutletContext } from 'react-router-dom';
import axios from 'axios';
import ChannelList from '../components/ChannelList';
import MessageList from '../components/MessageList';
import ServerMembersList from '../components/ServerMembersList';
import WorkspaceAnalytics from '../components/WorkspaceAnalytics';
import Modal from '../components/Modal';
import { AuthContext } from '../context/AuthContext';

const ServerView = () => {
  const { serverId, channelId } = useParams();
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);
  const outletCtx = useOutletContext() || {};

  const [channels, setChannels] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [userRole, setUserRole] = useState(null); // 'OWNER' | 'ADMIN' | 'MEMBER' | null
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  const [isPrivateChannel, setIsPrivateChannel] = useState(false);
  const [channelError, setChannelError] = useState('');

  useEffect(() => {
    if (serverId) {
      fetchServerDetails();
      fetchChannels();
      fetchUserRole();
    }
  }, [serverId]);

  const fetchServerDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/servers/${serverId}`);
      setActiveServer(res.data);
    } catch (err) {
      console.error('Failed to fetch server details', err);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/servers/${serverId}/channels`);
      setChannels(res.data);
      if (!channelId && res.data.length > 0) {
        navigate(`/servers/${serverId}/channels/${res.data[0].id}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to fetch channels', err);
    }
  };

  const fetchUserRole = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/servers/${serverId}/my-role`);
      setUserRole(res.data.role);
    } catch (err) {
      console.error('Failed to fetch user role', err);
      setUserRole('MEMBER');
    }
  };

  const openCreateModal = () => {
    setNewChannelName('');
    setIsPrivateChannel(false);
    setChannelError('');
    setIsModalOpen(true);
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    setChannelError('');
    try {
      const res = await axios.post(`http://localhost:9090/api/servers/${serverId}/channels`, {
        name: newChannelName.toLowerCase().replace(/\s+/g, '-'),
        type: 'text',
        private: isPrivateChannel,
      });
      await fetchChannels();
      setIsModalOpen(false);
      navigate(`/servers/${serverId}/channels/${res.data.id}`);
    } catch (err) {
      setChannelError(err.response?.data?.message || 'Failed to create channel');
    }
  };

  const handleDeleteChannel = async (cId) => {
    if (!window.confirm('Delete this channel? All messages will be lost.')) return;
    try {
      await axios.delete(`http://localhost:9090/api/channels/${cId}`);
      const updated = channels.filter(c => c.id !== cId);
      setChannels(updated);
      if (parseInt(channelId) === cId) {
        if (updated.length > 0) navigate(`/servers/${serverId}/channels/${updated[0].id}`, { replace: true });
        else navigate(`/servers/${serverId}`, { replace: true });
      }
    } catch (err) {
      console.error('Failed to delete channel', err);
    }
  };

  const handleLeaveServer = async () => {
    if (!window.confirm('Leave this server?')) return;
    try {
      await axios.delete(`http://localhost:9090/api/servers/${serverId}/leave`);
      navigate('/', { replace: true });
      if (outletCtx.onServerLeft) outletCtx.onServerLeft(parseInt(serverId));
    } catch (err) {
      console.error('Failed to leave server', err);
    }
  };

  const handleDeleteServer = async () => {
    if (!window.confirm('Delete this server? This cannot be undone.')) return;
    try {
      await axios.delete(`http://localhost:9090/api/servers/${serverId}`);
      navigate('/', { replace: true });
      if (outletCtx.onServerLeft) outletCtx.onServerLeft(parseInt(serverId));
    } catch (err) {
      console.error('Failed to delete server', err);
    }
  };

  if (!serverId) {
    return (
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)' }}>
        <div style={{ textAlign: 'center' }}>
          <h2>Ready to Collaborate?</h2>
          <p>Select a server on the left or create a new one to get started.</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
      <ChannelList
        channels={channels}
        activeChannelId={channelId ? parseInt(channelId) : null}
        serverId={serverId}
        server={activeServer}
        userRole={userRole}
        onCreateChannel={openCreateModal}
        onDeleteChannel={handleDeleteChannel}
        onLeaveServer={handleLeaveServer}
        onDeleteServer={handleDeleteServer}
      />

      {channelId ? (
        <MessageList
          channelId={channelId}
          channelName={channels.find(c => c.id === parseInt(channelId))?.name || `channel-${channelId}`}
          userRole={userRole}
          serverId={serverId}
        />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <WorkspaceAnalytics serverId={serverId} />
        </div>
      )}

      <ServerMembersList serverId={serverId} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Text Channel">
        <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {channelError && (
            <div style={{ backgroundColor: 'rgba(237,66,69,0.15)', border: '1px solid var(--color-danger)', color: 'var(--color-danger)', padding: '10px 14px', borderRadius: '6px', fontSize: '14px' }}>
              {channelError}
            </div>
          )}
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '700', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Channel Name</label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '12px', top: '10px', color: 'var(--color-text-muted)', fontSize: '16px' }}>#</span>
              <input
                style={{ width: '100%', padding: '10px 10px 10px 28px', backgroundColor: 'var(--color-bg-elevation-1)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '4px', color: 'white' }}
                value={newChannelName}
                onChange={e => setNewChannelName(e.target.value)}
                placeholder="new-channel"
                autoFocus
              />
            </div>
          </div>
          <label style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={isPrivateChannel}
              onChange={e => setIsPrivateChannel(e.target.checked)}
              style={{ cursor: 'pointer', width: '16px', height: '16px' }}
            />
            <span style={{ fontSize: '13px', color: 'var(--color-text-muted)' }}>
              <strong style={{ color: 'var(--color-text-base)' }}>Private Channel</strong> — Only visible to server admins and the owner
            </span>
          </label>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)}
              style={{ padding: '8px 16px', background: 'var(--color-bg-elevation-3)', color: 'var(--color-text-base)', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={!newChannelName.trim()}>Create Channel</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServerView;
