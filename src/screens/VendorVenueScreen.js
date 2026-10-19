import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { DesignCard, EmptyState } from '../components/DesignPrimitives';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { selectEquipmentByVenueId, selectGroundsByVenueId, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';

export default function VendorVenueScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const venue = venues[0];
  const grounds = useSelector(state => selectGroundsByVenueId(state, venue?.id));
  const equipment = useSelector(state => selectEquipmentByVenueId(state, venue?.id));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader title="Your venue" subtitle="Manage venue details, courts and player add-ons." eyebrow="VENUE TOOLS" />
        {venue ? <>
          <View style={[styles.venueSummary, { backgroundColor: colors.primary, borderRadius: 20 }]}>
            <Text style={styles.summaryLabel}>ACTIVE VENUE</Text>
            <Text style={styles.summaryName}>{venue.name}</Text>
            <Text style={styles.summaryMeta}>{venue.locationNote || venue.city} · {grounds.length} grounds · {equipment.length} add-ons</Text>
          </View>
          <Pressable accessibilityRole="button" testID="vendor-venue-manage-card" onPress={() => navigation.push('VendorVenueManagement', { venueId: venue.id, section: 'details' })}>
            <DesignCard style={styles.actionCard}>
              <View style={[styles.iconWrap, { backgroundColor: colors.limePale }]}><Text style={[styles.icon, { color: colors.primary }]}>⌂</Text></View>
              <View style={styles.copy}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Venue details</Text>
                <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Update business, venue address, sports, facilities and parking.</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
            </DesignCard>
          </Pressable>
          <Pressable accessibilityRole="button" testID="vendor-venue-grounds-card" onPress={() => navigation.push('VendorVenueManagement', { venueId: venue.id, section: 'grounds' })}>
            <DesignCard style={styles.actionCard}>
              <View style={[styles.iconWrap, { backgroundColor: colors.limePale }]}><Text style={[styles.icon, { color: colors.primary }]}>▦</Text></View>
              <View style={styles.copy}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Grounds and courts</Text>
                <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Edit sport, court size, surface, hourly rate and booking hours.</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
            </DesignCard>
          </Pressable>
          <Pressable accessibilityRole="button" testID="vendor-venue-facilities-card" onPress={() => navigation.push('VendorVenueManagement', { venueId: venue.id, section: 'facilities' })}>
            <DesignCard style={styles.actionCard}>
              <View style={[styles.iconWrap, { backgroundColor: colors.limePale }]}><Text style={[styles.icon, { color: colors.primary }]}>✚</Text></View>
              <View style={styles.copy}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Facilities and parking</Text>
                <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Choose venue facilities and update parking availability and spaces.</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
            </DesignCard>
          </Pressable>
          <Pressable accessibilityRole="button" testID="vendor-venue-media-card" onPress={() => navigation.push('VendorVenueManagement', { venueId: venue.id, section: 'media' })}>
            <DesignCard style={styles.actionCard}>
              <View style={[styles.iconWrap, { backgroundColor: colors.limePale }]}><Text style={[styles.icon, { color: colors.primary }]}>▧</Text></View>
              <View style={styles.copy}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Photos and video</Text>
                <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Add a required venue photo and optional video for your profile.</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
            </DesignCard>
          </Pressable>
          <Pressable accessibilityRole="button" testID="vendor-venue-addons-card" onPress={() => navigation.push('VendorInventory', { venueId: venue.id })}>
            <DesignCard style={styles.actionCard}>
              <View style={[styles.iconWrap, { backgroundColor: colors.limePale }]}><Text style={[styles.icon, { color: colors.primary }]}>＋</Text></View>
              <View style={styles.copy}>
                <Text style={[styles.cardTitle, { color: colors.ink }]}>Equipment and add-ons</Text>
              <Text style={[styles.cardMeta, { color: colors.inkSoft }]}>Open a separate form to edit rentals, prices and quantities.</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
            </DesignCard>
          </Pressable>
        </> : <DesignCard><EmptyState title="No venue is linked to this account" description="Your vendor registration or venue setup may not have completed." /></DesignCard>}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingTop: 14, paddingBottom: 30 },
  venueSummary: { padding: 18, marginBottom: 14 },
  summaryLabel: { color: '#DDF3E6', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  summaryName: { color: '#FFFFFF', fontSize: 19, fontWeight: '900', marginTop: 8 },
  summaryMeta: { color: '#E7F6ED', fontSize: 10, marginTop: 5 },
  actionCard: { flexDirection: 'row', alignItems: 'center', gap: 12, minHeight: 104, marginBottom: 11, padding: 15 },
  iconWrap: { width: 43, height: 43, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 23, fontWeight: '700' },
  copy: { flex: 1 },
  cardTitle: { fontSize: 13, fontWeight: '900' },
  cardMeta: { fontSize: 10, lineHeight: 15, marginTop: 5 },
  chevron: { fontSize: 24, fontWeight: '700' },
});
