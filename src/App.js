import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from './context/ThemeContext';
import RootNavigator from './navigation/RootNavigator';
import { restoreSession } from './services/authRepository';
import { authHydrated } from './store/authSlice';
import store from './store/store';

function AppContent() {
  const dispatch = useDispatch();

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
