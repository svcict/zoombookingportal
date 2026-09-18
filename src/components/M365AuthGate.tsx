import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  User, 
  ArrowRight, 
  ShieldCheck,
  AlertTriangle,
  Info,
  X,
  Clock,
  ShieldAlert,
  Ban
} from 'lucide-react';
import { M365User } from '../types';
import { AyalaFoundationLogo } from './AyalaFoundationLogo';
import microsoftLogoImg from '../assets/images/microsoft_icon.svg';

interface M365AuthGateProps {
  onAuthenticated: (user: M365User) => void;
}

export const M365AuthGate: React.FC<M365AuthGateProps> = ({ onAuthenticated }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const [isAuthenticating, setIsAuthenticating] = useState(false);
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

  // Supabase Sign In (Strict - Authenticates with Supabase Auth / Profiles)
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isIpBlocked) {
      setAuthError('Your IP address is permanently blocked. Please contact an administrator.');
      return;
    }
    if (isLockedOut && lockoutRemaining > 0) {
      setAuthError(`Too many failed login attempts. Please wait ${formatCountdown(lockoutRemaining)} before trying again.`);
      return;
    }
    if (!username.trim()) {
      setAuthError('Please enter your email or username.');
      return;
    }

    setIsAuthenticating(true);
    setAuthError(null);

    try {
      const emailValue = username.trim();
      const res = await fetch('/api/auth/m365/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: emailValue, 
          password: password.trim(),
          authMethod: 'local'
        })
      });

      const data = await res.json();

      if (res.status === 403 || data.blocked) {
        // IP Blocked
        setIsIpBlocked(true);
        setIsLockedOut(true);
        setAuthError('Invalid credentials. Your IP address has been permanently blocked due to repeated failed login attempts. Please contact an administrator.');
        return;
      }

      if (res.status === 429 || data.lockedOut) {
        // Rate limited / Locked out
        setIsLockedOut(true);
        const remSec = data.remainingSeconds || (data.lockoutCycle === 1 ? 60 : 180);
        setLockoutRemaining(remSec);
        setLockoutCycle(data.lockoutCycle || 1);
        setAuthError(`Invalid credentials. Too many failed attempts. Login temporarily disabled for ${formatCountdown(remSec)}.`);
        return;
      }

      if (res.ok && data.success && data.user) {
        localStorage.setItem('m365_auth_user', JSON.stringify(data.user));
        onAuthenticated(data.user);
      } else {
        // Normal failure: "Invalid credentials."
        setAuthError(data.message || 'Invalid credentials.');
      }
    } catch (err: any) {
      console.error(err);
      setAuthError('Connection error contacting authentication service.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  // Trigger Microsoft 365 Single Sign-On (SSO)
  const handleMicrosoftSSO = async () => {
    if (isIpBlocked || (isLockedOut && lockoutRemaining > 0)) {
      return;
    }

    if (!m365Configured) {
      setShowM365ConfigModal(true);
      return;
    }

    setIsSsoLoading(true);
    setAuthError(null);

    try {
      const res = await fetch('/api/auth/m365/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          email: 'sarah.jenkins@zoompartner.com',
          isSSO: true,
          authMethod: 'microsoft_sso'
        })
      });

      const data = await res.json();
      if (res.ok && data.success && data.user) {
        localStorage.setItem('m365_auth_user', JSON.stringify(data.user));
        onAuthenticated(data.user);
      } else {
        setAuthError(data.message || 'Microsoft 365 Single Sign-On failed.');
      }
    } catch (err) {
      console.error(err);
      setAuthError('Connection error contacting Microsoft 365 SSO service.');
    } finally {
      setIsSsoLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F0F2F5] flex flex-col justify-center items-center p-4 sm:p-6 font-sans select-none">
      
      {/* Background Subtle Accent Gradients */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden flex items-center justify-center">
        <div className="w-[600px] h-[600px] bg-blue-500/5 rounded-full blur-3xl absolute -top-40 -left-40" />
        <div className="w-[500px] h-[500px] bg-indigo-500/5 rounded-full blur-3xl absolute -bottom-40 -right-40" />
      </div>

      <div className="w-full max-w-md relative z-10 space-y-4">

        {/* Sign In Card */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-xl overflow-hidden">
          
          {/* Card Header */}
          <div className="p-6 sm:p-7 border-b border-gray-100 bg-white">
            <div className="flex items-center justify-between gap-3">
              {/* Ayala Foundation Logo */}
              <div className="flex items-center">
                <AyalaFoundationLogo height={65} width={180} />
              </div>

              {/* Zoom Booking Portal Badge */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 text-[#0b5cff] rounded-full border border-blue-100 text-xs font-semibold shrink-0">
                <span className="w-2 h-2 rounded-full bg-[#0b5cff]" />
                <span>Zoom Portal</span>
              </div>
            </div>

            <div className="mt-5 text-center">
              <h1 className="text-xl font-extrabold text-gray-900 tracking-tight text-center">
                Sign In
              </h1>
              <p className="text-xs text-gray-500 mt-1">
                Enter your credentials to access the Zoom Booking Portal
              </p>
            </div>
          </div>

          {/* Form Content */}
          <form 
            onSubmit={handleSignIn} 
            className="p-6 sm:p-7 space-y-4"
          >
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

            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Email or Username
              </label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  required
                  disabled={isIpBlocked || (isLockedOut && lockoutRemaining > 0) || isAuthenticating}
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="name@ayalafoundation.org or username"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5cff] focus:border-[#0b5cff] transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-xs font-bold text-gray-700 mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  disabled={isIpBlocked || (isLockedOut && lockoutRemaining > 0) || isAuthenticating}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password (leave blank for demo accounts)"
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-gray-300 text-sm focus:outline-none focus:ring-2 focus:ring-[#0b5cff] focus:border-[#0b5cff] transition-all disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isIpBlocked || (isLockedOut && lockoutRemaining > 0) || isAuthenticating || isSsoLoading}
              className="w-full py-3 px-4 rounded-xl bg-[#0b5cff] hover:bg-[#0049d1] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {isAuthenticating ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </>
              ) : isLockedOut && lockoutRemaining > 0 ? (
                <>
                  <Clock className="w-4 h-4" />
                  <span>Locked for {formatCountdown(lockoutRemaining)}</span>
                </>
              ) : isIpBlocked ? (
                <>
                  <ShieldAlert className="w-4 h-4" />
                  <span>IP Blocked</span>
                </>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>

            {/* Quick Fill Test Accounts Pill */}
            <div className="pt-1">
              <div className="text-[11px] font-semibold text-gray-500 mb-1.5 flex items-center justify-between">
                <span>Test Credentials:</span>
                <span className="text-[10px] text-blue-600 font-medium">Click to fill</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setUsername('user@ayalafoundation.org');
                    setPassword('user@ayalafoundation.org');
                    setAuthError(null);
                  }}
                  className="p-2 rounded-xl bg-gray-50 hover:bg-blue-50 border border-gray-200 hover:border-blue-300 text-left transition-all group cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-gray-800 group-hover:text-blue-600 truncate">
                    Standard User
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono truncate">
                    user@ayalafoundation.org
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setUsername('admin@ayalafoundation.org');
                    setPassword('admin@ayalafoundation.org');
                    setAuthError(null);
                  }}
                  className="p-2 rounded-xl bg-gray-50 hover:bg-purple-50 border border-gray-200 hover:border-purple-300 text-left transition-all group cursor-pointer"
                >
                  <div className="text-[11px] font-bold text-gray-800 group-hover:text-purple-600 truncate">
                    Admin User
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono truncate">
                    admin@ayalafoundation.org
                  </div>
                </button>
              </div>
            </div>

            {/* Divider */}
            <div className="relative flex items-center justify-center pt-2 pb-1">
              <div className="border-t border-gray-200 w-full" />
              <span className="bg-white px-3 text-[11px] font-semibold text-gray-400 uppercase tracking-wider">or</span>
            </div>

            {/* Login Using Microsoft Button (SSO) */}
            <div>
              <button
                type="button"
                onClick={handleMicrosoftSSO}
                disabled={isIpBlocked || (isLockedOut && lockoutRemaining > 0) || isAuthenticating || isSsoLoading}
                className="w-full py-2.5 px-4 rounded-xl border border-gray-200 bg-gray-50 hover:bg-gray-100 disabled:bg-gray-100 disabled:text-gray-400 disabled:cursor-not-allowed text-gray-600 font-semibold text-xs shadow-2xs transition-all flex items-center justify-center gap-2.5 cursor-pointer relative group"
              >
                <img
                  src={microsoftLogoImg}
                  alt="Microsoft Logo"
                  className="w-3.5 h-3.5 object-contain shrink-0 opacity-70 group-hover:opacity-100"
                  referrerPolicy="no-referrer"
                />
                <span>Login using Microsoft 365</span>
                {!m365Configured && (
                  <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded font-medium ml-1">
                    Unconfigured
                  </span>
                )}
              </button>
              {!m365Configured && (
                <p className="text-[10px] text-gray-600 text-center mt-1">
                  * Microsoft 365 login is disabled until Azure Entra ID credentials are configured
                </p>
              )}
            </div>

          </form>

        </div>

        {/* Security & Authentication Footnote */}
        <div className="flex items-center justify-center gap-1.5 text-xs text-gray-600 text-center">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>Brute-force Protected • Supabase Database Authentication</span>
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
                Please sign in with your email or username credentials above.
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
