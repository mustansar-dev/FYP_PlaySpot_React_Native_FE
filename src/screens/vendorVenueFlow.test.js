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

jest.mock('react-native-image-picker', () => ({
  launchImageLibrary: jest.fn(async () => ({ didCancel: true })),
}));

import React from 'react';
import { configureStore } from '@reduxjs/toolkit';
import { fireEvent, render, waitFor } from '@testing-library/react-native';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '../context/ThemeContext';
import { createDemoVenueState } from '../data/demoVenueData';
import VendorRegistrationScreen from './VendorRegistrationScreen';
import VendorVenueManagementScreen from './VendorVenueManagementScreen';
import authReducer, { authHydrated, sessionStarted } from '../store/authSlice';
import venueReducer, { venuesHydrated } from '../store/venueSlice';
import { selectEquipmentByVenueId, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';
import { loadVenueData, saveVenueData } from '../services/venueStorage';
import { startSession } from '../services/authRepository';
import AsyncStorage from '@react-native-async-storage/async-storage';

jest.setTimeout(30000);

const navigation = { goBack: jest.fn(), replace: jest.fn(), navigate: jest.fn() };

function createTestStore() {
  const testStore = configureStore({
    reducer: { auth: authReducer, venues: venueReducer },
    middleware: getDefaultMiddleware => getDefaultMiddleware({
      immutableCheck: false,
      serializableCheck: { warnAfter: 1000 },
    }),
  });
  testStore.dispatch(authHydrated({ accounts: [], user: null, storageNotice: null }));
  testStore.dispatch(venuesHydrated({ data: createDemoVenueState(), notice: null }));
  return testStore;
}

async function renderWithProviders(testStore, children) {
  return render(
    <Provider store={testStore}>
      <ThemeProvider>
        <SafeAreaProvider
          initialMetrics={{ frame: { x: 0, y: 0, width: 400, height: 850 }, insets: { top: 0, right: 0, bottom: 0, left: 0 } }}
        >
          {children}
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>,
  );
}

async function type(screen, testID, value) {
  await fireEvent.changeText(screen.getByTestId(testID), value);
}

async function press(screen, testID) {
  await fireEvent.press(screen.getByTestId(testID));
}

async function continueStep(screen) {
  await press(screen, 'vendor-next');
}

beforeEach(async () => {
  await AsyncStorage.clear();
  jest.clearAllMocks();
});

test('vendor can complete onboarding, edit the venue and equipment, and restore the saved data', async () => {
  const testStore = createTestStore();
  const registration = await renderWithProviders(testStore, <VendorRegistrationScreen navigation={navigation} />);

  await type(registration, 'vendor-owner-name', 'Morgan Vendor');
  await type(registration, 'vendor-email', 'morgan.vendor@example.com');
  await type(registration, 'vendor-phone', '03001234567');
  await type(registration, 'vendor-business-name', 'Morgan Sports');
  await type(registration, 'vendor-password', 'LocalDemoPass27');
  await type(registration, 'vendor-confirm-password', 'LocalDemoPass27');
  await continueStep(registration);

  await type(registration, 'vendor-venue-name', 'Morgan Padel Courts');
  await type(registration, 'vendor-address', 'Fictional address, Gulberg');
  await type(registration, 'vendor-city', 'Lahore');
  await type(registration, 'vendor-location-note', 'Near the demo market');
  await continueStep(registration);

  await press(registration, 'vendor-sport-padel');
  await type(registration, 'vendor-ground-name-1', 'Padel Court A');
  await press(registration, 'vendor-ground-sport-1-padel');
  await type(registration, 'vendor-ground-width-1', '10');
  await type(registration, 'vendor-ground-length-1', '20');
  await press(registration, 'vendor-ground-type-1-indoor');
  await press(registration, 'vendor-ground-surface-1-synthetic');
  await press(registration, 'vendor-ground-condition-1-4');
  await type(registration, 'vendor-ground-price-1', '5000');
  await type(registration, 'vendor-ground-duration-1', '60');
  await continueStep(registration);

  await press(registration, 'vendor-facility-washrooms');
  await press(registration, 'vendor-parking-toggle');
  await type(registration, 'vendor-parking-spaces', '8');
  await continueStep(registration);

  await press(registration, 'vendor-add-equipment');
  await type(registration, 'vendor-equipment-name-1', 'Padel racket');
  await press(registration, 'vendor-equipment-mode-1-sale');
  await type(registration, 'vendor-equipment-price-1', '1200');
  await type(registration, 'vendor-equipment-quantity-1', '4');
  await continueStep(registration);

  // Media is optional. Continue with the local illustrated fallback.
  await continueStep(registration);
  await press(registration, 'vendor-submit');
  await waitFor(() => expect(navigation.replace).toHaveBeenCalledWith('RegistrationSuccess', expect.objectContaining({ role: 'vendor' })));

  let state = testStore.getState();
  const [createdVenue] = selectVenuesByOwnerId(state, navigation.replace.mock.calls[0][1].userId);
  expect(createdVenue.name).toBe('Morgan Padel Courts');
  expect(createdVenue.latitude).toBeNull();
  expect(createdVenue.parkingSpaces).toBe(8);
  expect(selectEquipmentByVenueId(state, createdVenue.id)[0].priceMode).toBe('sale');
  testStore.dispatch(sessionStarted(await startSession(navigation.replace.mock.calls[0][1].userId)));

  await registration.unmount();
  const management = await renderWithProviders(testStore, (
    <VendorVenueManagementScreen navigation={navigation} route={{ params: { venueId: createdVenue.id } }} />
  ));
  await type(management, 'manage-venue-name', 'Morgan Padel Courts Updated');
  await type(management, 'manage-item-quantity-1', '2');
  await press(management, 'manage-venue-save');
  await waitFor(() => expect(testStore.getState().venues.venues.find(venue => venue.id === createdVenue.id).name).toBe('Morgan Padel Courts Updated'));

  state = testStore.getState().venues;
  await saveVenueData({
    version: state.version,
    vendorProfiles: state.vendorProfiles,
    venues: state.venues,
    grounds: state.grounds,
    equipment: state.equipment,
    slots: state.slots,
    reviews: state.reviews,
  });
  const restored = await loadVenueData();
  expect(restored.data.venues.find(venue => venue.id === createdVenue.id).name).toBe('Morgan Padel Courts Updated');
  expect(restored.data.equipment.find(item => item.venueId === createdVenue.id).quantityAvailable).toBe(2);
});
