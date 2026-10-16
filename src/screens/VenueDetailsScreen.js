import React, { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useDispatch, useSelector } from 'react-redux';
import AppButton from '../components/AppButton';
import VenueArtwork from '../components/VenueArtwork';
import VenuePhotoSlider from '../components/VenuePhotoSlider';
import { useTheme } from '../context/ThemeContext';
import { conversationCreated, createCommunityId } from '../store/communitySlice';
import { getVenueRating, haversineDistanceKm } from '../utils/venueDiscovery';

export default function VenueDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const { venueId } = route.params || {};
  const { venues, grounds, equipment, reviews } = useSelector(state => state.venues);
  const currentUser = useSelector(state => state.auth.currentUser);
  const vendorProfile = useSelector(state => state.venues.vendorProfiles.find(item => item.id === venueVendorId(state, venueId)) || null);
  const conversations = useSelector(state => state.community.conversations);
  const venue = venues.find(item => item.id === venueId);
  const venueGrounds = useMemo(() => grounds.filter(item => item.venueId === venueId && item.isActive), [grounds, venueId]);
  const venueEquipment = useMemo(() => equipment.filter(item => item.venueId === venueId && item.active), [equipment, venueId]);
  const venueReviews = useMemo(() => reviews.filter(item => item.venueId === venueId), [reviews, venueId]);
  const rating = getVenueRating(venueReviews);
  const distance = venue ? haversineDistanceKm({ latitude: 31.5204, longitude: 74.3587 }, venue) : null;
  const photoUris = venue?.photoUris?.filter(uri => typeof uri === 'string' && uri.length > 0) || [];

  if (!venue) return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}><View style={styles.missing}><Text style={[styles.title, { color: colors.ink }]}>Venue unavailable</Text><AppButton title="Back to search" onPress={() => navigation.navigate('VenueSearch')} /></View></SafeAreaView>;

  return <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]} edges={['top']}>
    <ScrollView contentContainerStyle={styles.content}>
      <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => navigation.goBack()} style={styles.back}><Text style={[styles.backText, { color: colors.primary }]}>‹  Explore venues</Text></Pressable>
      {photoUris.length ? <VenuePhotoSlider photos={photoUris} venueName={venue.name} radius={radius.lg} /> : <VenueArtwork sport={venue.sports[0]} />}
      <View style={styles.titleRow}><View style={{ flex: 1 }}><Text style={[styles.title, { color: colors.ink }]}>{venue.name}</Text><Text style={[styles.subtitle, { color: colors.inkSoft }]}>{venue.locationNote || venue.city} · {venue.city}</Text></View><View style={[styles.ratingPill, { backgroundColor: colors.surface, borderRadius: radius.md }]}><Text style={{ color: colors.orange, fontWeight: '900' }}>★ {rating.count ? rating.average.toFixed(1) : 'New'}</Text><Text style={[styles.small, { color: colors.inkSoft }]}>{rating.count} reviews</Text></View></View>
      <View style={[styles.quickFacts, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <Fact label="SPORTS" value={venue.sports.join(', ')} colors={colors} />
        <Fact label="FROM" value={venueGrounds.length ? `PKR ${Math.min(...venueGrounds.map(item => item.hourlyPricePKR)).toLocaleString()}/hr` : 'Ask venue'} colors={colors} />
        <Fact label="DISTANCE" value={distance === null ? 'Unavailable' : `~${distance.toFixed(1)} km`} colors={colors} />
      </View>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>About this venue</Text><Text style={[styles.body, { color: colors.inkSoft }]}>{venue.description}</Text>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Grounds & courts</Text>
      {venueGrounds.length ? venueGrounds.map(ground => <View key={ground.id} style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}>
        <View style={styles.groundHead}><Text style={[styles.cardTitle, { color: colors.ink }]}>{ground.name}</Text><Text style={[styles.price, { color: colors.primary }]}>PKR {ground.hourlyPricePKR.toLocaleString()}/hr</Text></View>
        <Text style={[styles.body, { color: colors.inkSoft }]}>{ground.sport} · {ground.indoorOutdoor} · {ground.surface}</Text>
        <Text style={[styles.body, { color: colors.inkSoft }]}>{ground.widthMeters} × {ground.lengthMeters} m · condition {ground.conditionRating}/5 · {ground.slotDurationMinutes} min slots</Text>
      </View>) : <Text style={[styles.body, { color: colors.inkSoft }]}>No active grounds are listed.</Text>}
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Facilities</Text>
      <View style={styles.chips}>{venue.facilities.map(item => <Pill key={item} title={item} colors={colors} radius={radius} />)}{venue.parkingAvailable ? <Pill title={`Parking${venue.parkingSpaces ? ` · ${venue.parkingSpaces} spaces` : ''}`} colors={colors} radius={radius} /> : null}</View>
      {venue.facilities.length === 0 && !venue.parkingAvailable ? <Text style={[styles.body, { color: colors.inkSoft }]}>No facilities listed.</Text> : null}
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>Equipment add-ons</Text>
      {venueEquipment.length ? venueEquipment.map(item => <View key={item.id} style={styles.equipmentRow}><Text style={[styles.body, { color: colors.ink }]}>{item.name} · {item.priceMode}</Text><Text style={[styles.body, { color: colors.primary, fontWeight: '800' }]}>PKR {item.unitPricePKR.toLocaleString()}</Text></View>) : <Text style={[styles.body, { color: colors.inkSoft }]}>No add-ons listed.</Text>}
      <View style={styles.reviewsHead}><Text style={[styles.sectionTitle, { color: colors.ink, marginBottom: 0 }]}>Reviews</Text><Pressable accessibilityRole="button" testID="venue-see-reviews" onPress={() => navigation.navigate('VenueReviews', { venueId })}><Text style={{ color: colors.primary, fontWeight: '800', fontSize: 12 }}>See all</Text></Pressable></View>
      <View style={[styles.ratingSummary, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md }]}><Text style={[styles.bigRating, { color: colors.ink }]}>{rating.count ? rating.average.toFixed(1) : '—'}</Text><View style={{ flex: 1 }}><Text style={{ color: colors.orange }}>★★★★★</Text><Text style={[styles.small, { color: colors.inkSoft }]}>{rating.count} local demo reviews</Text></View><Pressable accessibilityRole="button" testID="venue-add-review" onPress={() => navigation.navigate('AddReview', { venueId })}><Text style={{ color: colors.primary, fontSize: 11, fontWeight: '900' }}>Write a review</Text></Pressable></View>
      {venueReviews.slice(0, 2).map(review => <View key={review.id} style={styles.reviewRow}><Text style={[styles.cardTitle, { color: colors.ink }]}>{review.playerName}  <Text style={{ color: colors.orange }}>★ {review.stars}</Text></Text><Text style={[styles.body, { color: colors.inkSoft }]}>{review.comment}</Text></View>)}
      <Text style={[styles.small, { color: colors.inkSoft, marginTop: 12 }]}>Approximate location: {venue.address}. {venue.demoLabel}</Text>
      {currentUser?.role === 'player' && vendorProfile?.ownerUserId ? <AppButton title="Chat with vendor" testID="venue-chat-with-vendor" variant="secondary" onPress={() => {
        const existing = conversations.find(item => item.kind === 'venue-vendor' && item.venueId === venueId && item.playerUserId === currentUser.id && item.vendorUserId === vendorProfile.ownerUserId);
        if (existing) {
          navigation.navigate('ChatConversation', { conversationId: existing.id });
          return;
        }
        const conversation = {
          id: createCommunityId('conversation'),
          kind: 'venue-vendor',
          venueId,
          venueName: venue.name,
          vendorId: venue.vendorId,
          vendorUserId: vendorProfile.ownerUserId,
          playerUserId: currentUser.id,
          playerName: currentUser.name,
          title: venue.name,
          subtitle: `${currentUser.name} · ${venue.name}`,
          participantIds: [currentUser.id, vendorProfile.ownerUserId],
          unreadByUser: { [currentUser.id]: 0, [vendorProfile.ownerUserId]: 0 },
          lastMessage: 'Conversation started. Send a message to the vendor.',
          lastAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };
        dispatch(conversationCreated(conversation));
        navigation.navigate('ChatConversation', { conversationId: conversation.id });
      }} style={styles.chatButton} /> : null}
      <AppButton title="Continue to booking" testID="venue-booking-cta" onPress={() => navigation.navigate('SlotSelection', { venueId, groundId: venueGrounds[0]?.id })} disabled={venueGrounds.length === 0} style={styles.booking} />
    </ScrollView>
  </SafeAreaView>;
}

