'use client';

import React, { useState } from 'react';
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
  const [rejectReason, setRejectReason] = useState('');
  const [showRejectBox, setShowRejectBox] = useState(false);
  const [viewingImage, setViewingImage] = useState<string | null>(null);

  if (!isOpen || !provider) return null;

  const area = provider.serviceAreas?.[0];
  const radius = area?.radiusKm ?? 5.0;
  const coordsStr = area
    ? `${Number(area.centerLatitude).toFixed(4)}, ${Number(area.centerLongitude).toFixed(4)}`
    : '10.7769, 106.7009';

  // Sample default KYC documents if none in db
  const defaultDocs = [
    {
      title: '1. CCCD / CMND Mặt trước',
      type: 'Mặt trước CCCD',
      file: 'cccd_mat_truoc.jpg',
      img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: '2. CCCD / CMND Mặt sau',
      type: 'Mặt sau CCCD',
      file: 'cccd_mat_sau.jpg',
      img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: '3. Chứng chỉ nghề / Bằng cấp',
      type: 'Chứng chỉ nghề',
      file: 'chung_chi_dien_spkt.pdf',
      img: 'https://images.unsplash.com/photo-1589829545856-d10d557cf95f?auto=format&fit=crop&w=600&q=80',
    },
    {
      title: '4. Ảnh chân dung & Đồ nghề',
      type: 'Ảnh đồ nghề',
      file: 'anh_do_nghe_tac_nghiep.jpg',
      img: 'https://images.unsplash.com/photo-1581244277943-fe4a9c777189?auto=format&fit=crop&w=600&q=80',
    },
  ];

  const handleConfirmReject = () => {
    if (!rejectReason.trim()) {
      alert('Vui lòng nhập lý do từ chối hồ sơ!');
      return;
    }
    onReject(provider.id, rejectReason.trim());
    setShowRejectBox(false);
    setRejectReason('');
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
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                    Chờ duyệt
                  </span>
                )}
                {provider.verificationStatus === 'APPROVED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Đã duyệt
                  </span>
                )}
                {provider.verificationStatus === 'REJECTED' && (
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-red-100 text-red-700 border border-red-200">
                    Đã từ chối
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
              <div className="p-3 rounded-lg text-xs bg-red-50 border border-red-200 text-red-950 flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-600 mt-0.5 shrink-0" />
                <div>
                  <span className="font-bold text-red-700">Lý do từ chối:</span>
                  <p className="mt-0.5 text-slate-800">
                    {provider.rejectionReason ||
                      'Tài liệu xác minh chưa đạt yêu cầu theo quy chuẩn.'}
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
                        provider.verificationStatus === 'APPROVED'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : provider.verificationStatus === 'REJECTED'
                            ? 'bg-red-50 text-red-600 border border-red-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}
                    >
                      {provider.verificationStatus === 'APPROVED'
                        ? 'Đã duyệt'
                        : provider.verificationStatus === 'REJECTED'
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

          {/* KHUNG NHẬP LÝ DO TỪ CHỐI */}
          {showRejectBox && (
            <div className="p-4 rounded-xl bg-red-50 border border-red-200 space-y-3 animate-in fade-in duration-150">
              <label className="block text-xs font-bold text-red-700 uppercase tracking-wider">
                Nhập lý do từ chối hồ sơ <span className="text-red-500">*</span>
              </label>
              <textarea
                rows={2}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full p-3 rounded-lg border border-red-300 bg-white text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-red-200 resize-none"
                placeholder="Ví dụ: Ảnh CCCD mặt sau bị mờ không đọc được thông tin số hiệu, vui lòng chụp lại rõ nét..."
              />
              <div className="flex items-center justify-end gap-3 pt-1">
                <button
                  type="button"
                  onClick={() => setShowRejectBox(false)}
                  className="px-3 py-1.5 rounded-lg border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white transition cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleConfirmReject}
                  disabled={isRejecting}
                  className="px-4 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-xs cursor-pointer disabled:opacity-50"
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
            <span className="text-slate-400"> (#TF-ADM-01)</span>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            {provider.verificationStatus === 'PENDING' && (
              <>
                <button
                  type="button"
                  onClick={() => setShowRejectBox(true)}
                  className="px-4 py-2 rounded-xl border border-red-300 text-red-600 hover:bg-red-50 text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Từ chối hồ sơ</span>
                </button>
                <button
                  type="button"
                  onClick={() => onApprove(provider.id)}
                  disabled={isApproving}
                  className="px-6 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>
                    {isApproving
                      ? 'Đang phê duyệt...'
                      : 'Phê duyệt & Cấp quyền'}
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
                  className="px-4 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:text-slate-800 bg-white transition cursor-pointer"
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
                  disabled={isApproving}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Xem xét &amp; Phê duyệt lại</span>
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
          className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 cursor-pointer"
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
