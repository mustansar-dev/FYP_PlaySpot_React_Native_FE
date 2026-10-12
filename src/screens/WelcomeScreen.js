import React, { useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Easing,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AppButton from '../components/AppButton';
import { useTheme } from '../context/ThemeContext';

const SPORTS = [
  { name: 'Futsal', note: 'Fast five-a-side', icon: '⚽', color: '#D8F783' },
  { name: 'Cricket', note: 'Find your pitch', icon: '🏏', color: '#F7BD72' },
  { name: 'Padel', note: 'Book a court', icon: '🎾', color: '#89D5B0' },
  { name: 'Badminton', note: 'Play a rally', icon: '🏸', color: '#B8A3EF' },
];

function SportTile({ sport, width }) {
  return (
    <View style={[styles.sportTile, { width, backgroundColor: sport.color }]}>
      <View style={styles.tileTop}>
        <Text style={styles.sportIcon} accessible={false}>{sport.icon}</Text>
        <View style={styles.tileDot} />
      </View>
      <View>
        <Text style={styles.sportName}>{sport.name}</Text>
        <Text style={styles.sportNote}>{sport.note}</Text>
      </View>
    </View>
  );
}

export default function WelcomeScreen({ navigation }) {
  const { colors, radius, spacing } = useTheme();
  const { width } = useWindowDimensions();
  const tileWidth = Math.min(158, Math.max(132, width * 0.4));
  const tileGap = 11;
  const rowDistance = useMemo(
    () => SPORTS.length * (tileWidth + tileGap),
    [tileWidth],
  );
  const marqueeX = useRef(new Animated.Value(0)).current;
  const heroOpacity = useRef(new Animated.Value(0)).current;
  const heroY = useRef(new Animated.Value(18)).current;

  useEffect(() => {
    const marquee = Animated.loop(
      Animated.timing(marqueeX, {
        toValue: -rowDistance,
        duration: 26000,
        easing: Easing.linear,
        useNativeDriver: true,
      }),
    );
    const entrance = Animated.parallel([
      Animated.timing(heroOpacity, {
        toValue: 1,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(heroY, {
        toValue: 0,
        duration: 520,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);
    marquee.start();
    entrance.start();

    return () => {
      marquee.stop();
      entrance.stop();
      marqueeX.stopAnimation();
      heroOpacity.stopAnimation();
      heroY.stopAnimation();
    };
  }, [heroOpacity, heroY, marqueeX, rowDistance]);

  const repeatedSports = [...SPORTS, ...SPORTS];

  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.navy }]}>
      <ScrollView
        contentContainerStyle={[styles.content, { paddingHorizontal: spacing.lg }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.brandRow}>
          <View style={[styles.brandMark, { backgroundColor: colors.lime, borderRadius: radius.md }]}>
            <Text style={styles.brandBall}>●</Text>
          </View>
          <Text style={[styles.brand, { color: colors.white }]}>PlaySpot <Text style={{ color: colors.lime }}>PK</Text></Text>
          <View style={styles.locationTag}>
            <Text style={styles.locationDot}>●</Text>
            <Text style={styles.locationText}>PAKISTAN</Text>
          </View>
        </View>

        <Animated.View style={{ opacity: heroOpacity, transform: [{ translateY: heroY }] }}>
          <View style={styles.eyebrowRow}>
            <Text style={[styles.eyebrow, { color: colors.lime }]}>YOUR NEXT GAME STARTS HERE</Text>
          </View>
          <Text style={[styles.headline, { color: colors.white }]}>
            Find your{ '\n' }
            <Text style={{ color: colors.lime }}>place to play.</Text>
          </Text>
          <Text style={[styles.description, { color: '#C5D4CA' }]}>
            Discover local sports venues, book a court, and find people ready to play.
          </Text>
        </Animated.View>

        <View style={[styles.marqueeFrame, { borderRadius: radius.lg, borderColor: 'rgba(255,255,255,0.14)' }]}>
          <View style={styles.marqueeLabelRow}>
            <Text style={styles.marqueeLabel}>PICK YOUR GAME</Text>
            <Text style={styles.marqueeHint}>SCROLLING SPORTS</Text>
          </View>
          <View style={styles.marqueeViewport} accessibilityLabel="Sports: futsal, cricket, padel, and badminton">
            <Animated.View
              style={[styles.marqueeRow, { transform: [{ translateX: marqueeX }] }]}
            >
              {repeatedSports.map((sport, index) => (
                <SportTile
                  key={`${sport.name}-${index}`}
                  sport={sport}
                  width={tileWidth}
                />
              ))}
            </Animated.View>
          </View>
        </View>

        <View style={styles.valueRow}>
          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>01</Text>
            <Text style={styles.valueText}>Find venues</Text>
          </View>
          <View style={styles.valueDivider} />
          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>02</Text>
            <Text style={styles.valueText}>Book & play</Text>
          </View>
          <View style={styles.valueDivider} />
          <View style={styles.valueItem}>
            <Text style={styles.valueIcon}>03</Text>
            <Text style={styles.valueText}>Meet players</Text>
          </View>
        </View>

        <View style={styles.actions}>
          <AppButton
            title="Create your account"
            testID="welcome-signup"
            accessibilityLabel="Sign up for PlaySpot PK"
            onPress={() => navigation.navigate('RoleSelection')}
            style={styles.primaryAction}
            textStyle={{ color: colors.navy }}
          />
          <AppButton
            title="I already have an account"
            testID="welcome-login"
            variant="secondary"
            accessibilityLabel="Log in to PlaySpot PK"
            onPress={() => navigation.navigate('Login')}
            style={[styles.secondaryAction, { borderColor: 'rgba(255,255,255,0.25)' }]}
            textStyle={{ color: colors.white }}
          />
        </View>
        <Text style={styles.demoFootnote}>A local demo for sports players and venue providers in Pakistan.</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
  },
  content: {
    paddingTop: 8,
    paddingBottom: 24,
  },
  brandRow: {
    minHeight: 46,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 30,
  },
  brandMark: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 9,
  },
  brandBall: {
    color: '#10221B',
    fontSize: 17,
    fontWeight: '900',
  },
  brand: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: -0.3,
  },
  locationTag: {
    marginLeft: 'auto',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.09)',
  },
  locationDot: {
    color: '#C6F36A',
    fontSize: 8,
  },
  locationText: {
    color: '#D7E3D9',
    fontWeight: '800',
    fontSize: 9,
    letterSpacing: 1,
  },
  eyebrowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 9,
  },
  eyebrow: {
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1.5,
  },
  headline: {
    fontSize: 42,
    lineHeight: 47,
    letterSpacing: -1.6,
    fontWeight: '900',
  },
  description: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 11,
    maxWidth: 360,
  },
  marqueeFrame: {
    borderWidth: 1,
    paddingTop: 14,
    paddingBottom: 12,
    marginTop: 22,
    backgroundColor: 'rgba(255,255,255,0.055)',
  },
  marqueeLabelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 14,
    marginBottom: 10,
  },
  marqueeLabel: {
    color: '#F0F5EF',
    fontWeight: '800',
    fontSize: 10,
    letterSpacing: 1.2,
  },
  marqueeHint: {
    color: '#A5B7AA',
    fontWeight: '700',
    fontSize: 9,
    letterSpacing: 0.8,
  },
  marqueeViewport: {
    overflow: 'hidden',
  },
  marqueeRow: {
    flexDirection: 'row',
    gap: 11,
    paddingHorizontal: 14,
  },
  sportTile: {
    height: 120,
    justifyContent: 'space-between',
    borderRadius: 17,
    padding: 13,
  },
  tileTop: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
  },
  sportIcon: {
    fontSize: 32,
  },
  tileDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(16,34,27,0.4)',
  },
  sportName: {
    color: '#10221B',
    fontWeight: '900',
    fontSize: 15,
  },
  sportNote: {
    color: 'rgba(16,34,27,0.72)',
    fontSize: 10,
    fontWeight: '600',
    marginTop: 2,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 21,
    marginBottom: 21,
  },
  valueItem: {
    flex: 1,
    alignItems: 'center',
  },
  valueIcon: {
    color: '#C6F36A',
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 1,
  },
  valueText: {
    color: '#D4E0D6',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 4,
  },
  valueDivider: {
    width: 1,
    height: 26,
    backgroundColor: 'rgba(255,255,255,0.16)',
  },
  actions: {
    gap: 10,
  },
  primaryAction: {
    backgroundColor: '#C6F36A',
    minHeight: 56,
  },
  secondaryAction: {
    minHeight: 54,
  },
  demoFootnote: {
    color: '#A7B9AC',
    fontSize: 10,
    textAlign: 'center',
    marginTop: 13,
  },
});