function venueVendorId(state, venueId) {
  return state.venues.venues.find(item => item.id === venueId)?.vendorId;
}

function Fact({ label, value, colors }) { return <View style={styles.fact}><Text style={[styles.factLabel, { color: colors.inkSoft }]}>{label}</Text><Text numberOfLines={2} style={[styles.factValue, { color: colors.ink }]}>{value}</Text></View>; }
function Pill({ title, colors, radius }) { return <View style={[styles.pill, { backgroundColor: colors.limePale, borderRadius: radius.pill }]}><Text style={{ color: colors.primaryDark, fontSize: 10, fontWeight: '700' }}>{title}</Text></View>; }

const styles = StyleSheet.create({ safe: { flex: 1 }, content: { padding: 18, paddingBottom: 32 }, missing: { padding: 20, gap: 18 }, back: { paddingVertical: 5, marginBottom: 10 }, backText: { fontSize: 12, fontWeight: '900' },
  titleRow: { flexDirection: 'row', gap: 9, alignItems: 'center', marginTop: 15 }, title: { fontSize: 22, fontWeight: '900' }, subtitle: { fontSize: 11, marginTop: 3 }, ratingPill: { padding: 10, alignItems: 'center' }, small: { fontSize: 9, lineHeight: 14 },
  quickFacts: { flexDirection: 'row', borderWidth: 1, paddingVertical: 13, marginTop: 15 }, fact: { flex: 1, paddingHorizontal: 10 }, factLabel: { fontSize: 8, fontWeight: '900', letterSpacing: 0.7 }, factValue: { fontSize: 11, fontWeight: '800', marginTop: 5 }, sectionTitle: { fontSize: 16, fontWeight: '900', marginTop: 20, marginBottom: 9 }, body: { fontSize: 11, lineHeight: 17, marginTop: 3 },
  infoCard: { borderWidth: 1, padding: 13, marginBottom: 8 }, groundHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 7 }, cardTitle: { fontSize: 12, fontWeight: '900' }, price: { color: '#1A8F57', fontSize: 10, fontWeight: '900' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 7 }, pill: { paddingHorizontal: 10, paddingVertical: 7 }, equipmentRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E6ED' },
  reviewsHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 17 }, ratingSummary: { borderWidth: 1, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 11, marginTop: 10 }, bigRating: { fontSize: 25, fontWeight: '900' }, reviewRow: { paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E0E6ED' }, chatButton: { marginTop: 18 }, booking: { marginTop: 10 },
});
