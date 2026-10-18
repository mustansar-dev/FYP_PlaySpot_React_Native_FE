import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import { DesignCard, EmptyState, InlineNotice, SectionHeading, StatusBadge } from '../components/DesignPrimitives';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import {
  createCommunityId,
  conversationCreated,
  conversationRead,
  gameRoomCreated,
  gameRoomUpdated,
  joinGameRoom,
  leaveGameRoom,
  messageSent,
  recordRoomSharePayment,
  tournamentCreated,
  tournamentParticipantRemoved,
  joinTournament,
  updateGameRoomPaymentShares,
} from '../store/communitySlice';
import { bookingCancelled, bookingPaymentModeUpdated, reserveBooking } from '../store/venueSlice';
import { calculateGroundFee, formatPKR, getNextBookableDates, getSlotAvailability, isBookingActive, toLocalDateKey } from '../utils/booking';
import { createVenueVendorConversation, findVenueVendorConversation } from '../utils/venueConversations';
import {
  calculateEqualShares,
  createRoomPaymentShares,
  formatCommunityDate,
  formatCommunityTime,
  getGameRoomCapacityLimit,
  getRoomOpenSpots,
  matchesRoomFilters,
  validateGameRoomDraft,
  validateRoomPaymentShares,
  validateTournamentDraft,
} from '../utils/community';

const SPORTS = ['Futsal', 'Football', 'Cricket', 'Padel', 'Badminton'];

function formatTimestamp(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '' : date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

function LocalDemoNote() {
  return <InlineNotice>Local demo chat — messages do not sync across devices. Community activity stays on this device.</InlineNotice>;
}

function RoomCard({ room, onPress, testID }) {
  const { colors } = useTheme();
  const openSpots = useMemo(() => getRoomOpenSpots(room), [room]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${room.title}`} testID={testID} onPress={onPress}>
      <DesignCard style={styles.listCard}>
        <View style={styles.rowBetween}>
          <Text numberOfLines={1} style={[styles.cardTitle, styles.flex, { color: colors.ink }]}>{room.title}</Text>
          <StatusBadge label={room.visibility} tone={room.visibility === 'private' ? 'warning' : 'success'} />
        </View>
        <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{room.sport} · {formatCommunityDate(room.date)} · {formatCommunityTime(room.startTime)}</Text>
        <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{room.location}</Text>
        <View style={styles.rowBetween}>
          <Text style={[styles.cardMetaStrong, { color: colors.ink }]}>{room.members.length}/{room.capacity} players · {openSpots} spots left</Text>
          <Text style={[styles.priceSmall, { color: colors.primary }]}>{formatPKR(room.costPerParticipantPKR)} / player</Text>
        </View>
        <Text style={[styles.cardLink, { color: colors.primary }]}>View game →</Text>
      </DesignCard>
    </Pressable>
  );
}

export function GameRoomsScreen({ navigation }) {
  const { colors } = useTheme();
  const rooms = useSelector(state => state.community.rooms);
  const [visibility, setVisibility] = useState('all');
  const [sport, setSport] = useState('All');
  const [time, setTime] = useState('all');
  const [query, setQuery] = useState('');
  const openRoom = useCallback(roomId => navigation.navigate('GameRoomDetails', { roomId }), [navigation]);
  const renderRoom = useCallback(({ item }) => (
    <RoomCard room={item} testID={`game-room-${item.id}`} onPress={() => openRoom(item.id)} />
  ), [openRoom]);
  const filtered = useMemo(() => rooms
    .filter(room => matchesRoomFilters(room, { visibility, sport, time, query }))
    .sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`)), [rooms, visibility, sport, time, query]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <>
            <ScreenHeader title="Find players" subtitle="Join a local game or create a match with open spots." eyebrow="PLAY TOGETHER" onBack={() => navigation.goBack()} />
            <LocalDemoNote />
            <AppButton title="Create a game room" testID="rooms-create" onPress={() => navigation.navigate('CreateGameRoom')} style={styles.listAction} />
            <ChoiceChips label="Room type" options={['All', 'Public', 'Private']} selected={visibility === 'all' ? 'All' : visibility === 'public' ? 'Public' : 'Private'} onSelect={value => setVisibility(value.toLowerCase())} testID="rooms-visibility" />
            <ChoiceChips label="Sport" options={['All', ...SPORTS]} selected={sport} onSelect={setSport} testID="rooms-sport" />
            <ChoiceChips label="When" options={['All', 'Today', 'This week']} selected={time === 'all' ? 'All' : time === 'today' ? 'Today' : 'This week'} onSelect={value => setTime(value === 'All' ? 'all' : value === 'Today' ? 'today' : 'this-week')} testID="rooms-time" />
            <FormField label="Search area or game" value={query} onChangeText={setQuery} placeholder="Try Gulberg or futsal" testID="rooms-search" leadingIcon="⌕" />
            <SectionHeading title={`${filtered.length} game${filtered.length === 1 ? '' : 's'}`} />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No games match those filters" description="Adjust your filters or create a game room for your group." action={<AppButton title="Create a game room" testID="rooms-empty-create" onPress={() => navigation.navigate('CreateGameRoom')} />} />}
        renderItem={renderRoom}
      />
    </SafeAreaView>
  );
}

