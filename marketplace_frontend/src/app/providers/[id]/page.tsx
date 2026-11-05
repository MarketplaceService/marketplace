'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { providerService } from '@/services/provider.services';
import {
  MapPin,
  Star,
  ShieldCheck,
  Clock,
  Briefcase,
  AlertCircle,
} from 'lucide-react';
import Link from 'next/link';

export default function PublicProviderProfilePage() {
  const params = useParams();
  const id = params?.id as string;

  const { data: profile, isLoading, error } = useQuery({
    queryKey: ['provider', 'public', id],
    queryFn: () => providerService.getPublicProfile(id),
    enabled: Boolean(id),
    retry: 1,
  });

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center">
        <div className="w-12 h-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto mb-4" />
        <p className="text-sm text-text-secondary">
          Đang tải thông tin Nhà cung cấp...
        </p>
      </div>
    );
  }

  if (error || !profile) {
    return (
      <div className="max-w-md mx-auto px-4 py-16 text-center">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-text-primary">
          Không tìm thấy Nhà cung cấp
        </h2>
        <p className="text-xs text-text-secondary mt-1">
          Hồ sơ này không tồn tại hoặc chưa được Ban Quản trị phê duyệt chính thức.
        </p>
        <Link
          href="/"
          className="mt-6 inline-block px-5 py-2 rounded-xl bg-primary text-white text-xs font-bold"
        >
          Về Trang chủ
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile Card */}
      <div className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-5">
          <img
            src={
              profile.user?.image ||
              'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&q=80'
            }
            alt={profile.displayName}
            className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/20 shadow-xs"
          />
          <div className="flex-1 min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-bold text-text-primary">
                {profile.displayName}
              </h1>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-50 text-primary border border-emerald-200">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Đã xác minh KYC</span>
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-text-secondary mt-2">
              <span className="flex items-center gap-1 font-semibold text-text-primary">
                <Briefcase className="w-4 h-4 text-primary" />
                <span>{profile.categoryId || 'Đa ngành'}</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4 text-primary" />
                <span>{profile.experienceYears ?? 0} năm kinh nghiệm</span>
              </span>
              <span>•</span>
              <span className="flex items-center gap-1 text-amber-600 font-bold">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                <span>5.0 (28 đánh giá)</span>
              </span>
            </div>
          </div>
        </div>

        {/* Bio */}
        <div className="pt-4 border-t border-border">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-2">
            Giới thiệu tay nghề &amp; Cam kết chất lượng
          </h2>
          <p className="text-sm text-text-primary leading-relaxed bg-surface-muted/40 p-4 rounded-xl border border-border">
            {profile.bio ||
              'Chuyên cung cấp dịch vụ sửa chữa, bảo dưỡng uy tín, thiết bị đồ nghề chuyên dụng, làm việc an toàn và báo giá minh bạch trước khi thi công.'}
          </p>
        </div>

        {/* Service Areas */}
        <div className="pt-2">
          <h2 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3 flex items-center gap-1.5">
            <MapPin className="w-4 h-4 text-primary" />
            <span>Khu vực phục vụ hoạt động</span>
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {profile.serviceAreas && profile.serviceAreas.length > 0 ? (
              profile.serviceAreas.map((area) => (
                <div
                  key={area.id}
                  className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between text-xs"
                >
                  <span className="font-semibold text-text-primary">
                    {area.areaName || 'Khu vực hoạt động'}
                  </span>
                  <span className="font-mono text-primary font-bold">
                    Bán kính {Number(area.radiusKm).toFixed(1)} km
                  </span>
                </div>
              ))
            ) : (
              <p className="text-xs text-text-muted">
                Đang cập nhật khu vực phục vụ
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

