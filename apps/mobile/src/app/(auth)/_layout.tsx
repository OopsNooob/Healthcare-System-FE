import { Stack } from 'expo-router';
import { useThemeContext } from '@/context/ThemeContext';

export default function AuthLayout() {
  const { isDark } = useThemeContext();

  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: isDark ? '#020617' : '#f8fafc' },
      }}
    >
      <Stack.Screen name="login" />
      <Stack.Screen name="register" />
      <Stack.Screen name="verify-email" />
      <Stack.Screen name="oauth-callback" />
      <Stack.Screen name="forgot-password" />
      <Stack.Screen name="confirm-otp" />
      <Stack.Screen name="change-password" />
    </Stack>
  );
}