export function CreateGameRoomScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const { venues, grounds, slots, bookings, vendorProfiles } = useSelector(state => state.venues);
  const rooms = useSelector(state => state.community.rooms);
  const conversations = useSelector(state => state.community.conversations);
  const roomId = route?.params?.roomId;
  const room = useSelector(state => state.community.rooms.find(item => item.id === roomId));
  const editing = Boolean(roomId);
  const canEdit = !editing || room?.createdBy === currentUser?.id;
  const [title, setTitle] = useState(room?.title || '');
  const [sport, setSport] = useState(room?.sport || 'Futsal');
  const [location, setLocation] = useState(room?.venueId ? room.location : '');
  const [selectedVenueId, setSelectedVenueId] = useState(room?.venueId || '');
  const [selectedSlotId, setSelectedSlotId] = useState(room?.slotId || '');
  const [expandedVenueId, setExpandedVenueId] = useState('');
  const [visibility, setVisibility] = useState(room?.visibility || 'public');
  const [capacity, setCapacity] = useState(String(room?.capacity || (room?.sport === 'Badminton' || room?.sport === 'Padel' ? 4 : 8)));
  const [paymentMode, setPaymentMode] = useState(room?.paymentMode || 'pay-at-venue');
  const [joinCode, setJoinCode] = useState(room?.joinCode || '');
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);

  const venueSuggestions = useMemo(() => {
    const query = location.trim().toLowerCase();
    const now = new Date();
    return venues
      .filter(venue => venue.published && venue.sports.includes(sport) &&
        (!query || `${venue.name} ${venue.city} ${venue.locationNote || ''} ${venue.address || ''}`.toLowerCase().includes(query)))
      .map(venue => {
        const matchingGrounds = grounds.filter(ground => ground.venueId === venue.id && ground.sport === sport && ground.isActive !== false);
        const availableSlots = slots.flatMap(slot => {
          const ground = matchingGrounds.find(item => item.id === slot.groundId);
          if (!ground || new Date(`${slot.date}T${slot.startTime}:00`).getTime() <= now.getTime()) return [];
          const assignedRoom = rooms.find(candidate => candidate.id !== room?.id && candidate.status !== 'cancelled' && candidate.slotId === slot.id);
          const availability = getSlotAvailability({ slotId: slot.id, slots, bookings, now, ignoreBookingId: room?.bookingId });
          if (!availability.available || assignedRoom) return [];
          return [{ ...slot, ground, totalCostPKR: calculateGroundFee(ground, slot) }];
        }).sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`));
        return { venue, slots: availableSlots };
      })
      .filter(item => item.slots.length)
      .slice(0, 5);
  }, [location, venues, grounds, slots, bookings, rooms, room?.id, room?.bookingId, sport]);

  const selectedVenue = venues.find(venue => venue.id === selectedVenueId);
  const selectedVendorProfile = vendorProfiles.find(profile => profile.id === selectedVenue?.vendorId);
  const selectedSlotRecord = slots.find(slot => slot.id === selectedSlotId);
  const selectedGround = grounds.find(ground => ground.id === selectedSlotRecord?.groundId);
  const selectedSlot = selectedSlotRecord && selectedGround
    ? { ...selectedSlotRecord, ground: selectedGround, sport: selectedGround.sport, totalCostPKR: calculateGroundFee(selectedGround, selectedSlotRecord) }
    : null;
  const totalCostPKR = selectedSlot?.totalCostPKR || 0;
  const capacityNumber = Number(capacity);
  const estimatedSharePKR = Number.isInteger(capacityNumber) && capacityNumber > 0
    ? Math.ceil(totalCostPKR / capacityNumber)
    : 0;
  const capacityLimit = getGameRoomCapacityLimit(sport);

  const selectVenueSlot = (venue, slot) => {
    setSelectedVenueId(venue.id);
    setSelectedSlotId(slot.id);
    setLocation(`${venue.name} · ${venue.locationNote || venue.address || venue.city}`);
    setExpandedVenueId('');
    setErrors(previous => ({ ...previous, location: undefined, slot: undefined }));
  };

  const changeSelectedVenue = () => {
    setSelectedVenueId('');
    setSelectedSlotId('');
    setLocation('');
  };

  const openVendorChat = () => {
    const vendorUserId = selectedVendorProfile?.ownerUserId;
    if (!selectedVenue || !currentUser?.id || !vendorUserId) return;
    const existing = findVenueVendorConversation(conversations, selectedVenue.id, currentUser.id, vendorUserId);
    if (existing) {
      navigation.navigate('ChatConversation', { conversationId: existing.id });
      return;
    }
    const conversation = createVenueVendorConversation({
      id: createCommunityId('conversation'),
      currentUser,
      venue: selectedVenue,
      vendorProfile: selectedVendorProfile,
    });
    if (!conversation) return;
    dispatch(conversationCreated(conversation));
    navigation.navigate('ChatConversation', { conversationId: conversation.id });
  };

  const changeSport = nextSport => {
    setSport(nextSport);
    setSelectedVenueId('');
    setSelectedSlotId('');
    setLocation('');
    setCapacity(current => String(Math.min(Number(current) || 8, getGameRoomCapacityLimit(nextSport))));
    setErrors(previous => ({ ...previous, slot: undefined, location: undefined, capacity: undefined }));
  };

  const create = async () => {
    if (saving) return;
    if (!canEdit || !room && editing) {
      setErrors({ form: 'Only the organizer can edit this game room.' });
      return;
    }
    const values = {
      title,
      sport,
      location,
      selectedSlot,
      capacity,
      totalCostPKR,
      paymentMode,
      visibility,
      joinCode,
      memberCount: room?.members.length || 0,
    };
    const validation = validateGameRoomDraft(values);
    const slotReservation = selectedSlot && !room?.bookingId
      ? getSlotAvailability({ slotId: selectedSlot.id, slots, bookings })
      : selectedSlot ? getSlotAvailability({ slotId: selectedSlot.id, slots, bookings, ignoreBookingId: room.bookingId }) : { available: false };
    if (selectedSlot && !slotReservation.available) validation.slot = 'That venue time was just taken. Choose another available time.';
    if (selectedSlot && rooms.some(candidate => candidate.id !== room?.id && candidate.status !== 'cancelled' && candidate.slotId === selectedSlot.id)) {
      validation.slot = 'Another game room already uses this venue time. Choose a different time.';
    }
    setErrors(validation);
    if (Object.keys(validation).length) return;

    setSaving(true);
    const timestamp = new Date().toISOString();
    const roomRecordId = room?.id || createCommunityId('room');
    const reusingBooking = Boolean(room?.bookingId && room.slotId === selectedSlot.id &&
      bookings.some(item => item.id === room.bookingId && isBookingActive(item)));
    let bookingId = reusingBooking ? room.bookingId : null;
    try {
      if (!reusingBooking) {
        const reservation = await dispatch(reserveBooking({
          source: 'player',
          playerUserId: currentUser?.id,
          roomId: roomRecordId,
          slotId: selectedSlot.id,
          addOns: [],
          paymentMode: 'pay-at-venue',
        }));
        if (!reservation.ok) {
          setErrors({ slot: reservation.error });
          return;
        }
        bookingId = reservation.booking.id;
        if (room?.bookingId) {
          dispatch(bookingCancelled({ bookingId: room.bookingId, cancelledAt: timestamp }));
        }
      } else if (room.bookingId) {
        const existingBooking = bookings.find(item => item.id === room.bookingId);
        if (existingBooking && (existingBooking.paymentMode !== 'pay-at-venue' || existingBooking.paymentStatus !== 'due-at-venue')) {
          dispatch(bookingPaymentModeUpdated({ bookingId: room.bookingId, paymentMode: 'pay-at-venue' }));
        }
      }

      const paymentModeChanged = Boolean(room && room.paymentMode !== paymentMode);
      const members = room?.members?.length
        ? room.members.map((member, index) => ({
          ...member,
          seatIndex: Number.isInteger(member.seatIndex) ? member.seatIndex : index,
          paymentStatus: paymentModeChanged && member.userId === room.createdBy
            ? paymentMode === 'simulated' ? 'simulated-paid' : 'due-at-venue'
            : member.paymentStatus,
        }))
        : [{ userId: currentUser.id, name: currentUser.name, joinedAt: timestamp, seatIndex: 0 }];
      const paymentShares = createRoomPaymentShares(totalCostPKR, Number(capacity), members, paymentMode, room?.paymentShares || []);
      const updatedMembers = members.map(member => {
        const share = paymentShares.find(item => item.seatIndex === member.seatIndex);
        return { ...member, sharePKR: share?.amountPKR || 0, paymentStatus: share?.status || 'unpaid' };
      });
      const roomRecord = {
        ...(room || {}),
        id: roomRecordId,
        title: title.trim(),
        sport,
        location: `${selectedVenue.name} · ${selectedVenue.locationNote || selectedVenue.address || selectedVenue.city}`,
        date: selectedSlot.date,
        startTime: selectedSlot.startTime,
        endTime: selectedSlot.endTime,
        visibility,
        joinCode: visibility === 'private' ? joinCode.trim() : '',
        capacity: Number(capacity),
        totalCostPKR,
        costPerParticipantPKR: estimatedSharePKR,
        paymentMode,
        bookingId,
        venueId: selectedVenue.id,
        vendorId: selectedVenue.vendorId,
        vendorUserId: selectedVendorProfile?.ownerUserId || null,
        groundId: selectedGround.id,
        slotId: selectedSlot.id,
        status: room?.status || 'open',
        createdBy: room?.createdBy || currentUser.id,
        createdByName: room?.createdByName || currentUser.name,
        members: updatedMembers,
        paymentShares,
        createdAt: room?.createdAt || timestamp,
        updatedAt: timestamp,
      };

      if (room) {
        dispatch(gameRoomUpdated(roomRecord));
        navigation.goBack();
      } else {
        const conversationId = createCommunityId('conversation');
        const roomParticipantIds = [...new Set([
          ...updatedMembers.map(member => member.userId),
          selectedVendorProfile?.ownerUserId,
        ].filter(Boolean))];
        const conversation = {
          id: conversationId,
          kind: 'game-room',
          roomId: roomRecord.id,
          venueId: selectedVenue.id,
          venueName: selectedVenue.name,
          vendorId: selectedVenue.vendorId,
          vendorUserId: selectedVendorProfile?.ownerUserId || null,
          playerUserId: currentUser.id,
          playerName: currentUser.name,
          title: roomRecord.title,
          subtitle: `${sport} · ${selectedVendorProfile?.ownerUserId ? 'joined players and venue vendor' : 'joined players only'}`,
          participantIds: roomParticipantIds,
          unreadByUser: Object.fromEntries(roomParticipantIds.map(userId => [userId, 0])),
          lastMessage: selectedVendorProfile?.ownerUserId
            ? 'Private room chat is ready for the joined players and venue vendor.'
            : 'Room chat is ready. Only joined players can open it.',
          lastAt: timestamp,
          createdAt: timestamp,
        };
        dispatch(gameRoomCreated({ ...roomRecord, conversationId }));
        dispatch(conversationCreated(conversation));
        navigation.replace('GameRoomDetails', { roomId: roomRecord.id });
      }
    } catch (error) {
      setErrors({ form: error.message || 'The game room could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  if (editing && (!room || !canEdit)) {
    return <ScreenMissing navigation={navigation} title={room ? 'Only the organizer can edit this game room' : 'Game room not found'} />;
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader title={editing ? 'Edit game room' : 'Create a game'} subtitle="Choose a sport, a matching venue time, and your player limit." onBack={() => navigation.goBack()} eyebrow={editing ? 'ORGANIZER SETTINGS' : 'NEW ROOM'} />
        <FormField label="Game name" value={title} onChangeText={setTitle} error={errors.title} placeholder="Friday night futsal" testID="room-title" />
        <ChoiceChips label="Sport" options={SPORTS} selected={sport} onSelect={changeSport} testID="room-sport" />
        <FormField label="Venue or meeting location" value={location} onChangeText={value => { setLocation(value); setSelectedVenueId(''); setSelectedSlotId(''); setErrors(previous => ({ ...previous, slot: undefined })); }} error={errors.location} placeholder={`Search ${sport} venues or areas`} testID="room-location" leadingIcon="⌕" />
        {selectedVenue && selectedSlot ? (
          <>
            <View style={[styles.selectedVenueCard, { backgroundColor: colors.surface, borderColor: colors.primary, borderRadius: radius.md }]}>
              <View style={styles.selectedVenueCopy}>
                <Text style={[styles.selectedVenueLabel, { color: colors.primary }]}>SELECTED {sport.toUpperCase()} VENUE</Text>
                <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.ink }]}>{selectedVenue.name}</Text>
                <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.inkSoft }]}>{selectedGround?.name} · {selectedVenue.locationNote || selectedVenue.city}</Text>
                <Text style={[styles.selectedTime, { color: colors.ink }]}>{formatCommunityDate(selectedSlot.date)} · {formatCommunityTime(selectedSlot.startTime)}–{formatCommunityTime(selectedSlot.endTime)}</Text>
                <Text style={[styles.cardMetaStrong, { color: colors.primary }]}>{formatPKR(selectedGround?.hourlyPricePKR)} / hour · {formatPKR(totalCostPKR)} venue total</Text>
              </View>
              <Pressable accessibilityRole="button" accessibilityLabel="Change selected venue or time" testID="room-venue-change" onPress={changeSelectedVenue} hitSlop={8}>
                <Text style={[styles.changeVenue, { color: colors.primary }]}>Change</Text>
              </Pressable>
            </View>
            {selectedVendorProfile?.ownerUserId ? <AppButton title="Chat with venue vendor" variant="secondary" testID="room-venue-chat" onPress={openVendorChat} style={styles.venueChatButton} /> : null}
          </>
        ) : venueSuggestions.length ? <ScrollView testID="room-venue-suggestions" nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" style={styles.suggestionScroll} contentContainerStyle={styles.venueSuggestions}>
          {venueSuggestions.slice(0, 3).map(({ venue, slots: venueSlots }) => {
            const expanded = expandedVenueId === venue.id;
            const visibleSlots = expanded ? venueSlots.slice(1) : [];
            const firstSlot = venueSlots[0];
            return <View key={venue.id} style={[styles.venueSuggestion, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
              <View style={styles.suggestionHeader}>
                <View style={{ flex: 1 }}>
                  <Text numberOfLines={1} style={[styles.cardTitle, { color: colors.ink }]}>{venue.name}</Text>
                  <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.inkSoft }]}>{venue.locationNote || venue.address || venue.city}</Text>
                </View>
                <Text style={[styles.priceSmall, { color: colors.primary }]}>{formatPKR(firstSlot.ground.hourlyPricePKR)}/hr</Text>
              </View>
              <Text style={[styles.sportAvailability, { color: colors.success }]}>{sport} available · {firstSlot.ground.name}</Text>
              <View style={styles.nextSlotRow}>
                <Pressable accessibilityRole="button" accessibilityLabel={`Select ${venue.name}, ${formatCommunityDate(firstSlot.date)} ${formatCommunityTime(firstSlot.startTime)}, ${formatPKR(firstSlot.totalCostPKR)}`} testID={`room-slot-${firstSlot.id}`} onPress={() => selectVenueSlot(venue, firstSlot)} style={[styles.nextSlot, { backgroundColor: colors.limePale, borderRadius: radius.sm }]}>
                  <Text style={[styles.nextSlotLabel, { color: colors.primaryDark }]}>NEXT AVAILABLE · {formatPKR(firstSlot.totalCostPKR)} TOTAL</Text>
                  <Text style={[styles.nextSlotTime, { color: colors.primaryDark }]}>{formatCommunityDate(firstSlot.date)} · {formatCommunityTime(firstSlot.startTime)}–{formatCommunityTime(firstSlot.endTime)}</Text>
                </Pressable>
                {venueSlots.length > 1 ? <Pressable accessibilityRole="button" accessibilityLabel={expanded ? 'Show fewer available times' : `Show more available times at ${venue.name}`} testID={`room-times-${venue.id}`} onPress={() => setExpandedVenueId(expanded ? '' : venue.id)} hitSlop={8}>
                  <Text style={[styles.moreTimes, { color: colors.primary }]}>{expanded ? 'Less' : `+${venueSlots.length - 1} times`}</Text>
                </Pressable> : null}
              </View>
              {expanded ? <ScrollView nestedScrollEnabled showsVerticalScrollIndicator keyboardShouldPersistTaps="handled" style={styles.moreSlotList} contentContainerStyle={styles.moreSlotContent}>{visibleSlots.map(slot => <Pressable key={slot.id} accessibilityRole="button" accessibilityLabel={`Select ${venue.name}, ${formatCommunityDate(slot.date)} ${formatCommunityTime(slot.startTime)}, ${formatPKR(slot.totalCostPKR)}`} testID={`room-slot-${slot.id}`} onPress={() => selectVenueSlot(venue, slot)} style={[styles.moreSlot, { backgroundColor: colors.canvas, borderColor: colors.border, borderRadius: radius.sm }]}><Text style={[styles.moreSlotText, { color: colors.ink }]}>{formatCommunityDate(slot.date)} · {formatCommunityTime(slot.startTime)}–{formatCommunityTime(slot.endTime)} · {formatPKR(slot.totalCostPKR)}</Text></Pressable>)}</ScrollView> : null}
            </View>;
          })}
        </ScrollView> : <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{location.trim() ? `No published venues with a future ${sport} time match this search.` : `No published venues currently offer ${sport}.`}</Text>}
        {errors.slot ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{errors.slot}</Text> : null}
        <View style={styles.capacityHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>Player capacity</Text>
            <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{sport} supports up to {capacityLimit} players in this room.</Text>
          </View>
          <FormField label="Players" value={capacity} onChangeText={value => setCapacity(value.replace(/[^\d]/g, ''))} error={errors.capacity} keyboardType="number-pad" testID="room-capacity" style={styles.capacityField} />
        </View>
        {selectedSlot ? <DesignCard testID="room-cost-summary">
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Transparent cost estimate</Text>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{formatPKR(totalCostPKR)} venue total ÷ {capacityNumber || '—'} planned players</Text>
          <View style={styles.costSummaryRow}><Text style={[styles.cardMetaStrong, { color: colors.ink }]}>Estimated share per player</Text><Text style={[styles.price, { color: colors.primary }]}>{formatPKR(estimatedSharePKR)}</Text></View>
          <View style={styles.costSummaryRow}><Text style={[styles.cardMetaStrong, { color: colors.ink }]}>Your organizer share</Text><Text style={[styles.price, { color: colors.primary }]}>{formatPKR(estimatedSharePKR)}</Text></View>
          <Text style={[styles.finePrint, { color: colors.inkSoft }]}>Whole-PKR shares are balanced so their total equals the venue slot price exactly.</Text>
        </DesignCard> : <InlineNotice>Select a venue time to see the total and per-player share.</InlineNotice>}
        <ChoiceChips label="How will players settle their share?" options={['Pay at venue', 'Simulated online payment']} selected={paymentMode === 'simulated' ? 'Simulated online payment' : 'Pay at venue'} onSelect={value => setPaymentMode(value === 'Simulated online payment' ? 'simulated' : 'pay-at-venue')} testID="room-payment" />
        <InlineNotice>{paymentMode === 'simulated'
          ? `Only your share (${formatPKR(estimatedSharePKR)}) is marked simulated paid when the room is created. Other shares stay unpaid; the full venue total is split across ${capacityNumber || 'the planned'} seats. No real payment is taken.`
          : `Your share (${formatPKR(estimatedSharePKR)}) is due at the venue. The full slot total is split across ${capacityNumber || 'the planned'} seats, and no payment is taken during room creation.`}</InlineNotice>
        <ChoiceChips label="Room visibility" options={['public', 'private']} selected={visibility} onSelect={setVisibility} testID="room-visibility" />
        {visibility === 'private' ? <FormField label="Private join code" value={joinCode} onChangeText={setJoinCode} error={errors.joinCode} autoCapitalize="characters" placeholder="At least 4 characters" testID="room-join-code" /> : null}
        {errors.totalCostPKR ? <InlineNotice tone="danger">{errors.totalCostPKR}</InlineNotice> : null}
        {errors.form ? <InlineNotice tone="danger">{errors.form}</InlineNotice> : null}
        <AppButton
          title={saving ? 'Saving game room…' : editing ? 'Save game room settings' : paymentMode === 'simulated' ? `Pay your share · ${formatPKR(estimatedSharePKR)} · create room` : `Create room · your ${formatPKR(estimatedSharePKR)} share due at venue`}
          testID="room-submit"
          onPress={create}
          loading={saving}
          disabled={saving || !selectedSlot}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

export function GameRoomDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const room = useSelector(state => state.community.rooms.find(item => item.id === route.params?.roomId));
  const conversation = useSelector(state => state.community.conversations.find(item =>
    item.kind === 'game-room' && item.roomId === route.params?.roomId,
  ));
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const member = room?.members.find(item => item.userId === currentUser?.id);
  const isOrganizer = room?.createdBy === currentUser?.id;
  const openSpots = useMemo(() => getRoomOpenSpots(room), [room]);
  const organizerShare = room?.paymentShares?.find(share => share.seatIndex === 0)
    || room?.paymentShares?.find(share => share.userId === room?.createdBy);

  const join = () => {
    setError('');
    const result = dispatch(joinGameRoom({ roomId: room?.id, user: currentUser, joinCode }));
    if (!result.ok) setError(result.error);
    else setJoinCode('');
  };
  const leave = () => {
    if (isOrganizer) {
      Alert.alert('Cancel this game room?', 'The room will close and its local venue reservation will be released.', [
        { text: 'Keep room', style: 'cancel' },
        { text: 'Cancel room', style: 'destructive', onPress: () => dispatch(leaveGameRoom({ roomId: room.id, userId: currentUser.id })) },
      ]);
      return;
    }
    dispatch(leaveGameRoom({ roomId: room.id, userId: currentUser.id }));
  };

  if (!room) return <ScreenMissing navigation={navigation} title="Game room not found" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <ScreenHeader title={room.title} subtitle={`${room.sport} · ${formatCommunityDate(room.date)} · ${formatCommunityTime(room.startTime)}`} eyebrow="GAME ROOM" onBack={() => navigation.goBack()} />
        <LocalDemoNote />
        <DesignCard>
          <View style={styles.rowBetween}><Text style={[styles.cardTitle, styles.flex, { color: colors.ink }]}>{room.location}</Text><StatusBadge label={room.visibility} tone={room.visibility === 'private' ? 'warning' : 'success'} /></View>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Organizer · {room.createdByName || 'PlaySpot player'}</Text>
          <Text style={[styles.cardMetaStrong, { color: colors.ink }]}>{room.members.length} / {room.capacity} players · {openSpots} spots left</Text>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{room.groundName || room.sport} · {formatCommunityDate(room.date)} · {formatCommunityTime(room.startTime)}</Text>
          <View style={styles.roomCostDivider} />
          <View style={styles.rowBetween}><Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Venue slot total</Text><Text style={[styles.price, { color: colors.ink }]}>{formatPKR(room.totalCostPKR ?? room.costPerParticipantPKR * room.capacity)}</Text></View>
          <View style={styles.rowBetween}><Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Estimated share / player</Text><Text style={[styles.price, { color: colors.primary }]}>{formatPKR(room.costPerParticipantPKR)}</Text></View>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Organizer share · {formatPKR(organizerShare?.amountPKR ?? room.costPerParticipantPKR)} · {organizerShare?.status === 'simulated-paid' ? 'simulated paid' : organizerShare?.status === 'paid-at-venue' ? 'paid at venue' : organizerShare?.status === 'due-at-venue' ? 'due at venue' : 'unpaid'}</Text>
          <Text style={[styles.finePrint, { color: colors.inkSoft }]}>Room creation records the organizer’s share only; the venue total is divided across the planned player seats.</Text>
        </DesignCard>
        {isOrganizer && room.status !== 'cancelled' ? <AppButton title="Edit game room settings" testID="room-edit" variant="secondary" onPress={() => navigation.navigate('CreateGameRoom', { roomId: room.id })} /> : null}
        {isOrganizer && room.visibility === 'private' ? <InlineNotice>Private room code · {room.joinCode}</InlineNotice> : null}
        <SectionHeading title="Players" />
        {room.members.map((item, index) => (
          <DesignCard key={item.userId} style={styles.memberPaymentCard}>
            <View style={[styles.memberAvatar, { backgroundColor: colors.limePale }]}><Text style={[styles.memberInitial, { color: colors.primary }]}>{item.name?.[0]?.toUpperCase() || String(index + 1)}</Text></View>
            <View style={styles.memberPaymentCopy}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>{item.name}{item.userId === room.createdBy ? ' · Organizer' : ''}</Text>
              <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{formatPKR(item.sharePKR ?? room.paymentShares?.find(share => share.userId === item.userId)?.amountPKR ?? room.costPerParticipantPKR)} share</Text>
            </View>
            <StatusBadge
              label={item.paymentStatus === 'simulated-paid' ? 'Simulated paid' : item.paymentStatus === 'paid-at-venue' ? 'Paid at venue' : item.paymentStatus === 'due-at-venue' ? 'Due at venue' : 'Unpaid'}
              tone={['simulated-paid', 'paid-at-venue'].includes(item.paymentStatus) ? 'success' : 'warning'}
            />
          </DesignCard>
        ))}
        {member && room.status === 'open' ? (
          <AppButton title={isOrganizer ? 'Cancel game room' : 'Leave game room'} variant="secondary" testID="room-leave" onPress={leave} />
        ) : room.status !== 'open' ? (
          <AppButton title="Room is closed" testID="room-closed" disabled />
        ) : openSpots === 0 ? (
          <AppButton title="Room is full" testID="room-full" disabled />
        ) : (
          <>
            {room.visibility === 'private' ? <FormField label="Private join code" value={joinCode} onChangeText={setJoinCode} autoCapitalize="characters" placeholder="Enter the code from the organizer" testID="room-detail-code" /> : null}
            <AppButton title="Join game room" testID="room-join" onPress={join} disabled={room.visibility === 'private' && !joinCode.trim()} />
          </>
        )}
        {error ? <InlineNotice tone="danger" testID="room-join-error">{error}</InlineNotice> : null}
        {member ? <AppButton title="Open this room’s private chat" variant="secondary" testID="room-chat" disabled={!conversation} onPress={() => conversation && navigation.navigate('ChatConversation', { conversationId: conversation.id })} style={styles.spacedButton} /> : <InlineNotice>{room.vendorUserId ? 'Room chat is private to joined players and the selected venue vendor. Join this room to open it.' : 'Room chat is private to joined players. Join this room to open it.'}</InlineNotice>}
        {member ? <AppButton title="Open split payment calculator" variant="quiet" testID="room-split" onPress={() => navigation.navigate('SplitPayment', { roomId: room.id })} style={styles.spacedButton} /> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

export function ChatInboxScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const conversationRows = useSelector(state => state.community.conversations);
  const conversations = useMemo(() => [...conversationRows]
    .filter(item => item.participantIds?.includes(currentUser?.id) &&
      (currentUser?.role !== 'vendor' ||
        ((item.kind === 'venue-vendor' || item.kind === 'game-room') && item.vendorUserId === currentUser.id)))
    .sort((first, second) => String(second.lastAt).localeCompare(String(first.lastAt))), [conversationRows, currentUser?.id, currentUser?.role]);

  const startConversation = () => {
    const conversation = {
      id: createCommunityId('conversation'),
      title: currentUser?.role === 'vendor' ? 'Player demo chat' : 'PlaySpot venue team',
      subtitle: 'Local conversation · demo only',
      participantIds: [currentUser.id, `demo-${currentUser.role === 'vendor' ? 'player' : 'support'}-${Date.now().toString(36)}`],
      unreadByUser: { [currentUser.id]: 0 },
      lastMessage: 'Start a local demo conversation.',
      lastAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    };
    dispatch(conversationCreated(conversation));
    navigation.navigate('ChatConversation', { conversationId: conversation.id });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={conversations}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <>
            <ScreenHeader title={currentUser?.role === "vendor" ? "Vendor inbox" : "Messages"} subtitle="Local demo chat · messages do not sync across devices." eyebrow="INBOX" onBack={() => navigation.goBack()} />
            <LocalDemoNote />
            {currentUser?.role !== 'vendor' ? <AppButton title="Start a demo chat" testID="chat-new" onPress={startConversation} style={styles.listAction} /> : null}
          </>
        )}
        ListEmptyComponent={<EmptyState title={currentUser?.role === 'vendor' ? 'No player messages yet' : 'No conversations yet'} description={currentUser?.role === 'vendor' ? 'Player chats for your venues will appear here.' : 'Start a local demo chat to see the conversation screen.'} action={currentUser?.role === 'vendor' ? null : <AppButton title="Start a demo chat" testID="chat-empty-new" onPress={startConversation} />} />}
        renderItem={({ item }) => {
          const unread = Number(item.unreadByUser?.[currentUser?.id] || 0);
          const title = currentUser?.role === 'vendor'
            ? item.kind === 'game-room' ? item.title : item.playerName || item.title
            : item.venueName || item.title;
          const subtitle = currentUser?.role === 'vendor' && item.kind === 'game-room'
            ? `Game room · ${item.venueName || 'your venue'}`
            : currentUser?.role === 'vendor' && item.venueName ? `About ${item.venueName}` : item.subtitle;
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open chat with ${title}`} testID={`chat-item-${item.id}`} onPress={() => navigation.navigate('ChatConversation', { conversationId: item.id })}>
              <DesignCard style={styles.chatRow}>
                <View style={[styles.chatAvatar, { backgroundColor: colors.limePale }]}><Text style={[styles.memberInitial, { color: colors.primary }]}>{title?.[0]?.toUpperCase() || 'P'}</Text></View>
                <View style={styles.chatCopy}>
                  <View style={styles.rowBetween}><Text numberOfLines={1} style={[styles.cardTitle, styles.flex, { color: colors.ink }]}>{title}</Text>{unread > 0 ? <StatusBadge label={`${unread} new`} tone="success" /> : null}</View>
                  <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.inkSoft }]}>{item.lastMessage}</Text>
                  <Text style={[styles.timestamp, { color: colors.muted }]}>{subtitle} · {formatTimestamp(item.lastAt)}</Text>
                </View>
              </DesignCard>
            </Pressable>
          );
        }}
      />
    </SafeAreaView>
  );
}

