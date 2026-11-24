import { useEffect, useState } from 'react';
import { router, useLocalSearchParams, type Href } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { Alert, Text, View } from 'react-native';
import { Card, Screen, VaultlyButton } from '@/components/ui';
import { ExpoClipboardService } from '@/services/ClipboardService';
import { createVaultService } from '@/services/container';
import { useSettingsStore } from '@/store/settingsStore';
import { useVaultStore } from '@/store/vaultStore';
import { useTheme } from '@/theme/theme';
import type { VaultEntry } from '@/types/VaultEntry';

type EntryFieldProps = {
  label: string;
  value: string;
  selectable?: boolean;
};

function EntryField({ label, value, selectable = false }: EntryFieldProps) {
  const { colors, spacing, typography } = useTheme();
  return <Card>
    <Text style={[typography.caption, { color: colors.textSecondary }]}>{label}</Text>
    <Text selectable={selectable} style={[typography.body, { color: colors.textPrimary, marginTop: spacing.xs }]}>{value}</Text>
  </Card>;
}

export default function EntryDetailsScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();
  const clipboardClearSeconds = useSettingsStore((state) => state.clipboardClearSeconds);
  const cachedEntry = useVaultStore((state) => state.entries.find((item) => item.id === id));
  const [entry, setEntry] = useState<VaultEntry | null>(cachedEntry ?? null);
  const [loading, setLoading] = useState(!cachedEntry);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);
  const [copying, setCopying] = useState(false);
  useEffect(() => {
    let active = true;
    if (!id) return () => { active = false; };

    createVaultService(db).getById(id)
      .then((loadedEntry) => {
        if (!active) return;
        setEntry(loadedEntry);
        if (!loadedEntry) setLoadError('Nie znaleziono wpisu.');
      })
      .catch(() => {
        if (active) setLoadError('Nie udało się odszyfrować wpisu.');
      })
      .finally(() => { if (active) setLoading(false); });

    return () => { active = false; };
  }, [cachedEntry, db, id]);
  const remove = () => Alert.alert('Usunąć wpis?', 'Tej operacji nie można cofnąć w aplikacji.', [
    { text: 'Anuluj', style: 'cancel' },
    { text: 'Usuń', style: 'destructive', onPress: async () => { if (id) await createVaultService(db).delete(id); router.replace('/(tabs)/vault'); } },
  ]);
  const copyPassword = async () => {
    if (!entry) return;
    setCopying(true);
    try {
      await new ExpoClipboardService().copySecret(entry.password, clipboardClearSeconds);
      Alert.alert('Skopiowano', 'Hasło zostało skopiowane do schowka.');
    } catch {
      Alert.alert('Błąd', 'Nie udało się skopiować hasła do schowka.');
    } finally {
      setCopying(false);
    }
  };
  if (!id) return <Screen contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
    <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger, textAlign: 'center' }]}>Nieprawidłowy identyfikator wpisu.</Text>
    <VaultlyButton label="Wróć do sejfu" variant="secondary" onPress={() => router.replace('/(tabs)/vault')} />
  </Screen>;
  if (loading) return <Screen contentStyle={{ justifyContent: 'center' }}><Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Wczytywanie wpisu…</Text></Screen>;
  if (!entry) return <Screen contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
    <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger, textAlign: 'center' }]}>{loadError ?? 'Nie udało się wczytać wpisu.'}</Text>
    <VaultlyButton label="Wróć do sejfu" variant="secondary" onPress={() => router.replace('/(tabs)/vault')} />
  </Screen>;
  return <Screen scroll contentStyle={{ gap: spacing.lg }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <VaultlyButton label="Wróć" variant="ghost" onPress={() => router.back()} />
      <VaultlyButton label="Edytuj" variant="secondary" onPress={() => router.push(`/entry/${entry.id}/edit` as Href)} />
    </View>
    <Text style={[typography.title, { color: colors.textPrimary }]}>{entry.name}</Text>
    {loadError ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{loadError}</Text> : null}
    <EntryField label="Nazwa wpisu" value={entry.name} />
    <EntryField label="Nazwa użytkownika lub e-mail" value={entry.username || 'Nie podano'} selectable />
    <Card>
      <Text style={[typography.caption, { color: colors.textSecondary }]}>Hasło</Text>
      <Text selectable={visible} style={[typography.body, { color: colors.textPrimary, marginTop: spacing.sm }]}>{visible ? entry.password : '••••••••••••'}</Text>
      <View style={{ flexDirection: 'row', gap: spacing.sm, marginTop: spacing.sm }}>
        <VaultlyButton label={visible ? 'Ukryj' : 'Pokaż'} variant="ghost" onPress={() => setVisible((value) => !value)} />
        <VaultlyButton label="Kopiuj" loading={copying} variant="secondary" onPress={copyPassword} />
      </View>
    </Card>
    <EntryField label="Adres strony (URL)" value={entry.url || 'Nie podano'} selectable={Boolean(entry.url)} />
    <EntryField label="Notatki" value={entry.notes || 'Nie podano'} />
    <EntryField label="Wpis ulubiony" value={entry.favorite ? 'Tak' : 'Nie'} />
    <EntryField label="Data utworzenia" value={new Date(entry.createdAt).toLocaleString('pl-PL')} />
    <EntryField label="Ostatnia zmiana" value={new Date(entry.updatedAt).toLocaleString('pl-PL')} />
    <VaultlyButton label="Usuń wpis" variant="secondary" onPress={remove} />
  </Screen>;
}
