const MINUTES_PER_DAY = 24 * 60;

export function toLocalDateKey(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function parseLocalDateKey(dateKey) {
  const [year, month, day] = String(dateKey || '').split('-').map(Number);
  if (!year || !month || !day) return null;
  const date = new Date(year, month - 1, day, 12, 0, 0, 0);
  return Number.isNaN(date.getTime()) ? null : date;
}

export function getNextBookableDates(now = new Date(), daysAfterToday = 7) {
  return Array.from({ length: daysAfterToday + 1 }, (_, offset) => {
    const date = new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset, 12, 0, 0, 0);
    return {
      dateKey: toLocalDateKey(date),
      date,
      dayLabel: offset === 0 ? 'Today' : date.toLocaleDateString(undefined, { weekday: 'short' }),
      detailLabel: date.toLocaleDateString(undefined, { day: 'numeric', month: 'short' }),
    };
  });
}

export function timeToMinutes(time) {
  const match = /^(\d{2}):(\d{2})$/.exec(String(time || ''));
  if (!match) return null;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour > 23 || minute > 59) return null;
  return hour * 60 + minute;
}

export function intervalsOverlap(startA, endA, startB, endB) {
  const aStart = timeToMinutes(startA);
  const aEnd = timeToMinutes(endA);
  const bStart = timeToMinutes(startB);
  const bEnd = timeToMinutes(endB);
  if ([aStart, aEnd, bStart, bEnd].some(value => value === null)) return false;
  return aStart < bEnd && bStart < aEnd;
}

export function createSlotsForGround(
  ground,
  dayCount = 8,
  openingMinute = 9 * 60,
  closingMinute = 17 * 60,
  startDate = new Date(),
) {
  const duration = Number(ground?.slotDurationMinutes);
  if (!ground?.id || !Number.isInteger(duration) || duration <= 0) return [];
  const slots = [];
  const today = startDate;
  for (let dayOffset = 0; dayOffset < dayCount; dayOffset += 1) {
    const date = new Date(today.getFullYear(), today.getMonth(), today.getDate() + dayOffset, 12, 0, 0, 0);
    const dateKey = toLocalDateKey(date);
    for (let minute = openingMinute; minute + duration <= closingMinute; minute += duration) {
      const toTime = value => `${String(Math.floor(value / 60)).padStart(2, '0')}:${String(value % 60).padStart(2, '0')}`;
      const startTime = toTime(minute);
      slots.push({
        id: `${ground.id}-${dateKey}-${startTime}`,
        groundId: ground.id,
        date: dateKey,
        startTime,
        endTime: toTime(minute + duration),
        status: 'available',
      });
    }
  }
  return slots;
}

function bookingEndTimestamp(booking) {
  const date = parseLocalDateKey(booking?.date);
  const endMinutes = timeToMinutes(booking?.endTime);
  if (!date || endMinutes === null) return Number.POSITIVE_INFINITY;
  date.setHours(Math.floor(endMinutes / 60), endMinutes % 60, 0, 0);
  return date.getTime();
}

export function isBookingActive(booking, now = new Date()) {
  if (!booking || !['confirmed', 'pending'].includes(booking.status)) return false;
  return bookingEndTimestamp(booking) > now.getTime();
}

export function getSlotAvailability({ slotId, slots = [], bookings = [], now = new Date(), ignoreBookingId = null }) {
  const slot = slots.find(item => item.id === slotId);
  if (!slot) return { available: false, reason: 'missing', slot: null };
  const slotReservedByIgnoredBooking = Boolean(ignoreBookingId && slot.reservedByBookingId === ignoreBookingId);
  if (slot.status !== 'available' && !slotReservedByIgnoredBooking) return { available: false, reason: 'unavailable', slot };

  const slotBooking = bookings.find(booking =>
    booking.id !== ignoreBookingId && booking.slotId === slot.id && isBookingActive(booking, now),
  );
  if (slotBooking) return { available: false, reason: 'booked', slot, booking: slotBooking };

  const overlappingBooking = bookings.find(booking =>
    booking.id !== ignoreBookingId && booking.groundId === slot.groundId && booking.date === slot.date &&
    isBookingActive(booking, now) &&
    intervalsOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime),
  );
  if (overlappingBooking) return { available: false, reason: 'booked', slot, booking: overlappingBooking };

  const overlappingUnavailable = slots.find(item =>
    item.id !== slot.id && item.reservedByBookingId !== ignoreBookingId && item.groundId === slot.groundId && item.date === slot.date &&
    item.status !== 'available' &&
    intervalsOverlap(slot.startTime, slot.endTime, item.startTime, item.endTime),
  );
  if (overlappingUnavailable) return { available: false, reason: 'unavailable', slot };
  return { available: true, reason: null, slot };
}

export function calculateGroundFee(ground, slot) {
  const hourlyPrice = Number(ground?.hourlyPricePKR);
  const start = timeToMinutes(slot?.startTime);
  const end = timeToMinutes(slot?.endTime);
  const duration = start === null || end === null ? Number(ground?.slotDurationMinutes) : end - start;
  if (!Number.isFinite(hourlyPrice) || hourlyPrice < 0 || !Number.isFinite(duration) || duration <= 0) return 0;
  return Math.round(hourlyPrice * duration / 60);
}

