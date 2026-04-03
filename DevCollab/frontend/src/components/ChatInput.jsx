import React, { useState } from 'react';
import { Send, Code, X } from 'lucide-react';

const ChatInput = ({ onSend, onTyping, replyTo, onCancelReply }) => {
  const [text, setText] = useState('');
  const [codeMode, setCodeMode] = useState(false);
  const [codeSnippet, setCodeSnippet] = useState('');
  const [language, setLanguage] = useState('javascript');

  const handleSend = () => {
    if (text.trim() || (codeMode && codeSnippet.trim())) {
      onSend(text, codeMode ? codeSnippet : null, codeMode ? language : null, replyTo ? replyTo.id : null);
      setText('');
      setCodeSnippet('');
      setCodeMode(false);
      if (onCancelReply) onCancelReply();
      if (onTyping) onTyping(false);
    }
  };

  const handleTextChange = (e) => {
    setText(e.target.value);
    if (onTyping) onTyping(e.target.value.length > 0);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div style={{
      backgroundColor: 'var(--color-bg-elevation-2)',
      borderRadius: '8px',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden'
    }}>
      {replyTo && (
        <div style={{ backgroundColor: 'var(--color-primary)', padding: '4px 12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '12px' }}>
          <span>Replying to <strong>{replyTo.user?.username}</strong>: {replyTo.content?.substring(0, 50)}...</span>
          <button onClick={onCancelReply} style={{ color: 'white', border: 'none', background: 'transparent' }}><X size={14} /></button>
        </div>
      )}
      {codeMode && (
        <div style={{ padding: '8px', borderBottom: '1px solid var(--color-bg-elevation-3)', display: 'flex', gap: '8px' }}>
          <select 
            value={language} 
            onChange={e => setLanguage(e.target.value)}
            style={{ 
              background: 'var(--color-bg-elevation-3)', color: 'white', border: 'none', 
              padding: '4px 8px', borderRadius: '4px', outline: 'none' 
            }}
          >
            <option value="javascript">JavaScript</option>
            <option value="python">Python</option>
            <option value="java">Java</option>
            <option value="html">HTML</option>
            <option value="css">CSS</option>
            <option value="json">JSON</option>
          </select>
          <button style={{ color: 'var(--color-text-muted)', fontSize: '12px' }} onClick={() => setCodeMode(false)}>Close Snippet</button>
        </div>
      )}

      {codeMode && (
        <textarea
          placeholder="Paste your code here..."
          value={codeSnippet}
          onChange={e => setCodeSnippet(e.target.value)}
          style={{
            width: '100%',
            backgroundColor: '#1E1E1E',
            color: '#D4D4D4',
            fontFamily: 'var(--font-family-mono)',
            border: 'none',
            padding: '12px',
            outline: 'none',
            resize: 'vertical',
            minHeight: '100px'
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'flex-end', padding: '12px' }}>
        <button 
          onClick={() => setCodeMode(!codeMode)}
          style={{
            padding: '8px', margin: '0 8px 0 0', color: codeMode ? 'var(--color-primary)' : 'var(--color-text-muted)',
            backgroundColor: codeMode ? 'rgba(88, 101, 242, 0.1)' : 'transparent', borderRadius: '50%'
          }}
          title="Add Code Snippet"
        >
          <Code size={20} />
        </button>
        
        <textarea
          placeholder={replyTo ? "Type your reply..." : "Message this channel..."}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          style={{
            flex: 1, backgroundColor: 'transparent', border: 'none', color: 'white',
            resize: 'none', outline: 'none', maxHeight: '150px',
            fontFamily: 'inherit', padding: '8px 0', lineHeight: '1.5'
          }}
          rows={1}
        />
        
        <button 
          onClick={handleSend}
          style={{
            padding: '8px', margin: '0 0 0 8px', color: (text.trim() || codeSnippet.trim()) ? 'var(--color-primary)' : 'var(--color-text-muted)',
            transition: 'color 0.2s'
          }}
        >
          <Send size={20} />
        </button>
      </div>
    </div>
  );
};

export default ChatInput;
