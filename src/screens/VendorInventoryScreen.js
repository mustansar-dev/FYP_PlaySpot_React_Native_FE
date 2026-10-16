import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import { useTheme } from '../context/ThemeContext';
import { selectEquipmentByVenueId, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';

export default function VendorInventoryScreen({ navigation }) {
  const { colors, radius } = useTheme();
  const user = useSelector(state => state.auth.currentUser);
  const venues = useSelector(state => selectVenuesByOwnerId(state, user?.id || ''));
  const venue = venues[0] || null;
  const items = useSelector(state => selectEquipmentByVenueId(state, venue?.id));
  const edit = () => navigation.navigate('VendorVenueManagement', { venueId: venue?.id });

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Text style={[styles.eyebrow, { color: colors.primary }]}>VENDOR TOOLS</Text>
      <Text style={[styles.title, { color: colors.ink }]}>Equipment & supplies</Text>
      <Text style={[styles.subtitle, { color: colors.inkSoft }]}>{venue?.name || 'Your venue'} · local demo inventory</Text>
      {items.length ? items.map(item => <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <View style={[styles.itemIcon, { backgroundColor: colors.limePale, borderRadius: radius.md }]}><Text style={[styles.iconText, { color: colors.primary }]}>+</Text></View>
        <View style={styles.info}><Text style={[styles.name, { color: colors.ink }]}>{item.name}</Text><Text style={[styles.meta, { color: colors.inkSoft }]}>{item.sport || 'General'} · {item.priceMode === 'sale' ? 'For sale' : 'Rental'}</Text><Text style={[styles.price, { color: colors.primary }]}>PKR {Number(item.unitPricePKR || 0).toLocaleString()} · {item.quantityAvailable} in stock</Text></View>
        <Text style={[styles.chevron, { color: colors.inkSoft }]}>›</Text>
      </View>) : <View style={[styles.empty, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={[styles.name, { color: colors.ink }]}>No inventory listed yet</Text><Text style={[styles.meta, { color: colors.inkSoft }]}>Add rentals or sale items from your venue editor.</Text></View>}
      <AppButton title="Manage inventory" testID="vendor-inventory-manage" onPress={edit} style={styles.button} />
      <Pressable accessibilityRole="button" onPress={edit} style={styles.addRow}><Text style={[styles.addText, { color: colors.primary }]}>+ Add equipment or supplies</Text></Pressable>
      <Text style={[styles.note, { color: colors.inkSoft }]}>Inventory is stored locally on this device. It is demo data and is not sent to a service.</Text>
    </ScrollView>
  </SafeAreaView>;
}

const styles = StyleSheet.create({
  safe: { flex: 1 }, content: { padding: 20, paddingTop: 14, paddingBottom: 28 },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 }, title: { fontSize: 23, fontWeight: '900', marginTop: 6 }, subtitle: { fontSize: 11, marginTop: 4, marginBottom: 20 },
  card: { borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', marginBottom: 10, minHeight: 84 }, itemIcon: { width: 43, height: 43, alignItems: 'center', justifyContent: 'center', marginRight: 11 }, iconText: { fontSize: 22, fontWeight: '700' }, info: { flex: 1 }, name: { fontSize: 13, fontWeight: '800' }, meta: { fontSize: 10, marginTop: 4 }, price: { fontSize: 10, fontWeight: '800', marginTop: 5 }, chevron: { fontSize: 22, paddingHorizontal: 6 },
  empty: { borderWidth: 1, padding: 16, marginBottom: 14 }, button: { marginTop: 8 }, addRow: { alignItems: 'center', paddingVertical: 14 }, addText: { fontSize: 12, fontWeight: '800' }, note: { fontSize: 10, lineHeight: 15, textAlign: 'center', marginTop: 12 },
});
