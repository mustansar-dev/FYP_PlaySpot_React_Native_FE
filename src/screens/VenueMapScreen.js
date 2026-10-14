import React, { useMemo, useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import { useTheme } from '../context/ThemeContext';
import { filterAndSortVenues } from '../utils/venueDiscovery';

const LOCATIONS = [
  { label: 'Lahore', latitude: 31.5204, longitude: 74.3587 },
  { label: 'Gulberg', latitude: 31.5112, longitude: 74.3431 },
  { label: 'DHA', latitude: 31.4697, longitude: 74.4082 },
  { label: 'Johar Town', latitude: 31.4691, longitude: 74.2728 },
];
const clamp = value => Math.max(7, Math.min(90, value));

export default function VenueMapScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const { venues, grounds, reviews } = useSelector(state => state.venues);
  const [origin, setOrigin] = useState(route.params?.origin || LOCATIONS[0]);
  const [selectedId, setSelectedId] = useState(null);
  const [locationNotice, setLocationNotice] = useState('Using a manual Lahore map center. Device GPS is not connected in this build.');
  const mappedVenues = useMemo(() => filterAndSortVenues({ venues: venues.filter(item => item.published), grounds, reviews, origin }), [venues, grounds, reviews, origin]);
  const selected = mappedVenues.find(item => item.id === selectedId) || mappedVenues[0];
  const center = useMemo(() => {
    const latitudes = mappedVenues.map(item => item.latitude).filter(Number.isFinite);
    const longitudes = mappedVenues.map(item => item.longitude).filter(Number.isFinite);
    return { latitude: (Math.min(...latitudes) + Math.max(...latitudes)) / 2 || 31.5, longitude: (Math.min(...longitudes) + Math.max(...longitudes)) / 2 || 74.35 };
  }, [mappedVenues]);

  const tryDeviceLocation = () => {
    setLocationNotice('Device location is unavailable in this build. Select a manual Lahore location below.');
    Alert.alert('Using manual location', 'This build has no GPS provider or map service. Choose a nearby Lahore area to continue browsing.');
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.title, { color: colors.ink }]}>Venue map</Text>
      <Text style={[styles.copy, { color: colors.inkSoft }]}>Offline schematic · marker positions use approximate demo coordinates</Text>
      <View style={[styles.notice, { backgroundColor: colors.limePale, borderRadius: radius.md }]}><Text style={[styles.noticeTitle, { color: colors.primaryDark }]}>Manual location · {origin.label || 'Lahore'}</Text><Text style={[styles.copy, { color: colors.inkSoft }]}>{locationNotice}</Text><Pressable accessibilityRole="button" testID="map-location-retry" onPress={tryDeviceLocation} style={styles.locationAction}><Text style={[styles.link, { color: colors.primary }]}>Try device location</Text></Pressable></View>
      <View style={styles.locationChips}>{LOCATIONS.map(location => <Pressable key={location.label} accessibilityRole="button" accessibilityState={{ selected: origin.label === location.label }} testID={`map-center-${location.label.toLowerCase().replace(/ /g, '-')}`} onPress={() => { setOrigin(location); setLocationNotice('Showing venues relative to your selected demo area.'); }} style={[styles.locationChip, { borderColor: origin.label === location.label ? colors.primary : colors.border, backgroundColor: origin.label === location.label ? colors.limePale : colors.surface, borderRadius: radius.pill }]}><Text style={{ color: origin.label === location.label ? colors.primaryDark : colors.inkSoft, fontSize: 11, fontWeight: '700' }}>{location.label}</Text></Pressable>)}</View>
      <View accessibilityLabel="Offline schematic map of demo Lahore venues" style={[styles.map, { borderRadius: radius.lg }]}>
        <View pointerEvents="none" style={styles.roadA} /><View pointerEvents="none" style={styles.roadB} /><View pointerEvents="none" style={styles.roadC} />
        <View style={[styles.mapLabel, { left: '34%', top: '19%' }]}><Text style={styles.mapLabelText}>GULBERG</Text></View>
        <View style={[styles.mapLabel, { left: '13%', top: '61%' }]}><Text style={styles.mapLabelText}>JOHAR TOWN</Text></View>
        <View style={[styles.youMarker, { left: '47%', top: '48%', backgroundColor: colors.primary, borderColor: colors.white }]}><View style={styles.youDot} /></View>
        {mappedVenues.map((venue, index) => {
          const x = clamp(50 + (venue.longitude - center.longitude) * 135);
          const y = clamp(47 - (venue.latitude - center.latitude) * 150);
          const active = selected?.id === venue.id;
          return <Pressable key={venue.id} accessibilityRole="button" accessibilityLabel={`Select ${venue.name} marker`} accessibilityState={{ selected: active }} testID={`map-marker-${venue.id}`} onPress={() => setSelectedId(venue.id)} style={[styles.marker, { left: `${x}%`, top: `${y}%`, backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.primary, transform: [{ translateX: -16 }, { translateY: -16 }] }]}><Text style={{ color: active ? colors.white : colors.primary, fontSize: 10, fontWeight: '900' }}>{index + 1}</Text></Pressable>;
        })}
        <View style={styles.mapBadge}><Text style={styles.mapBadgeText}>DEMO · NO MAP TILES</Text></View>
      </View>
      <Text style={[styles.attribution, { color: colors.inkSoft }]}>Map illustration drawn in-app. No external tiles or map attribution are used. Coordinates are fictional/approximate.</Text>
      <Pressable accessibilityRole="button" testID="map-search-this-area" onPress={() => navigation.navigate('VenueSearch', { origin })} style={[styles.searchArea, { borderColor: colors.primary, borderRadius: radius.md }]}><Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>Search venues around {origin.label || 'this area'}</Text></Pressable>
      {selected ? <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <View style={styles.selectedHead}><View style={{ flex: 1 }}><Text style={[styles.selectedTitle, { color: colors.ink }]}>{selected.name}</Text><Text style={[styles.copy, { color: colors.inkSoft }]}>{selected.locationNote} · {selected.distance?.toFixed(1) || '—'} km away</Text></View><Text style={{ color: colors.orange, fontWeight: '900' }}>★ {selected.rating.count ? selected.rating.average.toFixed(1) : 'New'}</Text></View>
        <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 7 }]}>{selected.sports.join(' · ')}{selected.price ? ` · From PKR ${selected.price.toLocaleString()}/hr` : ''}</Text>
        <AppButton title="View venue details" testID="map-selected-details" onPress={() => navigation.navigate('VenueDetails', { venueId: selected.id })} style={styles.detailsButton} />
      </View> : <Text style={[styles.copy, { color: colors.inkSoft }]}>No geocoded demo venues to display.</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: 18, paddingBottom: 28 }, title: { fontSize: 24, fontWeight: '900' }, copy: { fontSize: 11, lineHeight: 16, marginTop: 3 }, link: { fontSize: 11, fontWeight: '900' },
  notice: { marginTop: 14, padding: 13 }, noticeTitle: { fontSize: 13, fontWeight: '900' }, locationAction: { alignSelf: 'flex-start', paddingVertical: 7 },
  locationChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 12 }, locationChip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  map: { height: 300, overflow: 'hidden', backgroundColor: '#E6F0E8', position: 'relative', borderWidth: 1, borderColor: '#D7E2DA' },
  roadA: { position: 'absolute', width: '140%', height: 17, backgroundColor: '#FFFFFF', top: '36%', left: '-16%', transform: [{ rotate: '-18deg' }] }, roadB: { position: 'absolute', width: 16, height: '145%', backgroundColor: '#FFFFFF', left: '61%', top: '-15%', transform: [{ rotate: '21deg' }] }, roadC: { position: 'absolute', width: '135%', height: 10, backgroundColor: '#F5FAF6', top: '72%', left: '-10%', transform: [{ rotate: '8deg' }] },
  mapLabel: { position: 'absolute' }, mapLabelText: { color: '#86968A', fontSize: 8, fontWeight: '900', letterSpacing: 1 },
  marker: { position: 'absolute', width: 31, height: 31, borderWidth: 2, borderRadius: 18, alignItems: 'center', justifyContent: 'center', elevation: 3 }, youMarker: { position: 'absolute', width: 19, height: 19, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center' }, youDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: '#FFFFFF' },
  mapBadge: { position: 'absolute', bottom: 10, left: 10, backgroundColor: 'rgba(255,255,255,0.92)', paddingHorizontal: 8, paddingVertical: 5, borderRadius: 8 }, mapBadgeText: { color: '#667080', fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, attribution: { fontSize: 9, lineHeight: 14, marginTop: 7 },
  searchArea: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginTop: 12 }, selectedCard: { borderWidth: 1, padding: 14, marginTop: 12 }, selectedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 }, selectedTitle: { fontSize: 15, fontWeight: '900' }, detailsButton: { marginTop: 12, minHeight: 44 },
});
