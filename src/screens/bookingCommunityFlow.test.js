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
import { act, fireEvent, render, waitFor, within } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../context/ThemeContext';
import BottomNavBar from '../components/BottomNavBar';
import { NotificationsScreen } from './AccountScreens';
import { createDemoVenueState } from '../data/demoVenueData';
import authReducer, { authHydrated } from '../store/authSlice';
import communityReducer from '../store/communitySlice';
import venueReducer, { bookingCancelled, reserveBooking, venuesHydrated } from '../store/venueSlice';
import { createRoomPaymentShares } from '../utils/community';
import { gameRoomUpdated, messageSent, recordWalkInCashRefund, updateGameRoomPaymentShares } from '../store/communitySlice';
import { getNextBookableDates, getSlotAvailability } from '../utils/booking';
import { BookingCheckoutScreen, EquipmentAddonsScreen, ManualWalkInBookingScreen, MyBookingsScreen } from './BookingScreens';
import {
  ChatInboxScreen,
  ChatConversationScreen,
  CreateGameRoomScreen,
  GameRoomDetailsScreen,
  SplitPaymentScreen,
  TournamentDetailsScreen,
} from './CommunityScreens';

jest.setTimeout(30000);

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
  await waitFor(() => expect(vendorNavigation.replace).toHaveBeenCalledWith('VendorBookings', expect.objectContaining({ highlightBookingId: expect.any(String) })));
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

test('cancelled paid walk-ins stay cash-refund-due until the venue owner records the cash return', () => {
  const store = makeStore(vendorUser);
  const tomorrow = getNextBookableDates()[1].dateKey;
  const slot = store.getState().venues.slots.find(item => item.groundId === 'venue-demo-gulberg-ground-1' && item.date === tomorrow && item.startTime === '16:00');
  const result = store.dispatch(reserveBooking({
    source: 'walk-in', vendorUserId: vendorUser.id, customerName: 'Walk-in guest',
    slotId: slot.id, addOns: [], paymentMode: 'manual-cash', paymentStatus: 'paid',
  }));
  expect(result.ok).toBe(true);
  store.dispatch(bookingCancelled({ bookingId: result.booking.id }));
  expect(store.getState().venues.bookings[0].paymentStatus).toBe('cash-refund-due');
  expect(store.dispatch(recordWalkInCashRefund({ bookingId: result.booking.id }))).toMatchObject({ ok: true });
  expect(store.getState().venues.bookings[0].paymentStatus).toBe('cash-refunded');
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
  const joinedMember = store.getState().community.rooms.find(room => room.id === 'room-demo-dha-padel-private').members.find(member => member.userId === user.id);
  expect(joinedMember.sharePKR).toBe(1100);
  expect(joinedMember.paymentStatus).toBe('simulated-paid');
});

test('local chat messages update the inbox record and remain visible after reopening', async () => {
  const store = makeStore(playerUser);
  const screen = await renderScreen(<ChatConversationScreen navigation={navigation} route={{ params: { conversationId: 'conversation-demo-team' } }} />, store);
  await fireEvent.changeText(screen.getByTestId('chat-message-input'), 'I will bring water.');
  await fireEvent.press(screen.getByTestId('chat-message-send'));
  expect(store.getState().community.messages.some(message => message.body === 'I will bring water.')).toBe(true);
  expect(store.getState().community.conversations.find(item => item.id === 'conversation-demo-team').lastMessage).toBe('I will bring water.');
  expect(store.getState().community.notifications.some(item => item.recipientId === 'demo-player-002' && item.body.includes('I will bring water.'))).toBe(true);
  expect(store.getState().community.notifications.some(item => item.recipientId === 'demo-player-003' && item.body.includes('I will bring water.'))).toBe(true);
  await screen.unmount();
  const reopened = await renderScreen(<ChatConversationScreen navigation={navigation} route={{ params: { conversationId: 'conversation-demo-team' } }} />, store);
  expect(reopened.getByText('I will bring water.')).toBeTruthy();
  expect(reopened.getAllByText(/local demo chat/i).length).toBeGreaterThan(0);
});

