'use client';

import React from 'react';
import Link from 'next/link';
import { useCurrentUser } from '@/hooks/use-auth';
import { ShieldAlert, ArrowLeft, Loader2, LogIn } from 'lucide-react';

export function AdminGuard({ children }: { children: React.ReactNode }) {
  const { data: user, isLoading } = useCurrentUser();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          <p className="text-sm font-medium">Đang kiểm tra quyền Quản trị viên...</p>
        </div>
      </div>
    );
  }

  // Chưa đăng nhập
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 max-w-md w-full p-8 text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto border border-amber-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-slate-900">Yêu cầu đăng nhập</h2>
          <p className="text-xs text-slate-500 leading-relaxed">
            Bạn cần đăng nhập bằng tài khoản Quản trị viên (Admin) để truy cập khu vực này.
          </p>
          <div className="pt-2 flex flex-col gap-2">
            <Link
              href="/auth/signin?redirect=%2Fadmin%2Fproviders"
              className="inline-flex items-center justify-center gap-2 w-full px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <LogIn className="w-4 h-4" />
              <span>Đăng nhập Quản trị viên</span>
            </Link>
            <Link
              href="/product/catalog"
              className="inline-flex items-center justify-center w-full px-5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white transition"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Đã đăng nhập nhưng vai trò không phải admin (ví dụ: customer, provider)
  const role = String(user.role || '').toLowerCase();
  if (role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl border border-red-200 max-w-lg w-full p-8 text-center space-y-4 animate-in fade-in zoom-in-95 duration-150">
          <div className="w-14 h-14 rounded-2xl bg-red-50 text-red-600 flex items-center justify-center mx-auto border border-red-200">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <div>
            <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 uppercase tracking-wider">
              403 - Quyền truy cập bị từ chối
            </span>
            <h2 className="text-xl font-bold text-slate-900 mt-2">
              Không có quyền Quản trị viên
            </h2>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Tài khoản <strong className="text-slate-900 font-semibold">{user.email}</strong> hiện tại có vai trò là{' '}
            <code className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold uppercase text-[11px]">
              {role || 'customer'}
            </code>
            . Bạn không được phép truy cập vào trang Quản trị viên hệ thống.
          </p>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Link
              href="/product/catalog"
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-xs"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Về trang chủ</span>
            </Link>
            <Link
              href="/provider/register"
              className="inline-flex items-center justify-center px-5 py-2.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 bg-white transition"
            >
              Đăng ký Nhà cung cấp
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Là admin -> Render trang
  return <>{children}</>;
}

