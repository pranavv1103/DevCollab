import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { Search, Server, Hash, User, X, Sparkles } from 'lucide-react';

const GlobalSearch = ({ isOpen, onClose }) => {
  const [tab, setTab] = useState('search'); // 'search' | 'ai'
  const [query, setQuery] = useState('');
  const [results, setResults] = useState({ users: [], servers: [], channels: [] });
  const [loading, setLoading] = useState(false);
  // AI smart-search
  const [aiQuery, setAiQuery] = useState('');
  const [aiResults, setAiResults] = useState(null);
  const [aiLoading, setAiLoading] = useState(false);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const aiInputRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setQuery('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiQuery('');
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setAiResults(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setResults({ users: [], servers: [], channels: [] });
      setTimeout(() => (tab === 'ai' ? aiInputRef.current : inputRef.current)?.focus(), 50);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    setTimeout(() => (tab === 'ai' ? aiInputRef.current : inputRef.current)?.focus(), 50);
  }, [tab]);

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

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!aiQuery.trim()) return;
    setAiLoading(true);
    setAiResults(null);
    try {
      const res = await axios.post('http://localhost:9090/api/ai/smart-search', { searchQuery: aiQuery });
      setAiResults(res.data);
    } catch {
      setAiResults({ error: 'AI search failed. Please try again.' });
    }
    setAiLoading(false);
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
          overflow: 'hidden', display: 'flex', flexDirection: 'column', maxHeight: '600px',
          border: '1px solid var(--color-bg-elevation-3)', boxShadow: 'var(--shadow-lg)',
          animation: 'fadeIn 0.15s ease',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Tab bar */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--color-bg-elevation-3)', padding: '0 12px', gap: '4px' }}>
          {[{ id: 'search', label: 'Search', icon: <Search size={14} /> }, { id: 'ai', label: 'AI Search', icon: <Sparkles size={14} /> }].map(t => (
            <button key={t.id} onClick={() => setTab(t.id)} style={{
              display: 'flex', alignItems: 'center', gap: '6px', padding: '10px 12px',
              background: 'none', border: 'none', cursor: 'pointer', fontSize: '13px',
              color: tab === t.id ? 'var(--color-primary)' : 'var(--color-text-muted)',
              borderBottom: tab === t.id ? '2px solid var(--color-primary)' : '2px solid transparent',
              fontWeight: tab === t.id ? '600' : '400',
              transition: 'color 0.15s',
            }}>{t.icon}{t.label}</button>
          ))}
        </div>

        {tab === 'search' ? (
          <>
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
          </>
        ) : (
          /* AI Search Tab */
          <>
            <form onSubmit={handleAiSearch} style={{ display: 'flex', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--color-bg-elevation-3)' }}>
              <Sparkles size={18} color="#a78bfa" style={{ marginRight: '12px', flexShrink: 0 }} />
              <input
                ref={aiInputRef}
                type="text"
                placeholder='Ask AI: e.g. "find messages about auth bugs"'
                value={aiQuery}
                onChange={e => setAiQuery(e.target.value)}
                style={{ flex: 1, background: 'transparent', border: 'none', color: 'white', fontSize: '15px', outline: 'none' }}
              />
              <button type="button" onClick={onClose} className="btn-icon" style={{ padding: '4px', color: 'var(--color-text-muted)' }}>
                <X size={18} />
              </button>
            </form>
            <div style={{ overflowY: 'auto', padding: '16px' }} className="no-scrollbar">
              {aiLoading ? (
                <div style={{ textAlign: 'center', color: '#a78bfa', padding: '32px', fontSize: '14px' }}>
                  <div style={{ fontSize: '24px', marginBottom: '12px' }}>✨</div>
                  AI is searching…
                </div>
              ) : aiResults?.error ? (
                <div style={{ color: 'var(--color-danger)', fontSize: '14px', padding: '16px' }}>{aiResults.error}</div>
              ) : aiResults ? (
                <div>
                  {aiResults.result && (
                    <div style={{ fontSize: '14px', lineHeight: '1.7', color: 'var(--color-text-base)', backgroundColor: 'var(--color-bg-elevation-3)', borderRadius: '10px', padding: '16px', whiteSpace: 'pre-wrap' }}>
                      {aiResults.result}
                    </div>
                  )}
                  {aiResults.messages && aiResults.messages.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <div style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '8px' }}>Matching Messages</div>
                      {aiResults.messages.map((msg, i) => (
                        <div key={i} style={{ backgroundColor: 'var(--color-bg-elevation-3)', borderRadius: '8px', padding: '10px 14px', marginBottom: '8px', cursor: 'pointer' }}
                          onClick={() => msg.channelId && msg.serverId ? goToChannel(msg.serverId, msg.channelId) : null}
                          onMouseOver={e => e.currentTarget.style.backgroundColor = 'rgba(88,101,242,0.15)'}
                          onMouseOut={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'}
                        >
                          <div style={{ fontSize: '12px', color: 'var(--color-primary)', fontWeight: '600', marginBottom: '4px' }}>
                            {msg.username || msg.user?.username} · {msg.channelName ? `#${msg.channelName}` : ''}
                          </div>
                          <div style={{ fontSize: '13px', color: 'var(--color-text-base)', lineHeight: '1.5' }}>{msg.content}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              ) : (
                <div style={{ color: 'var(--color-text-muted)', fontSize: '13px', padding: '20px 8px' }}>
                  <p style={{ fontWeight: '600', color: 'var(--color-text-base)', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}><Sparkles size={14} color="#a78bfa" /> AI-powered message search</p>
                  <ul style={{ paddingLeft: '16px', lineHeight: 2 }}>
                    <li>Describe what you're looking for in natural language</li>
                    <li>AI will find relevant messages across your channels</li>
                    <li>Press <kbd style={{ background: 'var(--color-bg-elevation-3)', padding: '1px 5px', borderRadius: '3px', fontSize: '11px' }}>Enter</kbd> to search</li>
                  </ul>
                </div>
              )}
            </div>
          </>
        )}
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

