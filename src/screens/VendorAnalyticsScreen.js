import React, { useEffect, useMemo, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import { DesignCard, InlineNotice } from '../components/DesignPrimitives';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { DEMO_MODE } from '../config/backendApi';
import { backendApi } from '../services/backendApi';
import { selectBookingsForVendor } from '../store/selectors/bookingSelectors';
import {
  selectGroundsByVenueId,
  selectVenuesByOwnerId,
} from '../store/selectors/venueSelectors';
import {
  buildVendorAnalytics,
  calculateTodayAndUpcomingBookings,
} from '../utils/vendorAnalytics';

function pakistanDateKey(value) {
  const local = new Date(value.getTime() + 5 * 60 * 60 * 1000);
  return `${local.getUTCFullYear()}-${String(local.getUTCMonth() + 1).padStart(2, '0')}-${String(local.getUTCDate()).padStart(2, '0')}`;
}

function shiftDateByMonths(dateKey, monthDelta) {
  const [year, month, day] = dateKey.split('-').map(Number);
  const monthStart = new Date(Date.UTC(year, month - 1 + monthDelta, 1));
  const lastDay = new Date(Date.UTC(monthStart.getUTCFullYear(), monthStart.getUTCMonth() + 1, 0)).getUTCDate();
  monthStart.setUTCDate(Math.min(day, lastDay));
  return monthStart.toISOString().slice(0, 10);
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingBottom: 34 },
  cardTitle: { fontSize: 14, fontWeight: '900' },
  metricRow: { flexDirection: 'row', gap: 8, marginTop: 12 },
  metric: { flex: 1, padding: 12, borderRadius: 14 },
  metricValue: { fontSize: 19, fontWeight: '900' },
  metricLabel: { fontSize: 9, marginTop: 4, lineHeight: 13 },
  chartRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    height: 142,
    gap: 8,
    marginTop: 18,
  },
  chartColumn: {
    flex: 1,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },
  chartValue: { fontSize: 9, marginBottom: 5, fontWeight: '800' },
  barTrack: {
    height: 100,
    width: '72%',
    justifyContent: 'flex-end',
    borderRadius: 8,
    overflow: 'hidden',
  },
  bar: {
    width: '100%',
    borderTopLeftRadius: 8,
    borderTopRightRadius: 8,
    minHeight: 3,
  },
  month: { fontSize: 9, marginTop: 6 },
  legend: { fontSize: 11, lineHeight: 17, marginTop: 10 },
  occupancyRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 9,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  rangeRow: { flexDirection: 'row', gap: 10, marginTop: 12 },
  rangeField: { flex: 1 },
  rangeLabel: { fontSize: 10, fontWeight: '800', marginBottom: 5 },
  rangeInput: { minHeight: 44, borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, fontSize: 12 },
});

function LiveDailyChart({ rows, valueKey, title, formatValue, colors }) {
  const maxValue = Math.max(1, ...rows.map(row => Number(row[valueKey]) || 0));
  return (
    <DesignCard>
      <Text style={[styles.cardTitle, { color: colors.ink }]}>{title}</Text>
      {rows.length ? <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[styles.chartRow, { minWidth: Math.max(320, rows.length * 48) }]}>
          {rows.map(row => {
            const value = Number(row[valueKey]) || 0;
            const height = value > 0 ? Math.max(4, value / maxValue * 100) : 0;
            return <View key={`${valueKey}-${row.date}`} style={[styles.chartColumn, { flex: 0, width: 43 }]}>
              <Text numberOfLines={1} style={[styles.chartValue, { color: colors.inkSoft }]}>{formatValue(value)}</Text>
              <View style={[styles.barTrack, { backgroundColor: colors.canvas }]}>
                <View style={[styles.bar, { height: `${height}%`, backgroundColor: colors.primary }]} />
              </View>
              <Text style={[styles.month, { color: colors.inkSoft }]}>{row.date.slice(5)}</Text>
            </View>;
          })}
        </View>
      </ScrollView> : <Text style={[styles.legend, { color: colors.inkSoft }]}>No daily data is available for this period.</Text>}
    </DesignCard>
  );
}