export function ChatConversationScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const conversationRows = useSelector(state => state.community.conversations);
  const conversation = conversationRows.find(item => item.id === route.params?.conversationId);
  const room = useSelector(state => state.community.rooms.find(item => item.id === conversation?.roomId));
  const isRoomMember = conversation?.kind !== 'game-room' || Boolean(
    room?.members.some(member => member.userId === currentUser?.id)
    || room?.vendorUserId === currentUser?.id,
  );
  const canOpenConversation = Boolean(conversation?.participantIds?.includes(currentUser?.id) && isRoomMember);
  const messageRows = useSelector(state => state.community.messages);
  const messages = useMemo(() => messageRows.filter(item => item.conversationId === route.params?.conversationId)
    .sort((first, second) => String(first.createdAt).localeCompare(String(second.createdAt))), [messageRows, route.params?.conversationId]);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (canOpenConversation && conversation && currentUser?.id) {
      dispatch(conversationRead({ conversationId: conversation.id, userId: currentUser.id }));
    }
  }, [canOpenConversation, conversation?.id, currentUser?.id, dispatch]);

  const send = () => {
    const body = draft.trim();
    if (!body || !conversation || !canOpenConversation) return;
    dispatch(messageSent({
      id: createCommunityId('message'),
      conversationId: conversation.id,
      senderId: currentUser.id,
      senderName: currentUser.name,
      body,
      createdAt: new Date().toISOString(),
    }));
    setDraft('');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.chatPage}>
          <ScreenHeader title={conversation ? (currentUser?.role === 'vendor' && conversation.kind === 'venue-vendor' ? conversation.playerName || conversation.title : conversation.title) : 'Conversation'} subtitle="Local demo chat · not real-time" eyebrow="MESSAGES" onBack={() => navigation.goBack()} />
          <LocalDemoNote />
          {canOpenConversation ? (
            <FlatList
              ref={listRef}
              data={messages}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.messageList}
              onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
              ListEmptyComponent={<EmptyState title="Start the conversation" description="Messages are saved on this device only." />}
              renderItem={({ item }) => {
                const outgoing = item.senderId === currentUser?.id;
                return (
                  <View style={[styles.messageLine, outgoing ? styles.messageOutgoing : styles.messageIncoming]}>
                    <View style={[styles.messageBubble, { backgroundColor: outgoing ? colors.primary : colors.surface, borderColor: outgoing ? colors.primary : colors.border, borderRadius: radius.md }]}>
                      {!outgoing ? <Text style={[styles.senderName, { color: colors.primary }]}>{item.senderName}</Text> : null}
                      <Text style={[styles.messageText, { color: outgoing ? colors.white : colors.ink }]}>{item.body}</Text>
                      <Text style={[styles.messageTime, { color: outgoing ? '#DFF4E8' : colors.inkSoft }]}>{new Date(item.createdAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}</Text>
                    </View>
                  </View>
                );
              }}
            />
          ) : <EmptyState title={conversation?.kind === 'game-room' ? 'Join this game room to open its private chat' : 'Conversation not available'} description="Only current conversation participants can read or send these local demo messages." />}
          {canOpenConversation ? <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
            <TextInput
              accessibilityLabel="Write a local demo message"
              testID="chat-message-input"
              value={draft}
              onChangeText={setDraft}
              onSubmitEditing={send}
              returnKeyType="send"
              placeholder="Write a message"
              placeholderTextColor={colors.muted}
              multiline
              maxLength={800}
              style={[styles.composerInput, { color: colors.ink }]}
            />
            <Pressable accessibilityRole="button" accessibilityLabel="Send local demo message" testID="chat-message-send" disabled={!draft.trim()} onPress={send} style={[styles.sendButton, { backgroundColor: colors.primary, borderRadius: radius.pill, opacity: draft.trim() ? 1 : 0.45 }]}>
              <Text style={styles.sendLabel}>Send</Text>
            </Pressable>
          </View> : null}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ScreenMissing({ navigation, title }) {
  return <SafeAreaView style={styles.safe}><ScreenHeader title={title} onBack={() => navigation.goBack()} /><EmptyState title={title} description="Return to the previous screen and choose a saved item." /></SafeAreaView>;
}

