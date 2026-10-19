const mockValues = {};

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async key => Object.hasOwn(mockValues, key) ? mockValues[key] : null),
    setItem: jest.fn(async (key, value) => { mockValues[key] = value; }),
    removeItem: jest.fn(async key => { delete mockValues[key]; }),
    clear: jest.fn(async () => { Object.keys(mockValues).forEach(key => delete mockValues[key]); }),
  },
}));

import AsyncStorage from '@react-native-async-storage/async-storage';
import { configureStore } from '@reduxjs/toolkit';
import { createDemoVenueState } from '../data/demoVenueData';
import { toLocalDateKey } from '../utils/booking';
import { selectEquipmentByVenueId, selectGroundsByVenueId, selectPublishedVenues, selectVenueById } from '../store/selectors/venueSelectors';
import venueReducer, { venueCreated, venueUpdated, venuesHydrated } from '../store/venueSlice';
import { createVendorVenueRecords } from './vendorVenueFactory';
import { loadVenueData, saveVenueData, VENUE_STORAGE_KEY } from './venueStorage';
import { validateVendorStep } from '../utils/validation';

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('seeds eight labeled fictional Lahore venues and normalized related records', async () => {
  const result = await loadVenueData();
  const state = { venues: result.data };
  expect(result.data.venues).toHaveLength(8);
  expect(result.data.venues.every(venue => venue.city === 'Lahore' && venue.demoLabel.includes('Fictional'))).toBe(true);
  expect(result.data.grounds.every(ground => result.data.venues.some(venue => venue.id === ground.venueId))).toBe(true);
  expect(selectPublishedVenues(state)).toHaveLength(8);
  expect(selectVenueById(state, 'venue-demo-gulberg').name).toBe('Greenline Futsal Club');
  expect(selectGroundsByVenueId(state, 'venue-demo-gulberg')).toHaveLength(1);
  expect(selectEquipmentByVenueId(state, 'venue-demo-gulberg')).toHaveLength(1);
  expect(result.data.reviews).toHaveLength(12);
  expect(result.data.slots.length).toBeGreaterThan(0);
});

test('vendor records use stable relationships and include the configured duration in available slots', () => {
  const records = createVendorVenueRecords({
    businessName: 'Sample Business', venueName: 'Sample Venue', address: 'Demo address', city: 'Lahore',
    latitude: '', longitude: '', locationNote: 'Gulberg', sports: ['Padel'], facilities: [],
    parkingAvailable: false, parkingSpaces: 0, photoUris: [], videoUri: null,
    grounds: [{ id: 'ground-stable-1', name: 'Court 1', sport: 'Padel', widthMeters: 10, lengthMeters: 20, indoorOutdoor: 'Indoor', surface: 'Synthetic', conditionRating: 4, hourlyPricePKR: 5000, slotDurationMinutes: 30 }],
    equipment: [{ id: 'equipment-stable-1', name: 'Racket', priceMode: 'Rental', unitPricePKR: 300, quantityAvailable: 4 }],
  }, 'new-owner-1');
  expect(records.venue.id).toBe('venue-new-owner-1');
  expect(records.grounds[0].venueId).toBe(records.venue.id);
  expect(records.equipment[0].venueId).toBe(records.venue.id);
  expect(records.equipment[0].priceMode).toBe('rental');
  expect(records.venue.latitude).toBeNull();
  expect(records.slots).toHaveLength(128);
  expect(records.slots[0].endTime).toBe('09:30');
});

