import { backendApi } from './backendApi';

function localDateTime(value, timeZone = 'Asia/Karachi') {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return { date: '', time: '' };
  const offset = timeZone === 'Asia/Karachi' ? 5 * 60 : 0;
  const local = new Date(date.getTime() + offset * 60000);
  return {
    date: `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`,
    time: `${String(local.getUTCHours()).padStart(2, '0')}:${String(local.getUTCMinutes()).padStart(2, '0')}`,
  };
}

const lower = value => String(value || '').toLowerCase();
const bookingStatus = value => ({ PENDING_PAYMENT: 'pending-payment', CONFIRMED: 'confirmed', CANCELLED: 'cancelled', COMPLETED: 'completed', EXPIRED: 'expired' }[value] || lower(value));
const paymentStatus = value => ({ DUE_AT_VENUE: 'due-at-venue', AWAITING_TRANSFER: 'awaiting-transfer', PROOF_SUBMITTED: 'proof-submitted', PARTIALLY_PAID: 'partially-paid' }[value] || lower(value));

function normalizeBooking(row) {
  return {
    ...row, status: bookingStatus(row.status), paymentStatus: paymentStatus(row.paymentStatus),
    paymentMode: lower(row.paymentMode).replaceAll('_', '-'),
    playerUserId: row.customerUserId || row.createdByUserId,
    addOns: (row.addOns || []).map(item => ({ ...item, priceMode: lower(item.priceMode) })),
  };
}

export function normalizeRoom(row) {
  const { date, time: startTime } = localDateTime(row.startsAt, row.timeZone);
  const { time: endTime } = localDateTime(row.endsAt, row.timeZone);
  const status = row.status === 'FULL' ? 'full' : lower(row.status);
  return {
    ...row, sport: row.sport?.name || '', location: row.locationLabel,
    date, startTime, endTime, visibility: lower(row.visibility), status,
    createdBy: row.organizerUserId, createdByName: row.members?.find(item => item.role === 'ORGANIZER')?.name || 'Room organizer',
    costPerParticipantPKR: (row.perPlayerSharePaisa || 0) / 100,
    totalCostPKR: (row.totalCostPaisa || 0) / 100,
    members: (row.members || []).map(member => ({ ...member, joinedAt: row.createdAt, paymentStatus: 'unpaid', sharePKR: (row.perPlayerSharePaisa || 0) / 100 })),
    joinCode: '',
  };
}

export function normalizeTournament(row) {
  const { date, time: startTime } = localDateTime(row.startsAt, row.timeZone);
  const participants = (row.participants || []).map(item => ({
    ...item, userId: item.userId || item.user?.id, name: item.user?.name || item.name,
    teamMembers: item.teamMemberNames || item.teamMembers || [], joinedAt: item.joinedAt || row.createdAt,
    paymentStatus: lower(item.paymentStatus), totalEntryFeePKR: (item.totalEntryFeePaisa || 0) / 100,
  }));
  return {
    ...row, date, startTime, status: lower(row.status), capacity: row.maxTeams,
    venueName: row.venue?.name || row.venueName, sport: row.sport?.name || row.sport,
    entryFeePKR: (row.entryFeePerPlayerPaisa || 0) / 100, prizePKR: (row.prizePaisa || 0) / 100,
    createdBy: row.organizerUserId, participants, standings: participants,
    registeredTeams: row.registeredTeams || 0,
  };
}

function normalizeVenue(row, vendorId) {
  return {
    ...row, vendorId: vendorId || null,
    photoUris: (row.media || []).filter(item => item.kind === 'PHOTO' && item.url).map(item => item.url),
    videoUri: row.media?.find(item => item.kind === 'VIDEO' && item.url)?.url || null,
    grounds: (row.grounds || []).map(ground => ({ ...ground, venueId: row.id })),
    equipment: (row.equipment || []).map(item => ({ ...item, venueId: row.id })),
  };
}

async function settled(load, fallback, errors, label) {
  try { return await load(); }
  catch (error) { errors.push(`${label}: ${error.message}`); return fallback; }
}

export async function loadBackendState(user) {
  const errors = [];
  const [venueRows, roomRows, tournamentRows, leaderboard, bookings, vendorVenues, vendorBookings, conversations] = await Promise.all([
    settled(() => backendApi.venues({ page: 1, limit: 50 }), [], errors, 'Venues'),
    settled(() => backendApi.rooms({ page: 1, limit: 50 }), [], errors, 'Game rooms'),
    settled(() => backendApi.tournaments({ page: 1, limit: 50 }), [], errors, 'Tournaments'),
    settled(() => backendApi.leaderboard({ limit: 50 }), [], errors, 'Leaderboard'),
    user?.role === 'player' ? settled(() => backendApi.myBookings({ page: 1, limit: 50 }), [], errors, 'Bookings') : Promise.resolve([]),
    user?.role === 'vendor' ? settled(() => backendApi.myVenues(), [], errors, 'Your venues') : Promise.resolve([]),
    user?.role === 'vendor' ? settled(() => backendApi.vendorBookings({ page: 1, limit: 50 }), [], errors, 'Your bookings') : Promise.resolve([]),
    user ? settled(() => backendApi.conversations(), [], errors, 'Conversations') : Promise.resolve([]),
  ]);
  const ownRows = Array.isArray(vendorVenues) ? vendorVenues : [];
  const publicRows = Array.isArray(venueRows) ? venueRows : [];
  const allRows = [...ownRows, ...publicRows.filter(row => !ownRows.some(own => own.id === row.id))];
  const vendorId = user?.vendorProfile?.id || null;
  const ownedIds = new Set(ownRows.map(row => row.id));
  const venues = allRows.map(row => normalizeVenue(row, ownedIds.has(row.id) ? vendorId : null));
  const bookingsList = [...(Array.isArray(bookings) ? bookings : []), ...(Array.isArray(vendorBookings) ? vendorBookings : [])];
  const uniqueBookings = [...new Map(bookingsList.map(item => [item.id, normalizeBooking(item)])).values()];
  return {
    venueData: {
      version: 1, vendorProfiles: user?.vendorProfile ? [{ ...user.vendorProfile, ownerUserId: user.id }] : [],
      venues, grounds: venues.flatMap(item => item.grounds), equipment: venues.flatMap(item => item.equipment),
      slots: [], bookings: uniqueBookings, reviews: [], hydrated: true,
    },
    community: {
      hydrated: true, rooms: (Array.isArray(roomRows) ? roomRows : []).map(normalizeRoom),
      conversations: (Array.isArray(conversations) ? conversations : []).map(row => ({
        ...row, kind: lower(row.kind).replaceAll('_', '-'), roomId: row.gameRoom?.id || null,
        tournamentId: row.tournament?.id || null, participantIds: (row.members || []).map(member => member.id),
        lastMessage: row.lastMessage?.body || '', lastAt: row.lastMessage?.createdAt || row.updatedAt,
      })),
      messages: [], tournaments: (Array.isArray(tournamentRows) ? tournamentRows : []).map(normalizeTournament),
      leaderboard: Array.isArray(leaderboard) ? leaderboard : [], splits: [], notifications: [],
    },
    notice: errors.length ? `Some live data could not be loaded. ${errors.join(' Â· ')}` : null,
  };
}
