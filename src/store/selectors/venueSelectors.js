import { createSelector } from '@reduxjs/toolkit';

export const selectVenues = state => state.venues.venues;
export const selectGroundList = state => state.venues.grounds;
export const selectEquipmentList = state => state.venues.equipment;
export const selectVendorProfiles = state => state.venues.vendorProfiles;

export const selectPublishedVenues = createSelector(
  [selectVenues],
  venues => venues.filter(venue => venue.published),
);
export const selectVenueById = (state, venueId) =>
  state.venues.venues.find(venue => venue.id === venueId) || null;
export const selectGroundsByVenueId = createSelector(
  [selectGroundList, (_state, venueId) => venueId],
  (grounds, venueId) => grounds.filter(ground => ground.venueId === venueId),
);
export const selectEquipmentByVenueId = createSelector(
  [selectEquipmentList, (_state, venueId) => venueId],
  (equipment, venueId) => equipment.filter(item => item.venueId === venueId),
);
export const selectVendorProfileById = (state, vendorId) =>
  state.venues.vendorProfiles.find(profile => profile.id === vendorId) || null;
export const selectVenuesByOwnerId = createSelector(
  [selectVenues, selectVendorProfiles, (_state, ownerUserId) => ownerUserId],
  (venues, profiles, ownerUserId) => {
    const vendorIds = profiles.filter(profile => profile.ownerUserId === ownerUserId).map(profile => profile.id);
    return venues.filter(venue => vendorIds.includes(venue.vendorId));
  },
);
