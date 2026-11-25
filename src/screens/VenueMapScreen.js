import React, { useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, TextInput, View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ScreenHeader from '../components/ScreenHeader';
import { API_BASE_URL, DEMO_MODE } from '../config/backendApi';
import { useTheme } from '../context/ThemeContext';
import { backendApi } from '../services/backendApi';
import { getDeviceLocation } from '../services/deviceLocation';
import { filterAndSortVenues } from '../utils/venueDiscovery';

// Avoid loading native Fabric modules in Jest's non-native renderer.
const mapLibre = typeof jest === 'undefined' ? require('@maplibre/maplibre-react-native') : null;
const MapView = mapLibre?.Map;
const MapCamera = mapLibre?.Camera;
const MapMarker = mapLibre?.Marker;

const LAHORE = { label: 'Lahore', latitude: 31.5204, longitude: 74.3587 };
const LOCATIONS = [
  LAHORE,
  { label: 'Gulberg', latitude: 31.5112, longitude: 74.3431 },
  { label: 'DHA', latitude: 31.4697, longitude: 74.4082 },
  { label: 'Johar Town', latitude: 31.4691, longitude: 74.2728 },
];
const MAP_STYLE = {
  version: 8,
  sources: {
    geoapify: {
      type: 'raster',
      tiles: [`${API_BASE_URL}/map/tiles/{z}/{x}/{y}`],
      tileSize: 256,
      maxzoom: 20,
      attribution: '© Geoapify | © OpenStreetMap contributors',
    },
  },
  layers: [
    { id: 'map-background', type: 'background', paint: { 'background-color': '#edf2ed' } },
    { id: 'geoapify-raster', type: 'raster', source: 'geoapify' },
  ],
};

function validCoordinates(value) {
  return value && value.latitude !== null && value.longitude !== null
    && Number.isFinite(Number(value.latitude)) && Number.isFinite(Number(value.longitude))
    && Math.abs(Number(value.latitude)) <= 90 && Math.abs(Number(value.longitude)) <= 180;
}

function normalizeOrigin(value) {
  if (!validCoordinates(value)) return LAHORE;
  return {
    label: value.label || 'Map center',
    latitude: Number(value.latitude),
    longitude: Number(value.longitude),
  };
}

function MapTestSurface({ venues, onSelectVenue, colors }) {
  return <View testID="venue-map" accessibilityLabel="Map preview" style={[styles.map, { backgroundColor: colors.surface, borderColor: colors.border }]}>
    <Text style={[styles.testMapLabel, { color: colors.inkSoft }]}>Interactive map loads in the native app.</Text>
    {venues.filter(validCoordinates).map((venue, index) => <Pressable
      key={venue.id}
      testID={`map-marker-${venue.id}`}
      accessibilityRole="button"
      accessibilityLabel={`Select ${venue.name} marker`}
      onPress={() => onSelectVenue(venue.id)}
      style={[styles.testMarker, { left: `${22 + (index % 4) * 18}%`, top: `${24 + (index % 3) * 20}%`, backgroundColor: colors.primary }]}
    ><Text style={styles.markerNumber}>{index + 1}</Text></Pressable>)}
  </View>;
}

export default function VenueMapScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const { venues, grounds, reviews } = useSelector(state => state.venues);
  const cameraRef = useRef(null);
  const initialOrigin = useMemo(() => normalizeOrigin(route.params?.origin), [route.params?.origin]);
  const [origin, setOrigin] = useState(initialOrigin);
  const [selectedId, setSelectedId] = useState(null);
  const [remoteVenues, setRemoteVenues] = useState([]);
  const [remoteError, setRemoteError] = useState('');
  const [nearbyLoading, setNearbyLoading] = useState(false);
  const [locationNotice, setLocationNotice] = useState('Pan the map, tap a point, or search for a place to update nearby venues.');
  const [locationError, setLocationError] = useState('');
  const [locationBusy, setLocationBusy] = useState(false);
  const [placeQuery, setPlaceQuery] = useState('');
  const [placeResults, setPlaceResults] = useState([]);
  const [placeSearchBusy, setPlaceSearchBusy] = useState(false);
  const [placeSearchError, setPlaceSearchError] = useState('');
  const [mapError, setMapError] = useState('');

  React.useEffect(() => {
    if (DEMO_MODE) return undefined;
    let active = true;
    backendApi.mapServiceStatus()
      .then(status => {
        if (active && !status?.configured) setMapError('Geoapify is not configured on this backend. Add GEOAPIFY_API_KEY to the backend .env file, then restart the server.');
      })
      .catch(() => {
        if (active) setMapError('Restart the backend to enable Geoapify map routes, then reopen this screen.');
      });
    return () => { active = false; };
  }, []);

  React.useEffect(() => {
    if (DEMO_MODE) return undefined;
    let active = true;
    const timer = setTimeout(async () => {
      setNearbyLoading(true);
      try {
        const rows = await backendApi.nearbyVenues({
          lat: origin.latitude, lng: origin.longitude, radiusKm: 25, page: 1, limit: 50,
        });
        if (active) { setRemoteVenues(rows || []); setRemoteError(''); }
      } catch (error) {
        if (active) { setRemoteVenues([]); setRemoteError(error.message); }
      } finally {
        if (active) setNearbyLoading(false);
      }
    }, 300);
    return () => { active = false; clearTimeout(timer); };
  }, [origin.latitude, origin.longitude]);

  const mappedVenues = useMemo(() => DEMO_MODE
    ? filterAndSortVenues({ venues: venues.filter(item => item.published), grounds, reviews, origin })
    : filterAndSortVenues({ venues: remoteVenues, grounds: remoteVenues.flatMap(item => item.grounds || []), reviews: [], origin }),
  [venues, grounds, reviews, origin, remoteVenues]);
  const selected = mappedVenues.find(item => item.id === selectedId) || mappedVenues[0];

  const moveCamera = (location, zoom = 13) => {
    cameraRef.current?.flyTo({ center: [location.longitude, location.latitude], zoom, duration: 650 });
  };

  const setMapLocation = (location, { reverseGeocode = false } = {}) => {
    const next = normalizeOrigin(location);
    setOrigin(next);
    setSelectedId(null);
    setLocationError('');
    setLocationNotice(`Showing PlaySpot venues around ${next.label}.`);
    if (reverseGeocode && !DEMO_MODE) {
      backendApi.reverseMapPlace({ lat: next.latitude, lon: next.longitude })
        .then(place => {
          if (place?.label) {
            setOrigin(current => Math.abs(current.latitude - next.latitude) < 0.00001
              && Math.abs(current.longitude - next.longitude) < 0.00001
              ? { ...current, label: place.label }
              : current);
          }
        })
        .catch(() => {});
    }
  };

  const handleMapPress = event => {
    const coordinate = event?.nativeEvent?.lngLat;
    if (!Array.isArray(coordinate) || coordinate.length < 2) return;
    const [longitude, latitude] = coordinate;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setMapLocation({ latitude, longitude, label: 'Pinned map location' }, { reverseGeocode: true });
  };

  const handleRegionChange = event => {
    const { center, userInteraction } = event?.nativeEvent || {};
    if (!userInteraction || !Array.isArray(center) || center.length < 2) return;
    const [longitude, latitude] = center;
    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return;
    setOrigin(current => Math.abs(current.latitude - latitude) < 0.0001
      && Math.abs(current.longitude - longitude) < 0.0001
      ? current
      : { latitude, longitude, label: 'Map center' });
    setSelectedId(null);
    setLocationError('');
  };

  const searchPlaces = async () => {
    const q = placeQuery.trim();
    if (q.length < 2) {
      setPlaceSearchError('Enter at least two characters to search for a place.');
      return;
    }
    setPlaceSearchBusy(true);
    setPlaceSearchError('');
    setPlaceResults([]);
    try {
      if (DEMO_MODE) {
        const results = LOCATIONS.filter(location => location.label.toLowerCase().includes(q.toLowerCase()));
        setPlaceResults(results);
        if (!results.length) setPlaceSearchError('No demo areas match that search.');
        return;
      }
      const results = await backendApi.mapPlaces({ q, lat: origin.latitude, lon: origin.longitude });
      setPlaceResults(results || []);
      if (!results?.length) setPlaceSearchError('No places were found in Pakistan. Try another area or spelling.');
    } catch (error) {
      setPlaceSearchError(error.message || 'Place search is unavailable. Check the backend map configuration.');
    } finally {
      setPlaceSearchBusy(false);
    }
  };

  const choosePlace = place => {
    if (!validCoordinates(place)) return;
    const location = normalizeOrigin(place);
    setPlaceResults([]);
    setPlaceQuery('');
    setMapLocation(location);
    moveCamera(location, 14);
  };

  const tryDeviceLocation = async () => {
    setLocationBusy(true);
    setLocationError('');
    try {
      const coordinates = await getDeviceLocation();
      const location = { ...coordinates, label: 'My location' };
      setMapLocation(location, { reverseGeocode: true });
      moveCamera(location, 15);
    } catch (error) {
      setLocationError(error.message || 'Could not read this device location. Check location permission and try again.');
    } finally {
      setLocationBusy(false);
    }
  };

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Venue map" subtitle="Explore real map tiles and PlaySpot venues near your location" onBack={() => navigation.goBack()} />

      <View style={[styles.locationCard, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
        <View style={styles.locationHeader}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.noticeTitle, { color: colors.primaryDark }]}>{origin.label || 'Map center'}</Text>
            <Text style={[styles.copy, { color: colors.inkSoft }]}>{origin.latitude.toFixed(5)}, {origin.longitude.toFixed(5)}</Text>
          </View>
          <Pressable accessibilityRole="button" testID="map-location-retry" disabled={locationBusy} onPress={tryDeviceLocation} style={[styles.locationAction, { borderColor: colors.primary, borderRadius: radius.pill }]}>
            {locationBusy ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={[styles.link, { color: colors.primary }]}>◎ My location</Text>}
          </Pressable>
        </View>
        <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 8 }]}>{locationNotice}</Text>
        {locationError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{locationError}</Text> : null}
      </View>

      <View style={[styles.searchRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <Text style={{ color: colors.inkSoft, fontSize: 18 }}>⌕</Text>
        <TextInput
          accessibilityLabel="Search for a place"
          testID="map-place-search"
          value={placeQuery}
          onChangeText={setPlaceQuery}
          onSubmitEditing={searchPlaces}
          placeholder="Search an area or address"
          placeholderTextColor={colors.muted}
          style={[styles.searchInput, { color: colors.ink }]}
          returnKeyType="search"
        />
        <Pressable accessibilityRole="button" testID="map-place-search-submit" disabled={placeSearchBusy} onPress={searchPlaces} style={styles.searchAction}>
          {placeSearchBusy ? <ActivityIndicator size="small" color={colors.primary} /> : <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>Search</Text>}
        </Pressable>
      </View>
      {placeSearchError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{placeSearchError}</Text> : null}
      {placeResults.length ? <View style={[styles.placeResults, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        {placeResults.map((place, index) => <Pressable key={`${place.label}-${place.latitude}-${place.longitude}`} accessibilityRole="button" testID={`map-place-result-${index}`} onPress={() => choosePlace(place)} style={[styles.placeResult, index ? { borderTopWidth: 1, borderColor: colors.border } : null]}>
          <Text style={[styles.placeResultTitle, { color: colors.ink }]}>{place.label}</Text>
          <Text style={[styles.copy, { color: colors.inkSoft }]}>{place.latitude.toFixed(5)}, {place.longitude.toFixed(5)}</Text>
        </Pressable>)}
      </View> : null}

      <Text style={[styles.quickLabel, { color: colors.inkSoft }]}>Quick Lahore areas</Text>
      <View style={styles.locationChips}>{LOCATIONS.map(location => <Pressable
        key={location.label}
        accessibilityRole="button"
        accessibilityState={{ selected: origin.label === location.label }}
        testID={`map-center-${location.label.toLowerCase().replace(/ /g, '-')}`}
        onPress={() => {
          setMapLocation(location);
          setLocationNotice(DEMO_MODE ? 'Showing venues relative to your selected demo area.' : `Showing PlaySpot venues around ${location.label}.`);
          moveCamera(location, 13);
        }}
        style={[styles.locationChip, {
          borderColor: origin.label === location.label ? colors.primary : colors.border,
          backgroundColor: origin.label === location.label ? colors.limePale : colors.surface,
          borderRadius: radius.pill,
        }]}
      ><Text style={{ color: origin.label === location.label ? colors.primaryDark : colors.inkSoft, fontSize: 11, fontWeight: '700' }}>{location.label}</Text></Pressable>)}</View>

      <View style={[styles.mapFrame, { borderRadius: radius.lg, borderColor: colors.border }]}>
        {MapView ? <MapView
          testID="venue-map"
          accessibilityLabel="Interactive Geoapify map"
          style={styles.map}
          mapStyle={MAP_STYLE}
          androidView="texture"
          attribution
          logo={false}
          compass
          onPress={handleMapPress}
          onRegionDidChange={handleRegionChange}
          onDidFinishLoadingMap={() => {}}
          onDidFailLoadingMap={() => setMapError('Map tiles could not be loaded. Check the backend connection and GEOAPIFY_API_KEY.')}
        >
          <MapCamera ref={cameraRef} initialViewState={{ center: [origin.longitude, origin.latitude], zoom: 12 }} minZoom={3} maxZoom={19} />
          <MapMarker id="selected-location" lngLat={[origin.longitude, origin.latitude]}>
            <View style={[styles.originMarker, { borderColor: colors.white, backgroundColor: colors.primary }]}><View style={styles.originDot} /></View>
          </MapMarker>
          {mappedVenues.filter(validCoordinates).map((venue, index) => {
            const active = selected?.id === venue.id;
            return <MapMarker
              key={venue.id}
              id={`venue-${venue.id}`}
              lngLat={[Number(venue.longitude), Number(venue.latitude)]}
              onPress={event => { event?.stopPropagation?.(); setSelectedId(venue.id); }}
            ><View testID={`map-marker-${venue.id}`} accessibilityLabel={`Select ${venue.name} marker`} style={[styles.venueMarker, { backgroundColor: active ? colors.primary : colors.surface, borderColor: colors.primary }]}><Text style={{ color: active ? colors.white : colors.primary, fontSize: 10, fontWeight: '900' }}>{index + 1}</Text></View></MapMarker>;
          })}
        </MapView> : <MapTestSurface venues={mappedVenues} onSelectVenue={setSelectedId} colors={colors} />}
        {mapError ? <View accessibilityRole="alert" style={[styles.mapError, { backgroundColor: colors.surface, borderRadius: radius.md }]}><Text style={{ color: colors.error, fontSize: 11, fontWeight: '700' }}>{mapError}</Text></View> : null}
        {nearbyLoading ? <View style={[styles.loadingBadge, { backgroundColor: colors.surface }]}><ActivityIndicator size="small" color={colors.primary} /><Text style={[styles.loadingText, { color: colors.inkSoft }]}>Updating venues</Text></View> : null}
      </View>
      <Text style={[styles.attribution, { color: colors.inkSoft }]}>Map tiles © Geoapify · Map data © OpenStreetMap contributors. Tap or pan to change the search area.</Text>
      {remoteError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{remoteError}</Text> : null}

      <Pressable accessibilityRole="button" testID="map-search-this-area" onPress={() => navigation.navigate('VenueSearch', { origin })} style={[styles.searchArea, { borderColor: colors.primary, borderRadius: radius.md }]}>
        <Text style={{ color: colors.primary, fontWeight: '900', fontSize: 12 }}>Search venues around {origin.label || 'this area'}</Text>
      </Pressable>
      {selected ? <View style={[styles.selectedCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <View style={styles.selectedHead}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.selectedTitle, { color: colors.ink }]}>{selected.name}</Text>
            <Text style={[styles.copy, { color: colors.inkSoft }]}>{selected.locationNote || selected.address || selected.city || 'PlaySpot venue'} · {Number.isFinite(selected.distance) ? `${selected.distance.toFixed(1)} km away` : 'distance unavailable'}</Text>
          </View>
          <Text style={{ color: colors.orange, fontWeight: '900' }}>★ {selected.rating?.count ? selected.rating.average.toFixed(1) : 'New'}</Text>
        </View>
        <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 7 }]}>{selected.sports?.join(' · ')}{selected.price ? ` · From PKR ${selected.price.toLocaleString()}/hr` : ''}</Text>
        <AppButton title="View venue details" testID="map-selected-details" onPress={() => navigation.navigate('VenueDetails', { venueId: selected.id })} style={styles.detailsButton} />
      </View> : <Text style={[styles.copy, { color: colors.inkSoft, marginTop: 10 }]}>No venues with saved coordinates are available around this location yet.</Text>}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 18, paddingBottom: 28 },
  copy: { fontSize: 11, lineHeight: 16, marginTop: 3 },
  link: { fontSize: 11, fontWeight: '900' },
  locationCard: { marginTop: 14, padding: 13 },
  locationHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  noticeTitle: { fontSize: 13, fontWeight: '900' },
  locationAction: { minHeight: 38, paddingHorizontal: 12, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  error: { fontSize: 11, lineHeight: 16, marginTop: 8 },
  searchRow: { height: 48, borderWidth: 1, paddingHorizontal: 12, flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  searchInput: { flex: 1, fontSize: 12 },
  searchAction: { minWidth: 48, minHeight: 42, alignItems: 'center', justifyContent: 'center' },
  placeResults: { borderWidth: 1, marginTop: 6, overflow: 'hidden' },
  placeResult: { paddingHorizontal: 12, paddingVertical: 10 },
  placeResultTitle: { fontSize: 12, fontWeight: '800' },
  quickLabel: { fontSize: 10, fontWeight: '800', marginTop: 14 },
  locationChips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginVertical: 9 },
  locationChip: { borderWidth: 1, paddingVertical: 8, paddingHorizontal: 12 },
  mapFrame: { height: 390, overflow: 'hidden', borderWidth: 1, backgroundColor: '#edf2ed', position: 'relative' },
  map: { flex: 1 },
  originMarker: { width: 21, height: 21, borderRadius: 12, borderWidth: 3, alignItems: 'center', justifyContent: 'center' },
  originDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#FFFFFF' },
  venueMarker: { width: 30, height: 30, borderWidth: 2, borderRadius: 16, alignItems: 'center', justifyContent: 'center', elevation: 3 },
  mapError: { position: 'absolute', top: 12, left: 12, right: 12, padding: 10, elevation: 4 },
  loadingBadge: { position: 'absolute', top: 12, right: 12, paddingHorizontal: 9, paddingVertical: 7, borderRadius: 18, flexDirection: 'row', alignItems: 'center', gap: 6, elevation: 3 },
  loadingText: { fontSize: 9, fontWeight: '800' },
  attribution: { fontSize: 9, lineHeight: 14, marginTop: 7 },
  testMapLabel: { position: 'absolute', left: 16, right: 16, bottom: 15, textAlign: 'center', fontSize: 10 },
  testMarker: { position: 'absolute', width: 31, height: 31, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  markerNumber: { color: '#FFFFFF', fontSize: 10, fontWeight: '900' },
  searchArea: { minHeight: 44, justifyContent: 'center', alignItems: 'center', borderWidth: 1, marginTop: 12 },
  selectedCard: { borderWidth: 1, padding: 14, marginTop: 12 },
  selectedHead: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  selectedTitle: { fontSize: 15, fontWeight: '900' },
  detailsButton: { marginTop: 12, minHeight: 44 },
});
