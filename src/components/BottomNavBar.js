import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../context/ThemeContext';

const PLAYER_TABS = [
  { label: 'Home', icon: '⌂', route: 'PlayerHome', active: ['PlayerHome', 'Profile'] },
  { label: 'Search', icon: '⌕', route: 'VenueSearch', active: ['VenueSearch'] },
  { label: 'Games', icon: '⚽', route: 'GameRooms', active: ['GameRooms', 'GameRoomDetails', 'CreateGameRoom', 'Tournaments', 'TournamentDetails', 'CreateTournament', 'Leaderboard'] },
  { label: 'Bookings', icon: '▣', route: 'MyBookings', active: ['MyBookings', 'BookingCheckout', 'BookingSuccess', 'BookingDetails'] },
  { label: 'Notifications', icon: 'bell', route: 'Notifications', active: ['Notifications'] },
];

const VENDOR_TABS = [
  { label: 'Home', icon: '⌂', route: 'VendorDashboard', active: ['VendorDashboard'] },
  { label: 'Venue', icon: '⌕', route: 'VendorVenue', active: ['VendorVenue', 'VendorInventory', 'VendorVenueManagement'] },
  { label: 'Bookings', icon: '▣', route: 'VendorBookings', active: ['VendorBookings', 'ManualWalkInBooking', 'BookingDetails'] },
  { label: 'Availability', icon: '◷', route: 'VendorAvailability', active: ['VendorAvailability'] },
  { label: 'Analytics', icon: '▥', route: 'VendorAnalytics', active: ['VendorAnalytics'] },
  { label: 'Notifications', icon: 'bell', route: 'Notifications', active: ['Notifications'] },
];

export const BOTTOM_NAV_ROUTES = new Set([
  'PlayerHome', 'VenueSearch', 'GameRooms', 'MyBookings', 'Profile', 'BookingCheckout',
  'VendorDashboard', 'VendorBookings', 'VendorAnalytics', 'VendorInventory', 'VendorVenueManagement', 'VendorAvailability',
  'VendorVenue', 'Notifications',
]);

function BellIcon({ color, showDot }) {
  return (
    <View style={styles.bellIcon}>
      <View style={[styles.bellBody, { borderColor: color }]} />
      <View style={[styles.bellClapper, { backgroundColor: color }]} />
      {showDot ? <View testID="notification-dot" accessibilityLabel="Unread notification" style={styles.notificationDot} /> : null}
    </View>
  );
}

export default function BottomNavBar({ role, routeName, onNavigate, hasNotifications = false }) {
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
            {tab.icon === 'bell'
              ? <BellIcon color={color} showDot={hasNotifications} />
              : <Text style={[styles.icon, { color }]}>{tab.icon}</Text>}
            <Text style={[styles.label, { color, fontWeight: selected ? '800' : '500' }]}>{tab.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { minHeight: 66, flexDirection: 'row', alignItems: 'center', borderTopWidth: 1, paddingTop: 5 },
  item: { flex: 1, minHeight: 50, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 17, lineHeight: 20 },
  label: { fontSize: 8, lineHeight: 11 },
  bellIcon: { width: 20, height: 21, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  bellBody: { width: 13, height: 14, borderWidth: 1.7, borderTopLeftRadius: 7, borderTopRightRadius: 7, borderBottomLeftRadius: 3, borderBottomRightRadius: 3, borderBottomWidth: 2 },
  bellClapper: { width: 5, height: 2, borderRadius: 1, marginTop: 1 },
  notificationDot: { position: 'absolute', right: 0, top: 0, width: 7, height: 7, borderRadius: 4, backgroundColor: '#D43A3A', borderWidth: 1, borderColor: '#FFFFFF' },
});
