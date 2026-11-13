import React, { useEffect, useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import ChoiceChips from '../components/ChoiceChips';
import VenueCard from '../components/VenueCard';
import { useTheme } from '../context/ThemeContext';
import { DEMO_MODE } from '../config/backendApi';
import { backendApi } from '../services/backendApi';
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
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [remoteVenues, setRemoteVenues] = useState([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const origin = initial.origin || DEFAULT_ORIGIN;
  useEffect(() => {
    if (DEMO_MODE) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setRemoteLoading(true);
      setRemoteError('');
      try {
        const filters = {
          lat: origin.latitude, lng: origin.longitude,
          radiusKm: distance === 'Any' ? 100 : Number(distance.replace(/\D/g, '')),
          q: query.trim() || undefined, sport: sport === 'All' ? undefined : sport,
          minPricePKR: budget === 'Any' ? undefined : 0,
          maxPricePKR: budget === 'Any' ? undefined : Number(budget.replace(/\D/g, '')) * 1000,
          indoorOutdoor: indoor === 'Any' ? undefined : indoor.toUpperCase(), page: 1, limit: 50,
        };
        const rows = await backendApi.nearbyVenues(filters);
        if (active) setRemoteVenues(rows || []);
      } catch (error) { if (active) { setRemoteVenues([]); setRemoteError(error.message); } }
      finally { if (active) setRemoteLoading(false); }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [origin.latitude, origin.longitude, query, sport, budget, distance, indoor]);
  const sourceVenues = DEMO_MODE ? venues : remoteVenues;
  const sourceGrounds = DEMO_MODE ? grounds : remoteVenues.flatMap(venue => venue.grounds || []);
  const results = useMemo(() => filterAndSortVenues({
    venues: sourceVenues.filter(item => item.published), grounds: sourceGrounds, reviews: DEMO_MODE ? reviews : [], query, sport,
    maximumPrice: budget === 'Any' ? '' : Number(budget.replace(/\D/g, '')) * 1000,
    minimumRating: rating === 'Any' ? 0 : Number(rating.replace('+', '')),
    maximumDistance: distance === 'Any' ? '' : Number(distance.replace(/\D/g, '')),
    indoorOutdoor: indoor, sort: sort.toLowerCase(), origin,
  }), [sourceVenues, sourceGrounds, reviews, query, sport, budget, rating, distance, indoor, sort, origin]);
  const reset = () => { setQuery(''); setSport('All'); setBudget('Any'); setRating('Any'); setDistance('Any'); setIndoor('Any'); setSort('Nearest'); };
  const activeFilterCount = [sport !== 'All', budget !== 'Any', rating !== 'Any', distance !== 'Any', indoor !== 'Any', sort !== 'Nearest'].filter(Boolean).length;

  const header = (
    <View>
      <View style={styles.titleRow}><View><Text style={[styles.title, { color: colors.ink }]}>Find a venue</Text><Text style={[styles.subtitle, { color: colors.inkSoft }]}>{DEMO_MODE ? 'Browse fictional Lahore demo listings' : 'Available PlaySpot venues · approximate distance from Lahore'}</Text></View><Pressable accessibilityRole="button" accessibilityLabel="Open offline venue map" testID="search-open-map" onPress={() => navigation.navigate('VenueMap', { origin })} style={[styles.mapButton, { backgroundColor: colors.limePale, borderRadius: radius.md }]}><Text style={{ color: colors.primary, fontWeight: '800' }}>⌖ Map</Text></Pressable></View>
      <View style={[styles.inputWrap, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={{ color: colors.inkSoft, fontSize: 18 }}>⌕</Text><TextInput accessibilityLabel="Search by venue, area or sport" testID="venue-search-input" value={query} onChangeText={setQuery} placeholder="Search sport, venue or area" placeholderTextColor={colors.muted} style={[styles.input, { color: colors.ink }]} returnKeyType="search" /></View>
      <View style={styles.filterHead}>
        <Pressable accessibilityRole="button" accessibilityState={{ expanded: filtersOpen }} testID="venue-filters-toggle" onPress={() => setFiltersOpen(open => !open)} style={[styles.filterToggle, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.filterTitle, { color: colors.ink }]}>Filters{activeFilterCount ? ` · ${activeFilterCount}` : ''}</Text>
          <Text style={[styles.filterChevron, { color: colors.primary }]}>{filtersOpen ? '⌃' : '⌄'}</Text>
        </Pressable>
        {filtersOpen ? <Pressable accessibilityRole="button" testID="venue-filters-reset" onPress={reset}><Text style={[styles.reset, { color: colors.primary }]}>Reset all</Text></Pressable> : null}
      </View>
      {filtersOpen ? <>
        <ChoiceChips label="Sport" options={SPORTS} selected={sport} onSelect={setSport} testID="filter-sport" />
        <ChoiceChips label="Budget per hour" options={priceFilters} selected={budget} onSelect={setBudget} testID="filter-budget" />
        <ChoiceChips label="Minimum rating" options={ratingFilters} selected={rating} onSelect={setRating} testID="filter-rating" />
        <ChoiceChips label="Approx. distance from Lahore" options={distanceFilters} selected={distance} onSelect={setDistance} testID="filter-distance" />
        <ChoiceChips label="Venue type" options={['Any', 'Indoor', 'Outdoor']} selected={indoor} onSelect={setIndoor} testID="filter-indoor-outdoor" />
        <ChoiceChips label="Sort by" options={['Nearest', 'Rating', 'Price']} selected={sort} onSelect={setSort} testID="filter-sort" />
      </> : null}
      <Text style={[styles.resultCount, { color: colors.inkSoft }]}>{remoteLoading ? 'Searching PlaySpot venues…' : `${results.length} ${results.length === 1 ? 'venue' : 'venues'} found${DEMO_MODE ? ' · approximate distance' : ''}`}</Text>
      {remoteError ? <Text accessibilityRole="alert" style={{ color: colors.error, marginBottom: 12 }}>{remoteError}</Text> : null}
    </View>
  );

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
    <FlatList data={results} keyExtractor={item => item.id} renderItem={({ item }) => <VenueCard venue={item} onPress={() => navigation.navigate('VenueDetails', { venueId: item.id })} />} ListHeaderComponent={header} ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={[styles.emptyTitle, { color: colors.ink }]}>No venues match those filters</Text><Text style={[styles.subtitle, { color: colors.inkSoft }]}>Try a different sport, budget or distance.</Text><Pressable accessibilityRole="button" onPress={reset} style={styles.emptyButton}><Text style={{ color: colors.primary, fontWeight: '800' }}>Reset filters</Text></Pressable></View>} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled" />
  </SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: 18, paddingBottom: 28 },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }, title: { fontSize: 24, fontWeight: '900' }, subtitle: { fontSize: 11, marginTop: 4 },
  mapButton: { paddingHorizontal: 14, paddingVertical: 11 }, inputWrap: { height: 50, borderWidth: 1, paddingHorizontal: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 18 }, input: { flex: 1, fontSize: 13 },
  filterHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }, filterToggle: { minHeight: 44, borderWidth: 1, paddingHorizontal: 12, flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginRight: 10 }, filterTitle: { fontSize: 13, fontWeight: '900' }, filterChevron: { fontSize: 20, fontWeight: '900' }, reset: { fontSize: 11, fontWeight: '800' }, resultCount: { fontSize: 11, fontWeight: '700', marginBottom: 12 },
  empty: { borderWidth: 1, padding: 18, marginTop: 8 }, emptyTitle: { fontSize: 15, fontWeight: '800' }, emptyButton: { alignSelf: 'flex-start', paddingVertical: 12 },
});