test('the indivisible split total saves exact PKR shares and tournament join updates the local roster', async () => {
  const organizer = { id: 'demo-player-006', name: 'Bilal H.', role: 'player' };
  const store = makeStore(organizer);
  const room = store.getState().community.rooms.find(item => item.id === 'room-demo-dha-padel-private');
  const paymentShares = createRoomPaymentShares(10001, 4, room.members.map((member, index) => ({ ...member, seatIndex: index })), 'pay-at-venue');
  const members = room.members.map((member, index) => ({ ...member, seatIndex: index, sharePKR: paymentShares[index].amountPKR, paymentStatus: paymentShares[index].status }));
  store.dispatch(gameRoomUpdated({ ...room, capacity: 4, totalCostPKR: 10001, costPerParticipantPKR: 2501, paymentShares, members }));
  const splitScreen = await renderScreen(<SplitPaymentScreen navigation={navigation} route={{ params: { roomId: room.id } }} />, store);
  expect(splitScreen.getByTestId('split-share-seat-0').props.value).toBe('2501');
  expect(splitScreen.getByText('Rs. 10,001')).toBeTruthy();
  await fireEvent.press(splitScreen.getByTestId('split-save'));
  const saved = store.getState().community.rooms.find(item => item.id === room.id).paymentShares;
  expect(saved.reduce((sum, share) => sum + share.amountPKR, 0)).toBe(10001);

  const tournamentScreen = await renderScreen(<TournamentDetailsScreen navigation={navigation} route={{ params: { tournamentId: 'tournament-demo-badminton-open' } }} />, store);
  await fireEvent.press(tournamentScreen.getByTestId('tournament-join'));
  expect(store.getState().community.tournaments.find(item => item.id === 'tournament-demo-badminton-open').participants.some(item => item.userId === organizer.id)).toBe(true);
});

test('game room form suggests only matching-sport venues and shows slot cost instead of date/time fields', async () => {
  const store = makeStore(playerUser);
  const screen = await renderScreen(<CreateGameRoomScreen navigation={navigation} />, store);
  await fireEvent.press(screen.getByTestId('room-sport-badminton'));
  expect(screen.getByTestId('room-capacity').props.value).toBe('4');
  expect(screen.getByText('Model Town Badminton Hall')).toBeTruthy();
  expect(screen.queryByText('Greenline Futsal Club')).toBeNull();
  expect(screen.queryByTestId('room-date')).toBeNull();
  expect(screen.queryByTestId('room-start-time')).toBeNull();
  expect(screen.getAllByText(/NEXT AVAILABLE/).length).toBeGreaterThan(0);
  expect(screen.getAllByText(/TOTAL/).length).toBeGreaterThan(0);
  await fireEvent.press(screen.getAllByTestId(/room-slot-/)[0]);
  expect(screen.getByTestId('room-venue-change')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('room-visibility-private'));
  expect(screen.getByTestId('room-join-code')).toBeTruthy();
  expect(screen.getAllByText(/2,200/).length).toBeGreaterThan(0);
});

