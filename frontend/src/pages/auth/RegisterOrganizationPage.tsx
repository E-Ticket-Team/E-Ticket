import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, Building2, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/services/api';
import { cn } from '@/lib/utils';
import {
  AuthGlassShell,
  GLASS_INPUT_CLASS,
  GoogleContinueButton,
} from '@/components/ui/modern-stunning-sign-in';

export function RegisterOrganizationPage() {
  const { registerOrganization } = useAuth();
  const { googleEnabled, configChecked, googleLoading, startGoogleAuth } = useGoogleAuth();
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

  async function handleGoogleOrganizerSignUp() {
    setError(null);
    try {
      const user = await startGoogleAuth({
        accountType: 'ORGANIZER',
        organizationName: organizationName.trim() || undefined,
      });
      showToast(
        `Signed in as ${user.organizationName || user.firstName || user.email}`,
        { variant: 'success' },
      );
      if (user.role === 'ORGANIZER') navigate('/organizer', { replace: true });
      else if (user.role === 'ADMIN') navigate('/admin', { replace: true });
      else navigate('/events', { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unable to continue with Google.',
      );
    }
  }

  return (
    <AuthGlassShell
      title="Register Event Organizer"
      subtitle="Publish events, configure ticket tiers, and track gate scans live."
      icon={<Building2 className="w-5 h-5 text-[#087F5B]" />}
      backLink={
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E3EBE5] px-3.5 py-1.5 text-xs font-semibold text-[#153B2E] hover:text-[#087F5B] hover:border-[#087F5B]/40 hover:bg-[#E7F5EE]/50 shadow-sm transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      }
      maxWidthClass="max-w-md"
      topSlot={
        <div className="grid grid-cols-2 gap-1.5 p-1 rounded-full bg-[#F6F8F5] border border-[#E3EBE5]">
          <Link
            to="/register"
            className="text-center text-xs font-medium py-2 rounded-full text-[#53665E] hover:text-[#052E25] transition"
          >
            Customer Account
          </Link>
          <Link
            to="/register/organization"
            className="text-center text-xs font-semibold py-2 rounded-full bg-[#087F5B] text-white shadow-sm"
          >
            Organizer Account
          </Link>
        </div>
      }
      footerSlot={
        <span className="text-xs text-[#64766D]">
          Already have an account?{' '}
          <Link
            to="/login"
            className="font-semibold text-[#087F5B] hover:text-[#064E3B] underline underline-offset-2"
          >
            Sign in
          </Link>
        </span>
      }
    >
      <form onSubmit={handleSubmit} className="flex flex-col w-full gap-3">
        <div>
          <label htmlFor="org-name" className="sr-only">
            Organization / Brand Name *
          </label>
          <input
            id="org-name"
            placeholder="Organization / Brand Name *"
            className={GLASS_INPUT_CLASS}
            value={organizationName}
            onChange={(e) => setOrganizationName(e.target.value)}
            required
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label htmlFor="org-first" className="sr-only">
              Contact First Name
            </label>
            <input
              id="org-first"
              placeholder="Contact First Name"
              className={GLASS_INPUT_CLASS}
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
            />
          </div>
          <div>
            <label htmlFor="org-last" className="sr-only">
              Contact Last Name
            </label>
            <input
              id="org-last"
              placeholder="Contact Last Name"
              className={GLASS_INPUT_CLASS}
              value={lastName}
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>
        </div>

        <div>
          <label htmlFor="org-email" className="sr-only">
            Business Email *
          </label>
          <input
            id="org-email"
            type="email"
            placeholder="Business Email *"
            className={GLASS_INPUT_CLASS}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
          />
        </div>

        <div>
          <label htmlFor="org-phone" className="sr-only">
            Contact Phone
          </label>
          <input
            id="org-phone"
            type="tel"
            placeholder="Contact Phone (optional)"
            className={GLASS_INPUT_CLASS}
            value={phoneNumber}
            onChange={(e) => setPhoneNumber(e.target.value)}
          />
        </div>

        <div className="relative">
          <label htmlFor="org-password" className="sr-only">
            Password *
          </label>
          <input
            id="org-password"
            type={showPassword ? 'text' : 'password'}
            placeholder="Password (min. 6 characters) *"
            className={cn(GLASS_INPUT_CLASS, 'pr-11')}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={6}
            required
          />
          <button
            type="button"
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64766D] hover:text-[#087F5B] p-1 transition"
          >
            {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>

        {error && (
          <div
            role="alert"
            className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-2.5 text-left"
          >
            {error}
          </div>
        )}

        <hr className="border-t border-[#E3EBE5] my-1" />

        <button
          type="submit"
          disabled={submitting || googleLoading}
          className="w-full bg-[#087F5B] hover:bg-[#066B4D] text-white font-semibold px-5 py-3 rounded-full shadow-[0_8px_20px_rgba(8,127,91,0.22)] transition text-sm disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {submitting ? 'Creating Organization...' : 'Create Organizer Account'}
        </button>

        <GoogleContinueButton
          onClick={handleGoogleOrganizerSignUp}
          disabled={submitting}
          loading={googleLoading}
        />

        {configChecked && !googleEnabled && (
          <p className="text-[11px] text-[#064E3B] bg-[#E7F5EE] border border-[#D5EDE1] rounded-xl px-3 py-1.5 text-center">
            Set <code className="font-mono font-semibold">GOOGLE_CLIENT_ID</code> in{' '}
            <code className="font-mono font-semibold">.env</code> to enable Google Gmail sign-up.
          </p>
        )}
      </form>
    </AuthGlassShell>
  );
}
