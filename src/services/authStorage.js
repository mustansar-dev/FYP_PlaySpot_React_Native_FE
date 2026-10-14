import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'playspot-pk.auth.v1';
const STORE_VERSION = 1;

const seedAccounts = [
  {
    id: 'demo-player-001',
    role: 'player',
    name: 'Amina Shah (Demo)',
    email: 'player@playspot.pk',
    phone: '0300 000 0001',
    preferredSports: ['Futsal', 'Cricket'],
    vendorProfile: null,
    createdAt: '2026-10-12T00:00:00.000Z',
    passwordSalt: 'playspot-player-v1',
    passwordHash: '2af916fd16fc0d43e4e0bd77852c470be595b34cabb88dedc57d1d313562e25f',
  },
  {
    id: 'demo-vendor-001',
    role: 'vendor',
    name: 'Bilal Ahmed (Demo)',
    email: 'vendor@playspot.pk',
    phone: '0300 000 0002',
    preferredSports: ['Futsal', 'Cricket'],
    vendorProfile: {
      businessName: 'Boundary Sports Demo',
      venueName: 'Boundary Sports Arena',
      address: 'Demo address, Gulberg III',
      city: 'Lahore',
      sports: ['Futsal', 'Cricket'],
      grounds: [
        {
          id: 'demo-ground-001',
          name: 'Futsal Court A',
          sport: 'Futsal',
          widthMeters: '20',
          lengthMeters: '40',
          indoorOutdoor: 'Indoor',
          surface: 'Synthetic',
          conditionRating: '4',
          hourlyPricePKR: '4500',
        },
      ],
      facilities: ['Changing rooms', 'Floodlights'],
      parkingAvailable: true,
      parkingSpaces: '20',
      equipment: [
        {
          id: 'demo-item-001',
          name: 'Football',
          priceMode: 'rental',
          unitPricePKR: '300',
          quantityAvailable: '8',
        },
      ],
      photoUris: [],
      videoUri: null,
    },
    createdAt: '2026-10-12T00:00:00.000Z',
    passwordSalt: 'playspot-vendor-v1',
    passwordHash: '425d8c9ab8fef7a3682c7df115bd526ba827fe8f8f05d452386c997c5e95f79b',
  },
];

function makeSeedData() {
  return {
    version: STORE_VERSION,
    accounts: seedAccounts.map(account => ({ ...account })),
    sessionUserId: null,
  };
}

function isValidAccount(account) {
  return Boolean(
    account &&
      typeof account.id === 'string' &&
      (account.role === 'player' || account.role === 'vendor') &&
      typeof account.email === 'string' &&
      typeof account.passwordSalt === 'string' &&
      typeof account.passwordHash === 'string',
  );
}

function isValidStore(value) {
  return Boolean(
    value &&
      value.version === STORE_VERSION &&
      Array.isArray(value.accounts) &&
      value.accounts.every(isValidAccount) &&
      (value.sessionUserId === null || typeof value.sessionUserId === 'string'),
  );
}

async function persistSeed(notice) {
  const data = makeSeedData();
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return { data, notice };
  } catch (error) {
    return {
      data,
      notice: 'Local storage is unavailable. This demo may not remember changes after closing.',
    };
  }
}

export async function loadAuthData() {
  let raw;
  try {
    raw = await AsyncStorage.getItem(STORAGE_KEY);
  } catch (error) {
    return {
      data: makeSeedData(),
      notice: 'Local storage could not be read. Demo accounts are available for this session.',
    };
  }

  if (raw === null) {
    return persistSeed(null);
  }

  let parsed;
  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (removeError) {
      // Keep booting with demo data if the damaged value cannot be removed.
    }
    return persistSeed('Saved demo data was unreadable and has been reset.');
  }

  if (!isValidStore(parsed)) {
    try {
      await AsyncStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      // The in-memory seed still lets the app open if storage is unavailable.
    }
    return persistSeed('Saved demo data was incomplete and has been reset.');
  }

  const sessionExists = parsed.accounts.some(
    account => account.id === parsed.sessionUserId,
  );
  if (parsed.sessionUserId !== null && !sessionExists) {
    const repaired = { ...parsed, sessionUserId: null };
    try {
      await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(repaired));
    } catch (error) {
      return {
        data: repaired,
        notice: 'The saved session was invalid and could not be repaired in storage.',
      };
    }
    return { data: repaired, notice: null };
  }

  return { data: parsed, notice: null };
}

export async function saveAuthData(data) {
  if (!isValidStore(data)) {
    throw new Error('The local demo account data could not be saved.');
  }
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function createSeedDataForMemoryFallback() {
  return makeSeedData();
}
