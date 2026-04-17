import React, { useState, useEffect, useRef } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { X, GitCommit, GitPullRequest, AlertCircle, Github } from 'lucide-react';

const EVENT_ICONS = {
  push: GitCommit,
  pull_request: GitPullRequest,
  issues: AlertCircle,
  issue_comment: AlertCircle,
};

function formatPushSummary(body) {
  try {
    const data = JSON.parse(body);
    const repo = data.repository?.full_name || 'unknown';
    const branch = data.ref?.replace('refs/heads/', '') || '';
    const pusher = data.pusher?.name || data.sender?.login || '';
    const count = data.commits?.length ?? 0;
    const lastMsg = data.commits?.[0]?.message?.split('\n')[0] || '';
    return { repo, line1: `${pusher} pushed ${count} commit${count !== 1 ? 's' : ''} to ${branch}`, line2: lastMsg };
  } catch {
    return { repo: '', line1: 'Push event received', line2: '' };
  }
}

function formatPRSummary(body) {
  try {
    const data = JSON.parse(body);
    const repo = data.repository?.full_name || '';
    const action = data.action || '';
    const title = data.pull_request?.title || '';
    const user = data.pull_request?.user?.login || data.sender?.login || '';
    return { repo, line1: `${user} ${action} PR: ${title}`, line2: '' };
  } catch {
    return { repo: '', line1: 'Pull request event', line2: '' };
  }
}

function formatIssuesSummary(body) {
  try {
    const data = JSON.parse(body);
    const repo = data.repository?.full_name || '';
    const action = data.action || '';
    const title = data.issue?.title || '';
    const user = data.sender?.login || '';
    return { repo, line1: `${user} ${action} issue: ${title}`, line2: '' };
  } catch {
    return { repo: '', line1: 'Issue event', line2: '' };
  }
}

function summarize(event, body) {
  if (event === 'push') return formatPushSummary(body);
  if (event === 'pull_request') return formatPRSummary(body);
  if (event === 'issues' || event === 'issue_comment') return formatIssuesSummary(body);
  return { repo: '', line1: `GitHub ${event} event`, line2: '' };
}

const GitHubEventsPanel = ({ onClose }) => {
  const [events, setEvents] = useState([]);
  const bottomRef = useRef(null);

  useEffect(() => {
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:9090/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe('/topic/github', (msg) => {
          try {
            const payload = JSON.parse(msg.body);
            const summary = summarize(payload.event, payload.body);
            setEvents(prev => [...prev.slice(-49), { id: Date.now(), event: payload.event, ...summary }]);
          } catch {/* ignore */}
        });
      },
    });
    client.activate();
    return () => client.deactivate();
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [events]);

  return (
    <div style={{
      position: 'fixed', top: 0, left: '72px', bottom: 0, width: '380px',
      backgroundColor: 'var(--color-bg-base)', zIndex: 100,
      boxShadow: '4px 0 24px rgba(0,0,0,0.4)', display: 'flex', flexDirection: 'column',
      borderRight: '1px solid var(--color-bg-elevation-2)',
    }}>
      {/* Header */}
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--color-bg-elevation-2)', display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
        <Github size={18} color="#e2e8f0" />
        <span style={{ fontWeight: '700', fontSize: '15px', color: '#e2e8f0', flex: 1 }}>GitHub Events</span>
        <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#64748b', cursor: 'pointer', padding: '4px', borderRadius: '4px', display: 'flex' }}><X size={16} /></button>
      </div>

      {/* Event list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
        {events.length === 0 ? (
          <div style={{ textAlign: 'center', color: '#475569', fontSize: '13px', marginTop: '48px' }}>
            <Github size={32} style={{ marginBottom: '12px', opacity: 0.3 }} />
            <div>Waiting for GitHub events…</div>
            <div style={{ fontSize: '12px', marginTop: '6px', opacity: 0.7 }}>Configure a webhook to see push, PR, and issue events here in real-time.</div>
          </div>
        ) : (
          events.map(ev => {
            const Icon = EVENT_ICONS[ev.event] || Github;
            return (
              <div key={ev.id} style={{
                backgroundColor: 'var(--color-bg-elevation-1)',
                borderRadius: '8px',
                padding: '10px 12px',
                marginBottom: '8px',
                borderLeft: '3px solid var(--color-primary)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '7px', marginBottom: '4px' }}>
                  <Icon size={13} color="var(--color-primary)" />
                  <span style={{ fontSize: '11px', fontWeight: '700', color: 'var(--color-primary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{ev.event}</span>
                  {ev.repo && <span style={{ fontSize: '11px', color: '#475569', marginLeft: 'auto', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '160px' }}>{ev.repo}</span>}
                </div>
                <div style={{ fontSize: '13px', color: '#e2e8f0', lineHeight: '1.4' }}>{ev.line1}</div>
                {ev.line2 && <div style={{ fontSize: '12px', color: '#64748b', marginTop: '2px', fontStyle: 'italic', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ev.line2}</div>}
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
};

export default GitHubEventsPanel;
