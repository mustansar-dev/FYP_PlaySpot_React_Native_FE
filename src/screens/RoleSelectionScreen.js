import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import ScreenHeader from '../components/ScreenHeader';
import { useTheme } from '../context/ThemeContext';

const ROLE_OPTIONS = [
  {
    role: 'player',
    icon: '🏃',
    title: 'I want to play',
    detail: 'Find a venue, book a court, and meet players.',
    route: 'PlayerRegistration',
    testID: 'role-player',
  },
  {
    role: 'vendor',
    icon: '🏟️',
    title: 'I provide a venue',
    detail: 'List your grounds, facilities, and equipment.',
    route: 'VendorRegistration',
    testID: 'role-vendor',
  },
];

export default function RoleSelectionScreen({ navigation }) {
  const { colors, radius } = useTheme();

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.canvas }]}>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <ScreenHeader
          eyebrow="WELCOME TO PLAYSPOT"
          title="How will you use PlaySpot?"
          subtitle="Choose a role to get the right local demo setup."
          onBack={() => navigation.goBack()}
        />

        <View style={styles.options}>
          {ROLE_OPTIONS.map(option => (
            <Pressable
              key={option.role}
              accessibilityRole="button"
              accessibilityLabel={`${option.title}. ${option.detail}`}
              testID={option.testID}
              onPress={() => navigation.navigate(option.route)}
              style={({ pressed }) => [
                styles.option,
                {
                  backgroundColor: colors.surface,
                  borderColor: pressed ? colors.primary : colors.border,
                  borderRadius: radius.lg,
                  transform: [{ scale: pressed ? 0.99 : 1 }],
                },
              ]}
            >
              <View style={[styles.iconTile, { backgroundColor: colors.limePale, borderRadius: radius.md }]}>
                <Text style={styles.icon}>{option.icon}</Text>
              </View>
              <View style={styles.optionCopy}>
                <Text style={[styles.optionTitle, { color: colors.ink }]}>{option.title}</Text>
                <Text style={[styles.optionDetail, { color: colors.inkSoft }]}>{option.detail}</Text>
              </View>
              <Text style={[styles.chevron, { color: colors.primary }]}>›</Text>
            </Pressable>
          ))}
        </View>

        <View style={styles.bottom}>
          <Text style={[styles.bottomText, { color: colors.inkSoft }]}>Already have an account?</Text>
          <AppButton
            title="Log in"
            testID="role-selection-login"
            variant="quiet"
            onPress={() => navigation.navigate('Login')}
            style={styles.loginButton}
          />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    padding: 22,
    paddingTop: 16,
    flexGrow: 1,
  },
  options: {
    gap: 12,
    marginTop: 8,
  },
  option: {
    minHeight: 128,
    padding: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconTile: {
    width: 54,
    height: 54,
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    fontSize: 26,
  },
  optionCopy: {
    flex: 1,
    paddingHorizontal: 13,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '800',
  },
  optionDetail: {
    fontSize: 12,
    lineHeight: 18,
    marginTop: 5,
  },
  chevron: {
    fontSize: 32,
    lineHeight: 36,
    marginTop: -4,
  },
  bottom: {
    marginTop: 'auto',
    paddingTop: 26,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  bottomText: {
    fontSize: 13,
  },
  loginButton: {
    minHeight: 40,
    paddingHorizontal: 5,
  },
});
