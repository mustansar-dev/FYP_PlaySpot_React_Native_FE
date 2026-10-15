import { configureStore } from '@reduxjs/toolkit';
import { createDemoVenueState } from '../data/demoVenueData';
import venueReducer, { bookingCancelled, reserveBooking, venuesHydrated } from '../store/venueSlice';
import {
  calculateGroundFee,
  calculateEquipmentSubtotal,
  getNextBookableDates,
  getSlotAvailability,
  intervalsOverlap,
  prepareBooking,
} from './booking';

describe('booking and shared slot calculations', () => {
  test('date range includes today and the next seven local calendar dates', () => {
    const dates = getNextBookableDates(new Date(2026, 9, 16, 23), 7);
    expect(dates).toHaveLength(8);
    expect(dates[0].dateKey).toBe('2026-10-16');
    expect(dates[7].dateKey).toBe('2026-10-23');
  });

  test('overlapping time ranges conflict while adjoining ranges do not', () => {
    expect(intervalsOverlap('10:00', '11:00', '10:30', '11:30')).toBe(true);
    expect(intervalsOverlap('10:00', '11:00', '11:00', '12:00')).toBe(false);
  });

  test('ground and equipment totals use integer PKR and slot duration', () => {
    expect(calculateGroundFee({ hourlyPricePKR: 5001, slotDurationMinutes: 30 }, { startTime: '09:00', endTime: '09:30' })).toBe(2501);
    expect(calculateEquipmentSubtotal([{ id: 'racket', unitPricePKR: 350 }], [{ equipmentId: 'racket', quantity: 2 }])).toBe(700);
  });

  test('a walk-in reserves the same slot and stock used by player bookings; cancellation releases both', () => {
    const data = createDemoVenueState();
    const tomorrow = getNextBookableDates()[1].dateKey;
    const selectedSlot = data.slots.find(slot => slot.groundId === 'venue-demo-gulberg-ground-1' && slot.date === tomorrow && slot.status === 'available');
    const equipment = data.equipment.find(item => item.venueId === 'venue-demo-gulberg');
    const store = configureStore({ reducer: { venues: venueReducer } });
    store.dispatch(venuesHydrated({ data, notice: null }));

    const result = store.dispatch(reserveBooking({
      source: 'walk-in',
      vendorUserId: 'demo-vendor-001',
      customerName: 'Walk-in Customer',
      slotId: selectedSlot.id,
      addOns: [{ equipmentId: equipment.id, quantity: 2 }],
      paymentMode: 'manual-cash',
      paymentStatus: 'unpaid',
    }));
    expect(result.ok).toBe(true);
    expect(result.booking.source).toBe('walk-in');
    expect(result.booking.addOnsTotalPKR).toBe(equipment.unitPricePKR * 2);
    expect(store.getState().venues.equipment.find(item => item.id === equipment.id).quantityAvailable).toBe(equipment.quantityAvailable - 2);
    expect(getSlotAvailability({ ...store.getState().venues, slotId: selectedSlot.id }).available).toBe(false);

    const playerAttempt = store.dispatch(reserveBooking({ source: 'player', playerUserId: 'another-player', slotId: selectedSlot.id, addOns: [] }));
    expect(playerAttempt.ok).toBe(false);
    expect(playerAttempt.error).toMatch(/booked|unavailable/i);

    store.dispatch(bookingCancelled({ bookingId: result.booking.id, cancelledAt: '2026-10-16T12:00:00.000Z' }));
    expect(getSlotAvailability({ ...store.getState().venues, slotId: selectedSlot.id }).available).toBe(true);
    expect(store.getState().venues.equipment.find(item => item.id === equipment.id).quantityAvailable).toBe(equipment.quantityAvailable);
  });

  test('unavailable state and active overlapping bookings are rejected before saving', () => {
    const state = {
      venues: [{ id: 'venue', name: 'Venue' }],
      grounds: [{ id: 'ground', venueId: 'venue', name: 'Court', hourlyPricePKR: 3000, slotDurationMinutes: 60, isActive: true }],
      equipment: [],
      slots: [
        { id: 'slot-1', groundId: 'ground', date: '2099-01-02', startTime: '10:00', endTime: '11:00', status: 'available' },
        { id: 'slot-2', groundId: 'ground', date: '2099-01-02', startTime: '10:30', endTime: '11:30', status: 'available' },
      ],
      bookings: [{ id: 'existing', source: 'player', status: 'confirmed', slotId: 'slot-1', groundId: 'ground', date: '2099-01-02', startTime: '10:00', endTime: '11:00' }],
    };
    expect(prepareBooking(state, { id: 'next', createdAt: '2026-10-16T00:00:00.000Z', source: 'player', slotId: 'slot-2', addOns: [] }).ok).toBe(false);
  });
});
