import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, API_TIMEOUT_MS } from '../config/backendApi';

const SESSION_KEY = 'playspot-pk.backend-session.v1';
let refreshInFlight = null;
let onSessionExpired = () => {};

export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', details = [] } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

export function setSessionExpiredHandler(handler) {
  onSessionExpired = typeof handler === 'function' ? handler : () => {};
}

export async function readStoredSession() {
  try {
    const raw = await AsyncStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    await AsyncStorage.removeItem(SESSION_KEY).catch(() => {});
    return null;
  }
}

export async function writeStoredSession(session) {
  if (!session?.accessToken || !session?.refreshToken) {
    throw new ApiError('The server returned an incomplete sign-in session.', { code: 'INVALID_SESSION' });
  }
  await AsyncStorage.setItem(SESSION_KEY, JSON.stringify({
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    user: session.user || null,
  }));
}

export async function clearStoredSession() {
  await AsyncStorage.removeItem(SESSION_KEY);
}

async function parseResponse(response) {
  let payload;
  try { payload = await response.json(); } catch { payload = null; }
  if (!response.ok || payload?.success === false) {
    const error = payload?.error || {};
    throw new ApiError(error.message || `The server returned ${response.status}.`, {
      status: response.status,
      code: error.code || 'REQUEST_FAILED',
      details: Array.isArray(error.details) ? error.details : [],
    });
  }
  if (!payload || payload.success !== true || !Object.hasOwn(payload, 'data')) {
    throw new ApiError('The server response was not in the expected format.', { status: response.status, code: 'INVALID_RESPONSE' });
  }
  return payload.data;
}

async function rawRequest(path, { token, method = 'GET', body, headers = {}, timeout = API_TIMEOUT_MS } = {}) {
  const controller = typeof AbortController === 'undefined' ? null : new AbortController();
  const timer = controller ? setTimeout(() => controller.abort(), timeout) : null;
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...headers,
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      ...(controller ? { signal: controller.signal } : {}),
    });
    return parseResponse(response);
  } catch (error) {
    if (error instanceof ApiError) throw error;
    const message = error?.name === 'AbortError'
      ? 'The server took too long to respond. Check your connection and try again.'
      : 'Could not reach PlaySpot. Check the API URL and make sure the backend is running.';
    if (globalThis.__DEV__) console.warn(`[PlaySpot API] ${method} ${path}: ${error?.message || error}`);
    throw new ApiError(message, { code: error?.name === 'AbortError' ? 'TIMEOUT' : 'NETWORK_ERROR' });
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function refreshTokens(session) {
  if (!refreshInFlight) {
    refreshInFlight = rawRequest('/auth/refresh', { method: 'POST', body: { refreshToken: session.refreshToken } })
      .then(async tokens => {
        const next = { ...session, ...tokens };
        await writeStoredSession(next);
        return next;
      })
      .catch(async error => {
        if (error?.status === 401) {
          await clearStoredSession();
          onSessionExpired();
        }
        throw error;
      })
      .finally(() => { refreshInFlight = null; });
  }
  return refreshInFlight;
}

export async function apiRequest(path, options = {}) {
  const { auth = true, retryAuth = true, ...requestOptions } = options;
  const session = auth ? await readStoredSession() : null;
  try {
    return await rawRequest(path, { ...requestOptions, ...(session?.accessToken ? { token: session.accessToken } : {}) });
  } catch (error) {
    if (!(error instanceof ApiError) || error.status !== 401 || !auth || !retryAuth || path === '/auth/refresh') throw error;
    if (!session?.refreshToken) {
      await clearStoredSession();
      onSessionExpired();
      throw error;
    }
    const next = await refreshTokens(session);
    return rawRequest(path, { ...requestOptions, token: next.accessToken });
  }
}

export { SESSION_KEY };
