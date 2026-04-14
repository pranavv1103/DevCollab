import React, { useContext, useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import { X, Github, Linkedin, Globe, ExternalLink, Shield, Crown, User } from 'lucide-react';
import { UserProfileContext } from '../context/UserProfileContext';
import { AuthContext } from '../context/AuthContext';

// ── Role badge ────────────────────────────────────────────────────────────────

const ROLE_CONFIG = {
  OWNER:  { label: 'Owner',  color: '#fee75c', bg: 'rgba(254,231,92,0.15)',  icon: Crown  },
  ADMIN:  { label: 'Admin',  color: '#ed4245', bg: 'rgba(237,66,69,0.15)',   icon: Shield },
  MEMBER: { label: 'Member', color: '#9ba0ab', bg: 'rgba(155,160,171,0.12)', icon: User   },
};

const RoleBadge = ({ role }) => {
  const cfg = ROLE_CONFIG[role] || ROLE_CONFIG.MEMBER;
  const Icon = cfg.icon;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '2px 8px', borderRadius: '999px',
      backgroundColor: cfg.bg, color: cfg.color,
      fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
      border: `1px solid ${cfg.color}30`,
    }}>
      <Icon size={10} />
      {cfg.label}
    </span>
  );
};

// ── Status dot ────────────────────────────────────────────────────────────────

const STATUS_COLOR = { ONLINE: 'var(--color-success)', IDLE: '#fee75c', DND: '#ed4245', OFFLINE: 'var(--color-text-muted)' };

const StatusDot = ({ status }) => (
  <div style={{
    position: 'absolute', bottom: '-2px', right: '-2px',
    width: '14px', height: '14px', borderRadius: '50%',
    backgroundColor: STATUS_COLOR[status] || STATUS_COLOR.OFFLINE,
    border: '2px solid var(--color-bg-elevation-2)',
  }} />
);

// ── Avatar ────────────────────────────────────────────────────────────────────

const Avatar = ({ user, size = 72 }) => {
  const src = user?.profilePictureUrl
    ? (user.profilePictureUrl.startsWith('http') ? user.profilePictureUrl : `http://localhost:9090${user.profilePictureUrl}`)
    : null;

  return (
    <div style={{ position: 'relative', flexShrink: 0 }}>
      <div style={{
        width: size, height: size, borderRadius: '50%',
        backgroundColor: 'var(--color-primary)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        fontSize: size * 0.35, fontWeight: 700, color: src ? 'transparent' : 'white',
        backgroundImage: src ? `url(${src})` : 'none',
        backgroundSize: 'cover', backgroundPosition: 'center',
        border: '3px solid var(--color-bg-elevation-3)',
      }}>
        {!src && (user?.username?.charAt(0).toUpperCase() || '?')}
      </div>
      {user?.status && <StatusDot status={user.status} />}
    </div>
  );
};

// ── Stat card ─────────────────────────────────────────────────────────────────

const StatCard = ({ label, value }) => (
  <div style={{
    flex: '1 1 0', minWidth: 0,
    backgroundColor: 'var(--color-bg-elevation-3)',
    borderRadius: '8px', padding: '10px 12px',
    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px',
  }}>
    <span style={{ fontSize: '20px', fontWeight: 700, color: 'var(--color-primary)' }}>{value}</span>
    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', textAlign: 'center' }}>{label}</span>
  </div>
);

// ── Activity bar row ──────────────────────────────────────────────────────────

