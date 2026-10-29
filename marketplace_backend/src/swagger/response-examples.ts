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
        roles: ['customer'],
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
        roles: ['customer'],
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
        roles: ['customer'],
        isAnonymous: false,
        phone: null,
        birthday: null,
        gender: null,
        createdAt: '2026-01-01T10:00:00.000Z',
        updatedAt: '2026-04-05T12:00:00.000Z',
      },
    },
  },
};
