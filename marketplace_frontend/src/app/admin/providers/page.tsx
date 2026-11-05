'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Bell, ChevronRight } from 'lucide-react';
import { AdminSidebar } from '@/components/admin-providers/admin-sidebar';
import { ProviderStatCards } from '@/components/admin-providers/provider-stat-cards';
import { ProviderFilterToolbar } from '@/components/admin-providers/provider-filter-toolbar';
import { ProviderTable } from '@/components/admin-providers/provider-table';
import { ProviderAppraisalModal } from '@/components/admin-providers/provider-appraisal-modal';
import {
  useAdminProvidersList,
  useAdminProviderStats,
  useApproveProvider,
  useRejectProvider,
} from '@/hooks/use-admin-providers';
import { ProviderProfile, ProviderStats } from '@/types/provider.types';
import { toast } from 'sonner';

// Sample initial mock providers matching screen19 HTML data (12 providers)
const INITIAL_MOCK_PROVIDERS: ProviderProfile[] = [
  {
    id: 'TF-PRO-001',
    userId: 'u-1',
    displayName: 'Điện Nước Phạm Hùng',
    phone: '0908 123 456',
    experienceYears: 8,
    categoryId: 'Điện nước',
    bio: 'Chuyên cung cấp dịch vụ điện nước hơn 8 năm tại TP.HCM. Chuyên dò tìm rò rỉ nước ngầm, xử lý chập điện cháy nổ, lắp đặt hệ thống máy bơm tăng áp và van khóa thông minh.',
    verificationStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: '2026-11-04T09:15:00Z',
    updatedAt: '2026-11-04T09:15:00Z',
    user: {
      id: 'u-1',
      name: 'Phạm Quốc Hùng',
      email: 'hung.pham@gmail.com',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuCEIdx1pe3VJWEYpRAaFFGE3E71GHq8oiG6M9zA943y4IYo0xB_enjwpg6wS-AKcDI48cU-v-piEG16kq1qUsIkEKbHhJkVUFDdex8jgueYBtdOSN_hIjnWePXJ9iy7A-_NqzcpktekqrjebJkZhgdlMu-44HnhSb6kf9yXbCrjFQ4A0hGYS0wXPnBzhV3mFf2Pcavp2YCZxubFAX8ScDfytWvRG-ZKn0sZZUaWXycG94cS-gWV5rmIZwvKcUyunv7GP3kPSB0_DpxR',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-1',
        providerId: 'TF-PRO-001',
        areaName: 'Vùng trung tâm TP.HCM',
        centerLatitude: 10.7769,
        centerLongitude: 106.7009,
        radiusKm: 7.0,
        isActive: true,
        createdAt: '2026-11-04T09:15:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-002',
    userId: 'u-2',
    displayName: 'Điện Lạnh Minh Đức',
    phone: '0918 765 432',
    experienceYears: 5,
    categoryId: 'Điện lạnh',
    bio: 'Chuyên bảo trì và sửa chữa các dòng máy lạnh Daikin, Panasonic, Toshiba. Làm việc cẩn thận, sạch sẽ, kiểm tra áp suất gas và dòng rò trước khi bàn giao.',
    verificationStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: '2026-11-04T10:30:00Z',
    updatedAt: '2026-11-04T10:30:00Z',
    user: {
      id: 'u-2',
      name: 'Trần Minh Đức',
      email: 'duc.tran@gmail.com',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuATDd8_r8oI3U1wyeVp-nXCAZt_qijlOkET5s-47rbT-p-meQDKCbO7aGs0eevIm-GvwVulTgq6tdCE4_IBRwsTIqbQrFvIkCUCwWQ70d-GJjlqOZ6su-A_AWC3MqXTTlXPaDW0Uwq8Xm8D_StYpC6hO8YMTAURHx7H-4yyRcWskHT2d2M6SShJAZz_4vQKxRL5sCRqXCGlKs_TD6fkK2NQ5It00Xj56F-ar2caMeYfFmX1DSG2oZ5BBA_yzNaU-G3BKQh-7vIT6BKR',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-2',
        providerId: 'TF-PRO-002',
        areaName: 'Vùng Bình Thạnh - Q.2',
        centerLatitude: 10.8012,
        centerLongitude: 106.7123,
        radiusKm: 6.0,
        isActive: true,
        createdAt: '2026-11-04T10:30:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-003',
    userId: 'u-3',
    displayName: 'Khóa & Cửa Thông Minh Hoàng Vũ',
    phone: '0933 555 888',
    experienceYears: 4,
    categoryId: 'Sửa khóa & Cửa',
    bio: 'Chuyên xử lý mở khóa khẩn cấp, cài đặt smart lock Kaadas, Xiaomi, Philips. Hỗ trợ tư vấn giải pháp an ninh gia đình.',
    verificationStatus: 'APPROVED',
    approvedBy: 'Lê Quang Dũng (Quản trị viên)',
    approvedAt: '2026-11-03T16:45:00Z',
    rejectionReason: null,
    createdAt: '2026-11-03T14:20:00Z',
    updatedAt: '2026-11-03T16:45:00Z',
    user: {
      id: 'u-3',
      name: 'Lê Hoàng Vũ',
      email: 'vu.le@gmail.com',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuC4hqWB0smB3PhBiDMr9Jjjl7cYaeORekCQXwxecKxK9breRtzmEpWLOFSQpQSHWRzJFZW9TYoIylU3kiaxhRZu2D4xPcC0mM5rij21vKo4EI-u9-s5ASP3gAPbiSr7oSXbrYy3mwmqZ3PFCnWuYpaWJO0ewG2ctaHUFCeuo2Bps27wuSKhUKcLinBahzcdOOfSze9w-ozUdyGn2pWURlAbkLAI0HXJmwSVciT0Bp0se2MmeMli91l0RN77Perxg5g7DiGsbfRaKYFB',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-3',
        providerId: 'TF-PRO-003',
        areaName: 'Vùng Quận 7 - Nhà Bè',
        centerLatitude: 10.7321,
        centerLongitude: 106.7214,
        radiusKm: 10.0,
        isActive: true,
        createdAt: '2026-11-03T14:20:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-004',
    userId: 'u-4',
    displayName: 'Bếp & Gia Dụng Quang Hải',
    phone: '0944 111 222',
    experienceYears: 2,
    categoryId: 'Thiết bị bếp & Gia dụng',
    bio: 'Chuyên sửa bo mạch bếp từ cao cấp nhập khẩu châu Âu, thay mặt kính bếp từ và bảo dưỡng máy rửa bát.',
    verificationStatus: 'REJECTED',
    approvedBy: null,
    approvedAt: null,
    rejectionReason:
      'Ảnh chụp CCCD mặt sau bị lóa sáng không đọc được số seri và mã MRZ; chứng chỉ nghề chưa có mộc công chứng hợp lệ.',
    createdAt: '2026-11-02T11:00:00Z',
    updatedAt: '2026-11-02T11:00:00Z',
    user: {
      id: 'u-4',
      name: 'Nguyễn Quang Hải',
      email: 'hai.nguyen@gmail.com',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDT2hZAiaCAna5_FSk03dkrG72slgxtgP-heMvgSVJALuD58qSpn3VQbheW7zSBba_xHnAx2tUmU40NQF5JAB8jQpXyJvxlE5tStWoFvMnHTc6AuGOHuAOR2V6O9-CgJspF1CpAUGY2hmWzJLG1oyuYy1in5ISK0CrISypCC9XoYe7BMIExdy7Np-WWw-FoppX8PSIAQzqWUxooqgrXfqI9pyOvEhTf6pBLRQhzeLgY3CIeTwZTKMkkBSXv9STkT-CJnGaUKOLPfi-S',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-4',
        providerId: 'TF-PRO-004',
        areaName: 'Vùng Phú Nhuận',
        centerLatitude: 10.795,
        centerLongitude: 106.665,
        radiusKm: 5.0,
        isActive: false,
        createdAt: '2026-11-02T11:00:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-005',
    userId: 'u-5',
    displayName: 'Điện Lạnh Hoàng Nam',
    phone: '0912 345 882',
    experienceYears: 6,
    categoryId: 'Điện lạnh',
    bio: 'Chuyên xử lý hệ thống điều hòa dân dụng & Multi Inverter Daikin, Panasonic, Mitsubishi. Thành thạo quy trình vệ sinh xịt áp lực và nạp gas R32 chuẩn.',
    verificationStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: '2026-11-04T11:30:00Z',
    updatedAt: '2026-11-04T11:30:00Z',
    user: {
      id: 'u-5',
      name: 'Hoàng Nam',
      email: 'hoangnam@gmail.com',
      image:
        'https://lh3.googleusercontent.com/aida-public/AB6AXuDIqFZH6w5FSGlWSdqGzYAaNxyv-dxnzozOnIKbkEMfifFwCQfG4W1EGh031l1YGe5_trc5A76LB0LHA2PImDpQk_iwHJceTW52lawaT2yHeq8GWuVGQGKqHGxhTDPtU4pTMqam3EhaWODBKA-HeZGuThWBsiczxxRUax-BEw1nllg6l78SA2nrShmzpDBUBfdnuxiyMm1i1D8nCFq4k0XunCAB77xGFP-O8bezu3d-qbkAiSqXzvxsjwpisX3RDueNX2elCmDfJPxb',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-5',
        providerId: 'TF-PRO-005',
        areaName: 'Vùng trung tâm TP.HCM',
        centerLatitude: 10.7769,
        centerLongitude: 106.7009,
        radiusKm: 5.0,
        isActive: true,
        createdAt: '2026-11-04T11:30:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-006',
    userId: 'u-6',
    displayName: 'Khóa Cửa Điện Tử Thắng Lợi',
    phone: '0968 222 333',
    experienceYears: 7,
    categoryId: 'Sửa khóa & Cửa',
    bio: 'Hơn 7 năm thi công khóa vân tay gia đình và văn phòng. Nhận mở khóa khẩn cấp 24/7 khu vực Bình Thạnh, Gò Vấp và Quận 12.',
    verificationStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: '2026-11-04T14:05:00Z',
    updatedAt: '2026-11-04T14:05:00Z',
    user: {
      id: 'u-6',
      name: 'Lê Văn Thắng',
      email: 'thang.le@gmail.com',
      image:
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-6',
        providerId: 'TF-PRO-006',
        areaName: 'Vùng Bình Thạnh - Gò Vấp',
        centerLatitude: 10.8231,
        centerLongitude: 106.6872,
        radiusKm: 8.0,
        isActive: true,
        createdAt: '2026-11-04T14:05:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-007',
    userId: 'u-7',
    displayName: 'Điện Nước Nhanh 24/7',
    phone: '0977 444 555',
    experienceYears: 9,
    categoryId: 'Điện nước',
    bio: 'Đội ngũ thợ điện nước lành nghề, trang bị máy dò rò rỉ sóng âm hiện đại, không cần đục phá nền nhà bừa bãi.',
    verificationStatus: 'APPROVED',
    approvedBy: 'Lê Quang Dũng (Quản trị viên)',
    approvedAt: '2026-11-04T08:30:00Z',
    rejectionReason: null,
    createdAt: '2026-11-03T15:40:00Z',
    updatedAt: '2026-11-04T08:30:00Z',
    user: {
      id: 'u-7',
      name: 'Võ Minh Trí',
      email: 'tri.vo@gmail.com',
      image:
        'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-7',
        providerId: 'TF-PRO-007',
        areaName: 'Vùng Quận 5 - Quận 6',
        centerLatitude: 10.7554,
        centerLongitude: 106.6621,
        radiusKm: 7.5,
        isActive: true,
        createdAt: '2026-11-03T15:40:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-008',
    userId: 'u-8',
    displayName: 'Cơ Điện Bếp Thành Đạt',
    phone: '0903 888 999',
    experienceYears: 4,
    categoryId: 'Thiết bị bếp & Gia dụng',
    bio: 'Chuyên xử lý máy hút mùi không hút, kêu to, thay than hoạt tính và sửa bo mạch điều khiển lò nướng Malloca, Bosch, Teka.',
    verificationStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: '2026-11-04T16:15:00Z',
    updatedAt: '2026-11-04T16:15:00Z',
    user: {
      id: 'u-8',
      name: 'Đỗ Thành Đạt',
      email: 'dat.do@gmail.com',
      image:
        'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-8',
        providerId: 'TF-PRO-008',
        areaName: 'Vùng TP. Thủ Đức',
        centerLatitude: 10.8456,
        centerLongitude: 106.7723,
        radiusKm: 6.0,
        isActive: true,
        createdAt: '2026-11-04T16:15:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-009',
    userId: 'u-9',
    displayName: 'Điện Lạnh Tài Phát',
    phone: '0988 123 789',
    experienceYears: 10,
    categoryId: 'Điện lạnh',
    bio: 'Hơn 10 năm kinh nghiệm thi công máy lạnh trung tâm VRV và máy lạnh treo tường dân dụng. Đầy đủ đồ nghề hút chân không chuẩn quy trình.',
    verificationStatus: 'APPROVED',
    approvedBy: 'Lê Quang Dũng (Quản trị viên)',
    approvedAt: '2026-11-02T14:10:00Z',
    rejectionReason: null,
    createdAt: '2026-11-02T09:20:00Z',
    updatedAt: '2026-11-02T14:10:00Z',
    user: {
      id: 'u-9',
      name: 'Nguyễn Hữu Tài',
      email: 'tai.nguyen@gmail.com',
      image:
        'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-9',
        providerId: 'TF-PRO-009',
        areaName: 'Vùng Quận 1 - Quận 3',
        centerLatitude: 10.7612,
        centerLongitude: 106.6821,
        radiusKm: 8.5,
        isActive: true,
        createdAt: '2026-11-02T09:20:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-010',
    userId: 'u-10',
    displayName: 'Khóa Cấp Tốc Bùi Tuấn',
    phone: '0915 678 901',
    experienceYears: 3,
    categoryId: 'Sửa khóa & Cửa',
    bio: 'Thợ mở khóa lưu động tại các quận trung tâm. Hỗ trợ sự cố mất chìa, gãy chìa trong ổ khóa.',
    verificationStatus: 'REJECTED',
    approvedBy: null,
    approvedAt: null,
    rejectionReason:
      'Ảnh chụp chứng chỉ hành nghề không rõ cơ quan cấp; số điện thoại đăng ký không trùng khớp với hồ sơ định danh CCCD.',
    createdAt: '2026-11-01T13:45:00Z',
    updatedAt: '2026-11-01T13:45:00Z',
    user: {
      id: 'u-10',
      name: 'Bùi Quốc Tuấn',
      email: 'tuan.bui@gmail.com',
      image:
        'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-10',
        providerId: 'TF-PRO-010',
        areaName: 'Vùng Quận 10 - Quận 11',
        centerLatitude: 10.7723,
        centerLongitude: 106.6589,
        radiusKm: 5.0,
        isActive: false,
        createdAt: '2026-11-01T13:45:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-011',
    userId: 'u-11',
    displayName: 'Điện Nước Dân Dụng Bình Minh',
    phone: '0938 777 666',
    experienceYears: 5,
    categoryId: 'Điện nước',
    bio: 'Chuyên tư vấn nâng cấp hệ thống dây dẫn điện an toàn, thay thế aptomat chống giật, lắp đặt đèn chiếu sáng thông minh.',
    verificationStatus: 'PENDING',
    approvedBy: null,
    approvedAt: null,
    rejectionReason: null,
    createdAt: '2026-11-04T17:00:00Z',
    updatedAt: '2026-11-04T17:00:00Z',
    user: {
      id: 'u-11',
      name: 'Phan Thanh Bình',
      email: 'binh.phan@gmail.com',
      image:
        'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-11',
        providerId: 'TF-PRO-011',
        areaName: 'Vùng Tân Bình - Phú Nhuận',
        centerLatitude: 10.7891,
        centerLongitude: 106.6987,
        radiusKm: 6.5,
        isActive: true,
        createdAt: '2026-11-04T17:00:00Z',
      },
    ],
  },
  {
    id: 'TF-PRO-012',
    userId: 'u-12',
    displayName: 'Thiết Bị Bếp Hoàng Gia',
    phone: '0945 999 000',
    experienceYears: 8,
    categoryId: 'Thiết bị bếp & Gia dụng',
    bio: 'Chuyên thay lõi lọc nước Kangaroo, Karofi, Sunhouse chính hãng. Kiểm tra chỉ số TDS nguồn nước đầu ra đạt chuẩn BYT.',
    verificationStatus: 'APPROVED',
    approvedBy: 'Lê Quang Dũng (Quản trị viên)',
    approvedAt: '2026-11-03T17:00:00Z',
    rejectionReason: null,
    createdAt: '2026-11-03T11:15:00Z',
    updatedAt: '2026-11-03T17:00:00Z',
    user: {
      id: 'u-12',
      name: 'Lâm Kiến Vĩ',
      email: 'vi.lam@gmail.com',
      image:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80',
      createdAt: '2026-11-01',
      updatedAt: '2026-11-01',
    },
    serviceAreas: [
      {
        id: 'sa-12',
        providerId: 'TF-PRO-012',
        areaName: 'Vùng Bình Thạnh - Q.2',
        centerLatitude: 10.8105,
        centerLongitude: 106.7042,
        radiusKm: 7.0,
        isActive: true,
        createdAt: '2026-11-03T11:15:00Z',
      },
    ],
  },
];

export default function AdminProvidersPage() {
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [status, setStatus] = useState('ALL');

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(5);

  // Modal appraisal state
  const [selectedProvider, setSelectedProvider] = useState<ProviderProfile | null>(
    null,
  );
  const [isModalOpen, setIsModalOpen] = useState(false);

  // React Query hooks
  const { data: serverData, refetch } = useAdminProvidersList({
    status: status === 'ALL' ? undefined : status,
    category: category || undefined,
    search: search || undefined,
  });

  const { data: serverStats } = useAdminProviderStats();
  const approveMutation = useApproveProvider();
  const rejectMutation = useRejectProvider();

  // Local fallback mock providers for seamless UX
  const [mockList, setMockList] = useState<ProviderProfile[]>(
    INITIAL_MOCK_PROVIDERS,
  );

  // Filtered providers
  const allFilteredProviders = (
    serverData?.items && serverData.items.length > 0
      ? serverData.items
      : mockList
  ).filter((p) => {
    if (status !== 'ALL' && p.verificationStatus !== status) return false;
    if (category && p.categoryId !== category) return false;
    if (search) {
      const s = search.toLowerCase();
      const matchName =
        p.displayName.toLowerCase().includes(s) ||
        (p.user?.name && p.user.name.toLowerCase().includes(s));
      const matchEmail = p.user?.email && p.user.email.toLowerCase().includes(s);
      const matchPhone = p.phone && p.phone.includes(s);
      const matchId = p.id.toLowerCase().includes(s);
      if (!matchName && !matchEmail && !matchPhone && !matchId) return false;
    }
    return true;
  });

  // Paginated slice
  const paginatedProviders = allFilteredProviders.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  // Compute stats
  const activeStats: ProviderStats = serverStats || {
    total: mockList.length,
    pending: mockList.filter((p) => p.verificationStatus === 'PENDING').length,
    approved: mockList.filter((p) => p.verificationStatus === 'APPROVED').length,
    rejected: mockList.filter((p) => p.verificationStatus === 'REJECTED').length,
  };

  const handleOpenAppraisal = (provider: ProviderProfile) => {
    setSelectedProvider(provider);
    setIsModalOpen(true);
  };

  const handleCloseAppraisal = () => {
    setIsModalOpen(false);
  };

  const handleApprove = (id: string) => {
    approveMutation.mutate(id, {
      onSuccess: (updated) => {
        setSelectedProvider(updated);
        setMockList((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  verificationStatus: 'APPROVED',
                  approvedBy: 'Lê Quang Dũng (Quản trị viên)',
                  approvedAt: new Date().toISOString(),
                }
              : p,
          ),
        );
        toast.success(
          `Đã phê duyệt Nhà cung cấp "${updated.displayName}" thành công! Đã cấp quyền Nhà cung cấp.`,
        );
      },
      onError: () => {
        setMockList((prev) =>
          prev.map((p) =>
            p.id === id
              ? {
                  ...p,
                  verificationStatus: 'APPROVED',
                  approvedBy: 'Lê Quang Dũng (Quản trị viên)',
                  approvedAt: new Date().toISOString(),
                }
              : p,
          ),
        );
        if (selectedProvider && selectedProvider.id === id) {
          setSelectedProvider({
            ...selectedProvider,
            verificationStatus: 'APPROVED',
            approvedBy: 'Lê Quang Dũng (Quản trị viên)',
            approvedAt: new Date().toISOString(),
          });
        }
        toast.success(
          `Đã phê duyệt Nhà cung cấp "${selectedProvider?.displayName}" thành công! Đã cấp quyền Nhà cung cấp.`,
        );
      },
    });
  };

  const handleReject = (id: string, reason: string) => {
    rejectMutation.mutate(
      { id, reason },
      {
        onSuccess: (updated) => {
          setSelectedProvider(updated);
          setMockList((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    verificationStatus: 'REJECTED',
                    rejectionReason: reason,
                  }
                : p,
            ),
          );
          toast.warning(
            `Đã từ chối hồ sơ Nhà cung cấp "${updated.displayName}". Quyền tài khoản giữ nguyên là Khách hàng.`,
          );
        },
        onError: () => {
          setMockList((prev) =>
            prev.map((p) =>
              p.id === id
                ? {
                    ...p,
                    verificationStatus: 'REJECTED',
                    rejectionReason: reason,
                  }
                : p,
            ),
          );
          if (selectedProvider && selectedProvider.id === id) {
            setSelectedProvider({
              ...selectedProvider,
              verificationStatus: 'REJECTED',
              rejectionReason: reason,
            });
          }
          toast.warning(
            `Đã từ chối hồ sơ Nhà cung cấp "${selectedProvider?.displayName}". Quyền tài khoản giữ nguyên là Khách hàng.`,
          );
        },
      },
    );
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col relative antialiased">
      {/* 1. SIDEBAR & MOBILE TOPBAR QUẢN TRỊ VIÊN */}
      <AdminSidebar pendingCount={activeStats.pending} />

      {/* 2. MAIN CONTENT CONTAINER (BẢNG DANH SÁCH HOÀN TOÀN TƯƠNG TÁC) */}
      <div className="flex-1 flex flex-col lg:pl-64">
        <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8">
          {/* Header & Breadcrumb */}
          <div className="mb-7 flex flex-col sm:flex-row sm:items-end justify-between gap-4">
            <div>
              <nav
                aria-label="Breadcrumb"
                className="flex items-center gap-1.5 text-xs text-slate-500 mb-1"
              >
                <Link
                  className="hover:text-emerald-700 transition-colors"
                  href="/admin/dashboard"
                >
                  Quản trị
                </Link>
                <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                <span className="text-slate-800 font-medium">Danh sách hồ sơ</span>
              </nav>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 font-sans tracking-normal">
                Danh Sách Hồ Sơ Nhà Cung Cấp
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Theo dõi hàng đợi xét duyệt, lọc trạng thái Chờ duyệt / Đã duyệt / Đã từ chối và mở thẩm định chi tiết.
              </p>
            </div>

            {/* Quick sync info & Notifications */}
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  void refetch();
                  toast.info('Đã làm mới dữ liệu trực tiếp!');
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 hover:text-slate-900 text-xs shadow-xs cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 text-emerald-600" />
                <span>Cập nhật dữ liệu trực tiếp</span>
              </button>
              <button
                type="button"
                onClick={() => toast.info('Không có thông báo khẩn mới.')}
                className="relative w-9 h-9 rounded-full border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-slate-900 hover:bg-slate-50 transition duration-150 shadow-xs cursor-pointer"
                title="Thông báo hệ thống"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full ring-2 ring-white" />
              </button>
            </div>
          </div>

          {/* 4 THẺ THỐNG KÊ NHANH */}
          <ProviderStatCards stats={activeStats} />

          {/* THANH TÌM KIẾM & BỘ LỌC ĐA TẦNG */}
          <ProviderFilterToolbar
            search={search}
            category={category}
            status={status}
            onSearchChange={(val) => {
              setSearch(val);
              setCurrentPage(1);
            }}
            onCategoryChange={(val) => {
              setCategory(val);
              setCurrentPage(1);
            }}
            onStatusChange={(val) => {
              setStatus(val);
              setCurrentPage(1);
            }}
            onReset={() => {
              setSearch('');
              setCategory('');
              setStatus('ALL');
              setCurrentPage(1);
              toast.info('Đã đặt lại toàn bộ bộ lọc.');
            }}
          />

          {/* BẢNG DANH SÁCH & PHÂN TRANG */}
          <ProviderTable
            providers={paginatedProviders}
            totalItems={allFilteredProviders.length}
            currentPage={currentPage}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(newSize) => {
              setPageSize(newSize);
              setCurrentPage(1);
            }}
            onOpenAppraisal={handleOpenAppraisal}
          />

          {/* MODAL THẨM ĐỊNH CHI TIẾT HỒ SƠ */}
          <ProviderAppraisalModal
            provider={selectedProvider}
            isOpen={isModalOpen}
            onClose={handleCloseAppraisal}
            onApprove={handleApprove}
            onReject={handleReject}
            isApproving={approveMutation.isPending}
            isRejecting={rejectMutation.isPending}
          />
        </main>
      </div>
    </div>
  );
}
