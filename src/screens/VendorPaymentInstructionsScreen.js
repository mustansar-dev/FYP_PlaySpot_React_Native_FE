import React, { useEffect, useState } from 'react';
import { ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import { DesignCard, InlineNotice } from '../components/DesignPrimitives';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { DEMO_MODE } from '../config/backendApi';
import { backendApi } from '../services/backendApi';

const emptyForm = { accountTitle: '', bankName: '', iban: '', accountNumber: '', instructions: '', active: true };

export default function VendorPaymentInstructionsScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (DEMO_MODE) return undefined;
    let active = true;
    setLoading(true);
    backendApi.getVendorPaymentInstructions().then(result => {
      if (!active) return;
      setForm({
        accountTitle: result.accountTitle || '', bankName: result.bankName || '',
        iban: result.iban || '', accountNumber: result.accountNumber || '',
        instructions: result.instructions || '', active: result.active !== false,
      });
    }).catch(loadError => {
      if (active) setError(loadError.message || 'Bank details could not be loaded.');
    }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const setField = (name, value) => {
    setForm(current => ({ ...current, [name]: value }));
    setError('');
    setSaved(false);
  };

  const save = async () => {
    if (DEMO_MODE || saving) return;
    setSaving(true);
    setError('');
    setSaved(false);
    try {
      await backendApi.vendorPaymentInstructions({
        accountTitle: form.accountTitle.trim(), bankName: form.bankName.trim(),
        ...(form.iban.trim() ? { iban: form.iban.trim() } : {}),
        ...(form.accountNumber.trim() ? { accountNumber: form.accountNumber.trim() } : {}),
        ...(form.instructions.trim() ? { instructions: form.instructions.trim() } : {}),
        active: form.active,
      });
      setSaved(true);
    } catch (saveError) { setError(saveError.message || 'Bank transfer details could not be saved.'); }
    finally { setSaving(false); }
  };

  const field = (label, key, placeholder, options = {}) => <View style={styles.field}>
    <Text style={[styles.label, { color: colors.inkSoft }]}>{label}</Text>
    <TextInput
      accessibilityLabel={label}
      testID={`vendor-bank-${key}`}
      value={form[key]}
      onChangeText={value => setField(key, value)}
      placeholder={placeholder}
      placeholderTextColor={colors.muted}
      autoCapitalize={options.autoCapitalize || 'words'}
      keyboardType={options.keyboardType || 'default'}
      multiline={Boolean(options.multiline)}
      textAlignVertical={options.multiline ? 'top' : 'center'}
      maxLength={options.maxLength || 1000}
      style={[styles.input, options.multiline && styles.multiline, { color: colors.ink, backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}
    />
  </View>;

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Bank transfer details" subtitle="Players see these details when they choose bank transfer at checkout." eyebrow="VENDOR PAYMENTS" onBack={() => navigation.goBack()} />
      {DEMO_MODE ? <InlineNotice>Bank transfers use the backend account. Sign in to a backend vendor account to save payment instructions.</InlineNotice> : null}
      {!DEMO_MODE && loading ? <InlineNotice>Loading saved bank details…</InlineNotice> : null}
      <DesignCard>
        <Text style={[styles.cardTitle, { color: colors.ink }]}>Account information</Text>
        <Text style={[styles.copy, { color: colors.inkSoft }]}>Use an account controlled by your venue. Players will receive your details before they reserve a bank-transfer booking.</Text>
        {field('Account title', 'accountTitle', 'Name on the bank account', { maxLength: 160 })}
        {field('Bank name', 'bankName', 'For example, your bank or wallet', { maxLength: 120 })}
        {field('IBAN (optional if account number is entered)', 'iban', 'PK00BANK0000000000000000', { autoCapitalize: 'characters', maxLength: 34 })}
        {field('Account number (optional if IBAN is entered)', 'accountNumber', 'Bank account number', { autoCapitalize: 'none', keyboardType: 'number-pad', maxLength: 64 })}
        {field('Transfer instructions (optional)', 'instructions', 'Reference, branch or payment note', { autoCapitalize: 'sentences', multiline: true, maxLength: 1000 })}
        <ChoiceChips label="Bank transfer availability" options={['Active', 'Disabled']} selected={form.active ? 'Active' : 'Disabled'} onSelect={value => setField('active', value === 'Active')} testID="vendor-bank-active" />
      </DesignCard>
      {error ? <InlineNotice tone="danger" testID="vendor-bank-error">{error}</InlineNotice> : null}
      {saved ? <InlineNotice testID="vendor-bank-saved">Bank transfer details saved. Players can use them at checkout.</InlineNotice> : null}
      {!DEMO_MODE ? <AppButton title={saving ? 'Saving bank details…' : 'Save bank details'} testID="vendor-bank-save" onPress={save} loading={saving} disabled={saving || loading} /> : null}
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 20, paddingBottom: 34, gap: 12 },
  cardTitle: { fontSize: 15, fontWeight: '900' }, copy: { fontSize: 11, lineHeight: 17, marginTop: 6 },
  field: { marginTop: 9 }, label: { fontSize: 10, fontWeight: '900', marginBottom: 5 },
  input: { minHeight: 46, borderWidth: 1, paddingHorizontal: 12, fontSize: 13 },
  multiline: { minHeight: 88, paddingTop: 11 },
});
