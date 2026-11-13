import { backendApi } from './backendApi';

const numberOrNull = value => value === '' || value === null || value === undefined ? null : Number(value);

export async function createVendorResources(profile) {
  const venue = await backendApi.createVenue({
    name: profile.venueName,
    description: 'Venue profile created through the PlaySpot mobile app.',
    address: profile.address,
    city: profile.city,
    locationNote: profile.locationNote || null,
    latitude: numberOrNull(profile.latitude),
    longitude: numberOrNull(profile.longitude),
    timeZone: 'Asia/Karachi',
    sports: profile.sports,
    facilities: profile.facilities || [],
    parkingAvailable: Boolean(profile.parkingAvailable),
    parkingSpaces: profile.parkingAvailable ? Number(profile.parkingSpaces || 0) : 0,
    published: false,
  });

  for (const ground of profile.grounds || []) {
    await backendApi.createCourt(venue.id, {
      name: ground.name, sport: ground.sport,
      widthMeters: Number(ground.widthMeters), lengthMeters: Number(ground.lengthMeters),
      indoorOutdoor: String(ground.indoorOutdoor).toUpperCase(), surface: ground.surface,
      conditionRating: Number(ground.conditionRating), hourlyPricePKR: Number(ground.hourlyPricePKR),
      slotDurationMinutes: Number(ground.slotDurationMinutes) || 60,
      openingTime: ground.openingTime || '09:00', closingTime: ground.closingTime || '17:00',
      availableDays: ground.availableDays || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    });
  }
  for (const item of profile.equipment || []) {
    await backendApi.createEquipment(venue.id, {
      name: item.name, sport: item.sport || profile.sports?.[0] || null,
      priceMode: String(item.priceMode).toUpperCase() === 'SALE' ? 'SALE' : 'RENTAL',
      unitPricePKR: Number(item.unitPricePKR), quantityAvailable: Number(item.quantityAvailable), active: true,
    });
  }
  const hasLocalMedia = Boolean(profile.photoUris?.length || profile.videoUri);
  return {
    venue,
    notice: hasLocalMedia ? 'Venue, courts and equipment were saved. The selected media remains on this device and was not uploaded; configure venue media storage and add it later.' : null,
  };
}
