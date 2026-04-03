import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { Bell, Check, CheckCircle2 } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

const NotificationsPanel = ({ isOpen, onClose }) => {
  const [notifications, setNotifications] = useState([]);
  const { user } = useContext(AuthContext);

  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  const fetchNotifications = async () => {
    try {
      const res = await axios.get('http://localhost:8666/api/notifications', { withCredentials: true });
      setNotifications(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const markAsRead = async (id) => {
    try {
      await axios.put(`http://localhost:8666/api/notifications/${id}/read`, {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    } catch (err) {
      console.error(err);
    }
  };

  const markAllAsRead = async () => {
    try {
      await axios.put('http://localhost:8666/api/notifications/readAll', {}, { withCredentials: true });
      setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <div style={{
      position: 'absolute', top: '64px', right: '16px', width: '320px', maxHeight: '400px',
      backgroundColor: 'var(--color-bg-elevation-2)', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
      display: 'flex', flexDirection: 'column', zIndex: 100, border: '1px solid var(--color-bg-elevation-3)'
    }}>
      <div style={{ padding: '16px', borderBottom: '1px solid var(--color-bg-elevation-3)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0, fontSize: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Bell size={18} /> Notifications
          {unreadCount > 0 && <span style={{ backgroundColor: 'var(--color-danger)', color: 'white', fontSize: '10px', padding: '2px 6px', borderRadius: '10px' }}>{unreadCount}</span>}
        </h3>
        {unreadCount > 0 && (
          <button onClick={markAllAsRead} className="btn-icon" style={{ fontSize: '12px', color: 'var(--color-primary)' }} title="Mark all as read">
            <CheckCircle2 size={16} />
          </button>
        )}
      </div>
      <div style={{ overflowY: 'auto', flex: 1, padding: '8px' }} className="no-scrollbar">
        {notifications.length === 0 ? (
          <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>No notifications yet.</div>
        ) : (
          notifications.map(n => (
            <div key={n.id} style={{
              padding: '12px', borderRadius: '4px', marginBottom: '4px',
              backgroundColor: n.read ? 'transparent' : 'var(--color-bg-elevation-3)',
              display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start'
            }}>
              <div>
                <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-base)', marginBottom: '4px' }}>{n.type}</div>
                <div style={{ fontSize: '14px', color: n.read ? 'var(--color-text-muted)' : 'var(--color-text-base)' }}>{n.content}</div>
                <div style={{ fontSize: '10px', color: 'var(--color-text-muted)', marginTop: '8px' }}>{new Date(n.createdAt).toLocaleString()}</div>
              </div>
              {!n.read && (
                <button onClick={() => markAsRead(n.id)} className="btn-icon" style={{ padding: '4px' }} title="Mark as read">
                  <Check size={14} />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};
export default NotificationsPanel;