export function SplitPaymentScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const room = useSelector(state => state.community.rooms.find(item => item.id === route.params?.roomId));
  const conversation = useSelector(state => state.community.conversations.find(item => item.kind === 'game-room' && item.roomId === room?.id));
  const ground = useSelector(state => state.venues.grounds.find(item => item.id === room?.groundId));
  const booking = useSelector(state => state.venues.bookings.find(item => item.id === room?.bookingId));
  const isOrganizer = room?.createdBy === currentUser?.id;
  const isMember = room?.members.some(member => member.userId === currentUser?.id);
  const totalPKR = Number(room?.totalCostPKR ?? (room?.costPerParticipantPKR || 0) * (room?.capacity || 0));
  const [draftShares, setDraftShares] = useState(() => (room?.paymentShares || []).map(share => ({ ...share, amountPKR: String(share.amountPKR) })));
  const [message, setMessage] = useState('');
  const roomShares = room?.paymentShares || [];
  const shares = draftShares.length === roomShares.length ? draftShares : roomShares.map(share => ({ ...share, amountPKR: String(share.amountPKR) }));
  const normalizedShares = shares.map(share => ({ ...share, amountPKR: Number(share.amountPKR) }));
  const validation = useMemo(() => validateRoomPaymentShares(totalPKR, room?.capacity || 0, normalizedShares), [totalPKR, room?.capacity, normalizedShares]);
  const shareSum = useMemo(() => normalizedShares.reduce((sum, share) => sum + (Number(share.amountPKR) || 0), 0), [normalizedShares]);
  const myShare = roomShares.find(share => share.userId === currentUser?.id);

  useEffect(() => {
    setDraftShares(roomShares.map(share => ({ ...share, amountPKR: String(share.amountPKR) })));
  }, [room?.id, roomShares]);

  const updateShare = (seatIndex, value) => {
    if (!isOrganizer) return;
    const cleaned = String(value).replace(/[^\d]/g, '');
    setDraftShares(current => current.map(share => share.seatIndex === seatIndex ? { ...share, amountPKR: cleaned } : share));
    setMessage('');
  };
  const save = () => {
    if (!isOrganizer) {
      setMessage('Only the organizer can update share amounts. Discuss changes in the room chat.');
      return;
    }
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }
    const result = dispatch(updateGameRoomPaymentShares({
      roomId: room.id,
      userId: currentUser.id,
      shares: normalizedShares,
    }));
    setMessage(result.ok ? 'Share plan saved. Any changed paid share is marked unpaid again.' : result.error);
  };
  const payMyShare = () => {
    const result = dispatch(recordRoomSharePayment({ roomId: room.id, userId: currentUser.id }));
    setMessage(result.ok
      ? room.paymentMode === 'simulated' ? 'Your share is marked simulated paid. No money was transferred.' : 'Your share is marked paid at the venue in this local demo.'
      : result.error);
  };

  if (!room) return <ScreenMissing navigation={navigation} title="Game room not found" />;
  if (!isMember) return <ScreenMissing navigation={navigation} title="Join this game room to view its payment plan" />;

  const myShareAmount = Number(myShare?.amountPKR ?? room.members.find(member => member.userId === currentUser?.id)?.sharePKR ?? 0);
  const mySharePaid = ['paid-at-venue', 'simulated-paid'].includes(myShare?.status);
  const shareStatusLabel = share => share.status === 'open' ? 'Open spot'
    : share.status === 'simulated-paid' ? 'Simulated paid'
      : share.status === 'paid-at-venue' ? 'Paid at venue'
        : share.status === 'due-at-venue' ? 'Due at venue' : 'Unpaid';
  const equalShares = () => {
    const baseShares = calculateEqualShares(totalPKR, Array.from({ length: room.capacity }, (_, index) => ({ userId: String(index), name: `Seat ${index + 1}` })));
    setDraftShares(baseShares.map((share, index) => ({
      ...(shares.find(item => item.seatIndex === index) || {}),
      seatIndex: index,
      amountPKR: String(share.amountPKR),
    })));
    setMessage('Equal shares are balanced to the exact venue total.');
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Room payment plan" subtitle="See the venue total, your exact share, and local payment status." eyebrow="GROUP COSTS" onBack={() => navigation.goBack()} />
        <InlineNotice>Simulated split — no payments are transferred.</InlineNotice>
        <DesignCard testID="split-total-card">
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{room.title}</Text>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{room.location} · {room.members.length} joined of {room.capacity}</Text>
          <View style={styles.costSummaryRow}><Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Venue slot total</Text><Text style={[styles.price, { color: colors.ink }]}>{formatPKR(totalPKR)}</Text></View>
          {ground ? <Text style={[styles.finePrint, { color: colors.inkSoft }]}>{ground.name} · {formatPKR(ground.hourlyPricePKR)}/hour × {booking?.durationMinutes || 60} minutes</Text> : null}
          <View style={styles.costSummaryRow}><Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Planned shares</Text><Text style={[styles.cardMetaStrong, { color: colors.ink }]}>{room.capacity} players</Text></View>
          <Text style={[styles.finePrint, { color: colors.inkSoft }]}>The venue fee is divided across room capacity. Any remaining rupees are assigned one at a time from the first seat so all shares add up exactly.</Text>
        </DesignCard>
        <DesignCard style={styles.yourShareCard} testID="split-your-share">
          <Text style={[styles.shareEyebrow, { color: colors.primary }]}>YOUR SHARE</Text>
          <View style={styles.costSummaryRow}>
            <Text style={[styles.yourShareAmount, { color: colors.ink }]}>{formatPKR(myShareAmount)}</Text>
            <StatusBadge label={shareStatusLabel(myShare || {})} tone={mySharePaid ? 'success' : 'warning'} />
          </View>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Your amount is fixed by the organizer’s room plan and seat. Ask in the private room chat if you want it reviewed.</Text>
          {!mySharePaid ? <AppButton
            title={room.paymentMode === 'simulated' ? `Pay ${formatPKR(myShareAmount)} · simulated` : `Confirm ${formatPKR(myShareAmount)} paid at venue`}
            testID="room-share-pay"
            onPress={payMyShare}
            style={styles.sharePayButton}
          /> : null}
        </DesignCard>
        <SectionHeading title="Player payment status" />
        {shares.map((share, index) => (
          <DesignCard key={`share-seat-${share.seatIndex ?? index}`} style={styles.shareRow}>
            <View style={styles.shareIdentity}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>{share.name || `Open player ${index + 1}`}{share.userId === currentUser?.id ? ' · You' : ''}</Text>
              <StatusBadge label={shareStatusLabel(share)} tone={['simulated-paid', 'paid-at-venue'].includes(share.status) ? 'success' : share.status === 'open' ? 'neutral' : 'warning'} />
            </View>
            {isOrganizer ? <FormField label="Share (PKR)" value={String(share.amountPKR)} onChangeText={value => updateShare(share.seatIndex ?? index, value)} keyboardType="number-pad" testID={`split-share-seat-${share.seatIndex ?? index}`} style={styles.shareInput} />
              : <Text style={[styles.shareAmount, { color: colors.ink }]}>{formatPKR(share.amountPKR)}</Text>}
          </DesignCard>
        ))}
        <View style={[styles.rowBetween, styles.shareTotal]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Shares total</Text>
          <Text style={[styles.price, { color: shareSum === totalPKR ? colors.primary : colors.error }]}>{formatPKR(shareSum)} / {formatPKR(totalPKR)}</Text>
        </View>
        {isOrganizer ? <>
          <InlineNotice>Only you can edit these amounts. Players can discuss a change in the private room chat, then you can update the plan here.</InlineNotice>
          {!validation.valid ? <InlineNotice tone="danger">{validation.message}</InlineNotice> : null}
          <AppButton title="Divide equally" variant="secondary" testID="split-equal" onPress={equalShares} />
          <AppButton title="Save share plan" testID="split-save" onPress={save} disabled={!validation.valid} style={styles.spacedButton} />
        </> : <InlineNotice>Share amounts are read-only for players. Ask the organizer in the private room chat if something needs to change.</InlineNotice>}
        <AppButton title="Open this room’s private chat" variant="secondary" testID="split-room-chat" disabled={!conversation} onPress={() => conversation && navigation.navigate('ChatConversation', { conversationId: conversation.id })} style={styles.spacedButton} />
        {message ? <InlineNotice testID="split-message">{message}</InlineNotice> : null}
      </ScrollView>
    </SafeAreaView>
  );
}

