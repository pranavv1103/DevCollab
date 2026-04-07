import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Server, Hash, User, X } from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], servers: [], channels: [] });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setResults({ users: [], servers: [], channels: [] });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    try {
      const res = await axios.get(`http://localhost:9090/api/search?query=${encodeURIComponent(query)}`);
      setResults(res.data);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const goToServer = (serverId) => { navigate(`/servers/${serverId}`); onClose(); };
  const goToChannel = (serverId, channelId) => { navigate(`/servers/${serverId}/channels/${channelId}`); onClose(); };

  const hasResults = results.users.length > 0 || results.servers.length > 0 || results.channels.length > 0;

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
        backgroundColor: 'rgba(0,0,0,0.75)', zIndex: 1000,
        display: 'flex', justifyContent: 'center', paddingTop: '80px',
        backdropFilter: 'blur(4px)',
      }}
      onClick={onClose}
    >
      <div
        style={{
          width: '520px', backgroundColor: 'var(--color-bg-elevation-2)', borderRadius: '12px',
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '560px',
          border: '1px solid var(--color-bg-elevation-3)', boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.15s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Search Input */}
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--color-bg-elevation-3)' }}>
          <Search size={18} color="var(--color-text-muted)" style={{ marginRight: '12px', flexShrink: 0 }} />
          <input
            ref={inputRef}
            type="text"
            placeholder="Search channels, servers, and users…"
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '16px', outline: 'none' }}
          />
          <button type="button" onClick={onClose} className="btn-icon" style={{ padding: '4px', color: 'var(--color-text-muted)' }}>
            <X size={18} />
          </button>
        </form>

        <div style={{ overflowY: 'auto', padding: '12px' }} className="no-scrollbar">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '24px', fontSize: '14px' }}>Searching…</div>
          ) : hasResults ? (
            <>
              {results.servers.length > 0 && (
                <ResultSection title="Servers">
                  {results.servers.map(s => (
                    <ResultRow key={s.id} icon={<Server size={15} />} label={s.name} sub={s.description} color="var(--color-success)" onClick={() => goToServer(s.id)} />
                  ))}
                </ResultSection>
              )}
              {results.channels.length > 0 && (
                <ResultSection title="Channels">
                  {results.channels.map(c => (
                    <ResultRow
                      key={c.id}
                      icon={<Hash size={15} />}
                      label={`#${c.name}`}
                      sub={c.serverId ? `Server ${c.serverId}` : ''}
                      color="var(--color-primary)"
                      onClick={() => c.serverId ? goToChannel(c.serverId, c.id) : null}
                    />
                  ))}
                </ResultSection>
              )}
              {results.users.length > 0 && (
                <ResultSection title="Members">
                  {results.users.map(u => (
                    <ResultRow key={u.id} icon={<User size={15} />} label={u.username} sub={u.email} color="#f59e0b" onClick={() => {}} />
                  ))}
                </ResultSection>
              )}
            </>
          ) : query ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)', padding: '32px 16px', fontSize: '14px' }}>
              No results for "<strong>{query}</strong>"
            </div>
          ) : (
            <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '20px 8px' }}>
              <p style={{ fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '8px' }}>Search tips</p>
              <ul style={{ paddingLeft: '16px', lineHeight: 2 }}>
                <li>Type a server name, channel name, or username</li>
                <li>Press <kbd style={{ background: 'var(--color-bg-elevation-3)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>Enter</kbd> to search</li>
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const ResultSection = ({ title, children }) => (
  <div style={{ marginBottom: '8px' }}>
    <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '6px 8px' }}>{title}</div>
    {children}
  </div>
);

const ResultRow = ({ icon, label, sub, color, onClick }) => (
  <div
    onClick={onClick}
    style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '9px 10px', cursor: 'pointer', borderRadius: '6px', transition: 'background-color 0.1s' }}
    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'}
    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
  >
    <span style={{ color, flexShrink: 0 }}>{icon}</span>
    <div style={{ minWidth: 0 }}>
      <div style={{ color: 'white', fontSize: '14px', fontWeight: '500', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</div>
      {sub && <div style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>{sub}</div>}
    </div>
  </div>
);

export default GlobalSearch;