test('venue edits persist and restore across a fresh storage load', async () => {
  const initial = await loadVenueData();
  const edited = {
    ...initial.data,
    venues: initial.data.venues.map(venue => venue.id === 'venue-demo-gulberg'
      ? { ...venue, name: 'Greenline Futsal Club Updated', published: false }
      : venue),
    equipment: initial.data.equipment.map(item => item.venueId === 'venue-demo-gulberg'
      ? { ...item, quantityAvailable: 3 }
      : item),
  };
  await saveVenueData(edited);
  const restored = await loadVenueData();
  expect(restored.data.venues.find(venue => venue.id === 'venue-demo-gulberg').name).toBe('Greenline Futsal Club Updated');
  expect(restored.data.venues.find(venue => venue.id === 'venue-demo-gulberg').published).toBe(false);
  expect(restored.data.equipment.find(item => item.venueId === 'venue-demo-gulberg').quantityAvailable).toBe(3);
  expect(await AsyncStorage.getItem(VENUE_STORAGE_KEY)).not.toBeNull();
});

test('malformed venue data resets safely to fictional fixtures', async () => {
  await AsyncStorage.setItem(VENUE_STORAGE_KEY, '{bad json');
  const restored = await loadVenueData();
  expect(restored.data.venues).toHaveLength(8);
  expect(restored.notice).toMatch(/unreadable/i);
});

test('booking and community records share the central local persistence adapter', async () => {
  const initial = await loadVenueData();
  const slot = initial.data.slots.find(item => item.status === 'available');
  const booking = {
    id: 'booking-roundtrip-1', source: 'walk-in', status: 'confirmed', paymentMode: 'manual-cash', paymentStatus: 'unpaid',
    venueId: 'venue-demo-gulberg', venueName: 'Greenline Futsal Club', groundId: slot.groundId, groundName: 'Futsal Court 1',
    slotId: slot.id, date: slot.date, startTime: slot.startTime, endTime: slot.endTime, durationMinutes: 60,
    playerUserId: null, vendorUserId: 'demo-vendor-001', customerName: 'Round Trip', customerContact: null,
    groundFeePKR: 4500, addOns: [], addOnsTotalPKR: 0, totalPKR: 4500, createdAt: new Date().toISOString(),
  };
  const community = {
    ...initial.data.community,
    messages: [...initial.data.community.messages, { id: 'message-roundtrip-1', conversationId: 'conversation-demo-team', senderId: 'demo-player-001', senderName: 'Amina', body: 'Saved locally', createdAt: new Date().toISOString() }],
  };
  await saveVenueData({ ...initial.data, bookings: [booking], community });
  const restored = await loadVenueData();
  expect(restored.data.bookings[0].id).toBe('booking-roundtrip-1');
  expect(restored.data.community.messages.some(message => message.body === 'Saved locally')).toBe(true);
});

test('game-room chat persistence restores the selected venue vendor as a participant', async () => {
  const initial = await loadVenueData();
  const room = {
    ...initial.data.community.rooms[0],
    id: 'room-vendor-chat-migration',
    conversationId: 'conversation-vendor-chat-migration',
    venueId: 'venue-demo-model',
    vendorId: undefined,
    vendorUserId: undefined,
  };
  const unreadByUser = {};
  room.members.forEach(member => {
    unreadByUser[member.userId] = 0;
  });
  const conversation = {
    id: room.conversationId,
    kind: 'game-room',
    roomId: room.id,
    title: room.title,
    participantIds: room.members.map(member => member.userId),
    unreadByUser,
    lastMessage: 'Room chat is ready.',
    lastAt: room.createdAt,
    createdAt: room.createdAt,
  };
  const legacySnapshot = {
    ...initial.data,
    community: {
      ...initial.data.community,
      rooms: [...initial.data.community.rooms, room],
      conversations: [...initial.data.community.conversations, conversation],
    },
  };
  await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(legacySnapshot));

  const restored = await loadVenueData();
  const restoredRoom = restored.data.community.rooms.find(item => item.id === room.id);
  const restoredChat = restored.data.community.conversations.find(item => item.id === conversation.id);
  const venueVendor = initial.data.vendorProfiles.find(profile => profile.id === 'vendor-demo-model');
  expect(restoredRoom.vendorUserId).toBe(venueVendor.ownerUserId);
  expect(restoredChat.vendorUserId).toBe(venueVendor.ownerUserId);
  expect(restoredChat.participantIds).toContain(venueVendor.ownerUserId);
});

