import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Bookmark, X } from 'lucide-react';

const SavedMessages = ({ onClose }) => {
  const [savedMessages, setSavedMessages] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadSaved = async () => {
    setLoading(true);
    try {
      const res = await axios.get('http://localhost:9090/api/messages/saved');
      setSavedMessages(res.data);
    } catch (err) {
      console.error('Failed to load saved messages', err);
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadSaved(); }, []);

  const handleUnsave = async (messageId) => {
    try {
      await axios.delete(`http://localhost:9090/api/messages/${messageId}/save`);
      setSavedMessages(prev => prev.filter(sm => sm.message?.id !== messageId));
    } catch (err) { console.error('Unsave failed', err); }
  };

  return (
    <div style={{
      flex: 1, display: 'flex', flexDirection: 'column',
      backgroundColor: 'var(--color-bg-base)', overflow: 'hidden',
    }}>
      {/* Header */}
      <div style={{
        height: '56px', padding: '0 20px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-bg-elevation-2)',
        backgroundColor: 'var(--color-bg-elevation-1)', flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bookmark size={18} color="#f59e0b" />
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'white' }}>Saved Messages</h3>
        </div>
        {onClose && (
          <button onClick={onClose} style={{ color: 'var(--color-text-muted)', background: 'none', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <X size={18} />
          </button>
        )}
      </div>

      {/* Content */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '20px 24px' }} className="no-scrollbar">
        {loading ? (
          <div style={{ color: 'var(--color-text-muted)', fontSize: '14px', textAlign: 'center', marginTop: '40px' }}>
            Loading saved messages…
          </div>
        ) : savedMessages.length === 0 ? (
          <div style={{ textAlign: 'center', marginTop: '60px' }}>
            <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔖</div>
            <h3 style={{ color: 'white', marginBottom: '8px' }}>No saved messages yet</h3>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>
              Click the <strong>🔖 Save</strong> button on any message to save it here.
            </p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {savedMessages.map(sm => {
              const msg = sm.message;
              if (!msg) return null;
              return (
                <div key={sm.id} style={{
                  backgroundColor: 'var(--color-bg-elevation-2)',
                  borderRadius: '10px', padding: '14px 16px',
                  border: '1px solid var(--color-bg-elevation-3)',
                  position: 'relative',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
                      <div style={{
                        width: '26px', height: '26px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, #374151, #4b5563)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '11px', color: 'white', fontWeight: '700',
                      }}>
                        {(msg.user?.username || '?').charAt(0).toUpperCase()}
                      </div>
                      <span style={{ fontWeight: '600', fontSize: '13px', color: '#cbd5e1' }}>
                        {msg.user?.username}
                      </span>
                      <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                        {new Date(msg.timestamp).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                        {' '}
                        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <button
                      onClick={() => handleUnsave(msg.id)}
                      title="Remove from saved"
                      style={{
                        color: 'var(--color-text-muted)', background: 'none', border: 'none',
                        cursor: 'pointer', padding: '2px', borderRadius: '4px', fontSize: '13px',
                      }}
                    >✕</button>
                  </div>
                  {msg.content && (
                    <p style={{ margin: '0 0 (msg.snippet ? 8 : 0)px', fontSize: '14px', lineHeight: '1.55', color: 'var(--color-text-base)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                    </p>
                  )}
                  {msg.snippet?.codeContent && (
                    <div style={{ marginTop: msg.content ? '8px' : '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)', background: '#0d1117' }}>
                      <div style={{ backgroundColor: '#161b22', padding: '4px 10px', fontSize: '11px', color: '#8b949e', textTransform: 'uppercase' }}>
                        {msg.snippet.language || 'code'}
                      </div>
                      <pre style={{ margin: 0, padding: '10px 12px', fontSize: '12px', lineHeight: '1.5', overflowX: 'auto', maxHeight: '180px', color: '#e6edf3', fontFamily: 'var(--font-family-mono)' }}>
                        {msg.snippet.codeContent}
                      </pre>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default SavedMessages;
