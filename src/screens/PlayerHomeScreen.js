import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import { useTheme } from '../context/ThemeContext';
import { endSession } from '../services/authRepository';
import { sessionEnded } from '../store/authSlice';

export default function PlayerHomeScreen() {
  const dispatch = useDispatch();
  const { currentUser, storageNotice } = useSelector(state => state.auth);
  const { colors, radius } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const logout = async () => {
    setLoading(true);
    setError('');
    try {
      await endSession();
      dispatch(sessionEnded());
    } catch (requestError) {
      setError(requestError.message || 'Could not clear the local demo session.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
            <Text style={[styles.brandBall, { color: colors.primary }]}>●</Text>
          </View>
          <Text style={[styles.brand, { color: colors.ink }]}>PlaySpot <Text style={{ color: colors.primary }}>PK</Text></Text>
          <View style={[styles.roleBadge, { backgroundColor: colors.limePale, borderRadius: radius.pill }]}>
            <Text style={[styles.roleBadgeText, { color: colors.primaryDark }]}>PLAYER</Text>
          </View>
        </View>

        <View style={[styles.hero, { backgroundColor: colors.navy, borderRadius: radius.lg }]}>
          <Text style={[styles.eyebrow, { color: colors.lime }]}>YOUR PLAYER PROFILE</Text>
          <Text style={styles.title}>Welcome, {currentUser?.name || 'Player'}.</Text>
          <Text style={styles.subtitle}>Your local PlaySpot player account is ready.</Text>
        </View>

        {storageNotice ? (
          <View style={[styles.notice, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
            <Text style={[styles.noticeText, { color: colors.ink }]}>{storageNotice}</Text>
          </View>
        ) : null}

        <View style={[styles.profileCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.sectionLabel, { color: colors.inkSoft }]}>ACCOUNT DETAILS</Text>
          <Text style={[styles.name, { color: colors.ink }]}>{currentUser?.name}</Text>
          <Text style={[styles.detail, { color: colors.inkSoft }]}>{currentUser?.email}</Text>
          <Text style={[styles.detail, { color: colors.inkSoft }]}>{currentUser?.phone}</Text>
          <View style={styles.sportsWrap}>
            {(currentUser?.preferredSports || []).map(sport => (
              <View key={sport} style={[styles.sportChip, { backgroundColor: colors.limePale, borderRadius: radius.pill }]}>
                <Text style={[styles.sportChipText, { color: colors.primaryDark }]}>{sport}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={[styles.nextCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
          <Text style={[styles.nextEyebrow, { color: colors.primary }]}>DAY 1 COMPLETE</Text>
          <Text style={[styles.nextTitle, { color: colors.ink }]}>Your account is saved locally</Text>
          <Text style={[styles.nextCopy, { color: colors.inkSoft }]}>
            Venue discovery and booking screens are outside today’s auth setup. Your profile and role will be restored when you reopen this demo.
          </Text>
        </View>

        {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <AppButton
          title="Log out of demo account"
          testID="player-logout"
          variant="secondary"
          onPress={logout}
          loading={loading}
          disabled={loading}
          style={styles.logout}
        />
        <Text style={[styles.footer, { color: colors.inkSoft }]}>Local frontend demo · no server authenticated this account</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 22, paddingTop: 10, paddingBottom: 28 },
  brandRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20 },
  brandMark: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 9 },
  brandBall: { fontSize: 17, fontWeight: '900' },
  brand: { fontSize: 18, fontWeight: '900', letterSpacing: -0.3 },
  roleBadge: { marginLeft: 'auto', paddingHorizontal: 11, paddingVertical: 7 },
  roleBadgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 1 },
  hero: { padding: 21, marginBottom: 14 },
  eyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1.2 },
  title: { color: '#FFFFFF', fontSize: 27, lineHeight: 34, fontWeight: '900', marginTop: 8 },
  subtitle: { color: '#CBD9CF', fontSize: 13, lineHeight: 20, marginTop: 5 },
  notice: { padding: 12, marginBottom: 14 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  profileCard: { borderWidth: 1, padding: 17, marginBottom: 14 },
  sectionLabel: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  name: { fontSize: 18, fontWeight: '800', marginTop: 10 },
  detail: { fontSize: 12, marginTop: 5 },
  sportsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: 7, marginTop: 14 },
  sportChip: { paddingHorizontal: 10, paddingVertical: 6 },
  sportChipText: { fontSize: 10, fontWeight: '800' },
  nextCard: { borderWidth: 1, padding: 17, marginBottom: 18 },
  nextEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  nextTitle: { fontSize: 16, fontWeight: '800', marginTop: 8 },
  nextCopy: { fontSize: 12, lineHeight: 19, marginTop: 6 },
  error: { fontSize: 12, marginBottom: 10 },
  logout: { marginTop: 2 },
  footer: { textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 12 },
});
