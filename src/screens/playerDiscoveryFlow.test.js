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
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../context/ThemeContext';
import BottomNavBar from '../components/BottomNavBar';
import FormField from '../components/FormField';
import { createDemoVenueState } from '../data/demoVenueData';
import authReducer, { authHydrated } from '../store/authSlice';
import venueReducer, { venuesHydrated } from '../store/venueSlice';
import { loadVenueData, saveVenueData } from '../services/venueStorage';
import AddReviewScreen from './AddReviewScreen';
import VenueMapScreen from './VenueMapScreen';
import VenueSearchScreen from './VenueSearchScreen';
import PlayerHomeScreen from './PlayerHomeScreen';
import VendorDashboardScreen from './VendorDashboardScreen';
import { EditProfileScreen } from './AccountScreens';

jest.setTimeout(30000);

function makeStore() {
  const store = configureStore({ reducer: { auth: authReducer, venues: venueReducer } });
  store.dispatch(authHydrated({ accounts: [], user: { id: 'player-test', name: 'Test Player', role: 'player' }, storageNotice: null }));
  store.dispatch(venuesHydrated({ data: createDemoVenueState(), notice: null }));
  return store;
}

async function renderScreen(ui, store = makeStore()) {
  const rendered = await render(<Provider store={store}><ThemeProvider><SafeAreaProvider initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 850 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}>{ui}</SafeAreaProvider></ThemeProvider></Provider>);
  rendered.store = store;
  return rendered;
}

beforeEach(() => { Object.keys(mockValues).forEach(key => delete mockValues[key]); });

test('search filters and empty state react to user input', async () => {
  const navigation = { navigate: jest.fn() };
  const screen = await renderScreen(<VenueSearchScreen navigation={navigation} route={{ params: {} }} />);
  expect(screen.getByTestId('venue-filters-toggle')).toBeTruthy();
  expect(screen.queryByTestId('filter-sport-all')).toBeNull();
  await fireEvent.press(screen.getByTestId('venue-filters-toggle'));
  await fireEvent.press(screen.getByTestId('filter-sport-cricket'));
  expect(screen.getByText('2 venues found · approximate distance')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('venue-search-input'), 'no matching venue');
  expect(screen.getByText('No venues match those filters')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('venue-filters-reset'));
  expect(screen.getByText('8 venues found · approximate distance')).toBeTruthy();
});

test('player profile icon opens the profile screen in the drawer and keeps its stack actions', async () => {
  const navigation = { navigate: jest.fn() };
  const screen = await renderScreen(<PlayerHomeScreen navigation={navigation} />);
  await fireEvent.press(screen.getByTestId('player-open-profile'));
  expect(await screen.findByTestId('profile-edit')).toBeTruthy();
  expect(screen.getByTestId('profile-settings')).toBeTruthy();
  expect(screen.queryByText('My bookings')).toBeNull();
  expect(screen.queryByText('Game rooms')).toBeNull();
  expect(screen.queryByTestId('profile-drawer-profile')).toBeNull();
  await fireEvent.press(screen.getByTestId('profile-edit'));
  expect(navigation.navigate).toHaveBeenCalledWith('EditProfile');
  await waitFor(() => expect(screen.queryByTestId('profile-edit')).toBeNull());
});

test('vendor profile button opens venue details and profile actions in the drawer', async () => {
  const store = makeStore();
  store.dispatch(authHydrated({
    accounts: [],
    user: { id: 'demo-vendor-001', name: 'Bilal Ahmed', email: 'vendor@playspot.pk', role: 'vendor' },
    storageNotice: null,
  }));
  const navigation = { navigate: jest.fn() };
  const screen = await renderScreen(<VendorDashboardScreen navigation={navigation} />, store);
  await fireEvent.press(screen.getByTestId('vendor-open-profile'));
  expect(await screen.findByTestId('profile-vendor-venue')).toBeTruthy();
  expect(screen.getByText('Greenline Futsal Club')).toBeTruthy();
  expect(screen.getByTestId('profile-edit')).toBeTruthy();
  expect(screen.getByTestId('profile-settings')).toBeTruthy();
  expect(screen.queryByTestId('profile-analytics')).toBeNull();
  expect(screen.queryByTestId('profile-inventory')).toBeNull();
  await fireEvent.press(screen.getByTestId('profile-settings'));
  expect(navigation.navigate).toHaveBeenCalledWith('Settings');
});

test('player navigation replaces Profile with Notifications and shows the unread dot', async () => {
  const screen = await renderScreen(<BottomNavBar role="player" routeName="PlayerHome" onNavigate={jest.fn()} hasNotifications />);
  expect(screen.getByTestId('bottom-nav-notifications')).toBeTruthy();
  expect(screen.getByTestId('notification-dot')).toBeTruthy();
  expect(screen.queryByTestId('bottom-nav-profile')).toBeNull();
});

