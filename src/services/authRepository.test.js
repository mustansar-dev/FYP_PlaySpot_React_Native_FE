const mockValues = {};

jest.mock('@react-native-async-storage/async-storage', () => {
  const store = {
    getItem: jest.fn(async key => (Object.hasOwn(mockValues, key) ? mockValues[key] : null)),
    setItem: jest.fn(async (key, value) => {
      mockValues[key] = value;
    }),
    removeItem: jest.fn(async key => {
      delete mockValues[key];
    }),
    clear: jest.fn(async () => {
      Object.keys(mockValues).forEach(key => delete mockValues[key]);
    }),
  };
  return { __esModule: true, default: store };
});

import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  registerAccount,
  restoreSession,
  signIn,
} from './authRepository';
import { validatePlayerRegistration, validateVendorStep } from '../utils/validation';

const STORAGE_KEY = 'playspot-pk.auth.v1';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('seeds separate player and venue provider demo accounts without plaintext passwords', async () => {
  const result = await restoreSession();
  const persisted = await AsyncStorage.getItem(STORAGE_KEY);

  expect(result.user).toBeNull();
  expect(result.accounts.map(account => account.role)).toEqual(['player', 'vendor']);
  expect(persisted).not.toContain('FieldDay2026');
  expect(persisted).not.toContain('VenueDay2026');
  expect(persisted).toContain('passwordHash');
});

test('a new account can sign in and its role is restored after reloading local data', async () => {
  const account = await registerAccount({
    role: 'player',
    name: 'Demo Player',
    email: 'New.Player@PlaySpot.pk',
    phone: '0300 123 4567',
    preferredSports: ['Futsal'],
    password: 'MyDemoPass2026',
    confirmPassword: 'MyDemoPass2026',
  });
  const persisted = await AsyncStorage.getItem(STORAGE_KEY);
  const login = await signIn('new.player@playspot.pk', 'MyDemoPass2026');
  const restored = await restoreSession();

  expect(account.account.passwordHash).not.toBe('MyDemoPass2026');
  expect(persisted).not.toContain('MyDemoPass2026');
  expect(login.user.role).toBe('player');
  expect(restored.user.email).toBe('new.player@playspot.pk');
  expect(restored.user.role).toBe('player');
});

test('a venue provider profile can be saved without a video', async () => {
  const vendorProfile = {
    businessName: 'Demo Sports House',
    venueName: 'Demo Sports House Court',
    address: 'Fictional street, Gulberg',
    city: 'Lahore',
    sports: ['Padel'],
    grounds: [
      {
        id: 'court-1',
        name: 'Padel Court 1',
        sport: 'Padel',
        widthMeters: 10,
        lengthMeters: 20,
        indoorOutdoor: 'Indoor',
        surface: 'Synthetic',
        conditionRating: 4,
        hourlyPricePKR: 5000,
      },
    ],
    facilities: ['Washrooms'],
    parkingAvailable: false,
    parkingSpaces: 0,
    equipment: [],
    photoUris: [],
    videoUri: null,
  };

  const created = await registerAccount({
    role: 'vendor',
    name: 'Demo Vendor',
    email: 'vendor.new@playspot.pk',
    phone: '0300 123 4568',
    preferredSports: ['Padel'],
    vendorProfile,
    password: 'MyVendorPass2026',
    confirmPassword: 'MyVendorPass2026',
  });
  await signIn('vendor.new@playspot.pk', 'MyVendorPass2026');
  const restored = await restoreSession();

  expect(created.account.role).toBe('vendor');
  expect(restored.user.vendorProfile.grounds[0].widthMeters).toBe(10);
  expect(restored.user.vendorProfile.videoUri).toBeNull();
  expect(await AsyncStorage.getItem(STORAGE_KEY)).not.toContain('MyVendorPass2026');
});

test('incorrect password is rejected and corrupted JSON is safely reset', async () => {
  await expect(signIn('player@playspot.pk', 'incorrect')).rejects.toThrow(
    'Email or password is incorrect.',
  );

  await AsyncStorage.setItem(STORAGE_KEY, '{broken json');
  const restored = await restoreSession();

  expect(restored.user).toBeNull();
  expect(restored.accounts).toHaveLength(2);
  expect(restored.storageNotice).toMatch(/unreadable/i);
});

test('player and vendor step validation rejects missing required data', () => {
  expect(
    validatePlayerRegistration({
      name: '',
      email: 'not-an-email',
      phone: '',
      password: 'short',
      confirmPassword: 'different',
      preferredSports: [],
    }),
  ).toEqual(
    expect.objectContaining({
      name: expect.any(String),
      email: expect.any(String),
      phone: expect.any(String),
      password: expect.any(String),
      confirmPassword: expect.any(String),
      preferredSports: expect.any(String),
    }),
  );

  const vendorErrors = validateVendorStep(
    {
      name: '',
      email: '',
      phone: '',
      businessName: '',
      password: '',
      confirmPassword: '',
      venueName: '',
      address: '',
      city: '',
      sports: [],
      grounds: [],
      facilities: [],
      parkingAvailable: false,
      parkingSpaces: '0',
      equipment: [],
    },
    6,
  );
  expect(vendorErrors).toHaveProperty('venueName');
  expect(vendorErrors).toHaveProperty('grounds');
  expect(vendorErrors).toHaveProperty('businessName');
});
