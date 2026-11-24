import { useCallback, useState } from 'react';
import { router, useFocusEffect } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { ScrollView, Text, View } from 'react-native';
import { BrandMark, EmptyState, Screen, VaultlyButton, VaultlyInput } from '@/components/ui';
import { CredentialRow } from '@/components/vault/CredentialRow';
import { createVaultService } from '@/services/container';
import { useVaultStore } from '@/store/vaultStore';
import { useTheme } from '@/theme/theme';

export default function VaultScreen() {
  const db = useSQLiteContext();
  const entries = useVaultStore((state) => state.entries);
  const setEntries = useVaultStore((state) => state.setEntries);
  const [query, setQuery] = useState('');
  const [error, setError] = useState<string | null>(null);
  const { colors, spacing, typography } = useTheme();
  useFocusEffect(useCallback(() => {
    let active = true;
    createVaultService(db).getAll().then((items) => { if (active) { setEntries(items); setError(null); } }).catch(() => { if (active) setError('Nie udało się odczytać sejfu.'); });
    return () => { active = false; };
  }, [db, setEntries]));
  const normalized = query.trim().toLocaleLowerCase('pl-PL');
  const filtered = entries.filter((entry) => !normalized || [entry.name, entry.username, entry.url ?? ''].some((value) => value.toLocaleLowerCase('pl-PL').includes(normalized)));
  return <Screen contentStyle={{ gap: spacing.lg }}>
    <BrandMark />
    <View><Text style={[typography.title, { color: colors.textPrimary }]}>Twój sejf</Text><Text style={[typography.body, { color: colors.textSecondary }]}>{entries.length} {entries.length === 1 ? 'wpis' : 'wpisów'}</Text></View>
    <VaultlyInput label="Wyszukiwanie" placeholder="Przeszukaj sejf" value={query} onChangeText={setQuery} />
    {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    <ScrollView contentContainerStyle={{ gap: spacing.sm, flexGrow: 1 }} keyboardShouldPersistTaps="handled">
      {filtered.length ? filtered.map((entry) => <CredentialRow key={entry.id} entry={entry} onPress={() => router.push({ pathname: '/entry/[id]', params: { id: entry.id } })} />) : <View style={{ flex: 1, justifyContent: 'center' }}><EmptyState title={entries.length ? 'Brak wyników' : 'Sejf czeka na pierwszy wpis'} description={entries.length ? 'Spróbuj innej nazwy lub adresu.' : 'Dodaj dane logowania. Zostaną zaszyfrowane przed zapisem w SQLite.'} /></View>}
    </ScrollView>
    <View style={{ flexDirection: 'row', gap: spacing.sm }}>
      <VaultlyButton label="Generator haseł" variant="secondary" onPress={() => router.push('/(tabs)/generator')} style={{ flex: 1 }} />
      <VaultlyButton label="Dodaj wpis" onPress={() => router.push('/entry/new')} style={{ flex: 1 }} />
    </View>
  </Screen>;
}
