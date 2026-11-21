import React, { useState } from 'react';
import { ENV } from '../config/env';
import { useStore } from '../context/StoreContext';
import { api } from '../services/api';

interface GoogleOAuthTokenResponse {
  access_token?: string;
  error?: string;
}

interface GoogleIdentityWindow extends Window {
  google?: {
    accounts?: {
      oauth2?: {
        initTokenClient: (config: {
          client_id: string;
          scope: string;
          callback: (res: GoogleOAuthTokenResponse) => void;
          error_callback?: (err: { message?: string }) => void;
        }) => { requestAccessToken: (opts?: { prompt?: string }) => void };
      };
    };
  };
}

function loadGoogleIdentityScript(): Promise<void> {
  if ((window as GoogleIdentityWindow).google?.accounts?.oauth2) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[src="https://accounts.google.com/gsi/client"]'
    );
    if (existing) {
      existing.addEventListener('load', () => resolve(), { once: true });
      existing.addEventListener(
        'error',
        () => reject(new Error('Failed to load Google Identity script')),
        { once: true }
      );
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error('Failed to load Google Identity script'));
    document.head.appendChild(script);
  });
}

export const AuthModal: React.FC = () => {
  const {
    authModalOpen,
    setAuthModalOpen,
    loginWithCredentials,
    registerAccount,
    loginWithGoogle,
    demoLogin,
    notify,
  } = useStore();

  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [googleSetupHint, setGoogleSetupHint] = useState<{
    redirectUri: string;
  } | null>(null);

  if (!authModalOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      if (mode === 'login') {
        await loginWithCredentials(email, password);
      } else {
        await registerAccount(name, email, password);
      }
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Authentication failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleDemo = async (role: 'admin' | 'customer') => {
    setBusy(true);
    try {
      await demoLogin(role);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Demo login failed', 'error');
    } finally {
      setBusy(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setBusy(true);
    setGoogleSetupHint(null);
    try {
      const config = await api.getGoogleOAuthConfig('storefront');
      const clientId = ENV.GOOGLE_CLIENT_ID || config.clientId;
      if (!clientId) {
        setGoogleSetupHint({ redirectUri: config.redirectUri });
        notify(
          'Chưa cấu hình GOOGLE_CLIENT_ID trong .env để mở cửa sổ Google.',
          'info'
        );
        setBusy(false);
        return;
      }

      try {
        await loadGoogleIdentityScript();
        const oauth2 = (window as GoogleIdentityWindow).google?.accounts?.oauth2;
        if (!oauth2) {
          window.location.href = config.authUrl;
          return;
        }

        const tokenClient = oauth2.initTokenClient({
          client_id: clientId,
          scope: 'openid email profile',
          callback: async (res) => {
            if (!res.access_token || res.error) {
              notify(res.error || 'Google sign-in was cancelled.', 'error');
              setBusy(false);
              return;
            }
            try {
              await loginWithGoogle({ accessToken: res.access_token });
            } catch (err) {
              notify(
                err instanceof Error ? err.message : 'Google OAuth2 failed',
                'error'
              );
            } finally {
              setBusy(false);
            }
          },
          error_callback: () => {
            setBusy(false);
          },
        });

        tokenClient.requestAccessToken({ prompt: 'select_account' });
      } catch {
        window.location.href = config.authUrl;
      }
    } catch (err) {
      notify(
        err instanceof Error ? err.message : 'Google OAuth2 unavailable',
        'error'
      );
      setBusy(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#000000]/45 backdrop-blur-[4px] p-4"
      onClick={() => setAuthModalOpen(false)}
    >
      <div
        className="max-h-[90vh] overflow-y-auto w-full max-w-md rounded-[24px] sm:rounded-[28px] bg-[#ffffff] p-5 sm:p-7 text-[#000000] shadow-[0_4px_24px_rgba(0,0,0,0.12)]"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-[#ebebeb] pb-4">
          <div className="flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
            <h2 className="text-[22px] leading-none tracking-[-0.05em] text-[#000000]">
              {mode === 'login' ? 'Sign in to shop' : 'Create account'}
            </h2>
          </div>
          <button
            type="button"
            onClick={() => setAuthModalOpen(false)}
            className="rounded-full bg-[#f2f4f5] px-3.5 py-1.5 text-[12px] tracking-[-0.017em] text-[#000000] hover:bg-[#ebebeb] cursor-pointer transition-colors"
          >
            Close
          </button>
        </div>

        {/* Google OAuth2 + Quick Evaluator Access */}
        <div className="mt-5 rounded-[20px] bg-[#f2f4f5] p-4 space-y-2.5">
          <button
            type="button"
            disabled={busy}
            onClick={handleGoogleOAuth}
            className="w-full flex items-center justify-center gap-2.5 rounded-full border border-[#ebebeb] bg-[#ffffff] px-4 py-2.5 text-[13px] tracking-[-0.014em] text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:border-[#5433eb] cursor-pointer transition-all disabled:opacity-50"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true">
              <path
                fill="#4285F4"
                d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"
              />
              <path
                fill="#34A853"
                d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z"
              />
              <path
                fill="#FBBC05"
                d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z"
              />
              <path
                fill="#EA4335"
                d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z"
              />
            </svg>
            <span>Tiếp tục với Google OAuth2</span>
          </button>

          {googleSetupHint && (
            <div className="rounded-[14px] border border-[#5433eb]/25 bg-[#ffffff] p-3 text-[11.5px] leading-relaxed text-[#787574] space-y-1">
              <div className="text-[#000000] font-medium">
                Hướng dẫn kích hoạt Google OAuth2 thật:
              </div>
              <div>
                Thêm <code className="text-[#5433eb]">GOOGLE_CLIENT_ID</code>,{' '}
                <code className="text-[#5433eb]">GOOGLE_CLIENT_SECRET</code> vào{' '}
                <code>backend/.env</code> (và{' '}
                <code className="text-[#5433eb]">VITE_GOOGLE_CLIENT_ID</code> cho frontend).
              </div>
              <div className="truncate">
                Callback URI: <code>{googleSetupHint.redirectUri}</code>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 pt-1 text-[11.5px] tracking-[-0.017em] text-[#787574]">
            <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
            <span>Instant demo access</span>
          </div>
          <div className="flex flex-col gap-2">
            <button
              type="button"
              disabled={busy}
              onClick={() => handleDemo('customer')}
              className="w-full rounded-full bg-[#000000] px-4 py-2.5 text-[12.5px] tracking-[-0.017em] text-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#333333] cursor-pointer transition-colors disabled:opacity-50"
            >
              1-Click Customer Demo Sign In
            </button>
            <a
              href={ENV.ADMIN_PORTAL_URL}
              target="_blank"
              rel="noreferrer"
              className="mt-1 flex items-center justify-center gap-1.5 rounded-full border border-[#ebebeb] bg-[#ffffff] px-3 py-2 text-[12px] tracking-[-0.017em] text-[#5433eb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#5433eb] hover:text-[#ffffff] transition-all"
            >
              <span>Quản trị viên? Mở cổng Admin riêng (Port 5174)</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="mt-5 space-y-3.5">
          {mode === 'register' && (
            <div>
              <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
                Full name
              </label>
              <input
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Tran Minh Khoa"
                className="w-full rounded-full border border-[#ebebeb] bg-[#ffffff] px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:border-[#5433eb] focus:outline-none"
              />
            </div>
          )}

          <div>
            <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
              Email address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="customer@moondrop.vn"
              className="w-full rounded-full border border-[#ebebeb] bg-[#ffffff] px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:border-[#5433eb] focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
              Password
            </label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Minimum 6 characters"
              className="w-full rounded-full border border-[#ebebeb] bg-[#ffffff] px-4 py-2.5 text-[14px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:border-[#5433eb] focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={busy}
            className="w-full rounded-full bg-[#5433eb] py-3 text-[14px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.34)] hover:bg-[#4524db] cursor-pointer transition-colors disabled:opacity-50"
          >
            {busy ? 'Authenticating...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-5 text-center text-[13px] tracking-[-0.014em] text-[#787574]">
          {mode === 'login' ? (
            <button
              type="button"
              onClick={() => setMode('register')}
              className="text-[#000000] hover:text-[#5433eb] underline underline-offset-4 cursor-pointer"
            >
              Need an account? Register here
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setMode('login')}
              className="text-[#000000] hover:text-[#5433eb] underline underline-offset-4 cursor-pointer"
            >
              Already registered? Sign in
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
