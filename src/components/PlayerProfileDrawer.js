import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  BackHandler,
  Modal,
  PanResponder,
  Pressable,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';
import { ProfileScreen } from '../screens/AccountScreens';

export default function PlayerProfileDrawer({ visible, onClose, navigation }) {
  const { colors, radius } = useTheme();
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(430, width * 0.94);
  const translateX = useRef(new Animated.Value(drawerWidth)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;
  const [mounted, setMounted] = useState(visible);

  useEffect(() => {
    if (visible) setMounted(true);
  }, [visible]);

  useEffect(() => {
    if (!mounted) return undefined;
    translateX.setValue(visible ? drawerWidth : 0);
    backdropOpacity.setValue(visible ? 0 : 0.46);
    const animation = Animated.parallel([
      Animated.timing(translateX, {
        toValue: visible ? 0 : drawerWidth,
        duration: visible ? 250 : 210,
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: visible ? 0.46 : 0,
        duration: visible ? 250 : 210,
        useNativeDriver: true,
      }),
    ]);
    animation.start(({ finished }) => {
      if (finished && !visible) setMounted(false);
    });
    return () => animation.stop();
  }, [backdropOpacity, drawerWidth, mounted, translateX, visible]);

  useEffect(() => {
    if (!visible) return undefined;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      onClose();
      return true;
    });
    return () => subscription.remove();
  }, [onClose, visible]);

  const profileNavigation = useMemo(() => ({
    goBack: onClose,
    navigate: (route, params) => {
      onClose();
      if (params === undefined) navigation.navigate(route);
      else navigation.navigate(route, params);
    },
  }), [navigation, onClose]);

  const panHandlers = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: (_, gesture) => gesture.dx > 10 && Math.abs(gesture.dx) > Math.abs(gesture.dy),
    onPanResponderMove: (_, gesture) => translateX.setValue(Math.max(0, gesture.dx)),
    onPanResponderRelease: (_, gesture) => {
      if (gesture.dx > drawerWidth * 0.28 || gesture.vx > 0.75) {
        onClose();
      } else {
        Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }).start();
      }
    },
    onPanResponderTerminate: () => Animated.spring(translateX, { toValue: 0, useNativeDriver: true, speed: 20, bounciness: 0 }).start(),
  }), [drawerWidth, onClose, translateX]);

  return (
    <Modal transparent visible={mounted} animationType="none" statusBarTranslucent onRequestClose={onClose}>
      <View style={styles.modal}>
        <Animated.View style={[styles.backdrop, { opacity: backdropOpacity }]}>
          <Pressable accessibilityRole="button" accessibilityLabel="Close profile drawer" testID="profile-drawer-backdrop" onPress={onClose} style={StyleSheet.absoluteFill} />
        </Animated.View>
        <Animated.View
          {...panHandlers.panHandlers}
          testID="profile-drawer-panel"
          accessibilityViewIsModal
          style={[
            styles.panel,
            {
              width: drawerWidth,
              backgroundColor: colors.canvas,
              borderTopLeftRadius: radius.lg,
              borderBottomLeftRadius: radius.lg,
              transform: [{ translateX }],
            },
          ]}
        >
          <ProfileScreen navigation={profileNavigation} />
        </Animated.View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modal: { flex: 1, flexDirection: 'row', justifyContent: 'flex-end' },
  backdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: '#07130D' },
  panel: { height: '100%', overflow: 'hidden', elevation: 16, shadowColor: '#000000', shadowOpacity: 0.18, shadowOffset: { width: -5, height: 0 }, shadowRadius: 16 },
});
