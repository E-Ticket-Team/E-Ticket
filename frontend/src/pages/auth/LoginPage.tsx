import { useState, type FormEvent } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, LogIn, ShieldCheck } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { AlertBanner } from '../../components/AlertBanner';

export function LoginPage() {
  const { login } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from
    ?.pathname;

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      const user = await login({ email: email.trim(), password });
      showToast(`Welcome back, ${user.firstName || user.organizationName || user.email}!`, {
        variant: 'success',
      });

      if (from && from !== '/login') {
        navigate(from, { replace: true });
        return;
      }

      if (user.role === 'ORGANIZER') navigate('/organizer', { replace: true });
      else if (user.role === 'SCANNER') navigate('/scanner', { replace: true });
      else if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/events', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card card-padded">
        <div style={{ marginBottom: 20 }}>
          <div className="badge badge-info" style={{ marginBottom: 10 }}>
            <ShieldCheck size={13} />
            <span>Secure HttpOnly Session</span>
          </div>
          <h1 className="page-title" style={{ fontSize: '1.65rem' }}>
            Sign in to Universal E-Ticket
          </h1>
          <p className="page-subtitle">
            Access your tickets, manage events, or operate gate check-in scanners.
          </p>
        </div>

        {error && <AlertBanner variant="error" title="Sign In Failed" message={error} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 15 }}>
          <div className="input-group">
            <label htmlFor="login-email" className="input-label">
              Email Address
            </label>
            <input
              id="login-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="login-password" className="input-label">
              Password
            </label>
            <div className="password-wrap">
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                minLength={6}
                required
              />
              <button
                type="button"
                className="password-toggle"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary btn-lg" disabled={submitting}>
            <LogIn size={17} />
            <span>{submitting ? 'Signing In...' : 'Sign In'}</span>
          </button>
        </form>

        <div
          style={{
            marginTop: 22,
            paddingTop: 18,
            borderTop: '1px solid var(--border-color)',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            fontSize: '0.88rem',
            color: 'var(--text-secondary)',
          }}
        >
          <div>
            New customer?{' '}
            <Link to="/register" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
              Create a customer account
            </Link>
          </div>
          <div>
            Hosting events?{' '}
            <Link
              to="/register/organization"
              style={{ color: 'var(--brand-primary)', fontWeight: 600 }}
            >
              Register an organizer account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
