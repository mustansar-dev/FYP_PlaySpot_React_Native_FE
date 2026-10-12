import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export default function ChoiceChips({
  label,
  options,
  selected,
  onSelect,
  multiple = false,
  testID,
  error,
}) {
  const { colors, radius } = useTheme();

  return (
    <View style={styles.wrap}>
      {label ? <Text style={[styles.label, { color: colors.ink }]}>{label}</Text> : null}
      <View style={styles.chips}>
        {options.map(option => {
          const isSelected = multiple
            ? Array.isArray(selected) && selected.includes(option)
            : selected === option;
          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityLabel={option}
              accessibilityState={{ selected: isSelected }}
              testID={testID ? `${testID}-${option.toLowerCase().replace(/[^a-z0-9]+/g, '-')}` : undefined}
              onPress={() => onSelect(option)}
              style={[
                styles.chip,
                {
                  borderRadius: radius.pill,
                  backgroundColor: isSelected ? colors.limePale : colors.surface,
                  borderColor: isSelected ? colors.primary : colors.border,
                },
              ]}
            >
              <Text style={[styles.chipText, { color: isSelected ? colors.primaryDark : colors.inkSoft }]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
      {error ? <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    marginBottom: 16,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 8,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingVertical: 9,
    paddingHorizontal: 13,
    borderWidth: 1,
  },
  chipText: {
    fontSize: 12,
    fontWeight: '700',
  },
  error: {
    fontSize: 12,
    marginTop: 6,
  },
});
