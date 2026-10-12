import React, { useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { registerAccount } from '../services/authRepository';
import { accountRegistered } from '../store/authSlice';
import { validatePlayerRegistration } from '../utils/validation';

const SPORTS = ['Futsal', 'Cricket', 'Padel', 'Badminton'];

export default function PlayerRegistrationScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    preferredSports: [],
  });
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [loading, setLoading] = useState(false);
  const nameRef = useRef(null);
  const emailRef = useRef(null);
  const phoneRef = useRef(null);
  const passwordRef = useRef(null);
  const confirmRef = useRef(null);

  const updateField = (key, value) => {
    setForm(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setSubmitError('');
  };

  const toggleSport = sport => {
    setForm(previous => ({
      ...previous,
      preferredSports: previous.preferredSports.includes(sport)
        ? previous.preferredSports.filter(item => item !== sport)
        : [...previous.preferredSports, sport],
    }));
    setErrors(previous => ({ ...previous, preferredSports: undefined }));
  };

  const submit = async () => {
    if (loading) {
      return;
    }
    Keyboard.dismiss();
    const nextErrors = validatePlayerRegistration(form);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) {
      return;
    }

    setLoading(true);
    try {
      const result = await registerAccount({ ...form, role: 'player' });
      dispatch(accountRegistered(result));
      setForm(previous => ({ ...previous, password: '', confirmPassword: '' }));
      navigation.replace('RegistrationSuccess', {
        userId: result.account.id,
        name: result.account.name,
        role: result.account.role,
      });
    } catch (error) {
      setSubmitError(error.message || 'Registration could not be saved on this device.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="PLAYER ACCOUNT"
            title="Join the game"
            subtitle="A few details, then you can start exploring."
            onBack={() => navigation.goBack()}
          />

          <FormField
            ref={nameRef}
            label="Full name"
            value={form.name}
            onChangeText={value => updateField('name', value)}
            returnKeyType="next"
            onSubmitEditing={() => emailRef.current?.focus()}
            testID="player-name"
            error={errors.name}
          />
          <FormField
            ref={emailRef}
            label="Email address"
            value={form.email}
            onChangeText={value => updateField('email', value)}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => phoneRef.current?.focus()}
            testID="player-email"
            error={errors.email}
          />
          <FormField
            ref={phoneRef}
            label="Phone number"
            value={form.phone}
            onChangeText={value => updateField('phone', value)}
            keyboardType="phone-pad"
            returnKeyType="next"
            onSubmitEditing={() => passwordRef.current?.focus()}
            testID="player-phone"
            error={errors.phone}
          />
          <FormField
            ref={passwordRef}
            label="Password"
            value={form.password}
            onChangeText={value => updateField('password', value)}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="next"
            onSubmitEditing={() => confirmRef.current?.focus()}
            testID="player-password"
            error={errors.password}
          />
          <FormField
            ref={confirmRef}
            label="Confirm password"
            value={form.confirmPassword}
            onChangeText={value => updateField('confirmPassword', value)}
            secureTextEntry
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={submit}
            testID="player-confirm-password"
            error={errors.confirmPassword}
          />

          <ChoiceChips
            label="Sports you enjoy"
            options={SPORTS}
            selected={form.preferredSports}
            onSelect={toggleSport}
            multiple
            testID="player-sport"
            error={errors.preferredSports}
          />

          {submitError ? (
            <Text accessibilityRole="alert" testID="player-registration-error" style={[styles.submitError, { color: colors.error }]}>
              {submitError}
            </Text>
          ) : null}

          <AppButton
            title="Create player account"
            testID="player-register-submit"
            onPress={submit}
            loading={loading}
            disabled={loading}
            style={styles.submit}
          />
          <Text style={[styles.localNote, { color: colors.inkSoft }]}>
            Demo only: account details stay on this device. Do not use a real password.
          </Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 22, paddingTop: 14, paddingBottom: 28 },
  submitError: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  submit: { marginTop: 3 },
  localNote: { fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 12 },
});
