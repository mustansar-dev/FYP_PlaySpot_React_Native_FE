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

import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../context/ThemeContext';
import { createDemoVenueState } from '../data/demoVenueData';
import authReducer, { authHydrated } from '../store/authSlice';
import communityReducer from '../store/communitySlice';
import venueReducer, { reserveBooking, venuesHydrated } from '../store/venueSlice';
import { getNextBookableDates, getSlotAvailability } from '../utils/booking';
import { BookingCheckoutScreen, EquipmentAddonsScreen, ManualWalkInBookingScreen } from './BookingScreens';
import {
  ChatConversationScreen,
  GameRoomDetailsScreen,
  SplitPaymentScreen,
  TournamentDetailsScreen,
} from './CommunityScreens';

const vendorUser = { id: 'demo-vendor-001', name: 'Bilal Ahmed', role: 'vendor' };
const playerUser = { id: 'demo-player-001', name: 'Amina Shah', role: 'player' };
const navigation = { goBack: jest.fn(), navigate: jest.fn(), replace: jest.fn() };

function makeStore(user = playerUser) {
  const store = configureStore({ reducer: { auth: authReducer, venues: venueReducer, community: communityReducer } });
  store.dispatch(authHydrated({ accounts: [], user, storageNotice: null }));
  store.dispatch(venuesHydrated({ data: createDemoVenueState(), notice: null }));
  return store;
}

async function renderScreen(ui, store) {
  return render(
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 390, height: 844 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>
          {ui}
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>,
  );
}

beforeEach(() => {
  Object.keys(mockValues).forEach(key => delete mockValues[key]);
  jest.clearAllMocks();
});

test('vendor walk-in and player checkout share one slot conflict check', async () => {
  const store = makeStore(vendorUser);
  const tomorrow = getNextBookableDates()[1].dateKey;
  const slot = store.getState().venues.slots.find(item => item.groundId === 'venue-demo-gulberg-ground-1' && item.date === tomorrow && item.startTime === '16:00');
  const vendorNavigation = { ...navigation };
  const walkIn = await renderScreen(
    <ManualWalkInBookingScreen navigation={vendorNavigation} route={{ params: { venueId: 'venue-demo-gulberg', groundId: slot.groundId, date: tomorrow, slotId: slot.id } }} />,
    store,
  );
  await fireEvent.changeText(walkIn.getByTestId('walkin-customer-name'), 'Sam Demo');
  await fireEvent.press(walkIn.getByTestId('walkin-submit'));
  await waitFor(() => expect(vendorNavigation.replace).toHaveBeenCalledWith('BookingDetails', expect.objectContaining({ bookingId: expect.any(String) })));
  expect(store.getState().venues.bookings[0].source).toBe('walk-in');
  expect(getSlotAvailability({ ...store.getState().venues, slotId: slot.id }).available).toBe(false);

  await act(async () => store.dispatch(authHydrated({ accounts: [], user: playerUser, storageNotice: null })));
  const playerNavigation = { ...navigation, replace: jest.fn() };
  const checkout = await renderScreen(
    <BookingCheckoutScreen navigation={playerNavigation} route={{ params: { venueId: 'venue-demo-gulberg', groundId: slot.groundId, slotId: slot.id, addOns: [] } }} />,
    store,
  );
  await fireEvent.press(checkout.getByTestId('booking-confirm'));
  expect(store.getState().venues.bookings).toHaveLength(1);
  expect(playerNavigation.replace).not.toHaveBeenCalled();
  expect(checkout.getByText(/no longer available/i)).toBeTruthy();
});

