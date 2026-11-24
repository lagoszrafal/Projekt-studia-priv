import { useState } from 'react';
import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { Card, Screen, VaultlyButton } from '@/components/ui';
import { useTheme } from '@/theme/theme';
import { createBiometricVaultService } from '@/services/container';

export default function BiometricsScreen() {
  const { colors, spacing, typography } = useTheme();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const enableBiometrics = async () => {
    setLoading(true);
    setError(null);
    try {
      await createBiometricVaultService().enable();
      router.replace('/onboarding/complete');
    } catch {
      setError('Biometria jest niedostępna lub została anulowana.');
    } finally {
      setLoading(false);
    }
  };

  return <Screen contentStyle={{ justifyContent: 'space-between', gap: spacing.xl }}>
    <View style={{ gap: spacing.md }}><Text style={[typography.title, { color: colors.textPrimary }]}>Szybko, ale nadal bezpiecznie</Text><Text style={[typography.body, { color: colors.textSecondary }]}>Biometria będzie kontrolować dostęp do klucza chronionego przez system. Hasło główne zawsze pozostanie metodą awaryjną.</Text></View>
    <Card><Text style={{ fontSize: 40 }}>◎</Text><Text style={[typography.heading, { color: colors.textPrimary, marginTop: spacing.md }]}>Biometria jest opcjonalna</Text>{error ? <Text style={[typography.caption, { color: colors.danger, marginTop: spacing.sm }]}>{error}</Text> : null}</Card>
    <View style={{ gap: spacing.sm }}><VaultlyButton label="Włącz biometrię" loading={loading} onPress={enableBiometrics} /><VaultlyButton label="Pomiń na razie" variant="ghost" onPress={() => router.replace('/onboarding/complete')} /></View>
  </Screen>;
}
