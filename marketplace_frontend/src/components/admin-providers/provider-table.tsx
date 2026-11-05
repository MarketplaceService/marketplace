'use client';

import React from 'react';
import {
  FileText,
  Inbox,
  ArrowRight,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { ProviderProfile } from '@/types/provider.types';

interface ProviderTableProps {
  providers: ProviderProfile[];
  totalItems: number;
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onOpenAppraisal: (provider: ProviderProfile) => void;
}

export function ProviderTable({
  providers,
  totalItems,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onOpenAppraisal,
}: ProviderTableProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const start = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  if (totalItems === 0) {
    return (
      <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400 shadow-xs">
        <Inbox className="w-10 h-10 mx-auto mb-2 text-slate-300" />
        <p className="font-medium text-sm text-slate-600">
          Không tìm thấy hồ sơ Nhà cung cấp nào phù hợp
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold text-[11px] uppercase tracking-wider">
            <tr>
              <th className="px-5 py-3.5">Nhà cung cấp</th>
              <th className="px-5 py-3.5">Số điện thoại &amp; Kinh nghiệm</th>
              <th className="px-5 py-3.5">Ngành nghề &amp; Vùng phục vụ</th>
              <th className="px-5 py-3.5">Tài liệu xác minh</th>
              <th className="px-5 py-3.5">Ngày đăng ký</th>
              <th className="px-5 py-3.5">Trạng thái</th>
              <th className="px-5 py-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {providers.map((item) => {
              const radius = item.serviceAreas?.[0]?.radiusKm ?? 5.0;
              const dateStr = new Date(item.createdAt).toLocaleDateString(
                'vi-VN',
                {
                  day: '2-digit',
                  month: '2-digit',
                  year: 'numeric',
                },
              );

              return (
                <tr
                  key={item.id}
                  className="hover:bg-slate-50/70 transition-colors"
                >
                  {/* Cột 1: Thông tin thợ */}
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      <img
                        className="w-10 h-10 rounded-full object-cover border border-slate-200 shadow-2xs shrink-0"
                        src={
                          item.user?.image ||
                          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                        }
                        alt={item.displayName}
                      />
                      <div className="min-w-0">
                        <div className="font-bold text-slate-900 text-xs truncate">
                          {item.displayName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate">
                          {item.user?.name ? `${item.user.name} • ` : ''}
                          {item.user?.email || 'N/A'}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Cột 2: SĐT & Kinh nghiệm */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div className="font-semibold text-slate-900 tabular-nums text-xs">
                      {item.phone || 'Chưa cập nhật'}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      {item.experienceYears ?? 0} năm kinh nghiệm
                    </div>
                  </td>

                  {/* Cột 3: Ngành nghề & Bán kính */}
                  <td className="px-5 py-4">
                    <div className="font-medium text-slate-900">
                      {item.categoryId || 'Đa ngành nghề'}
                    </div>
                    <div className="text-[12px] text-slate-500 mt-0.5">
                      Bán kính: {Number(radius).toFixed(1)} km
                    </div>
                  </td>

                  {/* Cột 4: 4 tài liệu */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                      <FileText className="w-3.5 h-3.5 text-emerald-700" />
                      <span>4/4 tài liệu</span>
                    </span>
                  </td>

                  {/* Cột 5: Ngày nộp */}
                  <td className="px-5 py-4 text-[12px] text-slate-500 tabular-nums whitespace-nowrap">
                    {dateStr}
                  </td>

                  {/* Cột 6: Trạng thái badge */}
                  <td className="px-5 py-4 whitespace-nowrap">
                    {item.verificationStatus === 'PENDING' && (
                      <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                        <span>Chờ duyệt</span>
                      </span>
                    )}
                    {item.verificationStatus === 'APPROVED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                        <Check className="w-3 h-3 text-emerald-700" />
                        <span>Đã duyệt</span>
                      </span>
                    )}
                    {item.verificationStatus === 'REJECTED' && (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-200">
                        <X className="w-3 h-3 text-red-600" />
                        <span>Đã từ chối</span>
                      </span>
                    )}
                  </td>

                  {/* Cột 7: Thao tác thẩm định */}
                  <td className="px-5 py-4 text-right whitespace-nowrap">
                    <button
                      type="button"
                      onClick={() => onOpenAppraisal(item)}
                      className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-emerald-700 hover:bg-emerald-50 hover:border-emerald-300 transition-colors shadow-xs cursor-pointer"
                    >
                      <span>Xem &amp; Xét duyệt</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Thanh Phân Trang (Pagination Footer) */}
      <div className="px-5 py-3.5 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-500">
        <div className="flex items-center gap-3">
          <span>
            Hiển thị{' '}
            <strong className="font-semibold text-slate-900 tabular-nums">
              {start}
            </strong>
            –
            <strong className="font-semibold text-slate-900 tabular-nums">
              {end}
            </strong>{' '}
            trong tổng số{' '}
            <strong className="font-semibold text-slate-900 tabular-nums">
              {totalItems}
            </strong>{' '}
            hồ sơ
          </span>
          <div className="h-4 w-px bg-slate-200 hidden sm:block" />
          <div className="flex items-center gap-1.5">
            <label
              htmlFor="page-size-select"
              className="text-xs text-slate-500 hidden sm:inline"
            >
              Hiển thị:
            </label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="px-2.5 py-1 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-900 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none cursor-pointer"
            >
              <option value={5}>5 / trang</option>
              <option value={10}>10 / trang</option>
              <option value={20}>20 / trang</option>
            </select>
          </div>
        </div>

        {/* Nút chuyển trang */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
            <button
              key={pageNum}
              type="button"
              onClick={() => onPageChange(pageNum)}
              className={`w-8 h-8 rounded-lg border text-xs font-semibold tabular-nums flex items-center justify-center transition cursor-pointer ${
                pageNum === currentPage
                  ? 'border-emerald-700 bg-emerald-700 text-white shadow-xs'
                  : 'border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              {pageNum}
            </button>
          ))}

          <button
            type="button"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className="w-8 h-8 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            title="Trang kế tiếp"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
