import { useFonts } from 'expo-font';
import { Stack, ThemeProvider as NavigationThemeProvider, DarkTheme, DefaultTheme, useRouter } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import { useTranslation } from 'react-i18next';
import "../global.css";
import '../i18n';
import { useDeviceContext } from 'twrnc';
import { twInstance } from '@/tw';
import { ThemeProvider as AppThemeProvider, useThemeContext } from '@/context/ThemeContext';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  API_BASE_URL,
  SOCKET_EVENTS,
  connectNotificationsSocket,
  connectPresenceSocket,
  notificationsSocket,
  presenceSocket,
  setStorageProvider,
  useSharedAuthStore,
} from '@repo/shared-hooks';
import { setApiBaseUrl, setTokenGetter } from '@healthcare/api-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';

setStorageProvider(AsyncStorage);
setTokenGetter(() => AsyncStorage.getItem('accessToken'));
setApiBaseUrl(API_BASE_URL);

// Prevent the splash screen from auto-hiding before asset loading is complete.
SplashScreen.preventAutoHideAsync();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

const CustomDarkTheme = {
  ...DarkTheme,
  colors: {
    ...DarkTheme.colors,
    card: '#0f172a',
    border: '#1e293b',
  },
};

const CustomDefaultTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    card: '#ffffff',
    border: '#f1f5f9',
  },
};

function RootNavigator() {
  const { isDark } = useThemeContext();
  const { t } = useTranslation();
  const router = useRouter();
  const token = useSharedAuthStore((s) => s.token);
  const isAuthenticated = useSharedAuthStore((s) => s.isAuthenticated);
  const logout = useSharedAuthStore((s) => s.logout);

  useEffect(() => {
    if (isAuthenticated && token) {
      void connectNotificationsSocket(token);
      void connectPresenceSocket(token);
    } else {
      if (notificationsSocket.connected) notificationsSocket.disconnect();
      if (presenceSocket.connected) presenceSocket.disconnect();
    }
  }, [isAuthenticated, token]);

  useEffect(() => {
    const handleAccountBanned = (payload?: { reason?: string }) => {
      void Promise.all([
        AsyncStorage.removeItem('accessToken'),
        AsyncStorage.removeItem('refreshToken'),
      ]);
      logout();
      Toast.show({
        type: 'error',
        text1: t('mobile.account_banned', 'Account Suspended'),
        text2:
          payload?.reason ||
          t('mobile.account_banned_desc', 'Your account has been suspended by an administrator.'),
      });
      router.replace('/(auth)/login');
    };

    notificationsSocket.on(
      SOCKET_EVENTS.notifications.server.accountBanned,
      handleAccountBanned,
    );
    return () => {
      notificationsSocket.off(
        SOCKET_EVENTS.notifications.server.accountBanned,
        handleAccountBanned,
      );
    };
  }, [logout, router, t]);

  return (
    <NavigationThemeProvider value={isDark ? CustomDarkTheme : CustomDefaultTheme}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" options={{ headerShown: false }} />
        <Stack.Screen name="(patient)" options={{ headerShown: false }} />
        <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style={isDark ? 'light' : 'dark'} />
    </NavigationThemeProvider>
  );
}

export default function RootLayout() {
  useDeviceContext(twInstance);
  const [loaded] = useFonts({
    // We can add custom fonts here later if needed
  });

  useEffect(() => {
    if (loaded) {
      SplashScreen.hideAsync();
    }
  }, [loaded]);

  if (!loaded) {
    return null;
  }

  return (
    <SafeAreaProvider>
      <QueryClientProvider client={queryClient}>
        <AppThemeProvider>
          <RootNavigator />
          <Toast />
        </AppThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
