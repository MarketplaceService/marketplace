'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ShieldCheck, LayoutDashboard, Bell, BadgeCheck, Gavel } from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-auth';

export function AdminHeader() {
  const pathname = usePathname();
  const { data: user } = useCurrentUser();

  return (
    <header className="sticky top-0 w-full z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs flex-shrink-0">
      <div className="flex justify-between items-center max-w-7xl mx-auto px-4 sm:px-6 h-16">
        {/* Brand Logo */}
        <div className="flex items-center gap-3">
          <Link href="/admin/providers" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shadow-xs transition duration-150 ease-in-out group-hover:bg-emerald-700">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div className="flex items-baseline tracking-tight">
              <span className="text-xl font-bold text-slate-900">Servi</span>
              <span className="text-xl font-bold text-emerald-600">go</span>
              <span className="ml-2 px-1.5 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                Admin
              </span>
            </div>
          </Link>
        </div>

        {/* Center: 3 Navigation Tabs */}
        <nav className="hidden md:flex items-center gap-7">
          <Link
            href="/admin/dashboard"
            className={`text-sm transition-colors duration-150 flex items-center gap-1.5 ${
              pathname === '/admin/dashboard'
                ? 'text-emerald-800 font-bold border-b-2 border-emerald-800 pb-1'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tổng quan KPI</span>
          </Link>

          <Link
            href="/admin/providers"
            className={`text-sm transition-colors duration-150 flex items-center gap-1.5 ${
              pathname.startsWith('/admin/providers')
                ? 'text-emerald-800 font-bold border-b-2 border-emerald-800 pb-1'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <BadgeCheck className="w-4 h-4 text-emerald-700" />
            <span>Duyệt nhà cung cấp</span>
          </Link>

          <Link
            href="/admin/disputes"
            className={`text-sm transition-colors duration-150 flex items-center gap-1.5 ${
              pathname.startsWith('/admin/disputes')
                ? 'text-emerald-800 font-bold border-b-2 border-emerald-800 pb-1'
                : 'text-slate-500 hover:text-slate-900'
            }`}
          >
            <Gavel className="w-4 h-4" />
            <span>Xử lý tranh chấp</span>
            <span className="w-2 h-2 rounded-full bg-red-500 inline-block" title="3 ca chờ xử lý" />
          </Link>
        </nav>

        {/* Right: Notification & Admin info */}
        <div className="flex items-center gap-4">
          <button
            type="button"
            className="relative w-9 h-9 rounded-full border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition duration-150 cursor-pointer"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white animate-pulse" />
          </button>

          <div className="flex items-center gap-2.5 pl-2 border-l border-slate-200">
            <img
              src={
                user?.image ||
                'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=80&q=80'
              }
              alt={user?.name || 'Admin'}
              className="w-8 h-8 rounded-full object-cover border border-slate-200"
            />
            <div className="hidden lg:block text-left text-xs leading-tight">
              <p className="font-bold text-slate-800">
                {user?.name || 'Admin Marketplace'}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">
                {user?.role || 'admin'}
              </p>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
