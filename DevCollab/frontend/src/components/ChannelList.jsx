import React, { useContext } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Hash, Plus, Settings, Copy, Trash2 } from 'lucide-react';
import UserProfile from './UserProfile';
import { AuthContext } from '../context/AuthContext';
import axios from 'axios';

const ChannelList = ({ channels, activeChannelId, serverId, server, onCreateChannel }) => {
  const { user } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleCopyInvite = () => {
    if (server?.inviteCode) {
      navigator.clipboard.writeText(server.inviteCode);
      alert('Invite code copied to clipboard!');
    }
  };

  const handleDeleteServer = async () => {
    if (window.confirm('Are you sure you want to delete this server? This action cannot be undone.')) {
      try {
        await axios.delete(`http://localhost:9090/api/servers/${serverId}`);
        navigate('/');
        window.location.reload();
      } catch (error) {
        console.error('Failed to delete server', error);
        alert('Could not delete server');
      }
    }
  };
  return (
    <div style={{
      width: '240px',
      backgroundColor: 'var(--color-bg-elevation-2)',
      display: 'flex',
      flexDirection: 'column',
      borderTopLeftRadius: '8px'
    }}>
      {server && (
        <div style={{
          padding: '16px',
          borderBottom: '1px solid var(--color-bg-elevation-3)',
          backgroundColor: 'var(--color-bg-elevation-1)',
          boxShadow: '0 1px 2px rgba(0,0,0,0.2)'
        }}>
          <div style={{ fontWeight: 'bold', fontSize: '16px', color: 'white', marginBottom: '8px' }}>
            {server.name}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '12px', color: 'var(--color-text-muted)' }}>
            <span>Invite Code: <strong style={{ userSelect: 'all' }}>{server.inviteCode}</strong></span>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-icon" onClick={handleCopyInvite} title="Copy Invite Code">
                <Copy size={14} />
              </button>
              {server.owner?.id === user?.id && (
                <button className="btn-icon" style={{ color: 'var(--color-danger)' }} onClick={handleDeleteServer} title="Delete Server">
                  <Trash2 size={14} />
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div style={{
        height: '48px',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-bg-elevation-3)',
        fontWeight: 'bold',
        color: 'white',
        marginTop: '8px'
      }}>
        <span style={{ fontSize: '12px', textTransform: 'uppercase', color: 'var(--color-text-muted)' }}>Text Channels</span>
        <button onClick={onCreateChannel} style={{ color: 'var(--color-text-muted)' }} title="Create Channel">
          <Plus size={18} />
        </button>
      </div>

      <div style={{ padding: '16px 8px', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
        {channels.map(channel => (
          <NavLink
            key={channel.id}
            to={`/servers/${serverId}/channels/${channel.id}`}
            style={({ isActive }) => ({
              display: 'flex',
              alignItems: 'center',
              padding: '8px',
              borderRadius: '4px',
              marginBottom: '2px',
              textDecoration: 'none',
              color: isActive ? 'white' : 'var(--color-text-muted)',
              backgroundColor: isActive ? 'var(--color-bg-elevation-3)' : 'transparent',
              fontWeight: isActive ? '600' : '500',
              transition: 'all 0.1s'
            })}
            onMouseOver={e => { if (channel.id !== activeChannelId) e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'; }}
            onMouseOut={e => { if (channel.id !== activeChannelId) e.currentTarget.style.backgroundColor = 'transparent'; }}
          >
            <Hash size={20} style={{ marginRight: '8px', color: 'var(--color-text-dark)' }} />
            {channel.name}
          </NavLink>
        ))}
      </div>

      {/* User Profile Section docked at bottom */}
      <UserProfile />
    </div>
  );
};

export default ChannelList;
