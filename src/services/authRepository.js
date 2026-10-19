import CryptoJS from 'crypto-js';
import { uniqueValues } from '../utils/collections';
import {
  createSeedDataForMemoryFallback,
  loadAuthData,
  saveAuthData,
} from './authStorage';

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
  const data = await readStore();
  const account = data.accounts.find(item => item.id === userId);
  if (!account) {
    throw new Error('This registration could not be found. Please sign in.');
  }
  await saveAuthData({ ...data, sessionUserId: account.id });
  return { user: toPublicUser(account), accounts: data.accounts };
}

export async function endSession() {
  let data;
  try {
    data = await readStore();
  } catch (error) {
    data = createSeedDataForMemoryFallback();
  }
  await saveAuthData({ ...data, sessionUserId: null });
}

export async function updateAccountProfile(userId, profileChanges) {
  const data = await readStore();
  const account = data.accounts.find(item => item.id === userId);
  if (!account) throw new Error('This demo profile could not be found.');
  const allowed = ['name', 'phone', 'businessName', 'preferredSports'];
  const safeChanges = {};
  Object.keys(profileChanges).forEach(key => {
    if (allowed.includes(key)) safeChanges[key] = profileChanges[key];
  });
  if (Object.hasOwn(safeChanges, 'preferredSports')) {
    safeChanges.preferredSports = Array.isArray(safeChanges.preferredSports)
      ? uniqueValues(safeChanges.preferredSports.map(item => String(item).trim()).filter(Boolean))
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
