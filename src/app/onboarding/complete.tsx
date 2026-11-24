import { router } from 'expo-router';
import { Text, View } from 'react-native';
import { BrandMark, Screen, VaultlyButton } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/theme';

export default function CompleteScreen() {
  const markUnlocked = useAuthStore((state) => state.unlock);
  const { colors, spacing, typography } = useTheme();
  const finish = () => {
    markUnlocked();
    router.replace('/(tabs)/vault');
  };
  return <Screen contentStyle={{ alignItems: 'center', justifyContent: 'center', gap: spacing.xl }}>
    <BrandMark compact />
    <View style={{ gap: spacing.sm }}><Text style={[typography.title, { color: colors.textPrimary, textAlign: 'center' }]}>Twój sejf jest gotowy</Text><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Klucz sejfu został zaszyfrowany kluczem wyprowadzonym z hasła głównego.</Text></View>
    <VaultlyButton label="Przejdź do sejfu" onPress={finish} style={{ alignSelf: 'stretch' }} />
  </Screen>;
}
