import React from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '../context/ThemeContext';

export function DesignCard({ children, style, testID }) {
  const { colors, radius } = useTheme();
  return (
    <View
      testID={testID}
      style={[
        styles.card,
        { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radius.md },
        style,
      ]}
    >
      {children}
    </View>
  );
}

export function SectionHeading({ title, action, onAction, testID }) {
  const { colors } = useTheme();
  return (
    <View style={styles.sectionHeading}>
      <Text style={[styles.sectionTitle, { color: colors.ink }]}>{title}</Text>
      {action ? (
        <Text
          accessibilityRole="button"
          onPress={onAction}
          testID={testID}
          style={[styles.sectionAction, { color: colors.primary }]}
        >
          {action}
        </Text>
      ) : null}
    </View>
  );
}

export function StatusBadge({ label, tone = 'neutral' }) {
  const { colors, radius } = useTheme();
  const palette = tone === 'success'
    ? { backgroundColor: colors.limePale, color: colors.success }
    : tone === 'warning'
      ? { backgroundColor: '#FFF2DE', color: colors.orange }
      : tone === 'danger'
        ? { backgroundColor: colors.errorPale, color: colors.error }
        : { backgroundColor: '#EDF1F5', color: colors.inkSoft };
  return (
    <View style={[styles.badge, { backgroundColor: palette.backgroundColor, borderRadius: radius.pill }]}>
      <Text style={[styles.badgeText, { color: palette.color }]}>{label}</Text>
    </View>
  );
}

export function InlineNotice({ children, tone = 'info', testID }) {
  const { colors, radius } = useTheme();
  const backgroundColor = tone === 'danger' ? colors.errorPale : colors.limePale;
  const color = tone === 'danger' ? colors.error : colors.ink;
  return (
    <View testID={testID} style={[styles.notice, { backgroundColor, borderRadius: radius.md }]}>
      <Text style={[styles.noticeText, { color }]}>{children}</Text>
    </View>
  );
}

export function EmptyState({ title, description, action }) {
  const { colors } = useTheme();
  return (
    <View style={styles.empty}>
      <Text style={[styles.emptyTitle, { color: colors.ink }]}>{title}</Text>
      <Text style={[styles.emptyCopy, { color: colors.inkSoft }]}>{description}</Text>
      {action || null}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, padding: 14, marginBottom: 12 },
  sectionHeading: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 10, marginBottom: 10 },
  sectionTitle: { fontSize: 16, lineHeight: 22, fontWeight: '800' },
  sectionAction: { fontSize: 12, fontWeight: '800', paddingVertical: 6, paddingLeft: 10 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 9, paddingVertical: 5 },
  badgeText: { fontSize: 9, fontWeight: '900', letterSpacing: 0.5, textTransform: 'uppercase' },
  notice: { padding: 12, marginBottom: 13 },
  noticeText: { fontSize: 12, lineHeight: 18 },
  empty: { alignItems: 'center', paddingHorizontal: 28, paddingVertical: 28 },
  emptyTitle: { fontSize: 16, fontWeight: '800', textAlign: 'center' },
  emptyCopy: { fontSize: 12, lineHeight: 18, textAlign: 'center', marginTop: 6 },
});
