import React, { useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  Animated,
  Easing,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

function RevealPhoto({ uri, width, height, index, reduceMotion, isActive }) {
  const reveal = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) {
      reveal.setValue(1);
      return undefined;
    }
    if (!isActive) {
      reveal.setValue(0);
      return undefined;
    }
    reveal.setValue(0);
    const animation = Animated.timing(reveal, {
      toValue: 1,
      duration: 820,
      easing: Easing.inOut(Easing.cubic),
      useNativeDriver: false,
    });
    animation.start();
    return () => animation.stop();
  }, [isActive, reduceMotion, reveal, uri]);

  const blurRadius = reveal.interpolate({ inputRange: [0, 0.72, 1], outputRange: [18, 5, 0] });
  const opacity = reveal.interpolate({ inputRange: [0, 0.45, 1], outputRange: [0.45, 0.88, 1] });
  const scale = reveal.interpolate({ inputRange: [0, 1], outputRange: [1.045, 1] });

  return (
    <Animated.Image
      source={{ uri }}
      accessibilityLabel={`Venue photo ${index + 1}`}
      blurRadius={blurRadius}
      resizeMode="cover"
      style={{ width, height, opacity, transform: [{ scale }] }}
    />
  );
}

export default function VenuePhotoSlider({ photos = [], venueName = 'Venue', radius = 16 }) {
  const { width: screenWidth } = useWindowDimensions();
  const sliderWidth = Math.max(220, screenWidth - 40);
  const [activeIndex, setActiveIndex] = useState(0);
  const [reduceMotion, setReduceMotion] = useState(false);
  const listRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) setReduceMotion(enabled);
      })
      .catch(() => {});
    const subscription = AccessibilityInfo.addEventListener('reduceMotionChanged', setReduceMotion);
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  if (!photos.length) return null;

  const changePage = event => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / sliderWidth);
    setActiveIndex(Math.min(Math.max(nextIndex, 0), photos.length - 1));
  };

  return (
    <View style={styles.container} testID="venue-photo-slider">
      <FlatList
        ref={listRef}
        data={photos}
        horizontal
        pagingEnabled
        keyExtractor={(uri, index) => `${uri}-${index}`}
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={changePage}
        getItemLayout={(_, index) => ({ length: sliderWidth, offset: sliderWidth * index, index })}
        renderItem={({ item, index }) => (
          <View style={[styles.slide, { width: sliderWidth, borderRadius: radius }]}>
            <RevealPhoto uri={item} index={index} width={sliderWidth} height={218} reduceMotion={reduceMotion} isActive={activeIndex === index} />
            <View pointerEvents="none" style={styles.caption}>
              <Text style={styles.captionEyebrow}>VENUE PHOTO</Text>
              <Text style={styles.captionTitle} numberOfLines={1}>{venueName}</Text>
            </View>
          </View>
        )}
      />
      <View style={styles.controls}>
        <Text style={styles.counter}>{String(activeIndex + 1).padStart(2, '0')} / {String(photos.length).padStart(2, '0')}</Text>
        <View style={styles.dots}>
          {photos.map((photo, index) => (
            <Pressable
              key={`dot-${photo}-${index}`}
              accessibilityRole="button"
              accessibilityLabel={`Show photo ${index + 1}`}
              accessibilityState={{ selected: activeIndex === index }}
              onPress={() => listRef.current?.scrollToIndex({ index, animated: true })}
              style={[styles.dot, activeIndex === index ? styles.activeDot : null]}
            />
          ))}
        </View>
        <Text style={styles.swipeHint}>{photos.length > 1 ? 'SWIPE' : 'PHOTO'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { marginBottom: 14 },
  slide: { height: 218, overflow: 'hidden', backgroundColor: '#DDE6DC' },
  caption: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 16, paddingTop: 25, paddingBottom: 13, backgroundColor: 'rgba(10, 28, 21, 0.72)' },
  captionEyebrow: { color: '#D8F783', fontSize: 9, fontWeight: '900', letterSpacing: 1.5 },
  captionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '800', marginTop: 3 },
  controls: { height: 38, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 3 },
  counter: { color: '#6D7C70', fontSize: 10, fontWeight: '800', minWidth: 42 },
  dots: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  dot: { width: 6, height: 6, borderRadius: 3, backgroundColor: '#B7C2B8' },
  activeDot: { width: 19, backgroundColor: '#1C7A4A' },
  swipeHint: { color: '#6D7C70', fontSize: 9, fontWeight: '900', letterSpacing: 1, minWidth: 42, textAlign: 'right' },
});
