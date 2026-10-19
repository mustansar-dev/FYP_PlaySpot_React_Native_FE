import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { InlineNotice } from '../components/DesignPrimitives';
import { useTheme } from '../context/ThemeContext';
import { selectEquipmentByVenueId, selectGroundsByVenueId, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';
import { venueUpdated } from '../store/venueSlice';

function makeItem(venue) {
  return {
    id: `equipment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    venueId: venue?.id,
    name: '',
    sport: venue?.sports?.[0] || 'General',
    priceMode: 'rental',
    unitPricePKR: '',
    quantityAvailable: 1,
    active: true,
  };
}

export default function VendorInventoryScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const venue = venues.find(item => item.id === route.params?.venueId) || venues[0] || null;
  const grounds = useSelector(state => selectGroundsByVenueId(state, venue?.id));
  const savedItems = useSelector(state => selectEquipmentByVenueId(state, venue?.id));
  const [draft, setDraft] = useState(() => savedItems.map(item => ({ ...item })));
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const updateItem = (index, key, value) => {
    setDraft(previous => previous.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: value } : item));
    setSaved(false);
    setError('');
  };

  const save = () => {
    if (!venue || !user || !draft.every(item => item.name.trim() && Number.isInteger(Number(item.unitPricePKR)) && Number(item.unitPricePKR) > 0 && Number.isInteger(Number(item.quantityAvailable)) && Number(item.quantityAvailable) >= 0)) {
      setError('Each item needs a name, a whole PKR price greater than zero and a whole available quantity.');
      return;
    }
    dispatch(venueUpdated({
      venue: { ...venue, updatedAt: new Date().toISOString() },
      grounds,
      equipment: draft.map(item => ({
        ...item,
        venueId: venue.id,
        name: item.name.trim(),
        unitPricePKR: Number(item.unitPricePKR),
        quantityAvailable: Number(item.quantityAvailable),
      })),
    }));
    setSaved(true);
    setError('');
    navigation.goBack();
  };

  if (!venue) return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><View style={styles.content}><ScreenHeader title="Equipment and add-ons" onBack={() => navigation.goBack()} /><InlineNotice tone="danger">No venue is linked to this vendor account.</InlineNotice></View></SafeAreaView>;

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <ScreenHeader title="Equipment and add-ons" subtitle="Edit rental and sale items, price and available quantity." eyebrow="VENUE INVENTORY" onBack={() => navigation.goBack()} />
      <InlineNotice>{venue.name} · local demo inventory. Updates are saved through the venue store.</InlineNotice>
      <AppButton title="Add inventory item" variant="secondary" testID="vendor-inventory-add" onPress={() => { setDraft(previous => [makeItem(venue), ...previous]); setSaved(false); }} style={styles.button} />
      {draft.length ? draft.map((item, index) => <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <View style={styles.cardHeader}><Text style={[styles.cardTitle, { color: colors.ink }]}>Item {index + 1}</Text><AppButton title="Remove" variant="quiet" testID={`vendor-inventory-remove-${index + 1}`} onPress={() => { setDraft(previous => previous.filter((_, itemIndex) => itemIndex !== index)); setSaved(false); }} textStyle={{ color: colors.error }} /></View>
        <FormField label="Item name" value={item.name} onChangeText={value => updateItem(index, 'name', value)} placeholder="Footballs, shuttlecocks…" testID={`vendor-inventory-name-${index + 1}`} />
        <ChoiceChips label="For sport" options={venue.sports} selected={item.sport} onSelect={value => updateItem(index, 'sport', value)} testID={`vendor-inventory-sport-${index + 1}`} />
        <ChoiceChips label="Item type" options={['rental', 'sale']} selected={item.priceMode} onSelect={value => updateItem(index, 'priceMode', value)} testID={`vendor-inventory-mode-${index + 1}`} />
        <View style={styles.row}>
          <FormField label="Price (PKR)" value={String(item.unitPricePKR)} onChangeText={value => updateItem(index, 'unitPricePKR', value)} keyboardType="number-pad" style={styles.column} testID={`vendor-inventory-price-${index + 1}`} />
          <FormField label="Quantity" value={String(item.quantityAvailable)} onChangeText={value => updateItem(index, 'quantityAvailable', value)} keyboardType="number-pad" style={styles.column} testID={`vendor-inventory-quantity-${index + 1}`} />
        </View>
      </View>) : <InlineNotice>No equipment items have been added. Add an item to offer it with player bookings.</InlineNotice>}
      {error ? <InlineNotice tone="danger">{error}</InlineNotice> : null}
      {saved ? <InlineNotice>Inventory saved on this device.</InlineNotice> : null}
      <AppButton title="Save inventory" testID="vendor-inventory-save" onPress={save} style={styles.button} />
      <Text style={[styles.note, { color: colors.inkSoft }]}>Inventory is stored locally on this device. It is demo data and is not sent to a service.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  content: { padding: 20, paddingTop: 14, paddingBottom: 28 },
  card: { borderWidth: 1, padding: 13, marginBottom: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { fontSize: 14, fontWeight: '800' },
  row: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  button: { marginTop: 10 },
  note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 12 },
});
