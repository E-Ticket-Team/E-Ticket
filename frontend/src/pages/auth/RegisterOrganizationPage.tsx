import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { useToast } from '../../contexts/ToastContext';
import { ApiError } from '../../services/api';
import { AlertBanner } from '../../components/AlertBanner';

export function RegisterOrganizationPage() {
  const { registerOrganization } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  const [organizationName, setOrganizationName] = useState('');
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
      await registerOrganization({
        organizationName: organizationName.trim(),
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim(),
        phoneNumber: phoneNumber.trim() || undefined,
        password,
      });
      showToast('Organization account created. Welcome to Organizer Studio!', {
        variant: 'success',
      });
      navigate('/organizer', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Unable to register organization.',
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="auth-shell">
      <div className="card card-padded">
        <div className="auth-tabs">
          <Link to="/register" className="btn btn-secondary btn-sm">
            Customer Account
          </Link>
          <Link to="/register/organization" className="btn btn-primary btn-sm">
            Organizer Account
          </Link>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h1 className="page-title" style={{ fontSize: '1.6rem' }}>
            Register Event Organizer
          </h1>
          <p className="page-subtitle">
            Publish events, manage ticket tiers, monitor sales analytics, and assign gate scanners.
          </p>
        </div>

        {error && <AlertBanner variant="error" title="Registration Error" message={error} />}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div className="input-group">
            <label htmlFor="org-name" className="input-label">
              Organization / Brand Name *
            </label>
            <input
              id="org-name"
              className="input"
              placeholder="e.g. Cambodia Tech Events Ltd."
              value={organizationName}
              onChange={(e) => setOrganizationName(e.target.value)}
              required
            />
          </div>

          <div className="form-grid-2">
            <div className="input-group">
              <label htmlFor="org-first" className="input-label">
                Contact First Name
              </label>
              <input
                id="org-first"
                className="input"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
              />
            </div>

            <div className="input-group">
              <label htmlFor="org-last" className="input-label">
                Contact Last Name
              </label>
              <input
                id="org-last"
                className="input"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
              />
            </div>
          </div>

          <div className="input-group">
            <label htmlFor="org-email" className="input-label">
              Business Email *
            </label>
            <input
              id="org-email"
              type="email"
              className="input"
              placeholder="events@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label htmlFor="org-phone" className="input-label">
              Contact Phone
            </label>
            <input
              id="org-phone"
              type="tel"
              className="input"
              placeholder="+85598765432"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
            />
          </div>

          <div className="input-group">
            <label htmlFor="org-password" className="input-label">
              Password (min. 6 characters) *
            </label>
            <div className="password-wrap">
              <input
                id="org-password"
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
            <Building2 size={17} />
            <span>{submitting ? 'Creating Organization...' : 'Create Organizer Account'}</span>
          </button>
        </form>

        <p style={{ marginTop: 18, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
          Already have an account?{' '}
          <Link to="/login" style={{ color: 'var(--brand-primary)', fontWeight: 600 }}>
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
