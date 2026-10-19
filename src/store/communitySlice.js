import { createSlice } from '@reduxjs/toolkit';
import { createDemoCommunityState } from '../data/demoCommunityData';
import { canJoinGameRoom, canJoinTournament, getTournamentTeamSizeLimits, validateRoomPaymentShares } from '../utils/community';
import { isBookingActive } from '../utils/booking';
import { createLookup, uniqueValues } from '../utils/collections';
import { bookingCancelled, bookingPaymentStatusUpdated } from './venueSlice';

const initialState = { ...createDemoCommunityState(), hydrated: false };

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function getRoomCollectedAmount(room) {
  let total = 0;
  (room?.members || []).forEach(member => {
    if (member.paymentStatus === 'simulated-paid') total += Number(member.sharePKR || 0);
  });
  return total;
}

function refundRoomShares(room, refundedAt, reason) {
  room.refundRecords = room.refundRecords || [];
  room.paymentShares = room.paymentShares || [];
  room.members = (room.members || []).map(member => {
    if (member.paymentStatus !== 'simulated-paid') return member;
    room.refundRecords.push({
      id: `room-refund-${room.id}-${member.userId}`,
      userId: member.userId,
      name: member.name,
      amountPKR: Number(member.sharePKR || room.paymentShares.find(share => share.userId === member.userId)?.amountPKR || 0),
      status: 'simulated-refunded',
      reason,
      refundedAt,
    });
    return { ...member, paymentStatus: 'simulated-refunded', refundedAt };
  });
  room.paymentShares = room.paymentShares.map(share =>
    share.status === 'simulated-paid' ? { ...share, status: 'simulated-refunded', refundedAt } : share,
  );
  room.payoutStatus = 'simulated-refunded';
}

export const reconcileGameRoomLifecycle = ({ now = new Date() } = {}) => (dispatch, getState) => {
  const nowMs = new Date(now).getTime();
  getState().community.rooms.forEach(room => {
    if (room.status !== 'open') return;
    const startsAt = new Date(`${room.date}T${room.startTime}:00`).getTime();
    const endsAt = new Date(`${room.date}T${room.endTime || room.startTime}:00`).getTime();
    if (!Number.isFinite(startsAt) || startsAt > nowMs) return;
    const paidPlayerCount = (room.members || []).filter(member => member.paymentStatus === 'simulated-paid').length;
    if (paidPlayerCount < Number(room.minimumPlayers || 2)) {
      dispatch(gameRoomExpired({ roomId: room.id, expiredAt: new Date(nowMs).toISOString() }));
      if (room.bookingId) dispatch(bookingCancelled({ bookingId: room.bookingId, cancelledAt: new Date(nowMs).toISOString(), refundAmountPKR: getRoomCollectedAmount(room) }));
    } else if (Number.isFinite(endsAt) && endsAt <= nowMs) {
      dispatch(gameRoomSettled({ roomId: room.id, settledAt: new Date(nowMs).toISOString() }));
      if (room.bookingId) dispatch(bookingPaymentStatusUpdated({ bookingId: room.bookingId, paymentStatus: 'simulated-paid', settledAt: new Date(nowMs).toISOString() }));
    }
  });
};

export const joinGameRoom = ({ roomId, user, joinCode }) => (dispatch, getState) => {
  const state = getState();
  const authenticatedUser = state.auth?.currentUser;
  if (authenticatedUser?.role !== 'player') return { ok: false, error: 'Only player accounts can pay for and join a game room.' };
  const room = state.community.rooms.find(item => item.id === roomId);
  const result = canJoinGameRoom(room, authenticatedUser.id, joinCode);
  if (!result.ok) return result;
  if (room.bookingId) {
    const booking = state.venues.bookings?.find(item => item.id === room.bookingId);
    if (!booking || !isBookingActive(booking)) {
      return { ok: false, error: 'This game room’s venue time is no longer reserved. Contact the organizer.' };
    }
  }
  dispatch(gameRoomMemberAdded({
    roomId,
    joinCode,
    member: { userId: authenticatedUser.id, name: authenticatedUser.name, joinedAt: new Date().toISOString(), paymentStatus: 'simulated-paid' },
  }));
  const joined = getState().community.rooms.find(item => item.id === roomId)
    ?.members.some(member => member.userId === authenticatedUser.id && member.paymentStatus === 'simulated-paid');
  return joined ? { ok: true } : { ok: false, error: 'The room filled before you could join.' };
};

