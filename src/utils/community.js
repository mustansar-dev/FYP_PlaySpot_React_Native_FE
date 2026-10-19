import { parseLocalDateKey, timeToMinutes, toLocalDateKey } from './booking';

export function getRoomOpenSpots(room) {
  const capacity = Number(room?.capacity) || 0;
  return Math.max(0, capacity - (room?.members?.length || 0));
}

const SPORT_CAPACITY_LIMITS = {
  Badminton: 4,
  Padel: 4,
  Futsal: 10,
  Football: 22,
  Cricket: 22,
};

const TOURNAMENT_TEAM_SIZE_LIMITS = {
  Badminton: { min: 2, max: 2 },
  Padel: { min: 2, max: 2 },
  Futsal: { min: 2, max: 5 },
  Football: { min: 2, max: 11 },
  Cricket: { min: 2, max: 11 },
};

export function getTournamentTeamSizeLimits(sport) {
  return TOURNAMENT_TEAM_SIZE_LIMITS[sport] || { min: 2, max: 11 };
}

export function isTournamentRegistrationOpen(tournament) {
  return tournament?.status === 'upcoming' && tournament.registrationOpen !== false;
}

export function getGameRoomCapacityLimit(sport) {
  return SPORT_CAPACITY_LIMITS[sport] || 30;
}

export function createRoomPaymentShares(totalPKR, capacity, members = [], paymentMode = 'simulated', previousShares = []) {
  const seatCount = Number(capacity);
  if (!Number.isInteger(seatCount) || seatCount < 1) return [];
  const seats = Array.from({ length: seatCount }, (_, seatIndex) => ({
    userId: `room-seat-${seatIndex}`,
    name: `Open player ${seatIndex + 1}`,
  }));
  const equalShares = calculateEqualShares(Number(totalPKR), seats);
  if (equalShares.length !== seatCount) return [];

  return equalShares.map((share, seatIndex) => {
    const member = members.find(item => item.seatIndex === seatIndex);
    const previous = previousShares.find(item => item.seatIndex === seatIndex);
    const amountChanged = previous && Number(previous.amountPKR) !== share.amountPKR;
    let status = 'open';
    if (member) {
      status = amountChanged ? 'unpaid' : (member.paymentStatus || previous?.status || 'unpaid');
      if (!previous && paymentMode === 'simulated') status = 'simulated-paid';
    }
    return {
      seatIndex,
      userId: member?.userId || null,
      name: member?.name || `Open player ${seatIndex + 1}`,
      amountPKR: share.amountPKR,
      status,
    };
  });
}

export function validateRoomPaymentShares(totalPKR, capacity, shares = []) {
  const total = Number(totalPKR);
  const count = Number(capacity);
  if (!Number.isInteger(total) || total < 0) return { valid: false, message: 'Enter a valid whole-PKR venue total.' };
  if (!Number.isInteger(count) || count < 1 || shares.length !== count) return { valid: false, message: 'Payment shares must match the room capacity.' };
  const amounts = shares.map(share => Number(share.amountPKR));
  if (amounts.some(amount => !Number.isInteger(amount) || amount < 0)) return { valid: false, message: 'Each share must be a whole number of zero or more.' };
  if (amounts.reduce((sum, amount) => sum + amount, 0) !== total) return { valid: false, message: 'Room shares must add up to the venue total.' };
  return { valid: true, message: '' };
}

export function canJoinGameRoom(room, userId, joinCode = '') {
  if (!room) return { ok: false, error: 'This game room could not be found.' };
  if (room.status !== 'open') return { ok: false, error: 'This game room is no longer open.' };
  const startsAt = new Date(`${room.date}T${room.startTime}:00`).getTime();
  if (Number.isFinite(startsAt) && startsAt <= Date.now()) return { ok: false, error: 'This room has started and no longer accepts payments or players.' };
  if ((room.members || []).some(member => member.userId === userId)) {
    return { ok: false, error: 'You have already joined this game room.' };
  }
  if (room.visibility === 'private' && String(joinCode).trim() !== room.joinCode) {
    return { ok: false, error: 'That private room code does not match.' };
  }
  if (getRoomOpenSpots(room) < 1) return { ok: false, error: 'This game room is full.' };
  return { ok: true };
}

export function canJoinTournament(tournament, userId) {
  if (!tournament) return { ok: false, error: 'This tournament could not be found.' };
  if (!isTournamentRegistrationOpen(tournament)) {
    return { ok: false, error: 'Registration for this tournament is closed.' };
  }
  if ((tournament.participants || []).some(participant => participant.userId === userId)) {
    return { ok: false, error: 'You have already joined this tournament.' };
  }
  const remaining = Number(tournament.capacity) - (tournament.participants || []).length;
  if (remaining < 1) return { ok: false, error: Number(tournament.teamSize) > 1 ? 'This tournament has reached its team capacity.' : 'This tournament has reached capacity.' };
  return { ok: true };
}

function isValidFutureDate(dateValue, timeValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ''))) return false;
  if (timeToMinutes(timeValue) === null) return false;
  const date = new Date(`${dateValue}T${timeValue}:00`);
  return !Number.isNaN(date.getTime()) && date.getTime() > Date.now();
}

