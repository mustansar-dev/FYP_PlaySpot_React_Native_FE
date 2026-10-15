import { parseLocalDateKey, timeToMinutes, toLocalDateKey } from './booking';

export function getRoomOpenSpots(room) {
  const capacity = Number(room?.capacity) || 0;
  return Math.max(0, capacity - (room?.members?.length || 0));
}

export function canJoinGameRoom(room, userId, joinCode = '') {
  if (!room) return { ok: false, error: 'This game room could not be found.' };
  if (room.status !== 'open') return { ok: false, error: 'This game room is no longer open.' };
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
  if (tournament.status !== 'upcoming') {
    return { ok: false, error: 'Registration for this tournament is closed.' };
  }
  if ((tournament.participants || []).some(participant => participant.userId === userId)) {
    return { ok: false, error: 'You have already joined this tournament.' };
  }
  const remaining = Number(tournament.capacity) - (tournament.participants || []).length;
  if (remaining < 1) return { ok: false, error: 'This tournament has reached capacity.' };
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
  if (!String(values.location || '').trim()) errors.location = 'Enter a meeting location.';
  if (!isValidFutureDate(values.date, values.startTime)) errors.date = 'Choose a future date and a time in HH:MM format.';
  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 30) errors.capacity = 'Capacity must be from 2 to 30 players.';
  const cost = Number(values.costPerParticipantPKR);
  if (!Number.isInteger(cost) || cost < 0) errors.costPerParticipantPKR = 'Enter a whole-number cost of zero or more.';
  if (values.visibility === 'private' && String(values.joinCode || '').trim().length < 4) {
    errors.joinCode = 'Use a private code with at least 4 characters.';
  }
  return errors;
}

export function validateTournamentDraft(values) {
  const errors = {};
  if (!String(values.title || '').trim()) errors.title = 'Enter a tournament name.';
  if (!String(values.sport || '').trim()) errors.sport = 'Choose a sport.';
  if (!String(values.location || '').trim()) errors.location = 'Enter the venue or area.';
  if (!isValidFutureDate(values.date, values.startTime)) errors.date = 'Choose a future date and a time in HH:MM format.';
  const capacity = Number(values.capacity);
  if (!Number.isInteger(capacity) || capacity < 2 || capacity > 128) errors.capacity = 'Capacity must be from 2 to 128 players.';
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
  return visibilityMatches && sportMatches && queryMatches && timeMatches && room.status !== 'cancelled';
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
