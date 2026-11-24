import { StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useTheme } from '@/theme/theme';
export function BrandMark({ compact = false }: { compact?: boolean }) {
  const { colors, radii, typography } = useTheme();
  return <View style={styles.row} accessibilityLabel="Vaultly">
    <View style={[styles.mark, { backgroundColor: colors.accent, borderRadius: radii.md }]}><MaterialCommunityIcons name="shield-lock-outline" color={colors.onAccent} size={27} /></View>
    {!compact && <Text style={[typography.heading, { color: colors.textPrimary }]}>Vaultly</Text>}
  </View>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 12 }, mark: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' } });
