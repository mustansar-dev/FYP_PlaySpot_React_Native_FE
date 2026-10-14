import { createSlice } from '@reduxjs/toolkit';
import { createDemoVenueState } from '../data/demoVenueData';

const initialState = {
  ...createDemoVenueState(),
  hydrated: false,
  storageNotice: null,
};

const venueSlice = createSlice({
  name: 'venues',
  initialState,
  reducers: {
    venuesHydrated(state, action) {
      return {
        ...action.payload.data,
        hydrated: true,
        storageNotice: action.payload.notice || null,
      };
    },
    venueCreated(state, action) {
      const { vendorProfile, venue, grounds, equipment, slots = [] } = action.payload;
      state.vendorProfiles.push(vendorProfile);
      state.venues.push(venue);
      state.grounds.push(...grounds);
      state.equipment.push(...equipment);
      state.slots.push(...slots);
    },
    venueUpdated(state, action) {
      const { venue, grounds, equipment, slots } = action.payload;
      state.venues = state.venues.map(item => item.id === venue.id ? venue : item);
      state.grounds = [
        ...state.grounds.filter(item => item.venueId !== venue.id),
        ...grounds,
      ];
      state.equipment = [
        ...state.equipment.filter(item => item.venueId !== venue.id),
        ...equipment,
      ];
      if (slots) {
        state.slots = [
          ...state.slots.filter(item => !grounds.some(ground => ground.venueId === venue.id && ground.id === item.groundId)),
          ...slots,
        ];
      }
      state.vendorProfiles = state.vendorProfiles.map(profile =>
        profile.id === venue.vendorId && action.payload.vendorProfile
          ? action.payload.vendorProfile
          : profile,
      );
    },
    venuePublicationChanged(state, action) {
      const venue = state.venues.find(item => item.id === action.payload.venueId);
      if (venue) {
        venue.published = action.payload.published;
        venue.updatedAt = new Date().toISOString();
      }
    },
    reviewAdded(state, action) {
      state.reviews.unshift(action.payload);
    },
    venueStorageNoticeSet(state, action) {
      state.storageNotice = action.payload;
    },
  },
});

export const {
  venueCreated,
  venuePublicationChanged,
  reviewAdded,
  venueStorageNoticeSet,
  venueUpdated,
  venuesHydrated,
} = venueSlice.actions;

export default venueSlice.reducer;
