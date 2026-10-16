import { buildVendorAnalytics, calculateTodayAndUpcomingBookings, calculateVendorMonth } from './vendorAnalytics';

describe('vendor analytics', () => {
  const now = new Date(2026, 9, 16, 12);
  test('shows six seeded historical months and uses local current month records', () => {
    const month = '2026-10';
    const result = buildVendorAnalytics({
      now,
      bookings: [
        { id: 'a', date: `${month}-16`, startTime: '16:00', endTime: '17:00', status: 'confirmed', totalPKR: 5000 },
        { id: 'b', date: `${month}-16`, startTime: '17:00', endTime: '18:30', status: 'completed', totalPKR: 2500 },
        { id: 'c', date: `${month}-16`, startTime: '18:00', endTime: '19:00', status: 'cancelled', totalPKR: 9000 },
      ],
      grounds: [{ id: 'g1', isActive: true }],
      slots: [
        { groundId: 'g1', date: `${month}-16`, startTime: '16:00', endTime: '17:00', status: 'available' },
        { groundId: 'g1', date: `${month}-16`, startTime: '17:00', endTime: '18:00', status: 'available' },
        { groundId: 'g1', date: `${month}-16`, startTime: '18:00', endTime: '19:00', status: 'available' },
        { groundId: 'g1', date: `${month}-16`, startTime: '19:00', endTime: '20:00', status: 'unavailable' },
      ],
    });
    expect(result).toHaveLength(7);
    expect(result.slice(0, 6).every(item => item.isDemoSeed)).toBe(true);
    expect(result[6]).toMatchObject({ bookings: 2, revenuePKR: 7500, occupancyPercent: 83, isDemoSeed: false });
  });

  test('returns zero occupancy with no bookable slots and scopes dashboard counts by date', () => {
    expect(calculateVendorMonth({ now, bookings: [], grounds: [{ id: 'g1' }], slots: [] }).occupancyPercent).toBe(0);
    expect(calculateTodayAndUpcomingBookings([
      { venueId: 'owned', date: '2026-10-16', status: 'confirmed' },
      { venueId: 'owned', date: '2026-10-17', status: 'confirmed' },
      { venueId: 'other', date: '2026-10-16', status: 'confirmed' },
      { venueId: 'owned', date: '2026-10-17', status: 'cancelled' },
    ], ['owned'], now)).toEqual({ today: 1, upcoming: 1 });
  });
});
