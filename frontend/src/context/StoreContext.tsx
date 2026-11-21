import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { api } from '../services/api';
import { jwtService } from '../services/jwtService';
import {
  BuildPartsMap,
  CartItem,
  ComponentCategory,
  PresetBuild,
  Product,
  User,
} from '../types';

interface ToastMessage {
  id: string;
  text: string;
  tone: 'success' | 'error' | 'info';
}

interface StoreContextValue {
  products: Product[];
  presets: PresetBuild[];
  loading: boolean;
  dbMode: 'mongodb' | 'disconnected' | 'offline';
  currentPath: string;
  currentSearch: string;
  navigate: (to: string) => void;
  user: User | null;
  token: string | null;
  loginWithCredentials: (email: string, password: string) => Promise<void>;
  registerAccount: (name: string, email: string, password: string) => Promise<void>;
  loginWithGoogle: (payload: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
  }) => Promise<void>;
  demoLogin: (role: 'admin' | 'customer') => Promise<void>;
  logout: () => void;
  cart: CartItem[];
  cartCount: number;
  cartSubtotal: number;
  addToCart: (product: Product, quantity?: number) => void;
  updateCartQty: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  deployRigToCart: (parts: BuildPartsMap) => void;
  buildParts: BuildPartsMap;
  assignBuildPart: (product: Product) => void;
  removeBuildSlot: (category: ComponentCategory) => void;
  loadPresetIntoBuilder: (preset: PresetBuild) => void;
  clearBuild: () => void;
  compareIds: string[];
  compareProducts: Product[];
  toggleCompare: (productId: string) => void;
  clearCompare: () => void;
  cartOpen: boolean;
  setCartOpen: (open: boolean) => void;
  authModalOpen: boolean;
  setAuthModalOpen: (open: boolean) => void;
  refreshProducts: () => Promise<void>;
  notify: (text: string, tone?: 'success' | 'error' | 'info') => void;
  toasts: ToastMessage[];
  dismissToast: (id: string) => void;
}

const StoreContext = createContext<StoreContextValue | undefined>(undefined);

const LS_CART = 'moondrop_sl_cart_v1';
const LS_BUILD = 'moondrop_sl_chain_v1';