export const leaveGameRoom = ({ roomId, userId }) => (dispatch, getState) => {
  const state = getState();
  const authenticatedUser = state.auth?.currentUser;
  if (authenticatedUser?.role !== 'player' || authenticatedUser.id !== userId) {
    return { ok: false, error: 'Sign in with the player account that owns this share.' };
  }
  const room = state.community.rooms.find(item => item.id === roomId);
  if (!room?.members.some(member => member.userId === userId)) {
    return { ok: false, error: 'You are not in this game room.' };
  }
  if (room.status !== 'open' || new Date(`${room.date}T${room.startTime}:00`).getTime() <= Date.now()) {
    return { ok: false, error: 'This game has started or closed. Its payment can no longer be refunded.' };
  }
  if (room.createdBy === userId && room.bookingId) {
    dispatch(bookingCancelled({
      bookingId: room.bookingId,
      cancelledAt: new Date().toISOString(),
      refundAmountPKR: getRoomCollectedAmount(room),
    }));
  }
  if (room.createdBy === userId) dispatch(gameRoomCancelled({ roomId, cancelledAt: new Date().toISOString() }));
  else dispatch(gameRoomMemberRemoved({ roomId, userId }));
  return { ok: true };
};

export const cancelGameRoom = ({ roomId, user }) => (dispatch, getState) => {
  const state = getState();
  const room = state.community.rooms.find(item => item.id === roomId);
  if (!room) return { ok: false, error: 'This game room could not be found.' };
  const vendorOwnsVenue = user?.role === 'vendor' && state.venues.vendorProfiles.some(profile =>
    profile.ownerUserId === user.id && profile.id === state.venues.venues.find(venue => venue.id === room.venueId)?.vendorId,
  );
  if (room.createdBy !== user?.id && !vendorOwnsVenue) {
    return { ok: false, error: 'Only the organizer or venue provider can cancel this room.' };
  }
  if (room.bookingId) {
    dispatch(bookingCancelled({ bookingId: room.bookingId, cancelledAt: new Date().toISOString(), refundAmountPKR: getRoomCollectedAmount(room) }));
  }
  dispatch(gameRoomCancelled({ roomId, cancelledAt: new Date().toISOString() }));
  return { ok: true };
};

export const updateGameRoomPaymentShares = ({ roomId, userId, shares }) => (dispatch, getState) => {
  const room = getState().community.rooms.find(item => item.id === roomId);
  if (!room) return { ok: false, error: 'This game room could not be found.' };
  if (room.createdBy !== userId) return { ok: false, error: 'Only the organizer can change player shares.' };
  const validation = validateRoomPaymentShares(room.totalCostPKR, room.capacity, shares);
  if (!validation.valid) return { ok: false, error: validation.message };
  const existingBySeat = createLookup(room.paymentShares || [], item => item.seatIndex);
  const seatIndexes = shares.map(item => item.seatIndex);
  if (uniqueValues(seatIndexes).length !== Number(room.capacity) || seatIndexes.some(index => !Number.isInteger(index) || index < 0 || index >= Number(room.capacity))) {
    return { ok: false, error: 'Each room seat needs exactly one share.' };
  }
  const paidSeatChanged = shares.some(item => {
    const existing = existingBySeat[item.seatIndex];
    return ['simulated-paid', 'simulated-settled'].includes(existing?.status) && Number(existing.amountPKR) !== Number(item.amountPKR);
  });
  if (paidSeatChanged) return { ok: false, error: 'A recorded player share cannot be changed. Cancel the room to refund shares before changing paid amounts.' };
  const safeShares = shares.map(item => {
    const existing = existingBySeat[item.seatIndex];
    if ((existing?.userId || null) !== (item.userId || null)) return null;
    const changed = Number(existing?.amountPKR) !== Number(item.amountPKR);
    return {
      ...existing,
      seatIndex: item.seatIndex,
      amountPKR: Number(item.amountPKR),
      status: changed && existing?.userId ? 'unpaid' : existing?.status || 'open',
    };
  });
  if (safeShares.some(item => item === null)) return { ok: false, error: 'Player assignments can only be changed by joining or leaving the room.' };
  dispatch(roomPaymentSharesUpdated({ roomId, shares: safeShares }));
  return { ok: true };
};

