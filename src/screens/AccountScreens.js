import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import { DesignCard, EmptyState, InlineNotice } from '../components/DesignPrimitives';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { endSession, updateAccountProfile } from '../services/authRepository';
import { profileUpdated, sessionEnded } from '../store/authSlice';
import { notificationMarkedRead, notificationsMarkedRead } from '../store/communitySlice';
import { venueUpdated } from '../store/venueSlice';
import { selectBookingsForUser, selectBookingsForVendor } from '../store/selectors/bookingSelectors';
import { selectEquipmentByVenueId, selectGroundsByVenueId, selectVendorProfileById, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';
import { getVenueRating } from '../utils/venueDiscovery';
import { PLAYER_SPORTS } from '../constants/sports';

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 20, paddingBottom: 34 },
  heading: { fontSize: 23, fontWeight: '900', marginBottom: 5 }, copy: { fontSize: 12, lineHeight: 18 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 54, height: 54, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 22, fontWeight: '900' }, name: { fontSize: 17, fontWeight: '900' },
  label: { fontSize: 10, fontWeight: '900', letterSpacing: 0.7, marginTop: 14, marginBottom: 5 },
  input: { minHeight: 48, borderWidth: 1, borderRadius: 14, paddingHorizontal: 13, fontSize: 14 },
  action: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 49 },
  actionTitle: { fontSize: 13, fontWeight: '800' }, actionSub: { fontSize: 11, marginTop: 3 },
  separator: { borderBottomWidth: StyleSheet.hairlineWidth },
  metricRow: { flexDirection: 'row', gap: 8, marginTop: 14 },
  metric: { flex: 1, padding: 12, borderRadius: 14 }, metricValue: { fontSize: 18, fontWeight: '900' }, metricLabel: { fontSize: 9, marginTop: 3 },
  error: { fontSize: 12, marginBottom: 10 }, star: { color: '#F29429', fontSize: 15 },
  reviewTitle: { fontSize: 13, fontWeight: '800' },
});

function ActionRow({ title, subtitle, onPress, colors, last = false, testID }) {
  return <Pressable accessibilityRole="button" testID={testID} onPress={onPress} style={[styles.action, !last && { borderBottomWidth: StyleSheet.hairlineWidth, borderColor: colors.border }]}>
    <View style={{ flex: 1 }}><Text style={[styles.actionTitle, { color: colors.ink }]}>{title}</Text>{subtitle ? <Text style={[styles.actionSub, { color: colors.inkSoft }]}>{subtitle}</Text> : null}</View>
    <Text style={{ color: colors.primary, fontSize: 20, fontWeight: '700' }}>›</Text>
  </Pressable>;
}