test('simulated game-room creation reserves the venue slot, caps badminton at four, and creates a private room chat', async () => {
  const store = makeStore(playerUser);
  const playerNavigation = { ...navigation, navigate: jest.fn(), replace: jest.fn() };
  const screen = await renderScreen(<CreateGameRoomScreen navigation={playerNavigation} />, store);
  expect(screen.getByTestId('room-venue-suggestions').props.nestedScrollEnabled).toBe(true);
  expect(screen.getByTestId('room-venue-suggestions').props.style).toEqual(expect.objectContaining({ maxHeight: 320 }));
  await fireEvent.changeText(screen.getByTestId('room-title'), 'Saturday badminton doubles');
  await fireEvent.press(screen.getByTestId('room-sport-badminton'));
  const suggestedSlotId = screen.getAllByTestId(/room-slot-/)[0].props.testID.replace('room-slot-', '');
  await fireEvent.press(screen.getByTestId(`room-slot-${suggestedSlotId}`));
  expect(screen.getByTestId('room-capacity').props.value).toBe('4');
  expect(screen.getByTestId('room-venue-chat')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('room-venue-chat'));
  const selectedSlot = store.getState().venues.slots.find(slot => slot.id === suggestedSlotId);
  const selectedGround = store.getState().venues.grounds.find(ground => ground.id === selectedSlot.groundId);
  const selectedVenue = store.getState().venues.venues.find(venue => venue.id === selectedGround.venueId);
  const selectedVendor = store.getState().venues.vendorProfiles.find(profile => profile.id === selectedVenue.vendorId);
  const directVendorConversation = store.getState().community.conversations.find(item => item.kind === 'venue-vendor' && item.venueId === selectedVenue.id && item.playerUserId === playerUser.id);
  expect(directVendorConversation.participantIds).toEqual([playerUser.id, selectedVendor.ownerUserId]);
  expect(playerNavigation.navigate).toHaveBeenCalledWith('ChatConversation', { conversationId: directVendorConversation.id });
  expect(screen.getByText('Pay Rs. 550 & create room')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('room-submit'));

  await waitFor(() => expect(playerNavigation.replace).toHaveBeenCalledWith('GameRoomDetails', expect.objectContaining({ roomId: expect.any(String) })));
  const state = store.getState();
  const createdRoom = state.community.rooms.find(item => item.id === playerNavigation.replace.mock.calls[0][1].roomId);
  const reservation = state.venues.bookings.find(item => item.id === createdRoom.bookingId);
  expect(createdRoom.capacity).toBe(4);
  expect(createdRoom.totalCostPKR).toBe(2200);
  expect(createdRoom.paymentShares.map(item => item.amountPKR)).toEqual([550, 550, 550, 550]);
  expect(createdRoom.paymentShares[0].status).toBe('simulated-paid');
  expect(reservation.paymentMode).toBe('group-split');
  expect(reservation.paymentStatus).toBe('split-collecting');
  expect(getSlotAvailability({ ...state.venues, slotId: createdRoom.slotId }).available).toBe(false);
  const roomConversation = state.community.conversations.find(item => item.kind === 'game-room' && item.roomId === createdRoom.id);
  expect(roomConversation).toBeTruthy();
  expect(createdRoom.vendorUserId).toBe(selectedVendor.ownerUserId);
  expect(roomConversation.participantIds).toContain(selectedVendor.ownerUserId);

  await act(async () => store.dispatch(authHydrated({ accounts: [], user: { id: selectedVendor.ownerUserId, name: selectedVendor.businessName, role: 'vendor' }, storageNotice: null })));
  const vendorNavigation = { ...navigation, navigate: jest.fn() };
  const vendorInbox = await renderScreen(<ChatInboxScreen navigation={vendorNavigation} />, store);
  await fireEvent.press(vendorInbox.getByTestId(`chat-item-${roomConversation.id}`));
  expect(vendorNavigation.navigate).toHaveBeenCalledWith('ChatConversation', { conversationId: roomConversation.id });
  const vendorRoomChat = await renderScreen(<ChatConversationScreen navigation={navigation} route={{ params: { conversationId: roomConversation.id } }} />, store);
  await fireEvent.changeText(vendorRoomChat.getByTestId('chat-message-input'), 'The court is ready for your room.');
  await fireEvent.press(vendorRoomChat.getByTestId('chat-message-send'));
  expect(store.getState().community.messages.some(message => message.conversationId === roomConversation.id && message.senderId === selectedVendor.ownerUserId)).toBe(true);
  expect(store.getState().community.notifications.some(item => item.recipientId === playerUser.id && item.roomId === createdRoom.id)).toBe(true);
  await act(async () => store.dispatch(authHydrated({ accounts: [], user: playerUser, storageNotice: null })));

  const splitScreen = await renderScreen(<SplitPaymentScreen navigation={navigation} route={{ params: { roomId: createdRoom.id } }} />, store);
  expect(within(splitScreen.getByTestId('split-your-share')).getByText('Simulated paid')).toBeTruthy();
  expect(splitScreen.queryByTestId('room-share-pay')).toBeNull();
  const editNavigation = { ...navigation, goBack: jest.fn() };
  const editScreen = await renderScreen(<CreateGameRoomScreen navigation={editNavigation} route={{ params: { roomId: createdRoom.id } }} />, store);
  await fireEvent.changeText(editScreen.getByTestId('room-title'), 'Updated badminton group');
  await fireEvent.press(editScreen.getByTestId('room-submit'));
  await waitFor(() => expect(store.getState().community.rooms.find(item => item.id === createdRoom.id).title).toBe('Updated badminton group'));
  expect(store.getState().venues.bookings).toHaveLength(1);
  expect(editNavigation.goBack).toHaveBeenCalled();
});

