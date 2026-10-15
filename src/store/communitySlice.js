import { createSlice } from '@reduxjs/toolkit';
import { createDemoCommunityState } from '../data/demoCommunityData';
import { canJoinGameRoom, canJoinTournament } from '../utils/community';

const initialState = { ...createDemoCommunityState(), hydrated: false };

function createId(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export const joinGameRoom = ({ roomId, user, joinCode }) => (dispatch, getState) => {
  const room = getState().community.rooms.find(item => item.id === roomId);
  const result = canJoinGameRoom(room, user?.id, joinCode);
  if (!result.ok) return result;
  dispatch(gameRoomMemberAdded({
    roomId,
    joinCode,
    member: { userId: user.id, name: user.name, joinedAt: new Date().toISOString() },
  }));
  const joined = getState().community.rooms.find(item => item.id === roomId)
    ?.members.some(member => member.userId === user.id);
  return joined ? { ok: true } : { ok: false, error: 'The room filled before you could join.' };
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
      return { ...action.payload, hydrated: true };
    },
    gameRoomCreated(state, action) {
      state.rooms.unshift(action.payload);
    },
    gameRoomMemberAdded(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      const result = canJoinGameRoom(room, action.payload.member?.userId, action.payload.joinCode);
      if (result.ok) room.members.push(action.payload.member);
    },
    gameRoomMemberRemoved(state, action) {
      const room = state.rooms.find(item => item.id === action.payload.roomId);
      if (room) {
        room.members = room.members.filter(member => member.userId !== action.payload.userId);
        if (room.createdBy === action.payload.userId) room.status = 'cancelled';
      }
    },
    conversationCreated(state, action) {
      state.conversations.unshift(action.payload);
    },
    conversationRead(state, action) {
      const conversation = state.conversations.find(item => item.id === action.payload.conversationId);
      if (conversation) {
        conversation.unreadByUser = { ...conversation.unreadByUser, [action.payload.userId]: 0 };
      }
    },
    messageSent(state, action) {
      const body = String(action.payload.body || '').trim();
      const conversation = state.conversations.find(item => item.id === action.payload.conversationId);
      if (!body || !conversation) return;
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
        }
      });
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
  gameRoomMemberAdded,
  gameRoomMemberRemoved,
  messageSent,
  splitSaved,
  splitShareStatusChanged,
  tournamentCreated,
  tournamentParticipantAdded,
  tournamentParticipantRemoved,
} = communitySlice.actions;

export { createId as createCommunityId };
export default communitySlice.reducer;
