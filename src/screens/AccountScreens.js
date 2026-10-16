import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import { DesignCard, EmptyState, InlineNotice } from '../components/DesignPrimitives';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { endSession, updateAccountProfile } from '../services/authRepository';
import { profileUpdated, sessionEnded } from '../store/authSlice';
import { venueUpdated } from '../store/venueSlice';
import { selectBookingsForUser, selectBookingsForVendor } from '../store/selectors/bookingSelectors';
import { selectEquipmentByVenueId, selectGroundsByVenueId, selectVendorProfileById, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';
import { getVenueRating } from '../utils/venueDiscovery';

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
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Profile" subtitle="Your local PlaySpot demo account" />
    <DesignCard style={{ borderRadius: radius.lg }}>
      <View style={styles.row}><View style={[styles.avatar, { backgroundColor: colors.limePale }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{user?.name?.trim()?.[0]?.toUpperCase() || 'P'}</Text></View><View style={{ flex: 1 }}><Text style={[styles.name, { color: colors.ink }]}>{user?.name}</Text><Text style={[styles.copy, { color: colors.inkSoft }]}>{user?.email}</Text><Text style={[styles.copy, { color: colors.primary, marginTop: 3 }]}>{vendor ? 'Venue provider' : 'Player'} · local demo</Text></View></View>
      <View style={styles.metricRow}><View style={[styles.metric, { backgroundColor: colors.limePale }]}><Text style={[styles.metricValue, { color: colors.primaryDark }]}>{count}</Text><Text style={[styles.metricLabel, { color: colors.inkSoft }]}>{vendor ? 'LOCAL BOOKINGS' : 'MY BOOKINGS'}</Text></View><View style={[styles.metric, { backgroundColor: colors.limePale }]}><Text style={[styles.metricValue, { color: colors.primaryDark }]}>{vendor ? vendorVenues.length : (user?.preferredSports || []).length}</Text><Text style={[styles.metricLabel, { color: colors.inkSoft }]}>{vendor ? 'VENUES' : 'SPORTS'}</Text></View></View>
      {vendor && profile ? <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 12 }]}>{profile.businessName} · {profile.verificationStatus === 'demo-approved' ? 'demo approved' : 'pending demo'}</Text> : null}
    </DesignCard>
    <DesignCard>
      <ActionRow title="Edit profile" subtitle="Update your name and contact details" testID="profile-edit" onPress={() => navigation.navigate('EditProfile')} colors={colors} />
      {vendor ? <>
        <ActionRow title="Venue analytics" subtitle="Six seeded months plus current local activity" testID="profile-analytics" onPress={() => navigation.navigate('VendorAnalytics')} colors={colors} />
        <ActionRow title="Manage reviews" subtitle="Read feedback for your venues" testID="profile-reviews" onPress={() => navigation.navigate('VendorReviews')} colors={colors} />
        {vendorVenues[0] ? <ActionRow title="Inventory and grounds" subtitle="Edit equipment, prices and venue details" testID="profile-inventory" onPress={() => navigation.navigate('VendorInventory', { venueId: vendorVenues[0].id })} colors={colors} /> : null}
      </> : <>
        <ActionRow title="My bookings" subtitle="View reservations and local status" onPress={() => navigation.navigate('MyBookings')} colors={colors} />
        <ActionRow title="Game rooms" subtitle="Find a local demo match" onPress={() => navigation.navigate('GameRooms')} colors={colors} />
      </>}
      <ActionRow title="Notifications" subtitle="Booking, review and message updates" testID="profile-notifications" onPress={() => navigation.navigate('Notifications')} colors={colors} />
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
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const save = async () => {
    if (!name.trim() || phone.replace(/\D/g, '').length < 7 || (user?.role === 'vendor' && !businessName.trim())) {
      setError('Enter your name, a valid contact number, and your business name if you are a venue provider.');
      return;
    }
    setLoading(true); setError('');
    try {
      const result = await updateAccountProfile(user.id, { name: name.trim(), phone: phone.trim(), ...(user.role === 'vendor' ? { businessName: businessName.trim() } : {}) });
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
    <ScreenHeader title="Edit profile" subtitle="Changes are saved to this device" />
    <DesignCard>{field('Full name', name, setName, 'edit-profile-name')}{field('Phone number', phone, setPhone, 'edit-profile-phone', 'phone-pad')}{user?.role === 'vendor' ? field('Business name', businessName, setBusinessName, 'edit-profile-business') : null}</DesignCard>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <AppButton title="Save profile" testID="edit-profile-save" onPress={save} loading={loading} disabled={loading} />
  </ScrollView></SafeAreaView>;
}

function makeNotifications(user, bookings, reviews, conversations) {
  const items = [];
  bookings.slice(0, 8).forEach(booking => items.push({ id: `booking-${booking.id}`, title: booking.source === 'walk-in' ? 'Walk-in booking recorded' : 'Booking update', body: `${booking.venueName || 'Venue'} · ${booking.date} at ${booking.startTime}`, route: booking.id ? 'BookingDetails' : null, params: { bookingId: booking.id } }));
  if (user?.role === 'vendor') reviews.slice(0, 5).forEach(review => items.push({ id: `review-${review.id}`, title: `New ${review.stars}-star review`, body: `${review.playerName}: ${review.comment}`, route: 'VendorReviews' }));
  conversations.filter(conversation => conversation.participantIds?.includes(user?.id)).slice(0, 5).forEach(conversation => items.push({ id: `chat-${conversation.id}`, title: 'Local demo message', body: conversation.lastMessage || 'Open the conversation', route: 'ChatConversation', params: { conversationId: conversation.id } }));
  return items;
}

export function NotificationsScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const venueIds = new Set(venues.map(venue => venue.id));
  const bookings = useSelector(state => user?.role === 'vendor' ? selectBookingsForVendor(state, user?.id || '') : selectBookingsForUser(state, user?.id));
  const reviews = useSelector(state => state.venues.reviews.filter(review => venueIds.has(review.venueId)));
  const conversations = useSelector(state => state.community.conversations);
  const notifications = useMemo(() => makeNotifications(user, bookings, reviews, conversations), [user, bookings, reviews, conversations]);
  const [readIds, setReadIds] = useState([]);
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Notifications" subtitle="Generated from local demo records" />
    <InlineNotice>These updates are stored on this device. No push notifications are sent.</InlineNotice>
    {notifications.length ? notifications.map(item => <Pressable key={item.id} accessibilityRole="button" onPress={() => item.route && navigation.navigate(item.route, item.params)}><DesignCard style={{ opacity: readIds.includes(item.id) ? 0.62 : 1 }}><Text style={[styles.reviewTitle, { color: colors.ink }]}>{item.title}{readIds.includes(item.id) ? ' · read' : ' · new'}</Text><Text style={[styles.copy, { color: colors.inkSoft, marginTop: 5 }]}>{item.body}</Text><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '800', marginTop: 8 }}>Open related screen</Text></DesignCard></Pressable>) : <DesignCard><EmptyState title="You’re all caught up" description="Booking, review and chat updates will appear here when local records are available." /></DesignCard>}
    {notifications.length ? <AppButton title="Mark all as read" variant="secondary" testID="notifications-mark-read" onPress={() => setReadIds(notifications.map(item => item.id))} /> : null}
  </ScrollView></SafeAreaView>;
}

