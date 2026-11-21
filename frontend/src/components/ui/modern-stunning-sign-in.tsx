'use client';

import * as React from 'react';
import { Eye, EyeOff, Ticket } from 'lucide-react';
import { cn } from '@/lib/utils';

export const GLASS_INPUT_CLASS =
  'w-full px-4 py-3 rounded-xl bg-[#FAFCFA] text-[#102A21] placeholder-[#82948B] text-sm border border-[#C8D6CD] focus:outline-none focus:bg-white focus:ring-2 focus:ring-[#087F5B]/20 focus:border-[#087F5B] transition';

const COMMUNITY_AVATARS = [
  { initials: 'SS', bg: 'bg-[#087F5B]' },
  { initials: 'CT', bg: 'bg-[#064E3B]' },
  { initials: 'VK', bg: 'bg-[#145C48]' },
  { initials: 'ML', bg: 'bg-[#15803D]' },
];

export function GoogleLogoMark({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M12 10.2v3.9h5.4c-.2 1.3-1.5 3.9-5.4 3.9-3.2 0-5.9-2.7-5.9-6s2.7-6 5.9-6c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5 6.8 2.5 2.5 6.8 2.5 12s4.3 9.5 9.5 9.5c5.5 0 9.1-3.8 9.1-9.2 0-.6-.1-1.1-.2-1.6H12z"
      />
      <path
        fill="#34A853"
        d="M3.7 7.6l3.2 2.4C7.8 7.8 9.7 6.4 12 6.4c1.8 0 3.1.8 3.8 1.5l2.6-2.5C16.8 3.5 14.6 2.5 12 2.5c-3.7 0-6.8 2.1-8.3 5.1z"
      />
      <path
        fill="#FBBC05"
        d="M12 21.5c2.5 0 4.7-.8 6.3-2.3l-3-2.4c-.8.6-1.9 1-3.3 1-2.5 0-4.7-1.7-5.5-4.1l-3.2 2.5c1.5 3.1 4.8 5.3 8.7 5.3z"
      />
      <path
        fill="#4285F4"
        d="M21.1 12.3c0-.6-.1-1.1-.2-1.6H12v3.9h5.4c-.3 1.2-1 2.2-2.1 2.9l3 2.4c1.8-1.6 2.8-4.1 2.8-7.6z"
      />
    </svg>
  );
}

export function GoogleContinueButton({
  onClick,
  disabled,
  loading,
  label = 'Continue with Google',
}: {
  onClick?: () => void;
  disabled?: boolean;
  loading?: boolean;
  label?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className="w-full flex items-center justify-center gap-2.5 bg-white hover:bg-[#F6F8F5] border border-[#C8D6CD] hover:border-[#087F5B]/50 rounded-full px-5 py-3 font-semibold text-[#052E25] shadow-sm transition mb-2 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
    >
      <GoogleLogoMark className="w-5 h-5 shrink-0" />
      <span>{loading ? 'Connecting to Google...' : label}</span>
    </button>
  );
}

interface AuthGlassShellProps {
  title: string;
  subtitle?: string;
  icon?: React.ReactNode;
  backLink?: React.ReactNode;
  topSlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
  maxWidthClass?: string;
  children: React.ReactNode;
}

