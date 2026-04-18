import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Camera, Settings, User } from 'lucide-react';
import Modal from './Modal';

const UserProfile = () => {
  const { user, updateUser } = useContext(AuthContext);
  const [profile, setProfile] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [saveStatus, setSaveStatus] = useState(''); // '' | 'saving' | 'saved' | 'error'

  // Custom status
  const [statusEmoji, setStatusEmoji] = useState('');
  const [customStatus, setCustomStatus] = useState('');
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const [statusInput, setStatusInput] = useState({ emoji: '', text: '' });
  const STATUS_EMOJIS = ['😀','💻','☕','🎮','📚','🏃','😴','🎯','🔥','🚀','🎧','🧠','✍️','🎉','🤔'];

  useEffect(() => {
    if (user?.id) {
      fetchProfile();
    }
  }, [user]);

  const fetchProfile = async () => {
    try {
      const res = await axios.get(`http://localhost:9090/api/users/${user.id}`);
      setProfile(res.data);
      setFormData(res.data);
      setStatusEmoji(res.data.statusEmoji || '');
      setCustomStatus(res.data.customStatus || '');
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const updateField = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaveStatus('saving');
    try {
      const payload = {
        bio: formData.bio,
        programmingLanguages: formData.programmingLanguages,
        githubUrl: formData.githubUrl,
        linkedinUrl: formData.linkedinUrl,
        portfolioUrl: formData.portfolioUrl,
        themePreference: formData.themePreference,
        profilePictureUrl: formData.profilePictureUrl,
      };
      await axios.put(`http://localhost:9090/api/users/${user.id}/profile`, payload);
      await fetchProfile();
      setEditMode(false);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus(''), 3000);
    } catch (error) {
      console.error("Failed to update profile", error);
      setSaveStatus('error');
    }
  };

  const handleSaveStatus = async () => {
    try {
      await axios.put('http://localhost:9090/api/users/me/status', { emoji: statusInput.emoji, text: statusInput.text });
      setStatusEmoji(statusInput.emoji);
      setCustomStatus(statusInput.text);
      setShowStatusPicker(false);
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only image files (JPEG, PNG, GIF, WebP) are allowed.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      alert('Image must be smaller than 5 MB.');
      return;
    }

    setUploadingAvatar(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
        // Do NOT set Content-Type manually — axios auto-sets multipart/form-data with boundary for FormData
        const res = await axios.post(`http://localhost:9090/api/users/${user.id}/avatar`, formDataUpload);
        // Backend returns relative path e.g. /uploads/avatars/user_1_123.jpg
        const relativePath = res.data.message;
        setFormData(prev => ({...prev, profilePictureUrl: relativePath}));
        setProfile(prev => ({...prev, profilePictureUrl: relativePath}));
        // Keep global auth context in sync so Avatar shows everywhere immediately
        updateUser({ profilePictureUrl: relativePath });
    } catch (error) {
        console.error("Failed to upload avatar", error);
        alert("Failed to upload avatar image");
    } finally {
        setUploadingAvatar(false);
    }
  };

  const openSettings = () => {
    setEditMode(false);
    setFormData(profile);
    setIsModalOpen(true);
  };

  if (!user?.id) return null;

  return (
    <>
      <div style={{ 
        padding: '12px 16px', 
        backgroundColor: 'var(--color-bg-elevation-1)', 
        borderTop: '1px solid var(--color-bg-elevation-3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', minWidth: 0 }}>
          <div style={{ 
            width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', 
            display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '14px', flexShrink: 0, fontWeight: 'bold',
            backgroundImage: profile.profilePictureUrl ? `url(${profile.profilePictureUrl.startsWith('http') ? profile.profilePictureUrl : 'http://localhost:9090' + profile.profilePictureUrl})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center', color: profile.profilePictureUrl ? 'transparent' : 'white'
          }}>
            {!profile.profilePictureUrl && profile.username?.charAt(0).toUpperCase()}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <span style={{ fontWeight: 'bold', fontSize: '14px', color: 'white', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
              {profile.username}
            </span>
            {customStatus ? (
              <span style={{ fontSize: '10px', color: 'var(--color-text-muted)', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>
                {statusEmoji} {customStatus}
              </span>
            ) : (
              <span style={{ fontSize: '10px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
                Online
              </span>
            )}
          </div>
        </div>
        <div style={{ display: 'flex', gap: '2px' }}>
          <button
            onClick={() => { setStatusInput({ emoji: statusEmoji, text: customStatus }); setShowStatusPicker(v => !v); }}
            className="btn-icon" title="Set Status"
            style={{ color: customStatus ? 'var(--color-primary)' : 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px', fontSize: '16px', lineHeight: 1 }}
          >
            {statusEmoji || '😶'}
          </button>
          <button onClick={openSettings} className="btn-icon" title="User Settings" style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Status Picker Popover */}
      {showStatusPicker && (
        <div style={{
          position: 'fixed', bottom: '70px', left: '80px', zIndex: 200,
          backgroundColor: 'var(--color-bg-elevation-2)',
          border: '1px solid var(--color-bg-elevation-3)',
          borderRadius: '10px', padding: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
          width: '280px',
        }}>
          <div style={{ fontWeight: '700', fontSize: '14px', color: 'white', marginBottom: '10px' }}>Set a status</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '12px' }}>
            {STATUS_EMOJIS.map(em => (
              <button key={em} onClick={() => setStatusInput(s => ({ ...s, emoji: em }))}
                style={{ width: '32px', height: '32px', fontSize: '18px', background: statusInput.emoji === em ? 'rgba(88,101,242,0.3)' : 'var(--color-bg-elevation-1)', border: statusInput.emoji === em ? '1px solid var(--color-primary)' : '1px solid transparent', borderRadius: '6px', cursor: 'pointer' }}>
                {em}
              </button>
            ))}
          </div>
          <input
            type="text"
            value={statusInput.text}
            onChange={e => setStatusInput(s => ({ ...s, text: e.target.value }))}
            onKeyDown={e => { if (e.key === 'Enter') handleSaveStatus(); if (e.key === 'Escape') setShowStatusPicker(false); }}
            placeholder="What's your status?"
            maxLength={80}
            style={{ width: '100%', padding: '8px 10px', backgroundColor: 'var(--color-bg-base)', border: '1px solid var(--color-bg-elevation-3)', borderRadius: '6px', color: 'white', fontSize: '13px', outline: 'none', marginBottom: '10px', boxSizing: 'border-box' }}
          />
          <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
            <button onClick={() => { setStatusInput({ emoji: '', text: '' }); handleSaveStatus(); }} style={{ background: 'transparent', border: '1px solid var(--color-bg-elevation-3)', color: 'var(--color-text-muted)', padding: '6px 12px', borderRadius: '6px', cursor: 'pointer', fontSize: '12px' }}>Clear status</button>
            <button onClick={handleSaveStatus} className="btn-primary" style={{ padding: '6px 16px', fontSize: '12px' }}>Save</button>
          </div>
        </div>
      )}

      <Modal isOpen={isModalOpen} onClose={() => { setIsModalOpen(false); setEditMode(false); setSaveStatus(''); }} title="User Settings">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px', paddingBottom: '16px', borderBottom: '1px solid var(--color-bg-elevation-3)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
             <div style={{ 
                width: '64px', height: '64px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', 
                display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '24px', flexShrink: 0, fontWeight: 'bold',
                backgroundImage: profile.profilePictureUrl ? `url(${profile.profilePictureUrl.startsWith('http') ? profile.profilePictureUrl : 'http://localhost:9090' + profile.profilePictureUrl})` : 'none',
                backgroundSize: 'cover', backgroundPosition: 'center', color: profile.profilePictureUrl ? 'transparent' : 'white'
             }}>
                {!profile.profilePictureUrl && profile.username?.charAt(0).toUpperCase()}
             </div>
             <div>
                <h3 style={{ margin: 0, fontSize: '20px' }}>{profile.username}</h3>
             </div>
          </div>
          {editMode ? (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="btn-secondary" onClick={() => { setEditMode(false); setFormData(profile); setSaveStatus(''); }}>
                Cancel
              </button>
              <button className="btn-primary" onClick={handleSave} disabled={saveStatus === 'saving'}>
                {saveStatus === 'saving' ? 'Saving…' : 'Save Profile'}
              </button>
            </div>
          ) : (
            <button className="btn-secondary" onClick={() => setEditMode(true)}>
              Edit Profile
            </button>
          )}
        </div>
        {saveStatus === 'saved' && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(35,134,54,0.2)', border: '1px solid rgba(35,134,54,0.4)', borderRadius: '6px', color: '#3fb950', fontSize: '13px' }}>
            ✓ Profile saved successfully
          </div>
        )}
        {saveStatus === 'error' && (
          <div style={{ padding: '8px 12px', backgroundColor: 'rgba(237,66,69,0.15)', border: '1px solid rgba(237,66,69,0.4)', borderRadius: '6px', color: '#ed4245', fontSize: '13px' }}>
            ✗ Failed to save. Check your connection and try again.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editMode && (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-elevation-2)', borderRadius: '8px', border: '1px solid var(--color-bg-elevation-3)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Update Avatar Source</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white' }}
                  value={formData.profilePictureUrl || ''} 
                  onChange={e => updateField('profilePictureUrl', e.target.value)}
                  placeholder="Paste direct image URL..."
                />
                <span style={{ color: 'var(--color-text-muted)', fontSize: '12px' }}>OR</span>
                <button className="btn-secondary" onClick={() => fileInputRef.current.click()} disabled={uploadingAvatar}>
                   <Camera size={16} style={{ marginRight: '6px' }} /> {uploadingAvatar ? 'Uploading...' : 'Upload File'}
                </button>
                <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleAvatarUpload} />
              </div>
            </div>
          )}

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Programming Languages</label>
            {editMode ? (
              <input 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white' }}
                value={formData.programmingLanguages || ''} 
                onChange={e => updateField('programmingLanguages', e.target.value)}
                placeholder="e.g. Java, Python, React"
              />
            ) : (
              <div style={{ color: 'var(--color-text-base)' }}>{profile.programmingLanguages || 'Not specified'}</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>GitHub URL</label>
            {editMode ? (
              <input 
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white' }}
                value={formData.githubUrl || ''} 
                onChange={e => updateField('githubUrl', e.target.value)}
                placeholder="https://github.com/..."
              />
            ) : (
              <div style={{ color: 'var(--color-primary)' }}>{profile.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={{color: 'inherit'}}>{profile.githubUrl}</a> : 'Not specified'}</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>LinkedIn URL</label>
            {editMode ? (
              <input
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white' }}
                value={formData.linkedinUrl || ''}
                onChange={e => updateField('linkedinUrl', e.target.value)}
                placeholder="https://linkedin.com/in/..."
              />
            ) : (
              <div style={{ color: 'var(--color-primary)' }}>{profile.linkedinUrl ? <a href={profile.linkedinUrl} target="_blank" rel="noreferrer" style={{color: 'inherit'}}>{profile.linkedinUrl}</a> : 'Not specified'}</div>
            )}
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Portfolio URL</label>
            {editMode ? (
              <input
                style={{ width: '100%', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white' }}
                value={formData.portfolioUrl || ''}
                onChange={e => updateField('portfolioUrl', e.target.value)}
                placeholder="https://yourportfolio.com"
              />
            ) : (
              <div style={{ color: 'var(--color-primary)' }}>{profile.portfolioUrl ? <a href={profile.portfolioUrl} target="_blank" rel="noreferrer" style={{color: 'inherit'}}>{profile.portfolioUrl}</a> : 'Not specified'}</div>
            )}
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Bio</label>
             {editMode ? (
               <textarea 
                 style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white', resize: 'vertical' }}
                 value={formData.bio || ''} 
                 onChange={e => updateField('bio', e.target.value)}
                 placeholder="Tell us about yourself..."
               />
             ) : (
               <div style={{ whiteSpace: 'pre-wrap', color: 'var(--color-text-base)', lineHeight: '1.5' }}>{profile.bio || 'No bio provided yet.'}</div>
             )}
          </div>
        </div>
      </Modal>
    </>
  );
};

export default UserProfile;