test('vendor navigation keeps venue, bookings, availability, and notifications in the tabs', async () => {
  const onNavigate = jest.fn();
  const screen = await renderScreen(<BottomNavBar role="vendor" routeName="VendorDashboard" onNavigate={onNavigate} />);
  expect(screen.getByTestId('bottom-nav-venue')).toBeTruthy();
  expect(screen.getByTestId('bottom-nav-bookings')).toBeTruthy();
  expect(screen.getByTestId('bottom-nav-availability')).toBeTruthy();
  expect(screen.getByTestId('bottom-nav-notifications')).toBeTruthy();
  expect(screen.queryByTestId('bottom-nav-profile')).toBeNull();
  await fireEvent.press(screen.getByTestId('bottom-nav-availability'));
  expect(onNavigate).toHaveBeenCalledWith('VendorAvailability');
});

test('password fields can toggle visibility with an accessible eye control', async () => {
  const screen = await renderScreen(<FormField label="Password" value="play1234" onChangeText={jest.fn()} secureTextEntry testID="test-password" />);
  expect(screen.getByTestId('test-password').props.secureTextEntry).toBe(true);
  expect(screen.getByTestId('test-password-visibility').props.accessibilityLabel).toBe('Show password');
  await fireEvent.press(screen.getByTestId('test-password-visibility'));
  expect(screen.getByTestId('test-password').props.secureTextEntry).toBe(false);
  expect(screen.getByTestId('test-password-visibility').props.accessibilityLabel).toBe('Hide password');
});

test('player profile editing saves the registration sports of interest', async () => {
  const store = makeStore();
  store.dispatch(authHydrated({
    accounts: [],
    user: {
      id: 'demo-player-001',
      name: 'Amina Shah',
      email: 'player@playspot.pk',
      phone: '0300 000 0001',
      role: 'player',
      preferredSports: ['Futsal', 'Cricket'],
    },
    storageNotice: null,
  }));
  const navigation = { goBack: jest.fn() };
  const screen = await renderScreen(<EditProfileScreen navigation={navigation} />, store);
  expect(screen.getByTestId('edit-profile-sports-futsal').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('edit-profile-sports-padel').props.accessibilityState.selected).toBe(false);
  await fireEvent.press(screen.getByTestId('edit-profile-sports-padel'));
  await fireEvent.press(screen.getByTestId('edit-profile-save'));
  await waitFor(() => expect(navigation.goBack).toHaveBeenCalled());
  expect(store.getState().auth.currentUser.preferredSports).toEqual(['Futsal', 'Cricket', 'Padel']);
});

test('map marker selection opens the selected venue details', async () => {
  const navigation = { navigate: jest.fn() };
  const screen = await renderScreen(<VenueMapScreen navigation={navigation} route={{ params: {} }} />);
  await fireEvent.press(screen.getByTestId('map-marker-venue-demo-johar'));
  await fireEvent.press(screen.getByTestId('map-selected-details'));
  expect(navigation.navigate).toHaveBeenCalledWith('VenueDetails', { venueId: 'venue-demo-johar' });
  await fireEvent.press(screen.getByTestId('map-search-this-area'));
  expect(navigation.navigate).toHaveBeenCalledWith('VenueSearch', { origin: expect.objectContaining({ label: 'Lahore' }) });
});

test('map continues with a manually selected area when device location is unavailable', async () => {
  const screen = await renderScreen(<VenueMapScreen navigation={{ navigate: jest.fn() }} route={{ params: {} }} />);
  await fireEvent.press(screen.getByTestId('map-center-dha'));
  expect(screen.getByText('Showing venues relative to your selected demo area.')).toBeTruthy();
  expect(screen.getByText('Manual location · DHA')).toBeTruthy();
});

test('valid review updates rating data and survives the venue storage adapter', async () => {
  const store = makeStore();
  const screen = await renderScreen(<AddReviewScreen navigation={{ goBack: jest.fn() }} route={{ params: { venueId: 'venue-demo-gulberg' } }} />, store);
  await fireEvent.press(screen.getByTestId('review-star-5'));
  await fireEvent.changeText(screen.getByTestId('review-comment'), 'A useful review from this test.');
  await fireEvent.press(screen.getByTestId('review-submit'));
  await waitFor(() => expect(store.getState().venues.reviews[0].comment).toBe('A useful review from this test.'));
  const venueState = store.getState().venues;
  await saveVenueData({ version: venueState.version, vendorProfiles: venueState.vendorProfiles, venues: venueState.venues, grounds: venueState.grounds, equipment: venueState.equipment, slots: venueState.slots, reviews: venueState.reviews });
  const restored = await loadVenueData();
  expect(restored.data.reviews.filter(item => item.venueId === 'venue-demo-gulberg')).toHaveLength(3);
});
