'use client';

import React from 'react';
import { FolderGit2, Hourglass, CheckCircle2, XCircle } from 'lucide-react';
import { ProviderStats } from '@/types/provider.types';

interface ProviderStatCardsProps {
  stats: ProviderStats;
}

export function ProviderStatCards({ stats }: ProviderStatCardsProps) {
  return (
    <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-7">
      {/* Thẻ 1: Tổng hồ sơ */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 transition-shadow hover:shadow-xs flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between text-slate-500">
          <span className="text-xs font-medium">Tổng hồ sơ đăng ký</span>
          <FolderGit2 className="w-5 h-5 text-slate-400" />
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-slate-900 tracking-tight">
            {stats.total}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 text-[11px] font-semibold border border-slate-200">
            Tất cả hồ sơ
          </span>
        </div>
      </div>

      {/* Thẻ 2: Chờ xét duyệt */}
      <div className="bg-white rounded-xl border border-amber-200 p-5 transition-shadow hover:shadow-xs flex flex-col justify-between bg-amber-50/20 shadow-xs">
        <div className="flex items-center justify-between text-amber-700">
          <span className="text-xs font-medium">Chờ xét duyệt</span>
          <Hourglass className="w-5 h-5 text-amber-600" />
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-amber-900 tracking-tight">
            {stats.pending}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[11px] font-semibold border border-amber-200">
            Cần thẩm định
          </span>
        </div>
      </div>

      {/* Thẻ 3: Đã phê duyệt */}
      <div className="bg-white rounded-xl border border-emerald-200 p-5 transition-shadow hover:shadow-xs flex flex-col justify-between bg-emerald-50/20 shadow-xs">
        <div className="flex items-center justify-between text-emerald-700">
          <span className="text-xs font-medium">Đã phê duyệt</span>
          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-emerald-950 tracking-tight">
            {stats.approved}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-semibold border border-emerald-200">
            Đã cấp quyền nhà cung cấp
          </span>
        </div>
      </div>

      {/* Thẻ 4: Đã từ chối */}
      <div className="bg-white rounded-xl border border-red-200 p-5 transition-shadow hover:shadow-xs flex flex-col justify-between bg-red-50/20 shadow-xs">
        <div className="flex items-center justify-between text-red-600">
          <span className="text-xs font-medium">Đã từ chối</span>
          <XCircle className="w-5 h-5 text-red-500" />
        </div>
        <div className="mt-4 flex items-baseline justify-between">
          <div className="text-3xl font-bold text-red-950 tracking-tight">
            {stats.rejected}
          </div>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[11px] font-semibold border border-red-200">
            Cần bổ sung / Sửa lại
          </span>
        </div>
      </div>
    </section>
  );
}