const ActivityRow = ({ name, count, max }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
    <span style={{ width: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--color-text-muted)' }}>
      #{name}
    </span>
    <div style={{ flex: 1, height: '6px', borderRadius: '3px', backgroundColor: 'var(--color-bg-elevation-3)' }}>
      <div style={{
        height: '100%', borderRadius: '3px',
        width: `${Math.round((count / max) * 100)}%`,
        backgroundColor: 'var(--color-primary)',
        transition: 'width 0.4s ease',
      }} />
    </div>
    <span style={{ minWidth: '28px', textAlign: 'right', color: 'var(--color-text-base)' }}>{count}</span>
  </div>
);

// ── Main modal ────────────────────────────────────────────────────────────────

const UserProfileModal = () => {
  const { isOpen, userId, serverId, channelId, closeProfile } = useContext(UserProfileContext);
  useContext(AuthContext);

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [roleAction, setRoleAction] = useState('');  // '' | 'confirm-kick' | 'change-role'
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMsg, setActionMsg] = useState(null); // { type: 'success'|'error', text: String }

  const fetchProfile = useCallback(async () => {
    if (!userId || !serverId) return;
    setLoading(true);
    setError(null);
    setActionMsg(null);
    setRoleAction('');
    try {
      const params = channelId ? `?channelId=${channelId}` : '';
      const res = await axios.get(
        `http://localhost:9090/api/servers/${serverId}/members/${userId}/profile${params}`
      );
      setProfile(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId, serverId, channelId]);

  useEffect(() => {
    if (isOpen) fetchProfile();
  }, [isOpen, fetchProfile]);

  const handleKick = async () => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await axios.delete(`http://localhost:9090/api/servers/${serverId}/members/${userId}`);
      setActionMsg({ type: 'success', text: `${profile.username} has been kicked from the server.` });
      setRoleAction('');
      setProfile(prev => ({ ...prev, canKick: false, canChangeRole: false }));
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to kick member' });
    } finally {
      setActionLoading(false);
    }
  };

  const handleRoleChange = async (newRole) => {
    setActionLoading(true);
    setActionMsg(null);
    try {
      await axios.patch(
        `http://localhost:9090/api/servers/${serverId}/members/${userId}/role`,
        { role: newRole }
      );
      setActionMsg({ type: 'success', text: `Role changed to ${newRole}.` });
      setRoleAction('');
      setProfile(prev => ({ ...prev, serverRole: newRole }));
    } catch (err) {
      setActionMsg({ type: 'error', text: err.response?.data?.message || 'Failed to change role' });
    } finally {
      setActionLoading(false);
    }
  };

  if (!isOpen) return null;

  const maxActivity = profile?.channelActivity?.[0]?.messageCount || 1;

  // Format joined date
  const joinedDate = profile?.joinedServerAt
    ? new Date(profile.joinedServerAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })
    : null;

  return (
    /* Backdrop */
    <div
      onClick={closeProfile}
      style={{
        position: 'fixed', inset: 0,
        backgroundColor: 'rgba(0,0,0,0.65)',
        display: 'flex', justifyContent: 'center', alignItems: 'center',
        zIndex: 10000,
      }}
    >
      {/* Panel — stop propagation so clicks inside don't close */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          width: '420px', maxWidth: '92vw', maxHeight: '90vh',
          backgroundColor: 'var(--color-bg-elevation-1)',
          border: '1px solid var(--color-bg-elevation-3)',
          borderRadius: '12px',
          boxShadow: 'var(--shadow-lg)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* Header banner + avatar */}
        <div style={{
          background: 'linear-gradient(135deg, var(--color-primary)55 0%, var(--color-bg-elevation-3) 100%)',
          padding: '20px 20px 0 20px',
          position: 'relative',
        }}>
          <button
            onClick={closeProfile}
            style={{
              position: 'absolute', top: '12px', right: '12px',
              color: 'var(--color-text-muted)', cursor: 'pointer',
              background: 'transparent', border: 'none', padding: '4px',
              display: 'flex', alignItems: 'center',
            }}
          >
            <X size={18} />
          </button>

          {loading && (
            <div style={{ textAlign: 'center', padding: '40px 0 20px', color: 'var(--color-text-muted)' }}>
              Loading…
            </div>
          )}

          {!loading && error && (
            <div style={{ textAlign: 'center', padding: '40px 0 20px', color: 'var(--color-danger)' }}>
              {error}
            </div>
          )}

          {!loading && profile && (
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '16px', paddingBottom: '16px' }}>
              <Avatar
                user={{ profilePictureUrl: profile.profilePictureUrl, username: profile.username, status: profile.status }}
                size={72}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontWeight: 700, fontSize: '18px', color: 'var(--color-text-base)' }}>
                    {profile.username}
                  </span>
                  {profile.isSelf && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', fontStyle: 'italic' }}>you</span>
                  )}
                </div>
                <div style={{ marginTop: '4px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <RoleBadge role={profile.serverRole} />
                  {joinedDate && (
                    <span style={{ fontSize: '11px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                      Joined {joinedDate}
                    </span>
                  )}
                </div>
                {profile.email && (
                  <div style={{ marginTop: '4px', fontSize: '12px', color: 'var(--color-text-muted)' }}>
                    {profile.email}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Scrollable body */}
        {!loading && profile && (
          <div style={{ overflowY: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* Bio */}
            {profile.bio && (
              <div>
                <SectionLabel>About</SectionLabel>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', lineHeight: 1.6, margin: 0 }}>
                  {profile.bio}
                </p>
              </div>
            )}

            {/* Languages */}
            {profile.programmingLanguages && (
              <div>
                <SectionLabel>Languages & Tools</SectionLabel>
                <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', margin: 0 }}>
                  {profile.programmingLanguages}
                </p>
              </div>
            )}

            {/* Social links */}
            {(profile.githubUrl || profile.linkedinUrl || profile.portfolioUrl) && (
              <div>
                <SectionLabel>Links</SectionLabel>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {profile.githubUrl && (
                    <LinkChip href={profile.githubUrl} icon={<Github size={13} />} label="GitHub" />
                  )}
                  {profile.linkedinUrl && (
                    <LinkChip href={profile.linkedinUrl} icon={<Linkedin size={13} />} label="LinkedIn" />
                  )}
                  {profile.portfolioUrl && (
                    <LinkChip href={profile.portfolioUrl} icon={<Globe size={13} />} label="Portfolio" />
                  )}
                </div>
              </div>
            )}

            {/* Stats */}
            <div>
              <SectionLabel>Activity</SectionLabel>
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                <StatCard label="Server Messages" value={profile.totalMessagesInServer} />
                {channelId && <StatCard label="Channel Messages" value={profile.totalMessagesInChannel} />}
                <StatCard label="Replies" value={profile.repliesPosted} />
                <StatCard label="Threads" value={profile.threadsStarted} />
              </div>
            </div>

            {/* Channel activity breakdown */}
            {profile.channelActivity?.length > 0 && (
              <div>
                <SectionLabel>Top Channels</SectionLabel>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {profile.channelActivity.slice(0, 5).map(ch => (
                    <ActivityRow key={ch.channelId} name={ch.channelName} count={ch.messageCount} max={maxActivity} />
                  ))}
                </div>
              </div>
            )}

            {/* Action feedback */}
            {actionMsg && (
              <div style={{
                padding: '8px 12px', borderRadius: '6px', fontSize: '13px',
                backgroundColor: actionMsg.type === 'success' ? 'rgba(59,165,92,0.15)' : 'rgba(237,66,69,0.15)',
                border: `1px solid ${actionMsg.type === 'success' ? 'rgba(59,165,92,0.4)' : 'rgba(237,66,69,0.4)'}`,
                color: actionMsg.type === 'success' ? 'var(--color-success)' : 'var(--color-danger)',
              }}>
                {actionMsg.text}
              </div>
            )}

            {/* Moderation actions */}
            {(profile.canChangeRole || profile.canKick) && (
              <div style={{
                borderTop: '1px solid var(--color-bg-elevation-3)',
                paddingTop: '12px',
                display: 'flex', flexDirection: 'column', gap: '8px',
              }}>
                <SectionLabel>Moderation</SectionLabel>

                {profile.canChangeRole && roleAction !== 'confirm-kick' && (
                  <>
                    {roleAction !== 'change-role' ? (
                      <button
                        onClick={() => setRoleAction('change-role')}
                        disabled={actionLoading}
                        style={secondaryBtnStyle}
                      >
                        Change Role
                      </button>
                    ) : (
                      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-text-muted)', alignSelf: 'center' }}>
                          Set role to:
                        </span>
                        {profile.serverRole !== 'ADMIN' && (
                          <button
                            onClick={() => handleRoleChange('ADMIN')}
                            disabled={actionLoading}
                            style={{ ...secondaryBtnStyle, color: '#ed4245', borderColor: '#ed424540' }}
                          >
                            Admin
                          </button>
                        )}
                        {profile.serverRole !== 'MEMBER' && (
                          <button
                            onClick={() => handleRoleChange('MEMBER')}
                            disabled={actionLoading}
                            style={secondaryBtnStyle}
                          >
                            Member
                          </button>
                        )}
                        <button
                          onClick={() => setRoleAction('')}
                          disabled={actionLoading}
                          style={{ ...secondaryBtnStyle, color: 'var(--color-text-muted)' }}
                        >
                          Cancel
                        </button>
                      </div>
                    )}
                  </>
                )}

                {profile.canKick && roleAction !== 'change-role' && (
                  <>
                    {roleAction !== 'confirm-kick' ? (
                      <button
                        onClick={() => setRoleAction('confirm-kick')}
                        disabled={actionLoading}
                        style={{ ...secondaryBtnStyle, color: 'var(--color-danger)' }}
                      >
                        Kick from Server
                      </button>
                    ) : (
                      <div style={{
                        padding: '10px 12px',
                        backgroundColor: 'rgba(237,66,69,0.1)',
                        border: '1px solid rgba(237,66,69,0.3)',
                        borderRadius: '8px',
                        display: 'flex', flexDirection: 'column', gap: '8px',
                      }}>
                        <span style={{ fontSize: '13px', color: 'var(--color-danger)' }}>
                          Remove <strong>{profile.username}</strong> from this server?
                        </span>
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button
                            onClick={handleKick}
                            disabled={actionLoading}
                            style={{ ...dangerBtnStyle }}
                          >
                            {actionLoading ? 'Removing…' : 'Confirm Kick'}
                          </button>
                          <button
                            onClick={() => setRoleAction('')}
                            disabled={actionLoading}
                            style={{ ...secondaryBtnStyle }}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </div>
            )}

          </div>
        )}
      </div>
    </div>
  );
};

// ── Small helpers ─────────────────────────────────────────────────────────────

const SectionLabel = ({ children }) => (
  <div style={{
    fontSize: '11px', fontWeight: 700, letterSpacing: '0.06em',
    color: 'var(--color-text-muted)', textTransform: 'uppercase',
    marginBottom: '8px',
  }}>
    {children}
  </div>
);

const LinkChip = ({ href, icon, label }) => (
  <a
    href={href}
    target="_blank"
    rel="noreferrer noopener"
    style={{
      display: 'inline-flex', alignItems: 'center', gap: '5px',
      padding: '4px 10px',
      backgroundColor: 'var(--color-bg-elevation-3)',
      border: '1px solid var(--color-bg-elevation-2)',
      borderRadius: '6px',
      color: 'var(--color-text-muted)',
      fontSize: '12px',
      transition: 'color var(--transition-fast), border-color var(--transition-fast)',
      textDecoration: 'none',
    }}
    onMouseOver={e => { e.currentTarget.style.color = 'var(--color-text-base)'; e.currentTarget.style.borderColor = 'var(--color-primary)'; }}
    onMouseOut={e => { e.currentTarget.style.color = 'var(--color-text-muted)'; e.currentTarget.style.borderColor = 'var(--color-bg-elevation-2)'; }}
  >
    {icon}
    {label}
    <ExternalLink size={10} />
  </a>
);

const secondaryBtnStyle = {
  padding: '6px 14px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  backgroundColor: 'var(--color-bg-elevation-3)',
  border: '1px solid var(--color-bg-elevation-2)',
  color: 'var(--color-text-base)',
  cursor: 'pointer',
  transition: 'background var(--transition-fast)',
};

const dangerBtnStyle = {
  padding: '6px 14px',
  borderRadius: '6px',
  fontSize: '13px',
  fontWeight: 600,
  backgroundColor: 'var(--color-danger)',
  border: '1px solid var(--color-danger)',
  color: 'white',
  cursor: 'pointer',
};

export default UserProfileModal;
