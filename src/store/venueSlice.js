import { createSlice } from '@reduxjs/toolkit';
import { createDemoVenueState } from '../data/demoVenueData';
import { intervalsOverlap, prepareBooking } from '../utils/booking';

function createBookingId() {
  return `booking-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const reserveBooking = request => (dispatch, getState) => {
  const bookingRequest = {
    ...request,
    id: request.id || createBookingId(),
    createdAt: request.createdAt || new Date().toISOString(),
  };
  const attempt = prepareBooking(getState().venues, bookingRequest);
  if (!attempt.ok) return attempt;

  dispatch(bookingCommitted(bookingRequest));
  const booking = getState().venues.bookings.find(item => item.id === bookingRequest.id);
  return booking
    ? { ok: true, booking }
    : { ok: false, error: 'That slot could not be reserved. Refresh availability and try again.' };
};

const initialState = {
  ...createDemoVenueState(),
  bookings: [],
  hydrated: false,
  storageNotice: null,
};

const venueSlice = createSlice({
  name: 'venues',
  initialState,
  reducers: {
    venuesHydrated(state, action) {
      const venueData = action.payload.data;
      return {
        ...venueData,
        bookings: Array.isArray(venueData.bookings) ? venueData.bookings : [],
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
    bookingCommitted(state, action) {
      const attempt = prepareBooking(state, action.payload);
      if (!attempt.ok) return;

      const { booking } = attempt;
      state.bookings.push(booking);
      state.slots = state.slots.map(slot => {
        const sameGroundAndDate = slot.groundId === booking.groundId && slot.date === booking.date;
        if (!sameGroundAndDate || slot.status !== 'available' || !intervalsOverlap(
          slot.startTime,
          slot.endTime,
          booking.startTime,
          booking.endTime,
        )) return slot;
        return { ...slot, status: 'unavailable', reservedByBookingId: booking.id };
      });
      booking.addOns.forEach(addOn => {
        const item = state.equipment.find(entry => entry.id === addOn.equipmentId);
        if (item) item.quantityAvailable = Math.max(0, item.quantityAvailable - addOn.quantity);
      });
    },
    bookingCancelled(state, action) {
      const booking = state.bookings.find(item => item.id === action.payload.bookingId);
      if (!booking || booking.status === 'cancelled') return;
      booking.status = 'cancelled';
      booking.cancelledAt = action.payload.cancelledAt || booking.cancelledAt || null;
      state.slots = state.slots.map(slot => {
        if (slot.reservedByBookingId !== booking.id) return slot;
        const { reservedByBookingId, ...availableSlot } = slot;
        return { ...availableSlot, status: 'available' };
      });
      booking.addOns?.forEach(addOn => {
        const item = state.equipment.find(entry => entry.id === addOn.equipmentId);
        if (item) item.quantityAvailable += addOn.quantity;
      });
    },
    venueStorageNoticeSet(state, action) {
      state.storageNotice = action.payload;
    },
  },
});

export const {
  venueCreated,
  bookingCancelled,
  bookingCommitted,
  venuePublicationChanged,
  reviewAdded,
  venueStorageNoticeSet,
  venueUpdated,
  venuesHydrated,
} = venueSlice.actions;

export default venueSlice.reducer;