function TournamentCard({ tournament, onPress, testID }) {
  const { colors } = useTheme();
  const remaining = useMemo(() => Math.max(0, tournament.capacity - tournament.participants.length), [tournament]);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${tournament.title}`} testID={testID} onPress={onPress}>
      <DesignCard style={styles.listCard}>
        <View style={styles.rowBetween}><Text numberOfLines={1} style={[styles.cardTitle, styles.flex, { color: colors.ink }]}>{tournament.title}</Text><StatusBadge label={tournament.status} tone={tournament.status === 'upcoming' ? 'success' : 'neutral'} /></View>
        <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{tournament.sport} · {formatCommunityDate(tournament.date)} · {formatCommunityTime(tournament.startTime)}</Text>
        <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{tournament.location}</Text>
        <Text style={[styles.cardMetaStrong, { color: colors.ink }]}>{tournament.participants.length}/{tournament.capacity} players · {remaining} spots left</Text>
      </DesignCard>
    </Pressable>
  );
}

export function TournamentsScreen({ navigation }) {
  const { colors } = useTheme();
  const tournaments = useSelector(state => state.community.tournaments);
  const [sport, setSport] = useState('All');
  const [status, setStatus] = useState('upcoming');
  const openTournament = useCallback(tournamentId => navigation.navigate('TournamentDetails', { tournamentId }), [navigation]);
  const renderTournament = useCallback(({ item }) => (
    <TournamentCard tournament={item} testID={`tournament-${item.id}`} onPress={() => openTournament(item.id)} />
  ), [openTournament]);
  const filtered = useMemo(() => tournaments.filter(item =>
    (sport === 'All' || item.sport === sport) && (status === 'all' || item.status === status),
  ).sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`)), [tournaments, sport, status]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <>
            <ScreenHeader title="Tournaments" subtitle="Local demo competitions with capacity-protected registration." eyebrow="COMPETE" onBack={() => navigation.goBack()} />
            <AppButton title="Create a tournament" testID="tournament-create-open" onPress={() => navigation.navigate('CreateTournament')} style={styles.listAction} />
            <AppButton title="View leaderboard" variant="secondary" testID="tournament-leaderboard-open" onPress={() => navigation.navigate('Leaderboard')} style={styles.listAction} />
            <ChoiceChips label="Sport" options={['All', ...SPORTS]} selected={sport} onSelect={setSport} testID="tournament-sport" />
            <ChoiceChips label="Status" options={['Upcoming', 'Active', 'Completed', 'All']} selected={status === 'all' ? 'All' : `${status[0].toUpperCase()}${status.slice(1)}`} onSelect={value => setStatus(value.toLowerCase())} testID="tournament-status" />
            <SectionHeading title={`${filtered.length} tournament${filtered.length === 1 ? '' : 's'}`} />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No tournaments in this filter" description="Choose another sport or status, or create a local demo tournament." action={<AppButton title="Create a tournament" testID="tournament-empty-create" onPress={() => navigation.navigate('CreateTournament')} />} />}
        renderItem={renderTournament}
      />
    </SafeAreaView>
  );
}

