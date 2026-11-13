import React, { useEffect } from 'react';
import { Provider, useDispatch, useSelector } from 'react-redux';
import { DEMO_MODE } from './config/backendApi';
import { setSessionExpiredHandler } from './services/apiClient';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import RootNavigator from './navigation/RootNavigator';
import { loadBackendState } from './services/backendState';
import { restoreSession } from './services/authRepository';
import { authHydrated, sessionEnded } from './store/authSlice';
import { venueCreated, venuesHydrated, venueStorageNoticeSet } from './store/venueSlice';
import { loadVenueData, saveVenueData } from './services/venueStorage';
import { createVendorVenueRecords } from './services/vendorVenueFactory';
import { createDemoCommunityState } from './data/demoCommunityData';
import { communityHydrated } from './store/communitySlice';
import { selectVenuesByOwnerId } from './store/selectors/venueSelectors';
import store from './store/store';

function AppContent() {
  const dispatch = useDispatch();
  const isAuthHydrated = useSelector(state => state.auth.hydrated);
  const accounts = useSelector(state => state.auth.accounts);
  const currentUser = useSelector(state => state.auth.currentUser);
  const isVenuesHydrated = useSelector(state => state.venues.hydrated);
  const isCommunityHydrated = useSelector(state => state.community.hydrated);

  useEffect(() => {
    setSessionExpiredHandler(() => dispatch(sessionEnded()));
  }, [dispatch]);

  useEffect(() => {
    let active = true;
    restoreSession()
      .then(session => {
        if (active) {
          dispatch(authHydrated(session));
        }
      })
      .catch(() => {
        if (active) {
          dispatch(
            authHydrated({
              accounts: [],
              user: null,
              storageNotice: 'Local demo data could not be loaded. You can still open the app.',
            }),
          );
        }
      });

    return () => {
      active = false;
    };
  }, [dispatch]);

  useEffect(() => {
    if (!DEMO_MODE) return undefined;
    if (!isAuthHydrated || !isVenuesHydrated) {
      return;
    }
    accounts.forEach(account => {
      if (account.role !== 'vendor' || !account.vendorProfile) {
        return;
      }
      const currentVenues = selectVenuesByOwnerId(store.getState(), account.id);
      if (currentVenues.length > 0) {
        return;
      }
      const profile = {
        ...account.vendorProfile,
        businessName: account.vendorProfile.businessName || account.businessName || account.name,
        contactPhone: account.vendorProfile.contactPhone || account.phone,
        latitude: account.vendorProfile.latitude ?? '',
        longitude: account.vendorProfile.longitude ?? '',
        sports: account.vendorProfile.sports || account.preferredSports || [],
        facilities: account.vendorProfile.facilities || [],
        grounds: account.vendorProfile.grounds || [],
        equipment: account.vendorProfile.equipment || [],
        photoUris: account.vendorProfile.photoUris || [],
      };
      dispatch(venueCreated(createVendorVenueRecords(profile, account.id)));
    });
  }, [accounts, isAuthHydrated, dispatch, isVenuesHydrated]);

  useEffect(() => {
    let active = true;
    if (!DEMO_MODE) {
      if (!isAuthHydrated) return () => { active = false; };
      loadBackendState(currentUser).then(result => {
        if (!active) return;
        dispatch(venuesHydrated({ data: result.venueData, notice: result.notice }));
        dispatch(communityHydrated(result.community));
      }).catch(error => {
        if (!active) return;
        const message = 'PlaySpot could not load live data. ' + error.message;
        dispatch(venuesHydrated({ data: { vendorProfiles: [], venues: [], grounds: [], equipment: [], slots: [], bookings: [], reviews: [] }, notice: message }));
        dispatch(communityHydrated({ hydrated: true, rooms: [], conversations: [], messages: [], tournaments: [], leaderboard: [], splits: [], notifications: [] }));
      });
      return () => { active = false; };
    }
    loadVenueData().then(result => {
      if (active) {
        const { community, ...venueData } = result.data;
        dispatch(venuesHydrated({ data: venueData, notice: result.notice }));
        dispatch(communityHydrated(community || createDemoCommunityState()));
      }
    }).catch(() => {
      if (active) {
        dispatch(venuesHydrated({
          data: { ...store.getState().venues, bookings: [] },
          notice: 'Venue data could not be loaded. Fictional demo venues are shown for this session.',
        }));
        dispatch(communityHydrated(createDemoCommunityState()));
      }
    });
    return () => {
      active = false;
    };
  }, [dispatch, isAuthHydrated, currentUser?.id]);

  useEffect(() => {
    if (!DEMO_MODE) return undefined;
    let lastSnapshot = null;
    let saving = Promise.resolve();
    const unsubscribe = store.subscribe(() => {
      const venues = store.getState().venues;
      const community = store.getState().community;
      const domainData = {
        version: venues.version,
        vendorProfiles: venues.vendorProfiles,
        venues: venues.venues,
        grounds: venues.grounds,
        equipment: venues.equipment,
        slots: venues.slots,
        reviews: venues.reviews,
        bookings: venues.bookings,
        community,
      };
      if (!venues.hydrated || !community.hydrated || (lastSnapshot && Object.keys(domainData).every(key => domainData[key] === lastSnapshot[key]))) {
        return;
      }
      lastSnapshot = domainData;
      saving = saving.then(() => saveVenueData(domainData)).catch(() => {
        dispatch(venueStorageNoticeSet('Venue changes could not be saved on this device.'));
      });
    });
    return unsubscribe;
  }, [dispatch]);

  return <RootNavigator />;
}

export default function App() {
  return (
    <Provider store={store}>
      <ThemeProvider>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </ThemeProvider>
    </Provider>
  );
}