export default function VendorAnalyticsScreen({ navigation }) {
  const { colors } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const [remoteAnalytics, setRemoteAnalytics] = useState(null);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteError, setRemoteError] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const [registrationDate, setRegistrationDate] = useState(() => user?.vendorProfile?.createdAt ? pakistanDateKey(new Date(user.vendorProfile.createdAt)) : null);
  const [period, setPeriod] = useState(() => {
    const today = pakistanDateKey(new Date());
    return { from: `${today.slice(0, 8)}01`, to: today };
  });
  const [draftPeriod, setDraftPeriod] = useState(period);
  const [selectedRange, setSelectedRange] = useState('This month');
  useEffect(() => {
    if (DEMO_MODE || user?.role !== 'vendor') return;
    let active = true;
    setRemoteLoading(true);
    setRemoteError('');
    backendApi.vendorAnalytics(period).then(data => {
      if (!active) return;
      setRemoteAnalytics(data);
      if (data.registeredOn) setRegistrationDate(data.registeredOn);
    })
      .catch(error => {
        if (!active) return;
        if (error.code === 'ANALYTICS_BEFORE_REGISTRATION' && error.details?.[0]?.registeredOn) setRegistrationDate(error.details[0].registeredOn);
        setRemoteError(error.message);
      })
      .finally(() => { if (active) setRemoteLoading(false); });
    return () => { active = false; };
  }, [period, refreshCount, user?.id, user?.role]);
  useEffect(() => navigation?.addListener?.('focus', () => setRefreshCount(count => count + 1)), [navigation]);
  const venues = useSelector(state =>
    selectVenuesByOwnerId(state, user?.id || ''),
  );
  const bookings = useSelector(state =>
    selectBookingsForVendor(state, user?.id || ''),
  );
  const venueIds = new Set(venues.map(venue => venue.id));
  const grounds = useSelector(state =>
    state.venues.grounds.filter(ground => venueIds.has(ground.venueId)),
  );
  const groundIds = new Set(grounds.map(ground => ground.id));
  const slots = useSelector(state =>
    state.venues.slots.filter(slot => groundIds.has(slot.groundId)),
  );
  const series = useMemo(
    () => buildVendorAnalytics({ bookings, grounds, slots }),
    [bookings, grounds, slots],
  );
  const today = useMemo(
    () => calculateTodayAndUpcomingBookings(bookings, [...venueIds]),
    [bookings, venues],
  );
  const current = series[series.length - 1];
  const maxBookings = Math.max(1, ...series.map(item => item.bookings));
  const maxRevenue = Math.max(1, ...series.map(item => item.revenuePKR));
  const prior = series[series.length - 2];
  const revenueGrowth = prior?.revenuePKR
    ? Math.round(
        ((current.revenuePKR - prior.revenuePKR) / prior.revenuePKR) * 100,
      )
    : null;
  const metric = (value, label) => (
    <View style={[styles.metric, { backgroundColor: colors.limePale }]}>
      <Text style={[styles.metricValue, { color: colors.primaryDark }]}>
        {value}
      </Text>
      <Text style={[styles.metricLabel, { color: colors.inkSoft }]}>
        {label}
      </Text>
    </View>
  );
  if (!DEMO_MODE) {
    const money = value => `PKR ${Number(value || 0).toLocaleString()}`;
    const todayKey = pakistanDateKey(new Date());
    const registeredOn = registrationDate;
    const setRangeMonths = months => {
      const from = months === 1 ? `${todayKey.slice(0, 8)}01` : shiftDateByMonths(todayKey, -months);
      setDraftPeriod({ from, to: todayKey });
      setPeriod({ from, to: todayKey });
      setSelectedRange(months === 1 ? 'This month' : months === 12 ? '1 year' : `${months} months`);
      setRemoteError('');
    };
    const applyCustomRange = () => {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(draftPeriod.from) || !/^\d{4}-\d{2}-\d{2}$/.test(draftPeriod.to)
        || draftPeriod.from > draftPeriod.to || draftPeriod.to > todayKey
        || (registeredOn && draftPeriod.from < registeredOn)
        || new Date(`${draftPeriod.to}T00:00:00Z`).getTime() > (() => { const end = new Date(`${draftPeriod.from}T00:00:00Z`); end.setUTCFullYear(end.getUTCFullYear() + 1); return end.getTime(); })()) {
        setRemoteError(`Choose valid dates from ${registeredOn || 'your registration'} through ${todayKey}, within a one-year period.`);
        return;
      }
      setPeriod({ ...draftPeriod });
      setSelectedRange('Custom');
      setRemoteError('');
    };
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
        <ScrollView contentContainerStyle={styles.content}>
          <ScreenHeader title="Vendor analytics" subtitle="Choose a period from your registration date through today, up to one year." eyebrow="LIVE REPORT" />
          <ChoiceChips label="Reporting period" options={['This month', '3 months', '6 months', '1 year', 'Custom']} selected={selectedRange} onSelect={value => value === 'Custom' ? setSelectedRange(value) : setRangeMonths(value === 'This month' ? 1 : value === '3 months' ? 3 : value === '6 months' ? 6 : 12)} testID="vendor-analytics-period" />
          <View style={styles.rangeRow}>
            <View style={styles.rangeField}><Text style={[styles.rangeLabel, { color: colors.inkSoft }]}>From · YYYY-MM-DD</Text><TextInput accessibilityLabel="Analytics start date" testID="vendor-analytics-from" value={draftPeriod.from} onChangeText={value => setDraftPeriod(current => ({ ...current, from: value }))} autoCapitalize="none" placeholder="2026-01-01" placeholderTextColor={colors.muted} style={[styles.rangeInput, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
            <View style={styles.rangeField}><Text style={[styles.rangeLabel, { color: colors.inkSoft }]}>To · YYYY-MM-DD</Text><TextInput accessibilityLabel="Analytics end date" testID="vendor-analytics-to" value={draftPeriod.to} onChangeText={value => setDraftPeriod(current => ({ ...current, to: value }))} autoCapitalize="none" placeholder={todayKey} placeholderTextColor={colors.muted} style={[styles.rangeInput, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border }]} /></View>
          </View>
          <AppButton title="Apply date range" variant="secondary" testID="vendor-analytics-apply-range" onPress={applyCustomRange} style={{ marginBottom: 12 }} />
          <AppButton title={remoteLoading ? 'Refreshing live charts…' : 'Refresh live charts'} variant="secondary" testID="vendor-analytics-refresh" loading={remoteLoading} disabled={remoteLoading} onPress={() => setRefreshCount(count => count + 1)} style={{ marginBottom: 12 }} />
          <InlineNotice>Charts use your live bookings and verified payment data for this period.</InlineNotice>
          {remoteLoading ? <InlineNotice>Loading live analytics…</InlineNotice> : null}
          {remoteError ? <InlineNotice tone="danger">{remoteError}</InlineNotice> : null}
          {remoteAnalytics ? <>
            <DesignCard>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>Period</Text>
              <Text style={[styles.legend, { color: colors.inkSoft }]}>{remoteAnalytics.from || period.from} to {remoteAnalytics.to || period.to}</Text>
              <View style={styles.metricRow}>
                {metric(String(remoteAnalytics.bookingCount || 0), 'Bookings')}
                {metric(money(remoteAnalytics.paidRevenuePKR), 'Verified revenue')}
                {metric(`${Number(remoteAnalytics.occupancyPercent || 0).toFixed(1)}%`, 'Occupancy')}
              </View>
              <Text style={[styles.legend, { color: colors.inkSoft }]}>Booked court time: {Math.round(Number(remoteAnalytics.bookedCourtMinutes || 0) / 60)} hours</Text>
            </DesignCard>
            <DesignCard>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>Revenue by payment method</Text>
              {Object.entries(remoteAnalytics.revenueByMethod || {}).map(([method, paisa]) => <View key={method} style={styles.occupancyRow}><Text style={{ color: colors.ink }}>{method.replace('Paisa', '').replace(/([A-Z])/g, ' $1').replaceAll('_', ' ')}</Text><Text style={{ color: colors.ink, fontWeight: '800' }}>{money(Number(paisa) / 100)}</Text></View>)}
              {!Object.values(remoteAnalytics.revenueByMethod || {}).some(Number) ? <Text style={[styles.legend, { color: colors.inkSoft }]}>No verified payments in this period.</Text> : null}
            </DesignCard>
            <LiveDailyChart
              rows={remoteAnalytics.daily || []}
              valueKey="bookingCount"
              title="Bookings by day"
              formatValue={value => String(value)}
              colors={colors}
            />
            <LiveDailyChart
              rows={remoteAnalytics.daily || []}
              valueKey="paidRevenuePKR"
              title="Verified revenue by day"
              formatValue={value => value >= 1000 ? `${(value / 1000).toFixed(1)}k` : String(value)}
              colors={colors}
            />
          </> : !remoteLoading && !remoteError ? <InlineNotice>No analytics are available for this period yet.</InlineNotice> : null}
        </ScrollView>
      </SafeAreaView>
    );
  }
  const chart = (key, label, max, format) => (
    <DesignCard>
      <Text style={[styles.cardTitle, { color: colors.ink }]}>
        {label} by month
      </Text>
      <View style={styles.chartRow}>
        {series.map(item => {
          const ratio = Math.max(0, item[key] / max);
          return (
            <View key={`${key}-${item.key}`} style={styles.chartColumn}>
              <Text style={[styles.chartValue, { color: colors.inkSoft }]}>
                {format(item[key])}
              </Text>
              <View
                style={[styles.barTrack, { backgroundColor: colors.canvas }]}
              >
                <View
                  style={[
                    styles.bar,
                    {
                      height: `${Math.max(
                        item[key] > 0 ? 4 : 0,
                        ratio * 100,
                      )}%`,
                      backgroundColor: item.isDemoSeed
                        ? colors.blue
                        : colors.primary,
                    },
                  ]}
                />
              </View>
              <Text style={[styles.month, { color: colors.inkSoft }]}>
                {item.label}
              </Text>
            </View>
          );
        })}
      </View>
      <Text style={[styles.legend, { color: colors.inkSoft }]}>
        Blue bars are seeded demo history. Green is this month’s local booking
        data.
      </Text>
    </DesignCard>
  );
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <ScreenHeader
          title="Venue analytics"
          subtitle="Six seeded months plus current activity"
        />
        <InlineNotice>
          The six historical months are fictional seed data. This month is
          calculated from bookings and bookable slot hours saved on this device.
        </InlineNotice>
        <DesignCard>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>
            This month
          </Text>
          <View style={styles.metricRow}>
            {metric(current.bookings, 'BOOKINGS')}
            {metric(
              `PKR ${current.revenuePKR.toLocaleString()}`,
              'BOOKED VALUE',
            )}
            {metric(`${current.occupancyPercent}%`, 'OCCUPANCY')}
          </View>
          <View style={styles.metricRow}>
            {metric(today.today, 'TODAY')}
            {metric(today.upcoming, 'UPCOMING')}
            {metric(
              current.growthPercent === null
                ? '—'
                : `${current.growthPercent > 0 ? '+' : ''}${
                    current.growthPercent
                  }%`,
              'BOOKING GROWTH',
            )}
          </View>
          <Text style={[styles.legend, { color: colors.inkSoft }]}>
            Revenue change vs prior month:{' '}
            {revenueGrowth === null
              ? 'not available'
              : `${revenueGrowth > 0 ? '+' : ''}${revenueGrowth}%`}
            . Occupancy is booked hours divided by available or reserved hours
            in the saved schedule for this month; blocked slots are excluded and
            no listed hours reports 0%.
          </Text>
        </DesignCard>
        {chart('bookings', 'Bookings', maxBookings, value => String(value))}
        {chart('revenuePKR', 'Booked value · PKR', maxRevenue, value =>
          value >= 1000 ? `${Math.round(value / 1000)}k` : String(value),
        )}
        <DesignCard>
          <Text style={[styles.cardTitle, { color: colors.ink }]}>
            Monthly occupancy
          </Text>
          {series.map(item => (
            <View
              key={`occ-${item.key}`}
              style={[styles.occupancyRow, { borderColor: colors.border }]}
            >
              <Text style={{ color: colors.ink }}>
                {item.label}
                {item.isDemoSeed ? ' · demo' : ' · local'}
              </Text>
              <Text style={{ color: colors.primary, fontWeight: '900' }}>
                {item.occupancyPercent}%
              </Text>
            </View>
          ))}
        </DesignCard>
      </ScrollView>
    </SafeAreaView>
  );
}
