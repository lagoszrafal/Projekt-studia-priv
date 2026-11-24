import type { PropsWithChildren } from 'react';
import { View, type ViewProps } from 'react-native';
import { useTheme } from '@/theme/theme';
export function Card({ children, style, ...props }: PropsWithChildren<ViewProps>) {
  const { colors, radii, spacing } = useTheme();
  return <View style={[{ backgroundColor: colors.surface, borderColor: colors.border, borderWidth: 1, borderRadius: radii.lg, padding: spacing.lg }, style]} {...props}>{children}</View>;
}
