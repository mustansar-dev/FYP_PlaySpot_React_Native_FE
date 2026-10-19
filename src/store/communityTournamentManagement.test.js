import { configureStore } from '@reduxjs/toolkit';
import authReducer, { authHydrated } from './authSlice';
import communityReducer, { joinTournament, tournamentCreated, tournamentUpdated, updateTournamentAsVendor } from './communitySlice';
import { isTournamentRegistrationOpen } from '../utils/community';

function createStore(currentUser) {
  const store = configureStore({ reducer: { auth: authReducer, community: communityReducer } });
  store.dispatch(authHydrated({ accounts: [currentUser], user: currentUser, storageNotice: null }));
  store.dispatch(tournamentCreated({
    id: 'tournament-owner-check',
    title: 'Demo cup',
    sport: 'Badminton',
    status: 'upcoming',
    capacity: 8,
    teamSize: 2,
    createdBy: 'vendor-owner',
    participants: [],
    standings: [],
    createdAt: new Date().toISOString(),
  }));
  return store;
}

test('a vendor can only change their own tournament', () => {
  const store = createStore({ id: 'other-vendor', role: 'vendor', name: 'Other vendor' });
  const result = store.dispatch(updateTournamentAsVendor({
    tournamentId: 'tournament-owner-check',
    changes: { title: 'Hijacked cup' },
  }));

  expect(result).toMatchObject({ ok: false });
  expect(store.getState().community.tournaments[0].title).toBe('Demo cup');
});

test('the tournament owner can close and reopen registration while it remains upcoming', () => {
  const store = createStore({ id: 'vendor-owner', role: 'vendor', name: 'Tournament owner' });

  expect(store.dispatch(updateTournamentAsVendor({
    tournamentId: 'tournament-owner-check',
    changes: { registrationOpen: false },
  }))).toMatchObject({ ok: true });
  const closed = store.getState().community.tournaments[0];
  expect(closed.status).toBe('upcoming');
  expect(isTournamentRegistrationOpen(closed)).toBe(false);

  store.dispatch(updateTournamentAsVendor({
    tournamentId: 'tournament-owner-check',
    changes: { registrationOpen: true },
  }));
  expect(isTournamentRegistrationOpen(store.getState().community.tournaments[0])).toBe(true);
});

test('raw tournament updates are rejected when the actor is not the owner', () => {
  const store = createStore({ id: 'vendor-owner', role: 'vendor', name: 'Tournament owner' });
  store.dispatch(tournamentUpdated({
    id: 'tournament-owner-check',
    actorUserId: 'other-vendor',
    changes: { title: 'Hijacked cup' },
  }));

  expect(store.getState().community.tournaments[0].title).toBe('Demo cup');
});

test('vendor accounts cannot join tournaments even if they pass a player-shaped user argument', () => {
  const vendor = { id: 'vendor-owner', role: 'vendor', name: 'Tournament owner' };
  const store = createStore(vendor);
  const result = store.dispatch(joinTournament({
    tournamentId: 'tournament-owner-check',
    user: { id: 'fake-player', role: 'player', name: 'Fake player' },
    teamName: 'Fake team',
    teammateNames: ['A teammate'],
  }));

  expect(result).toMatchObject({ ok: false, error: expect.stringMatching(/player account/i) });
  expect(store.getState().community.tournaments[0].participants).toHaveLength(0);
});
