import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
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
import { createCommunityId, conversationCreated, conversationRead, gameRoomCreated, gameRoomMemberRemoved, joinGameRoom, messageSent, splitSaved, splitShareStatusChanged, tournamentCreated, tournamentParticipantRemoved, joinTournament } from '../store/communitySlice';
import { selectBookingById } from '../store/selectors/bookingSelectors';
import { formatDateKey, formatPKR, getNextBookableDates, toLocalDateKey } from '../utils/booking';
import {
  calculateEqualShares,
  formatCommunityDate,
  formatCommunityTime,
  getRoomOpenSpots,
  matchesRoomFilters,
  validateGameRoomDraft,
  validateSplitShares,
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
            <FormField label="Search area or game" value={query} onChangeText={setQuery} placeholder="Try Gulberg or futsal" testID="rooms-search" />
            <SectionHeading title={`${filtered.length} game${filtered.length === 1 ? '' : 's'}`} />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No games match those filters" description="Adjust your filters or create a game room for your group." action={<AppButton title="Create a game room" testID="rooms-empty-create" onPress={() => navigation.navigate('CreateGameRoom')} />} />}
        renderItem={renderRoom}
      />
    </SafeAreaView>
  );
}

export function CreateGameRoomScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const [title, setTitle] = useState('');
  const [sport, setSport] = useState('Futsal');
  const [location, setLocation] = useState('');
  const [date, setDate] = useState(getNextBookableDates()[1]?.dateKey || toLocalDateKey());
  const [startTime, setStartTime] = useState('19:00');
  const [visibility, setVisibility] = useState('public');
  const [capacity, setCapacity] = useState('8');
  const [cost, setCost] = useState('900');
  const [joinCode, setJoinCode] = useState('');
  const [errors, setErrors] = useState({});

  const create = () => {
    const values = { title, sport, location, date, startTime, visibility, capacity, costPerParticipantPKR: cost, joinCode };
    const validation = validateGameRoomDraft(values);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    const room = {
      id: createCommunityId('room'),
      title: title.trim(),
      sport,
      location: location.trim(),
      date,
      startTime,
      visibility,
      joinCode: visibility === 'private' ? joinCode.trim() : '',
      capacity: Number(capacity),
      costPerParticipantPKR: Number(cost),
      status: 'open',
      createdBy: currentUser.id,
      createdByName: currentUser.name,
      members: [{ userId: currentUser.id, name: currentUser.name, joinedAt: new Date().toISOString() }],
      createdAt: new Date().toISOString(),
    };
    dispatch(gameRoomCreated(room));
    navigation.replace('GameRoomDetails', { roomId: room.id });
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Create a game" subtitle="Choose a sport, location and player limit." onBack={() => navigation.goBack()} eyebrow="NEW ROOM" />
        <FormField label="Game name" value={title} onChangeText={setTitle} error={errors.title} placeholder="Friday night futsal" testID="room-title" />
        <ChoiceChips label="Sport" options={SPORTS} selected={sport} onSelect={setSport} testID="room-sport" />
        <FormField label="Venue or meeting location" value={location} onChangeText={setLocation} error={errors.location} placeholder="Area or venue name" testID="room-location" />
        <View style={styles.twoColumns}>
          <FormField label="Date (YYYY-MM-DD)" value={date} onChangeText={setDate} error={errors.date} placeholder="YYYY-MM-DD" testID="room-date" style={styles.column} />
          <FormField label="Start time (HH:MM)" value={startTime} onChangeText={setStartTime} placeholder="19:00" testID="room-start-time" style={styles.column} />
        </View>
        <ChoiceChips label="Visibility" options={['public', 'private']} selected={visibility} onSelect={setVisibility} testID="room-visibility" />
        {visibility === 'private' ? <FormField label="Private join code" value={joinCode} onChangeText={setJoinCode} error={errors.joinCode} autoCapitalize="characters" placeholder="At least 4 characters" testID="room-join-code" /> : null}
        <View style={styles.twoColumns}>
          <FormField label="Player capacity" value={capacity} onChangeText={setCapacity} error={errors.capacity} keyboardType="number-pad" testID="room-capacity" style={styles.column} />
          <FormField label="Cost / player (PKR)" value={cost} onChangeText={setCost} error={errors.costPerParticipantPKR} keyboardType="number-pad" testID="room-cost" style={styles.column} />
        </View>
        <InlineNotice>Room costs are demo estimates. This app does not collect or split money.</InlineNotice>
        <AppButton title="Create game room" testID="room-submit" onPress={create} />
      </ScrollView>
    </SafeAreaView>
  );
}