test('legacy venue-only snapshots are upgraded with local community data and eight-day slots', async () => {
  const legacy = createDemoVenueState();
  await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(legacy));
  const restored = await loadVenueData();
  expect(restored.data.bookings).toEqual([]);
  expect(restored.data.community.rooms.length).toBeGreaterThan(0);
  expect(restored.notice).toMatch(/booking and community/i);
  expect(restored.data.slots.some(slot => slot.date === toLocalDateKey())).toBe(true);
});

test('demo venue factory has related entities and correctly labels local approval state', () => {
  const fixture = createDemoVenueState();
  expect(fixture.vendorProfiles[0].verificationStatus).toBe('demo-approved');
  expect(fixture.vendorProfiles[0].demoLabel).toMatch(/not verified/i);
});

test('Redux onboarding and edit mutations remain normalized and can be persisted as one snapshot', async () => {
  const loaded = await loadVenueData();
  const reduxStore = configureStore({ reducer: { venues: venueReducer } });
  reduxStore.dispatch(venuesHydrated(loaded));
  const records = createVendorVenueRecords({
    businessName: 'Saved Business', venueName: 'Saved Venue', address: 'Manual demo address', city: 'Lahore',
    latitude: '', longitude: '', locationNote: 'Manual fallback', sports: ['Futsal'], facilities: ['Washrooms'],
    parkingAvailable: false, parkingSpaces: 0, photoUris: [], videoUri: null,
    grounds: [{ id: 'saved-ground-1', name: 'Court A', sport: 'Futsal', widthMeters: 20, lengthMeters: 40, indoorOutdoor: 'Indoor', surface: 'Synthetic', conditionRating: 4, hourlyPricePKR: 4000, slotDurationMinutes: 60 }],
    equipment: [{ id: 'saved-item-1', name: 'Ball', priceMode: 'Sale', unitPricePKR: 1200, quantityAvailable: 5 }],
  }, 'saved-owner');
  reduxStore.dispatch(venueCreated(records));
  let state = reduxStore.getState().venues;
  expect(selectVenueById({ venues: state }, records.venue.id).published).toBe(true);
  expect(selectGroundsByVenueId({ venues: state }, records.venue.id)[0].slotDurationMinutes).toBe(60);
  expect(selectEquipmentByVenueId({ venues: state }, records.venue.id)[0].priceMode).toBe('sale');

  reduxStore.dispatch(venueUpdated({
    ...records,
    venue: { ...records.venue, name: 'Saved Venue Updated' },
    grounds: records.grounds,
    equipment: [{ ...records.equipment[0], quantityAvailable: 2 }],
  }));
  state = reduxStore.getState().venues;
  const snapshot = {
    version: state.version,
    vendorProfiles: state.vendorProfiles,
    venues: state.venues,
    grounds: state.grounds,
    equipment: state.equipment,
    slots: state.slots,
    reviews: state.reviews,
  };
  await saveVenueData(snapshot);
  const restored = await loadVenueData();
  expect(restored.data.venues.find(venue => venue.id === records.venue.id).name).toBe('Saved Venue Updated');
  expect(restored.data.equipment.find(item => item.id === 'saved-item-1').quantityAvailable).toBe(2);
});

test('coordinate and slot-duration validation catches incomplete or invalid vendor input', () => {
  expect(validateVendorStep({ venueName: 'Court', address: 'Demo address', city: 'Lahore', latitude: '31.5', longitude: '' }, 1)).toHaveProperty('longitude');
  const errors = validateVendorStep({
    sports: ['Padel'],
    grounds: [{ name: 'Court 1', sport: 'Padel', widthMeters: '10', lengthMeters: '20', indoorOutdoor: 'Indoor', surface: 'Synthetic', conditionRating: '4', hourlyPricePKR: '3000', slotDurationMinutes: '0' }],
  }, 2);
  expect(errors['grounds.0.slotDurationMinutes']).toMatch(/15 to 240/);
});
