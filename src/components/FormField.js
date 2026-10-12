import React, { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const FormField = forwardRef(function FormField(
  {
    label,
    value,
    onChangeText,
    placeholder,
    error,
    testID,
    accessibilityLabel,
    secureTextEntry = false,
    keyboardType = 'default',
    returnKeyType = 'next',
    onSubmitEditing,
    autoCapitalize = 'sentences',
    autoCorrect = false,
    multiline = false,
    maxLength,
    editable = true,
    style,
  },
  ref,
) {
  const { colors, radius, spacing } = useTheme();

  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      ) : null}
      <TextInput
        ref={ref}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder || label}
        placeholderTextColor={colors.muted}
        secureTextEntry={secureTextEntry}
        keyboardType={keyboardType}
        returnKeyType={returnKeyType}
        onSubmitEditing={onSubmitEditing}
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        multiline={multiline}
        maxLength={maxLength}
        editable={editable}
        accessibilityLabel={accessibilityLabel || label || placeholder}
        testID={testID}
        style={[
          styles.input,
          {
            color: colors.ink,
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radius.md,
            paddingHorizontal: spacing.md,
            minHeight: multiline ? 104 : 52,
            textAlignVertical: multiline ? 'top' : 'center',
          },
        ]}
      />
      {error ? (
        <Text accessibilityRole="alert" style={[styles.error, { color: colors.error }]}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

export default FormField;

const styles = StyleSheet.create({
  field: {
    marginBottom: 14,
  },
  label: {
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 7,
  },
  input: {
    borderWidth: 1,
    fontSize: 15,
    paddingVertical: 12,
  },
  error: {
    fontSize: 12,
    marginTop: 5,
  },
});