export function calculateEquipmentSubtotal(equipment = [], selections = []) {
  const selectionById = new Map(selections.map(item => [item.equipmentId, Number(item.quantity)]));
  return equipment.reduce((total, item) => {
    const quantity = selectionById.get(item.id) || 0;
    if (!Number.isInteger(quantity) || quantity <= 0) return total;
    return total + Math.round(Number(item.unitPricePKR) || 0) * quantity;
  }, 0);
}

export function prepareBooking(venueState, request, now = new Date()) {
  const slot = venueState.slots.find(item => item.id === request.slotId);
  if (!slot) return { ok: false, error: 'That slot no longer exists. Choose another time.' };
  const startTimestamp = new Date(`${slot.date}T${slot.startTime}:00`);
  if (Number.isNaN(startTimestamp.getTime()) || startTimestamp.getTime() <= now.getTime()) {
    return { ok: false, error: 'That slot has already started. Choose a future time.' };
  }
  const availability = getSlotAvailability({ ...venueState, slotId: slot.id, now });
  if (!availability.available) {
    const message = availability.reason === 'booked'
      ? 'That time was just booked. Choose another available slot.'
      : 'That time is unavailable. Choose another available slot.';
    return { ok: false, error: message };
  }

  const ground = venueState.grounds.find(item => item.id === slot.groundId && item.isActive !== false);
  const venue = ground && venueState.venues.find(item => item.id === ground.venueId);
  if (!ground || !venue) return { ok: false, error: 'The selected ground is no longer active.' };
  if (!request.customerName?.trim() && request.source === 'walk-in') {
    return { ok: false, error: 'Enter the walk-in customer’s name.' };
  }
  if (!['player', 'walk-in'].includes(request.source)) {
    return { ok: false, error: 'Choose a valid booking source.' };
  }

  const selections = (request.addOns || [])
    .filter(item => Number(item.quantity) > 0)
    .map(item => ({ equipmentId: item.equipmentId, quantity: Number(item.quantity) }));
  const addOns = [];
  for (const selection of selections) {
    if (!Number.isInteger(selection.quantity) || selection.quantity < 0) {
      return { ok: false, error: 'Add-on quantities must be whole numbers.' };
    }
    const item = venueState.equipment.find(entry =>
      entry.id === selection.equipmentId && entry.venueId === venue.id && entry.active !== false,
    );
    if (!item || selection.quantity > item.quantityAvailable) {
      return { ok: false, error: 'An add-on is no longer available in that quantity. Please review your selection.' };
    }
    addOns.push({
      equipmentId: item.id,
      name: item.name,
      priceMode: item.priceMode,
      unitPricePKR: Math.round(Number(item.unitPricePKR)),
      quantity: selection.quantity,
      lineTotalPKR: Math.round(Number(item.unitPricePKR)) * selection.quantity,
    });
  }

  const groundFeePKR = calculateGroundFee(ground, slot);
  const addOnsTotalPKR = addOns.reduce((total, item) => total + item.lineTotalPKR, 0);
  const paymentMode = request.paymentMode || 'pay-at-venue';
  const paymentStatus = request.source === 'walk-in'
    ? (request.paymentStatus === 'paid' ? 'paid' : 'unpaid')
    : paymentMode === 'simulated' ? 'simulated-paid' : 'due-at-venue';
  const booking = {
    id: request.id,
    source: request.source,
    status: 'confirmed',
    paymentMode,
    paymentStatus,
    roomId: request.roomId || null,
    venueId: venue.id,
    venueName: venue.name,
    groundId: ground.id,
    groundName: ground.name,
    slotId: slot.id,
    date: slot.date,
    startTime: slot.startTime,
    endTime: slot.endTime,
    durationMinutes: timeToMinutes(slot.endTime) - timeToMinutes(slot.startTime),
    playerUserId: request.playerUserId || null,
    vendorUserId: request.vendorUserId || null,
    customerName: request.customerName?.trim() || null,
    customerContact: request.customerContact?.trim() || null,
    groundFeePKR,
    addOns,
    addOnsTotalPKR,
    totalPKR: groundFeePKR + addOnsTotalPKR,
    createdAt: request.createdAt,
  };
  return { ok: true, booking };
}

export function formatPKR(amount) {
  const value = Number.isFinite(Number(amount)) ? Math.round(Number(amount)) : 0;
  return `Rs. ${value.toLocaleString('en-PK')}`;
}

export function formatTimeRange(startTime, endTime) {
  const display = time => {
    const minutes = timeToMinutes(time);
    if (minutes === null) return time || '';
    const hour = Math.floor(minutes / 60);
    const suffix = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${String(minutes % 60).padStart(2, '0')} ${suffix}`;
  };
  return `${display(startTime)} – ${display(endTime)}`;
}

export function formatDateKey(dateKey, options = { weekday: 'short', day: 'numeric', month: 'short' }) {
  const date = parseLocalDateKey(dateKey);
  return date ? date.toLocaleDateString(undefined, options) : String(dateKey || '');
}

export function getBookingDisplayStatus(booking, now = new Date()) {
  if (booking?.status === 'cancelled') return 'Cancelled';
  if (bookingEndTimestamp(booking) <= now.getTime()) return 'Completed';
  return 'Confirmed';
}

export function getBookableDayEnd(dateKey, endTime) {
  const date = parseLocalDateKey(dateKey);
  const end = timeToMinutes(endTime);
  if (!date || end === null || end > MINUTES_PER_DAY) return null;
  date.setHours(Math.floor(end / 60), end % 60, 0, 0);
  return date;
}
