import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { adminApi } from '../services/api';
import { adminJwtService } from '../services/jwtService';
import { User } from '../types';

interface Toast {
  id: string;
  text: string;
  type: 'success' | 'error' | 'info';
}

interface AdminAuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, pass: string) => Promise<void>;
  demoAdminLogin: () => Promise<void>;
  loginWithGoogle: (payload: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
  }) => Promise<void>;
  logout: () => void;
  toasts: Toast[];
  notify: (text: string, type?: 'success' | 'error' | 'info') => void;
  dismissToast: (id: string) => void;
}

const AdminAuthContext = createContext<AdminAuthContextType | undefined>(undefined);

export const AdminAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(() => {
    return adminJwtService.getStoredUser();
  });
  const [token, setToken] = useState<string | null>(() => {
    return adminJwtService.getAccessToken();
  });
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toasts, setToasts] = useState<Toast[]>([]);

  const notify = useCallback((text: string, type: 'success' | 'error' | 'info' = 'info') => {
    const id = `${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, text, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4000);
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Ensure document never retains stale dark theme class & handle OAuth2 redirect tokens
  useEffect(() => {
    document.documentElement.classList.remove('dark');

    const sp = new URLSearchParams(window.location.search);
    const oauthToken = sp.get('oauth_token');
    const oauthRefresh = sp.get('oauth_refresh');
    if (oauthToken) {
      localStorage.setItem('tailadmin_token', oauthToken);
      if (oauthRefresh) {
        localStorage.setItem('tailadmin_refresh_token', oauthRefresh);
      }
      setToken(oauthToken);
      window.history.replaceState({}, '', window.location.pathname || '/');
    }
  }, []);

  // Verify auth on mount & rotate token if expired
  useEffect(() => {
    const verifyToken = async () => {
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const refreshToken = adminJwtService.getRefreshToken();
        if (adminJwtService.isExpired(token) && refreshToken) {
          const refreshed = await adminApi.refresh(refreshToken);
          if (refreshed.user.role !== 'admin') {
            throw new Error('Access denied: User does not have Administrator role.');
          }
          const nextToken = refreshed.accessToken ?? refreshed.token;
          adminJwtService.setSession(nextToken, refreshed.user, refreshed.refreshToken);
          setToken(nextToken);
          setUser(refreshed.user);
          return;
        }

        const { user: verifiedUser } = await adminApi.getMe();
        if (verifiedUser.role !== 'admin') {
          throw new Error('Access denied: User does not have Administrator role.');
        }
        setUser(verifiedUser);
        const latestToken = adminJwtService.getAccessToken() || token;
        if (latestToken !== token) {
          setToken(latestToken);
        }
        adminJwtService.setSession(latestToken, verifiedUser);
      } catch (err) {
        console.warn('Admin token validation failed:', err);
        setUser(null);
        setToken(null);
        adminJwtService.clearSession();
      } finally {
        setIsLoading(false);
      }
    };
    verifyToken();
  }, [token]);

  const login = async (email: string, pass: string) => {
    const data = await adminApi.login(email, pass);
    if (data.user.role !== 'admin') {
      throw new Error('Tài khoản này không có quyền Quản trị viên (Admin).');
    }
    const nextToken = data.accessToken ?? data.token;
    adminJwtService.setSession(nextToken, data.user, data.refreshToken);
    setToken(nextToken);
    setUser(data.user);
    notify('SESSION ACTIVE // ADMIN STUDIO', 'success');
  };

  const demoAdminLogin = async () => {
    const data = await adminApi.demoAdminLogin();
    if (data.user.role !== 'admin') {
      throw new Error('Demo admin account unavailable.');
    }
    const nextToken = data.accessToken ?? data.token;
    adminJwtService.setSession(nextToken, data.user, data.refreshToken);
    setToken(nextToken);
    setUser(data.user);
    notify(`SESSION ACTIVE // ${data.user.email.toUpperCase()}`, 'success');
  };

  const loginWithGoogle = async (payload: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
  }) => {
    const data = await adminApi.loginWithGoogle(payload);
    if (data.user.role !== 'admin') {
      throw new Error('Tài khoản Google này không có quyền Quản trị viên (Admin).');
    }
    const nextToken = data.accessToken ?? data.token;
    adminJwtService.setSession(nextToken, data.user, data.refreshToken);
    setToken(nextToken);
    setUser(data.user);
    notify(`GOOGLE OAUTH2 // ${data.user.email.toUpperCase()}`, 'success');
  };

  const logout = () => {
    adminApi.logoutSession().catch(() => {
      // Ignore network errors while clearing client session
    });
    setUser(null);
    setToken(null);
    adminJwtService.clearSession();
    notify('SESSION TERMINATED', 'info');
  };

  return (
    <AdminAuthContext.Provider
      value={{
        user,
        token,
        isLoading,
        login,
        demoAdminLogin,
        loginWithGoogle,
        logout,
        toasts,
        notify,
        dismissToast,
      }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
};

export const useAdminAuth = () => {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) throw new Error('useAdminAuth must be used within an AdminAuthProvider');
  return ctx;
};
