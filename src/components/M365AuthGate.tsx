import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  Info,
  X,
  Clock,
  Ban
} from 'lucide-react';
import { M365User } from '../types';
import { AyalaFoundationLogo } from './AyalaFoundationLogo';
import microsoftLogoImg from '../assets/images/microsoft_icon.svg';
import zoomLogoImg from '../assets/images/zoom_logo.png';

interface M365AuthGateProps {
  onAuthenticated: (user: M365User) => void;
  // 'admin' gives the /admin portal's login screen a visually distinct look
  // (a decorative glow + copy differences, same blue accent as the rest of
  // the app) so it's never mistaken for the regular staff sign-in, even
  // before anyone signs in.
  variant?: 'staff' | 'admin';
}

export const M365AuthGate: React.FC<M365AuthGateProps> = ({ onAuthenticated, variant = 'staff' }) => {
  const isAdminVariant = variant === 'admin';

  const [isSsoLoading, setIsSsoLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  
  // Rate Limit / Lockout State
  const [isLockedOut, setIsLockedOut] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState<number>(0);
  const [lockoutCycle, setLockoutCycle] = useState<number>(0);
  const [isIpBlocked, setIsIpBlocked] = useState<boolean>(false);
  const [clientIp, setClientIp] = useState<string>('');

  const [m365Configured, setM365Configured] = useState(false);
  const [showM365ConfigModal, setShowM365ConfigModal] = useState(false);

  // Fetch initial rate limit status and M365 config
  const fetchRateLimitStatus = async () => {
    try {
      const res = await fetch('/api/auth/rate-limit-status');
      if (res.ok) {
        const data = await res.json();
        setClientIp(data.ip || '');
        setIsIpBlocked(Boolean(data.isPermanentlyBlocked));
        setLockoutCycle(data.lockoutCycle || 0);

        if (data.isPermanentlyBlocked) {
          setIsLockedOut(true);
          setAuthError('Your IP address has been permanently blocked due to repeated failed login attempts.');
        } else if (data.isLockedOut && data.remainingSeconds > 0) {
          setIsLockedOut(true);
          setLockoutRemaining(data.remainingSeconds);
        } else {
          setIsLockedOut(false);
          setLockoutRemaining(0);
        }
      }
    } catch (e) {
      console.warn('Failed to fetch rate limit status:', e);
    }
  };

  useEffect(() => {
    fetchRateLimitStatus();

    fetch('/api/auth/m365/status')
      .then((r) => r.json())
      .then((data) => {
        setM365Configured(Boolean(data.configured));
      })
      .catch(() => {});
  }, []);

  // Countdown timer for lockout
  useEffect(() => {
    if (!isLockedOut || lockoutRemaining <= 0 || isIpBlocked) return;

    const timer = setInterval(() => {
      setLockoutRemaining((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          setIsLockedOut(false);
          setAuthError(null);
          fetchRateLimitStatus();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isLockedOut, lockoutRemaining, isIpBlocked]);

  const formatCountdown = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  // Trigger Microsoft 365 Single Sign-On (SSO): a real redirect to
  // Microsoft's own login page (login.microsoftonline.com), handled by
  // /api/auth/m365/authorize + /auth/callback on the server.
  const handleMicrosoftSSO = () => {
    if (isIpBlocked || (isLockedOut && lockoutRemaining > 0)) {
      return;
    }

    if (!m365Configured) {
      setShowM365ConfigModal(true);
      return;
    }

    setIsSsoLoading(true);
    setAuthError(null);
    // Carries the current path (e.g. /admin) through the OAuth round-trip so
    // landing there pre-login isn't lost once Microsoft redirects back.
    window.location.href = '/api/auth/m365/authorize?returnPath=' + encodeURIComponent(window.location.pathname);
  };

  // Pick up the result of a completed Microsoft 365 SSO redirect: the
  // server encodes the signed-in user into the URL hash (#m365_sso=...) on
  // success, or an error message into ?m365_error=... on failure.
  useEffect(() => {
    if (window.location.hash.startsWith('#m365_sso=')) {
      const encodedUser = window.location.hash.slice('#m365_sso='.length);
      try {
        const base64 = encodedUser.replace(/-/g, '+').replace(/_/g, '/');
        const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
        const user = JSON.parse(decodeURIComponent(escape(atob(padded))));
        localStorage.setItem('m365_auth_user', JSON.stringify(user));
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
        onAuthenticated(user);
        return;
      } catch (err) {
        console.error('Failed to parse Microsoft 365 SSO result:', err);
        setAuthError('Microsoft 365 sign-in completed but the response could not be read.');
        window.history.replaceState(null, '', window.location.pathname + window.location.search);
      }
    }

    const params = new URLSearchParams(window.location.search);
    const ssoError = params.get('m365_error');
    if (ssoError) {
      setAuthError(ssoError);
      params.delete('m365_error');
      const newSearch = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (newSearch ? `?${newSearch}` : ''));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center p-4 sm:p-6 font-sans select-none">

      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        {isAdminVariant ? (
          <>
            <div className="w-[600px] h-[600px] bg-[#0b5cff]/5 rounded-full blur-3xl absolute -top-40 -left-40" />
            <div className="w-[500px] h-[500px] bg-fuchsia-500/5 rounded-full blur-3xl absolute -bottom-40 -right-40" />
          </>
        ) : (
          <>
            <div className="w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl absolute -top-40 -left-40" />
            <div className="w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl absolute -bottom-40 -right-40" />
          </>
        )}
      </div>

      <div className="w-full max-w-md relative z-10 space-y-4">

        {/* Sign In Card */}
        <div className={`bg-white rounded-2xl shadow-xl overflow-hidden border ${isAdminVariant ? 'border-blue-200' : 'border-gray-200'}`}>

          {/* Card Header */}
          <div className={`p-6 sm:p-7 bg-white border-b ${isAdminVariant ? 'border-blue-100' : 'border-gray-100'}`}>
            <div className="flex items-center justify-between gap-3">
              {/* Ayala Foundation Logo */}
              <div className="flex items-center">
                <AyalaFoundationLogo height={65} width={180} />
              </div>

              {/* Zoom Logo - same image as the staff login, so both are
                  recognizably part of the same product; the "Admin Portal"
                  label underneath is what actually keeps this screen
                  visually distinct, not a different logo. */}
              {isAdminVariant ? (
                <div className="flex flex-col items-end gap-1 shrink-0">
                  <img src={zoomLogoImg} alt="Zoom" className="h-6 w-auto" />
                  <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#0b5cff] rounded-full border border-blue-200 text-xs font-semibold">
                    <ShieldCheck className="w-3 h-3" />
                    <span>Admin Portal</span>
                  </div>
                </div>
              ) : (
                <img src={zoomLogoImg} alt="Zoom" className="h-6 w-auto shrink-0" />
              )}
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-xl font-extrabold tracking-tight text-center text-gray-900">
                {isAdminVariant ? 'Admin Sign In' : 'Sign In'}
              </h1>
              <p className="text-xs mt-1 text-gray-500">
                {isAdminVariant
                  ? 'Restricted to authorized administrators only'
                  : 'Sign in with your Microsoft 365 account to access the Zoom Booking Portal'}
              </p>
            </div>
          </div>

          {/* Sign-In Content - SSO only, no manual email/password entry */}
          <div className="p-6 sm:p-7 space-y-4">
            {/* IP Blocked Alert Card */}
            {isIpBlocked && (
              <div className="p-4 bg-red-50 border border-red-300 rounded-xl text-xs text-red-900 space-y-2">
                <div className="flex items-center gap-2 font-bold text-red-800">
                  <Ban className="w-4 h-4 text-red-600 shrink-0" />
                  <span>Access Blocked: IP Blacklisted</span>
                </div>
                <p className="leading-relaxed text-red-700">
                  Your IP address (<strong>{clientIp || 'Client IP'}</strong>) has been permanently blocked due to repeated failed login attempts.
                </p>
                <div className="p-2 bg-red-100/70 rounded-lg text-[11px] font-medium text-red-900">
                  Contact an IT Global Administrator to review the security log and unblock your IP.
                </div>
              </div>
            )}

            {/* Lockout Countdown Alert Card */}
            {!isIpBlocked && isLockedOut && lockoutRemaining > 0 && (
              <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl text-xs text-amber-900 space-y-2 animate-pulse">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-bold text-amber-900">
                    <Clock className="w-4 h-4 text-amber-700 shrink-0 animate-spin" />
                    <span>Login Temporarily Locked</span>
                  </div>
                  <span className="px-2 py-0.5 bg-amber-200 text-amber-900 font-mono font-bold rounded text-xs">
                    {formatCountdown(lockoutRemaining)}
                  </span>
                </div>
                <p className="leading-relaxed text-amber-800 text-[11.5px]">
                  3 consecutive failed login attempts detected. For security, sign in is blocked for{' '}
                  <strong>{lockoutCycle === 1 ? '1 minute' : '3 minutes'}</strong>.
                </p>
              </div>
            )}

            {/* Standard Error Notice */}
            {authError && !isIpBlocked && (!isLockedOut || lockoutRemaining <= 0) && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-start gap-2.5">
                <div className="w-4 h-4 rounded-full bg-red-100 text-red-600 flex items-center justify-center shrink-0 mt-0.5 font-bold">!</div>
                <div className="leading-snug">{authError}</div>
              </div>
            )}

            {/* Login Using Microsoft Button (SSO) */}
            <div>
              <button
                type="button"
                onClick={handleMicrosoftSSO}
                disabled={isIpBlocked || (isLockedOut && lockoutRemaining > 0) || isSsoLoading}
                className={
                  isAdminVariant
                    ? 'w-full py-2.5 px-4 rounded-xl border border-blue-200 bg-blue-50/60 hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed text-[#0b5cff] font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer relative group'
                    : 'w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-600 font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer relative group'
                }
              >
                <img
                  src={microsoftLogoImg}
                  alt="Microsoft Logo"
                  className="w-3.5 h-3.5 object-contain shrink-0 opacity-70 group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
                <span>Login using Microsoft 365</span>
                {!m365Configured && (
                  <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ml-1 ${isAdminVariant ? 'bg-blue-100 text-[#0b5cff]' : 'bg-gray-200 text-gray-600'}`}>
                    Unconfigured
                  </span>
                )}
              </button>
              {!m365Configured && (
                <p className="text-[10px] text-center mt-1 text-gray-600">
                  * Microsoft 365 login is disabled until Azure Entra ID credentials are configured
                </p>
              )}
            </div>

          </div>

        </div>

        {/* Footer: copyright + privacy policy link */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-center text-gray-500">
          <span>
            © {new Date().getFullYear()} Ayala Foundation, Inc. |{' '}
            <a
              href="https://ayalafoundation.org/privacy-policy"
              target="_blank"
              rel="noopener noreferrer"
              className="font-medium hover:underline text-[#0b5cff]"
            >
              Data Privacy Policy
            </a>
          </span>
        </div>

      </div>

      {/* Modal: Microsoft 365 Configuration Information */}
      {showM365ConfigModal && (
        <div 
          className="fixed inset-0 z-50 bg-black/50 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in"
          onClick={() => setShowM365ConfigModal(false)}
        >
          <div 
            className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-gray-200 space-y-4 animate-in zoom-in-95"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <button
                type="button"
                onClick={() => setShowM365ConfigModal(false)}
                className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Microsoft 365 Login Disabled
              </h3>
              <p className="text-xs text-gray-600 mt-1.5 leading-relaxed">
                Microsoft 365 Entra ID Single Sign-On requires explicit Azure Application credentials before it can be used.
              </p>
            </div>

            <div className="p-3.5 bg-gray-50 rounded-xl border border-gray-200 text-xs space-y-2">
              <div className="font-bold text-gray-700 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 text-blue-600" />
                <span>Required Environment Variables:</span>
              </div>
              <ul className="list-disc list-inside space-y-1 font-mono text-[11px] text-gray-600">
                <li>MICROSOFT_CLIENT_ID (Application ID)</li>
                <li>MICROSOFT_TENANT_ID (Directory ID)</li>
              </ul>
              <p className="text-gray-500 text-[11px] pt-1">
                Until then, nobody can sign in to this portal.
              </p>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShowM365ConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-[#0b5cff] text-white text-xs font-bold hover:bg-[#0049d1] transition-colors cursor-pointer"
              >
                Understood
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
