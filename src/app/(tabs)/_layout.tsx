import { Redirect, Tabs } from 'expo-router';
import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
import { useAuthStore } from '@/store/authStore';
import { useTheme } from '@/theme/theme';

export default function TabsLayout() {
  const status = useAuthStore((state) => state.status);
  const { colors } = useTheme();
  if (status !== 'UNLOCKED') return <Redirect href="/unlock" />;
  return <Tabs screenOptions={{
    headerShown: false,
    tabBarActiveTintColor: colors.accent,
    tabBarInactiveTintColor: colors.textSecondary,
    tabBarStyle: { backgroundColor: colors.surface, borderTopColor: colors.border },
    tabBarLabelStyle: { fontWeight: '600' },
  }}>
    <Tabs.Screen name="vault" options={{ title: 'Sejf', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="shield-lock-outline" color={color} size={size} /> }} />
    <Tabs.Screen name="generator" options={{ title: 'Generator', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="key-variant" color={color} size={size} /> }} />
    <Tabs.Screen name="settings" options={{ title: 'Ustawienia', tabBarIcon: ({ color, size }) => <MaterialCommunityIcons name="cog-outline" color={color} size={size} /> }} />
  </Tabs>;
}
