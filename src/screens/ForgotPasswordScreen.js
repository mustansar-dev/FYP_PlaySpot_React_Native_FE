import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { isEmail } from '../utils/validation';

export default function ForgotPasswordScreen({ navigation }) {
  const { colors } = useTheme();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [checked, setChecked] = useState(false);

  const checkRecovery = () => {
    setChecked(false);
    if (!isEmail(email)) {
      setError('Enter a valid email address.');
      return;
    }
    setError('');
    setChecked(true);
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="ACCOUNT HELP"
            title="Forgot password?"
            subtitle="Password recovery is not connected in this local demo."
            onBack={() => navigation.goBack()}
          />
          <FormField
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={value => {
              setEmail(value);
              setError('');
              setChecked(false);
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            testID="forgot-email"
            error={error}
          />
          <AppButton
            title="Check recovery options"
            testID="forgot-submit"
            onPress={checkRecovery}
          />
          {checked ? (
            <Text accessibilityRole="alert" testID="forgot-local-message" style={[styles.message, { color: colors.inkSoft }]}>
              This demo cannot reset a password. No email or OTP was sent. Use a fictional demo account or create a new account on this device.
            </Text>
          ) : null}
          <AppButton
            title="Back to log in"
            testID="forgot-back-to-login"
            variant="quiet"
            onPress={() => navigation.navigate('Login')}
            style={styles.backButton}
          />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { flexGrow: 1, padding: 22, paddingTop: 14 },
  message: { fontSize: 13, lineHeight: 20, marginTop: 16 },
  backButton: { marginTop: 15 },
});