export const cancelTournament = ({ tournamentId }) => (dispatch, getState) => {
  const state = getState();
  const user = state.auth.currentUser;
  const tournament = state.community.tournaments.find(item => item.id === tournamentId);
  if (!tournament) return { ok: false, error: 'This tournament could not be found.' };
  if (tournament.createdBy !== user?.id || user?.role !== 'vendor') return { ok: false, error: 'Only the hosting vendor can cancel this tournament.' };
  if (tournament.status === 'completed' || tournament.status === 'cancelled') return { ok: false, error: 'This tournament is already closed.' };
  (tournament.reservationIds || []).forEach(bookingId => dispatch(bookingCancelled({ bookingId })));
  dispatch(tournamentUpdated({ id: tournament.id, actorUserId: user.id, changes: { status: 'cancelled', registrationOpen: false, cancelledAt: new Date().toISOString() } }));
  return { ok: true };
};

export const updateTournamentAsVendor = ({ tournamentId, changes }) => (dispatch, getState) => {
  const state = getState();
  const user = state.auth.currentUser;
  const tournament = state.community.tournaments.find(item => item.id === tournamentId);
  if (!tournament) return { ok: false, error: 'This tournament could not be found.' };
  if (user?.role !== 'vendor' || tournament.createdBy !== user?.id) {
    return { ok: false, error: 'Only the vendor who created this tournament can manage it.' };
  }
  if (['completed', 'cancelled'].includes(tournament.status)) {
    return { ok: false, error: 'This tournament is already closed.' };
  }
  const allowedChanges = ['registrationOpen', 'status', 'standings', 'winnerTeamName'];
  if (!changes || Object.keys(changes).some(key => !allowedChanges.includes(key))) {
    return { ok: false, error: 'This tournament update contains fields vendors cannot edit.' };
  }
  dispatch(tournamentUpdated({ id: tournament.id, actorUserId: user.id, changes }));
  return { ok: true };
};

export const recordRoomSharePayment = ({ roomId, userId }) => (dispatch, getState) => {
  const state = getState();
  const user = state.auth?.currentUser;
  const room = state.community.rooms.find(item => item.id === roomId);
  if (user?.role !== 'player' || user.id !== userId) return { ok: false, error: 'Sign in with the player account that owns this share.' };
  if (!room) return { ok: false, error: 'This game room could not be found.' };
  const member = room.members.find(item => item.userId === userId);
  if (!member) return { ok: false, error: 'Join this game room before paying a share.' };
  if (room.status !== 'open' || new Date(`${room.date}T${room.startTime}:00`).getTime() <= Date.now()) {
    return { ok: false, error: 'This room is closed for payment.' };
  }
  if (member.paymentStatus === 'simulated-paid') {
    return { ok: false, error: 'Your share is already paid in the demo.' };
  }
  const status = 'simulated-paid';
  dispatch(roomMemberPaymentUpdated({ roomId, userId, status }));
  return { ok: true, status };
};

export const recordWalkInCashRefund = ({ bookingId }) => (dispatch, getState) => {
  const state = getState();
  const user = state.auth?.currentUser;
  const booking = state.venues.bookings.find(item => item.id === bookingId);
  const venue = state.venues.venues.find(item => item.id === booking?.venueId);
  const profile = state.venues.vendorProfiles.find(item => item.id === venue?.vendorId);
  if (!booking || booking.source !== 'walk-in' || booking.status !== 'cancelled' || booking.paymentStatus !== 'cash-refund-due') {
    return { ok: false, error: 'There is no cancelled paid walk-in awaiting a cash refund.' };
  }
  if (user?.role !== 'vendor' || profile?.ownerUserId !== user.id) {
    return { ok: false, error: 'Only the venue owner can record the cash refund.' };
  }
  dispatch(bookingPaymentStatusUpdated({ bookingId, paymentStatus: 'cash-refunded', settledAt: new Date().toISOString() }));
  return { ok: true };
};

