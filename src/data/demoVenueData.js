/**
 * @typedef {Object} VendorProfile
 * @property {string} id
 * @property {string} ownerUserId
 * @property {string} businessName
 * @property {string} contactPhone
 * @property {'demo-approved'|'pending-demo'} verificationStatus
 * @property {string} demoLabel
 *
 * @typedef {Object} Venue
 * @property {string} id
 * @property {string} vendorId
 * @property {string} name
 * @property {string} address
 * @property {string} city
 * @property {number|null} latitude
 * @property {number|null} longitude
 * @property {string} locationNote
 * @property {string} description
 * @property {string[]} sports
 * @property {string[]} facilities
 * @property {boolean} parkingAvailable
 * @property {number} parkingSpaces
 * @property {boolean} published
 * @property {string[]} photoUris
 * @property {string|null} videoUri
 * @property {string} demoLabel
 *
 * @typedef {Object} Ground
 * @property {string} id
 * @property {string} venueId
 * @property {string} name
 * @property {string} sport
 * @property {number} widthMeters
 * @property {number} lengthMeters
 * @property {'Indoor'|'Outdoor'} indoorOutdoor
 * @property {string} surface
 * @property {number} conditionRating
 * @property {number} hourlyPricePKR
 * @property {number} slotDurationMinutes
 * @property {boolean} isActive
 *
 * @typedef {Object} EquipmentItem
 * @property {string} id
 * @property {string} venueId
 * @property {string} name
 * @property {string} sport
 * @property {'rental'|'sale'} priceMode
 * @property {number} unitPricePKR
 * @property {number} quantityAvailable
 * @property {boolean} active
 *
 * @typedef {Object} VenueSlot
 * @property {string} id
 * @property {string} groundId
 * @property {string} date
 * @property {string} startTime
 * @property {string} endTime
 * @property {'available'|'unavailable'} status
 *
 * @typedef {Object} VenueReview
 * @property {string} id
 * @property {string} venueId
 * @property {string} playerUserId
 * @property {string} playerName
 * @property {number} stars
 * @property {string} comment
 * @property {string} createdAt
 */

const dayFromToday = days => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

const venueFixtures = [
  { id: 'venue-demo-gulberg', vendorId: 'vendor-demo-gulberg', name: 'Greenline Futsal Club', area: 'Gulberg III', latitude: 31.5112, longitude: 74.3431, sport: 'Futsal', width: 20, length: 40, surface: 'Synthetic', price: 4500, facilities: ['Changing rooms', 'Floodlights', 'Washrooms'], indoor: 'Indoor', equipment: 'Football' },
  { id: 'venue-demo-dha', vendorId: 'vendor-demo-dha', name: 'Canal Side Cricket Ground', area: 'DHA Phase 5', latitude: 31.4697, longitude: 74.4082, sport: 'Cricket', width: 45, length: 55, surface: 'Real grass', price: 7000, facilities: ['Seating', 'Parking', 'Washrooms'], indoor: 'Outdoor', equipment: 'Cricket bat' },
  { id: 'venue-demo-johar', vendorId: 'vendor-demo-johar', name: 'Rally Point Padel', area: 'Johar Town', latitude: 31.4691, longitude: 74.2728, sport: 'Padel', width: 10, length: 20, surface: 'Synthetic', price: 5500, facilities: ['Showers', 'Cafe', 'Changing rooms'], indoor: 'Indoor', equipment: 'Padel racket' },
  { id: 'venue-demo-model', vendorId: 'vendor-demo-model', name: 'Model Town Badminton Hall', area: 'Model Town', latitude: 31.4839, longitude: 74.3262, sport: 'Badminton', width: 6.1, length: 13.4, surface: 'Wood', price: 2200, facilities: ['Washrooms', 'Seating'], indoor: 'Indoor', equipment: 'Badminton racket' },
  { id: 'venue-demo-bahria', vendorId: 'vendor-demo-bahria', name: 'Bahria Turf Arena', area: 'Bahria Town', latitude: 31.3683, longitude: 74.1786, sport: 'Football', width: 30, length: 50, surface: 'Turf', price: 6000, facilities: ['Parking', 'Floodlights', 'Changing rooms'], indoor: 'Outdoor', equipment: 'Football' },
  { id: 'venue-demo-wapda', vendorId: 'vendor-demo-wapda', name: 'Wapda Town Racquet Courts', area: 'Wapda Town', latitude: 31.4321, longitude: 74.2632, sport: 'Padel', width: 10, length: 20, surface: 'Synthetic', price: 5000, facilities: ['Parking', 'Cafe'], indoor: 'Outdoor', equipment: 'Padel racket' },
  { id: 'venue-demo-cantt', vendorId: 'vendor-demo-cantt', name: 'Cantt Sports Pavilion', area: 'Lahore Cantt', latitude: 31.5257, longitude: 74.3791, sport: 'Cricket', width: 48, length: 58, surface: 'Real grass', price: 8000, facilities: ['Seating', 'Showers', 'Parking'], indoor: 'Outdoor', equipment: 'Cricket ball' },
  { id: 'venue-demo-iqbal', vendorId: 'vendor-demo-iqbal', name: 'Iqbal Town Community Courts', area: 'Allama Iqbal Town', latitude: 31.5096, longitude: 74.2853, sport: 'Badminton', width: 6.1, length: 13.4, surface: 'Wood', price: 2000, facilities: ['Washrooms', 'Changing rooms'], indoor: 'Indoor', equipment: 'Shuttlecock pack' },
];

