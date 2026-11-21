import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  CheckCircle2,
  ChevronDown,
  Database,
  ExternalLink,
  LogOut,
  Menu,
  Plus,
  Search,
  Users,
} from 'lucide-react';
import { ENV } from '../../config/env';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { AdminTab } from './Sidebar';

interface HeaderProps {
  onToggleSidebar: () => void;
  onNavigateTab: (tab: AdminTab) => void;
  lowStockCount: number;
  pendingOrdersCount: number;
  globalSearch: string;
  onGlobalSearchChange: (q: string) => void;
  onQuickCreateProduct: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onToggleSidebar,
  onNavigateTab,
  lowStockCount,
  pendingOrdersCount,
  globalSearch,
  onGlobalSearchChange,
  onQuickCreateProduct,
}) => {
  const { user, logout } = useAdminAuth();
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const totalNotifications = (lowStockCount > 0 ? 1 : 0) + (pendingOrdersCount > 0 ? 1 : 0);

  // Support Cmd/Ctrl + K shortcut like demo.tailadmin.com
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      onNavigateTab('products');
    }
  };

  return (
    <header className="sticky top-0 z-30 flex w-full border-b border-[#ebebeb] bg-[#ffffff]/95 backdrop-blur-md">
      <div className="flex flex-grow items-center justify-between gap-4 px-4 py-3.5 md:px-6 2xl:px-8">
        {/* Left: Sidebar Toggle + TailAdmin Global Command Search */}
        <div className="flex flex-1 items-center gap-3 sm:gap-4">
          <button
            type="button"
            onClick={onToggleSidebar}
            aria-label="Toggle Sidebar"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-[16px] border border-[#ebebeb] bg-[#ffffff] text-[#000000] hover:bg-[#f2f4f5] cursor-pointer transition-colors"
          >
            <Menu size={19} strokeWidth={1.7} />
          </button>

          <form
            onSubmit={handleSearchSubmit}
            className="relative hidden sm:flex w-full max-w-[420px] items-center rounded-full border border-[#ebebeb] bg-[#f2f4f5] focus-within:bg-[#ffffff] focus-within:border-[#5433eb] transition-colors"
          >
            <Search size={17} className="pointer-events-none absolute left-4 text-[#787574]" />
            <input
              ref={searchInputRef}
              type="text"
              value={globalSearch}
              onChange={(e) => onGlobalSearchChange(e.target.value)}
              placeholder="Search catalog SKUs, orders, or type command..."
              className="w-full bg-transparent py-2.5 pl-11 pr-16 text-[13.5px] tracking-[-0.014em] text-[#000000] placeholder:text-[#787574] focus:outline-none"
            />
            <span className="pointer-events-none absolute right-2.5 rounded-full border border-[#ebebeb] bg-[#ffffff] px-2.5 py-0.5 text-[11px] text-[#787574]">
              ⌘K
            </span>
          </form>
        </div>

        {/* Right: + New SKU, Notifications Dropdown, User Profile Dropdown */}
        <div className="flex items-center gap-2.5 sm:gap-3.5">
          <button
            type="button"
            onClick={onQuickCreateProduct}
            className="hidden md:inline-flex items-center gap-1.5 rounded-full bg-[#5433eb] px-4 py-2 text-[13px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.28)] hover:bg-[#4524db] cursor-pointer transition-all"
          >
            <Plus size={15} />
            <span>New SKU</span>
          </button>

          {/* Notification Bell & Floating Card */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setNotificationsOpen((prev) => !prev);
                setProfileOpen(false);
              }}
              aria-label="Notifications"
              className="relative flex h-11 w-11 items-center justify-center rounded-full border border-[#ebebeb] bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb] cursor-pointer transition-colors"
            >
              <Bell size={18} strokeWidth={1.7} />
              {totalNotifications > 0 && (
                <span className="absolute top-1.5 right-2 h-2.5 w-2.5 rounded-full bg-[#5433eb] ring-2 ring-[#ffffff]" />
              )}
            </button>

            {notificationsOpen && (
              <div className="absolute right-0 mt-3 w-80 rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-5 shadow-[0_12px_32px_rgba(0,0,0,0.1)] z-50">
                <div className="flex items-center justify-between border-b border-[#ebebeb] pb-3">
                  <span className="text-[15px] tracking-[-0.02em] text-[#000000]">
                    Notification
                  </span>
                  <span className="rounded-full bg-[#5433eb]/10 px-2.5 py-0.5 text-[11px] text-[#5433eb]">
                    {totalNotifications} new
                  </span>
                </div>

                <div className="mt-3 space-y-2">
                  {lowStockCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('products');
                        setNotificationsOpen(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-[20px] bg-[#f2f4f5] p-3 text-left hover:bg-[#ebebeb]/70 cursor-pointer transition-colors"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#5433eb]" />
                      <div>
                        <p className="text-[13px] tracking-[-0.014em] text-[#000000]">
                          {lowStockCount} sản phẩm tồn kho thấp (≤ 8)
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#787574]">
                          Nhấn để xem danh sách SKU cần nhập thêm
                        </p>
                      </div>
                    </button>
                  )}

                  {pendingOrdersCount > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        onNavigateTab('orders');
                        setNotificationsOpen(false);
                      }}
                      className="flex w-full items-start gap-3 rounded-[20px] bg-[#f2f4f5] p-3 text-left hover:bg-[#ebebeb]/70 cursor-pointer transition-colors"
                    >
                      <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-[#000000]" />
                      <div>
                        <p className="text-[13px] tracking-[-0.014em] text-[#000000]">
                          {pendingOrdersCount} đơn hàng đang chờ duyệt
                        </p>
                        <p className="mt-0.5 text-[11px] text-[#787574]">
                          Mở Orders &amp; Dispatch để xử lý ngay
                        </p>
                      </div>
                    </button>
                  )}

                  {totalNotifications === 0 && (
                    <div className="py-5 text-center text-[12.5px] text-[#787574] space-y-1.5">
                      <CheckCircle2 size={22} className="mx-auto text-[#5433eb]" />
                      <p>Không có cảnh báo tồn đọng.</p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* User Profile Trigger & Dropdown */}
          <div className="relative">
            <button
              type="button"
              onClick={() => {
                setProfileOpen((prev) => !prev);
                setNotificationsOpen(false);
              }}
              className="flex items-center gap-3 rounded-full border border-[#ebebeb] bg-[#ffffff] py-1 pl-1.5 pr-3.5 hover:bg-[#f2f4f5] cursor-pointer transition-colors"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-[#5433eb] text-[13px] text-[#ffffff]">
                {(user?.name || 'AD').slice(0, 2).toUpperCase()}
              </div>
              <div className="hidden text-left sm:block">
                <span className="block text-[13px] leading-tight tracking-[-0.014em] text-[#000000]">
                  {user?.name || 'Administrator'}
                </span>
                <span className="block text-[11px] text-[#787574]">
                  {user?.email || 'admin@moondrop.vn'}
                </span>
              </div>
              <ChevronDown size={15} className="text-[#787574]" />
            </button>

            {profileOpen && (
              <div className="absolute right-0 mt-3 w-64 rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-3 shadow-[0_12px_32px_rgba(0,0,0,0.1)] z-50">
                <div className="rounded-[20px] bg-[#f2f4f5] px-4 py-3">
                  <p className="text-[13.5px] tracking-[-0.014em] text-[#000000]">
                    {user?.name || 'Administrator'}
                  </p>
                  <p className="truncate text-[11.5px] text-[#787574]">
                    {user?.email || 'admin@moondrop.vn'}
                  </p>
                </div>

                <div className="mt-2 space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      onNavigateTab('users');
                      setProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] text-[#000000] hover:bg-[#f2f4f5] cursor-pointer transition-colors"
                  >
                    <Users size={15} className="text-[#787574]" />
                    <span>Users &amp; Roles</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onNavigateTab('system');
                      setProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] text-[#000000] hover:bg-[#f2f4f5] cursor-pointer transition-colors"
                  >
                    <Database size={15} className="text-[#787574]" />
                    <span>System &amp; MongoDB</span>
                  </button>

                  <a
                    href={ENV.STOREFRONT_URL}
                    target="_blank"
                    rel="noreferrer"
                    className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] text-[#000000] hover:bg-[#f2f4f5] transition-colors"
                  >
                    <ExternalLink size={15} className="text-[#787574]" />
                    <span>Client Storefront</span>
                  </a>
                </div>

                <div className="mt-2 border-t border-[#ebebeb] pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      logout();
                      setProfileOpen(false);
                    }}
                    className="flex w-full items-center gap-2.5 rounded-full px-3.5 py-2 text-[13px] text-[#000000] hover:bg-[#000000] hover:text-[#ffffff] cursor-pointer transition-colors"
                  >
                    <LogOut size={15} />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
