import {
  calculateEqualShares,
  canJoinGameRoom,
  canJoinTournament,
  getRoomOpenSpots,
  validateGameRoomDraft,
  validateSplitShares,
} from './community';

describe('local community rules and totals', () => {
  test('room join validates private codes and never exceeds capacity', () => {
    const room = {
      id: 'room-1', status: 'open', visibility: 'private', joinCode: 'PLAY24', capacity: 2,
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
    expect(shares.reduce((sum, item) => sum + item.amountPKR, 0)).toBe(10001);
    expect(validateSplitShares(10001, shares).valid).toBe(true);
    expect(validateSplitShares(10000, shares).valid).toBe(false);
  });

  test('room form validates required details, date/time, capacity and private code', () => {
    expect(validateGameRoomDraft({
      title: '', sport: '', location: '', date: '2026-01-01', startTime: '25:00',
      capacity: '1', costPerParticipantPKR: '-10', visibility: 'private', joinCode: 'x',
    })).toMatchObject({ title: expect.any(String), date: expect.any(String), capacity: expect.any(String), joinCode: expect.any(String) });
  });
});
