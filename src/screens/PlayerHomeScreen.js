import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import VenueCard from '../components/VenueCard';
import { useTheme } from '../context/ThemeContext';
import { endSession } from '../services/authRepository';
import { sessionEnded } from '../store/authSlice';
import { filterAndSortVenues } from '../utils/venueDiscovery';
import { formatDateKey, formatPKR, formatTimeRange, getBookingDisplayStatus } from '../utils/booking';
import { selectBookingsForUser } from '../store/selectors/bookingSelectors';

const LAHORE = { latitude: 31.5204, longitude: 74.3587, label: 'Lahore' };
const SPORTS = ['All', 'Futsal', 'Football', 'Cricket', 'Padel', 'Badminton'];

export default function PlayerHomeScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const { venues, grounds, reviews } = useSelector(state => state.venues);
  const playerBookings = useSelector(state => selectBookingsForUser(state, currentUser?.id || ''));
  const [loggingOut, setLoggingOut] = useState(false);
  const featured = useMemo(() => filterAndSortVenues({ venues: venues.filter(item => item.published), grounds, reviews, origin: LAHORE }).slice(0, 5), [venues, grounds, reviews]);
  const upcomingBooking = useMemo(() => playerBookings
    .filter(booking => getBookingDisplayStatus(booking) === 'Confirmed')
    .sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`))[0] || null, [playerBookings]);
  const openSearch = sport => navigation.navigate('VenueSearch', { sport: sport || 'All' });
  const logout = async () => {
    setLoggingOut(true);
    try { await endSession(); dispatch(sessionEnded()); }
    finally { setLoggingOut(false); }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.topRow}>
          <View><Text style={[styles.brand, { color: colors.primary }]}>PlaySpot</Text><Text style={[styles.location, { color: colors.inkSoft }]}>⌖  Lahore · demo area</Text></View>
          <View style={[styles.avatar, { backgroundColor: colors.limePale, borderRadius: radius.pill }]}><Text style={[styles.avatarText, { color: colors.primary }]}>{currentUser?.name?.[0]?.toUpperCase() || 'P'}</Text></View>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Search sports venues" testID="player-home-search" onPress={() => openSearch('All')} style={[styles.search, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={{ color: colors.inkSoft, fontSize: 17 }}>⌕</Text><Text style={[styles.searchText, { color: colors.inkSoft }]}>Search sport, venue or area</Text><Text style={[styles.searchIcon, { color: colors.primary }]}>⚲</Text>
        </Pressable>

        <View style={[styles.hero, { backgroundColor: colors.navy, borderRadius: radius.lg }]}>
          <Text style={[styles.heroEyebrow, { color: colors.lime }]}>READY WHEN YOU ARE</Text>
          <Text style={styles.heroTitle}>Find your next{ '\n' }place to play.</Text>
          <Text style={styles.heroCopy}>Explore local demo venues around Lahore and plan a game with your crew.</Text>
          <AppButton title="Explore venues" testID="player-explore-venues" onPress={() => openSearch('All')} style={styles.heroButton} textStyle={{ color: colors.navy }} />
        </View>

        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.ink }]}>Play your sport</Text><Pressable onPress={() => openSearch('All')}><Text style={[styles.link, { color: colors.primary }]}>See all</Text></Pressable></View>
        <ChoiceChips options={SPORTS} selected="All" onSelect={value => openSearch(value)} testID="home-sport" />

        {upcomingBooking ? (
          <>
            <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.ink }]}>Upcoming booking</Text></View>
            <Pressable accessibilityRole="button" accessibilityLabel={`Open booking at ${upcomingBooking.venueName}`} testID="home-upcoming-booking" onPress={() => navigation.navigate('BookingDetails', { bookingId: upcomingBooking.id })} style={[styles.upcomingCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
              <Text style={[styles.upcomingTitle, { color: colors.ink }]}>{upcomingBooking.venueName}</Text>
              <Text style={[styles.upcomingCopy, { color: colors.inkSoft }]}>{upcomingBooking.groundName} · {formatDateKey(upcomingBooking.date)}</Text>
              <Text style={[styles.upcomingCopy, { color: colors.inkSoft }]}>{formatTimeRange(upcomingBooking.startTime, upcomingBooking.endTime)} · {formatPKR(upcomingBooking.totalPKR)}</Text>
              <Text style={[styles.link, { color: colors.primary, marginTop: 8 }]}>View booking →</Text>
            </Pressable>
          </>
        ) : null}

        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.ink }]}>Near Lahore</Text><Pressable accessibilityRole="button" onPress={() => navigation.navigate('VenueMap')}><Text style={[styles.link, { color: colors.primary }]}>Map view</Text></Pressable></View>
        <FlatList data={featured} horizontal showsHorizontalScrollIndicator={false} keyExtractor={item => item.id} renderItem={({ item }) => <VenueCard venue={item} compact onPress={() => navigation.navigate('VenueDetails', { venueId: item.id })} />} ListEmptyComponent={<Text style={[styles.empty, { color: colors.inkSoft }]}>No published demo venues yet.</Text>} />

        <View style={styles.sectionHead}><Text style={[styles.sectionTitle, { color: colors.ink }]}>More ways to play</Text></View>
        <View style={styles.shortcutRow}>
          <Shortcut title="Game rooms" copy="Find players nearby" icon="◉" colors={colors} radius={radius} testID="home-game-rooms" onPress={() => navigation.navigate('GameRooms')} />
          <Shortcut title="Tournaments" copy="Compete locally" icon="♜" colors={colors} radius={radius} testID="home-tournaments" onPress={() => navigation.navigate('Tournaments')} />
        </View>
        <View style={[styles.shortcutRow, styles.secondShortcutRow]}>
          <Shortcut title="My bookings" copy="View or cancel a slot" icon="▣" colors={colors} radius={radius} testID="home-my-bookings" onPress={() => navigation.navigate('MyBookings')} />
          <Shortcut title="Messages" copy="Local demo chat" icon="●" colors={colors} radius={radius} testID="home-chat" onPress={() => navigation.navigate('ChatInbox')} />
        </View>
        <Text style={[styles.disclaimer, { color: colors.inkSoft }]}>Venue details, locations and reviews are fictional local demo data.</Text>
        <AppButton title="Log out of demo account" testID="player-logout" variant="secondary" onPress={logout} loading={loggingOut} disabled={loggingOut} style={styles.logout} />
      </ScrollView>
    </SafeAreaView>
  );
}

function Shortcut({ title, copy, icon, colors, radius, onPress, testID }) {
  return <Pressable accessibilityRole="button" accessibilityLabel={title} testID={testID} onPress={onPress} style={({ pressed }) => [styles.shortcut, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, opacity: pressed ? 0.84 : 1 }]}><Text style={[styles.shortcutIcon, { color: colors.primary }]}>{icon}</Text><Text style={[styles.shortcutTitle, { color: colors.ink }]}>{title}</Text><Text style={[styles.shortcutCopy, { color: colors.inkSoft }]}>{copy}</Text><Text style={[styles.shortcutCta, { color: colors.primary }]}>Open →</Text></Pressable>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 20, paddingTop: 8, paddingBottom: 32 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 17 },
  brand: { fontSize: 25, fontWeight: '900', letterSpacing: -0.7 }, location: { fontSize: 11, marginTop: 2 },
  avatar: { width: 39, height: 39, alignItems: 'center', justifyContent: 'center' }, avatarText: { fontWeight: '900', fontSize: 16 },
  search: { height: 52, borderWidth: 1, paddingHorizontal: 14, flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 17 },
  searchText: { fontSize: 13, flex: 1 }, searchIcon: { fontSize: 18, fontWeight: '700' },
  hero: { padding: 20, marginBottom: 21 }, heroEyebrow: { fontSize: 9, letterSpacing: 1.5, fontWeight: '900' },
  heroTitle: { color: '#FFFFFF', fontSize: 27, lineHeight: 32, fontWeight: '900', marginTop: 7 }, heroCopy: { color: '#D8E0EA', fontSize: 12, lineHeight: 18, marginTop: 8, maxWidth: 275 },
  heroButton: { alignSelf: 'flex-start', marginTop: 14, minHeight: 42, backgroundColor: '#E6F5ED' },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 3, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '900' }, link: { fontSize: 12, fontWeight: '800' }, empty: { padding: 16 },
  shortcutRow: { flexDirection: 'row', gap: 10 }, secondShortcutRow: { marginTop: 10 }, shortcut: { flex: 1, minHeight: 142, borderWidth: 1, padding: 14 }, shortcutIcon: { fontSize: 20, marginBottom: 8 },
  shortcutTitle: { fontSize: 14, fontWeight: '800' }, shortcutCopy: { fontSize: 11, marginTop: 3 }, shortcutCta: { fontSize: 10, fontWeight: '800', marginTop: 12 },
  upcomingCard: { borderWidth: 1, padding: 14, marginBottom: 18 }, upcomingTitle: { fontSize: 14, fontWeight: '900' }, upcomingCopy: { fontSize: 11, marginTop: 4 },
  disclaimer: { textAlign: 'center', fontSize: 10, marginTop: 22 },
  logout: { marginTop: 14 },
});
