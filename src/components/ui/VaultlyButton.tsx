import { ActivityIndicator, Pressable, StyleSheet, Text, type PressableProps } from 'react-native';
import { useTheme } from '@/theme/theme';

type Props = PressableProps & { label: string; variant?: 'primary' | 'secondary' | 'ghost'; loading?: boolean };
export function VaultlyButton({ label, variant = 'primary', loading = false, disabled, style, ...props }: Props) {
  const { colors, radii, typography } = useTheme();
  const primary = variant === 'primary';
  const backgroundColor = primary ? colors.accent : variant === 'secondary' ? colors.accentMuted : 'transparent';
  const color = primary ? colors.onAccent : colors.accent;
  return (
    <Pressable accessibilityRole="button" disabled={disabled || loading} style={(state) => [
      styles.base,
      { borderRadius: radii.md, backgroundColor, opacity: disabled ? 0.45 : state.pressed ? 0.82 : 1 },
      typeof style === 'function' ? style(state) : style,
    ]} {...props}>
      {loading ? <ActivityIndicator color={color} /> : <Text style={[typography.label, { color }]}>{label}</Text>}
    </Pressable>
  );
}
const styles = StyleSheet.create({ base: { minHeight: 56, paddingHorizontal: 20, alignItems: 'center', justifyContent: 'center' } });
