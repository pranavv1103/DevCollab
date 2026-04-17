import React, { useEffect, useContext } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

/**
 * Landing page after GitHub OAuth2 redirect.
 * URL: /oauth2/callback?token=<jwt>
 * Stores the JWT via AuthContext and redirects to the home page.
 */
const OAuth2Callback = () => {
  const [searchParams] = useSearchParams();
  const { loginWithToken } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    const token = searchParams.get('token');
    if (token) {
      loginWithToken(token);
      navigate('/', { replace: true });
    } else {
      navigate('/login', { replace: true });
    }
  }, [searchParams, loginWithToken, navigate]);

  return (
    <div style={{ display: 'flex', height: '100vh', justifyContent: 'center', alignItems: 'center', color: 'var(--color-text-muted)' }}>
      Signing you in…
    </div>
  );
};

export default OAuth2Callback;