export function ProfileScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const vendorVenues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const vendorBookings = useSelector(state => selectBookingsForVendor(state, user?.id || ''));
  const playerBookings = useSelector(state => selectBookingsForUser(state, user?.id));
  const vendor = user?.role === 'vendor';
  const count = vendor ? vendorBookings.length : playerBookings.length;
  const profile = useSelector(state => selectVendorProfileById(state, vendorVenues[0]?.vendorId));
  const vendorGrounds = useSelector(state => selectGroundsByVenueId(state, vendorVenues[0]?.id));
  const vendorEquipment = useSelector(state => selectEquipmentByVenueId(state, vendorVenues[0]?.id));
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Profile" subtitle="Your local PlaySpot demo account" onBack={() => navigation.goBack()} />
    <DesignCard style={{ borderRadius: radius.lg }}>
      <View style={styles.row}><View style={[styles.avatar, { backgroundColor: colors.limePale }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{user?.name?.trim()?.[0]?.toUpperCase() || 'P'}</Text></View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.ink }]}>{user?.name}</Text><Text style={[styles.copy, { color: colors.inkSoft }]}>{user?.email}</Text><Text style={[styles.copy, { color: colors.primary, marginTop: 3 }]}>{vendor ? 'Venue provider' : 'Player'} · local demo</Text></View></View>
      <View style={styles.metricRow}><View style={[styles.metric, { backgroundColor: colors.limePale }]}><Text style={[styles.metricValue, { color: colors.primaryDark }]}>{count}</Text><Text style={[styles.metricLabel, { color: colors.inkSoft }]}>{vendor ? 'LOCAL BOOKINGS' : 'MY BOOKINGS'}</Text></View><View style={[styles.metric, { backgroundColor: colors.limePale }]}><Text style={[styles.metricValue, { color: colors.primaryDark }]}>{vendor ? vendorVenues.length : (user?.preferredSports || []).length}</Text><Text style={[styles.metricLabel, { color: colors.inkSoft }]}>{vendor ? 'VENUES' : 'SPORTS'}</Text></View></View>
      {vendor && profile ? <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 12 }]}>{profile.businessName} · {profile.verificationStatus === 'demo-approved' ? 'demo approved' : 'pending demo'}</Text> : null}
    </DesignCard>
    {vendor && vendorVenues[0] ? <DesignCard testID="profile-vendor-venue">
      <Text style={[styles.label, { color: colors.primary }]}>LOCAL VENUE PROFILE</Text>
      <Text style={[styles.name, { color: colors.ink }]}>{vendorVenues[0].name}</Text>
      <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 4 }]}>{profile?.businessName || user?.businessName}</Text>
      <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 4 }]}>{vendorVenues[0].address} · {vendorVenues[0].city}</Text>
      <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 4 }]}>{vendorVenues[0].sports?.join(' · ') || 'No sports listed'}</Text>
      <Text style={[styles.copy, { color: colors.primary, marginTop: 8 }]}>{vendorGrounds.length} grounds · {vendorEquipment.length} add-ons · {vendorVenues[0].published ? 'Published locally' : 'Hidden locally'}</Text>
    </DesignCard> : null}
    <DesignCard>
      <ActionRow title="Edit profile" subtitle="Update your name and contact details" testID="profile-edit" onPress={() => navigation.navigate('EditProfile')} colors={colors} />
      {vendor ? <ActionRow title="Manage reviews" subtitle="Read feedback for your venues" testID="profile-reviews" onPress={() => navigation.navigate('VendorReviews')} colors={colors} /> : null}
      <ActionRow title="Settings" subtitle="Theme, about and demo session" testID="profile-settings" onPress={() => navigation.navigate('Settings')} colors={colors} last />
    </DesignCard>
  </ScrollView></SafeAreaView>;
}

export function EditProfileScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const venue = venues[0];
  const vendorProfile = useSelector(state => selectVendorProfileById(state, venue?.vendorId));
  const grounds = useSelector(state => selectGroundsByVenueId(state, venue?.id));
  const equipment = useSelector(state => selectEquipmentByVenueId(state, venue?.id));
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [businessName, setBusinessName] = useState(user?.businessName || vendorProfile?.businessName || '');
  const [preferredSports, setPreferredSports] = useState(() => Array.isArray(user?.preferredSports) ? [...user.preferredSports] : []);
  const [error, setError] = useState('');
  const [sportsError, setSportsError] = useState('');
  const [loading, setLoading] = useState(false);
  const togglePreferredSport = sport => {
    setPreferredSports(current => current.includes(sport)
      ? current.filter(item => item !== sport)
      : [...current, sport]);
    setSportsError('');
    setError('');
  };
  const save = async () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 7 || (user?.role === 'vendor' && !businessName.trim())) {
      setError('Enter your name, a valid contact number, and your business name if you are a venue provider.');
      return;
    }
    const cleanPreferredSports = [...new Set(preferredSports.filter(sport => PLAYER_SPORTS.includes(sport)))];
    if (user?.role === 'player' && cleanPreferredSports.length === 0) {
      setSportsError('Choose at least one sport you enjoy.');
      return;
    }
    setLoading(true); setError('');
    try {
      const result = await updateAccountProfile(user.id, {
        name: name.trim(),
        phone: phone.trim(),
        ...(user.role === 'vendor'
          ? { businessName: businessName.trim() }
          : { preferredSports: cleanPreferredSports }),
      });
      dispatch(profileUpdated({ accounts: result.accounts, user: result.account }));
      if (user.role === 'vendor' && venue && vendorProfile) {
        dispatch(venueUpdated({ venue, grounds, equipment, vendorProfile: { ...vendorProfile, businessName: businessName.trim(), contactPhone: phone.trim() } }));
      }
      navigation.goBack();
    } catch (saveError) { setError(saveError.message || 'Profile could not be saved on this device.'); }
    finally { setLoading(false); }
  };
  const field = (label, value, setter, id, keyboardType = 'default') => <><Text style={[styles.label, { color: colors.inkSoft }]}>{label}</Text><TextInput accessibilityLabel={label} testID={id} value={value} onChangeText={setter} keyboardType={keyboardType} style={[styles.input, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border }]} /></>;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <ScreenHeader title="Edit profile" subtitle="Changes are saved to this device" onBack={() => navigation.goBack()} />
    <DesignCard>{field('Full name', name, setName, 'edit-profile-name')}{field('Phone number', phone, setPhone, 'edit-profile-phone', 'phone-pad')}{user?.role === 'vendor' ? field('Business name', businessName, setBusinessName, 'edit-profile-business') : null}{user?.role === 'player' ? <ChoiceChips label="Sports you enjoy" options={PLAYER_SPORTS} selected={preferredSports} onSelect={togglePreferredSport} multiple testID="edit-profile-sports" error={sportsError} /> : null}</DesignCard>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <AppButton title="Save profile" testID="edit-profile-save" onPress={save} loading={loading} disabled={loading} />
  </ScrollView></SafeAreaView>;
}

