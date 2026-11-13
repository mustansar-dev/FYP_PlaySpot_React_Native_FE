import CryptoJS from 'crypto-js';
import {
  createSeedDataForMemoryFallback,
  loadAuthData,
  saveAuthData,
} from './authStorage';
import { DEMO_MODE } from '../config/backendApi';
import { backendApi } from './backendApi';
import { clearStoredSession, readStoredSession, writeStoredSession } from './apiClient';

function fromBackendUser(user) {
  if (!user) return null;
  const vendorProfile = user.vendorProfile ? { ...user.vendorProfile } : null;
  return {
    ...user,
    role: String(user.role || '').toLowerCase(),
    preferredSports: (user.preferredSports || []).map(item => typeof item === 'string' ? item : item.name || item.sport?.name).filter(Boolean),
    businessName: vendorProfile?.businessName || '',
    phone: user.phone || vendorProfile?.contactPhone || '',
    vendorProfile,
  };
}

function backendSessionResult(payload) {
  const account = fromBackendUser(payload.user);
  return writeStoredSession({ ...payload, user: account }).then(() => ({ account, accounts: account ? [account] : [] }));
}

export function normalizeEmail(email) {
  return String(email || '').trim().toLowerCase();
}

function hashPassword(password, salt) {
  return CryptoJS.SHA256(`${salt}:${password}`).toString();
}

function createSalt() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 14)}`;
}

export function toPublicUser(account) {
  if (!account) {
    return null;
  }
  const { passwordSalt, passwordHash, ...user } = account;
  return user;
}

function createUserId() {
  return `user-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

async function readStore() {
  const result = await loadAuthData();
  return result.data;
}

export async function restoreSession() {
  if (!DEMO_MODE) {
    const stored = await readStoredSession();
    if (!stored?.refreshToken) return { accounts: [], user: null, storageNotice: null };
    try {
      const user = fromBackendUser(await backendApi.me());
      await writeStoredSession({ ...stored, user });
      return { accounts: user ? [user] : [], user, storageNotice: null };
    } catch (error) {
      if (error?.status === 401) await clearStoredSession();
      return {
        accounts: [], user: null,
        storageNotice: error?.status === 401 ? 'Your session expired. Please log in again.' : error.message,
      };
    }
  }
  const loaded = await loadAuthData();
  const account = loaded.data.accounts.find(
    item => item.id === loaded.data.sessionUserId,
  );
  return {
    accounts: loaded.data.accounts,
    user: toPublicUser(account),
    storageNotice: loaded.notice,
  };
}

export async function registerAccount(form) {
  if (!DEMO_MODE) {
    const payload = form.role === 'vendor'
      ? await backendApi.vendorRegister({
        name: form.name, email: normalizeEmail(form.email), phone: form.phone,
        password: form.password, confirmPassword: form.confirmPassword,
        businessName: form.vendorProfile?.businessName || form.businessName || form.name,
        contactPhone: form.phone,
      })
      : await backendApi.playerRegister({
        name: form.name, email: normalizeEmail(form.email), phone: form.phone,
        password: form.password, confirmPassword: form.confirmPassword,
        preferredSports: form.preferredSports || [],
      });
    const result = await backendSessionResult(payload);
    return result;
  }
  const data = await readStore();
  const email = normalizeEmail(form.email);
  const existing = data.accounts.some(
    account => normalizeEmail(account.email) === email,
  );
  if (existing) {
    throw new Error('An account with this email already exists.');
  }

  const { password, confirmPassword, ...profile } = form;
  const passwordSalt = createSalt();
  const account = {
    ...profile,
    id: createUserId(),
    email,
    createdAt: new Date().toISOString(),
    passwordSalt,
    passwordHash: hashPassword(password, passwordSalt),
  };
  const nextData = {
    ...data,
    accounts: [...data.accounts, account],
    sessionUserId: null,
  };

  await saveAuthData(nextData);
  return { account, accounts: nextData.accounts };
}

