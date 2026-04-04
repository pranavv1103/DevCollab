import React, { useState, useEffect, useContext, useRef } from 'react';
import axios from 'axios';
import { AuthContext } from '../context/AuthContext';
import { Camera } from 'lucide-react';

const UserProfile = () => {
  const { user } = useContext(AuthContext);
  const [profile, setProfile] = useState({});
  const [editMode, setEditMode] = useState(false);
  const [formData, setFormData] = useState({});
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
        const newUrl = `http://localhost:9090${res.data.message}`; // get avatarUrl string from message response
        setFormData(prev => ({...prev, profilePictureUrl: newUrl}));
        setProfile(prev => ({...prev, profilePictureUrl: newUrl}));
    } catch (error) {
        console.error("Failed to upload avatar", error);
        alert("Failed to upload avatar image");
    } finally {
        setUploadingAvatar(false);
    }
  };

  if (!user?.id) return null;

  return (
    <div style={{ padding: '24px', backgroundColor: 'var(--color-bg-elevation-1)', borderBottom: '1px solid var(--color-bg-elevation-3)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
        <h2 style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, overflow: 'hidden' }}>
          <div style={{ 
            minWidth: '40px', width: '40px', height: '40px', borderRadius: '50%', backgroundColor: 'var(--color-primary)', 
            display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '18px', flexShrink: 0,
            backgroundImage: profile.profilePictureUrl ? `url(${profile.profilePictureUrl.startsWith('http') ? profile.profilePictureUrl : 'http://localhost:9090' + profile.profilePictureUrl})` : 'none',
            backgroundSize: 'cover', backgroundPosition: 'center', color: profile.profilePictureUrl ? 'transparent' : 'white'
          }}>
            {!profile.profilePictureUrl && profile.username?.charAt(0).toUpperCase()}
          </div>
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {profile.username}'s Profile
          </span>
        </h2>
        <button className="btn-primary" style={{ flexShrink: 0 }} onClick={() => editMode ? handleSave() : setEditMode(true)}>
          {editMode ? 'Save Profile' : 'Edit Profile'}
        </button>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: '600px' }}>
        {editMode && (
          <div style={{ padding: '12px', backgroundColor: 'var(--color-bg-elevation-2)', borderRadius: '8px', border: '1px solid var(--color-bg-elevation-3)' }}>
            <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '8px' }}>Avatar Source</label>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <input 
                type="text" 
                style={{ flex: 1 }}
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
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Programming Languages</label>
          {editMode ? (
            <input 
              style={{ width: '100%' }}
              value={formData.programmingLanguages || ''} 
              onChange={e => setFormData({...formData, programmingLanguages: e.target.value})}
              placeholder="e.g. Java, Python, React"
            />
          ) : (
            <div>{profile.programmingLanguages || 'Not specified'}</div>
          )}
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '4px' }}>GitHub URL</label>
          {editMode ? (
            <input 
              style={{ width: '100%' }}
              value={formData.githubUrl || ''} 
              onChange={e => setFormData({...formData, githubUrl: e.target.value})}
              placeholder="https://github.com/..."
            />
          ) : (
            <div>{profile.githubUrl ? <a href={profile.githubUrl} target="_blank" rel="noreferrer">{profile.githubUrl}</a> : 'Not specified'}</div>
          )}
        </div>

        <div>
           <label style={{ display: 'block', fontSize: '12px', fontWeight: 'bold', color: 'var(--color-text-muted)', marginBottom: '4px' }}>Bio</label>
           {editMode ? (
             <textarea 
               style={{ width: '100%', minHeight: '60px', padding: '8px', borderRadius: '4px', border: '1px solid var(--color-bg-elevation-3)', backgroundColor: 'var(--color-bg-elevation-2)', color: 'var(--color-text-base)' }}
               value={formData.bio || ''} 
               onChange={e => setFormData({...formData, bio: e.target.value})}
               placeholder="Tell us about yourself..."
             />
           ) : (
             <div style={{ whiteSpace: 'pre-wrap' }}>{profile.bio || 'No bio provided yet.'}</div>
           )}
        </div>
      </div>
    </div>
  );
};

export default UserProfile;
