import { Redirect, Stack } from 'expo-router';
import { useAuthStore } from '@/store/authStore';

export default function EntryLayout() {
  const status = useAuthStore((state) => state.status);
  if (status !== 'UNLOCKED') return <Redirect href="/unlock" />;
  return <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }} />;
}
