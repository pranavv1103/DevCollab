import React, { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, LogOut, Code2, Compass, Search, Bell } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const Sidebar = ({ servers, activeServerId, onCreateServer, onJoinServer, onLogout, onOpenSearch, onToggleNotifications, hasUnreadNotifications }) => {
  const navigate = useNavigate();
  const { user } = useContext(AuthContext);

  const getInitials = (name) => name ? name.charAt(0).toUpperCase() : '?';

  const serverBtnStyle = (isActive) => ({
    width: '48px',
    height: '48px',
    borderRadius: isActive ? '16px' : '50%',
    backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-bg-elevation-3)',
    color: 'white',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontWeight: '800',
    fontSize: '18px',
    transition: 'border-radius 0.2s, background-color 0.2s, box-shadow 0.2s',
    cursor: 'pointer',
    border: 'none',
    flexShrink: 0,
    boxShadow: isActive ? '0 0 0 3px rgba(88,101,242,0.4)' : 'none',
    letterSpacing: '-0.5px',
  });

  return (
    <div style={{
      width: '72px',
      minWidth: '72px',
      backgroundColor: 'var(--color-bg-elevation-1)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      paddingTop: '12px',
      borderRight: '1px solid var(--color-bg-elevation-3)',
      zIndex: 10,
      flexShrink: 0,
    }}>
      {/* App Brand */}
      <button
        onClick={() => navigate('/')}
        style={{
          width: '48px', height: '48px', borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary), #7c3aed)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          color: 'white', marginBottom: '8px', border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(88,101,242,0.4)',
          transition: 'transform 0.2s',
          flexShrink: 0,
        }}
        onMouseOver={e => e.currentTarget.style.transform = 'scale(1.05)'}
        onMouseOut={e => e.currentTarget.style.transform = 'scale(1)'}
        title="DevCollab Home"
      >
        <Code2 size={22} />
      </button>

      <div style={{ width: '36px', height: '1px', backgroundColor: 'var(--color-bg-elevation-3)', margin: '4px 0 8px' }} />

      {/* Server List */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px', flex: 1, overflowY: 'auto', width: '100%', paddingBottom: '8px' }} className="no-scrollbar">
        {servers.map(server => {
          const isActive = activeServerId === server.id;
          return (
            <div key={server.id} style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
              {isActive && (
                <div style={{
                  position: 'absolute', left: '0', top: '50%', transform: 'translateY(-50%)',
                  width: '4px', height: isActive ? '36px' : '0',
                  backgroundColor: 'white', borderRadius: '0 4px 4px 0',
                  transition: 'height 0.2s',
                }} />
              )}
              <button
                onClick={() => navigate(`/servers/${server.id}`)}
                style={serverBtnStyle(isActive)}
                title={`${server.name}${server.description ? ` — ${server.description}` : ''}`}
                onMouseOver={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderRadius = '16px';
                    e.currentTarget.style.backgroundColor = 'var(--color-primary)';
                  }
                }}
                onMouseOut={e => {
                  if (!isActive) {
                    e.currentTarget.style.borderRadius = '50%';
                    e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)';
                  }
                }}
              >
                {getInitials(server.name)}
              </button>
            </div>
          );
        })}

        {/* Divider before actions */}
        {servers.length > 0 && (
          <div style={{ width: '36px', height: '1px', backgroundColor: 'var(--color-bg-elevation-3)', margin: '2px 0' }} />
        )}

        {/* Create Server Button */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button
            onClick={onCreateServer}
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: 'var(--color-bg-elevation-3)',
              color: 'var(--color-success)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              transition: 'all 0.2s', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}
            onMouseOver={e => { e.currentTarget.style.borderRadius = '16px'; e.currentTarget.style.backgroundColor = 'var(--color-success)'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={e => { e.currentTarget.style.borderRadius = '50%'; e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'; e.currentTarget.style.color = 'var(--color-success)'; }}
            title="Create a New Server"
          >
            <Plus size={22} />
          </button>
        </div>

        {/* Join Server Button */}
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', width: '100%' }}>
          <button
            onClick={onJoinServer}
            style={{
              width: '48px', height: '48px', borderRadius: '50%',
              backgroundColor: 'var(--color-bg-elevation-3)',
              color: 'var(--color-primary)',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              transition: 'all 0.2s', border: 'none', cursor: 'pointer', flexShrink: 0,
            }}
            onMouseOver={e => { e.currentTarget.style.borderRadius = '16px'; e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
            onMouseOut={e => { e.currentTarget.style.borderRadius = '50%'; e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
            title="Join a Server via Invite Code"
          >
            <Compass size={22} />
          </button>
        </div>
      </div>

      {/* Bottom utilities */}
      <div style={{ paddingBottom: '16px', paddingTop: '8px', display: 'flex', flexDirection: 'column', gap: '4px', alignItems: 'center', borderTop: '1px solid var(--color-bg-elevation-3)', width: '100%' }}>
        <SidebarIcon onClick={onOpenSearch} icon={<Search size={20} />} title="Global Search" />
        <SidebarIcon
          onClick={onToggleNotifications}
          icon={<>
            <Bell size={20} />
            {hasUnreadNotifications && (
              <div style={{
                position: 'absolute', top: '4px', right: '4px',
                width: '9px', height: '9px', borderRadius: '50%',
                backgroundColor: 'var(--color-danger)',
                border: '2px solid var(--color-bg-elevation-1)',
              }} />
            )}
          </>}
          title="Notifications"
          style={{ position: 'relative' }}
        />

        {/* User Avatar Bottom */}
        <div style={{ marginTop: '4px' }}>
          <button
            style={{
              width: '36px', height: '36px', borderRadius: '50%',
              background: 'linear-gradient(135deg, #5865f2, #7c3aed)',
              color: 'white', fontWeight: '700', fontSize: '14px',
              border: 'none', cursor: 'pointer', display: 'flex',
              alignItems: 'center', justifyContent: 'center',
              title: user?.username || 'Profile',
            }}
            onClick={() => {}}
            title={user?.username}
          >
            {user?.username?.charAt(0).toUpperCase() || '?'}
          </button>
        </div>

        <SidebarIcon onClick={onLogout} icon={<LogOut size={20} />} title="Sign Out" danger />
      </div>
    </div>
  );
};

const SidebarIcon = ({ onClick, icon, title, danger, style = {} }) => (
  <button
    onClick={onClick}
    title={title}
    style={{
      width: '40px', height: '40px',
      borderRadius: '50%',
      background: 'transparent',
      border: 'none',
      color: danger ? 'var(--color-danger)' : 'var(--color-text-muted)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      cursor: 'pointer',
      transition: 'background-color 0.15s, color 0.15s',
      position: 'relative',
      ...style,
    }}
    onMouseOver={e => { e.currentTarget.style.backgroundColor = danger ? 'rgba(237,66,69,0.15)' : 'var(--color-bg-elevation-3)'; e.currentTarget.style.color = danger ? 'var(--color-danger)' : 'white'; }}
    onMouseOut={e => { e.currentTarget.style.backgroundColor = 'transparent'; e.currentTarget.style.color = danger ? 'var(--color-danger)' : 'var(--color-text-muted)'; }}
  >
    {icon}
  </button>
);

export default Sidebar;
