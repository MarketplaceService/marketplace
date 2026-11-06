import React from 'react';
import { PartnerRegisterView } from '@/components/provider-register/partner-register-view';

export const metadata = {
  title: 'Đăng Ký Trở Thành Nhà Cung Cấp | Servigo',
  description:
    'Đăng ký đối tác, thẩm định KYC và thiết lập khu vực phục vụ trên sàn thương mại điện tử Servigo.',
};

export default function PartnerRegisterPage() {
  return <PartnerRegisterView />;
}

