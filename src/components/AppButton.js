import React from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
} from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function AppButton({
  title,
  onPress,
  testID,
  accessibilityLabel,
  variant = 'primary',
  disabled = false,
  loading = false,
  style,
  textStyle,
}) {
  const { colors, radius } = useTheme();
  const secondary = variant === 'secondary';
  const quiet = variant === 'quiet';

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel || title}
      accessibilityState={{ disabled: disabled || loading, busy: loading }}
      testID={testID}
      disabled={disabled || loading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: secondary || quiet ? 'transparent' : colors.primary,
          borderColor: secondary ? colors.border : 'transparent',
          borderRadius: radius.md,
          opacity: disabled ? 0.55 : pressed ? 0.86 : 1,
        },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator
          color={secondary || quiet ? colors.primary : colors.white}
          size="small"
        />
      ) : null}
      <Text
        style={[
          styles.label,
          { color: secondary || quiet ? colors.primary : colors.white },
          textStyle,
        ]}
      >
        {title}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 54,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderWidth: 1,
  },
  label: {
    fontSize: 15,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
});
