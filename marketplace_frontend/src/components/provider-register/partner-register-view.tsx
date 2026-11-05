'use client';

import React, { useState } from 'react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import {
  BadgeCheck,
  CheckCircle2,
  Hourglass,
  Info,
  MapPin,
  Send,
  Upload,
  XCircle,
  FileText,
  Sliders,
  LocateFixed,
  Edit,
  Handshake,
} from 'lucide-react';
import { useCurrentUser } from '@/hooks/use-auth';
import {
  useMyProviderProfile,
  useRegisterProvider,
} from '@/hooks/use-provider';
import { PriceUnit, RegisterProviderPayload } from '@/types/provider.types';
import { toast } from 'sonner';

// Dynamic import Leaflet map with no SSR
const LeafletServiceMap = dynamic(
  () => import('./leaflet-service-map'),
  {
    ssr: false,
    loading: () => (
      <div className="w-full h-80 rounded-xl border border-border bg-slate-100 flex items-center justify-center text-text-secondary text-sm">
        Đang tải bản đồ...
      </div>
    ),
  },
);

// Standard Haversine distance formula (km)
function haversineKm(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number,
): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function PartnerRegisterView() {
  const { data: currentUser } = useCurrentUser();
  const { data: myProfile } = useMyProviderProfile();
  const registerMutation = useRegisterProvider();

  // State management: view state can be driven by server profile or manual dev switcher
  const [devStateOverride, setDevStateOverride] = useState<
    'AUTO' | 'UNREGISTERED' | 'PENDING' | 'APPROVED' | 'REJECTED'
  >('AUTO');

  // Form Fields
  const [displayName, setDisplayName] = useState('Điện Lạnh Hoàng Nam');
  const [phone, setPhone] = useState('0912345882');
  const [experienceYears, setExperienceYears] = useState(6);
  const [categoryId, setCategoryId] = useState('Điện lạnh');
  const [bio, setBio] = useState(
    'Chuyên xử lý hệ thống điều hòa dân dụng & Multi Inverter Daikin, Panasonic, Mitsubishi. Thành thạo quy trình vệ sinh xịt áp lực, nạp gas R32/R410A chuẩn định lượng và khắc phục chảy nước dàn lạnh.',
  );

  // Initial Service draft
  const [serviceTitle, setServiceTitle] = useState(
    'Bảo trì & Vệ sinh điều hòa dân dụng',
  );
  const [basePrice, setBasePrice] = useState(250000);
  const [priceUnit, setPriceUnit] = useState<PriceUnit>('FIXED');
  const [durationMinutes, setDurationMinutes] = useState(60);

  // Service Area Map Coordinates & Radius
  const [areaName, setAreaName] = useState(
    'Vùng trung tâm TP.HCM (Q.1, Q.3, Q.4)',
  );
  const [centerLat, setCenterLat] = useState(10.776889);
  const [centerLng, setCenterLng] = useState(106.700897);
  const [radiusKm, setRadiusKm] = useState(5.0);
  const [isAreaActive, setIsAreaActive] = useState(true);

  // 4 KYC Document files state
  const [documents, setDocuments] = useState({
    doc1: {
      name: 'cccd_mat_truoc_hoangnam.jpg',
      size: '1.8 MB',
      type: 'ID_CARD_FRONT',
      url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    doc2: {
      name: 'cccd_mat_sau_hoangnam.jpg',
      size: '1.9 MB',
      type: 'ID_CARD_BACK',
      url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    doc3: {
      name: 'chung_chi_nghe_dien_lanh_spkt.pdf',
      size: '2.4 MB',
      type: 'CERTIFICATE',
      url: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    doc4: {
      name: 'anh_chan_dung_do_nghe.jpg',
      size: '3.1 MB',
      type: 'TOOLKIT_PHOTO',
      url: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
    },
  });

  // Haversine test tool result
  const [haversineResult, setHaversineResult] = useState<{
    tested: boolean;
    eligible: boolean;
    distanceKm: number;
    addressText: string;
  } | null>(null);

  // Derive active view state
  let currentViewState: 'UNREGISTERED' | 'PENDING' | 'APPROVED' | 'REJECTED' = 'UNREGISTERED';
  if (devStateOverride !== 'AUTO') {
    currentViewState = devStateOverride;
  } else if (myProfile) {
    if (myProfile.verificationStatus === 'APPROVED') {
      currentViewState = 'APPROVED';
    } else if (myProfile.verificationStatus === 'REJECTED') {
      currentViewState = 'REJECTED';
    } else {
      currentViewState = 'PENDING';
    }
  }

  // File upload handler with size validation <= 10MB
  const handleFileUpload = (
    docKey: 'doc1' | 'doc2' | 'doc3' | 'doc4',
    e: React.ChangeEvent<HTMLInputElement>,
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      toast.error('Dung lượng tệp vượt quá 10MB! Vui lòng chọn tệp nhỏ hơn.');
      e.target.value = '';
      return;
    }

    const sizeMB = (file.size / (1024 * 1024)).toFixed(1) + ' MB';
    setDocuments((prev) => ({
      ...prev,
      [docKey]: {
        ...prev[docKey],
        name: file.name,
        size: sizeMB,
        url: URL.createObjectURL(file),
      },
    }));
    toast.success(`Đã chọn tệp: ${file.name}`);
  };

  // Test address against service area with Haversine formula (S12.2)
  const testSampleLocation = (
    cLat: number,
    cLng: number,
    addressText: string,
  ) => {
    const dist = haversineKm(centerLat, centerLng, cLat, cLng);
    const eligible = dist <= radiusKm;
    setHaversineResult({
      tested: true,
      eligible,
      distanceKm: parseFloat(dist.toFixed(2)),
      addressText,
    });
  };

  // GPS Geolocation
  const handleGetCurrentLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      toast.warning('Trình duyệt không hỗ trợ Geolocation');
      return;
    }
    toast.info('Đang lấy vị trí GPS...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setCenterLat(parseFloat(pos.coords.latitude.toFixed(6)));
        setCenterLng(parseFloat(pos.coords.longitude.toFixed(6)));
        toast.success('Đã cập nhật vị trí tâm theo GPS!');
      },
      () => {
        toast.warning('Không thể lấy vị trí hiện tại. Giữ tọa độ mặc định.');
      },
    );
  };

  // Submit Registration Form (S8.1)
  const handleSubmitRegistration = (e: React.FormEvent) => {
    e.preventDefault();

    if (!displayName.trim() || !phone.trim()) {
      toast.error('Vui lòng điền đầy đủ tên hiển thị và số điện thoại!');
      return;
    }

    const payload: RegisterProviderPayload = {
      displayName,
      phone,
      experienceYears: Number(experienceYears),
      categoryId,
      bio,
      initialService: {
        title: serviceTitle,
        basePrice: Number(basePrice),
        priceUnit,
        durationMinutes: Number(durationMinutes),
      },
      documents: [
        { documentType: documents.doc1.type, fileUrl: documents.doc1.url },
        { documentType: documents.doc2.type, fileUrl: documents.doc2.url },
        { documentType: documents.doc3.type, fileUrl: documents.doc3.url },
        { documentType: documents.doc4.type, fileUrl: documents.doc4.url },
      ],
      serviceArea: {
        areaName,
        centerLatitude: centerLat,
        centerLongitude: centerLng,
        radiusKm,
        isActive: isAreaActive,
      },
    };

    registerMutation.mutate(payload, {
      onSuccess: () => {
        setDevStateOverride('PENDING');
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
    });
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
      {/* HEADER & DEV PREVIEW SWITCHER */}
      <div className="mb-7 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-text-secondary text-xs mb-1">
            <Link href="/" className="hover:text-primary transition-colors">
              Trang chủ
            </Link>
            <span>/</span>
            <span className="text-text-primary font-medium">Hồ sơ đối tác</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-text-primary tracking-tight">
            Đăng Ký Nhà Cung Cấp
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Cung cấp thông tin chuyên môn, tài liệu xác minh và thiết lập vùng
            nhận dịch vụ.
          </p>
        </div>

        {/* DEV STATE SWITCHER */}
        <div className="inline-flex items-center p-1 bg-surface border border-border rounded-xl shadow-xs self-start sm:self-auto">
          <span className="px-2 text-[11px] font-bold text-text-muted uppercase tracking-wider hidden lg:inline-flex items-center gap-1">
            <Sliders className="w-3.5 h-3.5" />
            <span>Trạng thái xem:</span>
          </span>
          <button
            type="button"
            onClick={() => setDevStateOverride('UNREGISTERED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentViewState === 'UNREGISTERED'
                ? 'bg-primary text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            1. Chưa đăng ký
          </button>
          <button
            type="button"
            onClick={() => setDevStateOverride('PENDING')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentViewState === 'PENDING'
                ? 'bg-amber-500 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            2. Chờ duyệt
          </button>
          <button
            type="button"
            onClick={() => setDevStateOverride('APPROVED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentViewState === 'APPROVED'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            3. Đã duyệt
          </button>
          <button
            type="button"
            onClick={() => setDevStateOverride('REJECTED')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              currentViewState === 'REJECTED'
                ? 'bg-red-500 text-white shadow-xs'
                : 'text-text-secondary hover:text-text-primary hover:bg-surface-muted'
            }`}
          >
            4. Bị từ chối
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* VIEW STATE 2: PENDING (Chờ duyệt)                                         */}
      {/* ========================================================================= */}
      {currentViewState === 'PENDING' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl border border-amber-200 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center shrink-0 border border-amber-200">
                <Hourglass className="w-7 h-7 animate-pulse" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">
                    Hồ sơ đăng ký đang chờ Admin xét duyệt
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />
                    Đang chờ
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                  Hồ sơ của bạn đã được tiếp nhận vào hàng đợi kiểm duyệt của
                  Ban Quản trị. Quá trình thẩm định thông tin và tài liệu thường
                  diễn ra trong vòng <strong>24 – 48 giờ làm việc</strong>. Bạn sẽ
                  nhận được thông báo ngay khi hồ sơ được phê duyệt.
                </p>
              </div>
            </div>

            {/* Tóm tắt thông tin đã nộp */}
            <div className="mt-6 pt-6 border-t border-border grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border">
                <span className="text-[11px] font-bold text-text-muted uppercase">
                  Tên hiển thị Nhà cung cấp
                </span>
                <p className="text-sm font-semibold text-text-primary mt-1">
                  {myProfile?.displayName || displayName}
                </p>
              </div>
              <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border">
                <span className="text-[11px] font-bold text-text-muted uppercase">
                  Số điện thoại nhận việc
                </span>
                <p className="text-sm font-semibold text-text-primary mt-1">
                  {myProfile?.phone || phone}
                </p>
              </div>
              <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border">
                <span className="text-[11px] font-bold text-text-muted uppercase">
                  Kinh nghiệm &amp; Ngành nghề
                </span>
                <p className="text-sm font-semibold text-text-primary mt-1">
                  {(myProfile?.experienceYears ?? experienceYears) + ' năm'} •{' '}
                  {myProfile?.categoryId || categoryId}
                </p>
              </div>
              <div className="p-3.5 bg-surface-muted/60 rounded-xl border border-border">
                <span className="text-[11px] font-bold text-text-muted uppercase">
                  Vùng phục vụ ban đầu
                </span>
                <p className="text-sm font-semibold text-text-primary mt-1">
                  Bán kính {radiusKm.toFixed(1)} km quanh tâm (Q.1, TP.HCM)
                </p>
              </div>
            </div>

            {/* Trạng thái 4 tài liệu đã nộp */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-text-secondary mb-3">
                Tài liệu đang chờ thẩm định (4/4 tài liệu)
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'CCCD / CMND Mặt trước', name: documents.doc1.name },
                  { label: 'CCCD / CMND Mặt sau', name: documents.doc2.name },
                  {
                    label: 'Chứng chỉ nghề / Bằng cấp kỹ thuật',
                    name: documents.doc3.name,
                  },
                  {
                    label: 'Ảnh chân dung & Đồ nghề tác nghiệp',
                    name: documents.doc4.name,
                  },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-surface rounded-xl border border-border flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-primary" />
                      <span className="text-xs font-medium text-text-primary">
                        {doc.label}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                      Chờ duyệt
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Links */}
            <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-text-muted">
                Mã định danh hồ sơ:{' '}
                <span className="font-mono text-text-secondary">
                  #{myProfile?.id?.slice(0, 8) || 'TF-REG-2026'}
                </span>
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors"
                >
                  Về Trang chủ
                </Link>
                <Link
                  href="/account"
                  className="px-4 py-2 rounded-lg bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                >
                  <span>Về Trang tài khoản</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STATE: APPROVED (Đã được Admin phê duyệt & Cấp quyền)                */}
      {/* ========================================================================= */}
      {currentViewState === 'APPROVED' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl border border-emerald-300 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0 border border-emerald-200">
                <CheckCircle2 className="w-7 h-7 text-emerald-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-slate-900">
                    Hồ sơ Nhà cung cấp đã được phê duyệt thành công!
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    Đã kích hoạt • Đã duyệt
                  </span>
                </div>
                <p className="text-sm text-slate-600 mt-1.5 leading-relaxed">
                  Chúc mừng bạn! Hồ sơ đăng ký và các tài liệu xác minh danh tính của bạn đã được Quản trị viên thẩm định và phê duyệt chính thức. Tài khoản của bạn đã được nâng cấp lên vai trò <strong className="text-emerald-700 font-mono">Nhà cung cấp (Provider)</strong> và vùng phục vụ đã sẵn sàng tiếp nhận yêu cầu dịch vụ từ khách hàng.
                </p>
              </div>
            </div>

            {/* Tóm tắt thông tin đã duyệt */}
            <div className="mt-6 pt-6 border-t border-slate-200 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Tên hiển thị Nhà cung cấp
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {myProfile?.displayName || displayName}
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Số điện thoại nhận việc
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1 font-mono">
                  {myProfile?.phone || phone}
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Kinh nghiệm &amp; Ngành nghề
                </span>
                <p className="text-sm font-semibold text-slate-900 mt-1">
                  {(myProfile?.experienceYears ?? experienceYears) + ' năm'} •{' '}
                  {myProfile?.categoryId || categoryId}
                </p>
              </div>
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-[11px] font-bold text-slate-400 uppercase">
                  Vùng phục vụ hoạt động
                </span>
                <p className="text-sm font-semibold text-emerald-700 mt-1 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Bán kính {radiusKm.toFixed(1)} km quanh tâm</span>
                </p>
              </div>
            </div>

            {/* Trạng thái 4 tài liệu đã nộp */}
            <div className="mt-6">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-3 flex items-center gap-1.5">
                <BadgeCheck className="w-4 h-4 text-emerald-600" />
                <span>Hồ sơ tài liệu xác minh (4/4 tài liệu đã được thẩm định)</span>
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  { label: 'CCCD / CMND Mặt trước', name: documents.doc1.name },
                  { label: 'CCCD / CMND Mặt sau', name: documents.doc2.name },
                  {
                    label: 'Chứng chỉ nghề / Bằng cấp kỹ thuật',
                    name: documents.doc3.name,
                  },
                  {
                    label: 'Ảnh chân dung & Đồ nghề tác nghiệp',
                    name: documents.doc4.name,
                  },
                ].map((doc, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between shadow-xs"
                  >
                    <div className="flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-emerald-600" />
                      <span className="text-xs font-medium text-slate-800">
                        {doc.label}
                      </span>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      <span>Đã duyệt</span>
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Action Links */}
            <div className="mt-8 pt-6 border-t border-slate-200 flex flex-wrap items-center justify-between gap-4">
              <p className="text-xs text-slate-400">
                Mã định danh hồ sơ:{' '}
                <span className="font-mono text-slate-700 font-semibold">
                  #{myProfile?.id?.slice(0, 8) || 'TF-PRO-001'}
                </span>{' '}
                • Trạng thái:{' '}
                <span className="font-semibold text-emerald-700">Đã duyệt</span>
              </p>
              <div className="flex items-center gap-3">
                <Link
                  href="/"
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-900 hover:bg-slate-50 transition-colors"
                >
                  Về Trang chủ
                </Link>
                {myProfile?.id && (
                  <Link
                    href={`/providers/${myProfile.id}`}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-colors inline-flex items-center gap-1.5 shadow-sm"
                  >
                    <BadgeCheck className="w-4 h-4" />
                    <span>Xem Hồ sơ công khai</span>
                  </Link>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STATE 3: REJECTED (Bị từ chối)                                       */}
      {/* ========================================================================= */}
      {currentViewState === 'REJECTED' && (
        <div className="space-y-6 animate-in fade-in duration-200">
          <div className="bg-surface rounded-2xl border border-red-300 p-6 sm:p-8 shadow-sm">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-200">
                <XCircle className="w-7 h-7" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-xl font-bold text-text-primary">
                    Hồ sơ đăng ký Nhà cung cấp đã bị từ chối
                  </h2>
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                    Bị từ chối
                  </span>
                </div>
                <p className="text-sm text-text-secondary mt-1.5 leading-relaxed">
                  Ban Quản trị TrustFix đã xem xét hồ sơ của bạn nhưng chưa thể
                  phê duyệt do một số thông tin hoặc tài liệu chưa đạt yêu cầu
                  theo quy chuẩn.
                </p>
              </div>
            </div>

            {/* Khung lý do từ chối cụ thể */}
            <div className="mt-6 p-4 sm:p-5 rounded-xl bg-red-50/70 border border-red-200">
              <div className="flex items-center gap-2 text-red-700 font-bold text-xs uppercase tracking-wider mb-1.5">
                <Info className="w-4 h-4" />
                <span>Lý do từ chối từ Ban Quản trị:</span>
              </div>
              <p className="text-sm text-text-primary font-medium leading-relaxed">
                &ldquo;
                {myProfile?.rejectionReason ||
                  'Ảnh chụp CCCD mặt sau bị mờ không đọc được thông tin số hiệu và mã bảo mật; chứng chỉ nghề chưa có mộc hợp lệ. Vui lòng chụp lại rõ nét dưới ánh sáng tự nhiên và nộp lại hồ sơ.'}
                &rdquo;
              </p>
            </div>

            {/* Action Nộp lại hồ sơ */}
            <div className="mt-8 pt-6 border-t border-border flex flex-wrap items-center justify-between gap-4">
              <Link
                href="/"
                className="text-xs text-text-secondary hover:text-text-primary transition-colors"
              >
                ← Quay lại trang chủ khách hàng
              </Link>
              <button
                type="button"
                onClick={() => {
                  setDevStateOverride('UNREGISTERED');
                  toast.info(
                    'Đã mở lại biểu mẫu với dữ liệu cũ để bạn cập nhật tài liệu!',
                  );
                }}
                className="px-5 py-2.5 rounded-xl bg-primary hover:bg-primary-hover text-white text-xs font-bold transition-all shadow-sm inline-flex items-center gap-2"
              >
                <Edit className="w-4 h-4" />
                <span>Chỉnh sửa &amp; Gửi lại hồ sơ</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* VIEW STATE 1: UNREGISTERED (Form đăng ký mới - S8.1)                      */}
      {/* ========================================================================= */}
      {currentViewState === 'UNREGISTERED' && (
        <div className="space-y-8 animate-in fade-in duration-200">
          {/* BANNER TÀI KHOẢN LIÊN KẾT */}
          <section className="bg-primary-light/60 rounded-2xl border border-primary/20 p-5 sm:p-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="relative">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  className="w-14 h-14 rounded-full object-cover border-2 border-primary/30 shadow-xs"
                  alt={currentUser?.name || 'User'}
                  src={
                    currentUser?.image ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                  }
                />
                <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-primary text-white flex items-center justify-center text-[10px] ring-2 ring-white">
                  ✓
                </span>
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-base font-bold text-text-primary">
                    {currentUser?.name || 'Khách hàng'}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {currentUser?.email || 'email@example.com'}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1">
                  Hồ sơ Nhà cung cấp sẽ được liên kết với tài khoản này. Sau khi
                  Admin phê duyệt, vai trò sẽ được nâng thành{' '}
                  <strong className="text-primary font-bold">
                    Nhà cung cấp
                  </strong>
                  .
                </p>
              </div>
            </div>
          </section>

          <form onSubmit={handleSubmitRegistration} className="space-y-8">
            {/* KHỐI 1: THÔNG TIN HỒ SƠ */}
            <section className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-5 border-b border-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-sm">
                    1
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">
                      Thông Tin Nhà Cung Cấp
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Tên thương hiệu hoạt động, kinh nghiệm làm việc và ngành
                      nghề chính
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full border border-primary/20">
                  Bắt buộc
                </span>
              </div>

              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                      Tên hiển thị Nhà cung cấp <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={150}
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      placeholder="VD: Điện Lạnh Hoàng Nam"
                    />
                    <p className="text-[11px] text-text-muted mt-1.5">
                      Tên này sẽ hiển thị công khai trên danh bạ dịch vụ.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                      Số điện thoại nhận việc <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="tel"
                      required
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                      placeholder="VD: 0912345882"
                    />
                    <p className="text-[11px] text-text-muted mt-1.5">
                      Số liên hệ trực tiếp khi khách hàng đặt lịch dịch vụ.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                      Số năm kinh nghiệm <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      required
                      min={0}
                      max={50}
                      value={experienceYears}
                      onChange={(e) =>
                        setExperienceYears(Number(e.target.value))
                      }
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                      Ngành nghề dịch vụ chính <span className="text-red-500">*</span>
                    </label>
                    <select
                      value={categoryId}
                      onChange={(e) => setCategoryId(e.target.value)}
                      className="w-full h-11 px-3.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition cursor-pointer"
                    >
                      <option value="Điện lạnh">
                        1. Điện lạnh (Điều hòa, máy giặt, tủ lạnh)
                      </option>
                      <option value="Điện nước">
                        2. Điện nước (Ống nước, máy bơm, chập điện)
                      </option>
                      <option value="Sửa khóa & Cửa">
                        3. Sửa khóa &amp; Cửa (Smart lock, cửa cuốn)
                      </option>
                      <option value="Thiết bị bếp & Gia dụng">
                        4. Thiết bị bếp &amp; Gia dụng
                      </option>
                      <option value="Điện dân dụng & Chiếu sáng">
                        5. Điện dân dụng &amp; Chiếu sáng
                      </option>
                      <option value="Máy tính & Mạng">
                        6. Máy tính &amp; Mạng (Wifi, Camera)
                      </option>
                      <option value="Thông tắc & Chống thấm">
                        7. Thông tắc &amp; Chống thấm
                      </option>
                      <option value="Vệ sinh công nghiệp">
                        8. Vệ sinh công nghiệp
                      </option>
                    </select>
                  </div>
                </div>

                {/* Dịch vụ khởi tạo ban đầu */}
                <div className="p-4 rounded-xl bg-surface-muted/60 border border-border space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-text-primary uppercase tracking-wider">
                    <Handshake className="w-4 h-4 text-primary" />
                    <span>Thiết lập dịch vụ khởi tạo khi được phê duyệt</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-4">
                    <div className="sm:col-span-5">
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                        Tên dịch vụ ban đầu <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        required
                        value={serviceTitle}
                        onChange={(e) => setServiceTitle(e.target.value)}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="sm:col-span-3">
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                        Giá cơ sở (VNĐ) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={0}
                        step={10000}
                        value={basePrice}
                        onChange={(e) => setBasePrice(Number(e.target.value))}
                        className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                        Đơn vị tính <span className="text-red-500">*</span>
                      </label>
                      <select
                        value={priceUnit}
                        onChange={(e) =>
                          setPriceUnit(e.target.value as PriceUnit)
                        }
                        className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary cursor-pointer"
                      >
                        <option value="FIXED">Trọn gói</option>
                        <option value="HOURLY">Theo giờ</option>
                        <option value="FROM">Từ mức giá</option>
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                        Thời lượng (phút) <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="number"
                        required
                        min={15}
                        step={15}
                        value={durationMinutes}
                        onChange={(e) =>
                          setDurationMinutes(Number(e.target.value))
                        }
                        className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                      />
                    </div>
                  </div>
                </div>

                {/* bio */}
                <div>
                  <label className="block text-xs font-bold text-text-primary uppercase tracking-wider mb-2">
                    Giới thiệu tay nghề &amp; Kinh nghiệm làm việc
                  </label>
                  <textarea
                    rows={3}
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    className="w-full p-3.5 rounded-xl border border-border bg-surface text-text-primary text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary transition resize-none leading-relaxed"
                  />
                </div>
              </div>
            </section>

            {/* KHỐI 2: TÀI LIỆU XÁC MINH (4 Tài liệu KYC) */}
            <section className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-5 border-b border-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-sm">
                    2
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">
                      Tài Liệu Xác Minh
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Tải lên tệp ảnh hoặc PDF rõ nét, dung lượng tối đa 10MB
                      mỗi tệp
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full border border-primary/20">
                  4 / 4 tài liệu
                </span>
              </div>

              <div className="space-y-4">
                {[
                  {
                    key: 'doc1' as const,
                    title: '1. CCCD / CMND Mặt trước',
                    badge: 'ID_CARD_FRONT',
                  },
                  {
                    key: 'doc2' as const,
                    title: '2. CCCD / CMND Mặt sau',
                    badge: 'ID_CARD_BACK',
                  },
                  {
                    key: 'doc3' as const,
                    title: '3. Chứng chỉ nghề / Bằng cấp kỹ thuật',
                    badge: 'CERTIFICATE',
                  },
                  {
                    key: 'doc4' as const,
                    title: '4. Ảnh chụp chân dung & Bộ đồ nghề tác nghiệp',
                    badge: 'TOOLKIT_PHOTO',
                  },
                ].map((item) => (
                  <div
                    key={item.key}
                    className="p-4 rounded-xl border border-border bg-surface hover:border-primary/40 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-start sm:items-center gap-3.5">
                      <div className="w-10 h-10 rounded-lg bg-primary-light text-primary flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-text-primary">
                            {item.title}
                          </span>
                          <span className="text-red-500 font-bold">*</span>
                          <span className="text-[10px] font-mono text-text-muted bg-slate-100 px-1.5 py-0.5 rounded">
                            {item.badge}
                          </span>
                        </div>
                        <p className="text-xs text-text-secondary mt-0.5">
                          Tệp hiện tại:{' '}
                          <span className="font-semibold text-text-primary">
                            {documents[item.key].name}
                          </span>{' '}
                          ({documents[item.key].size})
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3 self-end sm:self-auto">
                      <label className="px-3 py-1.5 rounded-lg border border-border text-xs font-bold text-text-secondary hover:text-text-primary hover:bg-surface-muted transition-colors cursor-pointer inline-flex items-center gap-1.5">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Chọn tệp khác</span>
                        <input
                          type="file"
                          accept=".jpg,.jpeg,.png,.pdf"
                          className="hidden"
                          onChange={(e) => handleFileUpload(item.key, e)}
                        />
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* KHỐI 3: KHU VỰC PHỤC VỤ (Leaflet Map & Haversine Tool) */}
            <section className="bg-surface rounded-2xl border border-border p-6 sm:p-8 shadow-sm">
              <div className="flex items-center justify-between pb-5 border-b border-border mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-primary-light text-primary flex items-center justify-center font-bold text-sm">
                    3
                  </div>
                  <div>
                    <h2 className="text-base font-bold text-text-primary">
                      Thiết Lập Khu Vực Phục Vụ
                    </h2>
                    <p className="text-xs text-text-secondary mt-0.5">
                      Cấu hình tọa độ tâm và bán kính hoạt động từ 2.0 km đến
                      20.0 km
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold text-primary bg-primary-light px-2.5 py-1 rounded-full border border-primary/20">
                  Leaflet Map
                </span>
              </div>

              {/* MAP COMPONENT */}
              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-text-secondary flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-primary" />
                    <span>
                      Bấm trên bản đồ hoặc kéo marker để thay đổi tọa độ tâm
                    </span>
                  </span>
                  <button
                    type="button"
                    onClick={handleGetCurrentLocation}
                    className="text-primary hover:text-primary-hover font-bold inline-flex items-center gap-1"
                  >
                    <LocateFixed className="w-4 h-4" />
                    <span>Lấy vị trí hiện tại</span>
                  </button>
                </div>

                <LeafletServiceMap
                  centerLat={centerLat}
                  centerLng={centerLng}
                  radiusKm={radiusKm}
                  onCenterChange={(lat, lng) => {
                    setCenterLat(lat);
                    setCenterLng(lng);
                  }}
                />
              </div>

              {/* CẤU HÌNH BÁN KÍNH VÀ TỌA ĐỘ */}
              <div className="p-5 rounded-xl bg-surface-muted/60 border border-border space-y-5">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                      Ghi chú / Tên gợi nhớ vùng <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={areaName}
                      onChange={(e) => setAreaName(e.target.value)}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                      Tọa độ Vĩ độ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={centerLat}
                      onChange={(e) => setCenterLat(parseFloat(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-text-secondary uppercase mb-1">
                      Tọa độ Kinh độ <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="number"
                      step="0.000001"
                      value={centerLng}
                      onChange={(e) => setCenterLng(parseFloat(e.target.value))}
                      className="w-full h-10 px-3 rounded-lg border border-border bg-surface text-xs text-text-primary font-mono focus:outline-none focus:ring-1 focus:ring-primary"
                    />
                  </div>
                </div>

                {/* Thanh trượt bán kính 2km - 20km */}
                <div className="pt-2">
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span>Bán kính phục vụ:</span>
                      <span className="font-mono text-primary text-sm font-bold">
                        {radiusKm.toFixed(1)} km
                      </span>
                    </label>
                    <span className="text-[11px] text-text-muted font-medium">
                      Giới hạn quy chuẩn: 2.0 km – 20.0 km
                    </span>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs font-semibold text-text-secondary">
                      2 km
                    </span>
                    <input
                      type="range"
                      min={2}
                      max={20}
                      step={0.5}
                      value={radiusKm}
                      onChange={(e) => setRadiusKm(parseFloat(e.target.value))}
                      className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-primary"
                    />
                    <span className="text-xs font-semibold text-text-secondary">
                      20 km
                    </span>
                  </div>
                </div>

                {/* Switch is_active */}
                <div className="pt-3 border-t border-border flex items-center justify-between">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isAreaActive}
                      onChange={(e) => setIsAreaActive(e.target.checked)}
                      className="w-4 h-4 rounded text-primary focus:ring-primary/20 accent-primary cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-text-primary">
                      Kích hoạt vùng phục vụ này
                    </span>
                  </label>
                </div>
              </div>

              {/* HAVERSINE CHECKER TOOL (AC S12.2) */}
              <div className="mt-7 p-4 sm:p-5 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-primary" />
                    <span className="text-xs font-bold uppercase tracking-wider text-text-primary">
                      Kiểm tra địa chỉ khách hàng nằm trong vùng phục vụ (AC
                      S12.2)
                    </span>
                  </div>
                </div>
                <p className="text-xs text-text-secondary">
                  Công cụ tính khoảng cách thực tế (công thức Haversine). Bấm thử
                  2 vị trí mẫu để kiểm tra tính hợp lệ:
                </p>

                <div className="flex flex-wrap items-center gap-2.5 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      testSampleLocation(
                        10.785,
                        106.695,
                        'Nguyễn Thị Minh Khai, P. Bến Nghé, Quận 1',
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white border border-border hover:border-primary text-text-primary text-xs font-medium transition shadow-xs flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>Vị trí 1: Quận 1 (~1.1 km - Hợp lệ)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      testSampleLocation(
                        10.885,
                        106.595,
                        'Thị trấn Hóc Môn, TP.HCM',
                      )
                    }
                    className="px-3 py-1.5 rounded-lg bg-white border border-border hover:border-red-400 text-text-primary text-xs font-medium transition shadow-xs flex items-center gap-1.5"
                  >
                    <span className="w-2 h-2 rounded-full bg-red-500" />
                    <span>Vị trí 2: Hóc Môn (~16.8 km - Ngoài vùng)</span>
                  </button>
                </div>

                {haversineResult && (
                  <div
                    className={`p-3.5 rounded-lg text-xs leading-relaxed mt-2 ${
                      haversineResult.eligible
                        ? 'bg-emerald-50 border border-emerald-200 text-emerald-950'
                        : 'bg-red-50 border border-red-200 text-red-950'
                    }`}
                  >
                    <div className="flex items-start gap-2.5">
                      {haversineResult.eligible ? (
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
                      ) : (
                        <XCircle className="w-4 h-4 text-red-600 mt-0.5 shrink-0" />
                      )}
                      <div>
                        <div className="font-bold flex items-center gap-2">
                          <span>
                            eligible: {String(haversineResult.eligible)} —{' '}
                            {haversineResult.eligible
                              ? 'Địa chỉ NẰM TRONG vùng phục vụ'
                              : 'Địa chỉ NGOÀI vùng phục vụ'}
                          </span>
                          <span
                            className={`font-mono text-[10px] px-1.5 py-0.5 rounded font-bold ${
                              haversineResult.eligible
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-red-100 text-red-800'
                            }`}
                          >
                            {haversineResult.distanceKm} km{' '}
                            {haversineResult.eligible ? '<=' : '>'}{' '}
                            {radiusKm.toFixed(1)} km
                          </span>
                        </div>
                        <p className="mt-0.5 font-medium">
                          Địa chỉ: {haversineResult.addressText}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </section>

            {/* KHỐI 4: CAM KẾT & NÚT GỬI */}
            <div className="p-5 rounded-2xl bg-surface border border-border shadow-xs">
              <label className="flex items-start gap-3.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  required
                  defaultChecked
                  className="mt-0.5 w-4 h-4 rounded border-border text-primary focus:ring-primary/20 accent-primary cursor-pointer shrink-0"
                />
                <div className="text-xs text-text-secondary leading-relaxed">
                  <span className="font-bold text-text-primary">
                    Cam kết tính chính xác của hồ sơ:
                  </span>{' '}
                  Tôi xác nhận các thông tin và tài liệu cung cấp ở trên là chính
                  xác, đồng thời đồng ý tuân thủ quy định dành cho Nhà cung cấp
                  trên nền tảng TrustFix.
                </div>
              </label>
            </div>

            <div className="pt-2 text-center">
              <button
                type="submit"
                disabled={registerMutation.isPending}
                className="w-full sm:w-auto min-w-[320px] px-8 py-3.5 rounded-xl bg-primary hover:bg-primary-hover active:scale-[0.99] text-white text-sm font-bold shadow-md hover:shadow-lg transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Send className="w-4 h-4" />
                <span>
                  {registerMutation.isPending
                    ? 'Đang gửi hồ sơ...'
                    : 'Gửi hồ sơ đăng ký Nhà cung cấp'}
                </span>
              </button>
              <p className="text-[11px] text-text-muted mt-2">
                Thời gian phản hồi dự kiến: 24 - 48h
              </p>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