export function GameRoomDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const room = useSelector(state => state.community.rooms.find(item => item.id === route.params?.roomId));
  const [joinCode, setJoinCode] = useState('');
  const [error, setError] = useState('');
  const member = room?.members.find(item => item.userId === currentUser?.id);
  const openSpots = useMemo(() => getRoomOpenSpots(room), [room]);

  const join = () => {
    setError('');
    const result = dispatch(joinGameRoom({ roomId: room?.id, user: currentUser, joinCode }));
    if (!result.ok) setError(result.error);
    else setJoinCode('');
  };
  const leave = () => dispatch(gameRoomMemberRemoved({ roomId: room.id, userId: currentUser.id }));

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
          <Text style={[styles.price, { color: colors.primary }]}>{formatPKR(room.costPerParticipantPKR)} per player · demo estimate</Text>
        </DesignCard>
        <SectionHeading title="Players" />
        {room.members.map((item, index) => (
          <View key={item.userId} style={[styles.memberRow, { borderColor: colors.border }]}>
            <View style={[styles.memberAvatar, { backgroundColor: colors.limePale }]}><Text style={[styles.memberInitial, { color: colors.primary }]}>{item.name?.[0]?.toUpperCase() || String(index + 1)}</Text></View>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>{item.name}{item.userId === room.createdBy ? ' · Organizer' : ''}</Text>
          </View>
        ))}
        {member ? (
          <AppButton title="Leave game room" variant="secondary" testID="room-leave" onPress={leave} />
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
        {room.visibility === 'private' && room.createdBy === currentUser?.id ? <InlineNotice>Share this private code with invited players: {room.joinCode}</InlineNotice> : null}
        {error ? <InlineNotice tone="danger" testID="room-join-error">{error}</InlineNotice> : null}
        <AppButton title="Open local chat" variant="secondary" testID="room-chat" onPress={() => navigation.navigate('ChatInbox')} style={styles.spacedButton} />
        <AppButton title="Split payment calculator" variant="quiet" testID="room-split" onPress={() => navigation.navigate('SplitPayment', { roomId: room.id, totalPKR: room.costPerParticipantPKR * room.members.length })} style={styles.spacedButton} />
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
    .sort((first, second) => String(second.lastAt).localeCompare(String(first.lastAt))), [conversationRows]);

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
            <ScreenHeader title="Messages" subtitle="Local demo chat · messages do not sync across devices." eyebrow="INBOX" onBack={() => navigation.goBack()} />
            <LocalDemoNote />
            <AppButton title="Start a demo chat" testID="chat-new" onPress={startConversation} style={styles.listAction} />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No conversations yet" description="Start a local demo chat to see the conversation screen." action={<AppButton title="Start a demo chat" testID="chat-empty-new" onPress={startConversation} />} />}
        renderItem={({ item }) => {
          const unread = Number(item.unreadByUser?.[currentUser?.id] || 0);
          return (
            <Pressable accessibilityRole="button" accessibilityLabel={`Open chat with ${item.title}`} testID={`chat-item-${item.id}`} onPress={() => navigation.navigate('ChatConversation', { conversationId: item.id })}>
              <DesignCard style={styles.chatRow}>
                <View style={[styles.chatAvatar, { backgroundColor: colors.limePale }]}><Text style={[styles.memberInitial, { color: colors.primary }]}>{item.title?.[0]?.toUpperCase() || 'P'}</Text></View>
                <View style={styles.chatCopy}>
                  <View style={styles.rowBetween}><Text numberOfLines={1} style={[styles.cardTitle, styles.flex, { color: colors.ink }]}>{item.title}</Text>{unread > 0 ? <StatusBadge label={`${unread} new`} tone="success" /> : null}</View>
                  <Text numberOfLines={1} style={[styles.cardMeta, { color: colors.inkSoft }]}>{item.lastMessage}</Text>
                  <Text style={[styles.timestamp, { color: colors.muted }]}>{item.subtitle} · {formatTimestamp(item.lastAt)}</Text>
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
  const messageRows = useSelector(state => state.community.messages);
  const messages = useMemo(() => messageRows.filter(item => item.conversationId === route.params?.conversationId)
    .sort((first, second) => String(first.createdAt).localeCompare(String(second.createdAt))), [messageRows, route.params?.conversationId]);
  const [draft, setDraft] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    if (conversation && currentUser?.id) {
      dispatch(conversationRead({ conversationId: conversation.id, userId: currentUser.id }));
    }
  }, [conversation?.id, currentUser?.id, dispatch]);

  const send = () => {
    const body = draft.trim();
    if (!body || !conversation) return;
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
          <ScreenHeader title={conversation?.title || 'Conversation'} subtitle="Local demo chat · not real-time" eyebrow="MESSAGES" onBack={() => navigation.goBack()} />
          <LocalDemoNote />
          {conversation ? (
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
          ) : <EmptyState title="Conversation not found" description="Return to the inbox and open a saved conversation." />}
          <View style={[styles.composer, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
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
          </View>
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
  const booking = useSelector(state => selectBookingById(state, route.params?.bookingId));
  const room = useSelector(state => state.community.rooms.find(item => item.id === route.params?.roomId));
  const savedSplit = useSelector(state => state.community.splits.find(item =>
    (route.params?.splitId && item.id === route.params.splitId) ||
    (route.params?.bookingId && item.bookingId === route.params.bookingId) ||
    (route.params?.roomId && item.roomId === route.params.roomId),
  ));
  const participants = useMemo(() => {
    if (room?.members?.length) return room.members.map(member => ({ userId: member.userId, name: member.name }));
    return [
      { userId: currentUser?.id, name: currentUser?.name || 'You' },
      { userId: 'demo-share-hasham', name: 'Hasham' },
      { userId: 'demo-share-mustansar', name: 'Mustansar' },
      { userId: 'demo-share-player', name: 'Player 4' },
    ];
  }, [room?.id, room?.members, currentUser?.id, currentUser?.name]);
  const initialTotal = booking?.totalPKR || route.params?.totalPKR || 3500;
  const [totalText, setTotalText] = useState(String(savedSplit?.totalPKR ?? initialTotal));
  const [shares, setShares] = useState(() => savedSplit?.shares || calculateEqualShares(initialTotal, participants));
  const [message, setMessage] = useState('');
  const totalPKR = Number(totalText);
  const validation = useMemo(() => validateSplitShares(totalPKR, shares), [totalPKR, shares]);
  const shareSum = useMemo(() => shares.reduce((sum, share) => sum + (Number(share.amountPKR) || 0), 0), [shares]);
  const myShare = shares.find(share => share.userId === currentUser?.id);

  const recalculate = nextTotalText => {
    const cleaned = String(nextTotalText).replace(/[^\d]/g, '');
    setTotalText(cleaned);
    if (cleaned && shares.length) {
      setShares(current => calculateEqualShares(Number(cleaned), current));
    }
    setMessage('');
  };
  const updateShare = (userId, value) => {
    const cleaned = String(value).replace(/[^\d]/g, '');
    setShares(current => current.map(share => share.userId === userId ? { ...share, amountPKR: cleaned } : share));
    setMessage('');
  };
  const save = () => {
    if (!validation.valid) {
      setMessage(validation.message);
      return;
    }
    const split = {
      id: savedSplit?.id || createCommunityId('split'),
      bookingId: booking?.id || null,
      roomId: room?.id || null,
      totalPKR,
      shares: shares.map(share => ({ ...share, amountPKR: Number(share.amountPKR) })),
      createdAt: savedSplit?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    dispatch(splitSaved(split));
    setMessage('Split saved locally. No payment was transferred.');
  };
  const updateMyStatus = () => {
    if (!savedSplit || !myShare) return;
    const status = myShare.status === 'paid' ? 'unpaid' : 'paid';
    dispatch(splitShareStatusChanged({ splitId: savedSplit.id, userId: myShare.userId, status }));
    setShares(current => current.map(share => share.userId === myShare.userId ? { ...share, status } : share));
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled">
        <ScreenHeader title="Split payment" subtitle="Set demo shares for your group. This calculator does not move money." eyebrow="GROUP COSTS" onBack={() => navigation.goBack()} />
        <InlineNotice>Simulated split — no payments are transferred.</InlineNotice>
        {booking ? (
          <DesignCard><Text style={[styles.cardTitle, { color: colors.ink }]}>{booking.venueName}</Text><Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{booking.groundName} · {formatDateKey(booking.date)}</Text></DesignCard>
        ) : room ? (
          <DesignCard><Text style={[styles.cardTitle, { color: colors.ink }]}>{room.title}</Text><Text style={[styles.cardMeta, { color: colors.inkSoft }]}>{room.members.length} current players · demo estimate</Text></DesignCard>
        ) : null}
        <FormField label="Total to divide (PKR)" value={totalText} onChangeText={recalculate} keyboardType="number-pad" testID="split-total" />
        <SectionHeading title="Participants and shares" />
        {shares.map(share => (
          <DesignCard key={share.userId} style={styles.shareRow}>
            <View style={styles.shareIdentity}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>{share.name}{share.userId === currentUser?.id ? ' · You' : ''}</Text>
              <StatusBadge label={share.status || 'unpaid'} tone={share.status === 'paid' ? 'success' : 'warning'} />
            </View>
            <FormField label="Share (PKR)" value={String(share.amountPKR)} onChangeText={value => updateShare(share.userId, value)} keyboardType="number-pad" testID={`split-share-${share.userId}`} style={styles.shareInput} />
          </DesignCard>
        ))}
        <View style={[styles.rowBetween, styles.shareTotal]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Shares total</Text>
          <Text style={[styles.price, { color: shareSum === totalPKR ? colors.primary : colors.error }]}>{formatPKR(shareSum)} / {formatPKR(totalPKR)}</Text>
        </View>
        <AppButton title="Divide equally" variant="secondary" testID="split-equal" onPress={() => { setShares(current => calculateEqualShares(Number(totalText), current)); setMessage(''); }} disabled={!Number.isInteger(totalPKR) || totalPKR < 0} />
        {!validation.valid ? <InlineNotice tone="danger">{validation.message}</InlineNotice> : null}
        <AppButton title="Save split plan" testID="split-save" onPress={save} disabled={!validation.valid} style={styles.spacedButton} />
        {savedSplit && myShare ? <AppButton title={myShare.status === 'paid' ? 'Mark my share unpaid (demo)' : 'Mark my share paid (demo)'} variant="secondary" testID="split-toggle-status" onPress={updateMyStatus} style={styles.spacedButton} /> : null}
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
  column: { flex: 1 },
  shareRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  shareIdentity: { flex: 1, gap: 6 },
  shareInput: { width: 122, marginBottom: 0 },
  shareTotal: { paddingVertical: 12 },
  rankCard: { flexDirection: 'row', alignItems: 'center', gap: 13 },
  rankNumber: { width: 36, fontSize: 18, fontWeight: '900' },
  rankCopy: { flex: 1 },
  rankPoints: { fontSize: 16, fontWeight: '900' },
  pointsLabel: { fontSize: 9, fontWeight: '700' },
});
