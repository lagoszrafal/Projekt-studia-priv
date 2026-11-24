import { useState } from 'react';
import { Text } from 'react-native';
import { Screen } from '@/components/ui';
import { PasswordGeneratorPanel } from '@/components/password-generator/PasswordGeneratorPanel';
import { useTheme } from '@/theme/theme';

export default function GeneratorScreen() {
  const { colors, spacing, typography } = useTheme();
  const [password, setPassword] = useState('');

  return <Screen scroll contentStyle={{ gap: spacing.lg }}>
    <Text style={[typography.title, { color: colors.textPrimary }]}>Generator haseł</Text>
    <Text style={[typography.body, { color: colors.textSecondary }]}>Utwórz losowe hasło i skopiuj je bez zapisywania w sejfie.</Text>
    <PasswordGeneratorPanel password={password} onPasswordChange={setPassword} />
  </Screen>;
}
