import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { Pressable, Text } from 'react-native';
import { PasswordGeneratorPanel } from '@/components/password-generator/PasswordGeneratorPanel';
import { VaultlyInput } from '@/components/ui';
import { useTheme } from '@/theme/theme';

export type CredentialDraft = {
  name: string;
  username: string;
  password: string;
  url: string;
  notes: string;
  favorite: boolean;
};

type Props = {
  value: CredentialDraft;
  onChange: (value: CredentialDraft) => void;
  autoFocusName?: boolean;
};

export function CredentialForm({ value, onChange, autoFocusName = false }: Props) {
  const { colors, spacing, typography } = useTheme();
  const change = <Key extends keyof CredentialDraft>(key: Key, fieldValue: CredentialDraft[Key]) => {
    onChange({ ...value, [key]: fieldValue });
  };

  return <>
    <VaultlyInput label="Nazwa wpisu" value={value.name} onChangeText={(name) => change('name', name)} autoFocus={autoFocusName} />
    <VaultlyInput label="Nazwa użytkownika lub e-mail" value={value.username} onChangeText={(username) => change('username', username)} autoCapitalize="none" />
    <PasswordGeneratorPanel password={value.password} onPasswordChange={(password) => change('password', password)} />
    <VaultlyInput label="Adres strony (URL)" value={value.url} onChangeText={(url) => change('url', url)} autoCapitalize="none" keyboardType="url" />
    <VaultlyInput label="Notatki" value={value.notes} onChangeText={(notes) => change('notes', notes)} multiline style={{ minHeight: 112, textAlignVertical: 'top', paddingTop: 16 }} />
    <Pressable
      accessibilityRole="checkbox"
      accessibilityLabel="Oznacz wpis jako ulubiony"
      accessibilityState={{ checked: value.favorite }}
      onPress={() => change('favorite', !value.favorite)}
      style={{ flexDirection: 'row', alignItems: 'center', gap: spacing.sm }}
    >
      <MaterialCommunityIcons name={value.favorite ? 'star' : 'star-outline'} color={value.favorite ? colors.accent : colors.textSecondary} size={24} />
      <Text style={[typography.body, { color: colors.textPrimary }]}>Wpis ulubiony</Text>
    </Pressable>
  </>;
}
