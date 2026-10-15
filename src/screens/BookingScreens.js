import React, { useMemo, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
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
import ChoiceChips from '../components/ChoiceChips';
import { DesignCard, EmptyState, InlineNotice, SectionHeading, StatusBadge } from '../components/DesignPrimitives';
import FormField from '../components/FormField';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';
import {
  calculateEquipmentSubtotal,
  calculateGroundFee,
  formatDateKey,
  formatPKR,
  formatTimeRange,
  getBookingDisplayStatus,
  getNextBookableDates,
  getSlotAvailability,
  toLocalDateKey,
} from '../utils/booking';
import { bookingCancelled, reserveBooking } from '../store/venueSlice';
import { selectBookingsForUser, selectBookingsForVendor } from '../store/selectors/bookingSelectors';
import { selectVenueById, selectGroundsByVenueId, selectEquipmentByVenueId, selectVenuesByOwnerId } from '../store/selectors/venueSelectors';

function PageShell({ navigation, title, subtitle, eyebrow, children, footer }) {
  const { colors } = useTheme();
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView contentContainerStyle={styles.pageContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
          <ScreenHeader title={title} subtitle={subtitle} eyebrow={eyebrow} onBack={() => navigation.goBack()} />
          {children}
          {footer ? <View style={styles.footer}>{footer}</View> : null}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function DateRail({ dates, selectedDate, onSelect, testID }) {
  const { colors, radius } = useTheme();
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRail}>
      {dates.map(item => {
        const selected = item.dateKey === selectedDate;
        return (
          <Pressable
            key={item.dateKey}
            accessibilityRole="button"
            accessibilityLabel={`${item.dayLabel}, ${item.detailLabel}`}
            accessibilityState={{ selected }}
            testID={`${testID}-${item.dateKey}`}
            onPress={() => onSelect(item.dateKey)}
            style={[
              styles.dateChip,
              {
                backgroundColor: selected ? colors.primary : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radius.md,
              },
            ]}
          >
            <Text style={[styles.dateDay, { color: selected ? colors.white : colors.inkSoft }]}>{item.dayLabel}</Text>
            <Text style={[styles.dateDetail, { color: selected ? colors.white : colors.ink }]}>{item.detailLabel}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function GroundRail({ grounds, selectedGroundId, onSelect, testID }) {
  const { colors, radius } = useTheme();
  if (grounds.length < 2) return null;
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.dateRail}>
      {grounds.map(ground => {
        const selected = ground.id === selectedGroundId;
        return (
          <Pressable
            key={ground.id}
            accessibilityRole="button"
            accessibilityLabel={`Choose ${ground.name}`}
            accessibilityState={{ selected }}
            testID={`${testID}-${ground.id}`}
            onPress={() => onSelect(ground.id)}
            style={[
              styles.groundChip,
              {
                backgroundColor: selected ? colors.limePale : colors.surface,
                borderColor: selected ? colors.primary : colors.border,
                borderRadius: radius.pill,
              },
            ]}
          >
            <Text style={[styles.groundChipText, { color: selected ? colors.primaryDark : colors.inkSoft }]}>{ground.name}</Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

function isSlotInFuture(slot, now = new Date()) {
  const startsAt = new Date(`${slot.date}T${slot.startTime}:00`);
  return !Number.isNaN(startsAt.getTime()) && startsAt.getTime() > now.getTime();
}

function SlotRow({ slot, selected, disabled, statusLabel, onPress, testID }) {
  const { colors, radius } = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${formatTimeRange(slot.startTime, slot.endTime)}, ${statusLabel}`}
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      testID={testID}
      onPress={onPress}
      style={[
        styles.slotRow,
        {
          backgroundColor: selected ? colors.limePale : colors.surface,
          borderColor: selected ? colors.primary : colors.border,
          borderRadius: radius.md,
          opacity: disabled ? 0.58 : 1,
        },
      ]}
    >
      <View style={styles.slotCopy}>
        <Text style={[styles.slotTime, { color: colors.ink }]}>{formatTimeRange(slot.startTime, slot.endTime)}</Text>
        <Text style={[styles.slotState, { color: disabled ? colors.inkSoft : colors.primary }]}>{statusLabel}</Text>
      </View>
      {selected ? <Text style={[styles.checkmark, { color: colors.primary }]}>✓</Text> : null}
    </Pressable>
  );
}

export function SlotSelectionScreen({ navigation, route }) {
  const { colors } = useTheme();
  const venueId = route.params?.venueId;
  const venue = useSelector(state => selectVenueById(state, venueId));
  const grounds = useSelector(state => selectGroundsByVenueId(state, venueId)).filter(ground => ground.isActive !== false);
  const { slots, bookings } = useSelector(state => state.venues);
  const [selectedDate, setSelectedDate] = useState(toLocalDateKey());
  const [selectedGroundId, setSelectedGroundId] = useState(route.params?.groundId || grounds[0]?.id || '');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const dates = useMemo(() => getNextBookableDates(), []);
  const selectedGround = grounds.find(ground => ground.id === selectedGroundId) || grounds[0];
  const daySlots = useMemo(() => slots
    .filter(slot => slot.groundId === selectedGround?.id && slot.date === selectedDate)
    .sort((first, second) => first.startTime.localeCompare(second.startTime)), [slots, selectedGround, selectedDate]);

  const continueToAddons = () => {
    const slot = daySlots.find(item => item.id === selectedSlotId);
    if (!slot) return;
    navigation.navigate('EquipmentAddons', {
      venueId,
      groundId: selectedGround.id,
      slotId: slot.id,
    });
  };

  return (
    <PageShell
      navigation={navigation}
      eyebrow="BOOK A SLOT"
      title="Choose a time"
      subtitle={venue ? `${venue.name} · select a ground and an available slot` : 'Select an available venue slot.'}
      footer={(
        <AppButton
          title="Continue to equipment"
          testID="slot-continue"
          onPress={continueToAddons}
          disabled={!selectedSlotId}
        />
      )}
    >
      {!venue || !grounds.length ? (
        <EmptyState title="Venue unavailable" description="This venue has no active grounds to book." />
      ) : (
        <>
          {grounds.length > 1 ? (
            <>
              <SectionHeading title="Ground or court" />
              <GroundRail grounds={grounds} selectedGroundId={selectedGround?.id} onSelect={id => { setSelectedGroundId(id); setSelectedSlotId(''); }} testID="slot-ground" />
            </>
          ) : null}
          <SectionHeading title="Select a date" />
          <DateRail dates={dates} selectedDate={selectedDate} onSelect={date => { setSelectedDate(date); setSelectedSlotId(''); }} testID="slot-date" />
          <DesignCard style={styles.groundSummary}>
            <Text style={[styles.cardTitle, { color: colors.ink }]}>{selectedGround?.name}</Text>
            <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{selectedGround?.sport} · {selectedGround?.indoorOutdoor} · {selectedGround?.surface}</Text>
            <Text style={[styles.price, { color: colors.primary }]}>{formatPKR(selectedGround?.hourlyPricePKR)} / hour</Text>
          </DesignCard>
          <SectionHeading title="Available times" />
          {daySlots.length ? daySlots.map(slot => {
            const availability = getSlotAvailability({ slotId: slot.id, slots, bookings });
            const past = !isSlotInFuture(slot);
            const unavailable = !availability.available || past;
            const label = past ? 'Time has passed' : availability.reason === 'booked' ? 'Booked' : availability.available ? 'Available' : 'Unavailable';
            return (
              <SlotRow
                key={slot.id}
                slot={slot}
                selected={slot.id === selectedSlotId}
                disabled={unavailable}
                statusLabel={label}
                testID={`slot-time-${slot.id}`}
                onPress={() => setSelectedSlotId(slot.id)}
              />
            );
          }) : (
            <InlineNotice>No slots have been added for this ground on {formatDateKey(selectedDate)}. Ask the venue provider to add availability.</InlineNotice>
          )}
        </>
      )}
    </PageShell>
  );
}

export function EquipmentAddonsScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const { venues, grounds, equipment, slots, bookings } = useSelector(state => state.venues);
  const { venueId, groundId, slotId } = route.params || {};
  const venue = venues.find(item => item.id === venueId);
  const ground = grounds.find(item => item.id === groundId);
  const slot = slots.find(item => item.id === slotId);
  const available = Boolean(slot && getSlotAvailability({ slotId, slots, bookings }).available && isSlotInFuture(slot));
  const items = equipment.filter(item => item.venueId === venueId && item.active !== false);
  const [quantities, setQuantities] = useState({});
  const groundFee = calculateGroundFee(ground, slot);
  const selections = Object.entries(quantities).map(([equipmentId, quantity]) => ({ equipmentId, quantity }));
  const addOnsTotal = calculateEquipmentSubtotal(items, selections);

  const changeQuantity = (item, delta) => {
    setQuantities(current => {
      const next = Math.max(0, Math.min(item.quantityAvailable, (current[item.id] || 0) + delta));
      return { ...current, [item.id]: next };
    });
  };
  const goToCheckout = () => navigation.navigate('BookingCheckout', {
    venueId,
    groundId,
    slotId,
    addOns: selections.filter(item => item.quantity > 0),
  });

  return (
    <PageShell
      navigation={navigation}
      eyebrow="OPTIONAL EXTRAS"
      title="Equipment & supplies"
      subtitle="Choose only what your group needs. Stock is rechecked before the booking is saved."
      footer={(
        <>
          <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.inkSoft }]}>Extras subtotal</Text><Text style={[styles.totalValue, { color: colors.ink }]}>{formatPKR(addOnsTotal)}</Text></View>
          <AppButton title="Review booking" testID="addons-continue" onPress={goToCheckout} disabled={!available} />
        </>
      )}
    >
      {!available ? <InlineNotice tone="danger">This time is no longer available. Go back and choose another slot.</InlineNotice> : null}
      <DesignCard>
        <Text style={[styles.cardTitle, { color: colors.ink }]}>{venue?.name || 'Venue'} · {ground?.name || 'Ground'}</Text>
        <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{slot ? `${formatDateKey(slot.date)} · ${formatTimeRange(slot.startTime, slot.endTime)}` : 'Slot details unavailable'}</Text>
        <Text style={[styles.price, { color: colors.primary }]}>Ground fee {formatPKR(groundFee)}</Text>
      </DesignCard>
      {items.length ? items.map(item => {
        const quantity = quantities[item.id] || 0;
        const soldOut = item.quantityAvailable <= 0;
        return (
          <DesignCard key={item.id} style={styles.addonCard}>
            <View style={styles.addonInfo}>
              <Text style={[styles.cardTitle, { color: colors.ink }]}>{item.name}</Text>
              <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{item.sport} · {item.priceMode === 'rental' ? 'rental per booking' : 'sale per item'}</Text>
              <Text style={[styles.price, { color: colors.primary }]}>{formatPKR(item.unitPricePKR)} each · {item.quantityAvailable} available</Text>
            </View>
            <View style={styles.quantityControl}>
              <Pressable accessibilityRole="button" accessibilityLabel={`Remove one ${item.name}`} testID={`addon-minus-${item.id}`} disabled={quantity === 0} onPress={() => changeQuantity(item, -1)} style={[styles.quantityButton, { borderColor: colors.border, borderRadius: radius.pill, opacity: quantity === 0 ? 0.4 : 1 }]}><Text style={[styles.quantitySymbol, { color: colors.ink }]}>−</Text></Pressable>
              <Text accessibilityLabel={`${quantity} selected`} style={[styles.quantityValue, { color: colors.ink }]}>{quantity}</Text>
              <Pressable accessibilityRole="button" accessibilityLabel={`Add one ${item.name}`} testID={`addon-plus-${item.id}`} disabled={soldOut || quantity >= item.quantityAvailable} onPress={() => changeQuantity(item, 1)} style={[styles.quantityButton, { borderColor: colors.border, borderRadius: radius.pill, opacity: soldOut || quantity >= item.quantityAvailable ? 0.4 : 1 }]}><Text style={[styles.quantitySymbol, { color: colors.primary }]}>+</Text></Pressable>
            </View>
            {soldOut ? <Text style={[styles.soldOut, { color: colors.error }]}>Out of stock</Text> : null}
          </DesignCard>
        );
      }) : (
        <EmptyState title="No add-ons available" description="You can continue without equipment or supplies." />
      )}
      <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.inkSoft }]}>Ground fee</Text><Text style={[styles.totalValue, { color: colors.ink }]}>{formatPKR(groundFee)}</Text></View>
      <View style={styles.totalRow}><Text style={[styles.totalLabel, { color: colors.inkSoft }]}>Equipment</Text><Text style={[styles.totalValue, { color: colors.ink }]}>{formatPKR(addOnsTotal)}</Text></View>
    </PageShell>
  );
}

export function BookingCheckoutScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors, radius } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const venueState = useSelector(state => state.venues);
  const { venues, grounds, equipment, slots, bookings } = venueState;
  const { venueId, groundId, slotId, addOns = [] } = route.params || {};
  const venue = venues.find(item => item.id === venueId);
  const ground = grounds.find(item => item.id === groundId);
  const slot = slots.find(item => item.id === slotId);
  const selectedItems = addOns.map(selection => ({
    ...selection,
    item: equipment.find(item => item.id === selection.equipmentId),
  }));
  const groundFee = calculateGroundFee(ground, slot);
  const addOnsTotal = calculateEquipmentSubtotal(equipment.filter(item => item.venueId === venueId), addOns);
  const total = groundFee + addOnsTotal;
  const availability = slot ? getSlotAvailability({ slotId, slots, bookings }) : { available: false };
  const [paymentMode, setPaymentMode] = useState('pay-at-venue');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const submitGuard = useRef(false);

  const confirm = async () => {
    if (submitGuard.current || !availability.available || !slot) return;
    submitGuard.current = true;
    setSubmitting(true);
    setError('');
    try {
      const result = await dispatch(reserveBooking({
        source: 'player',
        playerUserId: currentUser?.id,
        venueId,
        groundId,
        slotId,
        addOns,
        paymentMode,
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigation.replace('BookingSuccess', { bookingId: result.booking.id });
    } finally {
      submitGuard.current = false;
      setSubmitting(false);
    }
  };

  return (
    <PageShell
      navigation={navigation}
      eyebrow="CHECKOUT"
      title="Confirm booking"
      subtitle="Review the reservation and choose how you will settle the venue fee."
      footer={(
        <AppButton
          title={submitting ? 'Confirming…' : `Confirm · ${formatPKR(total)}`}
          testID="booking-confirm"
          onPress={confirm}
          loading={submitting}
          disabled={!slot || !availability.available}
        />
      )}
    >
      <DesignCard>
        <Text style={[styles.eyebrow, { color: colors.primary }]}>RESERVATION</Text>
        <Text style={[styles.cardTitle, styles.cardTop, { color: colors.ink }]}>{venue?.name || 'Venue unavailable'}</Text>
        <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{ground?.name || 'Ground'} · {ground?.sport || ''}</Text>
        <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{slot ? `${formatDateKey(slot.date)} · ${formatTimeRange(slot.startTime, slot.endTime)}` : 'Slot details unavailable'}</Text>
      </DesignCard>
      <SectionHeading title="Price summary" />
      <DesignCard>
        <PriceRow label="Ground fee" amount={groundFee} />
        {selectedItems.filter(entry => entry.item && entry.quantity > 0).map(entry => (
          <PriceRow key={entry.equipmentId} label={`${entry.item.name} × ${entry.quantity}`} amount={Math.round(Number(entry.item.unitPricePKR)) * entry.quantity} />
        ))}
        <View style={[styles.divider, { borderColor: colors.border }]} />
        <PriceRow label="Total in PKR" amount={total} strong />
      </DesignCard>
      <SectionHeading title="Payment" />
      <ChoiceChips
        label="Choose a demo payment option"
        options={['Pay at venue', 'Simulated payment']}
        selected={paymentMode === 'pay-at-venue' ? 'Pay at venue' : 'Simulated payment'}
        onSelect={value => setPaymentMode(value === 'Pay at venue' ? 'pay-at-venue' : 'simulated')}
        testID="checkout-payment"
      />
      <InlineNotice>
        {paymentMode === 'simulated'
          ? 'Simulated payment — no card details are collected and no money is transferred.'
          : 'Pay at venue — no payment is collected in this app.'}
      </InlineNotice>
      <DesignCard>
        <Text style={[styles.cardTitle, { color: colors.ink }]}>Booking policy</Text>
        <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>This local demo lets you cancel an active reservation to release the slot. No venue cancellation policy or refund is being applied.</Text>
      </DesignCard>
      {!availability.available ? <InlineNotice tone="danger">This slot is no longer available. Go back and select another time.</InlineNotice> : null}
      {error ? <InlineNotice tone="danger" testID="booking-error">{error}</InlineNotice> : null}
    </PageShell>
  );
}

function PriceRow({ label, amount, strong = false }) {
  const { colors } = useTheme();
  return (
    <View style={styles.totalRow}>
      <Text style={[styles.totalLabel, { color: strong ? colors.ink : colors.inkSoft, fontWeight: strong ? '800' : '500' }]}>{label}</Text>
      <Text style={[styles.totalValue, { color: strong ? colors.primary : colors.ink, fontWeight: strong ? '900' : '700' }]}>{formatPKR(amount)}</Text>
    </View>
  );
}

function BookingCard({ booking, onPress, onSplit, testID }) {
  const { colors } = useTheme();
  const status = getBookingDisplayStatus(booking);
  const tone = status === 'Cancelled' ? 'danger' : status === 'Completed' ? 'neutral' : 'success';
  return (
    <DesignCard style={styles.bookingCard}>
      <Pressable accessibilityRole="button" accessibilityLabel={`Open booking at ${booking.venueName}`} testID={testID} onPress={onPress}>
        <View style={styles.rowBetween}>
          <Text numberOfLines={1} style={[styles.cardTitle, styles.bookingTitle, { color: colors.ink }]}>{booking.venueName}</Text>
          <StatusBadge label={status} tone={tone} />
        </View>
        <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{booking.groundName} · {formatDateKey(booking.date)} · {formatTimeRange(booking.startTime, booking.endTime)}</Text>
        <Text style={[styles.price, { color: colors.primary }]}>{formatPKR(booking.totalPKR)}</Text>
      </Pressable>
      {onSplit ? <AppButton title="Split payment" variant="secondary" testID={`booking-split-${booking.id}`} onPress={onSplit} style={styles.splitButton} /> : null}
    </DesignCard>
  );
}

export function BookingSuccessScreen({ navigation, route }) {
  const { colors, radius } = useTheme();
  const booking = useSelector(state => state.venues.bookings.find(item => item.id === route.params?.bookingId));
  return (
    <PageShell navigation={navigation} eyebrow="CONFIRMED" title="Your slot is reserved" subtitle="This confirmation is saved in the local PlaySpot demo.">
      <View style={[styles.successMark, { backgroundColor: colors.limePale, borderRadius: radius.pill }]}><Text style={[styles.successCheck, { color: colors.primary }]}>✓</Text></View>
      {booking ? (
        <DesignCard>
          <Text style={[styles.eyebrow, { color: colors.primary }]}>BOOKING REFERENCE</Text>
          <Text selectable style={[styles.reference, { color: colors.ink }]}>{booking.id}</Text>
          <Text style={[styles.cardTitle, styles.cardTop, { color: colors.ink }]}>{booking.venueName}</Text>
          <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{booking.groundName} · {formatDateKey(booking.date)}</Text>
          <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{formatTimeRange(booking.startTime, booking.endTime)}</Text>
          <Text style={[styles.price, { color: colors.primary }]}>{formatPKR(booking.totalPKR)} · {booking.paymentMode === 'simulated' ? 'simulated' : 'pay at venue'}</Text>
        </DesignCard>
      ) : <InlineNotice tone="danger">The booking details could not be found.</InlineNotice>}
      <InlineNotice>This is a local demo reservation. No payment was transferred and availability is not synchronized with a server.</InlineNotice>
      {booking ? <AppButton title="View booking details" testID="booking-success-details" onPress={() => navigation.navigate('BookingDetails', { bookingId: booking.id })} /> : null}
      <AppButton title="My bookings" variant="secondary" testID="booking-success-list" onPress={() => navigation.navigate('MyBookings')} style={styles.buttonGap} />
      <AppButton title="Back to PlaySpot" variant="quiet" testID="booking-success-home" onPress={() => navigation.navigate('PlayerHome')} style={styles.buttonGap} />
    </PageShell>
  );
}

export function MyBookingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const bookings = useSelector(state => selectBookingsForUser(state, currentUser?.id || ''));
  const [filter, setFilter] = useState('Upcoming');
  const filtered = useMemo(() => bookings.filter(booking => {
    const status = getBookingDisplayStatus(booking);
    return filter === 'Upcoming' ? status === 'Confirmed'
      : filter === 'Past' ? status === 'Completed'
        : status === 'Cancelled';
  }).sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`)), [bookings, filter]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <>
            <ScreenHeader title="My bookings" subtitle="Upcoming and completed local reservations." onBack={() => navigation.goBack()} />
            <ChoiceChips options={['Upcoming', 'Past', 'Cancelled']} selected={filter} onSelect={setFilter} testID="my-bookings-filter" />
          </>
        )}
        ListEmptyComponent={<EmptyState title={`No ${filter.toLowerCase()} bookings`} description="Bookings you make in the app will appear here." action={<AppButton title="Find a venue" testID="my-bookings-search" onPress={() => navigation.navigate('VenueSearch')} />} />}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            testID={`my-booking-${item.id}`}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
            onSplit={getBookingDisplayStatus(item) === 'Confirmed' ? () => navigation.navigate('SplitPayment', { bookingId: item.id }) : null}
          />
        )}
      />
    </SafeAreaView>
  );
}

export function BookingDetailsScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const { venues, grounds, equipment, bookings } = useSelector(state => state.venues);
  const booking = bookings.find(item => item.id === route.params?.bookingId);
  const venue = venues.find(item => item.id === booking?.venueId);
  const ground = grounds.find(item => item.id === booking?.groundId);
  const ownedVenues = useSelector(state => selectVenuesByOwnerId(state, currentUser?.id || ''));
  const isOwner = ownedVenues.some(item => item.id === booking?.venueId);
  const canCancel = currentUser?.role === 'vendor' ? isOwner : booking?.playerUserId === currentUser?.id;
  const active = booking && getBookingDisplayStatus(booking) === 'Confirmed';

  const cancel = () => {
    if (!booking || !canCancel || !active) return;
    Alert.alert('Cancel this booking?', 'The active slot will become available again in this local demo.', [
      { text: 'Keep booking', style: 'cancel' },
      { text: 'Cancel booking', style: 'destructive', onPress: () => dispatch(bookingCancelled({ bookingId: booking.id, cancelledAt: new Date().toISOString() })) },
    ]);
  };

  if (!booking) {
    return <PageShell navigation={navigation} title="Booking details"><EmptyState title="Booking not found" description="Return to your bookings and open a saved reservation." /></PageShell>;
  }

  const addOnRows = booking.addOns.map(addOn => {
    const item = equipment.find(entry => entry.id === addOn.equipmentId);
    return { ...addOn, name: item?.name || addOn.name };
  });

  return (
    <PageShell navigation={navigation} eyebrow={booking.source === 'walk-in' ? 'VENDOR WALK-IN' : 'BOOKING'} title="Booking details" subtitle="Reservation details stored on this device.">
      <DesignCard>
        <View style={styles.rowBetween}><Text style={[styles.eyebrow, { color: colors.primary }]}>{booking.source === 'walk-in' ? 'SOURCE · WALK-IN' : 'SOURCE · PLAYER'}</Text><StatusBadge label={getBookingDisplayStatus(booking)} tone={active ? 'success' : booking.status === 'cancelled' ? 'danger' : 'neutral'} /></View>
        <Text style={[styles.cardTitle, styles.cardTop, { color: colors.ink }]}>{venue?.name || booking.venueName}</Text>
        <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{ground?.name || booking.groundName}</Text>
        <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{formatDateKey(booking.date)} · {formatTimeRange(booking.startTime, booking.endTime)}</Text>
      </DesignCard>
      {booking.source === 'walk-in' ? <InlineNotice>Customer: {booking.customerName}{booking.customerContact ? ` · ${booking.customerContact}` : ''}</InlineNotice> : null}
      <SectionHeading title="Charges" />
      <DesignCard>
        <PriceRow label="Ground fee" amount={booking.groundFeePKR} />
        {addOnRows.map(item => <PriceRow key={item.equipmentId} label={`${item.name} × ${item.quantity}`} amount={item.lineTotalPKR} />)}
        <PriceRow label="Total" amount={booking.totalPKR} strong />
        <Text style={[styles.cardCopy, { color: colors.inkSoft, marginTop: 8 }]}>Payment: {booking.paymentStatus === 'simulated-paid' ? 'simulated; no money moved' : booking.paymentStatus}</Text>
      </DesignCard>
      {active && canCancel ? <AppButton title="Cancel booking and release slot" variant="secondary" testID="booking-cancel" onPress={cancel} textStyle={{ color: colors.error }} /> : null}
      {active && currentUser?.role === 'player' ? <AppButton title="Split this booking" variant="secondary" testID="booking-split-open" onPress={() => navigation.navigate('SplitPayment', { bookingId: booking.id })} style={styles.buttonGap} /> : null}
      {currentUser?.role === 'vendor' ? <AppButton title="Vendor bookings" variant="quiet" testID="booking-vendor-list" onPress={() => navigation.navigate('VendorBookings')} style={styles.buttonGap} /> : <AppButton title="My bookings" variant="quiet" testID="booking-player-list" onPress={() => navigation.navigate('MyBookings')} style={styles.buttonGap} />}
    </PageShell>
  );
}

export function VendorAvailabilityScreen({ navigation, route }) {
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const ownedVenues = useSelector(state => selectVenuesByOwnerId(state, currentUser?.id || ''));
  const { grounds, slots, bookings } = useSelector(state => state.venues);
  const [venueId, setVenueId] = useState(route.params?.venueId || ownedVenues[0]?.id || '');
  const [groundId, setGroundId] = useState(route.params?.groundId || '');
  const [date, setDate] = useState(route.params?.date || toLocalDateKey());
  const dates = useMemo(() => getNextBookableDates(), []);
  const venue = ownedVenues.find(item => item.id === venueId) || ownedVenues[0];
  const venueGrounds = grounds.filter(item => item.venueId === venue?.id && item.isActive !== false);
  const ground = venueGrounds.find(item => item.id === groundId) || venueGrounds[0];
  const daySlots = slots.filter(slot => slot.groundId === ground?.id && slot.date === date)
    .sort((first, second) => first.startTime.localeCompare(second.startTime));

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={daySlots}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <>
            <ScreenHeader title="Availability" subtitle="Player bookings and walk-ins use the same slot records." eyebrow="VENDOR TOOLS" onBack={() => navigation.goBack()} />
            {ownedVenues.length > 1 ? <ChoiceChips label="Venue" options={ownedVenues.map(item => item.name)} selected={venue?.name} onSelect={name => { setVenueId(ownedVenues.find(item => item.name === name)?.id || ''); setGroundId(''); }} testID="availability-venue" /> : null}
            {venueGrounds.length > 1 ? <ChoiceChips label="Ground" options={venueGrounds.map(item => item.name)} selected={ground?.name} onSelect={name => setGroundId(venueGrounds.find(item => item.name === name)?.id || '')} testID="availability-ground" /> : null}
            {ground ? <DesignCard><Text style={[styles.cardTitle, { color: colors.ink }]}>{ground.name} · {venue?.name}</Text><Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{ground.sport} · {formatPKR(ground.hourlyPricePKR)} per hour</Text></DesignCard> : null}
            <SectionHeading title="Select a date" />
            <DateRail dates={dates} selectedDate={date} onSelect={setDate} testID="availability-date" />
            <View style={styles.vendorActions}>
              <AppButton title="Vendor bookings" variant="secondary" testID="availability-bookings" onPress={() => navigation.navigate('VendorBookings')} style={styles.actionHalf} />
              <AppButton title="Record walk-in" testID="availability-walkin" onPress={() => navigation.navigate('ManualWalkInBooking', { venueId: venue?.id, groundId: ground?.id, date })} style={styles.actionHalf} />
            </View>
            <SectionHeading title="Time slots" />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No slots for this date" description="This ground has no generated slots on the selected date." action={<AppButton title="Record a walk-in" testID="availability-empty-walkin" onPress={() => navigation.navigate('ManualWalkInBooking', { venueId: venue?.id, groundId: ground?.id, date })} />} />}
        renderItem={({ item }) => {
          const state = getSlotAvailability({ slotId: item.id, slots, bookings });
          const related = bookings.find(booking => booking.slotId === item.id && getBookingDisplayStatus(booking) === 'Confirmed');
          const isFuture = isSlotInFuture(item);
          const available = state.available && isFuture;
          const label = available ? 'Available' : related ? (related.source === 'walk-in' ? 'Walk-in' : 'Player booking') : isFuture ? 'Unavailable' : 'Past';
          return (
            <DesignCard style={styles.availabilityCard}>
              <View style={styles.rowBetween}>
                <View style={styles.slotCopy}>
                  <Text style={[styles.slotTime, { color: colors.ink }]}>{formatTimeRange(item.startTime, item.endTime)}</Text>
                  <Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{label}{related ? ` · ${related.customerName || 'player'}` : ''}</Text>
                </View>
                <StatusBadge label={label} tone={available ? 'success' : related ? 'warning' : 'neutral'} />
              </View>
              {available ? <AppButton title="Record walk-in" variant="secondary" testID={`availability-book-${item.id}`} onPress={() => navigation.navigate('ManualWalkInBooking', { venueId: venue?.id, groundId: ground?.id, date, slotId: item.id })} style={styles.walkinButton} /> : null}
            </DesignCard>
          );
        }}
      />
    </SafeAreaView>
  );
}

export function VendorBookingsScreen({ navigation }) {
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const bookings = useSelector(state => selectBookingsForVendor(state, currentUser?.id || ''));
  const [filter, setFilter] = useState('All');
  const filtered = useMemo(() => bookings.filter(booking => {
    if (filter === 'Player') return booking.source === 'player' && booking.status !== 'cancelled';
    if (filter === 'Walk-in') return booking.source === 'walk-in' && booking.status !== 'cancelled';
    if (filter === 'Cancelled') return booking.status === 'cancelled';
    return true;
  }).sort((first, second) => `${first.date}${first.startTime}`.localeCompare(`${second.date}${second.startTime}`)), [bookings, filter]);

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <FlatList
        contentContainerStyle={styles.listContent}
        data={filtered}
        keyExtractor={item => item.id}
        ListHeaderComponent={(
          <>
            <ScreenHeader title="Vendor bookings" subtitle="Player reservations and manual walk-ins in one list." eyebrow="BOOKING MANAGER" onBack={() => navigation.goBack()} />
            <ChoiceChips options={['All', 'Player', 'Walk-in', 'Cancelled']} selected={filter} onSelect={setFilter} testID="vendor-bookings-filter" />
            <AppButton title="Record a walk-in" testID="vendor-bookings-walkin" onPress={() => navigation.navigate('ManualWalkInBooking')} style={styles.listAction} />
          </>
        )}
        ListEmptyComponent={<EmptyState title="No bookings yet" description="New player reservations and vendor walk-ins will appear here." />}
        renderItem={({ item }) => (
          <BookingCard
            booking={item}
            testID={`vendor-booking-${item.id}`}
            onPress={() => navigation.navigate('BookingDetails', { bookingId: item.id })}
          />
        )}
      />
    </SafeAreaView>
  );
}

export function ManualWalkInBookingScreen({ navigation, route }) {
  const dispatch = useDispatch();
  const { colors } = useTheme();
  const { currentUser } = useSelector(state => state.auth);
  const ownedVenues = useSelector(state => selectVenuesByOwnerId(state, currentUser?.id || ''));
  const { grounds, slots, bookings } = useSelector(state => state.venues);
  const [venueId, setVenueId] = useState(route.params?.venueId || ownedVenues[0]?.id || '');
  const [groundId, setGroundId] = useState(route.params?.groundId || '');
  const [date, setDate] = useState(route.params?.date || toLocalDateKey());
  const [slotId, setSlotId] = useState(route.params?.slotId || '');
  const [customerName, setCustomerName] = useState('');
  const [customerContact, setCustomerContact] = useState('');
  const [paymentStatus, setPaymentStatus] = useState('unpaid');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const dates = useMemo(() => getNextBookableDates(), []);
  const venue = ownedVenues.find(item => item.id === venueId) || ownedVenues[0];
  const venueGrounds = grounds.filter(item => item.venueId === venue?.id && item.isActive !== false);
  const ground = venueGrounds.find(item => item.id === groundId) || venueGrounds[0];
  const daySlots = slots.filter(slot => slot.groundId === ground?.id && slot.date === date)
    .sort((first, second) => first.startTime.localeCompare(second.startTime));
  const chosenSlot = daySlots.find(item => item.id === slotId);
  const chosenAvailability = chosenSlot ? getSlotAvailability({ slotId, slots, bookings }) : { available: false };
  const slotCanBeBooked = Boolean(chosenSlot && chosenAvailability.available && isSlotInFuture(chosenSlot));
  const groundFee = calculateGroundFee(ground, chosenSlot);

  const submit = async () => {
    if (!customerName.trim()) {
      setError('Enter the walk-in customer’s name.');
      return;
    }
    if (!slotCanBeBooked) {
      setError('Choose an available future time slot.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      const result = await dispatch(reserveBooking({
        source: 'walk-in',
        vendorUserId: currentUser?.id,
        venueId,
        groundId: ground?.id,
        slotId,
        customerName,
        customerContact,
        paymentMode: 'manual-cash',
        paymentStatus,
        addOns: [],
      }));
      if (!result.ok) {
        setError(result.error);
        return;
      }
      navigation.replace('BookingDetails', { bookingId: result.booking.id });
    } finally {
      setSaving(false);
    }
  };

  return (
    <PageShell
      navigation={navigation}
      eyebrow="VENDOR WALK-IN"
      title="Manual booking"
      subtitle="This walk-in reserves the same ground and time slot used by player bookings."
      footer={<AppButton title={saving ? 'Saving walk-in…' : `Confirm walk-in · ${formatPKR(groundFee)}`} testID="walkin-submit" onPress={submit} loading={saving} disabled={!slotCanBeBooked || !customerName.trim()} />}
    >
      {ownedVenues.length > 1 ? <ChoiceChips label="Venue" options={ownedVenues.map(item => item.name)} selected={venue?.name} onSelect={name => { const selected = ownedVenues.find(item => item.name === name); setVenueId(selected?.id || ''); setGroundId(''); setSlotId(''); }} testID="walkin-venue" /> : null}
      {venueGrounds.length > 1 ? <ChoiceChips label="Ground" options={venueGrounds.map(item => item.name)} selected={ground?.name} onSelect={name => { setGroundId(venueGrounds.find(item => item.name === name)?.id || ''); setSlotId(''); }} testID="walkin-ground" /> : null}
      <FormField label="Customer name" value={customerName} onChangeText={setCustomerName} placeholder="Name for this walk-in" testID="walkin-customer-name" />
      <FormField label="Contact (optional)" value={customerContact} onChangeText={setCustomerContact} keyboardType="phone-pad" placeholder="Phone number" testID="walkin-customer-contact" />
      <SectionHeading title="Date and slot" />
      <DateRail dates={dates} selectedDate={date} onSelect={value => { setDate(value); setSlotId(''); }} testID="walkin-date" />
      {daySlots.length ? daySlots.map(item => {
        const availability = getSlotAvailability({ slotId: item.id, slots, bookings });
        const future = isSlotInFuture(item);
        const enabled = availability.available && future;
        const label = enabled ? 'Available' : !future ? 'Past' : availability.reason === 'booked' ? 'Booked' : 'Unavailable';
        return <SlotRow key={item.id} slot={item} selected={slotId === item.id} disabled={!enabled} statusLabel={label} testID={`walkin-slot-${item.id}`} onPress={() => setSlotId(item.id)} />;
      }) : <InlineNotice>No slots are listed for this ground and date.</InlineNotice>}
      <SectionHeading title="Payment status" />
      <ChoiceChips label="Demo record only" options={['Unpaid', 'Paid at venue']} selected={paymentStatus === 'paid' ? 'Paid at venue' : 'Unpaid'} onSelect={value => setPaymentStatus(value === 'Paid at venue' ? 'paid' : 'unpaid')} testID="walkin-payment" />
      <InlineNotice>Payment status is a local note only. No money is collected or transferred.</InlineNotice>
      {chosenSlot ? <DesignCard><Text style={[styles.cardTitle, { color: colors.ink }]}>{venue?.name} · {ground?.name}</Text><Text style={[styles.cardCopy, { color: colors.inkSoft }]}>{formatDateKey(chosenSlot.date)} · {formatTimeRange(chosenSlot.startTime, chosenSlot.endTime)}</Text><Text style={[styles.price, { color: colors.primary }]}>{formatPKR(groundFee)}</Text></DesignCard> : null}
      {error ? <InlineNotice tone="danger" testID="walkin-error">{error}</InlineNotice> : null}
    </PageShell>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1 },
  flex: { flex: 1 },
  pageContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30 },
  listContent: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 30, flexGrow: 1 },
  footer: { marginTop: 12 },
  dateRail: { gap: 8, paddingBottom: 8, paddingRight: 12 },
  dateChip: { width: 74, minHeight: 62, borderWidth: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 8 },
  dateDay: { fontSize: 10, fontWeight: '700' },
  dateDetail: { fontSize: 12, fontWeight: '800', marginTop: 2 },
  groundChip: { borderWidth: 1, paddingHorizontal: 14, paddingVertical: 9, marginBottom: 5 },
  groundChipText: { fontSize: 11, fontWeight: '800' },
  groundSummary: { marginTop: 10 },
  cardTitle: { fontSize: 14, fontWeight: '800', lineHeight: 20 },
  cardCopy: { fontSize: 11, lineHeight: 17, marginTop: 4 },
  price: { fontSize: 12, fontWeight: '900', marginTop: 8 },
  slotRow: { minHeight: 66, borderWidth: 1, paddingHorizontal: 13, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 9 },
  slotCopy: { flex: 1 },
  slotTime: { fontSize: 13, fontWeight: '800' },
  slotState: { fontSize: 10, fontWeight: '700', marginTop: 3 },
  checkmark: { fontSize: 19, fontWeight: '900', paddingLeft: 12 },
  totalRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 9 },
  totalLabel: { fontSize: 12 },
  totalValue: { fontSize: 13, fontWeight: '800' },
  addonCard: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  addonInfo: { flex: 1 },
  quantityControl: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  quantityButton: { width: 34, height: 34, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  quantitySymbol: { fontSize: 21, lineHeight: 25, fontWeight: '700' },
  quantityValue: { fontSize: 14, fontWeight: '800', minWidth: 16, textAlign: 'center' },
  soldOut: { position: 'absolute', right: 14, bottom: 8, fontSize: 9, fontWeight: '800' },
  eyebrow: { fontSize: 9, fontWeight: '900', letterSpacing: 1.2 },
  cardTop: { marginTop: 8 },
  divider: { borderBottomWidth: StyleSheet.hairlineWidth, marginTop: 5, marginBottom: 3 },
  bookingCard: { marginBottom: 11 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 10 },
  bookingTitle: { flex: 1 },
  splitButton: { minHeight: 38, marginTop: 10 },
  successMark: { width: 76, height: 76, alignSelf: 'center', alignItems: 'center', justifyContent: 'center', marginVertical: 10 },
  successCheck: { fontSize: 42, fontWeight: '800' },
  reference: { fontSize: 12, fontWeight: '800', marginTop: 5 },
  buttonGap: { marginTop: 10 },
  vendorActions: { flexDirection: 'row', gap: 9, marginTop: 8 },
  actionHalf: { flex: 1, paddingHorizontal: 8 },
  availabilityCard: { marginBottom: 10 },
  walkinButton: { minHeight: 38, marginTop: 10 },
  listAction: { marginBottom: 12 },
});
