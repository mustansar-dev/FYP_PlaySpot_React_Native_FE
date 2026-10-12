import React, { useRef, useState } from 'react';
import {
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { launchImageLibrary } from 'react-native-image-picker';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch } from 'react-redux';
import AppButton from '../components/AppButton';
import ChoiceChips from '../components/ChoiceChips';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { registerAccount } from '../services/authRepository';
import { accountRegistered } from '../store/authSlice';
import { validateVendorStep } from '../utils/validation';

const STEPS = [
  'Account & business',
  'Venue & address',
  'Grounds & sports',
  'Facilities & parking',
  'Equipment add-ons',
  'Media',
  'Review',
];
const SPORTS = ['Futsal', 'Football', 'Cricket', 'Padel', 'Badminton'];
const FACILITIES = ['Changing rooms', 'Washrooms', 'Floodlights', 'Seating', 'Cafe', 'Showers'];
const SURFACES = ['Real grass', 'Turf', 'Wood', 'Synthetic', 'Other'];

function blankGround() {
  return {
    id: `ground-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
    name: '',
    sport: '',
    widthMeters: '',
    lengthMeters: '',
    indoorOutdoor: '',
    surface: '',
    conditionRating: '',
    hourlyPricePKR: '',
  };
}

function makeInitialDraft() {
  return {
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    businessName: '',
    venueName: '',
    address: '',
    city: '',
    locationNote: '',
    sports: [],
    grounds: [blankGround()],
    facilities: [],
    parkingAvailable: false,
    parkingSpaces: '0',
    equipment: [],
    photoUris: [],
    videoUri: null,
  };
}

function ReviewRow({ label, value }) {
  const { colors } = useTheme();
  return (
    <View style={[styles.reviewRow, { borderBottomColor: colors.border }]}>
      <Text style={[styles.reviewLabel, { color: colors.inkSoft }]}>{label}</Text>
      <Text style={[styles.reviewValue, { color: colors.ink }]}>{value || '—'}</Text>
    </View>
  );
}

export default function VendorRegistrationScreen({ navigation }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const [draft, setDraft] = useState(makeInitialDraft);
  const [step, setStep] = useState(0);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [mediaError, setMediaError] = useState('');
  const [loading, setLoading] = useState(false);
  const [pickerBusy, setPickerBusy] = useState(false);
  const ownerNameRef = useRef(null);
  const ownerEmailRef = useRef(null);
  const ownerPhoneRef = useRef(null);
  const ownerPasswordRef = useRef(null);
  const ownerConfirmRef = useRef(null);

  const updateField = (key, value) => {
    setDraft(previous => ({ ...previous, [key]: value }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
    setSubmitError('');
  };

  const updateGround = (index, key, value) => {
    setDraft(previous => ({
      ...previous,
      grounds: previous.grounds.map((ground, groundIndex) =>
        groundIndex === index ? { ...ground, [key]: value } : ground,
      ),
    }));
    setErrors(previous => ({ ...previous, [`grounds.${index}.${key}`]: undefined }));
  };

  const updateEquipment = (index, key, value) => {
    setDraft(previous => ({
      ...previous,
      equipment: previous.equipment.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item,
      ),
    }));
    setErrors(previous => ({ ...previous, [`equipment.${index}.${key}`]: undefined }));
  };

  const toggleListValue = (key, value) => {
    setDraft(previous => ({
      ...previous,
      [key]: previous[key].includes(value)
        ? previous[key].filter(item => item !== value)
        : [...previous[key], value],
    }));
    setErrors(previous => ({ ...previous, [key]: undefined }));
  };

  const nextStep = () => {
    Keyboard.dismiss();
    const nextErrors = validateVendorStep(draft, step);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length === 0) {
      setStep(previous => Math.min(previous + 1, STEPS.length - 1));
    }
  };

  const previousStep = () => {
    setErrors({});
    setSubmitError('');
    if (step > 0) {
      setStep(previous => previous - 1);
    } else {
      navigation.goBack();
    }
  };

  const addGround = () => {
    setDraft(previous => ({ ...previous, grounds: [...previous.grounds, blankGround()] }));
  };

  const removeGround = index => {
    if (draft.grounds.length > 1) {
      setDraft(previous => ({
        ...previous,
        grounds: previous.grounds.filter((ground, groundIndex) => groundIndex !== index),
      }));
    }
  };

  const addEquipment = () => {
    setDraft(previous => ({
      ...previous,
      equipment: [
        ...previous.equipment,
        {
          id: `equipment-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}`,
          name: '',
          priceMode: 'Rental',
          unitPricePKR: '',
          quantityAvailable: '1',
        },
      ],
    }));
  };

  const removeEquipment = index => {
    setDraft(previous => ({
      ...previous,
      equipment: previous.equipment.filter((item, itemIndex) => itemIndex !== index),
    }));
  };

  const pickPhotos = async () => {
    if (pickerBusy) {
      return;
    }
    setPickerBusy(true);
    setMediaError('');
    try {
      const result = await launchImageLibrary({ mediaType: 'photo', selectionLimit: 5 });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        setMediaError(result.errorMessage || 'Photos could not be opened. You can skip this step.');
        return;
      }
      const uris = (result.assets || []).map(asset => asset.uri).filter(Boolean);
      setDraft(previous => ({
        ...previous,
        photoUris: [...new Set([...previous.photoUris, ...uris])].slice(0, 5),
      }));
    } catch (error) {
      setMediaError('Photos could not be opened. You can skip this step.');
    } finally {
      setPickerBusy(false);
    }
  };

  const pickVideo = async () => {
    if (pickerBusy) {
      return;
    }
    setPickerBusy(true);
    setMediaError('');
    try {
      const result = await launchImageLibrary({ mediaType: 'video', selectionLimit: 1 });
      if (result.didCancel) {
        return;
      }
      if (result.errorCode) {
        setMediaError(result.errorMessage || 'Video could not be selected. You can skip this step.');
        return;
      }
      const uri = result.assets?.[0]?.uri;
      if (uri) {
        setDraft(previous => ({ ...previous, videoUri: uri }));
      }
    } catch (error) {
      setMediaError('Video could not be selected. You can skip this step.');
    } finally {
      setPickerBusy(false);
    }
  };

  const submitRegistration = async () => {
    if (loading) {
      return;
    }
    Keyboard.dismiss();
    const nextErrors = validateVendorStep(draft, 6);
    setErrors(nextErrors);
    setSubmitError('');
    if (Object.keys(nextErrors).length > 0) {
      const firstInvalidStep = [0, 1, 2, 3, 4].find(index =>
        Object.keys(validateVendorStep(draft, index)).length > 0,
      );
      if (firstInvalidStep !== undefined) {
        setStep(firstInvalidStep);
      }
      return;
    }

    setLoading(true);
    try {
      const vendorProfile = {
        businessName: draft.businessName.trim(),
        venueName: draft.venueName.trim(),
        address: draft.address.trim(),
        city: draft.city.trim(),
        locationNote: draft.locationNote.trim(),
        sports: [...draft.sports],
        grounds: draft.grounds.map(ground => ({
          ...ground,
          name: ground.name.trim(),
          widthMeters: Number(ground.widthMeters),
          lengthMeters: Number(ground.lengthMeters),
          conditionRating: Number(ground.conditionRating),
          hourlyPricePKR: Number(ground.hourlyPricePKR),
        })),
        facilities: [...draft.facilities],
        parkingAvailable: draft.parkingAvailable,
        parkingSpaces: draft.parkingAvailable ? Number(draft.parkingSpaces) : 0,
        equipment: draft.equipment.map(item => ({
          ...item,
          name: item.name.trim(),
          unitPricePKR: Number(item.unitPricePKR),
          quantityAvailable: Number(item.quantityAvailable),
        })),
        photoUris: [...draft.photoUris],
        videoUri: draft.videoUri,
      };
      const result = await registerAccount({
        role: 'vendor',
        name: draft.name.trim(),
        email: draft.email,
        phone: draft.phone.trim(),
        password: draft.password,
        confirmPassword: draft.confirmPassword,
        preferredSports: [...draft.sports],
        vendorProfile,
      });
      dispatch(accountRegistered(result));
      setDraft(previous => ({ ...previous, password: '', confirmPassword: '' }));
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

  const renderAccountStep = () => (
    <>
      <FormField
        ref={ownerNameRef}
        label="Your full name"
        value={draft.name}
        onChangeText={value => updateField('name', value)}
        returnKeyType="next"
        onSubmitEditing={() => ownerEmailRef.current?.focus()}
        testID="vendor-owner-name"
        error={errors.name}
      />
      <FormField
        ref={ownerEmailRef}
        label="Email address"
        value={draft.email}
        onChangeText={value => updateField('email', value)}
        keyboardType="email-address"
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => ownerPhoneRef.current?.focus()}
        testID="vendor-email"
        error={errors.email}
      />
      <FormField
        ref={ownerPhoneRef}
        label="Phone number"
        value={draft.phone}
        onChangeText={value => updateField('phone', value)}
        keyboardType="phone-pad"
        returnKeyType="next"
        onSubmitEditing={() => ownerPasswordRef.current?.focus()}
        testID="vendor-phone"
        error={errors.phone}
      />
      <FormField
        label="Business name"
        value={draft.businessName}
        onChangeText={value => updateField('businessName', value)}
        testID="vendor-business-name"
        error={errors.businessName}
      />
      <FormField
        ref={ownerPasswordRef}
        label="Password"
        value={draft.password}
        onChangeText={value => updateField('password', value)}
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="next"
        onSubmitEditing={() => ownerConfirmRef.current?.focus()}
        testID="vendor-password"
        error={errors.password}
      />
      <FormField
        ref={ownerConfirmRef}
        label="Confirm password"
        value={draft.confirmPassword}
        onChangeText={value => updateField('confirmPassword', value)}
        secureTextEntry
        autoCapitalize="none"
        returnKeyType="done"
        testID="vendor-confirm-password"
        error={errors.confirmPassword}
      />
    </>
  );

  const renderVenueStep = () => (
    <>
      <FormField
        label="Venue name"
        value={draft.venueName}
        onChangeText={value => updateField('venueName', value)}
        testID="vendor-venue-name"
        error={errors.venueName}
      />
      <FormField
        label="Full venue address"
        value={draft.address}
        onChangeText={value => updateField('address', value)}
        multiline
        testID="vendor-address"
        error={errors.address}
      />
      <FormField
        label="City"
        value={draft.city}
        onChangeText={value => updateField('city', value)}
        testID="vendor-city"
        error={errors.city}
      />
      <FormField
        label="Area or nearby landmark (optional)"
        value={draft.locationNote}
        onChangeText={value => updateField('locationNote', value)}
        testID="vendor-location-note"
      />
      <Text style={[styles.helper, { color: colors.inkSoft }]}>
        Location is stored as the address you enter. This Day 1 demo does not request GPS access.
      </Text>
    </>
  );

  const renderGroundsStep = () => (
    <>
      <ChoiceChips
        label="Sports available at this venue"
        options={SPORTS}
        selected={draft.sports}
        onSelect={value => toggleListValue('sports', value)}
        multiple
        testID="vendor-sport"
        error={errors.sports}
      />
      <View style={styles.sectionRow}>
        <View style={styles.sectionCopy}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>Grounds & courts</Text>
          <Text style={[styles.helper, { color: colors.inkSoft }]}>
            Number of grounds: {draft.grounds.length}
          </Text>
        </View>
        <AppButton
          title="Add ground"
          testID="vendor-add-ground"
          variant="secondary"
          onPress={addGround}
          style={styles.smallButton}
          textStyle={styles.smallButtonText}
        />
      </View>
      {errors.grounds ? <Text style={[styles.error, { color: colors.error }]}>{errors.grounds}</Text> : null}
      {draft.grounds.map((ground, index) => (
        <View key={ground.id} style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <View style={styles.groundCardHeader}>
            <Text style={[styles.groundCardTitle, { color: colors.ink }]}>Ground {index + 1}</Text>
            {draft.grounds.length > 1 ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove ground ${index + 1}`}
                testID={`vendor-remove-ground-${index + 1}`}
                onPress={() => removeGround(index)}
                hitSlop={8}
              >
                <Text style={[styles.removeText, { color: colors.error }]}>Remove</Text>
              </Pressable>
            ) : null}
          </View>
          <FormField
            label="Ground or court name"
            value={ground.name}
            onChangeText={value => updateGround(index, 'name', value)}
            testID={`vendor-ground-name-${index + 1}`}
            error={errors[`grounds.${index}.name`]}
          />
          <ChoiceChips
            label="Sport for this ground"
            options={SPORTS}
            selected={ground.sport}
            onSelect={value => updateGround(index, 'sport', value)}
            testID={`vendor-ground-sport-${index + 1}`}
            error={errors[`grounds.${index}.sport`]}
          />
          <View style={styles.twoColumn}>
            <FormField
              label="Width (metres)"
              value={ground.widthMeters}
              onChangeText={value => updateGround(index, 'widthMeters', value)}
              keyboardType="decimal-pad"
              testID={`vendor-ground-width-${index + 1}`}
              error={errors[`grounds.${index}.widthMeters`]}
              style={styles.column}
            />
            <FormField
              label="Length (metres)"
              value={ground.lengthMeters}
              onChangeText={value => updateGround(index, 'lengthMeters', value)}
              keyboardType="decimal-pad"
              testID={`vendor-ground-length-${index + 1}`}
              error={errors[`grounds.${index}.lengthMeters`]}
              style={styles.column}
            />
          </View>
          <ChoiceChips
            label="Indoor or outdoor"
            options={['Indoor', 'Outdoor']}
            selected={ground.indoorOutdoor}
            onSelect={value => updateGround(index, 'indoorOutdoor', value)}
            testID={`vendor-ground-type-${index + 1}`}
            error={errors[`grounds.${index}.indoorOutdoor`]}
          />
          <ChoiceChips
            label="Surface"
            options={SURFACES}
            selected={ground.surface}
            onSelect={value => updateGround(index, 'surface', value)}
            testID={`vendor-ground-surface-${index + 1}`}
            error={errors[`grounds.${index}.surface`]}
          />
          <ChoiceChips
            label="Condition rating (1 to 5)"
            options={['1', '2', '3', '4', '5']}
            selected={ground.conditionRating}
            onSelect={value => updateGround(index, 'conditionRating', value)}
            testID={`vendor-ground-condition-${index + 1}`}
            error={errors[`grounds.${index}.conditionRating`]}
          />
          <FormField
            label="Hourly ground price (PKR)"
            value={ground.hourlyPricePKR}
            onChangeText={value => updateGround(index, 'hourlyPricePKR', value)}
            keyboardType="number-pad"
            testID={`vendor-ground-price-${index + 1}`}
            error={errors[`grounds.${index}.hourlyPricePKR`]}
          />
        </View>
      ))}
    </>
  );

  const renderFacilitiesStep = () => (
    <>
      <ChoiceChips
        label="Facilities available"
        options={FACILITIES}
        selected={draft.facilities}
        onSelect={value => toggleListValue('facilities', value)}
        multiple
        testID="vendor-facility"
      />
      <View style={[styles.parkingCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <View style={styles.parkingCopy}>
          <Text style={[styles.sectionTitle, { color: colors.ink }]}>On-site parking</Text>
          <Text style={[styles.helper, { color: colors.inkSoft }]}>Is parking available for visitors?</Text>
        </View>
        <AppButton
          title={draft.parkingAvailable ? 'Available' : 'Not available'}
          testID="vendor-parking-toggle"
          variant={draft.parkingAvailable ? 'primary' : 'secondary'}
          onPress={() => updateField('parkingAvailable', !draft.parkingAvailable)}
          style={styles.parkingButton}
          textStyle={styles.smallButtonText}
        />
      </View>
      {draft.parkingAvailable ? (
        <FormField
          label="Parking spaces"
          value={draft.parkingSpaces}
          onChangeText={value => updateField('parkingSpaces', value)}
          keyboardType="number-pad"
          testID="vendor-parking-spaces"
          error={errors.parkingSpaces}
        />
      ) : null}
      <Text style={[styles.helper, { color: colors.inkSoft }]}>
        Facilities and parking details are saved to your local vendor profile.
      </Text>
    </>
  );

  const renderEquipmentStep = () => (
    <>
      <Text style={[styles.helper, { color: colors.inkSoft, marginBottom: 14 }]}>
        Equipment is optional. Add items that players can rent or buy at the venue.
      </Text>
      <AppButton
        title="Add equipment or supply"
        testID="vendor-add-equipment"
        variant="secondary"
        onPress={addEquipment}
        style={styles.addRowButton}
      />
      {draft.equipment.map((item, index) => (
        <View key={item.id} style={[styles.formCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <View style={styles.groundCardHeader}>
            <Text style={[styles.groundCardTitle, { color: colors.ink }]}>Item {index + 1}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Remove equipment item ${index + 1}`}
              testID={`vendor-remove-equipment-${index + 1}`}
              onPress={() => removeEquipment(index)}
              hitSlop={8}
            >
              <Text style={[styles.removeText, { color: colors.error }]}>Remove</Text>
            </Pressable>
          </View>
          <FormField
            label="Equipment or supply name"
            value={item.name}
            onChangeText={value => updateEquipment(index, 'name', value)}
            testID={`vendor-equipment-name-${index + 1}`}
            error={errors[`equipment.${index}.name`]}
          />
          <ChoiceChips
            label="Price type"
            options={['Rental', 'Sale']}
            selected={item.priceMode}
            onSelect={value => updateEquipment(index, 'priceMode', value)}
            testID={`vendor-equipment-mode-${index + 1}`}
            error={errors[`equipment.${index}.priceMode`]}
          />
          <View style={styles.twoColumn}>
            <FormField
              label="Price (PKR)"
              value={item.unitPricePKR}
              onChangeText={value => updateEquipment(index, 'unitPricePKR', value)}
              keyboardType="number-pad"
              testID={`vendor-equipment-price-${index + 1}`}
              error={errors[`equipment.${index}.unitPricePKR`]}
              style={styles.column}
            />
            <FormField
              label="Quantity"
              value={item.quantityAvailable}
              onChangeText={value => updateEquipment(index, 'quantityAvailable', value)}
              keyboardType="number-pad"
              testID={`vendor-equipment-quantity-${index + 1}`}
              error={errors[`equipment.${index}.quantityAvailable`]}
              style={styles.column}
            />
          </View>
        </View>
      ))}
    </>
  );

  const removePhoto = index => {
    setDraft(previous => ({
      ...previous,
      photoUris: previous.photoUris.filter((uri, photoIndex) => photoIndex !== index),
    }));
  };

  const renderMediaStep = () => (
    <>
      <Text style={[styles.helper, { color: colors.inkSoft, marginBottom: 14 }]}>
        Photos and video are optional. Your venue can be registered without media.
      </Text>
      <View style={styles.mediaActions}>
        <AppButton
          title={pickerBusy ? 'Opening library…' : 'Choose venue photos'}
          testID="vendor-pick-photos"
          variant="secondary"
          onPress={pickPhotos}
          disabled={pickerBusy}
          loading={pickerBusy}
          style={styles.mediaButton}
        />
        <AppButton
          title="Choose optional video"
          testID="vendor-pick-video"
          variant="secondary"
          onPress={pickVideo}
          disabled={pickerBusy}
          style={styles.mediaButton}
        />
      </View>
      {mediaError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{mediaError}</Text> : null}
      {draft.photoUris.length > 0 ? (
        <View style={styles.photoGrid}>
          {draft.photoUris.map((uri, index) => (
            <View key={`${uri}-${index}`} style={styles.photoWrap}>
              <Image source={{ uri }} style={[styles.photo, { borderRadius: radius.md }]} />
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Remove photo ${index + 1}`}
                testID={`vendor-remove-photo-${index + 1}`}
                onPress={() => removePhoto(index)}
                style={[styles.photoRemove, { backgroundColor: colors.ink }]}
              >
                <Text style={styles.photoRemoveText}>×</Text>
              </Pressable>
            </View>
          ))}
        </View>
      ) : (
        <View style={[styles.mediaPlaceholder, { backgroundColor: colors.limePale, borderRadius: radius.lg }]}>
          <Text style={styles.mediaPlaceholderIcon}>▧</Text>
          <Text style={[styles.mediaPlaceholderTitle, { color: colors.ink }]}>No photos selected</Text>
          <Text style={[styles.helper, { color: colors.inkSoft }]}>You can add venue photos later.</Text>
        </View>
      )}
      {draft.videoUri ? (
        <View style={[styles.videoRow, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
          <Text style={[styles.videoLabel, { color: colors.ink }]} numberOfLines={1}>Video selected</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remove selected video"
            testID="vendor-remove-video"
            onPress={() => updateField('videoUri', null)}
          >
            <Text style={[styles.removeText, { color: colors.error }]}>Remove</Text>
          </Pressable>
        </View>
      ) : null}
    </>
  );

  const renderReviewStep = () => (
    <>
      <View style={[styles.reviewCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.lg }]}>
        <Text style={[styles.reviewCardTitle, { color: colors.ink }]}>{draft.venueName || 'Venue review'}</Text>
        <Text style={[styles.reviewCardSubtitle, { color: colors.inkSoft }]}>
          Local demo profile · {draft.city || 'City'}
        </Text>
        <ReviewRow label="Owner" value={`${draft.name} · ${draft.email}`} />
        <ReviewRow label="Business" value={draft.businessName} />
        <ReviewRow label="Address" value={`${draft.address}, ${draft.city}`} />
        <ReviewRow label="Sports" value={draft.sports.join(', ')} />
        <ReviewRow label="Grounds" value={`${draft.grounds.length} · ${draft.grounds.map(item => item.name).join(', ')}`} />
        {draft.grounds.map(ground => (
          <View key={ground.id} style={[styles.groundSummary, { borderColor: colors.border }]}>
            <Text style={[styles.groundSummaryTitle, { color: colors.ink }]}>{ground.name || 'Unnamed ground'} · {ground.sport || 'Sport'}</Text>
            <Text style={[styles.helper, { color: colors.inkSoft }]}>
              {ground.widthMeters || '—'} × {ground.lengthMeters || '—'} m · {ground.indoorOutdoor || 'Type'} · {ground.surface || 'Surface'} · Condition {ground.conditionRating || '—'}/5
            </Text>
            <Text style={[styles.groundSummaryTitle, { color: colors.primary }]}>PKR {ground.hourlyPricePKR || '—'} / hour</Text>
          </View>
        ))}
        <ReviewRow label="Facilities" value={draft.facilities.join(', ') || 'None added'} />
        <ReviewRow label="Parking" value={draft.parkingAvailable ? `${draft.parkingSpaces} spaces` : 'Not available'} />
        <ReviewRow label="Equipment" value={draft.equipment.length ? `${draft.equipment.length} items` : 'None added'} />
        <ReviewRow label="Media" value={`${draft.photoUris.length} photo(s)${draft.videoUri ? ' · video selected' : ''}`} />
      </View>
      <Text style={[styles.localNote, { color: colors.inkSoft }]}>
        Submitting saves this profile on this device. No venue is published to a server.
      </Text>
    </>
  );

  const renderStep = () => {
    if (step === 0) {
      return renderAccountStep();
    }
    if (step === 1) {
      return renderVenueStep();
    }
    if (step === 2) {
      return renderGroundsStep();
    }
    if (step === 3) {
      return renderFacilitiesStep();
    }
    if (step === 4) {
      return renderEquipmentStep();
    }
    if (step === 5) {
      return renderMediaStep();
    }
    return renderReviewStep();
  };

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <ScreenHeader
            eyebrow="VENUE PROVIDER SETUP"
            title={STEPS[step]}
            subtitle="Your details stay in this demo until you finish registration."
            onBack={previousStep}
          />
          <View style={styles.progressMeta}>
            <Text style={[styles.progressText, { color: colors.inkSoft }]}>STEP {step + 1} OF {STEPS.length}</Text>
            <Text style={[styles.progressText, { color: colors.primary }]}>{Math.round(((step + 1) / STEPS.length) * 100)}%</Text>
          </View>
          <View style={[styles.progressTrack, { backgroundColor: colors.border, borderRadius: radius.pill }]}>
            <View style={[styles.progressFill, { backgroundColor: colors.primary, borderRadius: radius.pill, width: `${((step + 1) / STEPS.length) * 100}%` }]} />
          </View>

          <View style={styles.stepContent}>{renderStep()}</View>

          {submitError ? (
            <Text accessibilityRole="alert" testID="vendor-registration-error" style={[styles.submitError, { color: colors.error }]}>
              {submitError}
            </Text>
          ) : null}

          <View style={styles.navigationButtons}>
            {step > 0 ? (
              <AppButton
                title="Back"
                testID="vendor-back"
                variant="secondary"
                onPress={previousStep}
                style={styles.backStepButton}
              />
            ) : null}
            {step < STEPS.length - 1 ? (
              <AppButton
                title="Continue"
                testID="vendor-next"
                onPress={nextStep}
                style={styles.nextStepButton}
              />
            ) : (
              <AppButton
                title="Create venue profile"
                testID="vendor-submit"
                onPress={submitRegistration}
                loading={loading}
                disabled={loading}
                style={styles.nextStepButton}
              />
            )}
          </View>
          <Text style={[styles.localNote, { color: colors.inkSoft }]}>Local frontend demo · no payment, email, or server verification</Text>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  content: { padding: 20, paddingTop: 12, paddingBottom: 26, flexGrow: 1 },
  progressMeta: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  progressText: { fontSize: 10, fontWeight: '900', letterSpacing: 1 },
  progressTrack: { height: 6, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: '100%' },
  stepContent: { flexGrow: 1 },
  sectionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, gap: 10 },
  sectionCopy: { flex: 1 },
  sectionTitle: { fontSize: 15, fontWeight: '800' },
  helper: { fontSize: 12, lineHeight: 18 },
  smallButton: { minHeight: 39, paddingHorizontal: 12 },
  smallButtonText: { fontSize: 11 },
  formCard: { borderWidth: 1, padding: 13, marginBottom: 12 },
  groundCardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 13 },
  groundCardTitle: { fontSize: 14, fontWeight: '800' },
  removeText: { fontSize: 12, fontWeight: '800' },
  twoColumn: { flexDirection: 'row', gap: 10 },
  column: { flex: 1 },
  error: { fontSize: 12, marginBottom: 9 },
  parkingCard: { borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 15 },
  parkingCopy: { flex: 1 },
  parkingButton: { minHeight: 42, paddingHorizontal: 11 },
  addRowButton: { marginBottom: 15 },
  mediaActions: { gap: 9 },
  mediaButton: { minHeight: 49 },
  mediaPlaceholder: { marginTop: 16, minHeight: 160, alignItems: 'center', justifyContent: 'center', padding: 20 },
  mediaPlaceholderIcon: { color: '#1C7A4A', fontSize: 32, marginBottom: 8 },
  mediaPlaceholderTitle: { fontSize: 14, fontWeight: '800', marginBottom: 5 },
  photoGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 9, marginTop: 16 },
  photoWrap: { position: 'relative' },
  photo: { width: 88, height: 88, backgroundColor: '#E4E9E1' },
  photoRemove: { position: 'absolute', top: 4, right: 4, width: 24, height: 24, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  photoRemoveText: { color: '#FFFFFF', fontWeight: '900', fontSize: 17, lineHeight: 19 },
  videoRow: { borderWidth: 1, padding: 13, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12, gap: 12 },
  videoLabel: { flex: 1, fontSize: 12, fontWeight: '700' },
  reviewCard: { borderWidth: 1, padding: 15 },
  reviewCardTitle: { fontSize: 20, lineHeight: 26, fontWeight: '900' },
  reviewCardSubtitle: { fontSize: 12, marginTop: 3, marginBottom: 12 },
  reviewRow: { minHeight: 42, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 8 },
  reviewLabel: { flex: 0.8, fontSize: 11, fontWeight: '600' },
  reviewValue: { flex: 1.2, fontSize: 11, fontWeight: '800', textAlign: 'right' },
  groundSummary: { borderBottomWidth: StyleSheet.hairlineWidth, paddingVertical: 11 },
  groundSummaryTitle: { fontSize: 12, lineHeight: 18, fontWeight: '800' },
  submitError: { fontSize: 13, lineHeight: 19, marginBottom: 10 },
  navigationButtons: { flexDirection: 'row', gap: 10, marginTop: 18 },
  backStepButton: { flex: 0.75 },
  nextStepButton: { flex: 1 },
  localNote: { textAlign: 'center', fontSize: 10, lineHeight: 15, marginTop: 12 },
});
