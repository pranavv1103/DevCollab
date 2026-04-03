import React, { useState, useEffect, useContext } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import ChannelList from '../components/ChannelList';
import MessageList from '../components/MessageList';
import ServerMembersList from '../components/ServerMembersList';
import WorkspaceAnalytics from '../components/WorkspaceAnalytics';
import Modal from '../components/Modal';

const ServerView = () => {
  const { serverId, channelId } = useParams();
  const navigate = useNavigate();
  const [channels, setChannels] = useState([]);
  const [activeServer, setActiveServer] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newChannelName, setNewChannelName] = useState('');
  
  useEffect(() => {
    if (serverId) {
      fetchServerDetails();
      fetchChannels();
    }
  }, [serverId]);

  const fetchServerDetails = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/servers/${serverId}`);
      setActiveServer(res.data);
    } catch (error) {
      console.error("Failed to fetch server details", error);
    }
  };

  const fetchChannels = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/servers/${serverId}/channels`);
      setChannels(res.data);
      // Auto-select first channel if none selected
      if (!channelId && res.data.length > 0) {
        navigate(`/servers/${serverId}/channels/${res.data[0].id}`, { replace: true });
      }
    } catch (error) {
      console.error("Failed to fetch channels", error);
    }
  };

  const openCreateModal = () => {
    setNewChannelName('');
    setIsModalOpen(true);
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim()) return;
    try {
      const res = await axios.post(`http://localhost:9090/api/servers/${serverId}/channels`, { name: newChannelName.toLowerCase().replace(/\s+/g, '-'), type: "text" });
      await fetchChannels();
      setIsModalOpen(false);
      navigate(`/servers/${serverId}/channels/${res.data.id}`);
    } catch (error) {
      console.error("Failed to create channel", error);
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
    <div style={{ flex: 1, display: 'flex' }}>
      <ChannelList 
        channels={channels} 
        activeChannelId={parseInt(channelId)} 
        serverId={serverId}
        server={activeServer}
        onCreateChannel={openCreateModal} 
      />
      
      {channelId ? (
         <MessageList channelId={channelId} channelName={channels.find(c => c.id === parseInt(channelId))?.name || "unknown-channel"} />
      ) : (
        <div style={{ flex: 1, overflowY: 'auto' }}>
          <WorkspaceAnalytics serverId={serverId} />
        </div>
      )}

      {/* Right Sidebar for Members */}
      <ServerMembersList serverId={serverId} />

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create Text Channel">
        <form onSubmit={handleCreateChannel} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px' }}>CHANNEL NAME</label>
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
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '8px' }}>
            <button type="button" onClick={() => setIsModalOpen(false)} style={{ padding: '8px 16px', background: 'transparent', color: 'var(--color-text-base)', border: 'none', cursor: 'pointer' }}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={!newChannelName.trim()}>Create</button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ServerView;
