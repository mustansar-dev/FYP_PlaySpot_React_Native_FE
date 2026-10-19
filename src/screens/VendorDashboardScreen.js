import React, { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import DesignCard from '../components/DesignPrimitives';
import PlayerProfileDrawer from '../components/PlayerProfileDrawer';
import VenueArtwork from '../components/VenueArtwork';
import VenuePhotoSlider from '../components/VenuePhotoSlider';
import { useTheme } from '../context/ThemeContext';
import { selectBookingsForVendor } from '../store/selectors/bookingSelectors';
import { selectVenuesByOwnerId } from '../store/selectors/venueSelectors';
import { buildVendorAnalytics } from '../utils/vendorAnalytics';

export default function VendorDashboardScreen({ navigation }) {
  const { currentUser, storageNotice } = useSelector(state => state.auth);
  const { colors, radius } = useTheme();
  const [profileDrawerVisible, setProfileDrawerVisible] = useState(false);
  const venues = useSelector(state => selectVenuesByOwnerId(state, currentUser?.id || ''));
  const allGrounds = useSelector(state => state.venues.grounds);
  const allSlots = useSelector(state => state.venues.slots);
  const venueIds = useMemo(() => venues.map(venue => venue.id), [venues]);
  const grounds = useMemo(() => allGrounds.filter(ground => venueIds.includes(ground.venueId)), [allGrounds, venueIds]);
  const groundIds = useMemo(() => grounds.map(ground => ground.id), [grounds]);
  const slots = useMemo(() => allSlots.filter(slot => groundIds.includes(slot.groundId)), [allSlots, groundIds]);
  const bookings = useSelector(state => selectBookingsForVendor(state, currentUser?.id || ''));
  const analytics = useMemo(() => buildVendorAnalytics({ bookings, grounds, slots }), [bookings, grounds, slots]);
  const currentMonth = analytics[analytics.length - 1];
  const closeProfileDrawer = () => setProfileDrawerVisible(false);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
            <Text style={[styles.brandBall, { color: colors.primary }]}>●</Text>
          </View>
          <View style={styles.brandCopy}>
            <Text style={[styles.brand, { color: colors.ink }]}>PlaySpot <Text style={{ color: colors.primary }}>PK</Text></Text>
            <Text style={[styles.brandMeta, { color: colors.inkSoft }]}>VENUE PROVIDER</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile drawer"
            testID="vendor-open-profile"
            onPress={() => setProfileDrawerVisible(true)}
            style={[styles.avatar, { backgroundColor: colors.limePale, borderRadius: radius.pill }]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>{currentUser?.name?.[0]?.toUpperCase() || 'V'}</Text>
          </Pressable>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.primary, borderRadius: radius.lg }]}>
          <Text style={[styles.eyebrow, { color: colors.lime }]}>VENDOR DASHBOARD</Text>
          <Text style={styles.title}>Welcome, {currentUser?.name || 'Provider'}.</Text>
          <Text style={styles.subtitle}>Your local venue activity at a glance.</Text>
        </View>

        {venues[0] ? <View style={[styles.venueMediaCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Venue photos and videos</Text>
          {venues[0].photoUris?.length || venues[0].videoUri ? <VenuePhotoSlider
            photos={venues[0].photoUris || []}
            videos={venues[0].videoUri ? [venues[0].videoUri] : []}
            venueName="Your venue"
            radius={radius.md}
            autoPlayIntervalMs={5000}
          /> : <VenueArtwork sport={venues[0].sports?.[0]} />}
        </View> : null}

        {storageNotice ? <View style={[styles.notice, { backgroundColor: colors.limePale, borderRadius: radius.md }]}><Text style={[styles.noticeText, { color: colors.ink }]}>{storageNotice}</Text></View> : null}
        {venues.length === 0 ? <View style={[styles.notice, { backgroundColor: colors.limePale, borderRadius: radius.md }]}><Text style={[styles.noticeText, { color: colors.ink }]}>No venue is connected to this local account yet. Use the Venue tab to review your setup.</Text></View> : null}

        <View style={[styles.snapshotCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <View style={styles.snapshotHeading}>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>Business snapshot</Text>
              <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Current local demo records</Text>
            </View>
            <Text style={[styles.period, { color: colors.primary }]}>THIS MONTH</Text>
          </View>
          <View style={styles.metricsRow}>
            <Metric label="BOOKINGS" value={currentMonth.bookings} colors={colors} />
            <Metric label="BOOKED VALUE" value={`Rs. ${currentMonth.revenuePKR.toLocaleString()}`} colors={colors} />
            <Metric label="OCCUPANCY" value={`${currentMonth.occupancyPercent}%`} colors={colors} />
          </View>
          <View style={styles.actionRow}>
            <AppButton title="Analytics" testID="vendor-open-analytics" variant="secondary" onPress={() => navigation.navigate('VendorAnalytics')} style={styles.halfButton} />
            <AppButton title="Reviews" testID="vendor-open-reviews" variant="secondary" onPress={() => navigation.navigate('VendorReviews')} style={styles.halfButton} />
          </View>
        </View>

        <View style={[styles.communityCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>Grow your sports community</Text>
          <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Create a local tournament and follow seeded demo rankings.</Text>
          <View style={styles.actionRow}>
            <AppButton title="Tournaments" testID="vendor-open-tournaments" onPress={() => navigation.navigate('Tournaments')} style={styles.halfButton} />
            <AppButton title="Leaderboard" testID="vendor-open-leaderboard" variant="secondary" onPress={() => navigation.navigate('Leaderboard')} style={styles.halfButton} />
          </View>
        </View>

        <Text style={[styles.footer, { color: colors.inkSoft }]}>Frontend demo · activity and venue records stay on this device.</Text>
      </ScrollView>
      <PlayerProfileDrawer
        visible={profileDrawerVisible}
        onClose={closeProfileDrawer}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

function Metric({ label, value, colors }) {
  return <View style={[styles.metric, { backgroundColor: colors.limePale, borderRadius: 14 }]}>
    <Text numberOfLines={1} adjustsFontSizeToFit style={[styles.metricValue, { color: colors.primaryDark }]}>{value}</Text>
    <Text style={[styles.metricLabel, { color: colors.inkSoft }]}>{label}</Text>
  </View>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingTop: 10, paddingBottom: 28, gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 2 },
  brandMark: { width: 38, height: 38, alignItems: 'center', justifyContent: 'center' },
  brandBall: { fontSize: 18, fontWeight: '900' },
  brandCopy: { flex: 1 },
  brand: { fontSize: 21, fontWeight: '900', letterSpacing: -0.6 },
  brandMeta: { fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 2 },
  avatar: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' },
  avatarText: { fontSize: 16, fontWeight: '900' },
  hero: { minHeight: 135, justifyContent: 'center', padding: 20 },
  venueMediaCard: { borderWidth: 1, padding: 12 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.1 },
  title: { color: '#FFFFFF', fontSize: 22, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#E7F6ED', fontSize: 11, marginTop: 5 },
  notice: { padding: 12 },
  noticeText: { fontSize: 11, lineHeight: 17 },
  snapshotCard: { borderWidth: 1, padding: 14 },
  snapshotHeading: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  cardTitle: { fontSize: 15, fontWeight: '900' },
  cardMeta: { fontSize: 10, lineHeight: 16, marginTop: 4 },
  period: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  metricsRow: { flexDirection: 'row', gap: 7, marginTop: 14 },
  metric: { flex: 1, minHeight: 67, padding: 9, justifyContent: 'center' },
  metricValue: { fontSize: 15, fontWeight: '900' },
  metricLabel: { fontSize: 7, fontWeight: '800', marginTop: 4 },
  actionRow: { flexDirection: 'row', gap: 9, marginTop: 14 },
  halfButton: { flex: 1 },
  communityCard: { borderWidth: 1, padding: 15 },
  footer: { fontSize: 9, lineHeight: 15, textAlign: 'center', marginTop: 2 },
});
