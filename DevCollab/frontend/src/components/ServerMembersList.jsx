import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { WebSocketContext } from '../context/WebSocketContext';
import { AuthContext } from '../context/AuthContext';

const ServerMembersList = ({ serverId }) => {
  const [members, setMembers] = useState([]);
  const { stompClient, connected } = useContext(WebSocketContext);
  const { user } = useContext(AuthContext);
  const presenceSubRef = useRef(null);

  useEffect(() => {
    if (serverId) fetchMembers();
  }, [serverId]);

  useEffect(() => {
    if (connected && stompClient) {
      if (presenceSubRef.current) presenceSubRef.current.unsubscribe();

      presenceSubRef.current = stompClient.subscribe(`/topic/presence`, (output) => {
        const { username, status } = JSON.parse(output.body);
        setMembers(prev => prev.map(member => 
          member.user?.username === username ? { ...member, user: { ...member.user, status } } : member
        ));
      });
    }

    return () => {
      if (presenceSubRef.current) presenceSubRef.current.unsubscribe();
    };
  }, [connected, stompClient]);

  const fetchMembers = async () => {
    try {
      const res = await axios.get(`http://localhost:8666/api/servers/${serverId}/members`);
      setMembers(res.data);
    } catch (error) {
      console.error("Failed to fetch server members", error);
    }
  };

  const onlineMembers = members.filter(m => m.user?.status === 'ONLINE');
  const offlineMembers = members.filter(m => m.user?.status !== 'ONLINE');

  return (
    <div style={{
      width: '240px',
      backgroundColor: 'var(--color-bg-elevation-2)',
      display: 'flex',
      flexDirection: 'column',
      borderLeft: '1px solid var(--color-bg-elevation-3)',
      borderTopRightRadius: '8px'
    }}>
      <div style={{ padding: '16px 16px 8px 16px', fontWeight: 'bold', fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
        Online — {onlineMembers.length}
      </div>
      <div style={{ padding: '0 8px' }}>
        {onlineMembers.map(member => (
          <MemberItem key={member.id} member={member} isOnline={true} />
        ))}
      </div>

      <div style={{ padding: '16px 16px 8px 16px', fontWeight: 'bold', fontSize: '12px', color: 'var(--color-text-muted)', textTransform: 'uppercase' }}>
        Offline — {offlineMembers.length}
      </div>
      <div style={{ padding: '0 8px' }}>
        {offlineMembers.map(member => (
          <MemberItem key={member.id} member={member} isOnline={false} />
        ))}
      </div>
    </div>
  );
};

const MemberItem = ({ member, isOnline }) => {
  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      padding: '8px',
      borderRadius: '4px',
      marginBottom: '2px',
      cursor: 'pointer',
      opacity: isOnline ? 1 : 0.6,
      transition: 'background 0.1s'
    }}
    onMouseOver={e => e.currentTarget.style.backgroundColor = 'var(--color-bg-elevation-3)'}
    onMouseOut={e => e.currentTarget.style.backgroundColor = 'transparent'}
    title={member.user?.bio || "No bio set."}
    >
      <div style={{ position: 'relative' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '50%',
          backgroundColor: 'var(--color-bg-elevation-3)',
          display: 'flex', justifyContent: 'center', alignItems: 'center',
          overflow: 'hidden', color: 'white', fontWeight: 'bold', fontSize: '14px'
        }}>
          {member.user?.profilePictureUrl ? (
             <img src={`http://localhost:8666${member.user.profilePictureUrl}`} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
          ) : (
            member.user?.username?.charAt(0).toUpperCase()
          )}
        </div>
        
        {/* Presence Indicator */}
        <div style={{
          position: 'absolute', bottom: '-2px', right: '-2px',
          width: '12px', height: '12px', borderRadius: '50%',
          backgroundColor: isOnline ? 'var(--color-success)' : 'var(--color-text-muted)',
          border: '2px solid var(--color-bg-elevation-2)'
        }} />
      </div>

      <div style={{ marginLeft: '12px', display: 'flex', flexDirection: 'column' }}>
        <span style={{ color: 'white', fontSize: '14px', fontWeight: '500' }}>{member.user?.username}</span>
      </div>
    </div>
  );
};

export default ServerMembersList;
