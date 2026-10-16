import React, { useMemo } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import { DesignCard, InlineNotice } from '../components/DesignPrimitives';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { selectBookingsForVendor } from '../store/selectors/bookingSelectors';
import { selectGroundsByVenueId, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';
import { buildVendorAnalytics, calculateTodayAndUpcomingBookings } from '../utils/vendorAnalytics';

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 20, paddingBottom: 34 },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metric: { flex: 1, padding: 12, borderRadius: 14 },
  metricValue: { fontSize: 19, fontWeight: '900' }, metricLabel: { fontSize: 9, marginTop: 4, lineHeight: 13 },
  chartRow: { flexDirection: 'row', alignItems: 'flex-end', height: 142, gap: 8, marginTop: 18 },
  chartColumn: { flex: 1, height: '100%', alignItems: 'center', justifyContent: 'flex-end' },
  chartValue: { fontSize: 9, marginBottom: 5, fontWeight: '800' },
  barTrack: { height: 100, width: '72%', justifyContent: 'flex-end', borderRadius: 8, overflow: 'hidden' },
  bar: { width: '100%', borderTopLeftRadius: 8, borderTopRightRadius: 8, minHeight: 3 },
  month: { fontSize: 9, marginTop: 6 },
  legend: { fontSize: 11, lineHeight: 17, marginTop: 10 },
  occupancyRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth },
});

export default function VendorAnalyticsScreen() {
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const bookings = useSelector(state => selectBookingsForVendor(state, user?.id || ''));
  const venueIds = new Set(venues.map(venue => venue.id));
  const grounds = useSelector(state => state.venues.grounds.filter(ground => venueIds.has(ground.venueId)));
  const groundIds = new Set(grounds.map(ground => ground.id));
  const slots = useSelector(state => state.venues.slots.filter(slot => groundIds.has(slot.groundId)));
  const series = useMemo(() => buildVendorAnalytics({ bookings, grounds, slots }), [bookings, grounds, slots]);
  const today = useMemo(() => calculateTodayAndUpcomingBookings(bookings, [...venueIds]), [bookings, venues]);
  const current = series[series.length - 1];
  const maxBookings = Math.max(1, ...series.map(item => item.bookings));
  const maxRevenue = Math.max(1, ...series.map(item => item.revenuePKR));
  const prior = series[series.length - 2];
  const revenueGrowth = prior?.revenuePKR ? Math.round(((current.revenuePKR - prior.revenuePKR) / prior.revenuePKR) * 100) : null;
  const metric = (value, label) => <View style={[styles.metric, { backgroundColor: colors.limePale }]}><Text style={[styles.metricValue, { color: colors.primaryDark }]}>{value}</Text><Text style={[styles.metricLabel, { color: colors.inkSoft }]}>{label}</Text></View>;
  const chart = (key, label, max, format) => <DesignCard><Text style={[styles.cardTitle, { color: colors.ink }]}>{label} by month</Text><View style={styles.chartRow}>{series.map(item => {
    const ratio = Math.max(0, item[key] / max);
    return <View key={`${key}-${item.key}`} style={styles.chartColumn}><Text style={[styles.chartValue, { color: colors.inkSoft }]}>{format(item[key])}</Text><View style={[styles.barTrack, { backgroundColor: colors.canvas }]}><View style={[styles.bar, { height: `${Math.max(item[key] > 0 ? 4 : 0, ratio * 100)}%`, backgroundColor: item.isDemoSeed ? colors.blue : colors.primary }]} /></View><Text style={[styles.month, { color: colors.inkSoft }]}>{item.label}</Text></View>;
  })}</View><Text style={[styles.legend, { color: colors.inkSoft }]}>Blue bars are seeded demo history. Green is this month’s local booking data.</Text></DesignCard>;
  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content}>
    <ScreenHeader title="Venue analytics" subtitle="Six seeded months plus current activity" />
    <InlineNotice>The six historical months are fictional seed data. This month is calculated from bookings and bookable slot hours saved on this device.</InlineNotice>
    <DesignCard><Text style={[styles.cardTitle, { color: colors.ink }]}>This month</Text><View style={styles.metricRow}>{metric(current.bookings, 'BOOKINGS')}{metric(`PKR ${current.revenuePKR.toLocaleString()}`, 'BOOKED VALUE')}{metric(`${current.occupancyPercent}%`, 'OCCUPANCY')}</View><View style={styles.metricRow}>{metric(today.today, 'TODAY')}{metric(today.upcoming, 'UPCOMING')}{metric(current.growthPercent === null ? '—' : `${current.growthPercent > 0 ? '+' : ''}${current.growthPercent}%`, 'BOOKING GROWTH')}</View><Text style={[styles.legend, { color: colors.inkSoft }]}>Revenue change vs prior month: {revenueGrowth === null ? 'not available' : `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%`}. Occupancy is booked hours divided by available or reserved hours in the saved schedule for this month; blocked slots are excluded and no listed hours reports 0%.</Text></DesignCard>
    {chart('bookings', 'Bookings', maxBookings, value => String(value))}
    {chart('revenuePKR', 'Booked value · PKR', maxRevenue, value => value >= 1000 ? `${Math.round(value / 1000)}k` : String(value))}
    <DesignCard><Text style={[styles.cardTitle, { color: colors.ink }]}>Monthly occupancy</Text>{series.map(item => <View key={`occ-${item.key}`} style={[styles.occupancyRow, { borderColor: colors.border }]}><Text style={{ color: colors.ink }}>{item.label}{item.isDemoSeed ? ' · demo' : ' · local'}</Text><Text style={{ color: colors.primary, fontWeight: '900' }}>{item.occupancyPercent}%</Text></View>)}</DesignCard>
  </ScrollView></SafeAreaView>;
}
