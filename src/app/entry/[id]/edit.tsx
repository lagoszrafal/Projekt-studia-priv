import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CredentialForm, type CredentialDraft } from '@/components/vault/CredentialForm';
import { Screen, VaultlyButton } from '@/components/ui';
import { createVaultService } from '@/services/container';
import { useVaultStore } from '@/store/vaultStore';
import { useTheme } from '@/theme/theme';
import type { VaultEntry } from '@/types/VaultEntry';

const toDraft = (entry: VaultEntry): CredentialDraft => ({
  name: entry.name,
  username: entry.username,
  password: entry.password,
  url: entry.url ?? '',
  notes: entry.notes ?? '',
  favorite: entry.favorite,
});

export default function EditEntryScreen() {
  const params = useLocalSearchParams<{ id: string | string[] }>();
  const id = Array.isArray(params.id) ? params.id[0] : params.id;
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();
  const cachedEntry = useVaultStore((state) => state.entries.find((item) => item.id === id));
  const updateEntry = useVaultStore((state) => state.updateEntry);
  const [entry, setEntry] = useState<VaultEntry | null>(cachedEntry ?? null);
  const [draft, setDraft] = useState<CredentialDraft | null>(cachedEntry ? toDraft(cachedEntry) : null);
  const [hasInitialEntry] = useState(() => Boolean(cachedEntry));
  const [loading, setLoading] = useState(!cachedEntry);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || hasInitialEntry) return;
    let active = true;
    createVaultService(db).getById(id)
      .then((loadedEntry) => {
        if (!active) return;
        if (!loadedEntry) {
          setError('Nie znaleziono wpisu.');
          return;
        }
        setEntry(loadedEntry);
        setDraft(toDraft(loadedEntry));
      })
      .catch(() => { if (active) setError('Nie udało się odszyfrować wpisu.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [db, hasInitialEntry, id]);

  const save = async () => {
    if (!entry || !draft) return;
    if (!draft.name.trim() || !draft.password) {
      setError('Nazwa i hasło są wymagane.');
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const updated = await createVaultService(db).update({
        ...entry,
        name: draft.name.trim(),
        username: draft.username.trim(),
        password: draft.password,
        url: draft.url.trim() || undefined,
        notes: draft.notes.trim() || undefined,
        favorite: draft.favorite,
      });
      updateEntry(updated);
      setDraft((value) => value ? { ...value, password: '' } : value);
      router.back();
    } catch {
      setError('Nie udało się bezpiecznie zapisać zmian.');
    } finally {
      setSaving(false);
    }
  };

  if (!id) return <Screen contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
    <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger, textAlign: 'center' }]}>Nieprawidłowy identyfikator wpisu.</Text>
    <VaultlyButton label="Wróć do sejfu" variant="secondary" onPress={() => router.replace('/(tabs)/vault')} />
  </Screen>;

  if (loading) return <Screen contentStyle={{ justifyContent: 'center' }}>
    <Text style={[typography.body, { color: colors.textSecondary, textAlign: 'center' }]}>Wczytywanie wpisu…</Text>
  </Screen>;

  if (!entry || !draft) return <Screen contentStyle={{ justifyContent: 'center', gap: spacing.lg }}>
    <Text accessibilityRole="alert" style={[typography.body, { color: colors.danger, textAlign: 'center' }]}>{error ?? 'Nie udało się wczytać wpisu.'}</Text>
    <VaultlyButton label="Wróć" variant="secondary" onPress={() => router.back()} />
  </Screen>;

  return <Screen scroll contentStyle={{ gap: spacing.lg }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
      <VaultlyButton label="Anuluj" variant="ghost" onPress={() => router.back()} />
      <Text style={[typography.heading, { color: colors.textPrimary }]}>Edytuj wpis</Text>
      <View style={{ width: 76 }} />
    </View>
    <CredentialForm value={draft} onChange={setDraft} />
    {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    <VaultlyButton label="Zapisz zmiany" loading={saving} onPress={save} />
  </Screen>;
}
