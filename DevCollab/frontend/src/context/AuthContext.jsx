/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useState, useEffect } from 'react';
import axios from 'axios';

export const AuthContext = createContext();

// Set header immediately on module load so any early API calls are authenticated
const _savedToken = localStorage.getItem('token');
if (_savedToken) {
  // Check token expiry before using it
  try {
    const _payload = JSON.parse(atob(_savedToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (_payload.exp && _payload.exp * 1000 < Date.now()) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
    } else {
      axios.defaults.headers.common['Authorization'] = `Bearer ${_savedToken}`;
    }
  } catch {
    axios.defaults.headers.common['Authorization'] = `Bearer ${_savedToken}`;
  }
}

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('user');
      const parsed = savedUser ? JSON.parse(savedUser) : null;
      // Apply stored theme immediately to prevent flash
      if (parsed?.themePreference) {
        document.documentElement.setAttribute('data-theme', parsed.themePreference);
      }
      return parsed;
    } catch { return null; }
  });
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem('token');
    if (!savedToken) return null;
    try {
      const payload = JSON.parse(atob(savedToken.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
      if (payload.exp && payload.exp * 1000 < Date.now()) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        return null;
      }
    } catch { /* keep token if parse fails */ }
    return savedToken;
  });
  const [loading, setLoading] = useState(true);

  // Intercept 401 responses globally — force logout only when the JWT is genuinely expired.
  //
  // Background: Spring Boot's error dispatch (e.g. 404 → /error) runs on a fresh filter chain
  // where OncePerRequestFilter skips the JWT filter and the stateless SecurityContext is empty.
  // This makes Spring Security return 401 for /error even though the user's token is still valid.
  // To prevent such false-positive 401s from logging the user out, we verify the token's
  // expiry claim before triggering logout. If the token is still valid, we swallow the 401
  // silently and let the calling component handle the error itself.
  useEffect(() => {
    const isTokenExpired = () => {
      try {
        const tk = localStorage.getItem('token');
        if (!tk) return true;
        const payload = JSON.parse(atob(tk.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
        return payload.exp && payload.exp * 1000 < Date.now();
      } catch {
        return true; // unparseable token → treat as expired
      }
    };

    const interceptorId = axios.interceptors.response.use(
      (response) => response,
      (error) => {
        const url = error.config?.url || '';
        const isAuthRoute = url.includes('/api/auth/');
        const hasToken = !!localStorage.getItem('token');
        // Only log out on 401 when ALL of these are true:
        //   1. The server actually returned 401 (not a network error, not 403/404/500)
        //   2. The user had a token (prevents logout during initial login flow)
        //   3. It is NOT an auth-bootstrap route (/api/auth/*)
        //   4. The token is actually expired (prevents logout on false-positive 401s such
        //      as Spring Boot error dispatch losing the security context)
        if (error.response?.status === 401 && hasToken && !isAuthRoute && isTokenExpired()) {
          localStorage.removeItem('token');
          localStorage.removeItem('user');
          setToken(null);
          setUser(null);
        }
        return Promise.reject(error);
      }
    );
    return () => axios.interceptors.response.eject(interceptorId);
  }, []);

  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      // Fetch fresh user profile from backend to ensure avatar and other fields are current.
      // On failure (e.g. network down), fall back to the cached localStorage user.
      axios.get('http://localhost:9090/api/auth/me')
        .then(res => {
          // Merge server data on top of cached user (preserves token, roles, etc.)
          let cachedUser = {};
          try {
            const saved = localStorage.getItem('user');
            if (saved) cachedUser = JSON.parse(saved);
          } catch { /* ignore */ }
          const freshUser = { ...cachedUser, ...res.data };
          localStorage.setItem('user', JSON.stringify(freshUser));
          setUser(freshUser);
          // Apply theme preference from the server's stored value
          if (freshUser.themePreference) {
            document.documentElement.setAttribute('data-theme', freshUser.themePreference);
          }
        })
        .catch(() => {
          // Keep existing user state if already set, otherwise try localStorage
          setUser(prev => {
            if (prev) return prev;
            try {
              const savedUser = localStorage.getItem('user');
              return savedUser ? JSON.parse(savedUser) : null;
            } catch { return null; }
          });
        })
        .finally(() => setLoading(false));
    } else {
      delete axios.defaults.headers.common['Authorization'];
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(null);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setLoading(false);
    }
  }, [token]);

  const login = async (username, password) => {
    try {
      const res = await axios.post('http://localhost:9090/api/auth/login', { username, password });
      const userData = { ...res.data, id: res.data.id };
      // Set header immediately so any API calls fired on navigation are authenticated.
      // Do NOT wait for the useEffect([token]) to run — it's too late.
      axios.defaults.headers.common['Authorization'] = `Bearer ${res.data.token}`;
      localStorage.setItem('token', res.data.token);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(res.data.token);
      setUser(userData);
      return true;
    } catch (error) {
      console.error("Login failed", error);
      return false;
    }
  };

  const register = async (username, email, password) => {
    try {
      await axios.post('http://localhost:9090/api/auth/register', { username, email, password });
      return { success: true };
    } catch (error) {
      console.error("Registration failed", error);
      return { success: false, message: error.response?.data?.message || "Registration failed." };
    }
  };

  const updateUser = (updated) => {
    const newUser = { ...user, ...updated };
    localStorage.setItem('user', JSON.stringify(newUser));
    setUser(newUser);
    // Apply theme immediately when updated
    if (updated.themePreference) {
      document.documentElement.setAttribute('data-theme', updated.themePreference);
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
  };

  const loginWithToken = (jwt) => {
    axios.defaults.headers.common['Authorization'] = `Bearer ${jwt}`;
    localStorage.setItem('token', jwt);
    setToken(jwt);
    // user will be fetched by the useEffect([token]) block
  };

  return (
    <AuthContext.Provider value={{ user, token, login, loginWithToken, logout, register, loading, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
};
