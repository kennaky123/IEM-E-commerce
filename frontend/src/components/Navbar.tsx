import React, { useState } from 'react';
import { useStore } from '../context/StoreContext';
import { CATEGORY_META, CATEGORY_ORDER } from '../utils/format';

export const Navbar: React.FC = () => {
  const {
    currentPath,
    navigate,
    dbMode,
    user,
    logout,
    cartCount,
    setCartOpen,
    compareIds,
    setAuthModalOpen,
    buildParts,
  } = useStore();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const chainCount = Object.keys(buildParts).length;

  const handleMobileNav = (path: string) => {
    setMobileMenuOpen(false);
    navigate(path);
  };

  const railLinks = [
    {
      path: '/',
      label: 'Categories & Home',
      active: currentPath === '/' || currentPath === '',
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
          <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
          <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
        </svg>
      ),
    },
    {
      path: '/products',
      label: 'All Products Catalog',
      active: currentPath.startsWith('/products') || currentPath.startsWith('/product/'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <circle cx="11" cy="11" r="7" />
          <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      path: '/chain-builder',
      label: 'Signal Chain Lab',
      active: currentPath.startsWith('/chain-builder'),
      badge: chainCount > 0 ? chainCount : undefined,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 7h16M4 17h16" strokeLinecap="round" />
          <circle cx="9" cy="7" r="2.2" fill="#ffffff" />
          <circle cx="15" cy="17" r="2.2" fill="#ffffff" />
        </svg>
      ),
    },
    {
      path: '/technology',
      label: 'VDSF Acoustic Tech',
      active: currentPath.startsWith('/technology'),
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M3 12c2.5-5 4.5-5 7 0s4.5 5 7 0 2.5-3 4 0" strokeLinecap="round" />
        </svg>
      ),
    },
    {
      path: '/compare',
      label: 'FR Compare Lab',
      active: currentPath.startsWith('/compare'),
      badge: compareIds.length > 0 ? compareIds.length : undefined,
      icon: (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
          <path d="M4 19V5M4 19h16M7 15l4-5 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ),
    },
  ];

  const topPills = [
    { path: '/', label: 'Categories' },
    { path: '/products', label: 'Catalog' },
    {
      path: '/chain-builder',
      label: chainCount > 0 ? `Signal Chain (${chainCount})` : 'Signal Chain',
    },
    { path: '/technology', label: 'Acoustic Tech' },
    {
      path: '/compare',
      label: compareIds.length > 0 ? `Compare (${compareIds.length})` : 'Compare',
    },
  ];

  return (
    <>
      {/* 1. App Download Banner (shop.md: 48px #000000 band flush at top) */}
      <div className="w-full h-11 sm:h-12 bg-[#000000] text-[#ffffff] px-3 flex items-center justify-center rounded-[1px] z-50 relative">
        <button
          type="button"
          onClick={() => navigate('/products')}
          className="flex items-center gap-2.5 sm:gap-3 cursor-pointer group"
        >
          <span className="h-6 w-6 rounded-[7px] bg-[#5433eb] text-[#ffffff] flex items-center justify-center text-[13px] tracking-[-0.04em]">
            s
          </span>
          <span
            className="flex flex-col text-left leading-none"
            style={{ fontFamily: 'var(--font-shopify-sans)' }}
          >
            <span className="text-[13px] sm:text-[14px] tracking-[-0.023em] group-hover:underline underline-offset-2">
              Download Shop app
            </span>
            <span className="text-[10px] tracking-[-0.023em] text-[#cccccc] mt-0.5">
              Available on iOS &amp; Android
            </span>
          </span>
          <span className="text-[14px] text-[#ffffff] ml-1">→</span>
        </button>
      </div>

      {/* 2. Persistent Left Sidebar Nav Rail (Desktop/Tablet) */}
      <aside className="hidden md:flex fixed left-0 top-12 bottom-0 w-16 bg-[#ffffff] z-40 flex-col items-center justify-between py-4">
        <button
          type="button"
          onClick={() => navigate('/')}
          className="h-12 w-12 rounded-[20px] flex items-center justify-center text-[#5433eb] text-[24px] tracking-[-0.06em] hover:bg-[#f2f4f5] cursor-pointer"
          title="Shop Home"
        >
          s.
        </button>

        <nav className="flex flex-col items-center gap-1.5" aria-label="Sidebar Navigation">
          {railLinks.map((item) => (
            <button
              key={item.path}
              type="button"
              onClick={() => navigate(item.path)}
              title={item.label}
              aria-label={item.label}
              className={`relative h-12 w-12 rounded-[20px] flex items-center justify-center cursor-pointer transition-colors ${
                item.active
                  ? 'bg-[#f2f4f5] text-[#000000]'
                  : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
              }`}
            >
              {item.icon}
              {item.badge !== undefined && (
                <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#5433eb] text-[#ffffff] text-[9px] flex items-center justify-center">
                  {item.badge}
                </span>
              )}
            </button>
          ))}
          {user && (
            <button
              type="button"
              onClick={() => navigate('/orders')}
              title="Orders"
              aria-label="Orders"
              className={`h-12 w-12 rounded-[20px] flex items-center justify-center cursor-pointer transition-colors ${
                currentPath === '/orders'
                  ? 'bg-[#f2f4f5] text-[#000000]'
                  : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
              }`}
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <rect x="5" y="4" width="14" height="16" rx="3" />
                <path d="M9 9h6M9 13h6M9 17h3" strokeLinecap="round" />
              </svg>
            </button>
          )}
        </nav>

        <div className="flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => setCartOpen(true)}
            title={`Shopping Bag (${cartCount})`}
            aria-label="Open Cart"
            className="relative h-12 w-12 rounded-[20px] flex items-center justify-center text-[#000000] hover:bg-[#f2f4f5] cursor-pointer"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
              <path d="M6 7h12l-1 13H7L6 7z" strokeLinejoin="round" />
              <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[16px] h-4 px-1 rounded-full bg-[#5433eb] text-[#ffffff] text-[9px] flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => (user ? logout() : setAuthModalOpen(true))}
            title={user ? `Signed in as ${user.name} (Click to sign out)` : 'Sign In'}
            className="h-8 w-8 rounded-full border border-[#ebebeb] bg-[#f2f4f5] text-[#000000] flex items-center justify-center text-[12px] cursor-pointer hover:border-[#5433eb]"
          >
            {user ? (
              user.name.slice(0, 1).toUpperCase()
            ) : (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7">
                <circle cx="12" cy="8" r="4" />
                <path d="M5 20a7 7 0 0 1 14 0" strokeLinecap="round" />
              </svg>
            )}
          </button>
        </div>
      </aside>

      {/* 3. Top Pill Bar (Responsive Header on #f2f4f5) */}
      <header className="sticky top-0 z-30 w-full bg-[#f2f4f5]/90 backdrop-blur-md md:pl-16">
        <div className="mx-auto max-w-[1200px] px-4 py-2.5 sm:py-3">
          <div className="flex items-center justify-between gap-2 sm:gap-3">
            {/* Left: Violet Wordmark + Store Pill */}
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={() => handleMobileNav('/')}
                className="flex items-baseline cursor-pointer shrink-0"
              >
                <span className="text-[22px] sm:text-[24px] leading-none tracking-[-0.06em] text-[#5433eb]">
                  shop
                </span>
                <span className="ml-0.5 inline-block h-1.5 w-1.5 rounded-full bg-[#5433eb]" />
              </button>
              <span
                className="hidden sm:inline-flex items-center gap-1.5 rounded-full bg-[#ffffff] border border-[#ebebeb] px-3 py-1 text-[12px] tracking-[-0.017em] text-[#787574] shadow-[0_2px_8px_rgba(0,0,0,0.06)]"
                title={dbMode === 'mongodb' ? 'MongoDB Atlas Active' : 'Disconnected'}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    dbMode === 'mongodb' ? 'bg-[#5433eb]' : 'bg-[#787574]'
                  }`}
                />
                MOONDROP AUDIO
              </span>
            </div>

            {/* Center Pills Navigation (Tablet & Desktop) */}
            <nav className="hidden md:flex flex-wrap items-center gap-1.5">
              {topPills.map((item) => {
                const active =
                  item.path === '/'
                    ? currentPath === '/'
                    : currentPath.startsWith(item.path);
                return (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => navigate(item.path)}
                    className={`rounded-full px-3.5 py-1.5 text-[13px] tracking-[-0.02em] cursor-pointer transition-all ${
                      active
                        ? 'bg-[#000000] text-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                        : 'bg-[#ffffff] text-[#000000] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.06)] hover:bg-[#f2f4f5]'
                    }`}
                  >
                    {item.label}
                  </button>
                );
              })}
              {user && (
                <button
                  type="button"
                  onClick={() => navigate('/orders')}
                  className={`rounded-full px-3.5 py-1.5 text-[13px] tracking-[-0.02em] cursor-pointer transition-all ${
                    currentPath === '/orders'
                      ? 'bg-[#000000] text-[#ffffff]'
                      : 'bg-[#ffffff] text-[#000000] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.06)]'
                  }`}
                >
                  Orders
                </button>
              )}
            </nav>

            {/* Right Account, Bag & Mobile Hamburger */}
            <div className="flex items-center gap-1.5 sm:gap-2">
              {user ? (
                <button
                  type="button"
                  onClick={logout}
                  className="shop-pill px-3 sm:px-3.5 py-1.5 text-[12px] sm:text-[13px] tracking-[-0.02em] cursor-pointer hover:bg-[#000000] hover:text-[#ffffff]"
                >
                  <span className="sm:hidden">{user.name.split(' ')[0]}</span>
                  <span className="hidden sm:inline">{user.name.split(' ')[0]} · Sign out</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setAuthModalOpen(true)}
                  className="shop-pill px-3 sm:px-4 py-1.5 text-[12px] sm:text-[13px] tracking-[-0.02em] cursor-pointer hover:bg-[#000000] hover:text-[#ffffff]"
                >
                  Sign in
                </button>
              )}

              <button
                type="button"
                onClick={() => setCartOpen(true)}
                className="sl-btn-dark py-1.5 px-3 sm:py-2 sm:px-4 text-[12px] sm:text-[13px]"
              >
                Bag ({cartCount})
              </button>

              <button
                type="button"
                onClick={() => setMobileMenuOpen((prev) => !prev)}
                aria-label="Toggle mobile menu"
                aria-expanded={mobileMenuOpen}
                className="md:hidden h-9 w-9 shrink-0 rounded-full bg-[#ffffff] border border-[#ebebeb] flex items-center justify-center text-[#000000] shadow-[0_2px_8px_rgba(0,0,0,0.06)] cursor-pointer"
              >
                {mobileMenuOpen ? (
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M18 6L6 18M6 6l12 12" strokeLinecap="round" />
                  </svg>
                ) : (
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7h16M4 12h16M4 17h16" strokeLinecap="round" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          {/* Mobile Horizontal Swipeable Pill Navigation */}
          <nav
            aria-label="Mobile quick links"
            className="flex md:hidden items-center gap-1.5 overflow-x-auto no-scrollbar pt-2.5 pb-0.5 -mx-4 px-4"
          >
            {topPills.map((item) => {
              const active =
                item.path === '/'
                  ? currentPath === '/'
                  : currentPath.startsWith(item.path);
              return (
                <button
                  key={item.path}
                  type="button"
                  onClick={() => handleMobileNav(item.path)}
                  className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] tracking-[-0.02em] cursor-pointer transition-all ${
                    active
                      ? 'bg-[#000000] text-[#ffffff] shadow-[0_2px_8px_rgba(0,0,0,0.08)]'
                      : 'bg-[#ffffff] text-[#000000] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
                  }`}
                >
                  {item.label}
                </button>
              );
            })}
            {user && (
              <button
                type="button"
                onClick={() => handleMobileNav('/orders')}
                className={`shrink-0 whitespace-nowrap rounded-full px-3.5 py-1.5 text-[12.5px] tracking-[-0.02em] cursor-pointer transition-all ${
                  currentPath === '/orders'
                    ? 'bg-[#000000] text-[#ffffff]'
                    : 'bg-[#ffffff] text-[#000000] border border-[#ebebeb] shadow-[0_2px_8px_rgba(0,0,0,0.05)]'
                }`}
              >
                Orders
              </button>
            )}
          </nav>

          {/* Mobile Expandable Slide-Down Menu Drawer */}
          {mobileMenuOpen && (
            <div className="md:hidden mt-2.5 rounded-[24px] bg-[#ffffff] border border-[#ebebeb] p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)] space-y-4">
              <div className="grid grid-cols-1 gap-1.5">
                {railLinks.map((item) => (
                  <button
                    key={item.path}
                    type="button"
                    onClick={() => handleMobileNav(item.path)}
                    className={`flex items-center justify-between rounded-[16px] px-3.5 py-2.5 text-[13.5px] tracking-[-0.014em] cursor-pointer transition-colors ${
                      item.active
                        ? 'bg-[#000000] text-[#ffffff]'
                        : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <span className="scale-75">{item.icon}</span>
                      <span>{item.label}</span>
                    </span>
                    {item.badge !== undefined && (
                      <span className="rounded-full bg-[#5433eb] px-2 py-0.5 text-[10px] text-[#ffffff]">
                        {item.badge}
                      </span>
                    )}
                  </button>
                ))}
                {user && (
                  <button
                    type="button"
                    onClick={() => handleMobileNav('/orders')}
                    className={`flex items-center justify-between rounded-[16px] px-3.5 py-2.5 text-[13.5px] tracking-[-0.014em] cursor-pointer transition-colors ${
                      currentPath === '/orders'
                        ? 'bg-[#000000] text-[#ffffff]'
                        : 'bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb]'
                    }`}
                  >
                    <span>Order History</span>
                  </button>
                )}
              </div>

              {/* Quick Category Filter Chips */}
              <div className="border-t border-[#ebebeb] pt-3 space-y-2">
                <div className="text-[11px] tracking-[-0.017em] text-[#787574] px-1">
                  Quick Categories
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {CATEGORY_ORDER.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => handleMobileNav(`/products?category=${cat}`)}
                      className="rounded-full bg-[#f2f4f5] px-3 py-1 text-[12px] text-[#000000] hover:bg-[#5433eb] hover:text-[#ffffff] cursor-pointer transition-colors"
                    >
                      {CATEGORY_META[cat].shortLabel}
                    </button>
                  ))}
                </div>
              </div>

              {/* Account Strip */}
              <div className="border-t border-[#ebebeb] pt-3 flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 text-[12px] text-[#787574] truncate">
                  <span
                    className={`h-2 w-2 rounded-full shrink-0 ${
                      dbMode === 'mongodb' ? 'bg-[#5433eb]' : 'bg-[#787574]'
                    }`}
                  />
                  <span className="truncate">
                    {user ? `${user.name} (${user.email})` : 'Guest shopper'}
                  </span>
                </span>
                {user ? (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      logout();
                    }}
                    className="rounded-full bg-[#f2f4f5] px-3.5 py-1.5 text-[12px] text-[#000000] cursor-pointer shrink-0"
                  >
                    Sign out
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      setMobileMenuOpen(false);
                      setAuthModalOpen(true);
                    }}
                    className="rounded-full bg-[#5433eb] px-4 py-1.5 text-[12px] text-[#ffffff] cursor-pointer shrink-0"
                  >
                    Sign in
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* 4. Fixed Thumb-Friendly Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile bottom navigation"
        className="md:hidden fixed bottom-0 inset-x-0 z-40 bg-[#ffffff]/95 backdrop-blur-md border-t border-[#ebebeb] shadow-[0_-4px_20px_rgba(0,0,0,0.06)] safe-area-bottom"
      >
        <div className="grid grid-cols-5 h-[58px] items-center">
          <button
            type="button"
            onClick={() => handleMobileNav('/')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10.5px] cursor-pointer ${
              currentPath === '/' || currentPath === ''
                ? 'text-[#5433eb]'
                : 'text-[#787574]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
              <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
              <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
            </svg>
            <span>Home</span>
          </button>

          <button
            type="button"
            onClick={() => handleMobileNav('/products')}
            className={`flex flex-col items-center justify-center gap-0.5 text-[10.5px] cursor-pointer ${
              currentPath.startsWith('/products') || currentPath.startsWith('/product/')
                ? 'text-[#5433eb]'
                : 'text-[#787574]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <circle cx="11" cy="11" r="7" />
              <path d="M20 20l-3.5-3.5" strokeLinecap="round" />
            </svg>
            <span>Catalog</span>
          </button>

          <button
            type="button"
            onClick={() => handleMobileNav('/chain-builder')}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] cursor-pointer ${
              currentPath.startsWith('/chain-builder')
                ? 'text-[#5433eb]'
                : 'text-[#787574]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 7h16M4 17h16" strokeLinecap="round" />
              <circle cx="9" cy="7" r="2.2" fill="currentColor" />
              <circle cx="15" cy="17" r="2.2" fill="currentColor" />
            </svg>
            <span>Chain</span>
            {chainCount > 0 && (
              <span className="absolute top-1 right-4 min-w-[15px] h-[15px] px-1 rounded-full bg-[#5433eb] text-[#ffffff] text-[9px] flex items-center justify-center">
                {chainCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleMobileNav('/compare')}
            className={`relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] cursor-pointer ${
              currentPath.startsWith('/compare')
                ? 'text-[#5433eb]'
                : 'text-[#787574]'
            }`}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M4 19V5M4 19h16M7 15l4-5 4 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            <span>Compare</span>
            {compareIds.length > 0 && (
              <span className="absolute top-1 right-3.5 min-w-[15px] h-[15px] px-1 rounded-full bg-[#5433eb] text-[#ffffff] text-[9px] flex items-center justify-center">
                {compareIds.length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setMobileMenuOpen(false);
              setCartOpen(true);
            }}
            className="relative flex flex-col items-center justify-center gap-0.5 text-[10.5px] text-[#000000] cursor-pointer"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
              <path d="M6 7h12l-1 13H7L6 7z" strokeLinejoin="round" />
              <path d="M9 7a3 3 0 0 1 6 0" strokeLinecap="round" />
            </svg>
            <span>Bag</span>
            {cartCount > 0 && (
              <span className="absolute top-1 right-4 min-w-[15px] h-[15px] px-1 rounded-full bg-[#5433eb] text-[#ffffff] text-[9px] flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>
    </>
  );
};
