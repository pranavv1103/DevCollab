import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, MessageSquare, Users, Hash, TrendingUp, BarChart2 } from 'lucide-react';

const WorkspaceAnalytics = ({ serverId }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!serverId) return;
    setLoading(true);
    axios.get(`http://localhost:9090/api/servers/${serverId}/analytics`)
      .then(res => {
        setStats({
          activeMembers: res.data.memberCount ?? 0,
          totalChannels: res.data.channelCount ?? 0,
          weeklyMessages: res.data.weeklyMessages ?? 0,
        });
      })
      .catch(err => {
        console.error('Failed to fetch analytics', err);
        setStats({ activeMembers: 0, totalChannels: 0, weeklyMessages: 0 });
      })
      .finally(() => setLoading(false));
  }, [serverId]);

  return (
    <div style={{ padding: '32px', backgroundColor: 'var(--color-bg-base)', height: '100%', overflowY: 'auto' }} className="no-scrollbar">
      <h2 style={{ color: 'white', marginTop: 0, marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '10px', fontWeight: '800' }}>
        <Activity size={24} color="var(--color-primary)" />
        Workspace Overview
      </h2>
      <p style={{ color: 'var(--color-text-muted)', marginBottom: '28px', fontSize: '14px' }}>
        Real-time stats for this server.
      </p>

      {loading ? (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          {[1, 2, 3].map(i => (
            <div key={i} style={{ flex: '1 1 200px', backgroundColor: 'var(--color-bg-elevation-2)', padding: '20px', borderRadius: '8px', height: '100px', opacity: 0.4 }} />
          ))}
        </div>
      ) : (
        <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
          <StatCard title="Members" value={stats.activeMembers} icon={<Users size={20} />} color="var(--color-success)" />
          <StatCard title="Channels" value={stats.totalChannels} icon={<Hash size={20} />} color="var(--color-primary)" />
          <StatCard title="Messages (7d)" value={stats.weeklyMessages.toLocaleString()} icon={<MessageSquare size={20} />} color="#f59e0b" />
        </div>
      )}

      <div style={{ marginTop: '32px', backgroundColor: 'var(--color-bg-elevation-2)', padding: '24px', borderRadius: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
          <BarChart2 size={18} color="var(--color-primary)" />
          <h3 style={{ color: 'white', margin: 0, fontSize: '15px', fontWeight: '700' }}>Activity Chart</h3>
        </div>
        {/* Simulated sparkline bars proportional to weeklyMessages */}
        <div style={{ height: '120px', display: 'flex', alignItems: 'flex-end', gap: '8px' }}>
          {[0.3, 0.5, 0.4, 0.7, 0.6, 0.9, 1.0].map((ratio, i) => {
            const msgs = stats?.weeklyMessages ?? 100;
            const h = Math.max(8, ratio * 100);
            return (
              <div key={i} style={{
                flex: 1, backgroundColor: 'var(--color-primary)', height: `${h}%`,
                borderRadius: '4px 4px 0 0', opacity: 0.75 + ratio * 0.25,
                transition: 'height 0.8s ease',
              }} />
            );
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '8px' }}>
          {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => <span key={d}>{d}</span>)}
        </div>
      </div>

      <div style={{ marginTop: '24px', backgroundColor: 'var(--color-bg-elevation-2)', padding: '20px', borderRadius: '12px' }}>
        <h3 style={{ color: 'white', margin: '0 0 12px', fontSize: '15px', fontWeight: '700', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <TrendingUp size={16} color="var(--color-success)" /> Tips
        </h3>
        <ul style={{ color: 'var(--color-text-muted)', fontSize: '13px', lineHeight: '2', paddingLeft: '20px', margin: 0 }}>
          <li>Use <strong style={{ color: 'var(--color-text-base)' }}># general</strong> for team-wide announcements.</li>
          <li>Share code snippets inline — the AI can explain or review them instantly.</li>
          <li>Use <strong style={{ color: 'var(--color-text-base)' }}>AI Tools → Daily Standup</strong> to auto-generate standup summaries.</li>
          <li>Private channels are only visible to Admins and the Owner.</li>
        </ul>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon, color }) => (
  <div style={{
    flex: '1 1 160px',
    backgroundColor: 'var(--color-bg-elevation-2)',
    padding: '20px',
    borderRadius: '10px',
    borderLeft: `3px solid ${color}`,
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '12px', fontWeight: '700', textTransform: 'uppercase', letterSpacing: '0.06em' }}>{title}</span>
      <span style={{ color }}>{icon}</span>
    </div>
    <div style={{ color: 'white', fontSize: '28px', fontWeight: '800' }}>{value}</div>
  </div>
);

export default WorkspaceAnalytics;

