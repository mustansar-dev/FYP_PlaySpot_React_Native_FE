import React, { useState } from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import AppButton from '../components/AppButton';
import { useTheme } from '../context/ThemeContext';
import { startSession } from '../services/authRepository';
import { sessionStarted } from '../store/authSlice';

export default function RegistrationSuccessScreen({ route }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const { userId, name, role } = route.params || {};
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const continueToApp = async () => {
    if (loading) {
      return;
    }
    setLoading(true);
    setError('');
    try {
      const session = await startSession(userId);
      dispatch(sessionStarted(session));
    } catch (requestError) {
      setError(requestError.message || 'Could not open the new demo account.');
    } finally {
      setLoading(false);
    }
  };

  const isVendor = role === 'vendor';

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <View style={styles.content}>
        <View style={[styles.successMark, { backgroundColor: colors.limePale, borderRadius: radius.lg }]}>
          <Text style={[styles.check, { color: colors.primary }]}>✓</Text>
        </View>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>ACCOUNT CREATED</Text>
        <Text style={[styles.title, { color: colors.ink }]}>You’re in, {name || 'player'}.</Text>
        <Text style={[styles.body, { color: colors.inkSoft }]}>
          {isVendor
            ? 'Your venue provider profile is saved on this device. Continue to the vendor demo dashboard.'
            : 'Your player profile is saved on this device. Continue to your PlaySpot demo home.'}
        </Text>
        <View style={[styles.demoLabel, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.demoLabelText, { color: colors.inkSoft }]}>LOCAL FRONTEND DEMO · NO SERVER ACCOUNT CREATED</Text>
        </View>
        {error ? <Text accessibilityRole="alert" testID="registration-success-error" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
        <AppButton
          title={isVendor ? 'Open vendor dashboard' : 'Start exploring'}
          testID="registration-success-continue"
          onPress={continueToApp}
          disabled={loading}
          style={styles.button}
        />
        {loading ? <ActivityIndicator style={styles.loading} color={colors.primary} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { flex: 1, justifyContent: 'center', padding: 26 },
  successMark: { width: 78, height: 78, alignItems: 'center', justifyContent: 'center', marginBottom: 25 },
  check: { fontSize: 42, fontWeight: '900' },
  eyebrow: { fontSize: 11, fontWeight: '900', letterSpacing: 1.5 },
  title: { fontSize: 30, lineHeight: 37, letterSpacing: -0.7, fontWeight: '900', marginTop: 8 },
  body: { fontSize: 15, lineHeight: 23, marginTop: 12 },
  demoLabel: { borderWidth: 1, padding: 12, marginTop: 22, marginBottom: 18 },
  demoLabelText: { fontSize: 10, fontWeight: '800', letterSpacing: 0.7 },
  error: { fontSize: 13, marginBottom: 10 },
  button: { marginTop: 3 },
  loading: { marginTop: 14 },
});
