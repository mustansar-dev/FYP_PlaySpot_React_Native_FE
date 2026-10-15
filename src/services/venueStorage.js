import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDemoCommunityState } from '../data/demoCommunityData';
import { createDemoVenueState } from '../data/demoVenueData';
import { createSlotsForGround, getNextBookableDates, parseLocalDateKey } from '../utils/booking';

export const VENUE_STORAGE_KEY = 'playspot-pk.venue-data.v1';

function hasValidVenueCollections(value) {
  const hasCollections = Boolean(
    value &&
      value.version === 1 &&
      Array.isArray(value.vendorProfiles) &&
      Array.isArray(value.venues) &&
      Array.isArray(value.grounds) &&
      Array.isArray(value.equipment) &&
      Array.isArray(value.slots) &&
      Array.isArray(value.reviews),
  );
  if (!hasCollections) {
    return false;
  }
  const profileIds = new Set(value.vendorProfiles.map(profile => profile?.id));
  const venueIds = new Set(value.venues.map(venue => venue?.id));
  const groundIds = new Set(value.grounds.map(ground => ground?.id));
  return (
    value.vendorProfiles.every(profile => Boolean(profile?.id && profile.ownerUserId && profile.businessName)) &&
    value.venues.every(venue => Boolean(
      venue?.id && profileIds.has(venue.vendorId) && venue.name && venue.city &&
      typeof venue.published === 'boolean' && Array.isArray(venue.sports) && Array.isArray(venue.facilities) &&
      (venue.latitude === null || Number.isFinite(venue.latitude)) &&
      (venue.longitude === null || Number.isFinite(venue.longitude)),
    )) &&
    value.grounds.every(ground => Boolean(
      ground?.id && venueIds.has(ground.venueId) && ground.name && ground.sport &&
      Number.isFinite(ground.widthMeters) && ground.widthMeters > 0 &&
      Number.isFinite(ground.lengthMeters) && ground.lengthMeters > 0 &&
      Number.isFinite(ground.hourlyPricePKR) && ground.hourlyPricePKR > 0 &&
      Number.isInteger(ground.slotDurationMinutes) && ground.slotDurationMinutes > 0,
    )) &&
    value.equipment.every(item => Boolean(
      item?.id && venueIds.has(item.venueId) && item.name &&
      ['rental', 'sale'].includes(item.priceMode) &&
      Number.isFinite(item.unitPricePKR) && item.unitPricePKR > 0 &&
      Number.isInteger(item.quantityAvailable) && item.quantityAvailable >= 0,
    )) &&
    value.slots.every(slot => Boolean(
      slot?.id && groundIds.has(slot.groundId) && slot.date && slot.startTime && slot.endTime &&
      ['available', 'unavailable'].includes(slot.status),
    )) &&
    value.reviews.every(review => Boolean(
      review?.id && venueIds.has(review.venueId) && review.playerName &&
      Number.isInteger(review.stars) && review.stars >= 1 && review.stars <= 5 && review.comment,
    ))
  );
}

function hasValidCommunityData(value) {
  return Boolean(value &&
    Array.isArray(value.rooms) &&
    Array.isArray(value.conversations) &&
    Array.isArray(value.messages) &&
    Array.isArray(value.tournaments) &&
    Array.isArray(value.leaderboard) &&
    Array.isArray(value.splits));
}

function hasValidBookings(value) {
  return Array.isArray(value) && value.every(booking => Boolean(
    booking && booking.id && ['player', 'walk-in'].includes(booking.source) &&
    ['confirmed', 'cancelled', 'pending'].includes(booking.status) && booking.slotId &&
    booking.groundId && booking.venueId && booking.date && booking.startTime && booking.endTime &&
    Array.isArray(booking.addOns) && Number.isInteger(booking.totalPKR) && booking.totalPKR >= 0,
  ));
}

function withUpcomingSlots(data) {
  const slots = [...data.slots];
  const dates = getNextBookableDates(new Date(), 7);
  data.grounds.filter(ground => ground.isActive !== false).forEach(ground => {
    dates.forEach(({ dateKey }) => {
      const hasDay = slots.some(slot => slot.groundId === ground.id && slot.date === dateKey);
      if (!hasDay) {
        const date = parseLocalDateKey(dateKey);
        slots.push(...createSlotsForGround(ground, 1, undefined, undefined, date));
      }
    });
  });
  return { ...data, slots };
}

function normalizeStoredData(value) {
  if (!hasValidVenueCollections(value)) return null;
  const sourceCommunity = hasValidCommunityData(value.community)
    ? value.community
    : createDemoCommunityState();
  const community = {
    rooms: sourceCommunity.rooms,
    conversations: sourceCommunity.conversations,
    messages: sourceCommunity.messages,
    tournaments: sourceCommunity.tournaments,
    leaderboard: sourceCommunity.leaderboard,
    splits: sourceCommunity.splits,
  };
  const bookings = hasValidBookings(value.bookings) ? value.bookings : [];
  const normalized = withUpcomingSlots({ ...value, bookings, community });
  return hasValidCommunityData(normalized.community) && Array.isArray(normalized.bookings)
    ? normalized
    : null;
}

export async function loadVenueData() {
  let raw;
  try {
    raw = await AsyncStorage.getItem(VENUE_STORAGE_KEY);
  } catch (error) {
    return {
      data: normalizeStoredData(createDemoVenueState()),
      notice: 'Venue data could not be read. Fictional demo venues are shown for this session.',
    };
  }

  if (raw === null) {
    const data = normalizeStoredData(createDemoVenueState());
    try {
      await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(data));
      return { data, notice: null };
    } catch (error) {
      return { data, notice: 'Venue data could not be saved. Changes may not survive closing the app.' };
    }
  }

  try {
    const parsed = JSON.parse(raw);
    const data = normalizeStoredData(parsed);
    if (data) {
      const upgraded = !hasValidBookings(parsed.bookings) || !hasValidCommunityData(parsed.community);
      return {
        data,
        notice: upgraded ? 'Local booking and community demo data is ready on this device.' : null,
      };
    }
  } catch (error) {
    // Replace malformed local demo data with a fresh fixture set below.
  }

  const data = normalizeStoredData(createDemoVenueState());
  try {
    await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    return { data, notice: 'Saved venue data was invalid and could not be repaired in storage.' };
  }
  return { data, notice: 'Saved venue data was unreadable and has been reset to fictional demo venues.' };
}

export async function saveVenueData(data) {
  const normalized = normalizeStoredData(data);
  if (!normalized) {
    throw new Error('Venue data could not be saved because its structure is incomplete.');
  }
  await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(normalized));
}
