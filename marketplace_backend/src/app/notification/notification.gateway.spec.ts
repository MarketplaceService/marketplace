import { NotificationGateway } from './notification.gateway';

describe('NotificationGateway', () => {
  const USER_ID = '01950000-0000-7000-8000-000000000001';

  let sessionAuthService: { resolveAuthenticatedUser: jest.Mock };
  let pinoLogger: {
    setContext: jest.Mock;
    debug: jest.Mock;
    warn: jest.Mock;
    error: jest.Mock;
  };
  let gateway: NotificationGateway;

  beforeEach(() => {
    sessionAuthService = {
      resolveAuthenticatedUser: jest.fn(),
    };
    pinoLogger = {
      setContext: jest.fn(),
      debug: jest.fn(),
      warn: jest.fn(),
      error: jest.fn(),
    };

    gateway = new NotificationGateway(
      sessionAuthService as never,
      pinoLogger as never,
    );
  });

  it('xác thực cookie thành công và cho client join vào room cá nhân theo user.id', async () => {
    sessionAuthService.resolveAuthenticatedUser.mockResolvedValueOnce({
      id: USER_ID,
    });

    const client = {
      id: 'socket-1',
      handshake: { headers: { cookie: 'better-auth.session_token=abc.sig' } },
      data: {} as { userId?: string },
      join: jest.fn().mockResolvedValue(undefined),
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.data.userId).toBe(USER_ID);
    expect(client.join).toHaveBeenCalledWith(`user:${USER_ID}`);
    expect(client.disconnect).not.toHaveBeenCalled();
  });

  it('ngắt kết nối ngay lập tức khi handshake không có session hợp lệ', async () => {
    sessionAuthService.resolveAuthenticatedUser.mockResolvedValueOnce(null);

    const client = {
      id: 'socket-2',
      handshake: { headers: {} },
      data: {},
      join: jest.fn(),
      disconnect: jest.fn(),
    };

    await gateway.handleConnection(client as never);

    expect(client.join).not.toHaveBeenCalled();
    expect(client.disconnect).toHaveBeenCalledWith(true);
  });
});
