import { createSlice } from '@reduxjs/toolkit';
import { createDemoVenueState } from '../data/demoVenueData';
import { getBookingDisplayStatus, intervalsOverlap, isBookingActive, prepareBooking, timeToMinutes, toLocalDateKey, WEEK_DAYS } from '../utils/booking';
import { canReviewVenue, validateReview } from '../utils/venueDiscovery';

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

export const submitVenueReview = ({ venueId, stars, comment }) => (dispatch, getState) => {
  const state = getState();
  const user = state.auth?.currentUser;
  const errors = validateReview(stars, comment);
  if (Object.keys(errors).length) return { ok: false, error: Object.values(errors)[0] };
  if (!canReviewVenue({ user, bookings: state.venues.bookings, venueId })) {
    return { ok: false, error: 'You can review this venue after your booking has finished.' };
  }
  const review = {
    id: `review-local-${Date.now()}`,
    venueId,
    playerUserId: user.id,
    playerName: user.name || 'PlaySpot player',
    stars,
    comment: comment.trim(),
    createdAt: new Date().toISOString(),
  };
  dispatch(reviewAdded(review));
  return { ok: true, review };
};

export const confirmBookingAttendance = ({ bookingId }) => (dispatch, getState) => {
  const state = getState();
  const user = state.auth?.currentUser;
  const booking = state.venues.bookings.find(item => item.id === bookingId);
  const venue = state.venues.venues.find(item => item.id === booking?.venueId);
  const vendorProfile = state.venues.vendorProfiles.find(item => item.id === venue?.vendorId);
  if (!booking || booking.source !== 'player' || booking.status === 'cancelled') {
    return { ok: false, error: 'Only an active player booking can be marked as attended.' };
  }
  if (user?.role !== 'vendor' || vendorProfile?.ownerUserId !== user.id) {
    return { ok: false, error: 'Only the venue owner can confirm attendance.' };
  }
  if (getBookingDisplayStatus(booking) !== 'Completed') {
    return { ok: false, error: 'Attendance can be confirmed after the booked time has ended.' };
  }
  dispatch(bookingAttendanceConfirmed({ bookingId, attendedAt: new Date().toISOString() }));
  return { ok: true };
};

