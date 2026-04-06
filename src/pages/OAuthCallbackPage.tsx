import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';

export default function OAuthCallbackPage() {
  const [params] = useSearchParams();
  const { setToken, fetchMe } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    const token = params.get('token');
    if (token) {
      setToken(token);
      fetchMe().then(() => navigate('/dashboard'));
    } else {
      navigate('/login?error=oauth_failed');
    }
  }, []);

  return (
    <div className="auth-page">
      <div className="flex flex-col items-center gap-3">
        <div className="spinner" style={{ width: '2rem', height: '2rem', borderWidth: '3px' }} />
        <p className="text-muted">Signing you in...</p>
      </div>
    </div>
  );
}
