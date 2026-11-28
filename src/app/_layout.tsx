import { Stack } from 'expo-router';
import { SQLiteProvider } from 'expo-sqlite';
import { StatusBar } from 'expo-status-bar';
import { DATABASE_NAME } from '@/database/schema';
import { initializeDatabaseCipher } from '@/services/container';
import { ThemeProvider } from '@/theme/theme';
import { useSettingsStore } from '@/store/settingsStore';
import { AutoLockController } from '@/security/AutoLockController';

export default function RootLayout() {
  const preference = useSettingsStore((state) => state.theme);
  return <ThemeProvider preference={preference}>
    <SQLiteProvider databaseName={DATABASE_NAME} onInit={initializeDatabaseCipher}>
      <StatusBar style="auto" />
      <AutoLockController />
      <Stack screenOptions={{ headerShown: false, animation: 'fade' }} />
    </SQLiteProvider>
  </ThemeProvider>;
}
