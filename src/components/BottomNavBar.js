import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const PLAYER_TABS = [
  { label: 'Home', icon: '⌂', route: 'PlayerHome', active: ['PlayerHome'] },
  { label: 'Search', icon: '⌕', route: 'VenueSearch', active: ['VenueSearch'] },
  { label: 'Games', icon: '⚽', route: 'GameRooms', active: ['GameRooms', 'GameRoomDetails', 'CreateGameRoom', 'Tournaments', 'TournamentDetails', 'CreateTournament', 'Leaderboard'] },
  { label: 'Bookings', icon: '▣', route: 'MyBookings', active: ['MyBookings', 'BookingCheckout', 'BookingSuccess', 'BookingDetails'] },
  { label: 'Profile', icon: '●', route: 'Profile', active: ['Profile', 'EditProfile', 'Notifications', 'Settings'] },
];

const VENDOR_TABS = [
  { label: 'Home', icon: '⌂', route: 'VendorDashboard', active: ['VendorDashboard'] },
  { label: 'Venue', icon: '⌕', route: 'VendorInventory', active: ['VendorInventory', 'VendorVenueManagement'] },
  { label: 'Bookings', icon: '▣', route: 'VendorBookings', active: ['VendorBookings', 'VendorAvailability', 'ManualWalkInBooking', 'BookingDetails'] },
  { label: 'Analytics', icon: '▥', route: 'VendorAnalytics', active: ['VendorAnalytics'] },
  { label: 'Profile', icon: '●', route: 'Profile', active: ['Profile', 'EditProfile', 'Notifications', 'Settings', 'VendorReviews'] },
];

export const BOTTOM_NAV_ROUTES = new Set([
  'PlayerHome', 'VenueSearch', 'GameRooms', 'MyBookings', 'Profile', 'BookingCheckout',
  'VendorDashboard', 'VendorBookings', 'VendorAnalytics', 'VendorInventory', 'VendorVenueManagement', 'VendorAvailability',
]);

export default function BottomNavBar({ role, routeName, onNavigate }) {
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const tabs = role === 'vendor' ? VENDOR_TABS : PLAYER_TABS;

  return (
    <View style={[styles.bar, { backgroundColor: colors.surface, borderColor: colors.border, paddingBottom: Math.max(insets.bottom, 7) }]}>
      {tabs.map(tab => {
        const selected = tab.active.includes(routeName);
        const color = selected ? colors.primary : colors.inkSoft;
        return (
          <Pressable
            key={tab.label}
            accessibilityRole="button"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            testID={`bottom-nav-${tab.label.toLowerCase()}`}
            onPress={() => onNavigate(tab.route)}
            style={styles.item}
          >
            <Text style={[styles.icon, { color }]}>{tab.icon}</Text>
            <Text style={[styles.label, { color, fontWeight: selected ? '800' : '500' }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 62, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 6 },
  item: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 17, lineHeight: 20 },
  label: { fontSize: 9, lineHeight: 12 },
});
