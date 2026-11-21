import React, { useState } from 'react';
import { ChevronRight, Database, RefreshCw, Shield, UserCheck, Users } from 'lucide-react';
import { useAdminAuth } from '../../context/AdminAuthContext';
import { User } from '../../types';
import { formatDate } from '../../utils/format';

interface UsersViewProps {
  users: User[];
  onToggleRole: (user: User) => Promise<void>;
  health: { status: string; dbMode: string; productCount: number; timestamp: string } | null;
  onRefreshHealth: () => Promise<void>;
  activeSection?: 'users' | 'system';
  onBackDashboard?: () => void;
}

export const UsersView: React.FC<UsersViewProps> = ({
  users,
  onToggleRole,
  health,
  onRefreshHealth,
  activeSection = 'users',
  onBackDashboard,
}) => {
  const { user: currentUser } = useAdminAuth();
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [checkingHealth, setCheckingHealth] = useState(false);

  const handleRoleToggle = async (u: User) => {
    if (u.id === currentUser?.id) {
      alert('Không thể tự hạ quyền tài khoản quản trị đang đăng nhập.');
      return;
    }
    const nextRole = u.role === 'admin' ? 'customer' : 'admin';
    if (!window.confirm(`Xác nhận chuyển quyền của "${u.email}" thành "${nextRole}"?`)) {
      return;
    }
    setTogglingId(u.id);
    try {
      await onToggleRole(u);
    } finally {
      setTogglingId(null);
    }
  };

  const handlePing = async () => {
    setCheckingHealth(true);
    try {
      await onRefreshHealth();
    } finally {
      setCheckingHealth(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* TailAdmin Page Header & Breadcrumb */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-[24px] leading-none tracking-[-0.04em] text-[#000000]">
          {activeSection === 'system' ? 'System & MongoDB' : 'Users & Roles'}
        </h2>
        <nav className="flex items-center gap-1.5 text-[13px] text-[#787574]">
          <button
            type="button"
            onClick={onBackDashboard}
            className="hover:text-[#000000] cursor-pointer"
          >
            Dashboard
          </button>
          <ChevronRight size={14} />
          <span className="text-[#5433eb]">
            {activeSection === 'system' ? 'System & MongoDB' : 'Users & Roles'}
          </span>
        </nav>
      </div>

      {/* 1. Slate-Ink (#332f2d) Dark Telemetry Card */}
      <div className="rounded-[28px] bg-[#332f2d] text-[#ffffff] p-6 md:p-7 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.1),0_2px_4px_-2px_rgba(0,0,0,0.08)]">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[#ffffff]/15 pb-5">
          <div className="flex items-center gap-3.5">
            <div className="flex h-12 w-12 items-center justify-center rounded-[20px] bg-[#5433eb] text-[#ffffff]">
              <Database size={21} strokeWidth={1.7} />
            </div>
            <div>
              <h3 className="text-[20px] leading-tight tracking-[-0.04em] text-[#ffffff]">
                MongoDB Atlas &amp; System Health
              </h3>
              <p className="text-[12.5px] text-[#cccccc]">
                Cluster moondrop_audio · Đồng bộ trực tiếp Storefront (5173) &amp; Admin (5174)
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePing}
            disabled={checkingHealth}
            className="inline-flex items-center gap-2 rounded-full bg-[#ffffff] px-4 py-2 text-[12.5px] text-[#000000] hover:bg-[#5433eb] hover:text-[#ffffff] cursor-pointer transition-colors disabled:opacity-50"
          >
            <RefreshCw size={14} className={checkingHealth ? 'animate-spin' : ''} />
            <span>Ping Database</span>
          </button>
        </div>

        <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-[20px] bg-[#ffffff]/10 p-4">
            <span className="text-[11px] text-[#cccccc]">Database Engine</span>
            <div className="mt-2 flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full bg-[#5433eb] animate-pulse" />
              <p className="text-[17px] tracking-[-0.03em] text-[#ffffff]">
                {health?.dbMode === 'mongodb' ? 'MongoDB Atlas Online' : 'Active'}
              </p>
            </div>
          </div>

          <div className="rounded-[20px] bg-[#ffffff]/10 p-4">
            <span className="text-[11px] text-[#cccccc]">Active SKUs</span>
            <p className="mt-2 text-[19px] tracking-[-0.03em] text-[#ffffff]">
              {health?.productCount ?? 0} SKUs
            </p>
          </div>

          <div className="rounded-[20px] bg-[#ffffff]/10 p-4">
            <span className="text-[11px] text-[#cccccc]">Last Health Check</span>
            <p className="mt-2 text-[13.5px] text-[#ffffff]">
              {health ? formatDate(health.timestamp) : 'Checking...'}
            </p>
          </div>
        </div>
      </div>

      {/* 2. TailAdmin Users Table */}
      <div className="rounded-[28px] border border-[#ebebeb] bg-[#ffffff] p-6 shadow-[0_4px_6px_-1px_rgba(0,0,0,0.06),0_2px_4px_-2px_rgba(0,0,0,0.05)] overflow-hidden">
        <div className="flex items-center justify-between border-b border-[#ebebeb] pb-4 mb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-10 w-10 items-center justify-center rounded-[16px] bg-[#f2f4f5] text-[#000000]">
              <Users size={18} />
            </div>
            <div>
              <h3 className="text-[18px] leading-tight tracking-[-0.04em] text-[#000000]">
                Account Access Control
              </h3>
              <p className="text-[12px] text-[#787574]">
                {users.length} accounts registered in MongoDB
              </p>
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px]">
            <thead>
              <tr className="border-b border-[#ebebeb] text-[12px] text-[#787574]">
                <th className="pb-3 pr-4">User</th>
                <th className="pb-3 px-4">Email</th>
                <th className="pb-3 px-4 text-center">Role</th>
                <th className="pb-3 px-4">Registered</th>
                <th className="pb-3 pl-4 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ebebeb]">
              {users.map((u) => {
                const isAdmin = u.role === 'admin';
                return (
                  <tr key={u.id} className="hover:bg-[#f2f4f5]/60 transition-colors">
                    <td className="py-3.5 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[12px] ${
                            isAdmin
                              ? 'bg-[#5433eb] text-[#ffffff]'
                              : 'bg-[#f2f4f5] text-[#000000]'
                          }`}
                        >
                          {u.name?.slice(0, 2).toUpperCase() || 'US'}
                        </div>
                        <span className="text-[14px] text-[#000000]">{u.name}</span>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-[#787574]">{u.email}</td>

                    <td className="py-3.5 px-4 text-center">
                      {isAdmin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#5433eb] px-2.5 py-0.5 text-[11px] text-[#ffffff]">
                          <Shield size={11} />
                          <span>Admin</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-[#f2f4f5] px-2.5 py-0.5 text-[11px] text-[#787574]">
                          <UserCheck size={11} />
                          <span>Customer</span>
                        </span>
                      )}
                    </td>

                    <td className="py-3.5 px-4 text-[12px] text-[#787574]">
                      {formatDate(u.createdAt)}
                    </td>

                    <td className="py-3.5 pl-4 text-right">
                      <button
                        type="button"
                        onClick={() => handleRoleToggle(u)}
                        disabled={togglingId === u.id || u.email === 'admin@moondrop.vn'}
                        className={`rounded-full px-3.5 py-1.5 text-[12px] cursor-pointer disabled:opacity-40 transition-colors ${
                          isAdmin
                            ? 'border border-[#ebebeb] bg-[#ffffff] text-[#000000] hover:bg-[#000000] hover:text-[#ffffff]'
                            : 'bg-[#000000] text-[#ffffff] hover:bg-[#5433eb]'
                        }`}
                      >
                        {isAdmin ? 'Set Customer' : 'Set Admin'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
