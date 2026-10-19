import {
  calculateEqualShares,
  canJoinGameRoom,
  canJoinTournament,
  createRoomPaymentShares,
  getGameRoomCapacityLimit,
  getRoomOpenSpots,
  validateGameRoomDraft,
  validateSplitShares,
} from './community';

function sumShareAmounts(shares) {
  let total = 0;
  shares.forEach(share => { total += share.amountPKR; });
  return total;
}

describe('local community rules and totals', () => {
  test('room join validates private codes and never exceeds capacity', () => {
    const room = {
      id: 'room-1', status: 'open', visibility: 'private', joinCode: 'PLAY24', capacity: 2,
      date: '2099-06-01', startTime: '16:00',
      members: [{ userId: 'host', name: 'Host' }],
    };
    expect(getRoomOpenSpots(room)).toBe(1);
    expect(canJoinGameRoom(room, 'player-2', 'wrong')).toMatchObject({ ok: false, error: expect.stringMatching(/code/i) });
    expect(canJoinGameRoom(room, 'player-2', 'PLAY24')).toEqual({ ok: true });
    expect(canJoinGameRoom({ ...room, members: [...room.members, { userId: 'player-2' }] }, 'player-3', 'PLAY24'))
      .toMatchObject({ ok: false, error: expect.stringMatching(/full/i) });
  });

  test('tournament registration blocks full and duplicate joins', () => {
    const tournament = {
      status: 'upcoming', capacity: 2,
      participants: [{ userId: 'player-1' }],
    };
    expect(canJoinTournament(tournament, 'player-1').ok).toBe(false);
    expect(canJoinTournament(tournament, 'player-2').ok).toBe(true);
    expect(canJoinTournament({ ...tournament, participants: [...tournament.participants, { userId: 'player-2' }] }, 'player-3').error).toMatch(/capacity/i);
  });

  test('equal shares distribute indivisible PKR balances with an exact sum', () => {
    const people = [
      { userId: 'a', name: 'A' }, { userId: 'b', name: 'B' },
      { userId: 'c', name: 'C' }, { userId: 'd', name: 'D' },
    ];
    const shares = calculateEqualShares(10001, people);
    expect(shares.map(item => item.amountPKR)).toEqual([2501, 2500, 2500, 2500]);
    expect(sumShareAmounts(shares)).toBe(10001);
    expect(validateSplitShares(10001, shares).valid).toBe(true);
    expect(validateSplitShares(10000, shares).valid).toBe(false);
  });

  test('badminton room capacity is capped at four and player shares follow the selected capacity', () => {
    expect(getGameRoomCapacityLimit('Badminton')).toBe(4);
    const date = new Date();
    date.setDate(date.getDate() + 1);
    const selectedSlot = {
      date: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`,
      startTime: '16:00',
      sport: 'Badminton',
    };
    const validation = validateGameRoomDraft({
      title: 'Badminton doubles', sport: 'Badminton', location: 'Model Town Hall', selectedSlot,
      capacity: '5', totalCostPKR: 2201, visibility: 'private', joinCode: 'RALLY24', paymentMode: 'simulated',
    });
    expect(validation.capacity).toMatch(/2 to 4/);

    const shares = createRoomPaymentShares(2201, 4, [{ userId: 'organizer', name: 'Organizer', seatIndex: 0 }], 'simulated');
    expect(shares.map(share => share.amountPKR)).toEqual([551, 550, 550, 550]);
    expect(shares[0].status).toBe('simulated-paid');
    expect(sumShareAmounts(shares)).toBe(2201);
  });

  test('room form requires a future sport-matched slot and a supported local payment mode', () => {
    expect(validateGameRoomDraft({
      title: '', sport: 'Badminton', location: '', date: '2026-01-01', startTime: '25:00',
      capacity: '1', totalCostPKR: -10, visibility: 'private', joinCode: 'x', paymentMode: 'card',
    })).toMatchObject({
      title: expect.any(String),
      location: expect.any(String),
      slot: expect.any(String),
      capacity: expect.any(String),
      joinCode: expect.any(String),
      totalCostPKR: expect.any(String),
      paymentMode: expect.any(String),
    });
  });
});
