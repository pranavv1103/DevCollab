import React from 'react';
import { NavLink } from 'react-router-dom';
import { Plus, LogOut, Code2, Compass, Search, Bell } from 'lucide-react';

const Sidebar = ({ servers, onCreateServer, onJoinServer, onLogout, onOpenSearch, onToggleNotifications, hasUnreadNotifications }) => {
  return (
    <div style={{ 
      width: '72px', 
      backgroundColor: 'var(--color-bg-elevation-1)', 
      display: 'flex', 
      flexDirection: 'column', 
      alignItems: 'center', 
      paddingTop: '12px',
      borderRight: '1px solid var(--color-bg-elevation-3)',
      zIndex: 10
    }}>
      {/* App Icon */}
      <div style={{
        width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', 
        display: 'flex', justifyContent: 'center', alignItems: 'center', color: 'white', marginBottom: '8px'
      }}>
        <Code2 size={24} />
      </div>

      <div style={{ width: '32px', height: '2px', backgroundColor: 'var(--color-bg-elevation-3)', marginBottom: '8px' }} />

      {/* Server List */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1, overflowY: 'auto' }} className="no-scrollbar">
        {servers.map(server => (
          <NavLink
            key={server.id}
            to={`/servers/${server.id}`}
            style={({ isActive }) => ({
              width: '48px', height: '48px',
              borderRadius: isActive ? '16px' : '50%',
              backgroundColor: isActive ? 'var(--color-primary)' : 'var(--color-bg-elevation-3)',
              color: 'white',
              display: 'flex', justifyContent: 'center', alignItems: 'center',
              fontWeight: 'bold', fontSize: '16px',
              transition: 'all 0.2s',
              cursor: 'pointer'
            })}
          >
            {server.name.charAt(0).toUpperCase()}
          </NavLink>
        ))}
        
        {/* Add Server Button */}
        <button 
          onClick={onCreateServer}
          style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-bg-elevation-3)',
            color: 'var(--color-success)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            transition: 'all 0.2s'
          }}
          onMouseOver={e => { e.currentTarget.style.borderRadius = '16px'; e.currentTarget.style.backgroundColor = 'var(--color-success)'; e.currentTarget.style.color = 'white'; }}
          onMouseOut={e => { e.currentTarget.style.borderRadius = '50%'; e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'; e.currentTarget.style.color = 'var(--color-success)'; }}
          title="Create Server"
        >
          <Plus size={24} />
        </button>

        {/* Join Server Button */}
        <button 
          onClick={onJoinServer}
          style={{
            width: '48px', height: '48px', borderRadius: '50%', backgroundColor: 'var(--color-bg-elevation-3)',
            color: 'var(--color-primary)', display: 'flex', justifyContent: 'center', alignItems: 'center',
            transition: 'all 0.2s', marginTop: '4px'
          }}
          onMouseOver={e => { e.currentTarget.style.borderRadius = '16px'; e.currentTarget.style.backgroundColor = 'var(--color-primary)'; e.currentTarget.style.color = 'white'; }}
          onMouseOut={e => { e.currentTarget.style.borderRadius = '50%'; e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'; e.currentTarget.style.color = 'var(--color-primary)'; }}
          title="Join Server via Invite Code"
        >
          <Compass size={24} />
        </button>
      </div>

      {/* Utilities */}
      <div style={{ paddingBottom: '24px', paddingTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'center' }}>
        <button onClick={onOpenSearch} style={{ color: 'var(--color-text-muted)', display: 'flex', padding: '12px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Global Search" onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
          <Search size={22} />
        </button>
        <button onClick={onToggleNotifications} style={{ position: 'relative', color: 'var(--color-text-muted)', display: 'flex', padding: '12px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Notifications" onMouseOver={e => e.currentTarget.style.color = 'white'} onMouseOut={e => e.currentTarget.style.color = 'var(--color-text-muted)'}>
          <Bell size={22} />
          {hasUnreadNotifications && <div style={{ position: 'absolute', top: '10px', right: '10px', width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--color-danger)', border: '2px solid var(--color-bg-elevation-1)' }} />}
        </button>
        <button onClick={onLogout} style={{ color: 'var(--color-danger)', display: 'flex', padding: '12px', borderRadius: '50%', background: 'transparent', border: 'none', cursor: 'pointer' }} title="Logout">
          <LogOut size={22} />
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
