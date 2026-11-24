import type { PropsWithChildren } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTheme } from '@/theme/theme';

export function Screen({ children, scroll = false, contentStyle }: PropsWithChildren<{ scroll?: boolean; contentStyle?: ViewStyle }>) {
  const { colors, spacing } = useTheme();
  const content = <View style={[styles.content, { padding: spacing.lg }, contentStyle]}>{children}</View>;
  return (
    <SafeAreaView style={[styles.safe, { backgroundColor: colors.background }]}>
      <KeyboardAvoidingView style={styles.safe} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {scroll ? <ScrollView contentContainerStyle={styles.grow} keyboardShouldPersistTaps="handled">{content}</ScrollView> : content}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
const styles = StyleSheet.create({ safe: { flex: 1 }, grow: { flexGrow: 1 }, content: { flex: 1 } });
