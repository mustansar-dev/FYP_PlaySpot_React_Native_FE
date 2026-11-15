const storedValues = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async key => storedValues[key] ?? null),
    setItem: jest.fn(async (key, value) => { storedValues[key] = value; }),
    removeItem: jest.fn(async key => { delete storedValues[key]; }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiRequest, clearStoredSession, readStoredSession, SESSION_KEY, setSessionExpiredHandler, writeStoredSession } from './apiClient';

const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300,
  status,
  json: async () => data,
});

describe('backend API session handling', () => {
  beforeEach(async () => {
    Object.keys(storedValues).forEach(key => delete storedValues[key]);
    AsyncStorage.getItem.mockClear();
    AsyncStorage.setItem.mockClear();
    AsyncStorage.removeItem.mockClear();
    global.fetch = jest.fn();
    setSessionExpiredHandler(() => {});
    await clearStoredSession();
    AsyncStorage.setItem.mockClear();
  });

  it('sends the stored access token as a bearer token', async () => {
    await writeStoredSession({ accessToken: 'access-1', refreshToken: 'refresh-1', user: { id: 'player-1' } });
    global.fetch.mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'player-1' } }));

    await expect(apiRequest('/auth/me')).resolves.toEqual({ id: 'player-1' });

    expect(global.fetch.mock.calls[0][1].headers.Authorization).toBe('Bearer access-1');
  });

  it('rotates a rejected access token once, persists the new session, and retries', async () => {
    await writeStoredSession({ accessToken: 'access-old', refreshToken: 'refresh-old', user: { id: 'player-1' } });
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { accessToken: 'access-new', refreshToken: 'refresh-new' } }))
      .mockResolvedValueOnce(jsonResponse({ success: true, data: { id: 'player-1' } }));

    await expect(apiRequest('/users/me')).resolves.toEqual({ id: 'player-1' });

    expect(JSON.parse(global.fetch.mock.calls[1][1].body)).toEqual({ refreshToken: 'refresh-old' });
    expect(global.fetch.mock.calls[2][1].headers.Authorization).toBe('Bearer access-new');
    await expect(readStoredSession()).resolves.toMatchObject({ accessToken: 'access-new', refreshToken: 'refresh-new', user: { id: 'player-1' } });
  });

  it('clears a session and notifies the app when refresh is revoked', async () => {
    const onExpired = jest.fn();
    setSessionExpiredHandler(onExpired);
    await writeStoredSession({ accessToken: 'access-old', refreshToken: 'refresh-revoked', user: { id: 'player-1' } });
    global.fetch
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: 'TOKEN_EXPIRED', message: 'Expired' } }, 401))
      .mockResolvedValueOnce(jsonResponse({ success: false, error: { code: 'INVALID_REFRESH_TOKEN', message: 'Invalid session' } }, 401));

    await expect(apiRequest('/users/me')).rejects.toMatchObject({ code: 'INVALID_REFRESH_TOKEN', status: 401 });

    expect(onExpired).toHaveBeenCalledTimes(1);
    expect(AsyncStorage.removeItem).toHaveBeenCalledWith(SESSION_KEY);
    await expect(readStoredSession()).resolves.toBeNull();
  });
});
