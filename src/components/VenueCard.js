import React from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';
import VenueArtwork from './VenueArtwork';

export default function VenueCard({ venue, onPress, compact = false }) {
  const { colors, radius } = useTheme();
  const ground = venue.grounds?.[0];
  const photo = venue.photoUris?.[0] || venue.photos?.find(item => item?.uri || item?.url);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={`Open ${venue.name} details`} testID={`venue-card-${venue.id}`} onPress={onPress}
      style={({ pressed }) => [styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md, opacity: pressed ? 0.86 : 1 }, compact ? styles.compact : null]}>
      {photo ? <Image source={{ uri: typeof photo === 'string' ? photo : photo.uri || photo.url }} style={styles.art} resizeMode="cover" /> : <VenueArtwork sport={ground?.sport || venue.sports?.[0]} compact style={styles.art} />}
      <View style={styles.body}>
        <View style={styles.titleRow}><Text numberOfLines={1} style={[styles.title, { color: colors.ink }]}>{venue.name}</Text><Text style={[styles.chevron, { color: colors.primary }]}>›</Text></View>
        <Text numberOfLines={1} style={[styles.sub, { color: colors.inkSoft }]}>{venue.locationNote || venue.city} · {venue.sports?.join(', ')}</Text>
        <View style={styles.meta}>
          <Text style={[styles.rating, { color: colors.orange }]}>★ {venue.rating?.count ? venue.rating.average.toFixed(1) : 'New'}</Text>
          <Text style={[styles.metaText, { color: colors.inkSoft }]}>{venue.distance === null ? 'Approx. Lahore area' : `${venue.distance.toFixed(1)} km`}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>{venue.price ? `PKR ${venue.price.toLocaleString()}/hr` : 'Price on request'}</Text>
        </View>
        <Text style={[styles.availability, { color: colors.primary }]}>Available to explore today</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { flexDirection: 'row', minHeight: 124, borderWidth: 1, overflow: 'hidden', marginBottom: 12 },
  compact: { width: 320, marginRight: 12 },
  art: { width: 98, height: '100%', minHeight: 122 },
  body: { flex: 1, padding: 12, justifyContent: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { fontSize: 14, fontWeight: '800', flex: 1 }, chevron: { fontSize: 21, fontWeight: '700' },
  sub: { fontSize: 10, marginTop: 4 },
  meta: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 7, marginTop: 9 },
  rating: { fontSize: 11, fontWeight: '900' }, metaText: { fontSize: 10 },
  price: { fontSize: 10, fontWeight: '800' }, availability: { fontSize: 10, fontWeight: '700', marginTop: 7 },
});
