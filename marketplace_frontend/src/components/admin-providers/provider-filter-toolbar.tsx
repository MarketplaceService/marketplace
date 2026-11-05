'use client';

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';

interface ProviderFilterToolbarProps {
  search: string;
  category: string;
  status: string;
  onSearchChange: (val: string) => void;
  onCategoryChange: (val: string) => void;
  onStatusChange: (val: string) => void;
  onReset: () => void;
}

export function ProviderFilterToolbar({
  search,
  category,
  status,
  onSearchChange,
  onCategoryChange,
  onStatusChange,
  onReset,
}: ProviderFilterToolbarProps) {
  return (
    <section className="bg-white rounded-xl border border-slate-200 p-4 mb-6 shadow-xs space-y-4">
      <div className="flex flex-col lg:flex-row gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-900 placeholder:text-slate-400 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none transition"
            placeholder="Tìm theo tên hiển thị, họ tên, email, SĐT..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Dropdown */}
          <div className="relative min-w-[220px]">
            <select
              value={category}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="w-full appearance-none px-3.5 py-2 rounded-lg border border-slate-200 bg-white text-xs text-slate-800 focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 outline-none pr-9 cursor-pointer"
            >
              <option value="">Ngành nghề: Tất cả</option>
              <option value="Điện lạnh">Điện lạnh</option>
              <option value="Điện nước">Điện nước</option>
              <option value="Sửa khóa & Cửa">Sửa khóa &amp; Cửa</option>
              <option value="Thiết bị bếp & Gia dụng">
                Thiết bị bếp &amp; Gia dụng
              </option>
            </select>
          </div>

          {/* Reset button */}
          <button
            type="button"
            onClick={onReset}
            className="px-3 py-2 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-500 hover:text-slate-800 transition cursor-pointer"
            title="Đặt lại bộ lọc"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pt-1 border-t border-slate-100">
        <span className="text-xs text-slate-500 font-medium mr-2 shrink-0">
          Trạng thái:
        </span>
        {[
          { label: 'Tất cả', val: 'ALL' },
          { label: 'Chờ duyệt', val: 'PENDING' },
          { label: 'Đã duyệt', val: 'APPROVED' },
          { label: 'Đã từ chối', val: 'REJECTED' },
        ].map((pill) => (
          <button
            key={pill.val}
            type="button"
            onClick={() => onStatusChange(pill.val)}
            className={`px-3 py-1 rounded-full text-xs transition shrink-0 cursor-pointer ${
              status === pill.val
                ? 'bg-emerald-600 text-white font-bold'
                : 'text-slate-600 font-medium bg-slate-100 hover:bg-slate-200'
            }`}
          >
            {pill.label}
          </button>
        ))}
      </div>
    </section>
  );
}
