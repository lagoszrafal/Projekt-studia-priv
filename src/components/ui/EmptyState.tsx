import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme/theme';
export function EmptyState({ title, description }: { title: string; description: string }) {
  const { colors, spacing, typography } = useTheme();
  return <View style={[styles.box, { gap: spacing.sm }]}><MaterialCommunityIcons name="shield-lock-outline" color={colors.accent} size={44} /><Text style={[typography.heading, { color: colors.textPrimary }]}>{title}</Text><Text style={[typography.body, styles.center, { color: colors.textSecondary }]}>{description}</Text></View>;
}
const styles = StyleSheet.create({ box: { alignItems: 'center', paddingVertical: 40 }, center: { textAlign: 'center' } });
