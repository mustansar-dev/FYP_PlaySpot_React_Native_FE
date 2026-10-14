import { createDemoVenueState } from '../data/demoVenueData';
import { filterAndSortVenues, getVenueRating, haversineDistanceKm, validateReview } from './venueDiscovery';

describe('venue discovery calculations', () => {
  const data = createDemoVenueState();
  const origin = { latitude: 31.5204, longitude: 74.3587 };

  test('haversine distance is zero at the same point and close to the known Lahore fixture distance', () => {
    expect(haversineDistanceKm(origin, origin)).toBe(0);
    expect(haversineDistanceKm(origin, { latitude: 31.5112, longitude: 74.3431 })).toBeCloseTo(1.9, 0);
  });

  test('nearest ordering and filters return visibly different venue sets', () => {
    const nearest = filterAndSortVenues({ ...data, origin });
    expect(nearest[0].id).toBe('venue-demo-gulberg');
    expect(filterAndSortVenues({ ...data, origin, sport: 'Cricket' }).every(item => item.sports.includes('Cricket'))).toBe(true);
    expect(filterAndSortVenues({ ...data, origin, maximumPrice: 2500, sort: 'price' }).map(item => item.id)).toEqual(['venue-demo-iqbal', 'venue-demo-model']);
  });

  test('rating aggregates and review validation use persisted review records', () => {
    const venueReviews = data.reviews.filter(review => review.venueId === 'venue-demo-gulberg');
    expect(getVenueRating(venueReviews)).toMatchObject({ average: 4.5, count: 2, distribution: [0, 0, 0, 1, 1] });
    expect(validateReview(0, 'short')).toMatchObject({ stars: expect.any(String), comment: expect.any(String) });
    expect(validateReview(5, 'A useful venue review')).toEqual({});
  });
});
