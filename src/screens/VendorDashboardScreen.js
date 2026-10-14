import React, { useState } from 'react';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import VenueArtwork from '../components/VenueArtwork';
import VenuePhotoSlider from '../components/VenuePhotoSlider';
import { useTheme } from '../context/ThemeContext';
import { endSession } from '../services/authRepository';
import { sessionEnded } from '../store/authSlice';
import { selectEquipmentByVenueId, selectGroundsByVenueId, selectVendorProfileById, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';

export default function VendorDashboardScreen({ navigation }) {
  const dispatch = useDispatch();
  const { currentUser, storageNotice } = useSelector(state => state.auth);
  const { colors, radius } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const venues = useSelector(state => selectVenuesByOwnerId(state, currentUser?.id || ''));
  const venue = venues[0] || null;
  const grounds = useSelector(state => selectGroundsByVenueId(state, venue?.id));
  const equipment = useSelector(state => selectEquipmentByVenueId(state, venue?.id));
  const vendorProfile = useSelector(state => selectVendorProfileById(state, venue?.vendorId));
  const venueStorageNotice = useSelector(state => state.venues.storageNotice);

  const logout = async () => {
    setLoading(true);
    setError('');
    try {
      await endSession();
      dispatch(sessionEnded());
    } catch (requestError) {
      setError(requestError.message || 'Could not clear the local demo session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
            <Text style={[styles.brandBall, { color: colors.primary }]}>●</Text>
          </View>
          <Text style={[styles.brand, { color: colors.ink }]}>PlaySpot <Text style={{ color: colors.primary }}>PK</Text></Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.limePale, borderRadius: radius.pill }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primaryDark }]}>VENUE PROVIDER</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.navy, borderRadius: radius.lg }]}>
          <Text style={[styles.eyebrow, { color: colors.lime }]}>VENDOR DEMO DASHBOARD</Text>
          <Text style={styles.title}>Welcome, {currentUser?.name || 'Provider'}.</Text>
          <Text style={styles.subtitle}>Your venue profile is available on this device.</Text>
        </View>

        {storageNotice ? (
          <View style={[styles.notice, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
            <Text style={[styles.noticeText, { color: colors.ink }]}>{storageNotice}</Text>
          </View>
        ) : null}

        {venueStorageNotice ? (
          <View style={[styles.notice, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
            <Text style={[styles.noticeText, { color: colors.ink }]}>{venueStorageNotice}</Text>
          </View>
        ) : null}

        {venue && venue.photoUris?.length ? (
          <VenuePhotoSlider photos={venue.photoUris} venueName={venue.name} radius={radius.md} />
        ) : venue ? (
          <VenueArtwork sport={venue.sports?.[0]} />
        ) : null}

        {venue ? (
          <View style={[styles.venueCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            <Text style={[styles.sectionLabel, { color: colors.inkSoft }]}>LOCAL VENUE PROFILE</Text>
            <Text style={[styles.venueName, { color: colors.ink }]}>{venue.name}</Text>
            <Text style={[styles.detail, { color: colors.inkSoft }]}>{vendorProfile?.businessName || currentUser?.businessName}</Text>
            <Text style={[styles.detail, { color: colors.inkSoft }]}>{venue.address}, {venue.city}</Text>
            {venue.locationNote ? <Text style={[styles.detail, { color: colors.inkSoft }]}>{venue.locationNote}</Text> : null}
            <Text style={[styles.detail, { color: colors.inkSoft }]}>
              {venue.latitude != null && venue.longitude != null
                ? `Vendor-entered coordinates: ${venue.latitude}, ${venue.longitude} (approximate demo)`
                : 'Location uses the manually entered address.'}
            </Text>
            <Text style={[styles.detail, { color: venue.published ? colors.success : colors.error }]}>
              {venue.published ? 'Published in local demo discovery' : 'Hidden from local demo discovery'}
            </Text>
            {venue.videoUri ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open venue video"
                onPress={() => Linking.openURL(venue.videoUri).catch(() => setError('This video could not be opened on this device.'))}
                style={[styles.videoProfile, { backgroundColor: colors.navy, borderRadius: radius.md }]}
              >
                <Text style={styles.videoPlay}>▶</Text>
                <View style={styles.videoCopy}>
                  <Text style={styles.videoTitle}>VENUE VIDEO</Text>
                  <Text style={styles.videoHint}>Tap to open the selected video</Text>
                </View>
              </Pressable>
            ) : null}
            <View style={styles.metricRow}>
              <View style={[styles.metric, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
                <Text style={[styles.metricValue, { color: colors.primaryDark }]}>{grounds.length}</Text>
                <Text style={[styles.metricLabel, { color: colors.inkSoft }]}>GROUNDS</Text>
              </View>
              <View style={[styles.metric, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
                <Text style={[styles.metricValue, { color: colors.primaryDark }]}>{venue.sports?.length || 0}</Text>
                <Text style={[styles.metricLabel, { color: colors.inkSoft }]}>SPORTS</Text>
              </View>
              <View style={[styles.metric, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
                <Text style={[styles.metricValue, { color: colors.primaryDark }]}>{venue.photoUris?.length || 0}</Text>
                <Text style={[styles.metricLabel, { color: colors.inkSoft }]}>PHOTOS</Text>
              </View>
            </View>
            <Text style={[styles.sectionLabel, { color: colors.inkSoft, marginTop: 17 }]}>SPORTS</Text>
            <Text style={[styles.detail, { color: colors.ink }]}>{venue.sports?.join(' · ') || 'No sports listed'}</Text>
            <Text style={[styles.sectionLabel, { color: colors.inkSoft, marginTop: 14 }]}>GROUND DETAILS</Text>
            {grounds.map(ground => (
              <View key={ground.id} style={[styles.groundRow, { borderColor: colors.border }]}>
                <Text style={[styles.groundName, { color: colors.ink }]}>{ground.name} · {ground.sport}</Text>
                <Text style={[styles.detail, { color: colors.inkSoft }]}>
                  {ground.widthMeters} × {ground.lengthMeters} m · {ground.indoorOutdoor} · {ground.surface} · Condition {ground.conditionRating}/5
                </Text>
                <Text style={[styles.price, { color: colors.primary }]}>PKR {ground.hourlyPricePKR} / hour</Text>
              </View>
            ))}
            <Text style={[styles.sectionLabel, { color: colors.inkSoft, marginTop: 14 }]}>FACILITIES & PARKING</Text>
            <Text style={[styles.detail, { color: colors.ink }]}>
              {venue.facilities?.join(' · ') || 'No facilities listed'}
              {venue.parkingAvailable ? ` · Parking for ${venue.parkingSpaces} vehicles` : ' · No parking'}
            </Text>
            <Text style={[styles.sectionLabel, { color: colors.inkSoft, marginTop: 14 }]}>EQUIPMENT</Text>
            {equipment.length ? equipment.map(item => (
              <Text key={item.id} style={[styles.detail, { color: colors.ink }]}>
                {item.name} · {item.priceMode} · PKR {item.unitPricePKR} · Qty {item.quantityAvailable}
              </Text>
            )) : <Text style={[styles.detail, { color: colors.inkSoft }]}>No add-ons listed</Text>}
          </View>
        ) : (
          <View style={[styles.venueCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
            <Text style={[styles.sectionLabel, { color: colors.inkSoft }]}>ACCOUNT DETAILS</Text>
            <Text style={[styles.venueName, { color: colors.ink }]}>{currentUser?.businessName}</Text>
            <Text style={[styles.detail, { color: colors.inkSoft }]}>{currentUser?.email}</Text>
            <Text style={[styles.detail, { color: colors.inkSoft }]}>{currentUser?.phone}</Text>
          </View>
        )}

        {venue ? (
          <AppButton
            title="Manage venue, grounds and equipment"
            testID="vendor-manage-venue"
            onPress={() => navigation.navigate('VendorVenueManagement', { venueId: venue.id })}
            style={styles.manageButton}
          />
        ) : null}

        <View style={[styles.demoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.demoEyebrow, { color: colors.primary }]}>LOCAL DEMO DATA</Text>
          <Text style={[styles.demoTitle, { color: colors.ink }]}>Profile saved on this device</Text>
          <Text style={[styles.demoCopy, { color: colors.inkSoft }]}>
            Venue approval and publishing are local demo states. Nothing is sent to a server.
          </Text>
        </View>

        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <AppButton
          title="Log out of demo account"
          testID="vendor-logout"
          variant="secondary"
          onPress={logout}
          loading={loading}
          disabled={loading}
        />
        <Text style={[styles.footer, { color: colors.inkSoft }]}>Local frontend demo · no server authenticated this account</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 22, paddingTop: 10, paddingBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandMark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  brandBall: { fontSize: 17, fontWeight: '900' },
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  roleBadge: { marginLeft: 'auto', paddingHorizontal: 10, paddingVertical: 7 },
  roleBadgeText: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 },
  hero: { padding: 21, marginBottom: 14 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 26, lineHeight: 33, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#CBD9CF', fontSize: 13, lineHeight: 20, marginTop: 5 },
  notice: { padding: 12, marginBottom: 14 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  venueCard: { borderWidth: 1, padding: 16, marginBottom: 14 },
  videoProfile: { flexDirection: 'row', alignItems: 'center', padding: 14, marginTop: 14, gap: 12 },
  videoPlay: { color: '#FFFFFF', fontSize: 22 },
  videoCopy: { flex: 1 },
  videoTitle: { color: '#FFFFFF', fontSize: 11, fontWeight: '900', letterSpacing: 1 },
  videoHint: { color: '#CBD9CF', fontSize: 11, marginTop: 3 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  venueName: { fontSize: 19, lineHeight: 25, fontWeight: '900', marginTop: 10 },
  detail: { fontSize: 11, lineHeight: 18, marginTop: 4 },
  metricRow: { flexDirection: 'row', gap: 8, marginTop: 15 },
  metric: { flex: 1, alignItems: 'center', paddingVertical: 11 },
  metricValue: { fontSize: 19, fontWeight: '900' },
  metricLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.6, marginTop: 2 },
  groundRow: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 10 },
  groundName: { fontSize: 12, fontWeight: '800' },
  price: { fontSize: 11, fontWeight: '900', marginTop: 5 },
  demoCard: { borderWidth: 1, padding: 16, marginBottom: 18 },
  manageButton: { marginBottom: 16 },
  demoEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  demoTitle: { fontSize: 15, fontWeight: '800', marginTop: 7 },
  demoCopy: { fontSize: 12, lineHeight: 18, marginTop: 5 },
  error: { fontSize: 12, marginBottom: 10 },
  footer: { textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 12 },
});