export async function signIn(emailInput, password) {
  if (!DEMO_MODE) {
    const payload = await backendApi.login({ identifier: String(emailInput || '').trim(), password });
    const account = fromBackendUser(payload.user);
    await writeStoredSession({ ...payload, user: account });
    return { user: account, accounts: account ? [account] : [] };
  }
  const data = await readStore();
  const email = normalizeEmail(emailInput);
  const account = data.accounts.find(
    item => normalizeEmail(item.email) === email,
  );
  if (!account || hashPassword(password, account.passwordSalt) !== account.passwordHash) {
    throw new Error('Email or password is incorrect.');
  }

  await saveAuthData({ ...data, sessionUserId: account.id });
  return { user: toPublicUser(account), accounts: data.accounts };
}

export async function startSession(userId) {
  if (!DEMO_MODE) {
    const session = await readStoredSession();
    const user = fromBackendUser(session?.user);
    if (!user || user.id !== userId) throw new Error('Your new account session is missing. Please log in.');
    return { user, accounts: [user] };
  }
  const data = await readStore();
  const account = data.accounts.find(item => item.id === userId);
  if (!account) {
    throw new Error('This registration could not be found. Please sign in.');
  }
  await saveAuthData({ ...data, sessionUserId: account.id });
  return { user: toPublicUser(account), accounts: data.accounts };
}

export async function endSession() {
  if (!DEMO_MODE) {
    try { await backendApi.logout(); }
    catch (error) { if (globalThis.__DEV__) console.warn('[PlaySpot auth] Server logout could not be confirmed.'); }
    finally { await clearStoredSession(); }
    return;
  }
  let data;
  try {
    data = await readStore();
  } catch (error) {
    data = createSeedDataForMemoryFallback();
  }
  await saveAuthData({ ...data, sessionUserId: null });
}

export async function updateAccountProfile(userId, profileChanges) {
  if (!DEMO_MODE) {
    const session = await readStoredSession();
    const current = fromBackendUser(session?.user);
    if (!current || current.id !== userId) throw new Error('Your profile session is no longer available. Please log in again.');
    const userChanges = Object.fromEntries(Object.entries(profileChanges).filter(([key]) => ['name', 'phone', 'preferredSports'].includes(key)));
    const vendorChanges = Object.fromEntries(Object.entries(profileChanges).filter(([key]) => ['businessName'].includes(key)));
    if (profileChanges.phone && current.vendorProfile) vendorChanges.contactPhone = profileChanges.phone;
    const updatedUser = Object.keys(userChanges).length ? await backendApi.updateUser(userChanges) : current;
    const updatedVendor = Object.keys(vendorChanges).length ? await backendApi.updateVendor(vendorChanges) : current.vendorProfile;
    const account = fromBackendUser({ ...updatedUser, vendorProfile: updatedVendor || updatedUser.vendorProfile });
    await writeStoredSession({ ...session, user: account });
    return { account, accounts: [account] };
  }
  const data = await readStore();
  const account = data.accounts.find(item => item.id === userId);
  if (!account) throw new Error('This demo profile could not be found.');
  const allowed = ['name', 'phone', 'businessName', 'preferredSports'];
  const safeChanges = Object.fromEntries(
    Object.entries(profileChanges).filter(([key]) => allowed.includes(key)),
  );
  if (Object.hasOwn(safeChanges, 'preferredSports')) {
    safeChanges.preferredSports = Array.isArray(safeChanges.preferredSports)
      ? [...new Set(safeChanges.preferredSports.map(item => String(item).trim()).filter(Boolean))]
      : account.preferredSports || [];
  }
  const updatedAccount = { ...account, ...safeChanges };
  const nextData = {
    ...data,
    accounts: data.accounts.map(item => item.id === userId ? updatedAccount : item),
  };
  await saveAuthData(nextData);
  return { account: toPublicUser(updatedAccount), accounts: nextData.accounts };
}