test('Bookings lists created or joined game rooms and the organizer can open room settings', async () => {
  const store = makeStore(playerUser);
  const playerNavigation = { ...navigation, navigate: jest.fn() };
  const bookings = await renderScreen(<MyBookingsScreen navigation={playerNavigation} />, store);
  await fireEvent.press(bookings.getByTestId('my-game-room-room-demo-gulberg-futsal'));
  expect(playerNavigation.navigate).toHaveBeenCalledWith('GameRoomDetails', { roomId: 'room-demo-gulberg-futsal' });

  const details = await renderScreen(<GameRoomDetailsScreen navigation={playerNavigation} route={{ params: { roomId: 'room-demo-gulberg-futsal' } }} />, store);
  expect(details.getByTestId('room-edit')).toBeTruthy();
  await fireEvent.press(details.getByTestId('room-edit'));
  expect(playerNavigation.navigate).toHaveBeenCalledWith('CreateGameRoom', { roomId: 'room-demo-gulberg-futsal' });
});

test('players pay before joining and cannot edit amounts or open another room chat', async () => {
  const user = { id: 'new-room-player', name: 'Room Tester', role: 'player' };
  const store = makeStore(user);
  const roomId = 'room-demo-dha-padel-private';
  const roomScreen = await renderScreen(<GameRoomDetailsScreen navigation={navigation} route={{ params: { roomId } }} />, store);
  expect(roomScreen.queryByTestId('room-edit')).toBeNull();
  await fireEvent.changeText(roomScreen.getByTestId('room-detail-code'), 'PADEL24');
  await fireEvent.press(roomScreen.getByTestId('room-join'));
  const shareEdit = store.dispatch(updateGameRoomPaymentShares({ roomId, userId: user.id, shares: store.getState().community.rooms.find(item => item.id === roomId).paymentShares }));
  expect(shareEdit).toMatchObject({ ok: false, error: expect.stringMatching(/organizer/i) });

  const paymentScreen = await renderScreen(<SplitPaymentScreen navigation={navigation} route={{ params: { roomId } }} />, store);
  expect(paymentScreen.queryByTestId('split-share-seat-2')).toBeNull();
  expect(paymentScreen.queryByTestId('room-share-pay')).toBeNull();
  expect(store.getState().community.rooms.find(item => item.id === roomId).members.find(member => member.userId === user.id).paymentStatus).toBe('simulated-paid');

  const outsiderStore = makeStore({ id: 'outsider', name: 'Outsider', role: 'player' });
  const outsider = await renderScreen(<ChatConversationScreen navigation={navigation} route={{ params: { conversationId: 'conversation-demo-room-padel' } }} />, outsiderStore);
  expect(outsider.getByText('Join this game room to open its private chat')).toBeTruthy();
  expect(outsider.queryByTestId('chat-message-input')).toBeNull();
});

test('room message notifications are personalized and can be opened from Notifications', async () => {
  const store = makeStore(playerUser);
  store.dispatch(messageSent({
    id: 'message-notification-test',
    conversationId: 'conversation-demo-team',
    senderId: 'demo-player-002',
    senderName: 'Hamza R.',
    body: 'The venue slot is confirmed.',
    createdAt: new Date().toISOString(),
  }));
  const navigationSpy = { navigate: jest.fn(), goBack: jest.fn() };
  const screen = await renderScreen(<NotificationsScreen navigation={navigationSpy} />, store);
  const notification = store.getState().community.notifications.find(item => item.messageId === 'message-notification-test' && item.recipientId === playerUser.id);
  expect(notification).toBeTruthy();
  expect(screen.getAllByText(/New message in Gulberg evening futsal/).length).toBeGreaterThan(0);
  await fireEvent.press(screen.getByTestId(`notification-item-${notification.id}`));
  expect(navigationSpy.navigate).toHaveBeenCalledWith('ChatConversation', { conversationId: 'conversation-demo-team' });
  expect(store.getState().community.notifications.find(item => item.id === notification.id).readAt).toBeTruthy();
});

test('notification tab shows an unread dot and does not include a Profile tab', async () => {
  const screen = await renderScreen(<BottomNavBar role="player" routeName="PlayerHome" onNavigate={jest.fn()} hasNotifications />, makeStore());
  expect(screen.getByTestId('bottom-nav-notifications')).toBeTruthy();
  expect(screen.getByTestId('notification-dot')).toBeTruthy();
  expect(screen.queryByTestId('bottom-nav-profile')).toBeNull();
});
