import React, { useMemo } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { getVenueRating } from '../utils/venueDiscovery';

export default function VenueReviewsScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const venueId = route.params?.venueId;
  const { venues, reviews } = useSelector(state => state.venues);
  const venue = venues.find(item => item.id === venueId);
  const items = useMemo(() => reviews.filter(item => item.venueId === venueId).slice().sort((a, b) => b.createdAt.localeCompare(a.createdAt)), [reviews, venueId]);
  const rating = getVenueRating(items);
  const header = <View>
    <ScreenHeader title={venue?.name || 'Venue reviews'} subtitle="Player feedback · fictional local demo" onBack={() => navigation.goBack()} />
    <View style={[styles.summary, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={[styles.average, { color: colors.ink }]}>{rating.count ? rating.average.toFixed(1) : '—'}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.orange }}>★★★★★</Text><Text style={[styles.subtitle, { color: colors.inkSoft }]}>{rating.count} reviews</Text></View></View>
    {[5, 4, 3, 2, 1].map(stars => <View key={stars} style={styles.distribution}><Text style={[styles.distributionLabel, { color: colors.inkSoft }]}>{stars} ★</Text><View style={[styles.track, { backgroundColor: colors.border }]}><View style={[styles.fill, { backgroundColor: colors.orange, width: `${rating.count ? (rating.distribution[stars - 1] / rating.count) * 100 : 0}%` }]} /></View><Text style={[styles.distributionLabel, { color: colors.inkSoft }]}>{rating.distribution[stars - 1]}</Text></View>)}
    <AppButton title="Write a review" testID="reviews-add" onPress={() => navigation.navigate('AddReview', { venueId })} style={styles.addButton} />
  </View>;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><FlatList data={items} keyExtractor={item => item.id} ListHeaderComponent={header} ListEmptyComponent={<View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={[styles.itemName, { color: colors.ink }]}>No reviews yet</Text><Text style={[styles.subtitle, { color: colors.inkSoft }]}>Be the first player to share useful feedback.</Text></View>} contentContainerStyle={styles.content} renderItem={({ item }) => <View style={[styles.review, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><View style={styles.reviewHead}><Text style={[styles.itemName, { color: colors.ink }]}>{item.playerName}</Text><Text style={{ color: colors.orange, fontWeight: '900' }}>★ {item.stars}</Text></View><Text style={[styles.reviewCopy, { color: colors.inkSoft }]}>{item.comment}</Text><Text style={[styles.date, { color: colors.muted }]}>{new Date(item.createdAt).toLocaleDateString()}</Text></View>} /></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: 18, paddingBottom: 28 }, title: { fontSize: 21, fontWeight: '900' }, subtitle: { fontSize: 11, marginTop: 4 }, summary: { borderWidth: 1, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 14, marginBottom: 10 }, average: { fontSize: 30, fontWeight: '900' }, distribution: { flexDirection: 'row', alignItems: 'center', gap: 8, marginVertical: 3 }, distributionLabel: { width: 34, fontSize: 10 }, track: { flex: 1, height: 7, borderRadius: 5, overflow: 'hidden' }, fill: { height: 7 }, addButton: { marginVertical: 15, minHeight: 44 }, empty: { borderWidth: 1, padding: 15, marginBottom: 10 }, review: { borderWidth: 1, padding: 14, marginBottom: 9 }, reviewHead: { flexDirection: 'row', justifyContent: 'space-between' }, itemName: { fontSize: 12, fontWeight: '900' }, reviewCopy: { fontSize: 12, lineHeight: 18, marginTop: 8 }, date: { fontSize: 9, marginTop: 8 } });
