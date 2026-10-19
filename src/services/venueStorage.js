import AsyncStorage from '@react-native-async-storage/async-storage';
import { createDemoCommunityState } from '../data/demoCommunityData';
import { createDemoVenueState } from '../data/demoVenueData';
import { createSlotsForGround, getNextBookableDates, intervalsOverlap, isBookingActive, parseLocalDateKey } from '../utils/booking';
import { createRoomPaymentShares, getGameRoomCapacityLimit, validateRoomPaymentShares } from '../utils/community';

export const VENUE_STORAGE_KEY = 'playspot-pk.venue-data.v1';

function hasValidVenueCollections(value) {
  const hasCollections = Boolean(
    value &&
      value.version === 1 &&
      Array.isArray(value.vendorProfiles) &&
      Array.isArray(value.venues) &&
      Array.isArray(value.grounds) &&
      Array.isArray(value.equipment) &&
      Array.isArray(value.slots) &&
      Array.isArray(value.reviews),
  );
  if (!hasCollections) {
    return false;
  }
  const profileIds = new Set(value.vendorProfiles.map(profile => profile?.id));
  const venueIds = new Set(value.venues.map(venue => venue?.id));
  const groundIds = new Set(value.grounds.map(ground => ground?.id));
  return (
    value.vendorProfiles.every(profile => Boolean(profile?.id && profile.ownerUserId && profile.businessName)) &&
    value.venues.every(venue => Boolean(
      venue?.id && profileIds.has(venue.vendorId) && venue.name && venue.city &&
      typeof venue.published === 'boolean' && Array.isArray(venue.sports) && Array.isArray(venue.facilities) &&
      (venue.latitude === null || Number.isFinite(venue.latitude)) &&
      (venue.longitude === null || Number.isFinite(venue.longitude)),
    )) &&
    value.grounds.every(ground => Boolean(
      ground?.id && venueIds.has(ground.venueId) && ground.name && ground.sport &&
      Number.isFinite(ground.widthMeters) && ground.widthMeters > 0 &&
      Number.isFinite(ground.lengthMeters) && ground.lengthMeters > 0 &&
      Number.isFinite(ground.hourlyPricePKR) && ground.hourlyPricePKR > 0 &&
      Number.isInteger(ground.slotDurationMinutes) && ground.slotDurationMinutes > 0,
    )) &&
    value.equipment.every(item => Boolean(
      item?.id && venueIds.has(item.venueId) && item.name &&
      ['rental', 'sale'].includes(item.priceMode) &&
      Number.isFinite(item.unitPricePKR) && item.unitPricePKR > 0 &&
      Number.isInteger(item.quantityAvailable) && item.quantityAvailable >= 0,
    )) &&
    value.slots.every(slot => Boolean(
      slot?.id && groundIds.has(slot.groundId) && slot.date && slot.startTime && slot.endTime &&
      ['available', 'unavailable'].includes(slot.status),
    )) &&
    value.reviews.every(review => Boolean(
      review?.id && venueIds.has(review.venueId) && review.playerName &&
      Number.isInteger(review.stars) && review.stars >= 1 && review.stars <= 5 && review.comment,
    ))
  );
}

function hasValidCommunityData(value) {
  return Boolean(value &&
    Array.isArray(value.rooms) &&
    Array.isArray(value.conversations) &&
    Array.isArray(value.messages) &&
    Array.isArray(value.tournaments) &&
    Array.isArray(value.leaderboard) &&
    Array.isArray(value.splits));
}

function hasValidBookings(value) {
  return Array.isArray(value) && value.every(booking => Boolean(
    booking && booking.id && ['player', 'walk-in', 'tournament'].includes(booking.source) &&
    ['confirmed', 'cancelled', 'pending'].includes(booking.status) && booking.slotId &&
    booking.groundId && booking.venueId && booking.date && booking.startTime && booking.endTime &&
    Array.isArray(booking.addOns) && Number.isInteger(booking.totalPKR) && booking.totalPKR >= 0,
  ));
}

