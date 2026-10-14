const makeId = prefix => `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** Converts a vendor registration draft into normalized persistent records. */
export function createVendorVenueRecords(profile, ownerUserId) {
  const vendorId = `vendor-${ownerUserId}`;
  const venueId = `venue-${ownerUserId}`;
  const timestamp = new Date().toISOString();
  const vendorProfile = {
    id: vendorId,
    ownerUserId,
    businessName: profile.businessName,
    contactPhone: profile.contactPhone || '',
    verificationStatus: 'pending-demo',
    demoLabel: 'Local demo profile; no real verification was performed',
    createdAt: timestamp,
  };
  const venue = {
    id: venueId,
    vendorId,
    name: profile.venueName,
    description: 'Venue profile created in the local PlaySpot demo.',
    address: profile.address,
    city: profile.city,
    latitude: profile.latitude !== '' && Number.isFinite(Number(profile.latitude)) ? Number(profile.latitude) : null,
    longitude: profile.longitude !== '' && Number.isFinite(Number(profile.longitude)) ? Number(profile.longitude) : null,
    locationNote: profile.locationNote || '',
    sports: [...(profile.sports || [])],
    facilities: [...(profile.facilities || [])],
    parkingAvailable: Boolean(profile.parkingAvailable),
    parkingSpaces: profile.parkingAvailable ? Number(profile.parkingSpaces || 0) : 0,
    published: true,
    photoUris: [...(profile.photoUris || [])],
    videoUri: profile.videoUri || null,
    demoLabel: 'Vendor-created local demo venue',
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  const grounds = (profile.grounds || []).map(ground => ({
    id: ground.id || makeId('ground'),
    venueId,
    name: ground.name,
    sport: ground.sport,
    widthMeters: Number(ground.widthMeters),
    lengthMeters: Number(ground.lengthMeters),
    indoorOutdoor: ground.indoorOutdoor,
    surface: ground.surface,
    conditionRating: Number(ground.conditionRating),
    hourlyPricePKR: Number(ground.hourlyPricePKR),
    slotDurationMinutes: Number(ground.slotDurationMinutes) || 60,
    isActive: true,
  }));
  const equipment = (profile.equipment || []).map(item => ({
    id: item.id || makeId('equipment'),
    venueId,
    name: item.name,
    sport: item.sport || profile.sports[0] || '',
    priceMode: String(item.priceMode).toLowerCase() === 'sale' ? 'sale' : 'rental',
    unitPricePKR: Number(item.unitPricePKR),
    quantityAvailable: Number(item.quantityAvailable),
    active: true,
  }));
  const slots = grounds.flatMap(ground => {
    const duration = ground.slotDurationMinutes;
    return Array.from({ length: 7 }, (_, dayIndex) => {
      const date = new Date();
      date.setDate(date.getDate() + dayIndex + 1);
      const dateKey = date.toISOString().slice(0, 10);
      return Array.from({ length: Math.floor(8 * 60 / duration) }, (_, index) => {
        const minuteOfDay = 9 * 60 + index * duration;
        const endMinute = minuteOfDay + duration;
        const format = minutes => `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`;
        return {
          id: `${ground.id}-${dateKey}-${format(minuteOfDay)}`,
          groundId: ground.id,
          date: dateKey,
          startTime: format(minuteOfDay),
          endTime: format(endMinute),
          status: 'available',
        };
      });
    }).flat();
  });

  return { vendorProfile, venue, grounds, equipment, slots };
}
