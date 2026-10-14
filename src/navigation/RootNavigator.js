import React from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import {
  DefaultTheme,
  NavigationContainer,
} from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import LoginScreen from '../screens/LoginScreen';
import PlayerHomeScreen from '../screens/PlayerHomeScreen';
import VenueSearchScreen from '../screens/VenueSearchScreen';
import VenueMapScreen from '../screens/VenueMapScreen';
import VenueDetailsScreen from '../screens/VenueDetailsScreen';
import VenueReviewsScreen from '../screens/VenueReviewsScreen';
import AddReviewScreen from '../screens/AddReviewScreen';
import PlayerRegistrationScreen from '../screens/PlayerRegistrationScreen';
import RegistrationSuccessScreen from '../screens/RegistrationSuccessScreen';
import RoleSelectionScreen from '../screens/RoleSelectionScreen';
import VendorDashboardScreen from '../screens/VendorDashboardScreen';
import VendorVenueManagementScreen from '../screens/VendorVenueManagementScreen';
import VendorRegistrationScreen from '../screens/VendorRegistrationScreen';
import WelcomeScreen from '../screens/WelcomeScreen';
import { theme } from '../theme/tokens';

const Stack = createNativeStackNavigator();

const navigationTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: theme.colors.canvas,
    primary: theme.colors.primary,
    text: theme.colors.ink,
    card: theme.colors.canvas,
    border: theme.colors.border,
  },
};

function BootScreen() {
  return (
    <View style={styles.boot}>
      <ActivityIndicator color={theme.colors.primary} size="large" />
      <Text style={styles.bootText}>Preparing your PlaySpot demo…</Text>
    </View>
  );
}

export default function RootNavigator() {
  const { hydrated, currentUser } = useSelector(state => state.auth);
  const venuesHydrated = useSelector(state => state.venues.hydrated);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!hydrated || !venuesHydrated ? (
          <Stack.Screen name="Boot" component={BootScreen} />
        ) : currentUser?.role === 'player' ? (
          <>
            <Stack.Screen name="PlayerHome" component={PlayerHomeScreen} />
            <Stack.Screen name="VenueSearch" component={VenueSearchScreen} />
            <Stack.Screen name="VenueMap" component={VenueMapScreen} />
            <Stack.Screen name="VenueDetails" component={VenueDetailsScreen} />
            <Stack.Screen name="VenueReviews" component={VenueReviewsScreen} />
            <Stack.Screen name="AddReview" component={AddReviewScreen} />
          </>
        ) : currentUser?.role === 'vendor' ? (
          <>
            <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
            <Stack.Screen name="VendorVenueManagement" component={VendorVenueManagementScreen} />
          </>
        ) : (
          <>
            <Stack.Screen name="Welcome" component={WelcomeScreen} />
            <Stack.Screen name="RoleSelection" component={RoleSelectionScreen} />
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="PlayerRegistration" component={PlayerRegistrationScreen} />
            <Stack.Screen name="VendorRegistration" component={VendorRegistrationScreen} />
            <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
            <Stack.Screen name="RegistrationSuccess" component={RegistrationSuccessScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  boot: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.canvas,
    gap: 14,
  },
  bootText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.colors.inkSoft,
  },
});
