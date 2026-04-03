import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';
import ChatInput from './ChatInput';
import Modal from './Modal';
import Prism from 'prismjs';
import 'prismjs/themes/prism-twilight.css';
import { Sparkles, FileText, Code } from 'lucide-react';

const MessageList = ({ channelId, channelName }) => {
  const [messages, setMessages] = useState([]);
  const { stompClient, connected } = useContext(WebSocketContext);
  const { user } = useContext(AuthContext);
  const messagesEndRef = useRef(null);
  const subscriptionRef = useRef(null);
  const typingSubRef = useRef(null);
  const editsSubRef = useRef(null);
  const deletesSubRef = useRef(null);
  const reactionsSubRef = useRef(null);
  const [aiModalContent, setAiModalContent] = useState({ isOpen: false, title: '', message: '' });
  
  const [typingUsers, setTypingUsers] = useState([]);
  const [replyTo, setReplyTo] = useState(null);
  const [editingMessage, setEditingMessage] = useState(null);

  useEffect(() => {
    fetchMessages();
  }, [channelId]);

  useEffect(() => {
    Prism.highlightAll();
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    if (connected && stompClient && channelId) {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      if (typingSubRef.current) typingSubRef.current.unsubscribe();
      if (editsSubRef.current) editsSubRef.current.unsubscribe();
      if (deletesSubRef.current) deletesSubRef.current.unsubscribe();
      if (reactionsSubRef.current) reactionsSubRef.current.unsubscribe();

      subscriptionRef.current = stompClient.subscribe(`/topic/channels/${channelId}`, (msgOutput) => {
        const newMsg = JSON.parse(msgOutput.body);
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
      });

      reactionsSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/reactions`, (output) => {
         // Naive append for demo purposes, since full toggling requires DB synchronization.
      });
    }

    return () => {
      if (subscriptionRef.current) subscriptionRef.current.unsubscribe();
      if (typingSubRef.current) typingSubRef.current.unsubscribe();
      if (editsSubRef.current) editsSubRef.current.unsubscribe();
      if (deletesSubRef.current) deletesSubRef.current.unsubscribe();
      if (reactionsSubRef.current) reactionsSubRef.current.unsubscribe();
    };
  }, [connected, stompClient, channelId]);

  const fetchMessages = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/channels/${channelId}/messages?page=0&size=50`);
      // API returns newest first due to OrderByTimestampDesc, we need to reverse for chat view
      setMessages(res.data.content.reverse());
    } catch (error) {
      console.error("Failed to fetch messages", error);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = (text, codeSnippet, language, parentMessageId) => {
    if (stompClient && connected) {
      if (editingMessage) {
        stompClient.publish({
          destination: `/app/chat.editMessage/${channelId}`,
          body: JSON.stringify({ messageId: editingMessage.id, content: text })
        });
        setEditingMessage(null);
      } else {
        stompClient.publish({
          destination: `/app/chat.sendMessage/${channelId}`,
          body: JSON.stringify({ content: text, codeContent: codeSnippet, language, parentMessageId })
        });
      }
    }
  };

  const handleDeleteMessage = (messageId) => {
    if (window.confirm("Delete this message?")) {
      stompClient.publish({
        destination: `/app/chat.deleteMessage/${channelId}`,
        body: JSON.stringify({ messageId })
      });
    }
  };

  const handleTyping = (isTyping) => {
    if (stompClient && connected) {
       stompClient.publish({
         destination: `/app/chat.typing/${channelId}`,
         body: JSON.stringify({ typing: isTyping })
       });
    }
  };

  const handleAiAction = async (action, payload) => {
    try {
      const res = await axios.post(`http://localhost:9090/api/ai/${action}`, payload);
      let title = "AI Assistant";
      if (action === 'explain') title = "Code Explanation";
      if (action === 'summarize') title = "Chat Summary";
      if (action === 'suggest') title = "Code Suggestions";
      if (action === 'standup') title = "Daily Standup";
      if (action === 'bug-triage') title = "Bug Triage";
      if (action === 'meeting-notes') title = "Meeting Notes";
      setAiModalContent({ isOpen: true, title, message: res.data.result });
    } catch (error) {
      console.error("AI action failed", error);
    }
  };

  const summarizeChat = () => {
    const textMessages = messages.slice(-20).map(m => `${m.user.username}: ${m.content}`);
    handleAiAction('summarize', { chatMessages: textMessages });
  };

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--color-bg-base)' }}>
      {/* Header */}
      <div style={{
        height: '48px', padding: '0 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        borderBottom: '1px solid var(--color-bg-elevation-2)', boxShadow: '0 1px 2px rgba(0,0,0,0.1)'
      }}>
        <h3 style={{ fontSize: '16px', fontWeight: 'bold', margin: '0' }}># {channelName || `channel-${channelId}`}</h3>
        <div style={{ display: 'flex', gap: '8px' }}>
          <button onClick={() => handleAiAction('standup', {})} className="btn-icon" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-success)' }} title="Daily Standup">
            <Sparkles size={14} /> Standup
          </button>
          <button onClick={() => handleAiAction('meeting-notes', {})} className="btn-icon" style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px', color: 'var(--color-primary)' }} title="Meeting Notes">
            <Sparkles size={14} /> Notes
          </button>
          <button 
            onClick={summarizeChat}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--color-primary)', fontSize: '14px', fontWeight: 'bold' }}
            title="Summarize Chat"
          >
            <Sparkles size={16} /> Summarize
          </button>
        </div>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, padding: '16px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }} className="no-scrollbar">
        {messages.map((msg, idx) => {
          const isOwn = user && msg.user && msg.user.username === user.username;
          return (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: isOwn ? 'flex-end' : 'flex-start' }} className="message-container">
              
              {/* Thread Reply Context Bubble */}
              {msg.parentMessage && (
                <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', marginBottom: '4px', marginLeft: isOwn ? 0 : '12px', marginRight: isOwn ? '12px' : 0, display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <div style={{ width: '16px', height: '12px', borderLeft: '2px solid var(--color-bg-elevation-3)', borderTop: '2px solid var(--color-bg-elevation-3)', borderTopLeftRadius: '4px' }} />
                  Replying to <strong>{msg.parentMessage.user?.username}</strong>: {msg.parentMessage.content?.substring(0, 30)}...
                </div>
              )}

              <div style={{ display: 'flex', alignItems: 'center', marginBottom: '4px', gap: '8px' }}>
                <span style={{ fontWeight: 'bold', fontSize: '14px', color: isOwn ? 'var(--color-primary)' : 'var(--color-text-base)' }}>
                  {msg.user.username}
                </span>
                <span style={{ fontSize: '12px', color: 'var(--color-text-muted)' }}>
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  {msg.isEdited && ' (edited)'}
                </span>
              </div>
              
              <div className="message-bubble" style={{
                backgroundColor: isOwn ? 'var(--color-primary)' : 'var(--color-bg-elevation-2)',
                padding: '8px 12px', borderRadius: '8px', maxWidth: '80%', position: 'relative',
                borderTopRightRadius: isOwn ? '0' : '8px',
                borderTopLeftRadius: !isOwn ? '0' : '8px'
              }}>
                <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.content}</p>
                
                {msg.snippet && msg.snippet.codeContent && (
                  <div style={{ marginTop: '8px', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ backgroundColor: '#141414', padding: '4px 8px', fontSize: '10px', color: '#888', textTransform: 'uppercase' }}>
                      {msg.snippet.language}
                    </div>
                    <pre style={{ margin: 0, padding: '12px', fontSize: '13px' }}>
                      <code className={`language-${msg.snippet.language || 'javascript'}`}>
                        {msg.snippet.codeContent}
                      </code>
                    </pre>
                    <div style={{ display: 'flex', backgroundColor: '#141414', borderTop: '1px solid #333', padding: '4px' }}>
                      <button 
                        onClick={() => handleAiAction('explain', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language })}
                        style={{ flex: 1, color: 'var(--color-text-muted)', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <FileText size={14} /> Explain
                      </button>
                      <div style={{ width: '1px', backgroundColor: '#333' }} />
                      <button 
                         onClick={() => handleAiAction('suggest', { codeSnippet: msg.snippet.codeContent, language: msg.snippet.language })}
                        style={{ flex: 1, color: 'var(--color-text-muted)', fontSize: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '4px', padding: '4px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                      >
                        <Code size={14} /> Suggest Improvements
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Action Menu Toolbar */}
              <div className="message-actions" style={{ display: 'flex', gap: '8px', marginTop: '4px', fontSize: '12px', opacity: 0.8 }}>
                 <button className="btn-icon" style={{ fontSize: '10px', padding: '2px 4px' }} onClick={() => setReplyTo(msg)}>Reply</button>
                 {isOwn && <button className="btn-icon" style={{ fontSize: '10px', padding: '2px 4px' }} onClick={() => setEditingMessage(msg)}>Edit</button>}
                 {isOwn && <button className="btn-icon" style={{ fontSize: '10px', padding: '2px 4px', color: 'var(--color-danger)' }} onClick={() => handleDeleteMessage(msg.id)}>Delete</button>}
              </div>

            </div>
          );
        })}
        {typingUsers.length > 0 && (
           <div style={{ fontSize: '12px', color: 'var(--color-text-muted)', fontStyle: 'italic', paddingLeft: '8px' }}>
             {typingUsers.join(', ')} {typingUsers.length > 1 ? 'are' : 'is'} typing...
           </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div style={{ padding: '0 16px 16px 16px' }}>
        <ChatInput 
          onSend={handleSendMessage} 
          onTyping={handleTyping} 
          replyTo={replyTo} 
          onCancelReply={() => setReplyTo(null)} 
        />
      </div>

      <Modal isOpen={aiModalContent.isOpen} onClose={() => setAiModalContent({ ...aiModalContent, isOpen: false })} title={aiModalContent.title}>
        <div style={{ color: 'var(--color-text-base)', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>
          {aiModalContent.message}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '16px' }}>
          <button onClick={() => setAiModalContent({ ...aiModalContent, isOpen: false })} className="btn-primary">Got it</button>
        </div>
      </Modal>
    </div>
  );
};

export default MessageList;
