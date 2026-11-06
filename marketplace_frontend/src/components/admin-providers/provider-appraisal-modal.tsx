'use client';

import React, { useState, useRef } from 'react';
import {
  X,
  Hourglass,
  Check,
  CheckCircle2,
  XCircle,
  MapPin,
  User,
  ShieldCheck,
  AlertTriangle,
  RotateCcw,
} from 'lucide-react';
import { ProviderProfile } from '@/types/provider.types';

interface ProviderAppraisalModalProps {
  provider: ProviderProfile | null;
  isOpen: boolean;
  onClose: () => void;
  onApprove: (id: string) => void;
  onReject: (id: string, reason: string) => void;
  isApproving?: boolean;
  isRejecting?: boolean;
}

export function ProviderAppraisalModal({
  provider,
  isOpen,
  onClose,
  onApprove,
  onReject,
  isApproving = false,
  isRejecting = false,
}: ProviderAppraisalModalProps) {
  const [rejectReason, setRejectReason] = useState(
    () => provider?.rejectionReason || '',
  );
  const [rejectError, setRejectError] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  const rejectBoxRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  if (!isOpen || !provider) return null;

  const area = provider.serviceAreas?.[0];
  const radius = area?.radiusKm ?? 5.0;
  const coordsStr = area
    ? `${Number(area.centerLatitude).toFixed(4)}, ${Number(area.centerLongitude).toFixed(4)}`
    : '10.7769, 106.7009';

  // 4 KYC documents mapped from provider.documents or default samples
  const defaultDocs = [
    {
      title: '1. CCCD / CMND Mặt trước',
      type: 'Mặt trước CCCD',
      file: 'cccd_mat_truoc.jpg',
      status:
        provider.documents?.find((d) => d.documentType === 'ID_CARD_FRONT')
          ?.status || provider.verificationStatus,
      img:
        provider.documents?.find((d) => d.documentType === 'ID_CARD_FRONT')
          ?.fileUrl ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuBoKNyZ9FxRC7SEYhOD23KcZPMJdpHHmMYKFTGHiAYscF-BjsidSgSTBsdCvnuqGv80WMZhYNkLcVII3oHaV4xO1mMq63cJncuubXwyBwPZNMgMGhVWSCCUabq3W8UkMWaOXwTsRNx9jqWU2_6ltq4mXM1Pq2vnkHj_PRCSbDLfdvrbBIA2jRH0rm6IaVFPhsRkaT7ECC9ZqNRcEVGtP4B3v0eQljE3t5ByOZvFraheM2wuNgqjBlaQVIS2AJ1l621BS5rj9xl6y8Rx',
    },
    {
      title: '2. CCCD / CMND Mặt sau',
      type: 'Mặt sau CCCD',
      file: 'cccd_mat_sau.jpg',
      status:
        provider.documents?.find((d) => d.documentType === 'ID_CARD_BACK')
          ?.status || provider.verificationStatus,
      img:
        provider.documents?.find((d) => d.documentType === 'ID_CARD_BACK')
          ?.fileUrl ||
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDKKe6FcPRW2y-tf0c9rFSlvUNUDSqEwrVtFkArRT3H7PmHFSMcWE3lQ5Gl-0lcsPpZpz4DcCGel6Iw00Kl-jMMNr4Y8c7p4SDUyx-j4IyRGEpxNNlN_MCGVOVKeJVJC3aeYJ5-Ee6siv92rSL6rTtvPY_opaJ-HxuOiXIrRMN0Y5gSkJ5wP5L_WpZzRb72UAS5mkpMx5qBYqZBLzxktG0lqSL_DKwF7W-X2IytCvk4V2EmcxhWnokYBy7gyfADtPfmNDC1E50ZGFKm',
    },
    {
      title: '3. Chứng chỉ nghề / Bằng cấp',
      type: 'Chứng chỉ nghề',
      file: 'chung_chi_dien_spkt.pdf',
      status:
        provider.documents?.find((d) => d.documentType === 'CERTIFICATE')
          ?.status || provider.verificationStatus,
      img:
        provider.documents?.find((d) => d.documentType === 'CERTIFICATE')
          ?.fileUrl ||
        'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: '4. Ảnh chân dung & Đồ nghề',
      type: 'Ảnh đồ nghề',
      file: 'anh_do_nghe_tac_nghiep.jpg',
      status:
        provider.documents?.find((d) => d.documentType === 'TOOLKIT_PHOTO')
          ?.status || provider.verificationStatus,
      img:
        provider.documents?.find((d) => d.documentType === 'TOOLKIT_PHOTO')
          ?.fileUrl ||
        'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleOpenRejectBox = () => {
    setShowRejectBox(true);
    setRejectReason(provider.rejectionReason || '');
    setRejectError('');
    setTimeout(() => {
      rejectBoxRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      textareaRef.current?.focus();
    }, 60);
  };

  const handleConfirmReject = () => {
    const trimmed = rejectReason.trim();
    if (!trimmed) {
      setRejectError('Vui lòng nhập lý do từ chối hồ sơ!');
      textareaRef.current?.focus();
      return;
    }
    setRejectError('');
    onReject(provider.id, trimmed);
    setShowRejectBox(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto animate-in fade-in duration-150">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-4xl my-auto overflow-hidden flex flex-col relative animate-in zoom-in-95 duration-150">
        {/* MODAL HEADER */}
        <div className="px-6 py-5 border-b border-slate-200 bg-white flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="relative">
              <img
                className="w-14 h-14 rounded-full object-cover border-2 border-emerald-500/20 shadow-xs"
                alt={provider.displayName}
                src={
                  provider.user?.image ||
                  'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=150&q=80'
                }
              />
              <span
                className={`absolute -bottom-1 -right-1 w-5 h-5 rounded-full text-white flex items-center justify-center text-[10px] ring-2 ring-white ${
                  provider.verificationStatus === 'APPROVED'
                    ? 'bg-emerald-600'
                    : provider.verificationStatus === 'REJECTED'
                      ? 'bg-red-500'
                      : 'bg-amber-500'
                }`}
              >
                {provider.verificationStatus === 'APPROVED' ? (
                  <Check className="w-3 h-3" />
                ) : provider.verificationStatus === 'REJECTED' ? (
                  <X className="w-3 h-3" />
                ) : (
                  <Hourglass className="w-3 h-3" />
                )}
              </span>
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900">
                  {provider.displayName}
                </h2>
                {provider.verificationStatus === 'PENDING' && (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
                    <span>Chờ duyệt</span>
                  </span>
                )}
                {provider.verificationStatus === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    <Check className="w-3 h-3 text-emerald-600" />
                    <span>Đã duyệt</span>
                  </span>
                )}
                {provider.verificationStatus === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                    <X className="w-3 h-3 text-red-600" />
                    <span>Đã từ chối</span>
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500 mt-0.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                <span>
                  Họ tên:{' '}
                  <strong className="text-slate-800 font-semibold">
                    {provider.user?.name || 'Chưa cập nhật'}
                  </strong>
                </span>
                <span>•</span>
                <span>{provider.user?.email}</span>
                <span>•</span>
                <span className="font-mono text-xs text-slate-400">
                  #{provider.id.slice(0, 8)}
                </span>
              </p>
            </div>
          </div>

          {/* Close button */}
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* MODAL BODY */}
        <div className="px-6 py-6 overflow-y-auto max-h-[calc(85vh-200px)] space-y-6 bg-slate-50">
          {/* PHẦN 1: THÔNG TIN HỒ SƠ & NGÀNH NGHỀ */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <User className="w-4 h-4 text-emerald-600" />
              <span>Thông tin hồ sơ &amp; Ngành nghề đăng ký</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Số điện thoại nhận việc
                </span>
                <p className="font-bold text-slate-800 mt-0.5 text-xs font-mono">
                  {provider.phone || 'Chưa cập nhật'}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Kinh nghiệm làm việc
                </span>
                <p className="font-bold text-slate-800 mt-0.5 text-xs">
                  {provider.experienceYears ?? 0} năm kinh nghiệm
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Ngành nghề chính
                </span>
                <p className="font-bold text-slate-800 mt-0.5 text-xs">
                  {provider.categoryId || 'Đa dịch vụ'}
                </p>
              </div>
            </div>

            {/* Dịch vụ khởi tạo */}
            <div className="p-3.5 bg-emerald-50/60 rounded-lg border border-emerald-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs">
                <div>
                <span className="text-[10px] font-bold text-emerald-800 uppercase">
                  Dịch vụ khởi tạo ban đầu
                </span>
                <p className="font-medium text-slate-800 mt-0.5">
                  Sửa chữa &amp; Bảo dưỡng thiết bị tại nhà
                </p>
              </div>
              <div className="text-left sm:text-right shrink-0">
                <span className="text-[10px] font-bold text-slate-500 uppercase">
                  Biểu giá cơ sở
                </span>
                <p className="font-bold text-emerald-700">
                  250.000 đ (Trọn gói) • 60 phút
                </p>
              </div>
            </div>

            {/* Giới thiệu tay nghề */}
            <div>
              <span className="text-[10px] font-bold text-slate-400 uppercase">
                Giới thiệu tay nghề &amp; Kinh nghiệm
              </span>
              <p className="text-xs text-slate-600 mt-1 bg-slate-50 p-3 rounded-lg border border-slate-200/80 leading-relaxed">
                {provider.bio ||
                  'Chuyên cung cấp dịch vụ sửa chữa chuyên nghiệp, kiểm tra kỹ thuật tận tình, bàn giao an toàn và bảo hành chu đáo.'}
              </p>
            </div>

            {/* Banner hiển thị nếu APPROVED hoặc REJECTED */}
            {provider.verificationStatus === 'APPROVED' && (
              <div className="p-3 rounded-lg text-xs bg-emerald-50 border border-emerald-200 text-emerald-950 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>
                  Hồ sơ đã được phê duyệt bởi Quản trị viên lúc{' '}
                  <strong>
                    {provider.approvedAt
                      ? new Date(provider.approvedAt).toLocaleString('vi-VN')
                      : 'Gần đây'}
                  </strong>
                  . Quyền tài khoản hiện tại:{' '}
                  <code className="font-mono font-bold text-emerald-700">
                    provider
                  </code>
                  .
                </span>
              </div>
            )}

            {provider.verificationStatus === 'REJECTED' && (
              <div className="p-3.5 rounded-xl text-xs bg-red-50 border border-red-200 text-slate-900 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div className="space-y-1">
                  <span className="font-bold text-red-700">
                    Lý do từ chối hồ sơ:
                  </span>
                  <p className="text-slate-800 font-medium">
                    {provider.rejectionReason ||
                      'Tài liệu xác minh chưa đạt yêu cầu theo quy chuẩn.'}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    Quyền tài khoản: <code className="font-mono text-slate-700 font-bold">customer</code>. Đối tác có thể cập nhật lại hồ sơ để gửi xét duyệt lại.
                  </p>
                </div>
              </div>
            )}
          </section>

          {/* PHẦN 2: KHU VỰC PHỤC VỤ (S12.1) */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
              <MapPin className="w-4 h-4 text-emerald-600" />
              <span>Khu vực phục vụ đăng ký</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Tọa độ tâm (Vĩ độ, Kinh độ)
                </span>
                <p className="font-mono text-xs font-bold text-slate-800 mt-0.5">
                  {coordsStr}
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Bán kính hoạt động
                </span>
                <p className="font-bold text-slate-800 mt-0.5">
                  {Number(radius).toFixed(1)} km
                </p>
              </div>
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200/80">
                <span className="text-[10px] font-bold text-slate-400 uppercase">
                  Trạng thái vùng
                </span>
                <p className="font-bold text-emerald-700 mt-0.5 flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500" />
                  <span>Đang hoạt động</span>
                </p>
              </div>
            </div>
          </section>

          {/* PHẦN 3: 4 TÀI LIỆU XÁC MINH KYC */}
          <section className="bg-white rounded-xl border border-slate-200 p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-600 uppercase tracking-wider">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Hồ sơ tài liệu xác minh (4 mục theo quy chuẩn)</span>
              </div>
              <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-2.5 py-0.5 rounded border border-slate-200">
                4/4 tài liệu đính kèm
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {defaultDocs.map((doc, idx) => (
                <div
                  key={idx}
                  className="p-3.5 rounded-xl border border-slate-200 bg-white flex flex-col justify-between space-y-3 group hover:border-emerald-500/50 transition shadow-xs"
                >
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-bold text-slate-800">
                      {doc.title}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        doc.status === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : doc.status === 'REJECTED'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {doc.status === 'APPROVED'
                        ? 'Đã duyệt'
                        : doc.status === 'REJECTED'
                          ? 'Đã từ chối'
                          : 'Chờ duyệt'}
                    </span>
                  </div>

                  <div className="aspect-[1.58/1] bg-slate-100 rounded-lg overflow-hidden border border-slate-200 relative">
                    <img
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      alt={doc.title}
                      src={doc.img}
                    />
                  </div>

                  <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                    <span className="truncate max-w-[180px] font-mono">
                      {doc.file}
                    </span>
                    <button
                      type="button"
                      onClick={() => setViewingImage(doc.img)}
                      className="text-emerald-600 hover:text-emerald-700 hover:underline font-bold cursor-pointer"
                    >
                      Xem lớn
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* KHUNG NHẬP LÝ DO TỪ CHỐI (HIỂN THỊ NGAY TRONG FORM KHI CLICK 'TỪ CHỐI HỒ SƠ') */}
          {showRejectBox && (
            <div
              ref={rejectBoxRef}
              className="p-5 rounded-2xl bg-red-50/50 border border-red-200 space-y-3 animate-in fade-in duration-200 shadow-xs"
            >
              <label
                htmlFor="reject-reason-input"
                className="block text-xs font-bold text-red-600 uppercase tracking-wider"
              >
                Nhập lý do từ chối hồ sơ <span className="text-red-500">*</span>
              </label>
              <textarea
                id="reject-reason-input"
                ref={textareaRef}
                rows={3}
                value={rejectReason}
                onChange={(e) => {
                  setRejectReason(e.target.value);
                  if (e.target.value.trim()) setRejectError('');
                }}
                className={`w-full p-3.5 rounded-xl border bg-white text-slate-800 text-sm focus:outline-none resize-none transition shadow-2xs ${
                  rejectError
                    ? 'border-red-400 focus:ring-2 focus:ring-red-100'
                    : 'border-slate-300 focus:border-red-500 focus:ring-2 focus:ring-red-100'
                }`}
                placeholder="Ví dụ: Ảnh CCCD mặt sau bị mờ không đọc được thông tin số hiệu, vui lòng chụp lại rõ nét..."
              />
              {rejectError && (
                <p className="text-xs text-red-600 font-medium">{rejectError}</p>
              )}
              <div className="flex items-center justify-end gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowRejectBox(false);
                    setRejectError('');
                  }}
                  className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-medium text-slate-600 hover:text-slate-900 bg-white hover:bg-slate-50 transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isRejecting}
                  className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 active:scale-[0.99] text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isRejecting ? 'Đang từ chối...' : 'Xác nhận từ chối'}
                </button>
              </div>
            </div>
          )}
        </div>

        {/* MODAL FOOTER */}
        <div className="px-6 py-4 border-t border-slate-200 bg-white flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-slate-500">
            <span>Thao tác bởi Quản trị viên: </span>
            <strong className="text-slate-800">Lê Quang Dũng</strong>
            <span className="text-slate-400"> (#SVG-ADM-01)</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {provider.verificationStatus === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={handleOpenRejectBox}
                  disabled={isRejecting || isApproving}
                  className="px-4 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 active:scale-[0.99] text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Từ chối hồ sơ</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(provider.id)}
                  disabled={isApproving || isRejecting}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isApproving
                      ? 'Đang phê duyệt...'
                      : 'Phê duyệt & Cấp quyền Nhà cung cấp'}
                  </span>
                </button>
              </>
            )}

            {provider.verificationStatus === 'APPROVED' && (
              <>
                <span className="text-xs text-slate-500 italic">
                  Hồ sơ đã ở trạng thái phê duyệt chính thức
                </span>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-5 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-700 hover:text-slate-900 hover:bg-slate-50 bg-white transition cursor-pointer"
                >
                  Đóng
                </button>
              </>
            )}

            {provider.verificationStatus === 'REJECTED' && (
              <>
                <button
                  type="button"
                  onClick={() => onApprove(provider.id)}
                  disabled={isApproving || isRejecting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{isApproving ? 'Đang duyệt lại...' : 'Xem xét & Phê duyệt lại'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleOpenRejectBox}
                  disabled={isRejecting || isApproving}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold transition cursor-pointer"
                  title="Cập nhật lại lý do từ chối"
                >
                  Sửa lý do từ chối
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white transition cursor-pointer"
                >
                  Đóng
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* LIGHTBOX MODAL TO VIEW LARGE IMAGE */}
      {viewingImage && (
        <div
          className="fixed inset-0 z-80 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
          onClick={() => setViewingImage(null)}
        >
          <div className="max-w-2xl max-h-[85vh] relative">
            <img
              src={viewingImage}
              alt="Tài liệu lớn"
              className="max-h-[80vh] w-auto rounded-xl object-contain shadow-2xl"
            />
            <button
              type="button"
              onClick={() => setViewingImage(null)}
              className="absolute top-2 right-2 bg-black/60 text-white rounded-full p-1.5"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
