import React, { useState } from 'react';
import {
  BarChart3,
  Boxes,
  ChevronDown,
  Database,
  ExternalLink,
  FileImage,
  LayoutDashboard,
  PackageCheck,
  Plus,
  Users,
  X,
} from 'lucide-react';
import { ENV } from '../../config/env';

export type AdminTab = 'overview' | 'products' | 'orders' | 'media' | 'users' | 'system';

interface SidebarProps {
  currentTab: AdminTab;
  onSelectTab: (tab: AdminTab) => void;
  isOpen: boolean;
  onClose: () => void;
  collapsed: boolean;
  lowStockCount: number;
  pendingOrdersCount: number;
  dbMode: string;
  onQuickCreateProduct: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentTab,
  onSelectTab,
  isOpen,
  onClose,
  collapsed,
  lowStockCount,
  pendingOrdersCount,
  dbMode,
  onQuickCreateProduct,
}) => {
  const [dashboardMenuOpen, setDashboardMenuOpen] = useState(true);
  const [ecommerceMenuOpen, setEcommerceMenuOpen] = useState(true);

  const handleNav = (tab: AdminTab) => {
    onSelectTab(tab);
    onClose();
  };

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-[#000000]/40 backdrop-blur-[2px] lg:hidden"
        />
      )}

      {/* TailAdmin Sidebar Architecture with Client Shop Colors (#ffffff, #ebebeb, #5433eb) & Rounded Corners */}
      <aside
        className={`fixed top-0 left-0 z-50 flex h-screen flex-col border-r border-[#ebebeb] bg-[#ffffff] transition-all duration-300 ease-in-out lg:static lg:translate-x-0 ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } ${collapsed ? 'w-[290px] lg:w-[90px]' : 'w-[290px]'}`}
      >
        {/* 1. Brand Header */}
        <div
          className={`flex items-center border-b border-[#ebebeb] px-6 py-5 ${
            collapsed ? 'lg:justify-center lg:px-4' : 'justify-between'
          }`}
        >
          <button
            type="button"
            onClick={() => handleNav('overview')}
            className="flex items-center gap-3 cursor-pointer text-left"
          >
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-[#5433eb] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.28)]">
              <BarChart3 size={20} strokeWidth={2} />
            </div>
            <div className={collapsed ? 'lg:hidden' : 'block'}>
              <div className="flex items-center gap-2">
                <span className="text-[20px] leading-none tracking-[-0.04em] text-[#000000]">
                  TailAdmin
                </span>
                <span className="rounded-full bg-[#f2f4f5] px-2 py-0.5 text-[10px] tracking-[-0.017em] text-[#5433eb]">
                  shop.5174
                </span>
              </div>
              <p className="mt-1 text-[11px] tracking-[-0.017em] text-[#787574]">
                MOONDROP Admin Studio
              </p>
            </div>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close sidebar"
            className="flex h-8 w-8 items-center justify-center rounded-full bg-[#f2f4f5] text-[#000000] hover:bg-[#ebebeb] lg:hidden cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* 2. Grouped TailAdmin Menu Navigation */}
        <div className="flex-1 overflow-y-auto px-4 py-6 space-y-7">
          {/* Group 1: MENU */}
          <div>
            <h3
              className={`mb-3 px-3 text-[11px] uppercase tracking-wider text-[#787574] ${
                collapsed ? 'lg:text-center lg:px-0' : ''
              }`}
            >
              {collapsed ? <span className="hidden lg:inline">•••</span> : null}
              <span className={collapsed ? 'lg:hidden' : ''}>MENU</span>
            </h3>

            <ul className="space-y-1.5">
              {/* Collapsible Parent: Dashboard */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) handleNav('overview');
                    else setDashboardMenuOpen((prev) => !prev);
                  }}
                  title="Dashboard"
                  className={`flex w-full items-center justify-between rounded-[20px] px-3.5 py-2.5 text-[14px] tracking-[-0.014em] cursor-pointer transition-colors ${
                    currentTab === 'overview'
                      ? 'bg-[#5433eb]/10 text-[#5433eb]'
                      : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
                  } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <LayoutDashboard size={19} strokeWidth={1.7} />
                    <span className={collapsed ? 'lg:hidden' : ''}>Dashboard</span>
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        dashboardMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {dashboardMenuOpen && !collapsed && (
                  <ul className="mt-1.5 space-y-1 pl-9">
                    <li>
                      <button
                        type="button"
                        onClick={() => handleNav('overview')}
                        className={`flex w-full items-center justify-between rounded-[16px] px-3.5 py-2 text-[13px] tracking-[-0.014em] cursor-pointer transition-colors ${
                          currentTab === 'overview'
                            ? 'bg-[#f2f4f5] text-[#000000]'
                            : 'text-[#787574] hover:bg-[#f2f4f5]/60 hover:text-[#000000]'
                        }`}
                      >
                        <span>eCommerce</span>
                        <span className="h-1.5 w-1.5 rounded-full bg-[#5433eb]" />
                      </button>
                    </li>
                  </ul>
                )}
              </li>

              {/* Collapsible Parent: E-Commerce */}
              <li>
                <button
                  type="button"
                  onClick={() => {
                    if (collapsed) handleNav('products');
                    else setEcommerceMenuOpen((prev) => !prev);
                  }}
                  title="E-Commerce"
                  className={`flex w-full items-center justify-between rounded-[20px] px-3.5 py-2.5 text-[14px] tracking-[-0.014em] cursor-pointer transition-colors ${
                    currentTab === 'products' ||
                    currentTab === 'orders' ||
                    currentTab === 'media'
                      ? 'bg-[#5433eb]/10 text-[#5433eb]'
                      : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
                  } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <span className="flex items-center gap-3">
                    <Boxes size={19} strokeWidth={1.7} />
                    <span className={collapsed ? 'lg:hidden' : ''}>E-Commerce</span>
                  </span>
                  {!collapsed && (
                    <ChevronDown
                      size={16}
                      className={`transition-transform duration-200 ${
                        ecommerceMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  )}
                </button>

                {ecommerceMenuOpen && !collapsed && (
                  <ul className="mt-1.5 space-y-1 pl-9">
                    <li>
                      <button
                        type="button"
                        onClick={() => handleNav('products')}
                        className={`flex w-full items-center justify-between rounded-[16px] px-3.5 py-2 text-[13px] tracking-[-0.014em] cursor-pointer transition-colors ${
                          currentTab === 'products'
                            ? 'bg-[#f2f4f5] text-[#000000]'
                            : 'text-[#787574] hover:bg-[#f2f4f5]/60 hover:text-[#000000]'
                        }`}
                      >
                        <span>Products Catalog</span>
                        {lowStockCount > 0 && (
                          <span className="rounded-full bg-[#5433eb] px-2 py-0.5 text-[10px] text-[#ffffff]">
                            {lowStockCount}
                          </span>
                        )}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => handleNav('orders')}
                        className={`flex w-full items-center justify-between rounded-[16px] px-3.5 py-2 text-[13px] tracking-[-0.014em] cursor-pointer transition-colors ${
                          currentTab === 'orders'
                            ? 'bg-[#f2f4f5] text-[#000000]'
                            : 'text-[#787574] hover:bg-[#f2f4f5]/60 hover:text-[#000000]'
                        }`}
                      >
                        <span>Orders &amp; Dispatch</span>
                        {pendingOrdersCount > 0 && (
                          <span className="rounded-full bg-[#332f2d] px-2 py-0.5 text-[10px] text-[#ffffff]">
                            {pendingOrdersCount}
                          </span>
                        )}
                      </button>
                    </li>
                    <li>
                      <button
                        type="button"
                        onClick={() => handleNav('media')}
                        className={`flex w-full items-center justify-between rounded-[16px] px-3.5 py-2 text-[13px] tracking-[-0.014em] cursor-pointer transition-colors ${
                          currentTab === 'media'
                            ? 'bg-[#f2f4f5] text-[#000000]'
                            : 'text-[#787574] hover:bg-[#f2f4f5]/60 hover:text-[#000000]'
                        }`}
                      >
                        <span>Media Library</span>
                      </button>
                    </li>
                  </ul>
                )}

                {/* Collapsed quick icons for Orders & Media */}
                {collapsed && (
                  <div className="hidden lg:flex flex-col gap-1.5 mt-1.5">
                    <button
                      type="button"
                      onClick={() => handleNav('orders')}
                      title="Orders & Dispatch"
                      className={`relative flex w-full items-center justify-center rounded-[20px] py-2.5 cursor-pointer transition-colors ${
                        currentTab === 'orders'
                          ? 'bg-[#5433eb]/10 text-[#5433eb]'
                          : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
                      }`}
                    >
                      <PackageCheck size={19} strokeWidth={1.7} />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleNav('media')}
                      title="Media Library"
                      className={`flex w-full items-center justify-center rounded-[20px] py-2.5 cursor-pointer transition-colors ${
                        currentTab === 'media'
                          ? 'bg-[#5433eb]/10 text-[#5433eb]'
                          : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
                      }`}
                    >
                      <FileImage size={19} strokeWidth={1.7} />
                    </button>
                  </div>
                )}
              </li>
            </ul>
          </div>

          {/* Group 2: ADMINISTRATION */}
          <div>
            <h3
              className={`mb-3 px-3 text-[11px] uppercase tracking-wider text-[#787574] ${
                collapsed ? 'lg:text-center lg:px-0' : ''
              }`}
            >
              {collapsed ? <span className="hidden lg:inline">•••</span> : null}
              <span className={collapsed ? 'lg:hidden' : ''}>ADMINISTRATION</span>
            </h3>

            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => handleNav('users')}
                  title="Users & Roles"
                  className={`flex w-full items-center gap-3 rounded-[20px] px-3.5 py-2.5 text-[14px] tracking-[-0.014em] cursor-pointer transition-colors ${
                    currentTab === 'users'
                      ? 'bg-[#5433eb]/10 text-[#5433eb]'
                      : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
                  } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <Users size={19} strokeWidth={1.7} />
                  <span className={collapsed ? 'lg:hidden' : ''}>Users &amp; Roles</span>
                </button>
              </li>

              <li>
                <button
                  type="button"
                  onClick={() => handleNav('system')}
                  title="System & MongoDB"
                  className={`flex w-full items-center gap-3 rounded-[20px] px-3.5 py-2.5 text-[14px] tracking-[-0.014em] cursor-pointer transition-colors ${
                    currentTab === 'system'
                      ? 'bg-[#5433eb]/10 text-[#5433eb]'
                      : 'text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000]'
                  } ${collapsed ? 'lg:justify-center lg:px-2' : ''}`}
                >
                  <Database size={19} strokeWidth={1.7} />
                  <span className={collapsed ? 'lg:hidden' : ''}>System &amp; MongoDB</span>
                </button>
              </li>
            </ul>
          </div>

          {/* Group 3: OTHERS */}
          <div>
            <h3
              className={`mb-3 px-3 text-[11px] uppercase tracking-wider text-[#787574] ${
                collapsed ? 'lg:text-center lg:px-0' : ''
              }`}
            >
              {collapsed ? <span className="hidden lg:inline">•••</span> : null}
              <span className={collapsed ? 'lg:hidden' : ''}>OTHERS</span>
            </h3>

            <ul className="space-y-1.5">
              <li>
                <button
                  type="button"
                  onClick={() => {
                    onQuickCreateProduct();
                    onClose();
                  }}
                  title="Quick Create SKU"
                  className={`flex w-full items-center gap-3 rounded-[20px] px-3.5 py-2.5 text-[14px] tracking-[-0.014em] text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000] cursor-pointer transition-colors ${
                    collapsed ? 'lg:justify-center lg:px-2' : ''
                  }`}
                >
                  <Plus size={19} strokeWidth={1.7} />
                  <span className={collapsed ? 'lg:hidden' : ''}>Quick Create SKU</span>
                </button>
              </li>

              <li>
                <a
                  href={ENV.STOREFRONT_URL}
                  target="_blank"
                  rel="noreferrer"
                  title="Client Storefront"
                  className={`flex w-full items-center gap-3 rounded-[20px] px-3.5 py-2.5 text-[14px] tracking-[-0.014em] text-[#787574] hover:bg-[#f2f4f5] hover:text-[#000000] transition-colors ${
                    collapsed ? 'lg:justify-center lg:px-2' : ''
                  }`}
                >
                  <ExternalLink size={19} strokeWidth={1.7} />
                  <span className={collapsed ? 'lg:hidden' : ''}>Client Storefront</span>
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* 3. TailAdmin Sidebar Footer Card (Shop Rounded Style) */}
        {!collapsed && (
          <div className="p-4">
            <div className="rounded-[24px] bg-[#f2f4f5] p-4 text-center space-y-3">
              <div className="flex items-center justify-center gap-2">
                <span
                  className={`h-2 w-2 rounded-full ${
                    dbMode === 'mongodb' ? 'bg-[#5433eb]' : 'bg-[#787574]'
                  }`}
                />
                <span className="text-[12px] tracking-[-0.017em] text-[#000000]">
                  {dbMode === 'mongodb' ? 'MongoDB Atlas Synced' : 'Checking Sync'}
                </span>
              </div>
              <p className="text-[11.5px] leading-relaxed tracking-[-0.014em] text-[#787574]">
                Dedicated TailAdmin portal isolated from customer storefront.
              </p>
              <a
                href={ENV.STOREFRONT_URL}
                target="_blank"
                rel="noreferrer"
                className="flex w-full items-center justify-center gap-1.5 rounded-full bg-[#5433eb] px-4 py-2 text-[12px] tracking-[-0.014em] text-[#ffffff] shadow-[0_4px_24px_rgba(69,36,219,0.28)] hover:bg-[#4524db] transition-colors"
              >
                <span>Open Storefront</span>
                <ExternalLink size={12} />
              </a>
            </div>
          </div>
        )}
      </aside>
    </>
  );
};
