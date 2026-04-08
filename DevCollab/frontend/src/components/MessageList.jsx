import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';
import ChatInput from './ChatInput';
import Modal from './Modal';
import Prism from 'prismjs';
import 'prismjs/themes/prism-twilight.css';
import { Sparkles, FileText, Code, ChevronDown, Bug, ClipboardList, Search, Brain } from 'lucide-react';

// ── Inline markdown renderer ──────────────────────────────────────────────────
const renderInline = (text, key) => {
  if (!text) return null;
  const parts = [];
  const regex = /\*\*(.+?)\*\*|`([^`]+)`|_(.+?)_/g;
  let last = 0, m, idx = 0;
  while ((m = regex.exec(text)) !== null) {
    if (m.index > last) parts.push(<span key={idx++}>{text.slice(last, m.index)}</span>);
    if (m[1]) parts.push(<strong key={idx++} style={{ color: '#e2e8f0' }}>{m[1]}</strong>);
    else if (m[2]) parts.push(<code key={idx++} style={{ background: 'rgba(255,255,255,0.1)', borderRadius: '3px', padding: '1px 5px', fontSize: '12px', fontFamily: 'monospace', color: '#93c5fd' }}>{m[2]}</code>);
    else if (m[3]) parts.push(<em key={idx++}>{m[3]}</em>);
    last = m.index + m[0].length;
  }
  if (last < text.length) parts.push(<span key={idx++}>{text.slice(last)}</span>);
  return <span key={key}>{parts}</span>;
};

const renderMarkdown = (text) => {
  if (!text) return null;
  return text.split('\n').map((line, i) => {
    if (line.startsWith('### ')) return <h4 key={i} style={{ margin: '14px 0 4px', fontSize: '13px', fontWeight: '700', color: '#e2e8f0', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{renderInline(line.slice(4), i)}</h4>;
    if (line.startsWith('## ')) return <h3 key={i} style={{ margin: '16px 0 6px', fontSize: '15px', fontWeight: '700', color: 'white' }}>{renderInline(line.slice(3), i)}</h3>;
    if (line.startsWith('# ')) return <h2 key={i} style={{ margin: '0 0 12px', fontSize: '17px', fontWeight: '800', color: 'white', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>{renderInline(line.slice(2), i)}</h2>;
    if (line.startsWith('- [ ] ') || line.startsWith('* [ ] ')) return <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', paddingLeft: '4px' }}><span style={{ color: '#475569', fontSize: '14px', flexShrink: 0 }}>☐</span><span>{renderInline(line.slice(6), i)}</span></div>;
    if (line.startsWith('- [x] ') || line.startsWith('* [x] ')) return <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', paddingLeft: '4px' }}><span style={{ color: 'var(--color-success)', fontSize: '14px', flexShrink: 0 }}>☑</span><span style={{ textDecoration: 'line-through', opacity: 0.6 }}>{renderInline(line.slice(6), i)}</span></div>;
    if (line.startsWith('- ') || line.startsWith('* ')) return <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', paddingLeft: '4px' }}><span style={{ color: 'var(--color-primary)', fontSize: '10px', flexShrink: 0, marginTop: '2px' }}>●</span><span>{renderInline(line.slice(2), i)}</span></div>;
    if (/^\d+\.\s/.test(line)) { const m2 = line.match(/^(\d+)\.\s(.*)/); return m2 ? <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px', paddingLeft: '4px' }}><span style={{ color: 'var(--color-primary)', fontSize: '12px', fontWeight: '700', flexShrink: 0, minWidth: '18px' }}>{m2[1]}.</span><span>{renderInline(m2[2], i)}</span></div> : <p key={i} style={{ margin: '2px 0' }}>{renderInline(line, i)}</p>; }
    if (line.trim() === '') return <div key={i} style={{ height: '8px' }} />;
    return <p key={i} style={{ margin: '2px 0', lineHeight: '1.65' }}>{renderInline(line, i)}</p>;
  });
};

const MessageList = ({ channelId, channelName, userRole, serverId }) => {
  const [messages, setMessages] = useState([]);
  const { stompClient, connected } = useContext(WebSocketContext);
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingSubRef = useRef(null);
  const editsSubRef = useRef(null);
  const deletesSubRef = useRef(null);
  const reactionsSubRef = useRef(null);
  const messageIdsRef = useRef(new Set());
  const [aiModalContent, setAiModalContent] = useState({ isOpen: false, title: '', message: '' });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const aiMenuRef = useRef(null);
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);
  // Explain code inline modal
  const [explainModal, setExplainModal] = useState({ isOpen: false, code: '', language: 'javascript' });

  // Close AI menu on outside click
  useEffect(() => {
    const handler = (e) => { if (aiMenuRef.current && !aiMenuRef.current.contains(e.target)) setShowAiMenu(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    messageIdsRef.current = new Set();
    fetchMessages();
  }, [channelId]);

  useEffect(() => {
    Prism.highlightAll();
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (connected && stompClient && channelId) {
      [subscriptionRef, typingSubRef, editsSubRef, deletesSubRef, reactionsSubRef].forEach(r => {
        if (r.current) { r.current.unsubscribe(); r.current = null; }
      });

      subscriptionRef.current = stompClient.subscribe(`/topic/channels/${channelId}`, (msgOutput) => {
        const newMsg = JSON.parse(msgOutput.body);
        // Deduplicate by id (handle optimistic adds)
        if (newMsg.id && messageIdsRef.current.has(newMsg.id)) return;
        if (newMsg.id) messageIdsRef.current.add(newMsg.id);
        setMessages(prev => [...prev, newMsg]);
      });

      typingSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/typing`, (output) => {
        const { username, typing } = JSON.parse(output.body);
        if (username === user?.username) return;
        setTypingUsers(prev => {
          if (typing && !prev.includes(username)) return [...prev, username];
          if (!typing) return prev.filter(u => u !== username);
          return prev;
        });
      });

      editsSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/edits`, (output) => {
        const editedMsg = JSON.parse(output.body);
        setMessages(prev => prev.map(m => m.id === editedMsg.id ? editedMsg : m));
      });

      deletesSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/deletes`, (output) => {
        const { messageId } = JSON.parse(output.body);
        setMessages(prev => prev.filter(m => m.id !== messageId));
        messageIdsRef.current.delete(messageId);
      });

      reactionsSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/reactions`, () => {});
    }

    return () => {
      [subscriptionRef, typingSubRef, editsSubRef, deletesSubRef, reactionsSubRef].forEach(r => {
        if (r.current) { r.current.unsubscribe(); r.current = null; }
      });
    };
  }, [connected, stompClient, channelId]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/channels/${channelId}/messages?page=0&size=50`);
      const msgs = res.data.content.reverse();
      const seen = new Set();
      msgs.forEach(m => { if (m.id) seen.add(m.id); });
      messageIdsRef.current = seen;
      setMessages(msgs);
    } catch (err) {
      console.error('Failed to fetch messages', err);
    }
  };

  const scrollToBottom = () => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });

  const handleSendMessage = async (text, codeSnippet, language, parentMessageId) => {
    if (editingMessage) {
      if (connected && stompClient) {
        stompClient.publish({
          destination: `/app/chat.editMessage/${channelId}`,
          body: JSON.stringify({ messageId: editingMessage.id, content: text }),
        });
      }
      setEditingMessage(null);
      return;
    }

    const payload = { content: text, codeContent: codeSnippet, language, parentMessageId };

    if (connected && stompClient) {
      stompClient.publish({
        destination: `/app/chat.sendMessage/${channelId}`,
        body: JSON.stringify(payload),
      });
    } else {
      // HTTP fallback when WebSocket is disconnected
      try {
        const res = await axios.post(`http://localhost:9090/api/channels/${channelId}/messages`, payload);
        const msg = res.data;
        if (msg.id && !messageIdsRef.current.has(msg.id)) {
          messageIdsRef.current.add(msg.id);
          setMessages(prev => [...prev, msg]);
        }
      } catch (err) {
        console.error('Failed to send message via HTTP fallback', err);
      }
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (!window.confirm('Delete this message?')) return;
    if (connected && stompClient) {
      stompClient.publish({
        destination: `/app/chat.deleteMessage/${channelId}`,
        body: JSON.stringify({ messageId }),
      });
    }
  };

  const handleTyping = (isTyping) => {
    if (connected && stompClient) {
      stompClient.publish({
        destination: `/app/chat.typing/${channelId}`,
        body: JSON.stringify({ typing: isTyping }),
      });
    }
  };

  const handleAiAction = async (action, payload) => {
    setShowAiMenu(false);
    setIsAiLoading(true);
    setAiModalContent({ isOpen: true, title: 'AI Assistant…', message: '' });
    try {
      const res = await axios.post(`http://localhost:9090/api/ai/${action}`, payload);
      const titles = {
        explain: '🧠 Code Explanation',
        summarize: '📄 Chat Summary',
        suggest: '💡 Code Suggestions',
        standup: '📅 Daily Standup',
        'meeting-notes': '📝 Meeting Notes',
        'bug-triage': '🐛 Bug Triage',
        'code-review': '🔍 Code Review',
      };
      setAiModalContent({ isOpen: true, title: titles[action] || '✨ AI Assistant', message: res.data.result });
    } catch (err) {
      setAiModalContent({ isOpen: true, title: '⚠️ AI Error', message: 'Failed to generate AI response. Please try again.' });
    } finally {
      setIsAiLoading(false);
    }
  };

  const summarizeChat = () => {
    const textMessages = messages.slice(-20).map(m => `${m.user?.username}: ${m.content}`);
    handleAiAction('summarize', { chatMessages: textMessages });
  };

  const generateStandup = () => {
    const textMessages = messages.slice(-30).map(m => `${m.user?.username}: ${m.content}`);
    handleAiAction('standup', { chatMessages: textMessages });
  };

  const generateMeetingNotes = () => {
    const textMessages = messages.slice(-50).map(m => `${m.user?.username}: ${m.content}`);
    handleAiAction('meeting-notes', { chatMessages: textMessages });
  };

  const triageBugs = () => {
    const textMessages = messages.slice(-30).map(m => `${m.user?.username}: ${m.content}`);
    handleAiAction('bug-triage', { chatMessages: textMessages });
  };

  const openExplainModal = () => {
    setShowAiMenu(false);
    setExplainModal({ isOpen: true, code: '', language: 'javascript' });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-base)', overflow: 'hidden' }}>
      {/* Header */}
      <div style={{
        height: '56px', padding: '0 20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-bg-elevation-2)', boxShadow: '0 1px 4px rgba(0,0,0,0.15)', flexShrink: 0,
        backgroundColor: 'var(--color-bg-elevation-1)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span style={{ color: 'var(--color-text-muted)', fontWeight: '800', fontSize: '20px' }}>#</span>
          <h3 style={{ fontSize: '16px', fontWeight: '700', margin: 0, color: 'white' }}>{channelName || `channel-${channelId}`}</h3>
          {!connected && (
            <span style={{ fontSize: '11px', backgroundColor: 'rgba(237,66,69,0.2)', color: 'var(--color-danger)', padding: '2px 8px', borderRadius: '10px', fontWeight: '600' }}>
              Reconnecting…
            </span>
          )}
        </div>
        {/* AI Dropdown */}
        <div style={{ position: 'relative' }} ref={aiMenuRef}>
          <button
            onClick={() => setShowAiMenu(v => !v)}
            style={{
              display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', fontWeight: '600',
              color: 'white', backgroundColor: 'var(--color-primary)', border: 'none',
              padding: '6px 12px', borderRadius: '6px', cursor: 'pointer',
            }}
          >
            <Sparkles size={15} /> AI Tools <ChevronDown size={13} style={{ transition: 'transform 0.2s', transform: showAiMenu ? 'rotate(180deg)' : 'rotate(0)' }} />
          </button>
          {showAiMenu && (
            <div style={{
              position: 'absolute', right: 0, top: '38px', zIndex: 100,
              backgroundColor: 'var(--color-bg-elevation-2)',
              border: '1px solid var(--color-bg-elevation-3)',
              borderRadius: '8px', boxShadow: 'var(--shadow-lg)',
              minWidth: '190px', overflow: 'hidden',
            }}>
              {[
                { label: 'Daily Standup', icon: <Sparkles size={14} />, action: generateStandup },
                { label: 'Summarize Chat', icon: <FileText size={14} />, action: summarizeChat },
                { label: 'Meeting Notes', icon: <ClipboardList size={14} />, action: generateMeetingNotes },
                { label: 'Bug Triage', icon: <Bug size={14} />, action: triageBugs },
                { label: 'Explain Code', icon: <Brain size={14} />, action: openExplainModal },
              ].map(item => (
                <button
                  key={item.label}
                  onClick={item.action}
                  style={{
                    display: 'flex', alignItems: 'center', gap: '10px',
                    width: '100%', padding: '10px 14px', textAlign: 'left',
                    fontSize: '14px', color: 'var(--color-text-base)',
                    backgroundColor: 'transparent', border: 'none', cursor: 'pointer',
                    transition: 'background-color 0.1s',
                  }}
                  onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'}
                  onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  {item.icon} {item.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px 24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }} className="no-scrollbar">
        {messages.length === 0 && (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'flex-end', paddingBottom: '24px' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-bg-elevation-3)', display: 'flex', justifyContent: 'center', alignItems: 'center', marginBottom: '16px' }}>
              <span style={{ fontSize: '32px' }}>👋</span>
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: '800', margin: '0 0 8px', color: 'white' }}>Welcome to #{channelName || `channel-${channelId}`}!</h2>
            <p style={{ color: 'var(--color-text-muted)', fontSize: '15px', margin: 0 }}>This is the beginning of the channel. Be the first to say hello!</p>
          </div>
        )}

        {messages.map((msg, idx) => {
          const isOwn = user && msg.user && msg.user.username === user.username;
          const hasCode = !!msg.snippet?.codeContent;
          return (
            <div key={msg.id || idx} className="message-container" style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start', maxWidth: '100%' }}>
              {/* Reply / thread quote */}
              {msg.parentMessage && (
                <div style={{
                  display: 'flex', alignItems: 'stretch', gap: '0',
                  marginBottom: '4px',
                  marginLeft: isOwn ? 0 : '36px',
                  marginRight: isOwn ? '4px' : 0,
                  maxWidth: '70%',
                }}>
                  <div style={{ width: '2px', background: 'var(--color-bg-elevation-3)', borderRadius: '2px', flexShrink: 0 }} />
                  <div style={{
                    fontSize: '12px', color: 'var(--color-text-muted)',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '0 6px 6px 0',
                    padding: '5px 10px',
                    borderTop: '1px solid var(--color-bg-elevation-3)',
                    borderRight: '1px solid var(--color-bg-elevation-3)',
                    borderBottom: '1px solid var(--color-bg-elevation-3)',
                    overflow: 'hidden',
                  }}>
                    <span style={{ color: 'var(--color-primary)', fontWeight: '600', marginRight: '5px' }}>@{msg.parentMessage.user?.username}</span>
                    <span style={{ opacity: 0.7 }}>{(msg.parentMessage.content || '').substring(0, 80)}{(msg.parentMessage.content?.length || 0) > 80 ? '…' : ''}</span>
                  </div>
                </div>
              )}

              {/* Author row */}
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '3px', gap: '7px', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                <div style={{ width: '26px', height: '26px', borderRadius: '50%', background: isOwn ? 'linear-gradient(135deg, #5865f2, #667eea)' : 'linear-gradient(135deg, #374151, #4b5563)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '11px', color: 'white', fontWeight: '700', flexShrink: 0, overflow: 'hidden' }}>
                  {(msg.user?.username || '?').charAt(0).toUpperCase()}
                </div>
                <span style={{ fontWeight: '600', fontSize: '13px', color: isOwn ? 'var(--color-primary)' : '#cbd5e1' }}>
                  {msg.user?.username}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.isEdited && <em style={{ opacity: 0.6 }}> · edited</em>}
                </span>
              </div>

              {/* Bubble */}
              <div className="message-bubble" style={{
                backgroundColor: isOwn ? 'var(--color-primary)' : 'var(--color-bg-elevation-2)',
                padding: '9px 13px',
                borderRadius: isOwn ? '14px 4px 14px 14px' : '4px 14px 14px 14px',
                maxWidth: '72%',
                position: 'relative',
                boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
              }}>
                {msg.content && <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px', lineHeight: '1.55', wordBreak: 'break-word' }}>{msg.content}</p>}

                {hasCode && (
                  <div style={{ marginTop: msg.content ? '10px' : '0', borderRadius: '8px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.08)' }}>
                    <div style={{ backgroundColor: '#161b22', padding: '5px 12px', fontSize: '11px', color: '#8b949e', textTransform: 'uppercase', letterSpacing: '0.06em', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span>{msg.snippet.language || 'code'}</span>
                      <span style={{ opacity: 0.5 }}>{(msg.snippet.codeContent || '').split('\n').length} lines</span>
                    </div>
                    <pre style={{ margin: 0, padding: '12px 14px', fontSize: '12.5px', lineHeight: '1.6', backgroundColor: '#0d1117', overflowX: 'auto', maxHeight: '260px' }}>
                      <code className={`language-${msg.snippet.language || 'javascript'}`}>
                        {msg.snippet.codeContent}
                      </code>
                    </pre>
                    <div style={{ display: 'flex', backgroundColor: '#161b22', borderTop: '1px solid rgba(255,255,255,0.06)', padding: '3px 6px' }}>
                      {[
                        { label: 'Explain', icon: <Brain size={12} />, fn: () => handleAiAction('explain', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language }) },
                        { label: 'Suggest', icon: <Sparkles size={12} />, fn: () => handleAiAction('suggest', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language }) },
                        { label: 'Review', icon: <Code size={12} />, fn: () => handleAiAction('code-review', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language }) },
                      ].map((btn, bi) => (
                        <React.Fragment key={btn.label}>
                          {bi > 0 && <div style={{ width: '1px', backgroundColor: 'rgba(255,255,255,0.06)' }} />}
                          <button onClick={btn.fn}
                            style={{ flex: 1, color: '#6b7280', fontSize: '11px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', padding: '5px 4px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s', fontWeight: '500' }}
                            onMouseOver={e => e.currentTarget.style.color = '#e5e7eb'}
                            onMouseOut={e => e.currentTarget.style.color = '#6b7280'}
                          >{btn.icon}{btn.label}</button>
                        </React.Fragment>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Message actions (hover via CSS) */}
              <div className="message-actions" style={{ display: 'flex', gap: '3px', marginTop: '3px', flexDirection: isOwn ? 'row-reverse' : 'row' }}>
                <button className="btn-icon" style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--color-text-muted)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px' }} onClick={() => { setReplyTo(msg); setEditingMessage(null); }}>↩ Reply</button>
                {isOwn && <button className="btn-icon" style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--color-text-muted)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px' }} onClick={() => { setEditingMessage(msg); setReplyTo(null); }}>✏ Edit</button>}
                {isOwn && <button className="btn-icon" style={{ fontSize: '11px', padding: '3px 8px', color: 'var(--color-danger)', border: '1px solid rgba(237,66,69,0.3)', borderRadius: '6px' }} onClick={() => handleDeleteMessage(msg.id)}>Delete</button>}
              </div>
            </div>
          );
        })}

        {typingUsers.length > 0 && (
          <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing…
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '0 24px 20px 24px', flexShrink: 0 }}>
        <ChatInput
          onSend={handleSendMessage}
          onTyping={handleTyping}
          replyTo={replyTo}
          onCancelReply={() => setReplyTo(null)}
          editingMessage={editingMessage}
          onCancelEdit={() => setEditingMessage(null)}
        />
      </div>

      {/* AI Result Modal */}
      <Modal isOpen={aiModalContent.isOpen} onClose={() => { if (!isAiLoading) setAiModalContent(v => ({ ...v, isOpen: false })); }} title={aiModalContent.title}>
        {isAiLoading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '40px 0', gap: '16px' }}>
            <Sparkles size={40} color="var(--color-primary)" style={{ animation: 'ai-pulse 1.5s infinite ease-in-out' }} />
            <p style={{ color: 'var(--color-text-muted)', fontSize: '14px' }}>Generating AI response…</p>
            <style dangerouslySetInnerHTML={{ __html: `@keyframes ai-pulse { 0%,100%{transform:scale(0.9);opacity:.6} 50%{transform:scale(1.1);opacity:1} }` }} />
          </div>
        ) : (
          <>
            <div style={{ color: 'var(--color-text-base)', lineHeight: '1.7', backgroundColor: 'var(--color-bg-base)', padding: '16px 20px', borderRadius: '8px', border: '1px solid var(--color-bg-elevation-3)', maxHeight: '65vh', overflowY: 'auto', fontSize: '13.5px' }} className="no-scrollbar">
              {renderMarkdown(aiModalContent.message)}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}>
              <button onClick={() => setAiModalContent(v => ({ ...v, isOpen: false }))} className="btn-primary">Got it</button>
            </div>
          </>
        )}
      </Modal>

      {/* Explain Code Modal */}
      <Modal isOpen={explainModal.isOpen} onClose={() => setExplainModal(v => ({ ...v, isOpen: false }))} title="🧠 Explain Code">
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Language</label>
            <select value={explainModal.language} onChange={e => setExplainModal(v => ({ ...v, language: e.target.value }))}
              style={{ background: 'var(--color-bg-base)', color: 'white', border: '1px solid var(--color-bg-elevation-3)', padding: '6px 10px', borderRadius: '6px', outline: 'none', fontSize: '13px', width: '160px' }}>
              {['javascript','typescript','python','java','html','css','json','bash','sql','go','rust','cpp','c'].map(l => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: '600', color: 'var(--color-text-muted)', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Paste Code</label>
            <textarea
              value={explainModal.code}
              onChange={e => setExplainModal(v => ({ ...v, code: e.target.value }))}
              placeholder="Paste the code you want explained…"
              style={{ width: '100%', minHeight: '160px', padding: '12px', borderRadius: '8px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: '#0d1117', color: '#e6edf3', fontFamily: 'var(--font-family-mono)', fontSize: '13px', lineHeight: '1.6', outline: 'none', resize: 'vertical', boxSizing: 'border-box' }}
            />
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
            <button onClick={() => setExplainModal(v => ({ ...v, isOpen: false }))} className="btn-secondary">Cancel</button>
            <button
              onClick={() => {
                if (!explainModal.code.trim()) return;
                setExplainModal(v => ({ ...v, isOpen: false }));
                handleAiAction('explain', { codeSnippet: explainModal.code, language: explainModal.language });
              }}
              className="btn-primary"
              disabled={!explainModal.code.trim()}
            >
              Explain
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default MessageList;

