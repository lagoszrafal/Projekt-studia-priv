import { useState } from 'react';
import { Text, View } from 'react-native';
import { router } from 'expo-router';
import { useSQLiteContext } from 'expo-sqlite';
import { CredentialForm, type CredentialDraft } from '@/components/vault/CredentialForm';
import { Screen, VaultlyButton } from '@/components/ui';
import { createVaultService } from '@/services/container';
import { useVaultStore } from '@/store/vaultStore';
import { useTheme } from '@/theme/theme';

export default function NewEntryScreen() {
  const db = useSQLiteContext();
  const { colors, spacing, typography } = useTheme();
  const addEntry = useVaultStore((state) => state.addEntry);
  const [draft, setDraft] = useState<CredentialDraft>({
    name: '', username: '', password: '', url: '', notes: '', favorite: false,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const save = async () => {
    if (!draft.name.trim() || !draft.password) { setError('Nazwa i hasło są wymagane.'); return; }
    setLoading(true); setError(null);
    try {
      const entry = await createVaultService(db).create({
        name: draft.name.trim(), username: draft.username.trim(), password: draft.password,
        url: draft.url.trim() || undefined, notes: draft.notes.trim() || undefined, favorite: draft.favorite,
      });
      addEntry(entry);
      setDraft((value) => ({ ...value, password: '' }));
      router.back();
    } catch { setError('Nie udało się bezpiecznie zapisać wpisu.'); }
    finally { setLoading(false); }
  };

  return <Screen scroll contentStyle={{ gap: spacing.lg }}>
    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}><VaultlyButton label="Wróć" variant="ghost" onPress={() => router.back()} /><Text style={[typography.heading, { color: colors.textPrimary }]}>Nowy login</Text><View style={{ width: 64 }} /></View>
    <CredentialForm value={draft} onChange={setDraft} autoFocusName />
    {error ? <Text accessibilityRole="alert" style={[typography.caption, { color: colors.danger }]}>{error}</Text> : null}
    <VaultlyButton label="Zapisz" loading={loading} onPress={save} />
  </Screen>;
}