function normalizeCommunityData(value, venueData = {}) {
  const source = hasValidCommunityData(value) ? value : createDemoCommunityState();
  const rooms = source.rooms.map(room => {
    const venue = (venueData.venues || []).find(item => item.id === room.venueId);
    const vendorId = room.vendorId || venue?.vendorId || null;
    const vendorProfile = (venueData.vendorProfiles || []).find(item => item.id === vendorId);
    const vendorUserId = room.vendorUserId || vendorProfile?.ownerUserId || null;
    const rawMembers = room.members || [];
    const requestedCapacity = Number.isInteger(Number(room.capacity)) && Number(room.capacity) > 1 ? Number(room.capacity) : 4;
    const capacity = Math.max(2, rawMembers.length, Math.min(requestedCapacity, getGameRoomCapacityLimit(room.sport)));
    const totalCostPKR = Number.isInteger(Number(room.totalCostPKR))
      ? Number(room.totalCostPKR)
      : Math.max(0, Number(room.costPerParticipantPKR) || 0) * capacity;
    const members = rawMembers.map((member, index) => ({
      ...member,
      seatIndex: Number.isInteger(member.seatIndex) ? member.seatIndex : index,
    }));
    const paymentMode = 'simulated';
    const existingShares = Array.isArray(room.paymentShares) ? room.paymentShares.map(share => ({
      ...share,
      status: share.status === 'paid-at-venue' ? 'simulated-paid' : share.status === 'due-at-venue' ? 'unpaid' : share.status,
    })) : [];
    const paymentShares = validateRoomPaymentShares(totalCostPKR, capacity, existingShares).valid
      ? existingShares.map(share => ({ ...share }))
      : createRoomPaymentShares(totalCostPKR, capacity, members, paymentMode, existingShares);
    const normalizedMembers = members.map(member => {
      const share = paymentShares.find(item => item.seatIndex === member.seatIndex);
      return {
        ...member,
        sharePKR: Number(share?.amountPKR ?? member.sharePKR ?? 0),
        paymentStatus: share?.status || (member.paymentStatus === 'paid-at-venue' ? 'simulated-paid' : member.paymentStatus === 'due-at-venue' ? 'unpaid' : member.paymentStatus) || 'unpaid',
      };
    });
    return {
      ...room,
      capacity,
      totalCostPKR,
      costPerParticipantPKR: Math.ceil(totalCostPKR / capacity),
      paymentMode,
      paymentShares,
      members: normalizedMembers,
      venueName: room.venueName || venue?.name || null,
      vendorId,
      vendorUserId,
    };
  });

  const conversations = source.conversations.map(conversation => ({
    ...conversation,
    participantIds: [...(conversation.participantIds || [])],
    unreadByUser: { ...(conversation.unreadByUser || {}) },
  }));
  const messages = source.messages.map(message => ({ ...message }));
  const tournaments = source.tournaments.map(tournament => ({
    ...tournament,
    participants: (tournament.participants || []).map(participant => ({ ...participant })),
    standings: (tournament.standings || []).map(row => ({ ...row })),
  }));
  rooms.forEach(room => {
    const participantIds = [...new Set([
      ...room.members.map(member => member.userId),
      room.vendorUserId,
    ].filter(Boolean))];
    let conversation = conversations.find(item => item.kind === 'game-room' && item.roomId === room.id);
    if (!conversation) {
      conversation = {
        id: room.conversationId || `conversation-${room.id}`,
        kind: 'game-room',
        roomId: room.id,
        venueId: room.venueId,
        venueName: room.venueName,
        vendorId: room.vendorId,
        vendorUserId: room.vendorUserId,
        playerUserId: room.createdBy,
        playerName: room.createdByName,
        title: room.title,
        subtitle: `${room.sport} · ${room.vendorUserId ? 'joined players and venue vendor' : 'joined players only'}`,
        participantIds,
        unreadByUser: Object.fromEntries(participantIds.map(userId => [userId, 0])),
        lastMessage: room.vendorUserId
          ? 'Private room chat is ready for the joined players and venue vendor.'
          : 'Room chat is ready. Only joined players can open it.',
        lastAt: room.createdAt || new Date().toISOString(),
        createdAt: room.createdAt || new Date().toISOString(),
      };
      conversations.push(conversation);
    } else {
      conversation.title = room.title;
      conversation.venueId = room.venueId;
      conversation.venueName = room.venueName;
      conversation.vendorId = room.vendorId;
      conversation.vendorUserId = room.vendorUserId;
      conversation.playerUserId = room.createdBy;
      conversation.playerName = room.createdByName;
      conversation.subtitle = `${room.sport} · ${room.vendorUserId ? 'joined players and venue vendor' : 'joined players only'}`;
      conversation.participantIds = participantIds;
      conversation.unreadByUser = Object.fromEntries(participantIds.map(userId => [
        userId,
        Number(conversation.unreadByUser?.[userId] || 0),
      ]));
    }
    room.conversationId = conversation.id;
  });

  tournaments.forEach(tournament => {
    const participantIds = [...new Set([
      tournament.organizerUserId || tournament.createdBy,
      ...tournament.participants.map(participant => participant.userId),
    ].filter(Boolean))];
    let conversation = conversations.find(item => item.kind === 'tournament' && item.tournamentId === tournament.id);
    if (!conversation) {
      conversation = {
        id: tournament.conversationId || `conversation-tournament-${tournament.id}`,
        kind: 'tournament',
        tournamentId: tournament.id,
        organizerUserId: tournament.organizerUserId || tournament.createdBy,
        title: `${tournament.title} chat`,
        subtitle: 'Private tournament chat · organizer and team leaders',
        participantIds,
        unreadByUser: Object.fromEntries(participantIds.map(userId => [userId, 0])),
        lastMessage: 'Private tournament chat is ready for the organizer and registered team leaders.',
        lastAt: tournament.createdAt || new Date().toISOString(),
        createdAt: tournament.createdAt || new Date().toISOString(),
      };
      conversations.push(conversation);
    } else {
      conversation.tournamentId = tournament.id;
      conversation.organizerUserId = tournament.organizerUserId || tournament.createdBy;
      conversation.title = `${tournament.title} chat`;
      conversation.participantIds = participantIds;
      conversation.unreadByUser = Object.fromEntries(participantIds.map(userId => [
        userId,
        Number(conversation.unreadByUser?.[userId] || 0),
      ]));
    }
    tournament.conversationId = conversation.id;
  });

  const notifications = Array.isArray(source.notifications) ? source.notifications.map(item => ({ ...item })) : [];
  rooms.forEach(room => {
    const conversation = conversations.find(item => item.kind === 'game-room' && item.roomId === room.id);
    const latestMessage = messages.filter(message => message.conversationId === conversation.id)
      .sort((first, second) => String(second.createdAt).localeCompare(String(first.createdAt)))[0];
    if (!latestMessage) return;
    conversation.participantIds.forEach(recipientId => {
      if (latestMessage.senderId === recipientId || Number(conversation.unreadByUser?.[recipientId] || 0) < 1) return;
      const id = `notification-${latestMessage.id}-${recipientId}`;
      if (notifications.some(item => item.id === id)) return;
      notifications.push({
        id,
        recipientId,
        roomId: room.id,
        conversationId: conversation.id,
        messageId: latestMessage.id,
        title: `New message in ${room.title}`,
        body: `${latestMessage.senderName}: ${latestMessage.body}`,
        createdAt: latestMessage.createdAt,
        readAt: null,
      });
    });
  });

  return {
    rooms,
    conversations,
    messages,
    tournaments,
    leaderboard: source.leaderboard.map(item => ({ ...item })),
    splits: (source.splits || []).map(item => ({ ...item })),
    notifications,
  };
}

