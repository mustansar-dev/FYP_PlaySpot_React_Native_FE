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
import {
  BookingDetailsScreen,
  BookingSuccessScreen,
  BookingCheckoutScreen,
  EquipmentAddonsScreen,
  ManualWalkInBookingScreen,
  MyBookingsScreen,
  SlotSelectionScreen,
  VendorAvailabilityScreen,
  VendorBookingsScreen,
} from '../screens/BookingScreens';
import {
  ChatConversationScreen,
  ChatInboxScreen,
  CreateGameRoomScreen,
  CreateTournamentScreen,
  GameRoomDetailsScreen,
  GameRoomsScreen,
  LeaderboardScreen,
  SplitPaymentScreen,
  TournamentDetailsScreen,
  TournamentsScreen,
} from '../screens/CommunityScreens';
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
  const communityHydrated = useSelector(state => state.community.hydrated);

  return (
    <NavigationContainer theme={navigationTheme}>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {!hydrated || !venuesHydrated || !communityHydrated ? (
          <Stack.Screen name="Boot" component={BootScreen} />
        ) : currentUser?.role === 'player' ? (
          <>
            <Stack.Screen name="PlayerHome" component={PlayerHomeScreen} />
            <Stack.Screen name="VenueSearch" component={VenueSearchScreen} />
            <Stack.Screen name="VenueMap" component={VenueMapScreen} />
            <Stack.Screen name="VenueDetails" component={VenueDetailsScreen} />
            <Stack.Screen name="VenueReviews" component={VenueReviewsScreen} />
            <Stack.Screen name="AddReview" component={AddReviewScreen} />
            <Stack.Screen name="SlotSelection" component={SlotSelectionScreen} />
            <Stack.Screen name="EquipmentAddons" component={EquipmentAddonsScreen} />
            <Stack.Screen name="BookingCheckout" component={BookingCheckoutScreen} />
            <Stack.Screen name="BookingSuccess" component={BookingSuccessScreen} />
            <Stack.Screen name="MyBookings" component={MyBookingsScreen} />
            <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
            <Stack.Screen name="GameRooms" component={GameRoomsScreen} />
            <Stack.Screen name="CreateGameRoom" component={CreateGameRoomScreen} />
            <Stack.Screen name="GameRoomDetails" component={GameRoomDetailsScreen} />
            <Stack.Screen name="ChatInbox" component={ChatInboxScreen} />
            <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
            <Stack.Screen name="SplitPayment" component={SplitPaymentScreen} />
            <Stack.Screen name="Tournaments" component={TournamentsScreen} />
            <Stack.Screen name="TournamentDetails" component={TournamentDetailsScreen} />
            <Stack.Screen name="CreateTournament" component={CreateTournamentScreen} />
            <Stack.Screen name="Leaderboard" component={LeaderboardScreen} />
          </>
        ) : currentUser?.role === 'vendor' ? (
          <>
            <Stack.Screen name="VendorDashboard" component={VendorDashboardScreen} />
            <Stack.Screen name="VendorVenueManagement" component={VendorVenueManagementScreen} />
            <Stack.Screen name="VendorAvailability" component={VendorAvailabilityScreen} />
            <Stack.Screen name="VendorBookings" component={VendorBookingsScreen} />
            <Stack.Screen name="ManualWalkInBooking" component={ManualWalkInBookingScreen} />
            <Stack.Screen name="BookingDetails" component={BookingDetailsScreen} />
            <Stack.Screen name="ChatInbox" component={ChatInboxScreen} />
            <Stack.Screen name="ChatConversation" component={ChatConversationScreen} />
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