export const joinTournament = ({ tournamentId, user, teamName, teammateNames = [], paymentMode = 'simulated' }) => (dispatch, getState) => {
  const state = getState();
  const authenticatedUser = state.auth?.currentUser;
  if (authenticatedUser?.role !== 'player') {
    return { ok: false, error: 'Tournament registration requires a player account. Sign out and use a player account to participate.' };
  }
  const tournament = state.community.tournaments.find(item => item.id === tournamentId);
  const result = canJoinTournament(tournament, authenticatedUser.id);
  if (!result.ok) return result;
  const teamSize = Number(tournament.teamSize) || 1;
  const limits = getTournamentTeamSizeLimits(tournament.sport);
  if (teamSize !== 1 && (teamSize < limits.min || teamSize > limits.max)) {
    return { ok: false, error: `${tournament.sport} teams must have ${limits.min === limits.max ? 'exactly ' : 'between '}${limits.min}${limits.min === limits.max ? '' : ` and ${limits.max}`} players.` };
  }
  if (paymentMode !== 'simulated') return { ok: false, error: 'Tournament entry must be paid before registration.' };
  const cleanTeammates = teammateNames.map(name => String(name).trim());
  if (teamSize > 1) {
    if (!String(teamName || '').trim()) return { ok: false, error: 'Enter a name for your team.' };
    if (cleanTeammates.length !== teamSize - 1 || cleanTeammates.some(name => !name)) {
      return { ok: false, error: `Your team leader plus exactly ${teamSize - 1} teammate name${teamSize === 2 ? '' : 's'} are required.` };
    }
    const playerNames = [String(authenticatedUser.name || '').trim(), ...cleanTeammates].map(name => name.toLowerCase());
    if (uniqueValues(playerNames).length !== teamSize) return { ok: false, error: 'Each teammate must have a different name from the team leader and other teammates.' };
  }
  dispatch(tournamentParticipantAdded({
    tournamentId,
    participant: {
      userId: authenticatedUser.id,
      name: authenticatedUser.name,
      paymentMode,
      paymentStatus: 'simulated-paid',
      entryFeePerPlayerPKR: Number(tournament.entryFeePKR ?? tournament.demoEntryFeePKR ?? 0),
      totalEntryFeePKR: Number(tournament.entryFeePKR ?? tournament.demoEntryFeePKR ?? 0) * teamSize,
      ...(teamSize > 1 ? { teamName: String(teamName).trim(), teamMembers: [authenticatedUser.name, ...cleanTeammates] } : {}),
      joinedAt: new Date().toISOString(),
    },
  }));
  const joined = getState().community.tournaments.find(item => item.id === tournamentId)
    ?.participants.some(participant => participant.userId === authenticatedUser.id);
  return joined ? { ok: true } : { ok: false, error: 'Registration filled before you could join.' };
};

export const leaveTournament = ({ tournamentId }) => (dispatch, getState) => {
  const user = getState().auth?.currentUser;
  const tournament = getState().community.tournaments.find(item => item.id === tournamentId);
  if (user?.role !== 'player') return { ok: false, error: 'Sign in with a player account to leave this tournament.' };
  if (!tournament?.participants.some(item => item.userId === user.id)) return { ok: false, error: 'You are not registered for this tournament.' };
  if (!['upcoming'].includes(tournament.status) || new Date(`${tournament.date}T${tournament.startTime}:00`).getTime() <= Date.now()) {
    return { ok: false, error: 'Tournament registration is closed; the entry cannot be refunded now.' };
  }
  dispatch(tournamentParticipantRemoved({ tournamentId, userId: user.id }));
  return { ok: true };
};

