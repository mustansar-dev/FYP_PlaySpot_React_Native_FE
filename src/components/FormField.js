import React, { forwardRef, useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
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
    leadingIcon,
    style,
  },
  ref,
) {
  const { colors, radius, spacing } = useTheme();
  const [passwordVisible, setPasswordVisible] = useState(false);
  const hasAdornment = Boolean(leadingIcon || secureTextEntry);

  return (
    <View style={[styles.field, style]}>
      {label ? (
        <Text style={[styles.label, { color: colors.ink }]}>{label}</Text>
      ) : null}
      <View
        style={[
          hasAdornment ? styles.inputWithIcon : null,
          hasAdornment ? {
            backgroundColor: colors.surface,
            borderColor: error ? colors.error : colors.border,
            borderRadius: radius.md,
          } : null,
        ]}
      >
        {leadingIcon ? <Text accessible={false} style={[styles.leadingIcon, { color: colors.inkSoft }]}>{leadingIcon}</Text> : null}
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder || label}
          placeholderTextColor={colors.muted}
          secureTextEntry={secureTextEntry && !passwordVisible}
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
            hasAdornment ? styles.inputIconField : null,
            {
              color: colors.ink,
              backgroundColor: hasAdornment ? 'transparent' : colors.surface,
              borderColor: hasAdornment ? 'transparent' : error ? colors.error : colors.border,
              borderRadius: hasAdornment ? 0 : radius.md,
              borderWidth: hasAdornment ? 0 : 1,
              paddingHorizontal: hasAdornment ? 0 : spacing.md,
              minHeight: multiline ? 104 : 52,
              textAlignVertical: multiline ? 'top' : 'center',
            },
          ]}
        />
        {secureTextEntry ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={passwordVisible ? 'Hide password' : 'Show password'}
            accessibilityState={{ selected: passwordVisible }}
            testID={`${testID || 'password'}-visibility`}
            onPress={() => setPasswordVisible(current => !current)}
            hitSlop={8}
            style={styles.passwordToggle}
          >
            <View style={[styles.passwordEye, { borderColor: colors.inkSoft }]}>
              <View style={[styles.passwordPupil, { backgroundColor: colors.inkSoft }]} />
              {passwordVisible ? <View style={[styles.passwordSlash, { backgroundColor: colors.inkSoft }]} /> : null}
            </View>
          </Pressable>
        ) : null}
      </View>
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
  inputWithIcon: {
    minHeight: 52,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 13,
  },
  inputIconField: { flex: 1 },
  leadingIcon: { fontSize: 19, lineHeight: 24, marginRight: 9 },
  passwordToggle: { width: 42, minHeight: 44, alignItems: 'center', justifyContent: 'center', marginLeft: 6 },
  passwordEye: { width: 22, height: 16, borderWidth: 1.5, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  passwordPupil: { width: 6, height: 6, borderRadius: 3 },
  passwordSlash: { position: 'absolute', width: 27, height: 1.5, transform: [{ rotate: '-40deg' }] },
  error: {
    fontSize: 12,
    marginTop: 5,
  },
});