/** Returns fresh normalized, fictional Lahore fixtures for a first local launch. */
export function createDemoVenueState() {
  const vendorProfiles = venueFixtures.map((fixture, index) => ({
    id: fixture.vendorId,
    ownerUserId: index === 0 ? 'demo-vendor-001' : `demo-owner-${index + 1}`,
    businessName: `${fixture.name} Demo Operations`,
    contactPhone: '0300 000 0000',
    verificationStatus: 'demo-approved',
    demoLabel: 'Fictional demo vendor; not verified',
    createdAt: '2026-10-12T00:00:00.000Z',
  }));

  const venues = venueFixtures.map(fixture => ({
    id: fixture.id,
    vendorId: fixture.vendorId,
    name: fixture.name,
    description: 'Fictional PlaySpot sample venue for local demonstrations.',
    address: `Demo address near ${fixture.area}`,
    city: 'Lahore',
    latitude: fixture.latitude,
    longitude: fixture.longitude,
    locationNote: fixture.area,
    sports: [fixture.sport],
    facilities: [...fixture.facilities],
    parkingAvailable: fixture.facilities.includes('Parking'),
    parkingSpaces: fixture.facilities.includes('Parking') ? 20 : 0,
    published: true,
    photoUris: [],
    videoUri: null,
    demoLabel: 'Fictional sample; address and coordinates are approximate demo data',
    createdAt: '2026-10-12T00:00:00.000Z',
    updatedAt: '2026-10-12T00:00:00.000Z',
  }));

  const grounds = venueFixtures.map(fixture => ({
    id: `${fixture.id}-ground-1`,
    venueId: fixture.id,
    name: `${fixture.sport} ${fixture.indoor === 'Indoor' ? 'Court' : 'Ground'} 1`,
    sport: fixture.sport,
    widthMeters: fixture.width,
    lengthMeters: fixture.length,
    indoorOutdoor: fixture.indoor,
    surface: fixture.surface,
    conditionRating: 4,
    hourlyPricePKR: fixture.price,
    slotDurationMinutes: 60,
    isActive: true,
  }));

  const equipment = venueFixtures.map((fixture, index) => ({
    id: `${fixture.id}-equipment-1`,
    venueId: fixture.id,
    name: fixture.equipment,
    sport: fixture.sport,
    priceMode: 'rental',
    unitPricePKR: 250 + index * 50,
    quantityAvailable: 6,
    active: true,
  }));

  const slots = grounds.flatMap((ground, groundIndex) =>
    Array.from({ length: 7 }, (_, dayIndex) => {
      const date = dayFromToday(dayIndex + 1);
      return ['16:00', '17:00', '18:00'].map((startTime, slotIndex) => {
        const startHour = Number(startTime.slice(0, 2));
        const endTime = `${String(startHour + 1).padStart(2, '0')}:00`;
        const unavailableDemoSlot = groundIndex === 1 && dayIndex === 0 && slotIndex === 1;
        return {
          id: `${ground.id}-${date}-${startTime}`,
          groundId: ground.id,
          date,
          startTime,
          endTime,
          status: unavailableDemoSlot ? 'unavailable' : 'available',
        };
      });
    }).flat(),
  );

  const reviews = [
    ['venue-demo-gulberg', 'Amina Shah', 5, 'Easy to reach and the court was in good condition.'],
    ['venue-demo-gulberg', 'Hamza R.', 4, 'Good lights for an evening game.'],
    ['venue-demo-dha', 'Sana K.', 4, 'Plenty of room for our group.'],
    ['venue-demo-johar', 'Usman A.', 5, 'Clean courts and helpful staff.'],
    ['venue-demo-model', 'Mariam N.', 4, 'A comfortable indoor hall.'],
    ['venue-demo-bahria', 'Bilal H.', 4, 'Nice turf for a friendly match.'],
    ['venue-demo-wapda', 'Zoya M.', 5, 'Rackets were available to rent.'],
    ['venue-demo-cantt', 'Farhan Q.', 3, 'The ground was fine for a casual game.'],
    ['venue-demo-iqbal', 'Aliya S.', 4, 'Good value for an hour of badminton.'],
    ['venue-demo-iqbal', 'Daniyal P.', 5, 'We had a smooth booking demo.'],
    ['venue-demo-dha', 'Nida B.', 4, 'The sample ground has useful seating.'],
    ['venue-demo-johar', 'Saad T.', 4, 'Good court dimensions for a demo.'],
  ].map((review, index) => ({
    id: `review-demo-${String(index + 1).padStart(3, '0')}`,
    venueId: review[0],
    playerUserId: `demo-reviewer-${index + 1}`,
    playerName: review[1],
    stars: review[2],
    comment: review[3],
    createdAt: new Date(Date.now() - index * 86400000).toISOString(),
  }));

  return { version: 1, vendorProfiles, venues, grounds, equipment, slots, reviews };
}
