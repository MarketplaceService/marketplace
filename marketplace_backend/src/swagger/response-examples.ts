export const ResEx = {
  auth: {
    verifyEmail: {
      success: true,
      message: 'Email đã được xác minh.',
    },

    me: {
      success: true,
      authenticated: true,
      user: {
        id: 'usr_01',
        email: 'user@example.com',
        name: 'Nguyễn Văn A',
        image: null,
        emailVerified: true,
        role: 'user',
        isAnonymous: false,
        phone: null,
        birthday: null,
        gender: null,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-04-05T12:00:00.000Z',
      },
    },

    session: {
      success: true,
      authenticated: true,
      session: {
        token: 'sess_xxx',
        expiresAt: '2026-04-05T12:00:00.000Z',
      },
      user: {
        id: 'usr_01',
        email: 'user@example.com',
        name: 'Nguyễn Văn A',
        image: null,
        emailVerified: true,
        role: 'user',
        isAnonymous: false,
        phone: null,
        birthday: null,
        gender: null,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-04-05T12:00:00.000Z',
      },
    },

    check: {
      authenticated: true,
      user: {
        id: 'usr_01',
        email: 'user@example.com',
        name: 'Nguyễn Văn A',
        image: null,
        emailVerified: true,
        role: 'user',
        isAnonymous: false,
        phone: null,
        birthday: null,
        gender: null,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-04-05T12:00:00.000Z',
      },
    },
  },

  user: {
    profile: {
      id: 'usr_01',
      name: 'Nguyễn Văn A',
      email: 'user@example.com',
      image: null,
      phone: '0912345678',
      birthday: '1995-08-20',
      gender: 'male',
      role: 'customer',
    },
  },

  address: {
    item: {
      id: 'addr_01',
      fullName: 'Nguyễn Văn A',
      phone: '0912345678',
      addressLine1: '123 Nguyễn Huệ',
      addressLine2: null,
      ward: 'Phường Bến Nghé',
      district: 'Quận 1',
      city: 'TP. Hồ Chí Minh',
      postalCode: null,
      latitude: 10.774512,
      longitude: 106.703418,
      isDefault: true,
      createdAt: '2026-01-01T10:00:00.000Z',
      updatedAt: '2026-04-05T12:00:00.000Z',
    },
  },
};
