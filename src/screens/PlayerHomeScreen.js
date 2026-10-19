import React, { useCallback, useMemo, useState } from 'react';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import {
  FlatList,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import VenueCard from '../components/VenueCard';
import PlayerProfileDrawer from '../components/PlayerProfileDrawer';
import { useTheme } from '../context/ThemeContext';
import { filterAndSortVenues } from '../utils/venueDiscovery';

const LAHORE = { latitude: 31.5204, longitude: 74.3587, label: 'Lahore' };
const SPORTS = [
  { name: 'Futsal', image: require('../assets/sport-football.png') },
  { name: 'Cricket', image: require('../assets/sport-cricket.png') },
  { name: 'Badminton', image: require('../assets/sport-badminton.png') },
  { name: 'Padel', image: require('../assets/sport-padel.png') },
  { name: 'Basketball', image: require('../assets/sport-basketball.png') },
];

export default function PlayerHomeScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const { venues, grounds, reviews } = useSelector(state => state.venues);
  const [selectedSport, setSelectedSport] = useState('Futsal');
  const [profileDrawerVisible, setProfileDrawerVisible] = useState(false);
  const featured = useMemo(
    () =>
      filterAndSortVenues({
        venues: venues.filter(item => item.published),
        grounds,
        reviews,
        origin: LAHORE,
      }).slice(0, 6),
    [venues, grounds, reviews],
  );
  const openSearch = sport =>
    navigation.navigate('VenueSearch', { sport: sport || 'All' });
  const closeProfileDrawer = useCallback(
    () => setProfileDrawerVisible(false),
    [],
  );
  const edgePanGesture = useMemo(
    () =>
      Gesture.Pan()
        .activeOffsetX(-12)
        .runOnJS(true)
        .onEnd(event => {
          if (event.translationX < -42) setProfileDrawerVisible(true);
        }),
    [],
  );

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.topRow}>
          <View style={styles.brandIdentity}>
            <Text style={[styles.brand, { color: colors.ink }]}>
              PlaySpot<Text style={{ color: colors.primary }}>.</Text>
            </Text>
            <Text style={[styles.location, { color: colors.inkSoft }]}>
              ⌖ Lahore · demo area
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open profile drawer"
            testID="player-open-profile"
            onPress={() => setProfileDrawerVisible(true)}
            style={[
              styles.avatar,
              { backgroundColor: colors.limePale, borderRadius: radius.pill },
            ]}
          >
            <Text style={[styles.avatarText, { color: colors.primary }]}>
              {currentUser?.name?.[0]?.toUpperCase() || 'P'}
            </Text>
          </Pressable>
        </View>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Search sports venues"
          testID="player-home-search"
          onPress={() => openSearch('All')}
          style={[
            styles.search,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={{ color: colors.inkSoft, fontSize: 18 }}>⌕</Text>
          <Text style={[styles.searchText, { color: colors.inkSoft }]}>
            Search sport, venue or area
          </Text>
          <Text style={[styles.searchIcon, { color: colors.primary }]}>⌖</Text>
        </Pressable>

        <View style={styles.sectionHead}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>
            Choose your sport
          </Text>
          <Pressable onPress={() => openSearch('All')}>
            <Text style={[styles.link, { color: colors.primary }]}>
              See all
            </Text>
          </Pressable>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.sportList}
        >
          {SPORTS.map(item => {
            const selected = selectedSport === item.name;
            return (
              <Pressable
                key={item.name}
                accessibilityRole="button"
                accessibilityState={{ selected }}
                accessibilityLabel={`Find ${item.name} venues`}
                testID={`home-sport-${item.name.toLowerCase()}`}
                onPress={() => {
                  setSelectedSport(item.name);
                  openSearch(item.name === 'Futsal' ? 'Football' : item.name);
                }}
                style={[
                  styles.sportCard,
                  {
                    backgroundColor: selected
                      ? colors.limePale
                      : colors.surface,
                    borderColor: selected ? colors.primary : colors.border,
                    borderRadius: radius.md,
                  },
                ]}
              >
                <Image
                  source={item.image}
                  style={styles.sportImage}
                  resizeMode="contain"
                />
                <Text style={[styles.sportName, { color: colors.ink }]}>
                  {item.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>

        <View
          style={[
            styles.promo,
            { backgroundColor: colors.primary, borderRadius: radius.lg },
          ]}
        >
          <View style={styles.promoText}>
            <Text style={styles.promoEyebrow}>YOUR NEXT GAME STARTS HERE</Text>
            <Text style={styles.promoTitle}>Find a place to play</Text>
            <Text style={styles.promoCopy}>
              Explore demo venues around Lahore.
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            testID="player-explore-venues"
            onPress={() => openSearch('All')}
            style={styles.promoButton}
          >
            <Text style={[styles.promoButtonText, { color: colors.primary }]}>
              Explore ›
            </Text>
          </Pressable>
        </View>

        <View style={styles.sectionHead}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.ink }]}>
              Nearby venues
            </Text>
            <Text style={[styles.sectionHint, { color: colors.inkSoft }]}>
              Fictional listings · approximate locations
            </Text>
          </View>
          <Pressable
            accessibilityRole="button"
            onPress={() => navigation.navigate('VenueMap')}
          >
            <Text style={[styles.link, { color: colors.primary }]}>Map</Text>
          </Pressable>
        </View>
        <FlatList
          data={featured}
          scrollEnabled={false}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <VenueCard
              venue={item}
              onPress={() =>
                navigation.navigate('VenueDetails', { venueId: item.id })
              }
            />
          )}
          ListEmptyComponent={
            <Text style={[styles.empty, { color: colors.inkSoft }]}>
              No published demo venues yet.
            </Text>
          }
        />
        <Pressable
          accessibilityRole="button"
          onPress={() => navigation.navigate('GameRooms')}
          style={[
            styles.gamesLink,
            {
              backgroundColor: colors.surface,
              borderColor: colors.border,
              borderRadius: radius.md,
            },
          ]}
        >
          <Text style={[styles.gamesTitle, { color: colors.ink }]}>
            Looking for teammates?
          </Text>
          <Text style={[styles.link, { color: colors.primary }]}>
            Explore game rooms ›
          </Text>
        </Pressable>
        <Text style={[styles.disclaimer, { color: colors.inkSoft }]}>
          Sample venues, images and locations are demo data and may not reflect
          real places.
        </Text>
      </ScrollView>
      <GestureDetector gesture={edgePanGesture}>
        <View
          testID="player-drawer-edge-gesture"
          accessible={false}
          style={styles.drawerEdgeGesture}
        />
      </GestureDetector>
      <PlayerProfileDrawer
        visible={profileDrawerVisible}
        onClose={closeProfileDrawer}
        navigation={navigation}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 24 },
  topRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    gap: 12,
  },
  brandIdentity: { flex: 1 },
  brand: { fontSize: 25, fontWeight: '900', letterSpacing: -0.8 },
  location: { fontSize: 11, marginTop: 3 },
  avatar: {
    width: 39,
    height: 39,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { fontWeight: '900', fontSize: 16 },
  drawerEdgeGesture: {
    position: 'absolute',
    top: 0,
    left: 0,
    bottom: 0,
    width: 18,
    zIndex: 3,
  },
  search: {
    height: 50,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 21,
  },
  searchText: { fontSize: 13, flex: 1 },
  searchIcon: { fontSize: 17 },
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 1,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 17, fontWeight: '900' },
  sectionHint: { fontSize: 10, marginTop: 3 },
  link: { fontSize: 12, fontWeight: '800' },
  sportList: { gap: 10, paddingBottom: 20 },
  sportCard: {
    width: 86,
    height: 94,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 9,
  },
  sportImage: { width: 39, height: 39, marginBottom: 7 },
  sportName: { fontSize: 10, fontWeight: '800' },
  promo: {
    minHeight: 128,
    padding: 17,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 22,
  },
  promoText: { flex: 1 },
  promoEyebrow: {
    fontSize: 8,
    color: '#E3F6EA',
    fontWeight: '900',
    letterSpacing: 1.1,
  },
  promoTitle: {
    color: '#FFFFFF',
    fontSize: 19,
    fontWeight: '900',
    marginTop: 6,
  },
  promoCopy: { color: '#E3F6EA', fontSize: 10, marginTop: 4 },
  promoButton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 11,
  },
  promoButtonText: { fontWeight: '900', fontSize: 11 },
  empty: { padding: 16 },
  gamesLink: {
    minHeight: 58,
    borderWidth: 1,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  gamesTitle: { fontSize: 12, fontWeight: '800' },
  disclaimer: { textAlign: 'center', fontSize: 9, marginVertical: 18 },
});
