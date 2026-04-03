import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Activity, MessageSquare, Users, TrendingUp } from 'lucide-react';

const WorkspaceAnalytics = ({ serverId }) => {
  const [stats, setStats] = useState({
    activeMembers: 0,
    totalChannels: 0,
    weeklyMessages: 0
  });

  useEffect(() => {
    if (serverId) {
      // Mock stats because we haven't built a full analytics aggregation backend
      setStats({
        activeMembers: Math.floor(Math.random() * 50) + 5,
        totalChannels: Math.floor(Math.random() * 20) + 3,
        weeklyMessages: Math.floor(Math.random() * 2000) + 100
      });
    }
  }, [serverId]);

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-bg-base)', height: '100%' }}>
      <h2 style={{ color: 'white', marginTop: 0, marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <Activity size={24} color="var(--color-primary)" />
        Workspace Analytics
      </h2>
      
      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        <StatCard title="Active Members" value={stats.activeMembers} icon={<Users size={20} color="var(--color-success)" />} />
        <StatCard title="Total Channels" value={stats.totalChannels} icon={<Hash size={20} color="var(--color-text-dark)" />} />
        <StatCard title="Weekly Messages" value={stats.weeklyMessages} icon={<MessageSquare size={20} color="var(--color-primary)" />} />
        <StatCard title="Engagement Drift" value="+14%" icon={<TrendingUp size={20} color="var(--color-danger)" />} />
      </div>

      <div style={{ marginTop: '32px', backgroundColor: 'var(--color-bg-elevation-2)', padding: '24px', borderRadius: '8px' }}>
         <h3 style={{ color: 'white', marginTop: 0 }}>Message Activity</h3>
         <div style={{ height: '200px', display: 'flex', alignItems: 'flex-end', gap: '12px', marginTop: '16px' }}>
            {/* Mock chart bars */}
            {[40, 60, 30, 80, 50, 90, 100].map((h, i) => (
              <div key={i} style={{ flex: 1, backgroundColor: 'var(--color-primary)', height: `${h}%`, borderRadius: '4px 4px 0 0', opacity: 0.8 }} />
            ))}
         </div>
         <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--color-text-muted)', fontSize: '12px', marginTop: '8px' }}>
           <span>Mon</span><span>Tue</span><span>Wed</span><span>Thu</span><span>Fri</span><span>Sat</span><span>Sun</span>
         </div>
      </div>
    </div>
  );
};

const StatCard = ({ title, value, icon }) => (
  <div style={{
    flex: '1 1 200px', backgroundColor: 'var(--color-bg-elevation-2)', padding: '20px',
    borderRadius: '8px', display: 'flex', flexDirection: 'column'
  }}>
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
      <span style={{ color: 'var(--color-text-muted)', fontSize: '14px', fontWeight: 'bold' }}>{title}</span>
      {icon}
    </div>
    <div style={{ color: 'white', fontSize: '32px', fontWeight: 'bold' }}>{value}</div>
  </div>
);

const Hash = ({ size, color }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="4" y1="9" x2="20" y2="9"></line>
    <line x1="4" y1="15" x2="20" y2="15"></line>
    <line x1="10" y1="3" x2="8" y2="21"></line>
    <line x1="16" y1="3" x2="14" y2="21"></line>
  </svg>
);

export default WorkspaceAnalytics;
