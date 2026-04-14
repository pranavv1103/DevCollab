import { createContext, useState, useContext } from 'react';

export const UserProfileContext = createContext();

export const UserProfileProvider = ({ children }) => {
  const [profileState, setProfileState] = useState({
    isOpen: false,
    userId: null,
    serverId: null,
    channelId: null,
  });

  const openProfile = (userId, serverId, channelId = null) => {
    setProfileState({ isOpen: true, userId, serverId, channelId });
  };

  const closeProfile = () => {
    setProfileState({ isOpen: false, userId: null, serverId: null, channelId: null });
  };

  return (
    <UserProfileContext.Provider value={{ ...profileState, openProfile, closeProfile }}>
      {children}
    </UserProfileContext.Provider>
  );
};

export const useUserProfile = () => useContext(UserProfileContext);