export function SettingsScreen() {
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
    <ScreenHeader title="Settings" subtitle="A few preferences for this demo" />
    <DesignCard><ActionRow title={`Appearance · ${mode === 'dark' ? 'Dark' : 'Light'}`} subtitle="Change the app colors for this session" testID="settings-theme-toggle" onPress={toggleMode} colors={colors} last /></DesignCard>
    <DesignCard><Text style={[styles.reviewTitle, { color: colors.ink }]}>About PlaySpot PK</Text><Text style={[styles.copy, { color: colors.inkSoft, marginTop: 7 }]}>A frontend-only sports venue discovery, booking and player matchmaking project.</Text><Text style={[styles.copy, { color: colors.inkSoft, marginTop: 8 }]}>Bookings, analytics, reviews and messages are local demonstrations. No payment, email, push notification or multi-device service is connected.</Text></DesignCard>
    {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    <AppButton title="Log out of demo account" testID="settings-logout" variant="secondary" onPress={logout} loading={loading} disabled={loading} />
  </ScrollView></SafeAreaView>;
}

export function VendorReviewsScreen() {
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const ids = new Set(venues.map(venue => venue.id));
  const reviews = useSelector(state => state.venues.reviews.filter(review => ids.has(review.venueId)));
  const summary = getVenueRating(reviews);
  const venueById = new Map(venues.map(venue => [venue.id, venue]));
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Venue reviews" subtitle="Feedback attached to your local venues" />
    <DesignCard><Text style={[styles.name, { color: colors.ink }]}>{summary.count ? `${summary.average.toFixed(1)} / 5` : 'No rating yet'}</Text><Text style={[styles.copy, { color: colors.inkSoft }]}>{summary.count} local demo reviews · averages update from saved reviews</Text></DesignCard>
    {reviews.length ? reviews.map(review => <DesignCard key={review.id}><View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 8 }}><Text style={[styles.reviewTitle, { color: colors.ink }]}>{review.playerName}</Text><Text style={styles.star}>{'★'.repeat(review.stars)}{'☆'.repeat(5 - review.stars)}</Text></View><Text style={[styles.copy, { color: colors.primary, marginTop: 4 }]}>{venueById.get(review.venueId)?.name || 'Your venue'}</Text><Text style={[styles.copy, { color: colors.ink, marginTop: 7 }]}>{review.comment}</Text></DesignCard>) : <DesignCard><EmptyState title="No reviews yet" description="Player feedback for your published venues will show here." /></DesignCard>}
  </ScrollView></SafeAreaView>;
}
