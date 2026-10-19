import React, { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import { submitVenueReview } from '../store/venueSlice';
import { canReviewVenue, validateReview } from '../utils/venueDiscovery';

export default function AddReviewScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const dispatch = useDispatch();
  const { currentUser } = useSelector(state => state.auth);
  const venueId = route.params?.venueId;
  const venue = useSelector(state => state.venues.venues.find(item => item.id === venueId));
  const bookings = useSelector(state => state.venues.bookings);
  const eligible = canReviewVenue({ user: currentUser, bookings, venueId });
  const [stars, setStars] = useState(0);
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState({});
  const [saved, setSaved] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const submit = () => {
    const nextErrors = validateReview(stars, comment);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    const result = dispatch(submitVenueReview({ venueId, stars, comment }));
    if (!result.ok) {
      setSubmitError(result.error);
      return;
    }
    setSubmitError('');
    setSaved(true);
  };

  if (!venue) return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><View style={styles.content}><Text style={[styles.title, { color: colors.ink }]}>Venue unavailable</Text><AppButton title="Back" onPress={() => navigation.goBack()} /></View></SafeAreaView>;

  if (!eligible) return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><View style={styles.content}>
    <ScreenHeader title={`Review ${venue.name}`} subtitle="Reviews are available after a completed visit." onBack={() => navigation.goBack()} />
    <View style={[styles.saved, { backgroundColor: colors.surface, borderRadius: radius.md }]}><Text style={{ color: colors.ink, fontSize: 12, lineHeight: 18 }}>To review this venue, sign in with a player account, finish your booking and have the venue confirm your attendance. Cancelled, upcoming and unconfirmed visits do not qualify.</Text></View>
    <AppButton title="Back to venue" onPress={() => navigation.goBack()} style={styles.submit} />
  </View></SafeAreaView>;

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
    <ScreenHeader title={`Review ${venue.name}`} subtitle="Your review is saved on this device as local demo data." onBack={() => navigation.goBack()} />
    <Text style={[styles.label, { color: colors.ink }]}>Your rating</Text><View style={styles.stars}>{[1, 2, 3, 4, 5].map(value => <Pressable key={value} accessibilityRole="button" accessibilityLabel={`${value} star${value === 1 ? '' : 's'}`} accessibilityState={{ selected: stars === value }} testID={`review-star-${value}`} onPress={() => { setStars(value); setSaved(false); setErrors(previous => ({ ...previous, stars: undefined })); }} hitSlop={8}><Text style={[styles.star, { color: value <= stars ? colors.orange : colors.border }]}>★</Text></Pressable>)}</View>
    {errors.stars ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{errors.stars}</Text> : null}
    <Text style={[styles.label, { color: colors.ink, marginTop: 23 }]}>Tell other players about your visit</Text>
    <TextInput accessibilityLabel="Review comment" testID="review-comment" value={comment} onChangeText={value => { setComment(value); setErrors(previous => ({ ...previous, comment: undefined })); setSaved(false); }} placeholder="What should players know?" placeholderTextColor={colors.muted} multiline textAlignVertical="top" maxLength={500} style={[styles.comment, { color: colors.ink, backgroundColor: colors.surface, borderColor: errors.comment ? colors.error : colors.border, borderRadius: radius.md }]} />
    {errors.comment ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{errors.comment}</Text> : null}
    {submitError ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{submitError}</Text> : null}
    <Text style={[styles.counter, { color: colors.inkSoft }]}>{comment.trim().length}/500 · minimum 8 characters</Text>
    {saved ? <View accessibilityLiveRegion="polite" style={[styles.saved, { backgroundColor: colors.limePale, borderRadius: radius.md }]}><Text style={{ color: colors.primaryDark, fontSize: 12, fontWeight: '800' }}>Review saved. The venue rating has been updated.</Text></View> : null}
    <AppButton title={saved ? 'Review saved' : 'Submit review'} testID="review-submit" onPress={submit} disabled={saved} style={styles.submit} />
  </ScrollView></SafeAreaView>;
}

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: 20, paddingTop: 25, flexGrow: 1 }, title: { fontSize: 22, fontWeight: '900' }, subtitle: { fontSize: 11, lineHeight: 17, marginTop: 5 }, label: { fontSize: 13, fontWeight: '800', marginTop: 24 }, stars: { flexDirection: 'row', gap: 8, marginTop: 12 }, star: { fontSize: 34 }, error: { fontSize: 11, marginTop: 5 }, comment: { minHeight: 150, borderWidth: 1, padding: 13, fontSize: 13, marginTop: 9 }, counter: { fontSize: 10, textAlign: 'right', marginTop: 6 }, saved: { padding: 12, marginTop: 17 }, submit: { marginTop: 20 } });
