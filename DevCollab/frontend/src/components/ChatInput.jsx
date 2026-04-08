import React, { useState, useEffect, useRef } from 'react';
import { Send, Code, X, Edit2 } from 'lucide-react';

const ChatInput = ({ onSend, onTyping, replyTo, onCancelReply, editingMessage, onCancelEdit }) => {
  const [text, setText] = useState('');
  const [codeMode, setCodeMode] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [language, setLanguage] = useState('javascript');
  const textareaRef = useRef(null);

  // Pre-fill when editing an existing message
  useEffect(() => {
    if (editingMessage) {
      setText(editingMessage.content || '');
      if (editingMessage.snippet?.codeContent) {
        setCodeSnippet(editingMessage.snippet.codeContent);
        setCodeMode(true);
        if (editingMessage.snippet.language) setLanguage(editingMessage.snippet.language);
      }
      setTimeout(() => textareaRef.current?.focus(), 50);
    } else {
      if (!replyTo) { setText(''); setCodeSnippet(''); setCodeMode(false); }
    }
  }, [editingMessage]);

  useEffect(() => {
    if (replyTo) setTimeout(() => textareaRef.current?.focus(), 50);
  }, [replyTo]);

  const handleSend = () => {
    if (!text.trim() && !(codeMode && codeSnippet.trim())) return;
    onSend(text, codeMode ? codeSnippet : null, codeMode ? language : null, replyTo ? replyTo.id : null);
    setText('');
    setCodeSnippet('');
    setCodeMode(false);
    if (textareaRef.current) { textareaRef.current.style.height = '36px'; }
    if (onCancelReply) onCancelReply();
    if (onTyping) onTyping(false);
  };

  const handleCancel = () => {
    setText('');
    setCodeSnippet('');
    setCodeMode(false);
    if (editingMessage && onCancelEdit) onCancelEdit();
    if (replyTo && onCancelReply) onCancelReply();
    if (onTyping) onTyping(false);
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    const ta = e.target;
    ta.style.height = 'auto';
    ta.style.height = Math.min(ta.scrollHeight, 150) + 'px';
    if (onTyping) onTyping(e.target.value.length > 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
    if (e.key === 'Escape') handleCancel();
  };

  const isEditing = !!editingMessage;
  const isReplying = !!replyTo && !isEditing;
  const canSend = text.trim().length > 0 || (codeMode && codeSnippet.trim().length > 0);

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-elevation-2)',
      borderRadius: '12px',
      border: `1px solid ${isEditing ? 'rgba(88,101,242,0.45)' : 'var(--color-bg-elevation-3)'}`,
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      transition: 'border-color 0.15s',
    }}>
      {/* Edit / Reply Banner */}
      {(isEditing || isReplying) && (
        <div style={{
          background: isEditing ? 'rgba(88,101,242,0.12)' : 'rgba(88,101,242,0.07)',
          borderBottom: `1px solid ${isEditing ? 'rgba(88,101,242,0.3)' : 'rgba(88,101,242,0.15)'}`,
          padding: '7px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          fontSize: '12px',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '7px', minWidth: 0, overflow: 'hidden' }}>
            {isEditing
              ? <Edit2 size={12} color="var(--color-primary)" style={{ flexShrink: 0 }} />
              : <span style={{ color: 'var(--color-text-muted)', fontSize: '13px', flexShrink: 0 }}>↩</span>
            }
            <span style={{ color: '#94a3b8', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {isEditing
                ? <><span style={{ color: 'var(--color-primary)', fontWeight: '600' }}>Editing</span>{' · '}<span style={{ opacity: 0.65 }}>{(editingMessage.content || '').substring(0, 60)}</span></>
                : <>Replying to <strong style={{ color: 'white' }}>{replyTo.user?.username}</strong>{' · '}<span style={{ opacity: 0.65 }}>{(replyTo.content || '').substring(0, 55)}</span></>
              }
            </span>
          </div>
          <button onClick={handleCancel} title="Cancel (Esc)"
            style={{ color: '#64748b', border: 'none', background: 'transparent', cursor: 'pointer', padding: '2px 4px', borderRadius: '4px', display: 'flex', flexShrink: 0 }}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* Code Snippet Header */}
      {codeMode && (
        <div style={{ padding: '7px 12px', borderBottom: '1px solid var(--color-bg-elevation-3)', display: 'flex', gap: '8px', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.2)' }}>
          <Code size={13} color="var(--color-primary)" style={{ flexShrink: 0 }} />
          <span style={{ fontSize: '11px', color: '#64748b', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>Snippet</span>
          <select value={language} onChange={e => setLanguage(e.target.value)}
            style={{ background: 'var(--color-bg-base)', color: '#cbd5e1', border: '1px solid var(--color-bg-elevation-3)', padding: '3px 8px', borderRadius: '4px', outline: 'none', fontSize: '12px', marginLeft: '4px' }}>
            {['javascript','typescript','python','java','html','css','json','bash','sql','go','rust','cpp','c'].map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
          <button onClick={() => { setCodeMode(false); setCodeSnippet(''); }}
            style={{ color: '#64748b', fontSize: '11px', background: 'transparent', border: 'none', cursor: 'pointer', marginLeft: 'auto', padding: '2px 6px', borderRadius: '4px' }}>
            Remove
          </button>
        </div>
      )}

      {/* Code Textarea */}
      {codeMode && (
        <textarea placeholder="Paste your code here..." value={codeSnippet} onChange={e => setCodeSnippet(e.target.value)}
          style={{ width: '100%', backgroundColor: '#0d1117', color: '#e6edf3', fontFamily: 'var(--font-family-mono)', border: 'none', padding: '12px 16px', outline: 'none', resize: 'vertical', minHeight: '100px', fontSize: '13px', lineHeight: '1.6', boxSizing: 'border-box' }} />
      )}

      {/* Main Input Row */}
      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '8px 12px', gap: '6px' }}>
        <button onClick={() => setCodeMode(!codeMode)} title="Attach Code Snippet"
          style={{ padding: '6px', color: codeMode ? 'var(--color-primary)' : 'var(--color-text-muted)', backgroundColor: codeMode ? 'rgba(88,101,242,0.15)' : 'transparent', borderRadius: '6px', border: 'none', cursor: 'pointer', display: 'flex', flexShrink: 0, transition: 'all 0.15s' }}>
          <Code size={18} />
        </button>

        <textarea ref={textareaRef}
          placeholder={isEditing ? 'Edit your message… (Esc to cancel)' : isReplying ? `Reply to ${replyTo.user?.username}…` : 'Message this channel…'}
          value={text} onChange={handleTextChange} onKeyDown={handleKeyDown}
          style={{ flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white', resize: 'none', outline: 'none', height: '36px', maxHeight: '150px', fontFamily: 'inherit', padding: '8px 0', lineHeight: '1.5', fontSize: '14px', overflowY: 'auto' }}
          rows={1}
        />

        <button onClick={handleSend} disabled={!canSend} title="Send (Enter)"
          style={{ padding: '6px', color: canSend ? 'var(--color-primary)' : '#374151', transition: 'color 0.15s, transform 0.1s', border: 'none', background: 'transparent', cursor: canSend ? 'pointer' : 'default', display: 'flex', flexShrink: 0, transform: canSend ? 'scale(1.05)' : 'scale(1)' }}>
          <Send size={18} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