export const StoreProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [presets, setPresets] = useState<PresetBuild[]>([]);
  const [loading, setLoading] = useState(true);
  const [dbMode, setDbMode] = useState<'mongodb' | 'disconnected' | 'offline'>(
    'disconnected'
  );
  const location = useLocation();
  const routerNavigate = useNavigate();
  const currentPath = location.pathname || '/';
  const currentSearch = location.search || '';

  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(() =>
    jwtService.getAccessToken()
  );
  const [cart, setCart] = useState<CartItem[]>(() => {
    try {
      const raw = localStorage.getItem(LS_CART);
      return raw ? (JSON.parse(raw) as CartItem[]) : [];
    } catch {
      return [];
    }
  });
  const [buildSlotIds, setBuildSlotIds] = useState<
    Partial<Record<ComponentCategory, string>>
  >(() => {
    try {
      const raw = localStorage.getItem(LS_BUILD);
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  });

  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const navigate = useCallback(
    (to: string) => {
      const normalized = to.startsWith('/') ? to : `/${to}`;
      routerNavigate(normalized);
      window.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    },
    [routerNavigate]
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const notify = useCallback(
    (text: string, tone: 'success' | 'error' | 'info' = 'info') => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev.slice(-3), { id, text, tone }]);
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, 3600);
    },
    []
  );

  const refreshProducts = useCallback(async () => {
    try {
      const [healthRes, prodRes, presetRes] = await Promise.all([
        api.getHealth(),
        api.getProducts(),
        api.getPresets(),
      ]);
      setDbMode(healthRes.dbMode);
      setProducts(prodRes.products);
      setPresets(presetRes.presets);
    } catch (err) {
      setDbMode('offline');
      notify(
        err instanceof Error ? err.message : 'Unable to reach acoustic API',
        'error'
      );
    } finally {
      setLoading(false);
    }
  }, [notify]);

  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const oauthToken = sp.get('oauth_token');
    const oauthRefresh = sp.get('oauth_refresh');
    if (oauthToken) {
      jwtService.setTokens(oauthToken, oauthRefresh);
      setToken(oauthToken);
      routerNavigate(location.pathname || '/', { replace: true });
      notify('SIGNED IN WITH GOOGLE', 'success');
    }
  }, [location.search, location.pathname, routerNavigate, notify]);

  useEffect(() => {
    refreshProducts();
  }, [refreshProducts]);

  useEffect(() => {
    if (!token) {
      setUser(null);
      return;
    }

    let cancelled = false;
    const syncSession = async () => {
      try {
        const refreshToken = jwtService.getRefreshToken();
        if (jwtService.isExpired(token) && refreshToken) {
          const refreshed = await api.refreshAuth(refreshToken);
          if (cancelled) return;
          const nextToken = refreshed.accessToken ?? refreshed.token;
          jwtService.setTokens(nextToken, refreshed.refreshToken);
          setToken(nextToken);
          setUser(refreshed.user);
          return;
        }

        const res = await api.getMe(token);
        if (cancelled) return;
        setUser(res.user);
        const latestToken = jwtService.getAccessToken();
        if (latestToken && latestToken !== token) {
          setToken(latestToken);
        }
      } catch {
        if (cancelled) return;
        jwtService.clearTokens();
        setToken(null);
        setUser(null);
      }
    };

    syncSession();
    return () => {
      cancelled = true;
    };
  }, [token]);

  useEffect(() => {
    localStorage.setItem(LS_CART, JSON.stringify(cart));
  }, [cart]);

  useEffect(() => {
    localStorage.setItem(LS_BUILD, JSON.stringify(buildSlotIds));
  }, [buildSlotIds]);

  const loginWithCredentials = async (email: string, password: string) => {
    const res = await api.login(email, password);
    const accessToken = res.accessToken ?? res.token;
    jwtService.setTokens(accessToken, res.refreshToken);
    setToken(accessToken);
    setUser(res.user);
    setAuthModalOpen(false);
    notify(`SIGNED IN // ${res.user.name.toUpperCase()}`, 'success');
  };

  const registerAccount = async (
    name: string,
    email: string,
    password: string
  ) => {
    const res = await api.register(name, email, password);
    const accessToken = res.accessToken ?? res.token;
    jwtService.setTokens(accessToken, res.refreshToken);
    setToken(accessToken);
    setUser(res.user);
    setAuthModalOpen(false);
    notify(`REGISTERED // ${res.user.name.toUpperCase()}`, 'success');
  };

  const demoLogin = async (role: 'admin' | 'customer') => {
    const res = await api.demoLogin(role);
    const accessToken = res.accessToken ?? res.token;
    jwtService.setTokens(accessToken, res.refreshToken);
    setToken(accessToken);
    setUser(res.user);
    setAuthModalOpen(false);
    notify(`SESSION ACTIVE // ${res.user.email.toUpperCase()}`, 'success');
    if (role === 'admin') {
      navigate('/admin');
    }
  };

  const loginWithGoogle = async (payload: {
    idToken?: string;
    accessToken?: string;
    code?: string;
    redirectUri?: string;
  }) => {
    const res = await api.loginWithGoogle(payload);
    const accessToken = res.accessToken ?? res.token;
    jwtService.setTokens(accessToken, res.refreshToken);
    setToken(accessToken);
    setUser(res.user);
    setAuthModalOpen(false);
    notify(`GOOGLE OAUTH2 // ${res.user.name.toUpperCase()}`, 'success');
  };

  const logout = () => {
    const accessToken = jwtService.getAccessToken();
    const refreshToken = jwtService.getRefreshToken();
    api.logoutSession(refreshToken, accessToken).catch(() => {
      // Ignore network errors while clearing client session
    });
    jwtService.clearTokens();
    setToken(null);
    setUser(null);
    if (currentPath === '/admin' || currentPath === '/orders') {
      navigate('/');
    }
    notify('SESSION TERMINATED', 'info');
  };

  const addToCart = (product: Product, quantity = 1) => {
    if (product.stock <= 0) {
      notify(`${product.name} IS OUT OF STOCK`, 'error');
      return;
    }
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        const nextQty = Math.min(product.stock, existing.quantity + quantity);
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: nextQty } : i
        );
      }
      return [...prev, { product, quantity: Math.min(product.stock, quantity) }];
    });
    notify(`ADDED // ${product.sku}`, 'success');
  };

  const updateCartQty = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
      return;
    }
    setCart((prev) =>
      prev.map((i) =>
        i.product.id === productId
          ? { ...i, quantity: Math.min(i.product.stock, quantity) }
          : i
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((i) => i.product.id !== productId));
  };

  const clearCart = () => setCart([]);

  const deployRigToCart = (parts: BuildPartsMap) => {
    const entries = Object.values(parts).filter((p): p is Product => Boolean(p));
    if (entries.length === 0) {
      notify('SLOTS EMPTY // SELECT HARDWARE FIRST', 'info');
      return;
    }
    setCart((prev) => {
      const next = [...prev];
      for (const prod of entries) {
        if (prod.stock <= 0) continue;
        const idx = next.findIndex((i) => i.product.id === prod.id);
        if (idx >= 0) {
          next[idx] = {
            ...next[idx],
            quantity: Math.min(prod.stock, next[idx].quantity + 1),
          };
        } else {
          next.push({ product: prod, quantity: 1 });
        }
      }
      return next;
    });
    setCartOpen(true);
    notify(`DEPLOYED ${entries.length} COMPONENTS TO CART`, 'success');
  };

  const buildParts: BuildPartsMap = {};
  for (const [cat, id] of Object.entries(buildSlotIds)) {
    if (!id) continue;
    const found = products.find((p) => p.id === id);
    if (found) {
      buildParts[cat as ComponentCategory] = found;
    }
  }

  const assignBuildPart = (product: Product) => {
    setBuildSlotIds((prev) => ({
      ...prev,
      [product.category]: product.id,
    }));
    notify(`SLOTTED // ${product.sku} IN ${product.category}`, 'success');
  };

  const removeBuildSlot = (category: ComponentCategory) => {
    setBuildSlotIds((prev) => {
      const next = { ...prev };
      delete next[category];
      return next;
    });
  };

  const loadPresetIntoBuilder = (preset: PresetBuild) => {
    const next: Partial<Record<ComponentCategory, string>> = {};
    for (const [cat, part] of Object.entries(preset.parts)) {
      if (part) next[cat as ComponentCategory] = part.id;
    }
    setBuildSlotIds(next);
    navigate('/chain-builder');
    notify(`CHAIN LOADED // ${preset.name}`, 'success');
  };

  const clearBuild = () => {
    setBuildSlotIds({});
    notify('AUDIO CHAIN CLEARED', 'info');
  };

  const toggleCompare = (productId: string) => {
    setCompareIds((prev) => {
      if (prev.includes(productId)) {
        return prev.filter((id) => id !== productId);
      }
      if (prev.length >= 3) {
        notify('COMPARE LAB ACCEPTS MAX 3 UNITS', 'info');
        return prev;
      }
      return [...prev, productId];
    });
  };

  const clearCompare = () => setCompareIds([]);

  const compareProducts = compareIds
    .map((id) => products.find((p) => p.id === id))
    .filter((p): p is Product => Boolean(p));

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce(
    (sum, item) => sum + item.product.price * item.quantity,
    0
  );

  return (
    <StoreContext.Provider
      value={{
        products,
        presets,
        loading,
        dbMode,
        currentPath,
        currentSearch,
        navigate,
        user,
        token,
        loginWithCredentials,
        registerAccount,
        loginWithGoogle,
        demoLogin,
        logout,
        cart,
        cartCount,
        cartSubtotal,
        addToCart,
        updateCartQty,
        removeFromCart,
        clearCart,
        deployRigToCart,
        buildParts,
        assignBuildPart,
        removeBuildSlot,
        loadPresetIntoBuilder,
        clearBuild,
        compareIds,
        compareProducts,
        toggleCompare,
        clearCompare,
        cartOpen,
        setCartOpen,
        authModalOpen,
        setAuthModalOpen,
        refreshProducts,
        notify,
        toasts,
        dismissToast,
      }}
    >
      {children}
    </StoreContext.Provider>
  );
};

export function useStore(): StoreContextValue {
  const ctx = useContext(StoreContext);
  if (!ctx) {
    throw new Error('useStore must be used inside StoreProvider');
  }
  return ctx;
}