function syncTournamentConversation(state, tournament) {
  if (!tournament) return;
  const participantIds = uniqueValues([
    tournament.organizerUserId || tournament.createdBy,
    ...(tournament.participants || []).map(participant => participant.userId),
  ].filter(Boolean));
  const conversationId = tournament.conversationId || `conversation-tournament-${tournament.id}`;
  tournament.conversationId = conversationId;
  let conversation = state.conversations.find(item => item.kind === 'tournament' && item.tournamentId === tournament.id);
  if (!conversation) {
    conversation = {
      id: conversationId,
      kind: 'tournament',
      tournamentId: tournament.id,
      organizerUserId: tournament.organizerUserId || tournament.createdBy,
      title: `${tournament.title} chat`,
      subtitle: 'Private tournament chat · organizer and team leaders',
      participantIds,
      unreadByUser: createLookup(participantIds, userId => userId, () => 0),
      lastMessage: 'Private tournament chat is ready for the organizer and registered team leaders.',
      lastAt: tournament.createdAt || new Date().toISOString(),
      createdAt: tournament.createdAt || new Date().toISOString(),
    };
    state.conversations.unshift(conversation);
  } else {
    conversation.title = `${tournament.title} chat`;
    conversation.organizerUserId = tournament.organizerUserId || tournament.createdBy;
    conversation.participantIds = participantIds;
    conversation.unreadByUser = createLookup(participantIds, userId => userId, userId =>
      Number(conversation.unreadByUser?.[userId] || 0));
  }
}

