import { useState } from 'react';
import { Alert, Pressable, Text, View } from 'react-native';
import { ExpoSecureRandom } from '@/crypto/Random';
import { ExpoClipboardService } from '@/services/ClipboardService';
import { PasswordGeneratorService } from '@/services/PasswordGeneratorService';
import { useSettingsStore } from '@/store/settingsStore';
import { useTheme } from '@/theme/theme';
import { Card, PasswordStrengthMeter, SecureInput, VaultlyButton, VaultlyInput, passwordScore } from '@/components/ui';

const passwordService = new PasswordGeneratorService(new ExpoSecureRandom());

type Props = {
  password: string;
  onPasswordChange: (password: string) => void;
};

export function PasswordGeneratorPanel({ password, onPasswordChange }: Props) {
  const { colors, spacing, typography } = useTheme();
  const clipboardClearSeconds = useSettingsStore((state) => state.clipboardClearSeconds);
  const [length, setLength] = useState('18');
  const [includeLowercase, setIncludeLowercase] = useState(true);
  const [includeUppercase, setIncludeUppercase] = useState(true);
  const [includeNumbers, setIncludeNumbers] = useState(true);
  const [includeSymbols, setIncludeSymbols] = useState(true);

  const generatePassword = () => {
    try {
      const generated = passwordService.generate({
        length: Number(length),
        includeLowercase,
        includeUppercase,
        includeNumbers,
        includeSymbols,
      });
      onPasswordChange(generated);
    } catch (error) {
      Alert.alert('Błąd', error instanceof Error ? error.message : 'Nie udało się wygenerować hasła.');
    }
  };

  const copyPassword = async () => {
    if (!password) return;
    try {
      await new ExpoClipboardService().copySecret(password, clipboardClearSeconds);
      Alert.alert('Skopiowano', 'Hasło zostało skopiowane do schowka.');
    } catch {
      Alert.alert('Błąd', 'Nie udało się skopiować hasła do schowka.');
    }
  };

  const options = [
    { label: 'Małe litery', checked: includeLowercase, toggle: () => setIncludeLowercase((value) => !value) },
    { label: 'Duże litery', checked: includeUppercase, toggle: () => setIncludeUppercase((value) => !value) },
    { label: 'Cyfry', checked: includeNumbers, toggle: () => setIncludeNumbers((value) => !value) },
    { label: 'Symbole', checked: includeSymbols, toggle: () => setIncludeSymbols((value) => !value) },
  ];

  return <Card style={{ gap: spacing.md }}>
    <SecureInput label="Hasło" value={password} onChangeText={onPasswordChange} />
    <VaultlyInput
      label="Długość hasła"
      value={length}
      onChangeText={setLength}
      keyboardType="number-pad"
      inputMode="numeric"
    />
    <View style={{ gap: spacing.sm }}>
      {options.map((option) => (
        <Pressable
          key={option.label}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: option.checked }}
          onPress={option.toggle}
          style={{ paddingVertical: spacing.xs }}
        >
          <Text style={[typography.body, { color: colors.textPrimary }]}>
            {option.checked ? '☑' : '☐'} {option.label}
          </Text>
        </Pressable>
      ))}
    </View>
    {password ? <View style={{ gap: spacing.xs }}>
      <PasswordStrengthMeter password={password} />
      <Text style={[typography.caption, { color: colors.textSecondary }]}>Siła: {passwordScore(password)}/5</Text>
    </View> : null}
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <VaultlyButton label="Kopiuj" variant="ghost" disabled={!password} onPress={copyPassword} style={{ flex: 1 }} />
      <VaultlyButton label="Generuj" variant="secondary" onPress={generatePassword} style={{ flex: 1 }} />
    </View>
  </Card>;
}
