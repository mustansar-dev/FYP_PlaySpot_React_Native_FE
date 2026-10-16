import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const SPORT_COLORS = {
  Futsal: '#C8F36B',
  Football: '#A8E8C0',
  Cricket: '#F4C887',
  Padel: '#A9D6EF',
  Badminton: '#C9B8F2',
};

/** Local code-drawn venue art keeps screens useful when no photo was selected. */
export default function VenueArtwork({ sport = 'Sports', compact = false, style }) {
  const { colors, radius } = useTheme();
  return (
    <View
      accessible
      accessibilityLabel={`${sport} venue illustration placeholder`}
      style={[
        styles.art,
        compact ? styles.compact : null,
        { backgroundColor: SPORT_COLORS[sport] || colors.limePale, borderRadius: radius.md },
        style,
      ]}
    >
      <View style={styles.field}>
        <View style={styles.centerLine} />
        <View style={styles.centerCircle} />
        <View style={[styles.goal, styles.leftGoal]} />
        <View style={[styles.goal, styles.rightGoal]} />
      </View>
      <Text style={styles.caption}>{String(sport).toUpperCase()} · DEMO ART</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  art: { height: 118, padding: 12, justifyContent: 'space-between', overflow: 'hidden' },
  compact: { height: 78 },
  field: { flex: 1, borderWidth: 1, borderColor: 'rgba(16,34,27,0.35)', borderRadius: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  centerLine: { position: 'absolute', top: 0, bottom: 0, width: 1, backgroundColor: 'rgba(16,34,27,0.35)' },
  centerCircle: { width: 32, height: 32, borderWidth: 1, borderColor: 'rgba(16,34,27,0.35)', borderRadius: 16 },
  goal: { position: 'absolute', height: 27, width: 12, top: '35%', borderWidth: 1, borderColor: 'rgba(16,34,27,0.35)' },
  leftGoal: { left: 0, borderLeftWidth: 0 },
  rightGoal: { right: 0, borderRightWidth: 0 },
  caption: { color: '#173427', fontSize: 8, fontWeight: '900', letterSpacing: 1, marginTop: 6 },
});
