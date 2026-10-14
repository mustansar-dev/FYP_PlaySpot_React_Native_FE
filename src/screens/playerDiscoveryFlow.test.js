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
import { createDemoVenueState } from '../data/demoVenueData';
import authReducer, { authHydrated } from '../store/authSlice';
import venueReducer, { venuesHydrated } from '../store/venueSlice';
import { loadVenueData, saveVenueData } from '../services/venueStorage';
import AddReviewScreen from './AddReviewScreen';
import VenueMapScreen from './VenueMapScreen';
import VenueSearchScreen from './VenueSearchScreen';

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
  await fireEvent.press(screen.getByTestId('filter-sport-cricket'));
  expect(screen.getByText('2 venues found · approximate distance')).toBeTruthy();
  await fireEvent.changeText(screen.getByTestId('venue-search-input'), 'no matching venue');
  expect(screen.getByText('No venues match those filters')).toBeTruthy();
  await fireEvent.press(screen.getByTestId('venue-filters-reset'));
  expect(screen.getByText('8 venues found · approximate distance')).toBeTruthy();
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
