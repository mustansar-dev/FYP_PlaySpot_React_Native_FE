import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ChoiceChips from '../components/ChoiceChips';
import VenueCard from '../components/VenueCard';
import { useTheme } from '../context/ThemeContext';
import { filterAndSortVenues } from '../utils/venueDiscovery';

const SPORTS = ['All', 'Futsal', 'Football', 'Cricket', 'Padel', 'Badminton'];
const DEFAULT_ORIGIN = { latitude: 31.5204, longitude: 74.3587 };
const priceFilters = ['Any', 'PKR 3k', 'PKR 5k', 'PKR 8k'];
const distanceFilters = ['Any', '5 km', '10 km', '20 km'];
const ratingFilters = ['Any', '3.5+', '4.0+', '4.5+'];

export default function VenueSearchScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const { venues, grounds, reviews } = useSelector(state => state.venues);
  const initial = route.params || {};
  const [query, setQuery] = useState('');
  const [sport, setSport] = useState(SPORTS.includes(initial.sport) ? initial.sport : 'All');
  const [budget, setBudget] = useState('Any');
  const [rating, setRating] = useState('Any');
  const [distance, setDistance] = useState('Any');
  const [indoor, setIndoor] = useState('Any');
  const [sort, setSort] = useState('Nearest');
  const origin = initial.origin || DEFAULT_ORIGIN;
  const results = useMemo(() => filterAndSortVenues({
    venues: venues.filter(item => item.published), grounds, reviews, query, sport,
    maximumPrice: budget === 'Any' ? '' : Number(budget.replace(/\D/g, '')) * 1000,
    minimumRating: rating === 'Any' ? 0 : Number(rating.replace('+', '')),
    maximumDistance: distance === 'Any' ? '' : Number(distance.replace(/\D/g, '')),
    indoorOutdoor: indoor, sort: sort.toLowerCase(), origin,
  }), [venues, grounds, reviews, query, sport, budget, rating, distance, indoor, sort, origin]);
  const reset = () => { setQuery(''); setSport('All'); setBudget('Any'); setRating('Any'); setDistance('Any'); setIndoor('Any'); setSort('Nearest'); };

  const header = (
    <View>
      <View style={styles.titleRow}><View><Text style={[styles.title, { color: colors.ink }]}>Find a venue</Text><Text style={[styles.subtitle, { color: colors.inkSoft }]}>Browse fictional Lahore demo listings</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open offline venue map" testID="search-open-map" onPress={() => navigation.navigate('VenueMap', { origin })} style={[styles.mapButton, { backgroundColor: colors.limePale, borderRadius: radius.md }]}><Text style={{ color: colors.primary, fontWeight: '800' }}>⌖ Map</Text></Pressable></View>
      <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={{ color: colors.inkSoft, fontSize: 18 }}>⌕</Text><TextInput accessibilityLabel="Search by venue, area or sport" testID="venue-search-input" value={query} onChangeText={setQuery} placeholder="Search sport, venue or area" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.ink }]} returnKeyType="search" /></View>
      <View style={styles.filterHead}><Text style={[styles.filterTitle, { color: colors.ink }]}>Filters</Text><Pressable accessibilityRole="button" testID="venue-filters-reset" onPress={reset}><Text style={[styles.reset, { color: colors.primary }]}>Reset all</Text></Pressable></View>
      <ChoiceChips label="Sport" options={SPORTS} selected={sport} onSelect={setSport} testID="filter-sport" />
      <ChoiceChips label="Budget per hour" options={priceFilters} selected={budget} onSelect={setBudget} testID="filter-budget" />
      <ChoiceChips label="Minimum rating" options={ratingFilters} selected={rating} onSelect={setRating} testID="filter-rating" />
      <ChoiceChips label="Approx. distance from Lahore" options={distanceFilters} selected={distance} onSelect={setDistance} testID="filter-distance" />
      <ChoiceChips label="Venue type" options={['Any', 'Indoor', 'Outdoor']} selected={indoor} onSelect={setIndoor} testID="filter-indoor-outdoor" />
      <ChoiceChips label="Sort by" options={['Nearest', 'Rating', 'Price']} selected={sort} onSelect={setSort} testID="filter-sort" />
      <Text style={[styles.resultCount, { color: colors.inkSoft }]}>{results.length} {results.length === 1 ? 'venue' : 'venues'} found · approximate distance</Text>
    </View>
  );

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
    <FlatList data={results} keyExtractor={item => item.id} renderItem={({ item }) => <VenueCard venue={item} onPress={() => navigation.navigate('VenueDetails', { venueId: item.id })} />} ListHeaderComponent={header} ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={[styles.emptyTitle, { color: colors.ink }]}>No venues match those filters</Text><Text style={[styles.subtitle, { color: colors.inkSoft }]}>Try a different sport, budget or distance.</Text><Pressable accessibilityRole="button" onPress={reset} style={styles.emptyButton}><Text style={{ color: colors.primary, fontWeight: '800' }}>Reset filters</Text></Pressable></View>} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: 18, paddingBottom: 28 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, title: { fontSize: 24, fontWeight: '900' }, subtitle: { fontSize: 11, marginTop: 4 },
  mapButton: { paddingHorizontal: 14, paddingVertical: 11 }, inputWrap: { height: 50, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }, input: { flex: 1, fontSize: 13 },
  filterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, filterTitle: { fontSize: 17, fontWeight: '900' }, reset: { fontSize: 12, fontWeight: '800' }, resultCount: { fontSize: 11, fontWeight: '700', marginBottom: 12 },
  empty: { borderWidth: 1, padding: 18, marginTop: 8 }, emptyTitle: { fontSize: 15, fontWeight: '800' }, emptyButton: { alignSelf: 'flex-start', paddingVertical: 12 },
});