export const reserveTournamentGrounds = request => (dispatch, getState) => {
  const state = getState().venues;
  const venue = state.venues.find(item => item.id === request.venueId);
  const profile = state.vendorProfiles.find(item => item.id === venue?.vendorId);
  if (!venue || profile?.ownerUserId !== request.vendorUserId) return { ok: false, error: 'Choose a venue owned by this vendor account.' };
  const start = timeToMinutes(request.startTime);
  const end = timeToMinutes(request.endTime);
  const date = new Date(`${request.date}T12:00:00`);
  if (!request.date || Number.isNaN(date.getTime()) || toLocalDateKey(date) !== request.date || start === null || end === null || end <= start) {
    return { ok: false, error: 'Enter a valid tournament date and a finish time after the start time.' };
  }
  if (new Date(`${request.date}T${request.startTime}:00`).getTime() <= Date.now()) return { ok: false, error: 'Tournament ground times must be in the future.' };
  const groundIds = [...new Set(request.groundIds || [])];
  if (!groundIds.length) return { ok: false, error: 'Choose at least one ground for this tournament.' };
  const grounds = groundIds.map(id => state.grounds.find(ground => ground.id === id && ground.venueId === venue.id && ground.sport === request.sport && ground.isActive !== false));
  if (grounds.some(ground => !ground)) return { ok: false, error: `Choose active ${request.sport} grounds from the host venue.` };
  const eventDay = WEEK_DAYS[(date.getDay() + 6) % 7];
  for (const ground of grounds) {
    const opens = timeToMinutes(ground.openingTime || '09:00');
    const closes = timeToMinutes(ground.closingTime || '17:00');
    if (Array.isArray(ground.availableDays) && !ground.availableDays.includes(eventDay)) {
      return { ok: false, error: `${ground.name} is not available on ${eventDay}s.` };
    }
    if (opens === null || closes === null || start < opens || end > closes) {
      return { ok: false, error: `Tournament hours must fit ${ground.name}'s ${ground.openingTime || '09:00'}–${ground.closingTime || '17:00'} schedule.` };
    }
    const conflict = state.bookings.find(booking => booking.groundId === ground.id && booking.date === request.date && isBookingActive(booking) && intervalsOverlap(request.startTime, request.endTime, booking.startTime, booking.endTime));
    if (conflict) return { ok: false, error: `${ground.name} already has a booking during those hours.` };
    const unavailableSlot = state.slots.find(slot => slot.groundId === ground.id && slot.date === request.date && slot.status !== 'available' && intervalsOverlap(request.startTime, request.endTime, slot.startTime, slot.endTime));
    if (unavailableSlot) return { ok: false, error: `${ground.name} has an unavailable time during the tournament.` };
  }

  const createdAt = new Date().toISOString();
  const bookings = grounds.map(ground => ({
    id: `booking-tournament-${request.tournamentId}-${ground.id}`,
    source: 'tournament',
    tournamentId: request.tournamentId,
    tournamentTitle: request.tournamentTitle,
    status: 'confirmed',
    paymentMode: 'not-applicable',
    paymentStatus: 'not-applicable',
    roomId: null,
    venueId: venue.id,
    venueName: venue.name,
    groundId: ground.id,
    groundName: ground.name,
    slotId: `tournament-slot-${request.tournamentId}-${ground.id}`,
    date: request.date,
    startTime: request.startTime,
    endTime: request.endTime,
    durationMinutes: end - start,
    playerUserId: null,
    vendorUserId: request.vendorUserId,
    customerName: null,
    customerContact: null,
    groundFeePKR: 0,
    addOns: [],
    addOnsTotalPKR: 0,
    totalPKR: 0,
    createdAt,
  }));
  dispatch(tournamentBookingsCommitted(bookings));
  return { ok: true, bookings };
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
    tournamentBookingsCommitted(state, action) {
      action.payload.forEach(booking => {
        state.bookings.push(booking);
        state.slots = state.slots.map(slot => {
          if (slot.groundId !== booking.groundId || slot.date !== booking.date || slot.status !== 'available' ||
            !intervalsOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime)) return slot;
          return { ...slot, status: 'unavailable', reservedByBookingId: booking.id };
        });
      });
    },
    bookingCancelled(state, action) {
      const booking = state.bookings.find(item => item.id === action.payload.bookingId);
      if (!booking || booking.status === 'cancelled') return;
      booking.status = 'cancelled';
      booking.cancelledAt = action.payload.cancelledAt || booking.cancelledAt || null;
      if (booking.paymentStatus === 'simulated-paid' || booking.paymentStatus === 'split-collecting') {
        booking.paymentStatus = 'simulated-refunded';
        booking.refundedAt = action.payload.cancelledAt || new Date().toISOString();
        booking.refundAmountPKR = Number.isInteger(action.payload.refundAmountPKR)
          ? Math.max(0, action.payload.refundAmountPKR)
          : booking.totalPKR;
      } else if (booking.source === 'walk-in' && booking.paymentStatus === 'paid') {
        booking.paymentStatus = 'cash-refund-due';
      }
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
    bookingAttendanceConfirmed(state, action) {
      const booking = state.bookings.find(item => item.id === action.payload.bookingId);
      if (!booking || booking.status === 'cancelled') return;
      booking.attendanceStatus = 'attended';
      booking.attendedAt = action.payload.attendedAt || new Date().toISOString();
    },
    bookingPaymentStatusUpdated(state, action) {
      const booking = state.bookings.find(item => item.id === action.payload.bookingId);
      if (!booking) return;
      if (booking.status === 'cancelled' && action.payload.paymentStatus !== 'cash-refunded') return;
      booking.paymentStatus = action.payload.paymentStatus;
      if (action.payload.settledAt) booking.settledAt = action.payload.settledAt;
    },
    bookingPaymentModeUpdated(state, action) {
      const booking = state.bookings.find(item => item.id === action.payload.bookingId);
      if (!booking || booking.status !== 'confirmed') return;
      if (action.payload.paymentMode === 'group-split') {
        booking.paymentMode = 'group-split';
        booking.paymentStatus = 'split-collecting';
      } else {
        booking.paymentMode = 'simulated';
        booking.paymentStatus = 'simulated-paid';
      }
    },
    venueStorageNoticeSet(state, action) {
      state.storageNotice = action.payload;
    },
  },
});

export const {
  venueCreated,
  bookingCancelled,
  bookingAttendanceConfirmed,
  bookingPaymentStatusUpdated,
  bookingPaymentModeUpdated,
  bookingCommitted,
  tournamentBookingsCommitted,
  venuePublicationChanged,
  reviewAdded,
  venueStorageNoticeSet,
  venueUpdated,
  venuesHydrated,
} = venueSlice.actions;

export default venueSlice.reducer;