const communitySlice = createSlice({
  name: 'community',
  initialState,
  reducers: {
    communityHydrated(state, action) {
      return { ...action.payload, notifications: action.payload.notifications || [], hydrated: true };
    },
    gameRoomCreated(state, action) {
      state.rooms.unshift(action.payload);
    },
    gameRoomUpdated(state, action) {
      const index = state.rooms.findIndex(room => room.id === action.payload.id);
      if (index < 0) return;
      const oldRoom = state.rooms[index];
      state.rooms[index] = { ...oldRoom, ...action.payload, createdBy: oldRoom.createdBy, members: action.payload.members || oldRoom.members };
      const conversation = state.conversations.find(item => item.kind === 'game-room' && item.roomId === oldRoom.id);
      if (conversation) {
        conversation.title = state.rooms[index].title;
        conversation.subtitle = `${state.rooms[index].sport} · ${state.rooms[index].vendorUserId ? 'joined players and venue vendor' : 'joined players only'}`;
        conversation.venueId = state.rooms[index].venueId;
        conversation.venueName = state.rooms[index].venueName;
        conversation.vendorId = state.rooms[index].vendorId;
        conversation.vendorUserId = state.rooms[index].vendorUserId || null;
        conversation.playerUserId = state.rooms[index].createdBy;
        conversation.playerName = state.rooms[index].createdByName;
        const participantIds = uniqueValues([
          ...state.rooms[index].members.map(member => member.userId),
          state.rooms[index].vendorUserId,
        ].filter(Boolean));
        conversation.participantIds = participantIds;
        conversation.unreadByUser = createLookup(participantIds, userId => userId, userId =>
          Number(conversation.unreadByUser?.[userId] || 0));
      }
    },
    gameRoomCancelled(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      if (room) {
        refundRoomShares(room, action.payload.cancelledAt || new Date().toISOString(), 'room-cancelled');
        room.status = 'cancelled';
        room.cancelledAt = action.payload.cancelledAt || new Date().toISOString();
      }
    },
    gameRoomExpired(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      if (!room || room.status !== 'open') return;
      refundRoomShares(room, action.payload.expiredAt || new Date().toISOString(), 'minimum-player-count-not-met');
      room.status = 'expired';
      room.expiredAt = action.payload.expiredAt || new Date().toISOString();
    },
    gameRoomSettled(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      if (!room || room.status !== 'open') return;
      room.status = 'completed';
      room.settledAt = action.payload.settledAt || new Date().toISOString();
      room.payoutStatus = 'simulated-released';
      room.paymentShares = (room.paymentShares || []).map(share => ({
        ...share,
        status: share.status === 'simulated-paid' ? 'simulated-settled' : share.status,
      }));
      room.members = (room.members || []).map(member => ({
        ...member,
        paymentStatus: member.paymentStatus === 'simulated-paid' ? 'simulated-settled' : member.paymentStatus,
      }));
    },
    gameRoomMemberAdded(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      const result = canJoinGameRoom(room, action.payload.member?.userId, action.payload.joinCode);
      if (!result.ok) return;
      room.paymentMode = 'simulated';
      const seat = (room.paymentShares || []).find(item => item.userId === null || item.userId === undefined);
      const seatIndex = seat?.seatIndex ?? room.members.length;
      const share = seat || { seatIndex, amountPKR: room.costPerParticipantPKR || 0, status: 'unpaid' };
      const member = {
        ...action.payload.member,
        seatIndex,
        sharePKR: Number(share.amountPKR) || 0,
        paymentStatus: action.payload.member.paymentStatus === 'simulated-paid' ? 'simulated-paid' : 'unpaid',
      };
      room.members.push(member);
      room.paymentShares = room.paymentShares || [];
      const shareIndex = room.paymentShares.findIndex(item => item.seatIndex === seatIndex);
      const assignedShare = { ...share, userId: member.userId, name: member.name, status: member.paymentStatus };
      if (shareIndex < 0) room.paymentShares.push(assignedShare);
      else room.paymentShares[shareIndex] = assignedShare;
      const conversation = state.conversations.find(item => item.kind === 'game-room' && item.roomId === room.id);
      if (conversation && !conversation.participantIds?.includes(member.userId)) {
        conversation.participantIds = conversation.participantIds || [];
        conversation.participantIds.push(member.userId);
        conversation.unreadByUser = { ...conversation.unreadByUser, [member.userId]: 0 };
      }
    },
    gameRoomMemberRemoved(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      if (room) {
        const member = room.members.find(item => item.userId === action.payload.userId);
        if (member?.paymentStatus === 'simulated-paid') {
          room.refundRecords = room.refundRecords || [];
          room.refundRecords.push({ id: `room-refund-${room.id}-${member.userId}`, userId: member.userId, name: member.name, amountPKR: Number(member.sharePKR || 0), status: 'simulated-refunded', reason: 'player-left-before-session', refundedAt: new Date().toISOString() });
        }
        room.members = room.members.filter(member => member.userId !== action.payload.userId);
        if (room.createdBy === action.payload.userId) room.status = 'cancelled';
        if (member) {
          const share = room.paymentShares?.find(item => item.seatIndex === member.seatIndex);
          if (share) Object.assign(share, { userId: null, name: `Open player ${share.seatIndex + 1}`, status: 'open' });
        }
        const conversation = state.conversations.find(item => item.kind === 'game-room' && item.roomId === room.id);
        if (conversation) {
          conversation.participantIds = (conversation.participantIds || []).filter(id => id !== action.payload.userId);
          const { [action.payload.userId]: _removedUnread, ...unreadByUser } = conversation.unreadByUser || {};
          conversation.unreadByUser = unreadByUser;
        }
      }
    },
    conversationCreated(state, action) {
      state.conversations.unshift(action.payload);
    },
    conversationRead(state, action) {
      const conversation = state.conversations.find(item => item.id === action.payload.conversationId);
      if (conversation) {
        conversation.unreadByUser = { ...conversation.unreadByUser, [action.payload.userId]: 0 };
        state.notifications = (state.notifications || []).map(item =>
          item.conversationId === conversation.id && item.recipientId === action.payload.userId
            ? { ...item, readAt: item.readAt || new Date().toISOString() }
            : item,
        );
      }
    },
    messageSent(state, action) {
      const body = String(action.payload.body || '').trim();
      const conversation = state.conversations.find(item => item.id === action.payload.conversationId);
      if (!body || !conversation) return;
      if (!conversation.participantIds?.includes(action.payload.senderId)) return;
      if (conversation.kind === 'game-room') {
        const room = state.rooms.find(item => item.id === conversation.roomId);
        const isJoinedPlayer = room?.members.some(member => member.userId === action.payload.senderId);
        if (!isJoinedPlayer && room?.vendorUserId !== action.payload.senderId) return;
      }
      if (conversation.kind === 'tournament') {
        const tournament = state.tournaments.find(item => item.id === conversation.tournamentId);
        const isOrganizer = (tournament?.organizerUserId || tournament?.createdBy) === action.payload.senderId;
        const isRegisteredLeader = tournament?.participants.some(participant => participant.userId === action.payload.senderId);
        if (!isOrganizer && !isRegisteredLeader) return;
      }
      const message = { ...action.payload, body };
      state.messages.push(message);
      conversation.lastMessage = body;
      conversation.lastAt = message.createdAt;
      conversation.participantIds.forEach(userId => {
        if (userId !== message.senderId) {
          conversation.unreadByUser = {
            ...conversation.unreadByUser,
            [userId]: (conversation.unreadByUser?.[userId] || 0) + 1,
          };
          if (conversation.kind === 'game-room' || conversation.kind === 'venue-vendor' || conversation.kind === 'tournament') {
            state.notifications = state.notifications || [];
            state.notifications.unshift({
              id: `notification-${message.id}-${userId}`,
              recipientId: userId,
              roomId: conversation.kind === 'game-room' ? conversation.roomId : null,
              tournamentId: conversation.kind === 'tournament' ? conversation.tournamentId : null,
              venueId: conversation.venueId || null,
              venueName: conversation.venueName || conversation.title,
              conversationId: conversation.id,
              messageId: message.id,
              title: conversation.kind === 'tournament'
                ? `New message in ${conversation.title}`
                : conversation.kind === 'game-room'
                  ? `New message in ${conversation.title}`
                  : `New message about ${conversation.venueName || conversation.title}`,
              body: `${message.senderName}: ${body}`,
              createdAt: message.createdAt,
              readAt: null,
            });
          }
        }
      });
    },
    notificationsMarkedRead(state, action) {
      state.notifications = (state.notifications || []).map(item =>
        item.recipientId === action.payload.userId && !item.readAt
          ? { ...item, readAt: action.payload.readAt || new Date().toISOString() }
          : item,
      );
    },
    notificationMarkedRead(state, action) {
      state.notifications = (state.notifications || []).map(item =>
        item.id === action.payload.notificationId && item.recipientId === action.payload.userId
          ? { ...item, readAt: item.readAt || action.payload.readAt || new Date().toISOString() }
          : item,
      );
    },
    roomPaymentSharesUpdated(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      if (!room) return;
      room.paymentShares = action.payload.shares.map(item => ({ ...item }));
      room.paymentShares.forEach(share => {
        const member = room.members.find(item => item.userId === share.userId);
        if (!member) return;
        member.sharePKR = Number(share.amountPKR);
        member.seatIndex = share.seatIndex;
        member.paymentStatus = share.status === 'open' ? 'unpaid' : share.status;
      });
    },
    roomMemberPaymentUpdated(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      const member = room?.members.find(item => item.userId === action.payload.userId);
      if (!member) return;
      member.paymentStatus = action.payload.status;
      const share = room.paymentShares?.find(item => item.userId === action.payload.userId);
      if (share) share.status = action.payload.status;
    },
    tournamentCreated(state, action) {
      state.tournaments.unshift(action.payload);
      syncTournamentConversation(state, state.tournaments[0]);
    },
    tournamentUpdated(state, action) {
      const { id, actorUserId, changes } = action.payload || {};
      const index = state.tournaments.findIndex(item => item.id === id);
      if (index < 0 || !actorUserId || state.tournaments[index].createdBy !== actorUserId || !changes) return;
      const tournament = state.tournaments[index];
      state.tournaments[index] = { ...tournament, ...changes };
      if (changes.status === 'cancelled') {
        const refundedAt = new Date().toISOString();
        state.tournaments[index].refundRecords = (tournament.participants || [])
          .filter(participant => participant.paymentStatus === 'simulated-paid')
          .map(participant => ({
            id: `tournament-refund-${tournament.id}-${participant.userId}`,
            userId: participant.userId,
            teamName: participant.teamName || participant.name,
            amountPKR: Number(participant.totalEntryFeePKR || 0),
            status: 'simulated-refunded',
            reason: 'host-cancelled-tournament',
            refundedAt,
          }));
        state.tournaments[index].participants = (tournament.participants || []).map(participant => ({
          ...participant,
          paymentStatus: participant.paymentStatus === 'simulated-paid' ? 'simulated-refunded' : participant.paymentStatus,
          refundedAt,
        }));
        state.tournaments[index].payoutStatus = 'simulated-refunded';
      }
      if (changes.status === 'completed') {
        let paidEntryTotalPKR = 0;
        (tournament.participants || []).forEach(participant => {
          paidEntryTotalPKR += Number(participant.totalEntryFeePKR || 0);
        });
        const prizePKR = Math.max(0, Number(tournament.prizePKR || 0));
        state.tournaments[index].participants = (tournament.participants || []).map(participant => ({
          ...participant,
          paymentStatus: participant.paymentStatus === 'simulated-paid' ? 'simulated-settled' : participant.paymentStatus,
        }));
        state.tournaments[index].payoutStatus = 'simulated-released';
        state.tournaments[index].vendorPayoutPKR = Math.max(0, paidEntryTotalPKR - prizePKR);
        state.tournaments[index].prizePayoutPKR = Math.min(prizePKR, paidEntryTotalPKR);
        state.tournaments[index].vendorPrizeTopUpPKR = Math.max(0, prizePKR - paidEntryTotalPKR);
        state.tournaments[index].settledAt = new Date().toISOString();
      }
      syncTournamentConversation(state, state.tournaments[index]);
    },
    tournamentParticipantAdded(state, action) {
      const tournament = state.tournaments.find(item => item.id === action.payload.tournamentId);
      const result = canJoinTournament(tournament, action.payload.participant?.userId);
      if (result.ok) {
        tournament.participants.push(action.payload.participant);
        syncTournamentConversation(state, tournament);
      }
    },
    tournamentParticipantRemoved(state, action) {
      const tournament = state.tournaments.find(item => item.id === action.payload.tournamentId);
      if (tournament) {
        const participant = tournament.participants.find(item => item.userId === action.payload.userId);
        if (participant?.paymentStatus === 'simulated-paid') {
          tournament.refundRecords = tournament.refundRecords || [];
          tournament.refundRecords.push({ id: `tournament-refund-${tournament.id}-${participant.userId}`, userId: participant.userId, teamName: participant.teamName || participant.name, amountPKR: Number(participant.totalEntryFeePKR || 0), status: 'simulated-refunded', refundedAt: new Date().toISOString(), reason: 'player-left-before-tournament' });
        }
        tournament.participants = tournament.participants.filter(
          participant => participant.userId !== action.payload.userId,
        );
        syncTournamentConversation(state, tournament);
      }
    },
    splitSaved(state, action) {
      const split = action.payload;
      const index = state.splits.findIndex(item => item.id === split.id);
      if (index === -1) state.splits.push(split);
      else state.splits[index] = split;
    },
    splitShareStatusChanged(state, action) {
      const split = state.splits.find(item => item.id === action.payload.splitId);
      const share = split?.shares.find(item => item.userId === action.payload.userId);
      if (share) share.status = action.payload.status === 'paid' ? 'paid' : 'unpaid';
    },
  },
});

export const {
  communityHydrated,
  conversationCreated,
  conversationRead,
  gameRoomCreated,
  gameRoomUpdated,
  gameRoomCancelled,
  gameRoomExpired,
  gameRoomSettled,
  gameRoomMemberAdded,
  gameRoomMemberRemoved,
  messageSent,
  notificationMarkedRead,
  notificationsMarkedRead,
  roomMemberPaymentUpdated,
  roomPaymentSharesUpdated,
  splitSaved,
  splitShareStatusChanged,
  tournamentCreated,
  tournamentUpdated,
  tournamentParticipantAdded,
  tournamentParticipantRemoved,
} = communitySlice.actions;

export { createId as createCommunityId };
export default communitySlice.reducer;
