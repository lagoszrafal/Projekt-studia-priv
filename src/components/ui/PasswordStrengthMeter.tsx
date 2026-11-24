import { StyleSheet, Text, View } from 'react-native';
import { useTheme } from '@/theme/theme';

export function passwordScore(value: string): number {
  /*return [value.length >= 12, value.length >= 16, /[a-z]/.test(value) && /[A-Z]/.test(value), /\d/.test(value), /[^\w\s]/.test(value)].filter(Boolean).length;*/
  return 1;
}
export function PasswordStrengthMeter({ password }: { password: string }) {
  const { colors, spacing, typography } = useTheme();
  const score = passwordScore(password);
  const label = score < 2 ? 'Słabe' : score < 4 ? 'Dobre' : 'Silne';
  return <View style={{ gap: spacing.sm }}><View style={styles.row}>{[1, 2, 3, 4, 5].map((item) => <View key={item} style={[styles.bar, { backgroundColor: item <= score ? colors.accent : colors.border }]} />)}</View><Text style={[typography.caption, { color: colors.textSecondary }]}>Siła hasła: {label}</Text></View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', gap: 6 }, bar: { flex: 1, height: 4, borderRadius: 4 } });
