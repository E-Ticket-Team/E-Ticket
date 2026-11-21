import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Eye, EyeOff, UserPlus } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { AlertBanner } from '../../components/AlertBanner';

export function RegisterCustomerPage() {
  const { registerCustomer } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await registerCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        password,
      });
      showToast('Customer account created successfully.', { variant: 'success' });
      navigate('/events', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to register account.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card card-padded">
        <div className="auth-tabs">
          <Link to="/register" className="btn btn-primary btn-sm">
            Customer Account
          </Link>
          <Link to="/register/organization" className="btn btn-secondary btn-sm">
            Organizer Account
          </Link>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ fontSize: '1.6rem' }}>
            Create Customer Account
          </h1>
          <p className="page-subtitle">
            Discover events, reserve seats, and manage your digital QR ticket wallet.
          </p>
        </div>

        {error && <AlertBanner variant="error" title="Registration Error" message={error} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="reg-first" className="input-label">
                First Name *
              </label>
              <input
                id="reg-first"
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
              />
            </div>

            <div className="input-group">
              <label htmlFor="reg-last" className="input-label">
                Last Name *
              </label>
              <input
                id="reg-last"
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                required
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="reg-email" className="input-label">
              Email Address *
            </label>
            <input
              id="reg-email"
              type="email"
              className="input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-phone" className="input-label">
              Phone Number
            </label>
            <input
              id="reg-phone"
              type="tel"
              className="input"
              placeholder="+85512345678"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="reg-password" className="input-label">
              Password (min. 6 characters) *
            </label>
            <div className="password-wrap">
              <input
                id="reg-password"
                type={showPassword ? 'text' : 'password'}
                className="input"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
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
            <UserPlus size={17} />
            <span>{submitting ? 'Creating Account...' : 'Create Customer Account'}</span>
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already registered?{' '}
          <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
