import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';

const PollSection = ({ channelId, userRole }) => {
  const [polls, setPolls] = useState([]);
  const [showCreate, setShowCreate] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);
  const [creating, setCreating] = useState(false);
  const { stompClient, connected } = useContext(WebSocketContext);
  const { user } = useContext(AuthContext);
  const pollSubRef = useRef(null);
  const voteSubRef = useRef(null);
  const deleteSubRef = useRef(null);

  useEffect(() => {
    if (!channelId) return;
    axios.get(`http://localhost:9090/api/channels/${channelId}/polls`)
      .then(r => setPolls(r.data))
      .catch(() => {});
  }, [channelId]);

  useEffect(() => {
    if (!connected || !stompClient || !channelId) return;

    pollSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/polls`, (msg) => {
      const poll = JSON.parse(msg.body);
      setPolls(prev => {
        if (prev.find(p => p.id === poll.id)) return prev;
        return [poll, ...prev];
      });
    });

    voteSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/polls/votes`, (msg) => {
      const updated = JSON.parse(msg.body);
      setPolls(prev => prev.map(p => p.id === updated.id ? updated : p));
    });

    deleteSubRef.current = stompClient.subscribe(`/topic/channels/${channelId}/polls/deleted`, (msg) => {
      const { pollId } = JSON.parse(msg.body);
      setPolls(prev => prev.filter(p => p.id !== pollId));
    });

    return () => {
      [pollSubRef, voteSubRef, deleteSubRef].forEach(r => {
        if (r.current) { r.current.unsubscribe(); r.current = null; }
      });
    };
  }, [connected, stompClient, channelId]);

  const handleVote = async (pollId, optionId) => {
    try {
      const res = await axios.post(`http://localhost:9090/api/polls/${pollId}/vote`, { optionId });
      setPolls(prev => prev.map(p => p.id === pollId ? res.data : p));
    } catch (err) {
      console.error('Vote failed', err);
    }
  };

  const handleDelete = async (pollId) => {
    if (!window.confirm('Delete this poll?')) return;
    try {
      await axios.delete(`http://localhost:9090/api/polls/${pollId}`);
      setPolls(prev => prev.filter(p => p.id !== pollId));
    } catch (err) {
      console.error('Delete poll failed', err);
    }
  };

  const handleCreate = async (e) => {
    e.preventDefault();
    const validOptions = options.filter(o => o.trim());
    if (!question.trim() || validOptions.length < 2) return;
    setCreating(true);
    try {
      const res = await axios.post(`http://localhost:9090/api/channels/${channelId}/polls`, {
        question: question.trim(),
        options: validOptions,
      });
      setPolls(prev => [res.data, ...prev]);
      setQuestion('');
      setOptions(['', '']);
      setShowCreate(false);
    } catch (err) {
      console.error('Create poll failed', err);
    } finally {
      setCreating(false);
    }
  };

  if (polls.length === 0 && !showCreate) {
    return (
      <div style={{ padding: '8px 16px' }}>
        <button
          onClick={() => setShowCreate(true)}
          style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.15)', color: 'var(--color-text-muted)', borderRadius: '8px', padding: '8px 16px', cursor: 'pointer', fontSize: '13px', width: '100%' }}
        >
          📊 Create a poll
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '8px 16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ fontSize: '12px', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>📊 Polls</span>
        <button
          onClick={() => setShowCreate(v => !v)}
          style={{ background: 'none', border: 'none', color: 'var(--color-primary)', cursor: 'pointer', fontSize: '12px', padding: '2px 8px', borderRadius: '4px' }}
        >
          {showCreate ? 'Cancel' : '+ New Poll'}
        </button>
      </div>

      {showCreate && (
        <form onSubmit={handleCreate} style={{ background: 'var(--color-bg-elevation-1)', borderRadius: '8px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <input
            placeholder="Ask a question…"
            value={question}
            onChange={e => setQuestion(e.target.value)}
            style={{ background: 'var(--color-bg-elevation-2)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px', padding: '8px 10px', color: 'white', fontSize: '13px', width: '100%', boxSizing: 'border-box' }}
          />
          {options.map((opt, i) => (
            <div key={i} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
              <input
                placeholder={`Option ${i + 1}`}
                value={opt}
                onChange={e => setOptions(prev => prev.map((o, j) => j === i ? e.target.value : o))}
                style={{ flex: 1, background: 'var(--color-bg-elevation-2)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px', padding: '6px 10px', color: 'white', fontSize: '13px' }}
              />
              {options.length > 2 && (
                <button type="button" onClick={() => setOptions(prev => prev.filter((_, j) => j !== i))}
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '16px', lineHeight: 1 }}>×</button>
              )}
            </div>
          ))}
          {options.length < 8 && (
            <button type="button" onClick={() => setOptions(prev => [...prev, ''])}
              style={{ background: 'none', border: '1px dashed rgba(255,255,255,0.15)', color: 'var(--color-text-muted)', borderRadius: '6px', padding: '5px', cursor: 'pointer', fontSize: '13px' }}>
              + Add option
            </button>
          )}
          <button type="submit" disabled={creating}
            style={{ background: 'var(--color-primary)', border: 'none', color: 'white', borderRadius: '6px', padding: '8px', cursor: creating ? 'not-allowed' : 'pointer', fontWeight: 600, fontSize: '13px' }}>
            {creating ? 'Creating…' : 'Create Poll'}
          </button>
        </form>
      )}

      {polls.map(poll => {
        const totalVotes = poll.options.reduce((sum, o) => sum + (o.voteCount ?? o.votes?.length ?? 0), 0);
        const userVotedOptionId = poll.options.find(o =>
          o.votes?.some(v => v.votedBy?.username === user?.username || v.votedBy?.id === user?.id)
        )?.id ?? null;
        const canDelete = user?.username === poll.createdBy?.username || userRole === 'OWNER' || userRole === 'ADMIN';

        return (
          <div key={poll.id} style={{ background: 'var(--color-bg-elevation-1)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
              <p style={{ margin: 0, fontWeight: 600, fontSize: '14px', color: '#e2e8f0', lineHeight: 1.4 }}>{poll.question}</p>
              {canDelete && (
                <button onClick={() => handleDelete(poll.id)}
                  style={{ background: 'none', border: 'none', color: 'var(--color-danger)', cursor: 'pointer', fontSize: '12px', padding: '0 4px', opacity: 0.7, flexShrink: 0 }} title="Delete poll">
                  🗑
                </button>
              )}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {poll.options.map(opt => {
                const count = opt.voteCount ?? opt.votes?.length ?? 0;
                const pct = totalVotes > 0 ? Math.round((count / totalVotes) * 100) : 0;
                const isVoted = opt.id === userVotedOptionId;
                return (
                  <button
                    key={opt.id}
                    onClick={() => handleVote(poll.id, opt.id)}
                    style={{
                      position: 'relative', overflow: 'hidden', width: '100%', border: `1px solid ${isVoted ? 'var(--color-primary)' : 'rgba(255,255,255,0.1)'}`,
                      borderRadius: '6px', background: 'transparent', cursor: 'pointer', textAlign: 'left', padding: '8px 10px',
                    }}
                  >
                    <div style={{
                      position: 'absolute', left: 0, top: 0, bottom: 0, width: `${pct}%`,
                      background: isVoted ? 'rgba(88,101,242,0.25)' : 'rgba(255,255,255,0.05)', borderRadius: '6px', transition: 'width 0.3s ease',
                    }} />
                    <div style={{ position: 'relative', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontSize: '13px', color: isVoted ? 'white' : '#cbd5e1', fontWeight: isVoted ? 600 : 400 }}>{opt.optionText}</span>
                      <span style={{ fontSize: '12px', color: isVoted ? 'var(--color-primary)' : 'var(--color-text-muted)', fontWeight: 600, marginLeft: '8px' }}>{pct}%</span>
                    </div>
                  </button>
                );
              })}
            </div>
            <p style={{ margin: '10px 0 0', fontSize: '11px', color: 'var(--color-text-muted)' }}>
              {totalVotes} vote{totalVotes !== 1 ? 's' : ''} · by {poll.createdBy?.username}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default PollSection;
