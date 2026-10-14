import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import VenueArtwork from './VenueArtwork';

export default function VenueCard({ venue, onPress, compact = false }) {
  const { colors, radius } = useTheme();
  const ground = venue.grounds?.[0];
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${venue.name} details`} testID={`venue-card-${venue.id}`} onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, opacity: pressed ? 0.86 : 1 }, compact ? styles.compact : null]}>
      <VenueArtwork sport={ground?.sport || venue.sports?.[0]} compact />
      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.title, { color: colors.ink }]}>{venue.name}</Text>
        <Text numberOfLines={1} style={[styles.sub, { color: colors.inkSoft }]}>{venue.locationNote || venue.city} · {venue.sports?.join(', ')}</Text>
        <View style={styles.meta}>
          <Text style={[styles.rating, { color: colors.orange }]}>★ {venue.rating?.count ? venue.rating.average.toFixed(1) : 'New'}</Text>
          <Text style={[styles.metaText, { color: colors.inkSoft }]}>{venue.distance === null ? 'Distance unavailable' : `${venue.distance.toFixed(1)} km`}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>{venue.price ? `PKR ${venue.price.toLocaleString()}/hr` : 'Price on request'}</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  compact: { width: 248, marginRight: 12 },
  body: { padding: 13 },
  title: { fontSize: 15, fontWeight: '800' },
  sub: { fontSize: 11, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 9, marginTop: 10 },
  rating: { fontSize: 12, fontWeight: '900' },
  metaText: { fontSize: 11 },
  price: { fontSize: 11, fontWeight: '800', marginLeft: 'auto' },
});
