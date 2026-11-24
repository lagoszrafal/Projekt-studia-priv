import { forwardRef } from 'react';
import { StyleSheet, Text, TextInput, View, type TextInputProps } from 'react-native';
import { useTheme } from '@/theme/theme';

type Props = TextInputProps & { label: string; error?: string };
export const VaultlyInput = forwardRef<TextInput, Props>(function VaultlyInput({ label, error, style, ...props }, ref) {
  const { colors, radii, spacing, typography } = useTheme();
  return <View style={{ gap: spacing.sm }}>
    <Text style={[typography.label, { color: colors.textPrimary }]}>{label}</Text>
    <TextInput ref={ref} placeholderTextColor={colors.textSecondary} style={[
      styles.input, typography.body, { color: colors.textPrimary, backgroundColor: colors.inputBackground, borderColor: error ? colors.danger : colors.border, borderRadius: radii.md }, style,
    ]} {...props} />
    {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
  </View>;
});
const styles = StyleSheet.create({ input: { minHeight: 56, borderWidth: 1, paddingHorizontal: 16 } });
