import { router } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { BrandMark, Screen, VaultlyButton } from '@/components/ui';
import { useTheme } from '@/theme/theme';

export default function WelcomeScreen() {
  const { colors, spacing, typography } = useTheme();
  return <Screen contentStyle={styles.layout}>
    <BrandMark />
    <View style={{ gap: spacing.md }}>
      <Text style={[typography.display, { color: colors.textPrimary }]}>Twoje hasła.{`\n`}Chronione przez Ciebie.</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>Prywatny sejf działający przede wszystkim offline.</Text>
    </View>
    <VaultlyButton label="Rozpocznij" onPress={() => router.push('/onboarding/create-master-password')} />
  </Screen>;
}
const styles = StyleSheet.create({ layout: { justifyContent: 'space-between', paddingVertical: 32 } });
