import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDemoVenueState } from '../data/demoVenueData';

export const VENUE_STORAGE_KEY = 'playspot-pk.venue-data.v1';

function isValidVenueState(value) {
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

export async function loadVenueData() {
  let raw;
  try {
    raw = await AsyncStorage.getItem(VENUE_STORAGE_KEY);
  } catch (error) {
    return {
      data: createDemoVenueState(),
      notice: 'Venue data could not be read. Fictional demo venues are shown for this session.',
    };
  }

  if (raw === null) {
    const data = createDemoVenueState();
    try {
      await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(data));
      return { data, notice: null };
    } catch (error) {
      return { data, notice: 'Venue data could not be saved. Changes may not survive closing the app.' };
    }
  }

  try {
    const parsed = JSON.parse(raw);
    if (isValidVenueState(parsed)) {
      return { data: parsed, notice: null };
    }
  } catch (error) {
    // Replace malformed local demo data with a fresh fixture set below.
  }

  const data = createDemoVenueState();
  try {
    await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    return { data, notice: 'Saved venue data was invalid and could not be repaired in storage.' };
  }
  return { data, notice: 'Saved venue data was unreadable and has been reset to fictional demo venues.' };
}

export async function saveVenueData(data) {
  if (!isValidVenueState(data)) {
    throw new Error('Venue data could not be saved because its structure is incomplete.');
  }
  await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(data));
}
