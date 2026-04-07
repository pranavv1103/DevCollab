import React, { useContext } from 'react';
import { NavLink } from 'react-router-dom';
import { Hash, Plus, Copy, Trash2, Lock, LogOut } from 'lucide-react';
import UserProfile from './UserProfile';
import { AuthContext } from '../context/AuthContext';

const ChannelList = ({ channels, activeChannelId, serverId, server, userRole, onCreateChannel, onDeleteChannel, onLeaveServer, onDeleteServer }) => {
  const { user } = useContext(AuthContext);

  const isOwner = userRole === 'OWNER';
  const isAdmin = userRole === 'ADMIN';
  const canManage = isOwner || isAdmin;

  const handleCopyInvite = () => {
    if (server?.inviteCode) {
      navigator.clipboard.writeText(server.inviteCode).then(() => {
        // A toast would be nice here; for now use a quick DOM trick
        const el = document.getElementById('invite-copy-feedback');
        if (el) { el.style.opacity = '1'; setTimeout(() => { el.style.opacity = '0'; }, 1500); }
      });
    }
  };

  return (
    <div style={{
      width: '240px',
      minWidth: '240px',
      backgroundColor: 'var(--color-bg-elevation-2)',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
    }}>
      {/* Server Header */}
      {server && (
        <div style={{
          padding: '12px 16px',
          borderBottom: '1px solid var(--color-bg-elevation-3)',
          backgroundColor: 'var(--color-bg-elevation-1)',
          flexShrink: 0,
        }}>
          <div style={{ fontWeight: '800', fontSize: '15px', color: 'white', marginBottom: '6px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{server.name}</span>
            <div style={{ display: 'flex', gap: '4px', flexShrink: 0 }}>
              {isOwner && (
                <button
                  className="btn-icon"
                  style={{ color: 'var(--color-danger)', padding: '4px' }}
                  onClick={onDeleteServer}
                  title="Delete Server"
                >
                  <Trash2 size={14} />
                </button>
              )}
              {!isOwner && (
                <button
                  className="btn-icon"
                  style={{ color: 'var(--color-text-muted)', padding: '4px' }}
                  onClick={onLeaveServer}
                  title="Leave Server"
                >
                  <LogOut size={14} />
                </button>
              )}
            </div>
          </div>
          {server.description && (
            <p style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '8px', lineHeight: '1.4' }}>{server.description}</p>
          )}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '11px', color: 'var(--color-text-muted)', position: 'relative' }}>
            <span>Invite: <strong style={{ userSelect: 'all', letterSpacing: '0.05em' }}>{server.inviteCode}</strong></span>
            <button className="btn-icon" onClick={handleCopyInvite} title="Copy Invite Code" style={{ padding: '4px' }}>
              <Copy size={13} />
            </button>
            <span id="invite-copy-feedback" style={{ position: 'absolute', right: '32px', fontSize: '11px', color: 'var(--color-success)', opacity: 0, transition: 'opacity 0.3s', pointerEvents: 'none' }}>Copied!</span>
          </div>
        </div>
      )}

      {/* Channels Section */}
      <div style={{ padding: '8px 0', flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <div style={{
          height: '36px',
          padding: '0 8px 0 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <span style={{ fontSize: '11px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--color-text-muted)' }}>Text Channels</span>
          {canManage && (
            <button
              onClick={onCreateChannel}
              className="btn-icon"
              style={{ color: 'var(--color-text-muted)', padding: '4px' }}
              title="Create Channel"
            >
              <Plus size={16} />
            </button>
          )}
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 8px' }} className="no-scrollbar">
          {channels.length === 0 && (
            <div style={{ padding: '16px', textAlign: 'center', fontSize: '13px', color: 'var(--color-text-muted)' }}>
              {canManage ? 'No channels yet. Create one!' : 'No channels available.'}
            </div>
          )}
          {channels.map(channel => {
            const isActive = channel.id === activeChannelId;
            return (
              <div key={channel.id} style={{ position: 'relative', display: 'flex', alignItems: 'center', borderRadius: '4px', marginBottom: '1px', group: true }}>
                <NavLink
                  to={`/servers/${serverId}/channels/${channel.id}`}
                  style={({ isActive: navActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    flex: 1,
                    padding: '7px 8px',
                    borderRadius: '4px',
                    textDecoration: 'none',
                    color: navActive ? 'white' : 'var(--color-text-muted)',
                    backgroundColor: navActive ? 'var(--color-bg-elevation-3)' : 'transparent',
                    fontWeight: navActive ? '600' : '500',
                    fontSize: '14px',
                    transition: 'all 0.1s',
                    minWidth: 0,
                  })}
                  onMouseOver={e => { if (!isActive) e.currentTarget.style.backgroundColor = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#d1d3d9'; }}
                  onMouseOut={e => { if (!isActive) { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = 'var(--color-text-muted)'; } }}
                >
                  {channel.private || channel.isPrivate ? (
                    <Lock size={15} style={{ marginRight: '7px', flexShrink: 0 }} />
                  ) : (
                    <Hash size={15} style={{ marginRight: '7px', flexShrink: 0 }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{channel.name}</span>
                </NavLink>
                {canManage && (
                  <button
                    className="btn-icon channel-delete-btn"
                    onClick={() => onDeleteChannel(channel.id)}
                    title="Delete Channel"
                    style={{
                      position: 'absolute', right: '4px',
                      color: 'var(--color-danger)',
                      padding: '3px',
                      opacity: 0,
                      transition: 'opacity 0.15s',
                    }}
                    onMouseOver={e => e.stopPropagation()}
                  >
                    <Trash2 size={13} />
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* User Profile Section */}
      <UserProfile />
    </div>
  );
};

export default ChannelList;