export function validateGameRoomDraft(values) {
  const errors = {};
  if (!String(values.title || '').trim()) errors.title = 'Enter a name for the game.';
  if (!String(values.sport || '').trim()) errors.sport = 'Choose a sport.';
  if (!String(values.location || '').trim()) errors.location = 'Choose a venue and available time.';
  const date = values.selectedSlot?.date || values.date;
  const startTime = values.selectedSlot?.startTime || values.startTime;
  if (!isValidFutureDate(date, startTime)) errors.slot = 'Choose a future available venue time.';
  if (values.selectedSlot?.sport && values.selectedSlot.sport !== values.sport) {
    errors.slot = `Choose a venue offering ${values.sport}.`;
  }
  const capacity = Number(values.capacity);
  const capacityLimit = getGameRoomCapacityLimit(values.sport);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > capacityLimit) {
    errors.capacity = `${values.sport} room capacity must be from 2 to ${capacityLimit} players.`;
  } else if (Number(values.memberCount || 0) > capacity) {
    errors.capacity = `Capacity cannot be lower than the ${Number(values.memberCount)} players already in this room.`;
  }
  const totalCost = Number(values.totalCostPKR);
  if (!Number.isInteger(totalCost) || totalCost < 0) errors.totalCostPKR = 'Choose a venue with a valid PKR price.';
  if ((values.paymentMode || 'simulated') !== 'simulated') {
    errors.paymentMode = 'Game room shares must be paid before joining.';
  }
  if (values.visibility === 'private' && String(values.joinCode || '').trim().length < 4) {
    errors.joinCode = 'Use a private code with at least 4 characters.';
  }
  return errors;
}

export function validateTournamentDraft(values) {
  const errors = {};
  if (!String(values.title || '').trim()) errors.title = 'Enter a tournament name.';
  if (!String(values.sport || '').trim()) errors.sport = 'Choose a sport.';
  if (!isValidFutureDate(values.date, values.startTime)) errors.date = 'Choose a future date and a time in HH:MM format.';
  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 128) errors.capacity = Number(values.teamSize || 1) > 1 ? 'Capacity must be from 2 to 128 teams.' : 'Capacity must be from 2 to 128 players.';
  if (values.teamSize !== undefined) {
    const teamSize = Number(values.teamSize);
    const { min, max } = getTournamentTeamSizeLimits(values.sport);
    if (!Number.isInteger(teamSize) || teamSize < min || teamSize > max) {
      errors.teamSize = values.sport === 'Badminton' || values.sport === 'Padel'
        ? `${values.sport} teams must have exactly 2 players.`
        : `${values.sport} teams must have ${min} to ${max} players.`;
    }
  }
  if (values.entryFeePKR !== undefined && (!Number.isInteger(Number(values.entryFeePKR)) || Number(values.entryFeePKR) < 0)) {
    errors.entryFeePKR = 'Entry fee must be a whole PKR amount of zero or more.';
  }
  if (values.prizePKR !== undefined && (!Number.isInteger(Number(values.prizePKR)) || Number(values.prizePKR) < 0)) {
    errors.prizePKR = 'Winning prize must be a whole PKR amount of zero or more.';
  }
  return errors;
}

export function calculateEqualShares(totalPKR, participants = []) {
  const total = Number(totalPKR);
  if (!Number.isInteger(total) || total < 0 || participants.length === 0) return [];
  const base = Math.floor(total / participants.length);
  const remainder = total % participants.length;
  return participants.map((participant, index) => ({
    userId: participant.userId,
    name: participant.name,
    amountPKR: base + (index < remainder ? 1 : 0),
    status: participant.status === 'paid' ? 'paid' : 'unpaid',
  }));
}

export function validateSplitShares(totalPKR, shares = []) {
  const total = Number(totalPKR);
  if (!Number.isInteger(total) || total < 0) return { valid: false, sum: 0, message: 'Enter a whole-number total of zero or more.' };
  if (!shares.length) return { valid: false, sum: 0, message: 'Add at least one participant.' };
  const amounts = shares.map(share => Number(share.amountPKR));
  if (amounts.some(amount => !Number.isInteger(amount) || amount < 0)) {
    return { valid: false, sum: amounts.reduce((sum, amount) => sum + (Number.isFinite(amount) ? amount : 0), 0), message: 'Each share must be a whole number of zero or more.' };
  }
  const sum = amounts.reduce((value, amount) => value + amount, 0);
  if (sum !== total) return { valid: false, sum, message: `Shares must add up to Rs. ${total.toLocaleString('en-PK')}.` };
  return { valid: true, sum, message: '' };
}

export function matchesRoomFilters(room, filters = {}) {
  const visibilityMatches = filters.visibility === 'all' || room.visibility === filters.visibility;
  const sportMatches = !filters.sport || filters.sport === 'All' || room.sport === filters.sport;
  const query = String(filters.query || '').trim().toLowerCase();
  const queryMatches = !query || `${room.title} ${room.location}`.toLowerCase().includes(query);
  const roomDate = parseLocalDateKey(room.date);
  const today = parseLocalDateKey(toLocalDateKey());
  const daysAway = roomDate && today
    ? Math.round((roomDate.getTime() - today.getTime()) / 86400000)
    : Number.POSITIVE_INFINITY;
  const timeMatches = filters.time === 'all' ||
    (filters.time === 'today' && daysAway === 0) ||
    (filters.time === 'this-week' && daysAway >= 0 && daysAway <= 7);
  return visibilityMatches && sportMatches && queryMatches && timeMatches && !['cancelled', 'expired', 'completed'].includes(room.status);
}

export function formatCommunityDate(dateKey) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateKey || ''))) return String(dateKey || '');
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(year, month - 1, day, 12).toLocaleDateString(undefined, {
    weekday: 'short', day: 'numeric', month: 'short',
  });
}

export function formatCommunityTime(time) {
  const minutes = timeToMinutes(time);
  if (minutes === null) return String(time || '');
  const hour = Math.floor(minutes / 60);
  return `${hour % 12 || 12}:${String(minutes % 60).padStart(2, '0')} ${hour >= 12 ? 'PM' : 'AM'}`;
}
