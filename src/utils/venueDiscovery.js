const EARTH_RADIUS_KM = 6371;

export function haversineDistanceKm(from, to) {
  if (!from || !to || ![from.latitude, from.longitude, to.latitude, to.longitude].every(Number.isFinite)) {
    return null;
  }
  const radians = degrees => (degrees * Math.PI) / 180;
  const latitudeDelta = radians(to.latitude - from.latitude);
  const longitudeDelta = radians(to.longitude - from.longitude);
  const a = Math.sin(latitudeDelta / 2) ** 2 +
    Math.cos(radians(from.latitude)) * Math.cos(radians(to.latitude)) *
    Math.sin(longitudeDelta / 2) ** 2;
  return EARTH_RADIUS_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function getVenueRating(reviews = []) {
  if (!reviews.length) return { average: 0, count: 0, distribution: [0, 0, 0, 0, 0] };
  const distribution = [0, 0, 0, 0, 0];
  let total = 0;
  reviews.forEach(review => {
    total += review.stars;
    distribution[review.stars - 1] += 1;
  });
  return { average: total / reviews.length, count: reviews.length, distribution };
}

export function getLowestVenuePrice(venue, grounds = []) {
  const prices = grounds.filter(ground => ground.venueId === venue.id && ground.isActive)
    .map(ground => ground.hourlyPricePKR);
  return prices.length ? Math.min(...prices) : null;
}

export function filterAndSortVenues({
  venues = [], grounds = [], reviews = [], query = '', sport = 'All',
  maximumPrice = '', minimumRating = 0, maximumDistance = '', indoorOutdoor = 'Any',
  sort = 'nearest', origin = null,
}) {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = venues.map(venue => {
    const venueReviews = reviews.filter(review => review.venueId === venue.id);
    const rating = getVenueRating(venueReviews);
    const price = getLowestVenuePrice(venue, grounds);
    const distance = haversineDistanceKm(origin, venue);
    const venueGrounds = grounds.filter(ground => ground.venueId === venue.id && ground.isActive);
    return { ...venue, rating, price, distance, grounds: venueGrounds };
  }).filter(venue => {
    const searchable = `${venue.name} ${venue.city} ${venue.locationNote || ''} ${venue.address}`.toLowerCase();
    return (!normalizedQuery || searchable.includes(normalizedQuery) || venue.sports.some(item => item.toLowerCase().includes(normalizedQuery))) &&
      (sport === 'All' || venue.sports.includes(sport)) &&
      (!maximumPrice || (venue.price !== null && venue.price <= Number(maximumPrice))) &&
      (venue.rating.average >= Number(minimumRating || 0)) &&
      (!maximumDistance || (venue.distance !== null && venue.distance <= Number(maximumDistance))) &&
      (indoorOutdoor === 'Any' || venue.grounds.some(ground => ground.indoorOutdoor === indoorOutdoor));
  });

  return filtered.sort((a, b) => {
    if (sort === 'price') return (a.price ?? Infinity) - (b.price ?? Infinity);
    if (sort === 'rating') return b.rating.average - a.rating.average || b.rating.count - a.rating.count;
    return (a.distance ?? Infinity) - (b.distance ?? Infinity);
  });
}

export function validateReview(stars, comment) {
  const errors = {};
  if (!Number.isInteger(stars) || stars < 1 || stars > 5) errors.stars = 'Choose a rating from 1 to 5 stars.';
  if (typeof comment !== 'string' || comment.trim().length < 8) errors.comment = 'Write at least 8 characters about your visit.';
  return errors;
}
