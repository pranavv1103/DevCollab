import React, { useState } from 'react';
import axios from 'axios';
import { Search, Server, Hash, User, X } from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], servers: [], channels: [] });
  const [loading, setLoading] = useState(false);

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

  if (!isOpen) return null;

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.7)',
      zIndex: 1000, display: 'flex', justifyContent: 'center', paddingTop: '100px'
    }} onClick={onClose}>
      <div style={{
        width: '500px', backgroundColor: 'var(--color-bg-elevation-2)', borderRadius: '8px',
        overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '600px', border: '1px solid var(--color-bg-elevation-3)'
      }} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSearch} style={{ display: 'flex', alignItems: 'center', padding: '16px', borderBottom: '1px solid var(--color-bg-elevation-3)' }}>
          <Search size={20} color="var(--color-text-muted)" style={{ marginRight: '12px' }} />
          <input
            autoFocus
            type="text"
            placeholder="Search channels, servers, and users..."
            value={query}
            onChange={e => setQuery(e.target.value)}
            style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '18px', outline: 'none' }}
          />
          <button type="button" onClick={onClose} className="btn-icon">
            <X size={20} />
          </button>
        </form>

        <div style={{ overflowY: 'auto', padding: '16px' }} className="no-scrollbar">
          {loading ? (
            <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>Searching...</div>
          ) : (
            <>
              {results.users.length > 0 && (
                 <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Users</div>
                    {results.users.map(u => (
                       <div key={u.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: '4px' }} className="hover-bg-3">
                          <User size={16} style={{ marginRight: '8px', color: 'var(--color-primary)' }} />
                          <span style={{ color: 'white' }}>{u.username}</span>
                       </div>
                    ))}
                 </div>
              )}
              {results.servers.length > 0 && (
                 <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Servers</div>
                    {results.servers.map(s => (
                       <div key={s.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: '4px' }} className="hover-bg-3">
                          <Server size={16} style={{ marginRight: '8px', color: 'var(--color-success)' }} />
                          <span style={{ color: 'white' }}>{s.name}</span>
                       </div>
                    ))}
                 </div>
              )}
              {results.channels.length > 0 && (
                 <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', textTransform: 'uppercase', marginBottom: '8px' }}>Channels</div>
                    {results.channels.map(c => (
                       <div key={c.id} style={{ display: 'flex', alignItems: 'center', padding: '8px', cursor: 'pointer', borderRadius: '4px' }} className="hover-bg-3">
                          <Hash size={16} style={{ marginRight: '8px', color: 'var(--color-text-dark)' }} />
                          <span style={{ color: 'white' }}>{c.name}</span>
                       </div>
                    ))}
                 </div>
              )}
              {results.users.length === 0 && results.servers.length === 0 && results.channels.length === 0 && query && (
                 <div style={{ textAlign: 'center', color: 'var(--color-text-muted)' }}>No results found.</div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
export default GlobalSearch;
