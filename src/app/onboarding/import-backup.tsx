import { File } from 'expo-file-system';
import { router } from 'expo-router';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { useSQLiteContext } from 'expo-sqlite';
import { Card, Screen, SecureInput, VaultlyButton } from '@/components/ui';
import { useTheme } from '@/theme/theme';
import { createAuthService } from '@/services/container';
import { importDatabaseCopy } from '@/services/DatabaseImportService';
import { useAuthStore } from '@/store/authStore';

export default function ImportBackupScreen() {
  const db = useSQLiteContext();
  const unlock = useAuthStore((state) => state.unlock);
  const { colors, spacing, typography } = useTheme();
  const [backupUri, setBackupUri] = useState<string | null>(null);
  const [backupName, setBackupName] = useState<string | null>(null);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chooseBackup = async () => {
    setError(null);
    try {
      const result = await File.pickFileAsync({ mimeTypes: '*/*' });
      if (result.canceled) return;
      setBackupUri(result.result.uri);
      setBackupName(result.result.name);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się wybrać pliku kopii.');
    }
  };

  const restoreBackup = async () => {
    if (!backupUri || !password) {
      setError('Wybierz plik kopii i wpisz hasło główne.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      await importDatabaseCopy(backupUri, password, createAuthService(db));
      setPassword('');
      unlock();
      router.replace('/(tabs)/vault');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Nie udało się przywrócić kopii.');
      setPassword('');
    } finally {
      setLoading(false);
    }
  };

  return <Screen scroll contentStyle={{ gap: spacing.xl }}>
    <View style={{ gap: spacing.sm }}>
      <Text style={[typography.title, { color: colors.textPrimary }]}>Przywróć sejf</Text>
      <Text style={[typography.body, { color: colors.textSecondary }]}>
        Wybierz przenośną kopię Vaultly i podaj hasło główne, którym została zabezpieczona.
      </Text>
    </View>
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>
        Plik kopii zawiera zaszyfrowaną bazę oraz publiczne parametry potrzebne do wyprowadzenia klucza. Hasło jest wymagane do odszyfrowania sejfu.
      </Text>
    </Card>
    <VaultlyButton
      label={backupName ?? 'Wybierz plik kopii'}
      variant="secondary"
      disabled={loading}
      onPress={() => { void chooseBackup(); }}
    />
    <SecureInput
      label="Hasło główne"
      value={password}
      onChangeText={setPassword}
      textContentType="password"
    />
    {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    <VaultlyButton
      label="Przywróć sejf"
      loading={loading}
      disabled={!backupUri || !password}
      onPress={() => { void restoreBackup(); }}
    />
  </Screen>;
}
