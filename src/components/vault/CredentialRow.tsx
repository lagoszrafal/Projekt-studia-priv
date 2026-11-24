import { Pressable, StyleSheet, Text, View } from 'react-native';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import type { VaultEntry } from '@/types/VaultEntry';
import { useTheme } from '@/theme/theme';

export function CredentialRow({ entry, onPress }: { entry: VaultEntry; onPress: () => void }) {
  const { colors, radii, spacing, typography } = useTheme();
  return <Pressable accessibilityRole="button" accessibilityLabel={`Otwórz ${entry.name}`} onPress={onPress} style={({ pressed }) => [styles.row, { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, padding: spacing.md, opacity: pressed ? 0.75 : 1 }]}>
    <View style={[styles.monogram, { backgroundColor: colors.accentMuted, borderRadius: radii.sm }]}><Text style={[typography.label, { color: colors.accent }]}>{entry.name.slice(0, 1).toUpperCase()}</Text></View>
    <View style={styles.text}><Text numberOfLines={1} style={[typography.label, { color: colors.textPrimary }]}>{entry.name}</Text><Text numberOfLines={1} style={[typography.caption, { color: colors.textSecondary }]}>{entry.username || 'Bez nazwy użytkownika'}</Text></View>
    {entry.favorite ? <MaterialCommunityIcons accessibilityLabel="Ulubione" name="star" color={colors.accent} size={22} /> : null}
  </Pressable>;
}
const styles = StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, gap: 12 }, monogram: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center' }, text: { flex: 1, gap: 2 } });