function makeNotifications(user, bookings, reviews, conversations, roomNotifications, rooms) {
  const items = [];
  bookings.slice(0, 8).forEach(booking => items.push({ id: `booking-${booking.id}`, title: booking.source === 'walk-in' ? 'Walk-in booking recorded' : 'Booking update', body: `${booking.venueName || 'Venue'} · ${booking.date} at ${booking.startTime}`, route: booking.id ? 'BookingDetails' : null, params: { bookingId: booking.id } }));
  if (user?.role === 'vendor') reviews.slice(0, 5).forEach(review => items.push({ id: `review-${review.id}`, title: `New ${review.stars}-star review`, body: `${review.playerName}: ${review.comment}`, route: 'VendorReviews' }));
  conversations.filter(conversation => conversation.participantIds?.includes(user?.id) && conversation.kind !== 'game-room').slice(0, 5).forEach(conversation => items.push({ id: `chat-${conversation.id}`, title: 'Local demo message', body: conversation.lastMessage || 'Open the conversation', route: 'ChatConversation', params: { conversationId: conversation.id } }));
  roomNotifications.filter(item => item.recipientId === user?.id).forEach(item => {
    const room = rooms.find(candidate => candidate.id === item.roomId);
    items.unshift({
      ...item,
      persisted: true,
      title: room ? `New message in ${room.title}` : `New message about ${item.venueName || 'your venue'}`,
      route: 'ChatConversation',
      params: { conversationId: item.conversationId },
    });
  });
  return items;
}

