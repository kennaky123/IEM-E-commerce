import React, { useState } from 'react';
import { ArrowRight, BarChart3, ExternalLink, Lock, Mail, Sparkles } from 'lucide-react';
import { ENV } from '../../config/env';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { adminApi } from '../../services/api';

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

export const AdminLogin: React.FC = () => {
  const { login, demoAdminLogin, loginWithGoogle, notify } = useAdminAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleSetupHint, setGoogleSetupHint] = useState<{
    redirectUri: string;
  } | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      notify('Vui lòng nhập đầy đủ email và mật khẩu quản trị', 'error');
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Đăng nhập thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoClick = async () => {
    setLoading(true);
    try {
      await demoAdminLogin();
    } catch (err) {
      notify(err instanceof Error ? err.message : 'Demo Admin thất bại', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleOAuth = async () => {
    setLoading(true);
    setGoogleSetupHint(null);
    try {
      const config = await adminApi.getGoogleConfig('admin');
      const clientId = ENV.GOOGLE_CLIENT_ID || config.clientId;
      if (!clientId) {
        setGoogleSetupHint({ redirectUri: config.redirectUri });
        notify(
          'Chưa cấu hình GOOGLE_CLIENT_ID trong .env để mở cửa sổ Google.',
          'info'
        );
        setLoading(false);
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
              setLoading(false);
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
              setLoading(false);
            }
          },
          error_callback: () => {
            setLoading(false);
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 lg:grid-cols-2 bg-[#f2f4f5] text-[#000000]">
      {/* Left Column: TailAdmin Sign-In Form */}
      <div className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-16">
        <div className="mx-auto w-full max-w-md rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-8 md:p-10 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)]">
          <div className="flex items-center justify-between">
            <a
              href={ENV.STOREFRONT_URL}
              className="inline-flex items-center gap-1.5 text-[12.5px] text-[#787574] hover:text-[#000000]"
            >
              <span>← Back to shop</span>
            </a>
            <span className="rounded-full bg-[#f2f4f5] px-3 py-1 text-[11px] text-[#5433eb]">
              Port 5174
            </span>
          </div>

          <div className="mt-6">
            <h1 className="text-[28px] leading-tight tracking-[-0.05em] text-[#000000]">
              Sign In
            </h1>
            <p className="mt-1.5 text-[13.5px] tracking-[-0.014em] text-[#787574]">
              Enter your administrator email and password to access TailAdmin!
            </p>
          </div>

          {/* 1-Click Demo Admin + Google OAuth2 */}
          <div className="mt-6 rounded-[20px] bg-[#f2f4f5] p-4 space-y-2.5">
            <div className="flex items-center gap-2 text-[12px] text-[#787574]">
              <span className="h-2 w-2 rounded-full bg-[#5433eb]" />
              <span>Instant evaluator access</span>
            </div>
            <button
              type="button"
              onClick={handleDemoClick}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full bg-[#5433eb] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.28)] hover:bg-[#4524db] cursor-pointer disabled:opacity-50 transition-all"
            >
              <Sparkles size={15} />
              <span>{loading ? 'Authenticating...' : '1-Click Demo Admin Sign In'}</span>
            </button>
            <button
              type="button"
              onClick={handleGoogleOAuth}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-full border border-[#ebebeb] bg-[#ffffff] px-5 py-2.5 text-[13px] tracking-[-0.014em] text-[#000000] hover:border-[#5433eb] cursor-pointer disabled:opacity-50 transition-all"
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
              <span>Sign in with Google OAuth2</span>
            </button>

            {googleSetupHint && (
              <div className="rounded-[14px] border border-[#5433eb]/25 bg-[#ffffff] p-3 text-[11.5px] leading-relaxed text-[#787574] space-y-1">
                <div className="text-[#000000] font-medium">
                  Cấu hình Google OAuth2 trong <code>backend/.env</code>:
                </div>
                <div>
                  Thêm <code className="text-[#5433eb]">GOOGLE_CLIENT_ID</code> và{' '}
                  <code className="text-[#5433eb]">GOOGLE_CLIENT_SECRET</code> (redirect:{' '}
                  <code>{googleSetupHint.redirectUri}</code>).
                </div>
              </div>
            )}
          </div>

          <div className="relative my-6 text-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[#ebebeb]" />
            </div>
            <span className="relative bg-[#ffffff] px-3 text-[11.5px] text-[#787574]">
              Or sign in with email
            </span>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
                Email *
              </label>
              <div className="relative">
                <Mail size={15} className="pointer-events-none absolute left-4 top-3.5 text-[#787574]" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  placeholder="admin@moondrop.vn"
                  className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5] py-2.5 pl-10 pr-4 text-[14px] text-[#000000] placeholder:text-[#787574] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <div>
              <label className="block text-[12px] tracking-[-0.017em] text-[#787574] mb-1.5 px-1">
                Password *
              </label>
              <div className="relative">
                <Lock size={15} className="pointer-events-none absolute left-4 top-3.5 text-[#787574]" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder="Enter your password"
                  className="w-full rounded-full border border-[#ebebeb] bg-[#f2f4f5] py-2.5 pl-10 pr-4 text-[14px] text-[#000000] placeholder:text-[#787574] focus:bg-[#ffffff] focus:border-[#5433eb] focus:outline-none transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-full bg-[#000000] px-5 py-3 text-[14px] tracking-[-0.014em] text-[#ffffff] hover:bg-[#5433eb] cursor-pointer disabled:opacity-50 transition-all"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight size={15} />
            </button>
          </form>
        </div>
      </div>

      {/* Right Column: TailAdmin Brand Panel styled in Slate-Ink (#332f2d) & Shop Violet (#5433eb) */}
      <div className="hidden lg:flex flex-col items-center justify-center bg-[#332f2d] p-12 text-[#ffffff] relative overflow-hidden">
        <div className="absolute -top-28 -right-28 h-80 w-80 rounded-full bg-[#5433eb]/25 blur-3xl" />
        <div className="absolute -bottom-28 -left-28 h-80 w-80 rounded-full bg-[#c0b5f3]/15 blur-3xl" />

        <div className="relative z-10 max-w-md text-center space-y-5">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-[22px] bg-[#5433eb] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.45)]">
            <BarChart3 size={30} strokeWidth={1.9} />
          </div>

          <div className="flex items-baseline justify-center gap-2">
            <span className="text-[32px] tracking-[-0.05em] text-[#ffffff]">TailAdmin</span>
            <span className="rounded-full bg-[#ffffff]/10 px-3 py-1 text-[12px] text-[#c0b5f3]">
              shop.5174
            </span>
          </div>

          <p className="text-[14px] leading-relaxed text-[#cccccc]">
            Cổng Quản Trị E-Commerce độc lập hoàn toàn với trang Shop khách hàng. Quản lý tồn kho, xử lý đơn hàng và thư viện media trực tiếp trên MongoDB Atlas.
          </p>

          <div className="pt-2">
            <a
              href={ENV.STOREFRONT_URL}
              className="inline-flex items-center gap-2 rounded-full bg-[#ffffff]/10 px-5 py-2.5 text-[13px] text-[#ffffff] hover:bg-[#5433eb] transition-colors"
            >
              <span>Open Client Storefront</span>
              <ExternalLink size={14} />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};
