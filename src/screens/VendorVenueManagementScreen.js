import React, { useMemo, useState } from 'react';
import { Alert, Image, KeyboardAvoidingView, Linking, Platform, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import {
  selectEquipmentByVenueId,
  selectGroundsByVenueId,
  selectVenueById,
  selectVendorProfileById,
} from '../store/selectors/venueSelectors';
import { venuePublicationChanged, venueUpdated } from '../store/venueSlice';
import { createSlotsForGround, DEFAULT_GROUND_DAYS, timeToMinutes, WEEK_DAYS } from '../utils/booking';

export default function VendorVenueManagementScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { currentUser } = useSelector(state => state.auth);
  const { colors, radius } = useTheme();
  const { venueId } = route.params || {};
  const venue = useSelector(state => selectVenueById(state, venueId));
  const grounds = useSelector(state => selectGroundsByVenueId(state, venueId));
  const equipment = useSelector(state => selectEquipmentByVenueId(state, venueId));
  const { slots: storedSlots, bookings } = useSelector(state => state.venues);
  const vendorProfile = useSelector(state => venue ? selectVendorProfileById(state, venue.vendorId) : null);
  const [draft, setDraft] = useState(() => ({
    venueName: venue?.name || '',
    businessName: vendorProfile?.businessName || currentUser?.businessName || '',
    address: venue?.address || '',
    city: venue?.city || '',
    locationNote: venue?.locationNote || '',
    contactPhone: vendorProfile?.contactPhone || currentUser?.phone || '',
    sports: [...(venue?.sports || [])],
    facilities: [...(venue?.facilities || [])],
    parkingAvailable: Boolean(venue?.parkingAvailable),
    parkingSpaces: String(venue?.parkingSpaces || 0),
    latitude: venue?.latitude == null ? '' : String(venue.latitude),
    longitude: venue?.longitude == null ? '' : String(venue.longitude),
    photoUris: [...(venue?.photoUris || [])],
    videoUri: venue?.videoUri || null,
    grounds: grounds.map(ground => ({
      ...ground,
      openingTime: ground.openingTime || '09:00',
      closingTime: ground.closingTime || '17:00',
      availableDays: Array.isArray(ground.availableDays) && ground.availableDays.length ? [...ground.availableDays] : [...DEFAULT_GROUND_DAYS],
    })),
    equipment: equipment.map(item => ({ ...item })),
  }));
  const [error, setError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [pickerBusy, setPickerBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [groundAddedNotice, setGroundAddedNotice] = useState('');
  const [equipmentAddedNotice, setEquipmentAddedNotice] = useState('');

  const setField = (key, value) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setSaved(false);
    setError('');
  };
  const updateListItem = (collection, index, key, value) => {
    setDraft(previous => ({
      ...previous,
      [collection]: previous[collection].map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
    setSaved(false);
  };
  const toggleListValue = (collection, value) => {
    setField(collection, draft[collection].includes(value)
      ? draft[collection].filter(item => item !== value)
      : [...draft[collection], value]);
  };
  const addGround = () => {
    const ground = {
      id: `ground-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
      venueId,
      name: '',
      sport: draft.sports[0] || '',
      widthMeters: '',
      lengthMeters: '',
      indoorOutdoor: '',
      surface: '',
      conditionRating: '',
      hourlyPricePKR: '',
      slotDurationMinutes: 60,
      openingTime: '09:00',
      closingTime: '17:00',
      availableDays: [...DEFAULT_GROUND_DAYS],
      isActive: true,
    };
    setField('grounds', [ground, ...draft.grounds]);
    setGroundAddedNotice('Ground added at the top of the list. Complete its details below.');
  };
  const addEquipment = () => {
    const item = { id: `equipment-${Date.now().toString(36)}`, venueId: venue?.id, name: '', sport: draft.sports[0] || '', priceMode: 'rental', unitPricePKR: '', quantityAvailable: 1, active: true };
    setField('equipment', [item, ...draft.equipment]);
    setEquipmentAddedNotice('Add-on added at the top of the list. Complete its details below.');
  };
  const pickPhotos = async () => {
    if (pickerBusy) return;
    if (draft.photoUris.length >= 5) {
      setMediaError('You can add up to five venue photos. Remove one before choosing another.');
      return;
    }
    setPickerBusy(true);
    setMediaError('');
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: Math.max(1, 5 - draft.photoUris.length) });
      if (result.didCancel) return;
      if (result.errorCode) {
        setMediaError(result.errorMessage || 'Photos could not be opened.');
        return;
      }
      const uris = (result.assets || []).map(asset => asset.uri).filter(Boolean);
      setField('photoUris', [...new Set([...draft.photoUris, ...uris])].slice(0, 5));
    } catch (pickError) {
      setMediaError('Photos could not be opened. Check gallery permission and try again.');
    } finally {
      setPickerBusy(false);
    }
  };
  const pickVideo = async () => {
    if (pickerBusy) return;
    setPickerBusy(true);
    setMediaError('');
    try {
      const result = await launchImageLibrary({ mediaType: 'video', selectionLimit: 1 });
      if (result.didCancel) return;
      if (result.errorCode) {
        setMediaError(result.errorMessage || 'Video could not be opened.');
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (uri) setField('videoUri', uri);
    } catch (pickError) {
      setMediaError('Video could not be opened. Check gallery permission and try again.');
    } finally {
      setPickerBusy(false);
    }
  };
  const profileId = venue?.vendorId;
  const ready = Boolean(venue && currentUser && vendorProfile?.ownerUserId === currentUser.id);
  const coordsError = useMemo(() => {
    if (Boolean(draft.latitude) !== Boolean(draft.longitude)) {
      return 'Enter both coordinates, or leave both blank to use the address fallback.';
    }
    if (draft.latitude && (!Number.isFinite(Number(draft.latitude)) || Number(draft.latitude) < -90 || Number(draft.latitude) > 90)) {
      return 'Latitude must be between -90 and 90.';
    }
    if (draft.longitude && (!Number.isFinite(Number(draft.longitude)) || Number(draft.longitude) < -180 || Number(draft.longitude) > 180)) {
      return 'Longitude must be between -180 and 180.';
    }
    return '';
  }, [draft.latitude, draft.longitude]);

  const save = () => {
    if (!ready) {
      setError('This venue is not attached to the signed-in vendor profile.');
      return;
    }
    if (!draft.venueName.trim() || !draft.businessName.trim() || !draft.address.trim() || !draft.city.trim()) {
      setError('Venue, business, address, and city are required.');
      return;
    }
    if (coordsError) {
      setError(coordsError);
      return;
    }
    if (draft.parkingAvailable && (!Number.isInteger(Number(draft.parkingSpaces)) || Number(draft.parkingSpaces) < 0)) {
      setError('Parking spaces must be a whole number of zero or more.');
      return;
    }
    if (draft.grounds.length === 0 || draft.grounds.some(ground =>
      !ground.name.trim() || !ground.sport || !ground.indoorOutdoor || !ground.surface ||
      !Number.isFinite(Number(ground.widthMeters)) || Number(ground.widthMeters) <= 0 ||
      !Number.isFinite(Number(ground.lengthMeters)) || Number(ground.lengthMeters) <= 0 ||
      !Number.isInteger(Number(ground.conditionRating)) || Number(ground.conditionRating) < 1 || Number(ground.conditionRating) > 5 ||
      !Number.isFinite(Number(ground.hourlyPricePKR)) || Number(ground.hourlyPricePKR) <= 0 ||
      !Number.isInteger(Number(ground.slotDurationMinutes)) || Number(ground.slotDurationMinutes) < 15 || Number(ground.slotDurationMinutes) > 240
    )) {
      setError(draft.grounds.length === 0
        ? 'Keep at least one ground or court in the venue.'
        : 'Each ground needs a name, sport, type, surface, condition, positive dimensions and hourly price, and a valid slot duration.');
      return;
    }
    if (draft.grounds.some(ground => {
      const opening = timeToMinutes(ground.openingTime || '09:00');
      const closing = timeToMinutes(ground.closingTime || '17:00');
      return opening === null || closing === null || closing <= opening || !ground.availableDays?.length;
    })) {
      setError('Each ground needs a valid opening and closing time, and at least one available day.');
      return;
    }
    if (draft.equipment.some(item => !item.name.trim() || !Number(item.unitPricePKR) || Number(item.unitPricePKR) < 1 || !Number.isInteger(Number(item.quantityAvailable)) || Number(item.quantityAvailable) < 0)) {
      setError('Each equipment item needs a name, price, and whole-number quantity.');
      return;
    }
    const timestamp = new Date().toISOString();
    const savedGrounds = draft.grounds.map(ground => ({
      ...ground,
      name: ground.name.trim(),
      widthMeters: Number(ground.widthMeters),
      lengthMeters: Number(ground.lengthMeters),
      hourlyPricePKR: Number(ground.hourlyPricePKR),
      slotDurationMinutes: Number(ground.slotDurationMinutes),
      openingTime: ground.openingTime || '09:00',
      closingTime: ground.closingTime || '17:00',
      availableDays: [...ground.availableDays],
    }));
    const previousSlots = storedSlots.filter(slot => grounds.some(ground => ground.id === slot.groundId));
    const generatedSlots = savedGrounds.flatMap(ground => createSlotsForGround(ground, 8, null, null, new Date()));
    const generatedIds = new Set(generatedSlots.map(slot => slot.id));
    const previousById = new Map(previousSlots.map(slot => [slot.id, slot]));
    const scheduleSlots = generatedSlots.map(slot => {
      const previous = previousById.get(slot.id);
      return previous ? { ...slot, status: previous.status, reservedByBookingId: previous.reservedByBookingId } : slot;
    });
    const bookedSlotsOutsideSchedule = previousSlots.filter(slot =>
      !generatedIds.has(slot.id) && bookings.some(booking => booking.slotId === slot.id),
    );
    scheduleSlots.push(...bookedSlotsOutsideSchedule);
    dispatch(venueUpdated({
      venue: {
        ...venue,
        name: draft.venueName.trim(),
        address: draft.address.trim(),
        city: draft.city.trim(),
        locationNote: draft.locationNote.trim(),
        sports: draft.sports,
        facilities: draft.facilities,
        parkingAvailable: draft.parkingAvailable,
        parkingSpaces: draft.parkingAvailable ? Number(draft.parkingSpaces) : 0,
        photoUris: [...draft.photoUris],
        videoUri: draft.videoUri,
        latitude: draft.latitude ? Number(draft.latitude) : null,
        longitude: draft.longitude ? Number(draft.longitude) : null,
        updatedAt: timestamp,
      },
      vendorProfile: { ...vendorProfile, businessName: draft.businessName.trim(), contactPhone: draft.contactPhone.trim() },
      grounds: savedGrounds,
      slots: scheduleSlots,
      equipment: draft.equipment.map(item => ({
        ...item,
        name: item.name.trim(),
        unitPricePKR: Number(item.unitPricePKR),
        quantityAvailable: Number(item.quantityAvailable),
      })),
    }));
    setSaved(true);
    setError('');
    navigation.navigate('VendorDashboard');
    Alert.alert('Saved successfully', 'Venue, grounds, add-ons and custom availability have been saved.');
  };

  if (!ready) {
    return (
      <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
        <View style={styles.content}>
          <ScreenHeader title="Venue management" onBack={() => navigation.goBack()} />
          <Text style={{ color: colors.inkSoft }}>This venue is unavailable for the current vendor account.</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="VENDOR TOOLS"
            title="Venue management"
            subtitle="Changes are saved locally and remain demo data."
            onBack={() => navigation.goBack()}
          />
          <FormField label="Business name" value={draft.businessName} onChangeText={value => setField('businessName', value)} testID="manage-business-name" />
          <FormField label="Contact phone" value={draft.contactPhone} onChangeText={value => setField('contactPhone', value)} keyboardType="phone-pad" testID="manage-vendor-phone" />
          <FormField label="Venue name" value={draft.venueName} onChangeText={value => setField('venueName', value)} testID="manage-venue-name" />
          <FormField label="Address" value={draft.address} onChangeText={value => setField('address', value)} multiline testID="manage-venue-address" />
          <FormField label="City" value={draft.city} onChangeText={value => setField('city', value)} testID="manage-venue-city" />
          <FormField label="Area / landmark" value={draft.locationNote} onChangeText={value => setField('locationNote', value)} testID="manage-venue-area" />
          <View style={styles.row}>
            <FormField label="Latitude" value={draft.latitude} onChangeText={value => setField('latitude', value)} keyboardType="decimal-pad" style={styles.column} testID="manage-venue-latitude" />
            <FormField label="Longitude" value={draft.longitude} onChangeText={value => setField('longitude', value)} keyboardType="decimal-pad" style={styles.column} testID="manage-venue-longitude" />
          </View>
          <Text style={[styles.hint, { color: colors.inkSoft }]}>Leave both coordinates blank to continue using the manual address fallback.</Text>
          <ChoiceChips label="Sports offered" options={['Futsal', 'Football', 'Cricket', 'Padel', 'Badminton']} selected={draft.sports} onSelect={value => toggleListValue('sports', value)} multiple testID="manage-venue-sport" />
          <ChoiceChips label="Facilities" options={['Changing rooms', 'Washrooms', 'Floodlights', 'Seating', 'Cafe', 'Showers']} selected={draft.facilities} onSelect={value => toggleListValue('facilities', value)} multiple testID="manage-venue-facility" />
          <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.cardHeading, { color: colors.ink }]}>Parking</Text>
            <AppButton title={draft.parkingAvailable ? 'Parking available' : 'No parking'} variant="secondary" testID="manage-parking-toggle" onPress={() => setField('parkingAvailable', !draft.parkingAvailable)} />
            {draft.parkingAvailable ? <FormField label="Parking spaces" value={draft.parkingSpaces} onChangeText={value => setField('parkingSpaces', value)} keyboardType="number-pad" testID="manage-parking-spaces" /> : null}
          </View>

          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Grounds and courts</Text>
          <AppButton title="Add another ground or court" variant="secondary" testID="manage-ground-add" onPress={addGround} style={styles.addButton} />
          {groundAddedNotice ? <Text accessibilityLiveRegion="polite" style={[styles.success, { color: colors.success }]}>{groundAddedNotice}</Text> : null}
          {draft.grounds.map((ground, index) => (
            <View key={ground.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
              <AppButton
                title={`× Remove ground ${index + 1}`}
                variant="quiet"
                testID={`manage-ground-remove-${index + 1}`}
                accessibilityLabel={`Remove ${ground.name || `ground ${index + 1}`}`}
                onPress={() => setField('grounds', draft.grounds.filter((_, groundIndex) => groundIndex !== index))}
                style={styles.removeGroundButton}
                textStyle={[styles.removeGroundText, { color: colors.error }]}
              />
              <Text style={[styles.cardHeading, { color: colors.ink }]}>{ground.sport} · {ground.indoorOutdoor}</Text>
              <FormField label="Ground name" value={ground.name} onChangeText={value => updateListItem('grounds', index, 'name', value)} testID={`manage-ground-name-${index + 1}`} />
              <View style={styles.row}>
                <FormField label="Width (m)" value={String(ground.widthMeters)} onChangeText={value => updateListItem('grounds', index, 'widthMeters', value)} keyboardType="decimal-pad" style={styles.column} testID={`manage-ground-width-${index + 1}`} />
                <FormField label="Length (m)" value={String(ground.lengthMeters)} onChangeText={value => updateListItem('grounds', index, 'lengthMeters', value)} keyboardType="decimal-pad" style={styles.column} testID={`manage-ground-length-${index + 1}`} />
              </View>
              <View style={styles.row}>
              <FormField label="Price / hour (PKR)" value={String(ground.hourlyPricePKR)} onChangeText={value => updateListItem('grounds', index, 'hourlyPricePKR', value)} keyboardType="number-pad" style={styles.column} testID={`manage-ground-price-${index + 1}`} />
                <FormField label="Slot minutes" value={String(ground.slotDurationMinutes)} onChangeText={value => updateListItem('grounds', index, 'slotDurationMinutes', value)} keyboardType="number-pad" style={styles.column} testID={`manage-ground-duration-${index + 1}`} />
              </View>
              <Text style={[styles.scheduleLabel, { color: colors.ink }]}>Custom court availability</Text>
              <Text style={[styles.hint, { color: colors.inkSoft }]}>Slots are generated from these hours, days and duration for the next 8 days.</Text>
              <View style={styles.row}>
                <FormField label="Opens (HH:MM)" value={ground.openingTime || '09:00'} onChangeText={value => updateListItem('grounds', index, 'openingTime', value)} placeholder="09:00" testID={`manage-ground-opening-${index + 1}`} style={styles.column} />
                <FormField label="Closes (HH:MM)" value={ground.closingTime || '17:00'} onChangeText={value => updateListItem('grounds', index, 'closingTime', value)} placeholder="17:00" testID={`manage-ground-closing-${index + 1}`} style={styles.column} />
              </View>
              <ChoiceChips label="Days available" options={WEEK_DAYS} selected={ground.availableDays || DEFAULT_GROUND_DAYS} onSelect={day => updateListItem('grounds', index, 'availableDays', (ground.availableDays || DEFAULT_GROUND_DAYS).includes(day) ? (ground.availableDays || DEFAULT_GROUND_DAYS).filter(item => item !== day) : [...(ground.availableDays || DEFAULT_GROUND_DAYS), day])} multiple testID={`manage-ground-days-${index + 1}`} />
              <Text style={[styles.hint, { color: colors.inkSoft }]}>{ground.surface} · condition {ground.conditionRating}/5</Text>
              <ChoiceChips label="Sport" options={['Futsal', 'Football', 'Cricket', 'Padel', 'Badminton']} selected={ground.sport} onSelect={value => updateListItem('grounds', index, 'sport', value)} testID={`manage-ground-sport-${index + 1}`} />
              <ChoiceChips label="Indoor/outdoor" options={['Indoor', 'Outdoor']} selected={ground.indoorOutdoor} onSelect={value => updateListItem('grounds', index, 'indoorOutdoor', value)} testID={`manage-ground-type-${index + 1}`} />
              <ChoiceChips label="Surface" options={['Real grass', 'Artificial turf', 'Wood', 'Synthetic', 'Other']} selected={ground.surface} onSelect={value => updateListItem('grounds', index, 'surface', value)} testID={`manage-ground-surface-${index + 1}`} />
              <ChoiceChips label="Condition (1 to 5)" options={['1', '2', '3', '4', '5']} selected={String(ground.conditionRating)} onSelect={value => updateListItem('grounds', index, 'conditionRating', Number(value))} testID={`manage-ground-condition-${index + 1}`} />
            </View>
          ))}

          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Venue photos and video</Text>
          <Text style={[styles.hint, { color: colors.inkSoft }]}>Photos and video are optional. A local illustration is used when no photo is selected.</Text>
          <AppButton title={pickerBusy ? 'Opening gallery…' : 'Choose venue photos'} variant="secondary" testID="manage-pick-photos" onPress={pickPhotos} disabled={pickerBusy} loading={pickerBusy} style={styles.addButton} />
          {draft.photoUris.length > 0 ? (
            <View style={styles.photoGrid}>
              {draft.photoUris.map((uri, index) => (
                <View key={`${uri}-${index}`} style={styles.photoWrap}>
                  <Image source={{ uri }} style={[styles.photo, { borderRadius: radius.md }]} />
                  <Pressable accessibilityRole="button" accessibilityLabel={`Remove venue photo ${index + 1}`} testID={`manage-remove-photo-${index + 1}`} onPress={() => setField('photoUris', draft.photoUris.filter((_, photoIndex) => photoIndex !== index))} style={[styles.photoRemove, { backgroundColor: colors.ink }]}>
                    <Text style={styles.photoRemoveText}>×</Text>
                  </Pressable>
                </View>
              ))}
            </View>
          ) : <Text style={[styles.hint, { color: colors.inkSoft }]}>No photos selected; the player discovery screens use a local illustration.</Text>}
          <AppButton title="Choose optional venue video" variant="secondary" testID="manage-pick-video" onPress={pickVideo} disabled={pickerBusy} loading={pickerBusy} style={styles.addButton} />
          {draft.videoUri ? (
            <View style={[styles.videoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
              <Text style={[styles.cardHeading, { color: colors.ink }]}>Venue video selected</Text>
              <AppButton title="Play video" variant="secondary" testID="manage-play-video" onPress={() => Linking.openURL(draft.videoUri).catch(() => setMediaError('This video could not be opened on this device.'))} />
              <AppButton title="Remove video" variant="quiet" testID="manage-remove-video" onPress={() => setField('videoUri', null)} />
            </View>
          ) : null}
          {mediaError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{mediaError}</Text> : null}

          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Equipment and add-ons</Text>
          <AppButton title="Add equipment" variant="secondary" testID="manage-item-add" onPress={addEquipment} style={styles.addButton} />
          {equipmentAddedNotice ? <Text accessibilityLiveRegion="polite" style={[styles.success, { color: colors.success }]}>{equipmentAddedNotice}</Text> : null}
          {draft.equipment.length ? draft.equipment.map((item, index) => (
            <View key={item.id} style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
              <FormField label="Item name" value={item.name} onChangeText={value => updateListItem('equipment', index, 'name', value)} testID={`manage-item-name-${index + 1}`} />
              <View style={styles.row}>
                <FormField label="Price (PKR)" value={String(item.unitPricePKR)} onChangeText={value => updateListItem('equipment', index, 'unitPricePKR', value)} keyboardType="number-pad" style={styles.column} testID={`manage-item-price-${index + 1}`} />
                <FormField label="Quantity" value={String(item.quantityAvailable)} onChangeText={value => updateListItem('equipment', index, 'quantityAvailable', value)} keyboardType="number-pad" style={styles.column} testID={`manage-item-quantity-${index + 1}`} />
              </View>
              <ChoiceChips label="Price mode" options={['rental', 'sale']} selected={item.priceMode} onSelect={value => updateListItem('equipment', index, 'priceMode', value)} testID={`manage-item-mode-${index + 1}`} />
              <AppButton title="× Remove item" variant="quiet" testID={`manage-item-remove-${index + 1}`} onPress={() => setField('equipment', draft.equipment.filter((_, itemIndex) => itemIndex !== index))} textStyle={{ color: colors.error }} />
            </View>
          )) : <Text style={[styles.hint, { color: colors.inkSoft }]}>No add-ons have been added.</Text>}

          {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
          {saved ? <Text accessibilityLiveRegion="polite" style={[styles.success, { color: colors.success }]}>Venue and equipment changes saved on this device.</Text> : null}
          <AppButton title="Save venue changes" testID="manage-venue-save" onPress={save} />
          <View style={[styles.publishCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
            <Text style={[styles.cardHeading, { color: colors.ink }]}>{venue.published ? 'Published in local discovery' : 'Hidden from local discovery'}</Text>
            <Text style={[styles.hint, { color: colors.inkSoft }]}>Publishing only changes this local demo. No real approval or server listing exists.</Text>
            <AppButton
              title={venue.published ? 'Unpublish demo venue' : 'Publish demo venue'}
              variant="secondary"
              testID="manage-venue-publish"
              onPress={() => dispatch(venuePublicationChanged({ venueId: venue.id, published: !venue.published }))}
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
  content: { padding: 20, paddingTop: 14, paddingBottom: 28 },
  row: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  hint: { fontSize: 12, lineHeight: 18, marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '800', marginTop: 10, marginBottom: 10 },
  card: { padding: 13, borderWidth: 1, marginBottom: 12 },
  cardHeading: { fontSize: 14, fontWeight: '800', marginBottom: 10 },
  scheduleLabel: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  addButton: { marginBottom: 12 },
  removeGroundButton: { minHeight: 36, alignSelf: 'flex-start', paddingHorizontal: 10, marginBottom: 8 },
  removeGroundText: { fontSize: 12 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginBottom: 14 },
  photoWrap: { position: 'relative' },
  photo: { width: 88, height: 88, backgroundColor: '#E4E9E1' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 17, lineHeight: 19 },
  videoCard: { borderWidth: 1, padding: 12, marginBottom: 12 },
  publishCard: { padding: 14, borderWidth: 1, marginTop: 18 },
  error: { fontSize: 12, marginBottom: 12 },
  success: { fontSize: 12, fontWeight: '700', marginBottom: 12 },
});