export function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const venueIds = new Set(venues.map(venue => venue.id));
  const bookings = useSelector(state => user?.role === 'vendor' ? selectBookingsForVendor(state, user?.id || '') : selectBookingsForUser(state, user?.id));
  const allReviews = useSelector(state => state.venues.reviews);
  const reviews = useMemo(() => allReviews.filter(review => venueIds.has(review.venueId)), [allReviews, venues]);
  const conversations = useSelector(state => state.community.conversations);
  const roomNotifications = useSelector(state => state.community.notifications || []);
  const rooms = useSelector(state => state.community.rooms);
  const dispatch = useDispatch();
  const notifications = useMemo(() => makeNotifications(user, bookings, reviews, conversations, roomNotifications, rooms), [user, bookings, reviews, conversations, roomNotifications, rooms]);
  const [readIds, setReadIds] = useState([]);
  const openNotification = item => {
    if (item.persisted) dispatch(notificationMarkedRead({ notificationId: item.id, userId: user.id }));
    else setReadIds(current => current.includes(item.id) ? current : [...current, item.id]);
    if (item.route) navigation.navigate(item.route, item.params);
  };
  const markAllRead = () => {
    dispatch(notificationsMarkedRead({ userId: user?.id }));
    setReadIds(notifications.map(item => item.id));
  };
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Notifications" subtitle="Generated from local demo records" onBack={() => navigation.goBack()} />
    <InlineNotice>These updates are stored on this device. No push notifications are sent.</InlineNotice>
    {notifications.length ? notifications.map(item => {
      const isRead = item.persisted ? Boolean(item.readAt) : readIds.includes(item.id);
      return <Pressable key={item.id} accessibilityRole="button" testID={`notification-item-${item.id}`} onPress={() => openNotification(item)}><DesignCard style={{ opacity: isRead ? 0.62 : 1 }}><Text style={[styles.reviewTitle, { color: colors.ink }]}>{item.title}{isRead ? ' · read' : ' · new'}</Text><Text style={[styles.copy, { color: colors.inkSoft, marginTop: 5 }]}>{item.body}</Text><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 8 }}>Open related screen</Text></DesignCard></Pressable>;
    }) : <DesignCard><EmptyState title="You’re all caught up" description="Booking, review and chat updates will appear here when local records are available." /></DesignCard>}
    {notifications.length ? <AppButton title="Mark all as read" variant="secondary" testID="notifications-mark-read" onPress={markAllRead} /> : null}
  </ScrollView></SafeAreaView>;
}

export function SettingsScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, mode, toggleMode } = useTheme();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const logout = async () => {
    setLoading(true); setError('');
    try { await endSession(); dispatch(sessionEnded()); }
    catch (logoutError) { setError(logoutError.message || 'Could not clear the local demo session.'); }
    finally { setLoading(false); }
  };
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Settings" subtitle="A few preferences for this demo" onBack={() => navigation.goBack()} />
    <DesignCard><ActionRow title={`Appearance · ${mode === 'dark' ? 'Dark' : 'Light'}`} subtitle="Change the app colors for this session" testID="settings-theme-toggle" onPress={toggleMode} colors={colors} last /></DesignCard>
    <DesignCard><Text style={[styles.reviewTitle, { color: colors.ink }]}>About PlaySpot PK</Text><Text style={[styles.copy, { color: colors.inkSoft, marginTop: 7 }]}>A frontend-only sports venue discovery, booking and player matchmaking project.</Text><Text style={[styles.copy, { color: colors.inkSoft, marginTop: 8 }]}>Simulated room payments only update local demo status. No money moves, and there is no email, push notification or multi-device service.</Text></DesignCard>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <AppButton title="Log out of demo account" testID="settings-logout" variant="secondary" onPress={logout} loading={loading} disabled={loading} />
  </ScrollView></SafeAreaView>;
}

export function VendorReviewsScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const ids = new Set(venues.map(venue => venue.id));
  const reviews = useSelector(state => state.venues.reviews.filter(review => ids.has(review.venueId)));
  const summary = getVenueRating(reviews);
  const venueById = new Map(venues.map(venue => [venue.id, venue]));
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Venue reviews" subtitle="Feedback attached to your local venues" onBack={() => navigation.goBack()} />
    <DesignCard><Text style={[styles.name, { color: colors.ink }]}>{summary.count ? `${summary.average.toFixed(1)} / 5` : 'No rating yet'}</Text><Text style={[styles.copy, { color: colors.inkSoft }]}>{summary.count} local demo reviews · averages update from saved reviews</Text></DesignCard>
    {reviews.length ? reviews.map(review => <DesignCard key={review.id}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={[styles.reviewTitle, { color: colors.ink }]}>{review.playerName}</Text><Text style={styles.star}>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</Text></View><Text style={[styles.copy, { color: colors.primary, marginTop: 4 }]}>{venueById.get(review.venueId)?.name || 'Your venue'}</Text><Text style={[styles.copy, { color: colors.ink, marginTop: 7 }]}>{review.comment}</Text></DesignCard>) : <DesignCard><EmptyState title="No reviews yet" description="Player feedback for your published venues will show here." /></DesignCard>}
  </ScrollView></SafeAreaView>;
}