export function AuthGlassShell({
  title,
  subtitle,
  icon,
  backLink,
  topSlot,
  footerSlot,
  maxWidthClass = 'max-w-[410px]',
  children,
}: AuthGlassShellProps) {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center bg-white relative overflow-hidden px-4 py-12">
      {/* Soft architectural Ivory & Emerald ambient glow */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-36 left-1/2 -translate-x-1/2 w-[640px] h-[420px] rounded-full bg-[#E7F5EE]/90 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-36 right-1/4 w-[420px] h-[420px] rounded-full bg-[#087F5B]/[0.06] blur-3xl"
      />

      {backLink && (
        <div className="absolute top-6 left-6 z-20">{backLink}</div>
      )}

      {/* Centered white glass card */}
      <div
        className={cn(
          'relative z-10 w-full rounded-3xl bg-white/95 backdrop-blur-md border border-[#E3EBE5] shadow-[0_20px_60px_rgba(6,78,59,0.08)] p-7 sm:p-8 flex flex-col items-center',
          maxWidthClass,
        )}
      >
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[#E7F5EE] border border-[#D5EDE1] mb-5 shadow-sm text-[#087F5B]">
          {icon ?? <Ticket className="w-5 h-5 text-[#087F5B]" />}
        </div>

        <h1 className="text-2xl font-bold text-[#052E25] tracking-tight text-center mb-1.5">
          {title}
        </h1>
        {subtitle ? (
          <p className="text-xs text-[#64766D] text-center mb-6 max-w-xs leading-relaxed">
            {subtitle}
          </p>
        ) : (
          <div className="mb-6" />
        )}

        {topSlot && <div className="w-full mb-5">{topSlot}</div>}

        <div className="w-full">{children}</div>

        {footerSlot && <div className="w-full text-center mt-5">{footerSlot}</div>}
      </div>

      {/* Community member trust row */}
      <div className="relative z-10 mt-10 flex flex-col items-center text-center">
        <p className="text-[#64766D] text-xs sm:text-sm mb-3">
          Join <span className="font-semibold text-[#052E25]">thousands</span> of
          attendees &amp; organizers on Universal E-Ticket.
        </p>
        <div className="flex items-center -space-x-2">
          {COMMUNITY_AVATARS.map((avatar) => (
            <span
              key={avatar.initials}
              className={cn(
                'w-8 h-8 rounded-full border-2 border-white flex items-center justify-center text-[11px] font-bold text-white shadow-sm',
                avatar.bg,
              )}
              aria-hidden="true"
            >
              {avatar.initials}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}

export interface SignIn1Props {
  title?: string;
  subtitle?: string;
  backLink?: React.ReactNode;
  onEmailSignIn?: (email: string, password: string) => Promise<void> | void;
  onGoogleSignIn?: () => Promise<void> | void;
  submitting?: boolean;
  googleLoading?: boolean;
  googleConfigured?: boolean;
  externalError?: string | null;
  signUpLink?: React.ReactNode;
}

const SignIn1 = ({
  title = 'Universal E-Ticket',
  subtitle = 'Sign in to access your passes and event workspace.',
  backLink,
  onEmailSignIn,
  onGoogleSignIn,
  submitting = false,
  googleLoading = false,
  googleConfigured = true,
  externalError = null,
  signUpLink,
}: SignIn1Props) => {
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [showPassword, setShowPassword] = React.useState(false);
  const [localError, setLocalError] = React.useState('');

  const validateEmail = (value: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedEmail = email.trim();

    if (!trimmedEmail || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }
    if (!validateEmail(trimmedEmail)) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    setLocalError('');
    if (onEmailSignIn) {
      await onEmailSignIn(trimmedEmail, password);
    }
  };

  const displayError = externalError || localError;

  return (
    <AuthGlassShell
      title={title}
      subtitle={subtitle}
      backLink={backLink}
      footerSlot={
        signUpLink ?? (
          <span className="text-xs text-[#64766D]">
            Don&apos;t have an account?{' '}
            <a
              href="/register"
              className="font-semibold text-[#087F5B] hover:text-[#064E3B] underline underline-offset-2"
            >
              Sign up, it&apos;s free!
            </a>
          </span>
        )
      }
    >
      <form onSubmit={handleSignIn} className="flex flex-col w-full gap-4" noValidate>
        <div className="w-full flex flex-col gap-3">
          <div>
            <label htmlFor="login-email" className="sr-only">
              Email Address
            </label>
            <input
              id="login-email"
              placeholder="Email"
              type="email"
              value={email}
              autoComplete="email"
              className={GLASS_INPUT_CLASS}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="relative">
            <label htmlFor="login-password" className="sr-only">
              Password
            </label>
            <input
              id="login-password"
              placeholder="Password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              autoComplete="current-password"
              className={cn(GLASS_INPUT_CLASS, 'pr-11')}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((prev) => !prev)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-[#64766D] hover:text-[#087F5B] p-1 transition"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {displayError && (
            <div
              role="alert"
              className="text-xs text-[#991B1B] bg-[#FEF2F2] border border-[#FECACA] rounded-xl px-3.5 py-2.5 text-left"
            >
              {displayError}
            </div>
          )}
        </div>

        <hr className="border-t border-[#E3EBE5]" />

        <div>
          <button
            type="submit"
            disabled={submitting || googleLoading}
            className="w-full bg-[#087F5B] hover:bg-[#066B4D] text-white font-semibold px-5 py-3 rounded-full shadow-[0_8px_20px_rgba(8,127,91,0.22)] transition mb-3 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>

          <GoogleContinueButton
            onClick={() => {
              setLocalError('');
              onGoogleSignIn?.();
            }}
            disabled={submitting}
            loading={googleLoading}
          />

          {!googleConfigured && (
            <p className="text-[11px] text-[#064E3B] bg-[#E7F5EE] border border-[#D5EDE1] rounded-xl px-3 py-1.5 text-center mt-2">
              Set <code className="font-mono font-semibold">GOOGLE_CLIENT_ID</code> in{' '}
              <code className="font-mono font-semibold">.env</code> to enable Google Gmail sign-in.
            </p>
          )}
        </div>
      </form>
    </AuthGlassShell>
  );
};

export { SignIn1 };

export default SignIn1;
