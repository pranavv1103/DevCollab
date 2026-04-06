import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Camera, Settings, User } from 'lucide-react';
import Modal from './Modal';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
  const [isModalOpen, setIsModalOpen] = useState(false);
  const fileInputRef = useRef(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
    } catch (error) {
      console.error("Failed to fetch profile", error);
    }
  };

  const handleSave = async () => {
    try {
      await axios.put(`http://localhost:9090/api/users/${user.id}/profile`, formData);
      setProfile(formData);
      setEditMode(false);
    } catch (error) {
      console.error("Failed to update profile", error);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setUploadingAvatar(true);
    const formDataUpload = new FormData();
    formDataUpload.append('file', file);

    try {
        const res = await axios.post(`http://localhost:9090/api/users/${user.id}/avatar`, formDataUpload, {
            headers: { 'Content-Type': 'multipart/form-data' }
        });
        const newUrl = `http://localhost:9090${res.data.message}`;
        setFormData(prev => ({...prev, profilePictureUrl: newUrl}));
        setProfile(prev => ({...prev, profilePictureUrl: newUrl}));
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
            <span style={{ fontSize: '10px', color: 'var(--color-success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
              <div style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: 'var(--color-success)' }} />
              Online
            </span>
          </div>
        </div>
        <button onClick={openSettings} className="btn-icon" title="User Settings" style={{ color: 'var(--color-text-muted)', background: 'transparent', border: 'none', cursor: 'pointer', padding: '4px' }}>
          <Settings size={18} />
        </button>
      </div>

      <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="User Settings">
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
          <button className="btn-secondary" onClick={() => editMode ? handleSave() : setEditMode(true)}>
            {editMode ? 'Save Elements' : 'Edit Profile'}
          </button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {editMode && (
            <div style={{ padding: '16px', backgroundColor: 'var(--color-bg-elevation-2)', borderRadius: '8px', border: '1px solid var(--color-bg-elevation-3)' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Update Avatar Source</label>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <input 
                  type="text" 
                  style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white' }}
                  value={formData.profilePictureUrl || ''} 
                  onChange={e => setFormData({...formData, profilePictureUrl: e.target.value})}
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
                onChange={e => setFormData({...formData, programmingLanguages: e.target.value})}
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
                onChange={e => setFormData({...formData, githubUrl: e.target.value})}
                placeholder="https://github.com/..."
              />
            ) : (
              <div style={{ color: 'var(--color-primary)' }}>{profile.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noreferrer" style={{color: 'inherit'}}>{profile.githubUrl}</a> : 'Not specified'}</div>
            )}
          </div>

          <div>
             <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px', textTransform: 'uppercase' }}>Bio</label>
             {editMode ? (
               <textarea 
                 style={{ width: '100%', minHeight: '80px', padding: '10px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-base)', color: 'white', resize: 'vertical' }}
                 value={formData.bio || ''} 
                 onChange={e => setFormData({...formData, bio: e.target.value})}
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