export function TournamentDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const tournament = useSelector(state => state.community.tournaments.find(item => item.id === route.params?.tournamentId));
  const [error, setError] = useState('');
  const isParticipant = tournament?.participants.some(item => item.userId === currentUser?.id);
  const remaining = useMemo(() => tournament ? Math.max(0, tournament.capacity - tournament.participants.length) : 0, [tournament]);
  const join = () => {
    setError('');
    const result = dispatch(joinTournament({ tournamentId: tournament?.id, user: currentUser }));
    if (!result.ok) setError(result.error);
  };
  const leave = () => dispatch(tournamentParticipantRemoved({ tournamentId: tournament.id, userId: currentUser.id }));

  if (!tournament) return <ScreenMissing navigation={navigation} title="Tournament not found" />;

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.pageContent}>
        <ScreenHeader title={tournament.title} subtitle={`${tournament.sport} · ${formatCommunityDate(tournament.date)}`} eyebrow="TOURNAMENT DETAILS" onBack={() => navigation.goBack()} />
        <LocalDemoNote />
        <DesignCard>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>{tournament.location}</Text>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{formatCommunityTime(tournament.startTime)} · {tournament.status}</Text>
          <Text style={[styles.cardMetaStrong, { color: colors.ink }]}>{tournament.participants.length}/{tournament.capacity} players · {remaining} spots left</Text>
          <Text style={[styles.price, { color: colors.primary }]}>{formatPKR(tournament.demoEntryFeePKR || 0)} demo entry estimate · no payment is collected</Text>
        </DesignCard>
        <SectionHeading title="Registered players" />
        {tournament.participants.map((participant, index) => (
          <View key={participant.userId} style={[styles.memberRow, { borderColor: colors.border }]}>
            <Text style={[styles.rankNumber, { color: colors.primary }]}>{String(index + 1).padStart(2, '0')}</Text>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>{participant.name}</Text>
          </View>
        ))}
        {isParticipant ? <AppButton title="Leave tournament" variant="secondary" testID="tournament-leave" onPress={leave} /> : remaining === 0 || tournament.status !== 'upcoming' ? <AppButton title={remaining === 0 ? 'Tournament is full' : 'Registration closed'} testID="tournament-closed" disabled /> : <AppButton title="Join tournament" testID="tournament-join" onPress={join} />}
        {error ? <InlineNotice tone="danger" testID="tournament-error">{error}</InlineNotice> : null}
        <AppButton title="Open demo leaderboard" variant="secondary" testID="tournament-details-leaderboard" onPress={() => navigation.navigate('Leaderboard', { sport: tournament.sport })} style={styles.spacedButton} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function CreateTournamentScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('Futsal');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(getNextBookableDates()[2]?.dateKey || toLocalDateKey());
  const [startTime, setStartTime] = useState('16:00');
  const [capacity, setCapacity] = useState('16');
  const [errors, setErrors] = useState({});

  const create = () => {
    const validation = validateTournamentDraft({ title, sport, location, date, startTime, capacity });
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const tournament = {
      id: createCommunityId('tournament'),
      title: title.trim(),
      sport,
      location: location.trim(),
      date,
      startTime,
      capacity: Number(capacity),
      status: 'upcoming',
      demoEntryFeePKR: 0,
      createdBy: currentUser.id,
      participants: [{ userId: currentUser.id, name: currentUser.name, joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    dispatch(tournamentCreated(tournament));
    navigation.replace('TournamentDetails', { tournamentId: tournament.id });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Create tournament" subtitle="Set the schedule and maximum player count." eyebrow="NEW TOURNAMENT" onBack={() => navigation.goBack()} />
        <FormField label="Tournament name" value={title} onChangeText={setTitle} error={errors.title} placeholder="Lahore weekend cup" testID="tournament-title" />
        <ChoiceChips label="Sport" options={SPORTS} selected={sport} onSelect={setSport} testID="tournament-create-sport" />
        <FormField label="Venue or area" value={location} onChangeText={setLocation} error={errors.location} placeholder="Venue name or area" testID="tournament-location" />
        <View style={styles.twoColumns}>
          <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} error={errors.date} testID="tournament-date" style={styles.column} />
          <FormField label="Start time (HH:MM)" value={startTime} onChangeText={setStartTime} testID="tournament-time" style={styles.column} />
        </View>
        <FormField label="Player capacity" value={capacity} onChangeText={setCapacity} error={errors.capacity} keyboardType="number-pad" testID="tournament-capacity" />
        <InlineNotice>New tournaments are local demo listings. No venue has been contacted and no entry fee is collected.</InlineNotice>
        <AppButton title="Create tournament" testID="tournament-create-submit" onPress={create} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function LeaderboardScreen({ navigation, route }) {
  const { colors } = useTheme();
  const rows = useSelector(state => state.community.leaderboard);
  const [sport, setSport] = useState(route.params?.sport || 'All');
  const sports = useMemo(() => ['All', ...new Set(rows.map(row => row.sport))], [rows]);
  const filtered = useMemo(() => rows.filter(row => sport === 'All' || row.sport === sport)
    .sort((first, second) => second.points - first.points || second.wins - first.wins), [rows, sport]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <>
            <ScreenHeader title="Leaderboard" subtitle="Seeded demo points and wins; no official standings." eyebrow="PLAYER RANKS" onBack={() => navigation.goBack()} />
            <LocalDemoNote />
            <ChoiceChips label="Sport" options={sports} selected={sport} onSelect={setSport} testID="leaderboard-sport" />
            <SectionHeading title="Rankings" />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No demo rankings yet" description="Choose another sport to view the seeded leaderboard." />}
        renderItem={({ item, index }) => (
          <DesignCard style={styles.rankCard}>
            <Text style={[styles.rankNumber, { color: index === 0 ? colors.orange : colors.primary }]}>{String(index + 1).padStart(2, '0')}</Text>
            <View style={styles.rankCopy}><Text style={[styles.cardTitle, { color: colors.ink }]}>{item.name}</Text><Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{item.sport} · {item.wins} demo wins</Text></View>
            <Text style={[styles.rankPoints, { color: colors.primary }]}>{item.points}<Text style={styles.pointsLabel}> pts</Text></Text>
          </DesignCard>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  pageContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, flexGrow: 1 },
  listCard: { marginBottom: 10 },
  listAction: { marginBottom: 9 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  cardTitle: { fontSize: 14, lineHeight: 19, fontWeight: '800' },
  cardMeta: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  cardMetaStrong: { fontSize: 11, fontWeight: '800', marginTop: 8 },
  cardLink: { fontSize: 11, fontWeight: '900', marginTop: 10, textAlign: 'right' },
  priceSmall: { fontSize: 10, fontWeight: '900', marginTop: 8 },
  price: { fontSize: 12, fontWeight: '900', marginTop: 8 },
  chatRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  chatAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' },
  chatCopy: { flex: 1 },
  timestamp: { fontSize: 9, marginTop: 4 },
  chatPage: { flex: 1, paddingHorizontal: 20, paddingTop: 12, paddingBottom: 12 },
  messageList: { flexGrow: 1, justifyContent: 'flex-end', paddingVertical: 10 },
  messageLine: { width: '100%', marginBottom: 10, flexDirection: 'row' },
  messageIncoming: { justifyContent: 'flex-start' },
  messageOutgoing: { justifyContent: 'flex-end' },
  messageBubble: { maxWidth: '84%', borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  senderName: { fontSize: 9, fontWeight: '900', marginBottom: 3 },
  messageText: { fontSize: 13, lineHeight: 19 },
  messageTime: { fontSize: 9, marginTop: 4, textAlign: 'right' },
  composer: { minHeight: 54, maxHeight: 110, flexDirection: 'row', alignItems: 'center', borderWidth: 1, paddingHorizontal: 10, marginTop: 6 },
  composerInput: { flex: 1, minHeight: 42, maxHeight: 92, fontSize: 14, paddingVertical: 9 },
  sendButton: { minWidth: 58, height: 38, alignItems: 'center', justifyContent: 'center', marginLeft: 8, paddingHorizontal: 9 },
  sendLabel: { color: '#FFFFFF', fontSize: 11, fontWeight: '900' },
  memberRow: { minHeight: 50, borderBottomWidth: StyleSheet.hairlineWidth, flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 8 },
  memberAvatar: { width: 34, height: 34, borderRadius: 17, alignItems: 'center', justifyContent: 'center' },
  memberInitial: { fontSize: 13, fontWeight: '900' },
  spacedButton: { marginTop: 10 },
  twoColumns: { flexDirection: 'row', gap: 10 },
  suggestionScroll: { maxHeight: 320, marginTop: -8, marginBottom: 14 },
  venueSuggestions: { gap: 8, paddingBottom: 2 },
  venueSuggestion: { borderWidth: 1, padding: 12 },
  nextSlotRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  nextSlot: { flex: 1, paddingHorizontal: 10, paddingVertical: 8 },
  nextSlotLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6 },
  nextSlotTime: { fontSize: 11, fontWeight: '800', marginTop: 3 },
  moreTimes: { fontSize: 10, fontWeight: '800', paddingHorizontal: 3 },
  moreSlotList: { maxHeight: 160, marginTop: 8 },
  moreSlotContent: { gap: 6 },
  moreSlot: { borderWidth: 1, paddingHorizontal: 10, paddingVertical: 8 },
  moreSlotText: { fontSize: 10, fontWeight: '700' },
  selectedVenueCard: { borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 12, padding: 12, marginTop: -8, marginBottom: 14 },
  venueChatButton: { marginTop: -8, marginBottom: 14 },
  selectedVenueCopy: { flex: 1, minWidth: 0 },
  selectedVenueLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7, marginBottom: 4 },
  selectedTime: { fontSize: 10, fontWeight: '700', marginTop: 6 },
  changeVenue: { fontSize: 11, fontWeight: '900' },
  suggestionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  sportAvailability: { fontSize: 10, fontWeight: '800', marginTop: 8 },
  capacityHeader: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 9 },
  capacityField: { width: 112, marginBottom: 0 },
  costSummaryRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10, marginTop: 8 },
  finePrint: { fontSize: 10, lineHeight: 16, marginTop: 8 },
  error: { color: '#B83434', fontSize: 11, marginBottom: 10 },
  roomCostDivider: { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: '#E0E6ED', marginTop: 9 },
  memberPaymentCard: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  memberPaymentCopy: { flex: 1 },
  column: { flex: 1 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareIdentity: { flex: 1, gap: 6 },
  shareInput: { width: 122, marginBottom: 0 },
  shareAmount: { fontSize: 12, fontWeight: '900', paddingHorizontal: 3 },
  yourShareCard: { borderColor: '#1A8F57', borderWidth: 1 },
  shareEyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  yourShareAmount: { fontSize: 27, fontWeight: '900' },
  sharePayButton: { marginTop: 12 },
  shareTotal: { paddingVertical: 12 },
  rankCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  rankNumber: { width: 36, fontSize: 18, fontWeight: '900' },
  rankCopy: { flex: 1 },
  rankPoints: { fontSize: 16, fontWeight: '900' },
  pointsLabel: { fontSize: 9, fontWeight: '700' },
});
