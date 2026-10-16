const SEEDED_MONTHS = [
  { bookings: 18, revenuePKR: 48600, occupancyPercent: 42 },
  { bookings: 22, revenuePKR: 59400, occupancyPercent: 47 },
  { bookings: 27, revenuePKR: 72900, occupancyPercent: 53 },
  { bookings: 24, revenuePKR: 64800, occupancyPercent: 49 },
  { bookings: 31, revenuePKR: 83700, occupancyPercent: 61 },
  { bookings: 36, revenuePKR: 97200, occupancyPercent: 66 },
];

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
}

function monthLabel(date) {
  return date.toLocaleDateString('en', { month: 'short' });
}

function isActiveBooking(booking) {
  return booking.status === 'confirmed' || booking.status === 'completed';
}

export function calculateVendorMonth({ bookings = [], grounds = [], slots = [], now = new Date() }) {
  const currentKey = monthKey(now);
  const monthlyBookings = bookings.filter(booking =>
    booking.date?.startsWith(currentKey) && isActiveBooking(booking));
  const occupiedHours = monthlyBookings.reduce((total, booking) => {
    const [startHour, startMinute] = booking.startTime.split(':').map(Number);
    const [endHour, endMinute] = booking.endTime.split(':').map(Number);
    return total + Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
  }, 0);
  const activeGroundIds = new Set(grounds.filter(ground => ground.isActive !== false).map(ground => ground.id));
  const bookableHours = slots.filter(slot => activeGroundIds.has(slot.groundId) && slot.date?.startsWith(currentKey) &&
    (slot.status === 'available' || Boolean(slot.reservedByBookingId)))
    .reduce((total, slot) => {
      const [startHour, startMinute] = slot.startTime.split(':').map(Number);
      const [endHour, endMinute] = slot.endTime.split(':').map(Number);
      return total + Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
    }, 0);
  return {
    bookings: monthlyBookings.length,
    revenuePKR: monthlyBookings.reduce((total, booking) => total + (Number(booking.totalPKR) || 0), 0),
    occupancyPercent: bookableHours > 0 ? Math.min(100, Math.round((occupiedHours / bookableHours) * 100)) : 0,
    occupiedHours,
    bookableHours,
  };
}

export function buildVendorAnalytics({ bookings = [], grounds = [], slots = [], now = new Date() }) {
  return Array.from({ length: 7 }, (_, index) => {
    const month = new Date(now.getFullYear(), now.getMonth() - 6 + index, 1);
    const key = monthKey(month);
    const seeded = SEEDED_MONTHS[index];
    const current = index === 6;
    const metrics = current ? calculateVendorMonth({ bookings, grounds, slots, now }) : seeded;
    const prior = index === 0 ? null : (current
      ? calculateVendorMonthForMonth(bookings, grounds, slots, monthKey(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
      : SEEDED_MONTHS[index - 1]);
    const growthPercent = prior && prior.bookings > 0
      ? Math.round(((metrics.bookings - prior.bookings) / prior.bookings) * 100)
      : null;
    return { key, label: monthLabel(month), ...metrics, growthPercent, isDemoSeed: !current };
  });
}

function calculateVendorMonthForMonth(bookings, grounds, slots, targetKey) {
  const rows = bookings.filter(booking => booking.date?.startsWith(targetKey) && isActiveBooking(booking));
  const activeGroundIds = new Set(grounds.filter(ground => ground.isActive !== false).map(ground => ground.id));
  const bookableSlots = slots.filter(slot => activeGroundIds.has(slot.groundId) && slot.date?.startsWith(targetKey) &&
    (slot.status === 'available' || Boolean(slot.reservedByBookingId)));
  const hours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  };
  const occupied = rows.reduce((sum, row) => sum + hours(row.startTime, row.endTime), 0);
  const bookable = bookableSlots.reduce((sum, slot) => sum + hours(slot.startTime, slot.endTime), 0);
  return {
    bookings: rows.length,
    revenuePKR: rows.reduce((sum, row) => sum + (Number(row.totalPKR) || 0), 0),
    occupancyPercent: bookable > 0 ? Math.min(100, Math.round((occupied / bookable) * 100)) : 0,
  };
}

export function calculateTodayAndUpcomingBookings(bookings = [], venueIds = [], now = new Date()) {
  const ids = new Set(venueIds);
  const day = monthKey(now) + `-${String(now.getDate()).padStart(2, '0')}`;
  const scoped = bookings.filter(booking => ids.has(booking.venueId) && booking.status === 'confirmed');
  return {
    today: scoped.filter(booking => booking.date === day).length,
    upcoming: scoped.filter(booking => booking.date > day).length,
  };
}
