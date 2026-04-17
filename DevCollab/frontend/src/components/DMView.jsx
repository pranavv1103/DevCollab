import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';

const DMView = ({ onClose }) => {
  const { user } = useContext(AuthContext);
  const { stompClient, connected } = useContext(WebSocketContext);
  const [inbox, setInbox] = useState([]);
  const [activePartnerId, setActivePartnerId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [searchQ, setSearchQ] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const dmSubRef = useRef(null);
  const messagesEndRef = useRef(null);
  const searchTimerRef = useRef(null);

  const fetchInbox = async () => {
    try {
      const res = await axios.get('http://localhost:9090/api/dm/inbox');
      setInbox(res.data);
    } catch { /* silent */ }
  };

  const fetchConversation = async (partnerId) => {
    try {
      const res = await axios.get(`http://localhost:9090/api/dm/${partnerId}`);
      setMessages(res.data);
      await axios.post(`http://localhost:9090/api/dm/${partnerId}/read`);
      setInbox(prev => prev.map(e => e.partnerId === partnerId ? { ...e, unread: 0 } : e));
    } catch { /* silent */ }
  };

  useEffect(() => {
    fetchInbox();
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!connected || !stompClient || !user?.id) return;
    if (dmSubRef.current) { dmSubRef.current.unsubscribe(); dmSubRef.current = null; }

    dmSubRef.current = stompClient.subscribe(`/topic/dm/${user.id}`, (frame) => {
      const dm = JSON.parse(frame.body);
      // Update conversation if open
      setMessages(prev => {
        if (!activePartnerId) return prev;
        const isCurrentConvo =
          (dm.sender?.id === activePartnerId || dm.sender?.username === inbox.find(e => e.partnerId === activePartnerId)?.partnerName) ||
          (dm.recipient?.id === activePartnerId);
        return isCurrentConvo ? [...prev, dm] : prev;
      });
      fetchInbox();
    });

    return () => {
      if (dmSubRef.current) { dmSubRef.current.unsubscribe(); dmSubRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [connected, stompClient, user?.id, activePartnerId]);

  const openConversation = async (partnerId) => {
    setActivePartnerId(partnerId);
    setSearchQ('');
    setSearchResults([]);
    await fetchConversation(partnerId);
  };

  const handleSearch = (q) => {
    setSearchQ(q);
    clearTimeout(searchTimerRef.current);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    searchTimerRef.current = setTimeout(async () => {
      try {
        const res = await axios.get(`http://localhost:9090/api/dm/users/search?q=${encodeURIComponent(q)}`);
        setSearchResults(res.data);
      } catch { /* silent */ } finally {
        setSearching(false);
      }
    }, 300);
  };

  const sendMessage = () => {
    if (!input.trim() || !activePartnerId || !stompClient || !connected) return;
    stompClient.publish({
      destination: '/app/dm.send',
      body: JSON.stringify({ recipientId: activePartnerId, content: input.trim() }),
    });
    setInput('');
  };

  const activeInboxEntry = inbox.find(e => e.partnerId === activePartnerId);
  const totalUnread = inbox.reduce((s, e) => s + (e.unread || 0), 0);

  return (
    <div style={{
      position: 'fixed', top: 0, left: '72px', bottom: 0, width: '780px', zIndex: 100,
      backgroundColor: 'var(--color-bg-base)', display: 'flex', flexDirection: 'column',
      boxShadow: '4px 0 24px rgba(0,0,0,0.5)', borderRight: '1px solid var(--color-bg-elevation-2)',
    }}>
      {/* Header */}
      <div style={{ height: '56px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 20px', borderBottom: '1px solid var(--color-bg-elevation-2)', backgroundColor: 'var(--color-bg-elevation-1)', flexShrink: 0 }}>
        <span style={{ fontWeight: 700, fontSize: '15px', color: 'white', display: 'flex', alignItems: 'center', gap: '8px' }}>
          💬 Direct Messages {totalUnread > 0 && <span style={{ background: 'var(--color-danger)', color: 'white', borderRadius: '10px', padding: '1px 7px', fontSize: '11px', fontWeight: 700 }}>{totalUnread}</span>}
        </span>
        <button onClick={onClose} style={{ background: 'none', border: 'none', color: 'var(--color-text-muted)', cursor: 'pointer', fontSize: '18px', padding: '4px 8px', borderRadius: '4px' }}>×</button>
      </div>

      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left panel — inbox + search */}
        <div style={{ width: '240px', minWidth: '240px', borderRight: '1px solid var(--color-bg-elevation-2)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-elevation-1)' }}>
          <div style={{ padding: '10px 12px' }}>
            <input
              placeholder="Find or start a DM…"
              value={searchQ}
              onChange={e => handleSearch(e.target.value)}
              style={{ width: '100%', background: 'var(--color-bg-elevation-2)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px', padding: '7px 10px', color: 'white', fontSize: '13px', boxSizing: 'border-box' }}
            />
          </div>

          <div style={{ flex: 1, overflowY: 'auto' }}>
            {searchQ ? (
              <>
                {searching && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', padding: '12px' }}>Searching…</p>}
                {searchResults.map(u => (
                  <button key={u.id} onClick={() => openConversation(u.id)}
                    style={{ width: '100%', background: 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#5865f2,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '13px', flexShrink: 0 }}>
                      {u.username.charAt(0).toUpperCase()}
                    </div>
                    <span style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: 500 }}>{u.username}</span>
                  </button>
                ))}
                {!searching && searchResults.length === 0 && <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', padding: '12px' }}>No users found</p>}
              </>
            ) : (
              <>
                {inbox.length === 0 && (
                  <p style={{ padding: '16px', color: 'var(--color-text-muted)', fontSize: '13px', textAlign: 'center' }}>No conversations yet.<br/>Search for a user above.</p>
                )}
                {inbox.map(entry => (
                  <button key={entry.partnerId} onClick={() => openConversation(entry.partnerId)}
                    style={{ width: '100%', background: activePartnerId === entry.partnerId ? 'rgba(88,101,242,0.15)' : 'none', border: 'none', cursor: 'pointer', padding: '10px 14px', display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', borderLeft: activePartnerId === entry.partnerId ? '2px solid var(--color-primary)' : '2px solid transparent' }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'linear-gradient(135deg,#5865f2,#7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 700, fontSize: '13px' }}>
                        {(entry.partnerName || '?').charAt(0).toUpperCase()}
                      </div>
                      {entry.unread > 0 && (
                        <div style={{ position: 'absolute', top: '-3px', right: '-3px', width: '14px', height: '14px', background: 'var(--color-danger)', borderRadius: '50%', fontSize: '9px', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{entry.unread > 9 ? '9+' : entry.unread}</div>
                      )}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: '13px', color: '#e2e8f0', fontWeight: entry.unread > 0 ? 700 : 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.partnerName}</div>
                      {entry.lastMessage && <div style={{ fontSize: '11px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{entry.lastMessage}</div>}
                    </div>
                  </button>
                ))}
              </>
            )}
          </div>
        </div>

        {/* Right panel — conversation */}
        {activePartnerId ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            {/* Convo header */}
            <div style={{ height: '48px', display: 'flex', alignItems: 'center', padding: '0 16px', borderBottom: '1px solid var(--color-bg-elevation-2)', backgroundColor: 'var(--color-bg-elevation-1)', flexShrink: 0 }}>
              <span style={{ fontWeight: 600, fontSize: '14px', color: 'white' }}>@ {activeInboxEntry?.partnerName || `User #${activePartnerId}`}</span>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {messages.length === 0 && (
                <p style={{ textAlign: 'center', color: 'var(--color-text-muted)', fontSize: '13px', marginTop: '40px' }}>No messages yet. Say hi! 👋</p>
              )}
              {messages.map((dm, i) => {
                const isOwn = dm.sender?.username === user?.username || dm.sender?.id === user?.id;
                return (
                  <div key={dm.id || i} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
                    <div style={{ maxWidth: '70%', backgroundColor: isOwn ? 'var(--color-primary)' : 'var(--color-bg-elevation-2)', borderRadius: isOwn ? '16px 4px 16px 16px' : '4px 16px 16px 16px', padding: '8px 14px' }}>
                      <p style={{ margin: 0, fontSize: '14px', color: 'white', lineHeight: 1.5, wordBreak: 'break-word' }}>{dm.content}</p>
                    </div>
                    <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '2px', opacity: 0.6 }}>
                      {dm.timestamp ? new Date(dm.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '12px 16px', borderTop: '1px solid var(--color-bg-elevation-2)', flexShrink: 0 }}>
              <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), sendMessage())}
                  placeholder={`Message @${activeInboxEntry?.partnerName || '...'}`}
                  style={{ flex: 1, background: 'var(--color-bg-elevation-2)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '8px', padding: '10px 14px', color: 'white', fontSize: '14px' }}
                />
                <button onClick={sendMessage} disabled={!input.trim() || !connected}
                  style={{ background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '8px', padding: '10px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '13px', opacity: !input.trim() || !connected ? 0.5 : 1 }}>
                  Send
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '40px', marginBottom: '12px' }}>💬</div>
              <p style={{ fontSize: '15px', fontWeight: 600, color: '#e2e8f0' }}>Your Direct Messages</p>
              <p style={{ fontSize: '13px', margin: '4px 0 0' }}>Select a conversation or search for a user to start chatting</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DMView;
