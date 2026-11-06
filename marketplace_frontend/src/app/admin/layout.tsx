import React from 'react';
import { auth, pool } from '@/lib/auth/auth';
import { headers } from 'next/headers';
import Link from 'next/link';
import { ShieldAlert, ArrowLeft, LogIn } from 'lucide-react';
import { AdminGuard } from '@/components/admin-providers/admin-guard';

async function resolveAdminSession(reqHeaders: Headers) {
  try {
    const session = await auth.api.getSession({ headers: reqHeaders });
    if (session?.user) {
      return { user: session.user };
    }
  } catch {
    // ignore
  }

  // Fallback: Kiểm tra session token từ cookie trực tiếp vào DB
  const cookieHeader = reqHeaders.get('cookie') || '';
  const match = cookieHeader.match(
    /(?:better-auth\.session_token|__Secure-better-auth\.session_token)=([^;]+)/,
  );
  if (match && match[1]) {
    const rawVal = decodeURIComponent(match[1].trim());
    const dotIdx = rawVal.lastIndexOf('.');
    const token = dotIdx !== -1 ? rawVal.slice(0, dotIdx) : rawVal;

    try {
      const res = await pool.query(
        `SELECT s.id, s.user_id, u.email, u.name, u.role 
         FROM public.session s 
         JOIN public.user u ON u.id = s.user_id 
         WHERE s.token = $1 AND s.expires_at > NOW() 
         LIMIT 1`,
        [token],
      );
      if (res.rows.length > 0) {
        return { user: res.rows[0] };
      }
    } catch {
      // ignore
    }
  }

  return null;
}

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reqHeaders = await headers();
  const session = await resolveAdminSession(reqHeaders);

  // 1. Chưa đăng nhập
  if (!session?.user) {
    return (
      <AdminGuard>
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
      </AdminGuard>
    );
  }

  // 2. Đã đăng nhập nhưng vai trò là customer hoặc provider (không phải admin)
  const role = String(session.user.role || '').toLowerCase();
  if (role !== 'admin') {
    return (
      <AdminGuard>
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
              Tài khoản <strong className="text-slate-900 font-semibold">{session.user.email}</strong> hiện tại có vai trò là{' '}
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
      </AdminGuard>
    );
  }

  // 3. Đúng tài khoản Admin -> Render qua AdminGuard
  return <AdminGuard>{children}</AdminGuard>;
}
