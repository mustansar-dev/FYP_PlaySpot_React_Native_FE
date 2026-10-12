import React, { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { signIn } from '../services/authRepository';
import { sessionStarted } from '../store/authSlice';
import { validateLogin } from '../utils/validation';

export default function LoginScreen({ navigation }) {
  const dispatch = useDispatch();
  const storageNotice = useSelector(state => state.auth.storageNotice);
  const { colors, radius } = useTheme();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  const handleLogin = async () => {
    if (loading) {
      return;
    }
    Keyboard.dismiss();
    const nextErrors = validateLogin({ email, password });
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await signIn(email, password);
      dispatch(sessionStarted(result));
    } catch (error) {
      setSubmitError(error.message || 'Unable to sign in on this device.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="GOOD TO SEE YOU"
            title="Log in"
            subtitle="Pick up where your next game begins."
            onBack={() => navigation.goBack()}
          />

          {storageNotice ? (
            <View style={[styles.notice, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
              <Text style={[styles.noticeText, { color: colors.ink }]}>{storageNotice}</Text>
            </View>
          ) : null}

          <FormField
            ref={emailRef}
            label="Email address"
            placeholder="you@example.com"
            value={email}
            onChangeText={value => {
              setEmail(value);
              setErrors(previous => ({ ...previous, email: undefined }));
              setSubmitError('');
            }}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="login-email"
            error={errors.email}
          />
          <FormField
            ref={passwordRef}
            label="Password"
            placeholder="Enter your password"
            value={password}
            onChangeText={value => {
              setPassword(value);
              setErrors(previous => ({ ...previous, password: undefined }));
              setSubmitError('');
            }}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={handleLogin}
            testID="login-password"
            error={errors.password}
          />

          {submitError ? (
            <Text accessibilityRole="alert" testID="login-error" style={[styles.submitError, { color: colors.error }]}>
              {submitError}
            </Text>
          ) : null}

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Forgot password"
            testID="login-forgot"
            onPress={() => navigation.navigate('ForgotPassword')}
            style={styles.forgot}
          >
            <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot password?</Text>
          </Pressable>

          <AppButton
            title="Log in"
            testID="login-submit"
            onPress={handleLogin}
            loading={loading}
            disabled={loading}
            style={styles.submit}
          />

          <View style={[styles.demoBox, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.demoEyebrow, { color: colors.primary }]}>FICTIONAL DEMO ACCOUNTS</Text>
            <Text style={[styles.demoLine, { color: colors.ink }]}>Player · player@playspot.pk · FieldDay2026</Text>
            <Text style={[styles.demoLine, { color: colors.ink }]}>Venue provider · vendor@playspot.pk · VenueDay2026</Text>
            <Text style={[styles.demoFoot, { color: colors.inkSoft }]}>These credentials are for this local demo only.</Text>
          </View>

          <View style={styles.signupRow}>
            <Text style={[styles.signupText, { color: colors.inkSoft }]}>New to PlaySpot?</Text>
            <AppButton
              title="Create an account"
              testID="login-signup"
              variant="quiet"
              onPress={() => navigation.navigate('RoleSelection')}
              style={styles.signupButton}
            />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 22, paddingTop: 14, flexGrow: 1 },
  notice: { padding: 12, marginBottom: 16 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  submitError: { fontSize: 13, marginTop: -2, marginBottom: 10 },
  forgot: { alignSelf: 'flex-end', paddingVertical: 6, marginTop: -7 },
  forgotText: { fontSize: 13, fontWeight: '700' },
  submit: { marginTop: 10 },
  demoBox: { borderWidth: 1, padding: 14, marginTop: 20, gap: 6 },
  demoEyebrow: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  demoLine: { fontSize: 11, lineHeight: 17, fontWeight: '600' },
  demoFoot: { fontSize: 10, lineHeight: 15, marginTop: 2 },
  signupRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', marginTop: 'auto', paddingTop: 18 },
  signupText: { fontSize: 12 },
  signupButton: { minHeight: 42, paddingHorizontal: 6 },
});
