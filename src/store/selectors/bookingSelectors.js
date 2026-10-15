import { createSelector } from '@reduxjs/toolkit';
import { isBookingActive } from '../../utils/booking';
import { selectVenuesByOwnerId } from './venueSelectors';

export const selectBookings = state => state.venues.bookings || [];
export const selectSlots = state => state.venues.slots;
export const selectBookingById = (state, bookingId) =>
  selectBookings(state).find(booking => booking.id === bookingId) || null;

export const selectBookingsForUser = createSelector(
  [selectBookings, (_state, userId) => userId],
  (bookings, userId) => bookings.filter(booking => booking.playerUserId === userId),
);

export const selectBookingsForVendor = createSelector(
  [selectBookings, selectVenuesByOwnerId],
  (bookings, venues) => {
    const venueIds = new Set(venues.map(venue => venue.id));
    return bookings.filter(booking => venueIds.has(booking.venueId));
  },
);

export function selectActiveBookingForSlot(state, slotId, now = new Date()) {
  return selectBookings(state).find(booking => booking.slotId === slotId && isBookingActive(booking, now)) || null;
}

export function selectSlotsForGroundAndDate(state, groundId, date) {
  return state.venues.slots
    .filter(slot => slot.groundId === groundId && slot.date === date)
    .sort((first, second) => first.startTime.localeCompare(second.startTime));
}
