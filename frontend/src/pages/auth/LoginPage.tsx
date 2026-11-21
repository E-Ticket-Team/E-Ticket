import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useGoogleAuth } from '@/hooks/useGoogleAuth';
import { useToast } from '@/contexts/ToastContext';
import { ApiError } from '@/services/api';
import type { UserProfile } from '@/types/api';
import { SignIn1 } from '@/components/ui/modern-stunning-sign-in';

export function LoginPage() {
  const { login } = useAuth();
  const { googleEnabled, configChecked, googleLoading, startGoogleAuth } = useGoogleAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: { pathname: string } } | null)?.from?.pathname;

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function redirectAfterLogin(user: UserProfile) {
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
  }

  async function handleEmailSignIn(email: string, password: string) {
    setError(null);
    setSubmitting(true);
    try {
      const user = await login({ email, password });
      redirectAfterLogin(user);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to sign in.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleGoogleSignIn() {
    setError(null);
    try {
      const user = await startGoogleAuth();
      redirectAfterLogin(user);
    } catch (err) {
      setError(
        err instanceof ApiError || err instanceof Error
          ? err.message
          : 'Unable to sign in with Google.',
      );
    }
  }

  return (
    <SignIn1
      title="Universal E-Ticket"
      subtitle="Sign in with your account or Google Gmail."
      backLink={
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 rounded-full bg-white border border-[#E3EBE5] px-3.5 py-1.5 text-xs font-semibold text-[#153B2E] hover:text-[#087F5B] hover:border-[#087F5B]/40 hover:bg-[#E7F5EE]/50 shadow-sm transition"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Home</span>
        </Link>
      }
      onEmailSignIn={handleEmailSignIn}
      onGoogleSignIn={handleGoogleSignIn}
      submitting={submitting}
      googleLoading={googleLoading}
      googleConfigured={!configChecked || googleEnabled}
      externalError={error}
      signUpLink={
        <div className="flex flex-col gap-1.5 text-xs text-[#64766D]">
          <span>
            Don&apos;t have an account?{' '}
            <Link
              to="/register"
              className="font-semibold text-[#087F5B] hover:text-[#064E3B] underline underline-offset-2"
            >
              Sign up, it&apos;s free!
            </Link>
          </span>
          <span>
            Hosting events?{' '}
            <Link
              to="/register/organization"
              className="font-semibold text-[#087F5B] hover:text-[#064E3B] underline underline-offset-2"
            >
              Register an organizer account
            </Link>
          </span>
        </div>
      }
    />
  );
}
