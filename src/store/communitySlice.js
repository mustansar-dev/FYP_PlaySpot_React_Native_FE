import { createSlice } from '@reduxjs/toolkit';
import { createDemoCommunityState } from '../data/demoCommunityData';
import { canJoinGameRoom, canJoinTournament, validateRoomPaymentShares } from '../utils/community';
import { isBookingActive } from '../utils/booking';
import { bookingCancelled } from './venueSlice';

const initialState = { ...createDemoCommunityState(), hydrated: false };

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const joinGameRoom = ({ roomId, user, joinCode }) => (dispatch, getState) => {
  const state = getState();
  const room = state.community.rooms.find(item => item.id === roomId);
  const result = canJoinGameRoom(room, user?.id, joinCode);
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
    member: { userId: user.id, name: user.name, joinedAt: new Date().toISOString() },
  }));
  const joined = getState().community.rooms.find(item => item.id === roomId)
    ?.members.some(member => member.userId === user.id);
  return joined ? { ok: true } : { ok: false, error: 'The room filled before you could join.' };
};

export const leaveGameRoom = ({ roomId, userId }) => (dispatch, getState) => {
  const room = getState().community.rooms.find(item => item.id === roomId);
  if (!room?.members.some(member => member.userId === userId)) {
    return { ok: false, error: 'You are not in this game room.' };
  }
  if (room.createdBy === userId && room.bookingId) {
    dispatch(bookingCancelled({
      bookingId: room.bookingId,
      cancelledAt: new Date().toISOString(),
    }));
  }
  dispatch(gameRoomMemberRemoved({ roomId, userId }));
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
    dispatch(bookingCancelled({ bookingId: room.bookingId, cancelledAt: new Date().toISOString() }));
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
  const existingBySeat = new Map((room.paymentShares || []).map(item => [item.seatIndex, item]));
  const seatIndexes = shares.map(item => item.seatIndex);
  if (new Set(seatIndexes).size !== Number(room.capacity) || seatIndexes.some(index => !Number.isInteger(index) || index < 0 || index >= Number(room.capacity))) {
    return { ok: false, error: 'Each room seat needs exactly one share.' };
  }
  const safeShares = shares.map(item => {
    const existing = existingBySeat.get(item.seatIndex);
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

export const recordRoomSharePayment = ({ roomId, userId }) => (dispatch, getState) => {
  const room = getState().community.rooms.find(item => item.id === roomId);
  if (!room) return { ok: false, error: 'This game room could not be found.' };
  const member = room.members.find(item => item.userId === userId);
  if (!member) return { ok: false, error: 'Join this game room before paying a share.' };
  if (['paid-at-venue', 'simulated-paid'].includes(member.paymentStatus)) {
    return { ok: false, error: 'Your share is already marked as paid in this demo.' };
  }
  const status = room.paymentMode === 'simulated' ? 'simulated-paid' : 'paid-at-venue';
  dispatch(roomMemberPaymentUpdated({ roomId, userId, status }));
  return { ok: true, status };
};

export const joinTournament = ({ tournamentId, user }) => (dispatch, getState) => {
  const tournament = getState().community.tournaments.find(item => item.id === tournamentId);
  const result = canJoinTournament(tournament, user?.id);
  if (!result.ok) return result;
  dispatch(tournamentParticipantAdded({
    tournamentId,
    participant: { userId: user.id, name: user.name, joinedAt: new Date().toISOString() },
  }));
  const joined = getState().community.tournaments.find(item => item.id === tournamentId)
    ?.participants.some(participant => participant.userId === user.id);
  return joined ? { ok: true } : { ok: false, error: 'Registration filled before you could join.' };
};

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
        const participantIds = [...new Set([
          ...state.rooms[index].members.map(member => member.userId),
          state.rooms[index].vendorUserId,
        ].filter(Boolean))];
        conversation.participantIds = participantIds;
        conversation.unreadByUser = Object.fromEntries(participantIds.map(userId => [
          userId,
          Number(conversation.unreadByUser?.[userId] || 0),
        ]));
      }
    },
    gameRoomCancelled(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      if (room) {
        room.status = 'cancelled';
        room.cancelledAt = action.payload.cancelledAt || new Date().toISOString();
      }
    },
    gameRoomMemberAdded(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      const result = canJoinGameRoom(room, action.payload.member?.userId, action.payload.joinCode);
      if (!result.ok) return;
      const seat = (room.paymentShares || []).find(item => item.userId === null || item.userId === undefined);
      const seatIndex = seat?.seatIndex ?? room.members.length;
      const share = seat || { seatIndex, amountPKR: room.costPerParticipantPKR || 0, status: 'unpaid' };
      const member = {
        ...action.payload.member,
        seatIndex,
        sharePKR: Number(share.amountPKR) || 0,
        paymentStatus: 'unpaid',
      };
      room.members.push(member);
      room.paymentShares = room.paymentShares || [];
      const shareIndex = room.paymentShares.findIndex(item => item.seatIndex === seatIndex);
      const assignedShare = { ...share, userId: member.userId, name: member.name, status: 'unpaid' };
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
          if (conversation.kind === 'game-room') {
            state.notifications = state.notifications || [];
            state.notifications.unshift({
              id: `notification-${message.id}-${userId}`,
              recipientId: userId,
              roomId: conversation.roomId,
              conversationId: conversation.id,
              messageId: message.id,
              title: `New message in ${conversation.title}`,
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
    },
    tournamentParticipantAdded(state, action) {
      const tournament = state.tournaments.find(item => item.id === action.payload.tournamentId);
      const result = canJoinTournament(tournament, action.payload.participant?.userId);
      if (result.ok) tournament.participants.push(action.payload.participant);
    },
    tournamentParticipantRemoved(state, action) {
      const tournament = state.tournaments.find(item => item.id === action.payload.tournamentId);
      if (tournament) {
        tournament.participants = tournament.participants.filter(
          participant => participant.userId !== action.payload.userId,
        );
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
  tournamentParticipantAdded,
  tournamentParticipantRemoved,
} = communitySlice.actions;

export { createId as createCommunityId };
export default communitySlice.reducer;