test('add-on quantity buttons update the subtotal and stop at available stock', async () => {
  const store = makeStore(playerUser);
  const tomorrow = getNextBookableDates()[1].dateKey;
  const slot = store.getState().venues.slots.find(item => item.groundId === 'venue-demo-gulberg-ground-1' && item.date === tomorrow && item.startTime === '16:00');
  const item = store.getState().venues.equipment.find(entry => entry.venueId === 'venue-demo-gulberg');
  const screen = await renderScreen(
    <EquipmentAddonsScreen navigation={navigation} route={{ params: { venueId: 'venue-demo-gulberg', groundId: slot.groundId, slotId: slot.id } }} />,
    store,
  );
  await fireEvent.press(screen.getByTestId(`addon-plus-${item.id}`));
  expect(screen.getByText('1', { exact: true })).toBeTruthy();
  expect(screen.getAllByText('Rs. 250', { exact: true })).toHaveLength(2);
  for (let index = 1; index < item.quantityAvailable; index += 1) {
    await fireEvent.press(screen.getByTestId(`addon-plus-${item.id}`));
  }
  expect(screen.getByText(String(item.quantityAvailable), { exact: true })).toBeTruthy();
  expect(screen.getByTestId(`addon-plus-${item.id}`).props.accessibilityState.disabled).toBe(true);
});

test('private room rejects the wrong code and accepts the correct code without exceeding capacity', async () => {
  const user = { id: 'new-room-player', name: 'Room Tester', role: 'player' };
  const store = makeStore(user);
  const screen = await renderScreen(<GameRoomDetailsScreen navigation={navigation} route={{ params: { roomId: 'room-demo-dha-padel-private' } }} />, store);
  const before = store.getState().community.rooms.find(room => room.id === 'room-demo-dha-padel-private').members.length;
  await fireEvent.changeText(screen.getByTestId('room-detail-code'), 'WRONG');
  await fireEvent.press(screen.getByTestId('room-join'));
  expect(screen.getByText('That private room code does not match.')).toBeTruthy();
  expect(store.getState().community.rooms.find(room => room.id === 'room-demo-dha-padel-private').members).toHaveLength(before);
  await fireEvent.changeText(screen.getByTestId('room-detail-code'), 'PADEL24');
  await fireEvent.press(screen.getByTestId('room-join'));
  expect(store.getState().community.rooms.find(room => room.id === 'room-demo-dha-padel-private').members).toHaveLength(before + 1);
});

test('local chat messages update the inbox record and remain visible after reopening', async () => {
  const store = makeStore(playerUser);
  const screen = await renderScreen(<ChatConversationScreen navigation={navigation} route={{ params: { conversationId: 'conversation-demo-team' } }} />, store);
  await fireEvent.changeText(screen.getByTestId('chat-message-input'), 'I will bring water.');
  await fireEvent.press(screen.getByTestId('chat-message-send'));
  expect(store.getState().community.messages.some(message => message.body === 'I will bring water.')).toBe(true);
  expect(store.getState().community.conversations.find(item => item.id === 'conversation-demo-team').lastMessage).toBe('I will bring water.');
  await screen.unmount();
  const reopened = await renderScreen(<ChatConversationScreen navigation={navigation} route={{ params: { conversationId: 'conversation-demo-team' } }} />, store);
  expect(reopened.getByText('I will bring water.')).toBeTruthy();
  expect(reopened.getAllByText(/local demo chat/i).length).toBeGreaterThan(0);
});

test('the indivisible split total saves exact PKR shares and tournament join updates the local roster', async () => {
  const store = makeStore(playerUser);
  const splitScreen = await renderScreen(<SplitPaymentScreen navigation={navigation} route={{ params: { totalPKR: 10001 } }} />, store);
  expect(splitScreen.getByTestId('split-share-demo-player-001').props.value).toBe('2501');
  await fireEvent.press(splitScreen.getByTestId('split-save'));
  const split = store.getState().community.splits[0];
  expect(split.shares.reduce((sum, share) => sum + share.amountPKR, 0)).toBe(10001);

  const tournamentScreen = await renderScreen(<TournamentDetailsScreen navigation={navigation} route={{ params: { tournamentId: 'tournament-demo-badminton-open' } }} />, store);
  await fireEvent.press(tournamentScreen.getByTestId('tournament-join'));
  expect(store.getState().community.tournaments.find(item => item.id === 'tournament-demo-badminton-open').participants.some(item => item.userId === playerUser.id)).toBe(true);
});
