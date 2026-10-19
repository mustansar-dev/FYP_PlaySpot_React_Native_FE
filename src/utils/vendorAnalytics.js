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
  let occupiedHours = 0;
  monthlyBookings.forEach(booking => {
    const [startHour, startMinute] = booking.startTime.split(':').map(Number);
    const [endHour, endMinute] = booking.endTime.split(':').map(Number);
    occupiedHours += Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
  });
  const activeGroundIds = grounds.filter(ground => ground.isActive !== false).map(ground => ground.id);
  const bookableSlots = slots.filter(slot => activeGroundIds.includes(slot.groundId) && slot.date?.startsWith(currentKey) &&
    (slot.status === 'available' || Boolean(slot.reservedByBookingId)));
  let bookableHours = 0;
  bookableSlots.forEach(slot => {
    const [startHour, startMinute] = slot.startTime.split(':').map(Number);
    const [endHour, endMinute] = slot.endTime.split(':').map(Number);
    bookableHours += Math.max(0, (endHour * 60 + endMinute - startHour * 60 - startMinute) / 60);
  });
  let revenuePKR = 0;
  monthlyBookings.forEach(booking => { revenuePKR += Number(booking.totalPKR) || 0; });
  return {
    bookings: monthlyBookings.length,
    revenuePKR,
    occupancyPercent: bookableHours > 0 ? Math.min(100, Math.round((occupiedHours / bookableHours) * 100)) : 0,
    occupiedHours,
    bookableHours,
  };
}

export function buildVendorAnalytics({ bookings = [], grounds = [], slots = [], now = new Date() }) {
  const months = [];
  for (let index = 0; index < 7; index += 1) {
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
    months.push({ key, label: monthLabel(month), ...metrics, growthPercent, isDemoSeed: !current });
  }
  return months;
}

function calculateVendorMonthForMonth(bookings, grounds, slots, targetKey) {
  const rows = bookings.filter(booking => booking.date?.startsWith(targetKey) && isActiveBooking(booking));
  const activeGroundIds = grounds.filter(ground => ground.isActive !== false).map(ground => ground.id);
  const bookableSlots = slots.filter(slot => activeGroundIds.includes(slot.groundId) && slot.date?.startsWith(targetKey) &&
    (slot.status === 'available' || Boolean(slot.reservedByBookingId)));
  const hours = (start, end) => {
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return Math.max(0, (eh * 60 + em - sh * 60 - sm) / 60);
  };
  let occupied = 0;
  rows.forEach(row => { occupied += hours(row.startTime, row.endTime); });
  let bookable = 0;
  bookableSlots.forEach(slot => { bookable += hours(slot.startTime, slot.endTime); });
  let revenuePKR = 0;
  rows.forEach(row => { revenuePKR += Number(row.totalPKR) || 0; });
  return {
    bookings: rows.length,
    revenuePKR,
    occupancyPercent: bookable > 0 ? Math.min(100, Math.round((occupied / bookable) * 100)) : 0,
  };
}

export function calculateTodayAndUpcomingBookings(bookings = [], venueIds = [], now = new Date()) {
  const day = monthKey(now) + `-${String(now.getDate()).padStart(2, '0')}`;
  const scoped = bookings.filter(booking => venueIds.includes(booking.venueId) && booking.status === 'confirmed');
  return {
    today: scoped.filter(booking => booking.date === day).length,
    upcoming: scoped.filter(booking => booking.date > day).length,
  };
}