function withUpcomingSlots(data) {
  const slots = [...data.slots];
  const dates = getNextBookableDates(new Date(), 7);
  data.grounds.filter(ground => ground.isActive !== false).forEach(ground => {
    dates.forEach(({ dateKey }) => {
      const hasDay = slots.some(slot => slot.groundId === ground.id && slot.date === dateKey);
      if (!hasDay) {
        const date = parseLocalDateKey(dateKey);
        const generated = createSlotsForGround(ground, 1, undefined, undefined, date).map(slot => {
          const reservation = data.bookings.find(booking => booking.groundId === ground.id && booking.date === dateKey && isBookingActive(booking) && intervalsOverlap(slot.startTime, slot.endTime, booking.startTime, booking.endTime));
          return reservation ? { ...slot, status: 'unavailable', reservedByBookingId: reservation.id } : slot;
        });
        slots.push(...generated);
      }
    });
  });
  return { ...data, slots };
}

function normalizeStoredData(value) {
  if (!hasValidVenueCollections(value)) return null;
  const community = normalizeCommunityData(value.community, value);
  const bookings = hasValidBookings(value.bookings) ? value.bookings : [];
  const normalized = withUpcomingSlots({ ...value, bookings, community });
  return hasValidCommunityData(normalized.community) && Array.isArray(normalized.bookings)
    ? normalized
    : null;
}

export async function loadVenueData() {
  let raw;
  try {
    raw = await AsyncStorage.getItem(VENUE_STORAGE_KEY);
  } catch (error) {
    return {
      data: normalizeStoredData(createDemoVenueState()),
      notice: 'Venue data could not be read. Fictional demo venues are shown for this session.',
    };
  }

  if (raw === null) {
    const data = normalizeStoredData(createDemoVenueState());
    try {
      await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(data));
      return { data, notice: null };
    } catch (error) {
      return { data, notice: 'Venue data could not be saved. Changes may not survive closing the app.' };
    }
  }

  try {
    const parsed = JSON.parse(raw);
    const data = normalizeStoredData(parsed);
    if (data) {
      const upgraded = !hasValidBookings(parsed.bookings) || !hasValidCommunityData(parsed.community) ||
        !Array.isArray(parsed.community?.notifications) || (parsed.community?.rooms || []).some(room =>
          !Array.isArray(room.paymentShares) || Boolean(room.venueId && !room.vendorUserId));
      return {
        data,
        notice: upgraded ? 'Local booking and community demo data is ready on this device.' : null,
      };
    }
  } catch (error) {
    // Replace malformed local demo data with a fresh fixture set below.
  }

  const data = normalizeStoredData(createDemoVenueState());
  try {
    await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    return { data, notice: 'Saved venue data was invalid and could not be repaired in storage.' };
  }
  return { data, notice: 'Saved venue data was unreadable and has been reset to fictional demo venues.' };
}

export async function saveVenueData(data) {
  const normalized = normalizeStoredData(data);
  if (!normalized) {
    throw new Error('Venue data could not be saved because its structure is incomplete.');
  }
  await AsyncStorage.setItem(VENUE_STORAGE_KEY, JSON.stringify(normalized));
}
