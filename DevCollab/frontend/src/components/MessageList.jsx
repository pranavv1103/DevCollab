import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';
import ChatInput from './ChatInput';
import Modal from './Modal';
import Prism from 'prismjs';
import 'prismjs/themes/prism-twilight.css';
import { Sparkles, FileText, Code, ChevronDown, Bug, ClipboardList } from 'lucide-react';

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
  const messageIdsRef = useRef(new Set()); // for deduplication
  const [aiModalContent, setAiModalContent] = useState({ isOpen: false, title: '', message: '' });
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const aiMenuRef = useRef(null);

  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

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
          return (
            <div key={msg.id || idx} className="message-container" style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }}>
              {/* Thread reply indicator */}
              {msg.parentMessage && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', marginLeft: isOwn ? 0 : '12px', marginRight: isOwn ? '12px' : 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '14px', height: '10px', borderLeft: '2px solid var(--color-bg-elevation-3)', borderTop: '2px solid var(--color-bg-elevation-3)', borderTopLeftRadius: '4px', flexShrink: 0 }} />
                  Replying to <strong>{msg.parentMessage.user?.username}</strong>: {(msg.parentMessage.content || '').substring(0, 40)}{(msg.parentMessage.content?.length || 0) > 40 ? '…' : ''}
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                {!isOwn && (
                  <div style={{ width: '28px', height: '28px', borderRadius: '50%', background: 'linear-gradient(135deg, #5865f2, #7c3aed)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', color: 'white', fontWeight: '700', flexShrink: 0 }}>
                    {(msg.user?.username || '?').charAt(0).toUpperCase()}
                  </div>
                )}
                <span style={{ fontWeight: '700', fontSize: '13px', color: isOwn ? 'var(--color-primary)' : 'var(--color-text-base)' }}>
                  {msg.user?.username}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.isEdited && <em> (edited)</em>}
                </span>
              </div>

              <div className="message-bubble" style={{
                backgroundColor: isOwn ? 'var(--color-primary)' : 'var(--color-bg-elevation-2)',
                padding: '8px 12px', borderRadius: '8px', maxWidth: '75%', position: 'relative',
                borderTopRightRadius: isOwn ? '2px' : '8px',
                borderTopLeftRadius: isOwn ? '8px' : '2px',
              }}>
                {msg.content && <p style={{ whiteSpace: 'pre-wrap', margin: 0, fontSize: '14px', lineHeight: '1.5' }}>{msg.content}</p>}

                {msg.snippet?.codeContent && (
                  <div style={{ marginTop: msg.content ? '8px' : '0', borderRadius: '6px', overflow: 'hidden', border: '1px solid #2a2a2a' }}>
                    <div style={{ backgroundColor: '#1a1a1a', padding: '4px 10px', fontSize: '11px', color: '#666', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      {msg.snippet.language || 'code'}
                    </div>
                    <pre style={{ margin: 0, padding: '12px', fontSize: '13px', lineHeight: '1.5', backgroundColor: '#0d0d0d', overflowX: 'auto' }}>
                      <code className={`language-${msg.snippet.language || 'javascript'}`}>
                        {msg.snippet.codeContent}
                      </code>
                    </pre>
                    <div style={{ display: 'flex', backgroundColor: '#1a1a1a', borderTop: '1px solid #2a2a2a', padding: '4px 8px' }}>
                      <button
                        onClick={() => handleAiAction('explain', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language })}
                        style={{ flex: 1, color: '#888', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '5px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.color = '#fff'}
                        onMouseOut={e => e.currentTarget.style.color = '#888'}
                      ><FileText size={13} /> Explain</button>
                      <div style={{ width: '1px', backgroundColor: '#2a2a2a' }} />
                      <button
                        onClick={() => handleAiAction('suggest', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language })}
                        style={{ flex: 1, color: '#888', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '5px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.color = '#fff'}
                        onMouseOut={e => e.currentTarget.style.color = '#888'}
                      ><Code size={13} /> Suggest</button>
                      <div style={{ width: '1px', backgroundColor: '#2a2a2a' }} />
                      <button
                        onClick={() => handleAiAction('code-review', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language })}
                        style={{ flex: 1, color: '#888', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '5px', padding: '5px', background: 'transparent', border: 'none', cursor: 'pointer', transition: 'color 0.15s' }}
                        onMouseOver={e => e.currentTarget.style.color = '#fff'}
                        onMouseOut={e => e.currentTarget.style.color = '#888'}
                      ><Sparkles size={13} /> Review</button>
                    </div>
                  </div>
                )}
              </div>

              {/* Message action toolbar (hover-only via CSS) */}
              <div className="message-actions" style={{ display: 'flex', gap: '4px', marginTop: '4px' }}>
                <button className="btn-icon" style={{ fontSize: '11px', padding: '3px 7px', color: 'var(--color-text-muted)' }} onClick={() => setReplyTo(msg)}>↩ Reply</button>
                {isOwn && <button className="btn-icon" style={{ fontSize: '11px', padding: '3px 7px', color: 'var(--color-text-muted)' }} onClick={() => setEditingMessage(msg)}>✏ Edit</button>}
                {isOwn && <button className="btn-icon" style={{ fontSize: '11px', padding: '3px 7px', color: 'var(--color-danger)' }} onClick={() => handleDeleteMessage(msg.id)}>🗑 Delete</button>}
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
            <div style={{ color: 'var(--color-text-base)', lineHeight: '1.7', whiteSpace: 'pre-wrap', backgroundColor: 'var(--color-bg-base)', padding: '16px', borderRadius: '8px', border: '1px solid var(--color-bg-elevation-3)', maxHeight: '60vh', overflowY: 'auto', fontSize: '14px' }} className="no-scrollbar">
              {aiModalContent.message}
            </div>
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
              <button onClick={() => setAiModalContent(v => ({ ...v, isOpen: false }))} className="btn-primary">Got it</button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
};

export default MessageList;

