'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ShieldCheck,
  TrendingUp,
  UserCheck,
  Gavel,
  Flag,
  Users,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-auth';
import { toast } from 'sonner';

interface AdminSidebarProps {
  pendingCount?: number;
}

export function AdminSidebar({ pendingCount = 6 }: AdminSidebarProps) {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  const handleDevelopingFeature = (name: string) => {
    toast.info(`Tính năng ${name} đang phát triển.`);
  };

  return (
    <>
      {/* ========================================================================= */}
      {/* 1. LEFT SIDEBAR QUẢN TRỊ VIÊN CỐ ĐỊNH (DESKTOP)                            */}
      {/* ========================================================================= */}
      <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:fixed lg:top-[72px] lg:bottom-0 z-30 bg-white border-r border-slate-200 select-none shadow-xs">
        {/* Header của Sidebar */}
        <div className="px-6 pt-6 pb-4 border-b border-slate-100">
          <Link
            className="flex items-center gap-2.5 group"
            href="/admin/dashboard"
          >
            <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs transition duration-150 ease-in-out group-hover:bg-emerald-800">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-baseline tracking-tight">
              <span className="text-[18px] font-bold text-slate-900">Trust</span>
              <span className="text-[18px] font-bold text-emerald-700">Fix</span>
              <span className="ml-2 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Menu điều hướng dọc (6 mục theo chuẩn mockup screen19) */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {/* 1. Tổng quan */}
          <Link
            href="/admin/dashboard"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-colors ${
              pathname === '/admin/dashboard'
                ? 'font-semibold bg-emerald-50 text-emerald-800'
                : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <TrendingUp className="w-5 h-5 text-slate-500" />
            <span>Tổng quan</span>
          </Link>

          {/* 2. Duyệt đối tác (Đang Active) */}
          <Link
            href="/admin/providers"
            className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-[14px] font-semibold transition-colors ${
              pathname.startsWith('/admin/providers')
                ? 'bg-emerald-50 text-emerald-800'
                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-3">
              <UserCheck className="w-5 h-5 text-emerald-700" />
              <span>Duyệt đối tác</span>
            </div>
            {pendingCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-700 text-white">
                {pendingCount}
              </span>
            )}
          </Link>

          {/* 3. Xử lý tranh chấp */}
          <Link
            href="/admin/disputes"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-colors ${
              pathname.startsWith('/admin/disputes')
                ? 'font-semibold bg-emerald-50 text-emerald-800'
                : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Gavel className="w-5 h-5 text-slate-500" />
            <span>Xử lý tranh chấp</span>
          </Link>

          {/* 4. Duyệt dịch vụ */}
          <button
            type="button"
            onClick={() => handleDevelopingFeature('Duyệt dịch vụ')}
            className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-5 h-5 text-slate-500" />
            <span>Duyệt dịch vụ</span>
          </button>

          {/* 5. Báo cáo vi phạm */}
          <button
            type="button"
            onClick={() => handleDevelopingFeature('Báo cáo vi phạm')}
            className="w-full text-left flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors cursor-pointer"
          >
            <Flag className="w-5 h-5 text-slate-500" />
            <span>Báo cáo vi phạm</span>
          </button>

          {/* 6. Tài khoản */}
          <Link
            href="/admin/users"
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-[14px] transition-colors ${
              pathname.startsWith('/admin/users')
                ? 'font-semibold bg-emerald-50 text-emerald-800'
                : 'font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <Users className="w-5 h-5 text-slate-500" />
            <span>Tài khoản</span>
          </Link>
        </nav>

        {/* Footer của Sidebar (Admin Profile) */}
        <div className="p-4 border-t border-slate-200 bg-slate-50/60">
          <div className="flex items-center gap-3">
            <img
              className="w-9 h-9 rounded-full object-cover ring-1 ring-slate-200 shadow-xs"
              alt={user?.name || 'Lê Quang Dũng'}
              src={
                user?.image ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
              }
            />
            <div className="flex flex-col text-left">
              <span className="text-[13px] font-bold text-slate-900 leading-tight">
                {user?.name || 'Lê Quang Dũng'}
              </span>
              <span className="text-[11px] text-slate-500">Quản trị viên</span>
            </div>
          </div>
        </div>
      </aside>

      {/* ========================================================================= */}
      {/* 2. MOBILE TOPBAR QUẢN TRỊ VIÊN (< lg)                                     */}
      {/* ========================================================================= */}
      <header className="lg:hidden sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 px-4 h-14 flex items-center justify-between">
        <Link className="flex items-center gap-2 group" href="/admin/dashboard">
          <div className="w-8 h-8 rounded-lg bg-emerald-700 text-white flex items-center justify-center shadow-xs">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="flex items-baseline tracking-tight">
            <span className="text-[16px] font-bold text-slate-900">Trust</span>
            <span className="text-[16px] font-bold text-emerald-700">Fix</span>
          </div>
          <span className="ml-1 text-[11px] font-semibold text-slate-600 bg-slate-100 px-2 py-0.5 rounded">
            Quản trị viên
          </span>
        </Link>
        <div className="flex items-center gap-2 text-[13px]">
          <Link
            href="/admin/dashboard"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
            title="Tổng quan"
          >
            <TrendingUp className="w-5 h-5" />
          </Link>
          <Link
            href="/admin/providers"
            className="p-1.5 rounded-lg text-emerald-700 bg-emerald-50 font-semibold transition"
            title="Duyệt đối tác"
          >
            <UserCheck className="w-5 h-5" />
          </Link>
          <Link
            href="/admin/disputes"
            className="p-1.5 rounded-lg text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition relative"
            title="Tranh chấp"
          >
            <Gavel className="w-5 h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-red-500" />
          </Link>
          <div className="ml-1">
            <img
              className="w-7 h-7 rounded-full object-cover ring-1 ring-slate-200"
              alt={user?.name || 'Admin'}
              src={
                user?.image ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'
              }
            />
          </div>
        </div>
      </header>
    </>
  );
}

