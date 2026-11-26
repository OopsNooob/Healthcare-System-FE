import { useFonts } from 'expo-font';
import * as Linking from 'expo-linking';
import {
  Stack,
  ThemeProvider as NavigationThemeProvider,
  DarkTheme,
  DefaultTheme,
  usePathname,
  useRouter,
} from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useCallback, useEffect, useRef, useState } from 'react';
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
  SOCKET_EVENTS,
  connectNotificationsSocket,
  connectPresenceSocket,
  disconnectAllSockets,
  notificationsSocket,
  onSessionExpired,
  presenceSocket,
  setApiBaseUrl as setSharedHooksApiBaseUrl,
  setStorageProvider,
  useSharedAuthStore,
} from '@repo/shared-hooks';
import { setApiBaseUrl as setClientApiBaseUrl, setTokenGetter } from '@healthcare/api-client';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { SessionExpiredModal } from '@/components/modals';
import { AppToast } from '@/components/ui/AppToast';
import { resolveMobileApiBaseUrl } from '@/utils/apiUrl';

const resolvedApiBaseUrl = resolveMobileApiBaseUrl();

setStorageProvider(AsyncStorage);
setTokenGetter(() => AsyncStorage.getItem('accessToken'));
setSharedHooksApiBaseUrl(resolvedApiBaseUrl);
setClientApiBaseUrl(resolvedApiBaseUrl);

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

const PUBLIC_AUTH_PATHS = new Set([
  '/',
  '/login',
  '/register',
  '/verify-email',
  '/oauth-callback',
  '/oauth/callback',
  '/forgot-password',
  '/confirm-otp',
]);

function isPublicAuthPath(path: string | null | undefined): boolean {
  if (!path) return true;
  const normalized = path.replace(/^\/\(auth\)(?=\/|$)/, '').replace(/\/+$/, '') || '/';
  return PUBLIC_AUTH_PATHS.has(normalized);
}

function RootNavigator() {
  const { isDark } = useThemeContext();
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const pathnameRef = useRef(pathname);
  const incomingUrl = Linking.useURL();
  const handledDeepLinkRef = useRef<string | null>(null);
  const [sessionExpiredVisible, setSessionExpiredVisible] = useState(false);
  const token = useSharedAuthStore((s) => s.token);
  const user = useSharedAuthStore((s) => s.user);
  const isAuthenticated = useSharedAuthStore((s) => s.isAuthenticated);
  const logout = useSharedAuthStore((s) => s.logout);

  useEffect(() => {
    pathnameRef.current = pathname;
    if (isPublicAuthPath(pathname)) {
      setSessionExpiredVisible(false);
    }
  }, [pathname]);

  useEffect(() => {
    return onSessionExpired(() => {
      if (!isPublicAuthPath(pathnameRef.current)) {
        setSessionExpiredVisible(true);
      }
    });
  }, []);

  const handleSessionExpiredConfirm = useCallback(async () => {
    setSessionExpiredVisible(false);
    disconnectAllSockets();
    queryClient.clear();
    logout();
    await Promise.all([
      AsyncStorage.removeItem('accessToken'),
      AsyncStorage.removeItem('refreshToken'),
    ]).catch(() => {});
    router.replace('/(auth)/login');
  }, [logout, router]);

  useEffect(() => {
    if (!incomingUrl || handledDeepLinkRef.current === incomingUrl) return;
    const parsed = Linking.parse(incomingUrl);
    const normalizedHost = (parsed.hostname || '').replace(/^\/+/, '').toLowerCase();
    const normalizedPath = (parsed.path || '').replace(/^\/+/, '').toLowerCase();
    const routeTarget = normalizedPath || normalizedHost;

    const isOAuthCallback =
      (normalizedHost === 'oauth' && normalizedPath === 'callback') ||
      routeTarget === 'oauth/callback' ||
      routeTarget === 'oauth-callback';

    if (isOAuthCallback) {
      handledDeepLinkRef.current = incomingUrl;
      if (pathname !== '/oauth-callback' && pathname !== '/oauth/callback') {
        const ticket = typeof parsed.queryParams?.ticket === 'string' ? parsed.queryParams.ticket.trim() : '';
        const error = typeof parsed.queryParams?.error === 'string' ? parsed.queryParams.error.trim() : '';
        router.replace({
          pathname: '/(auth)/oauth-callback',
          params: {
            ...(ticket ? { ticket } : {}),
            ...(error ? { error } : {}),
          },
        });
      }
      return;
    }

    const isFamilyRedeem =
      (normalizedHost === 'family-links' && normalizedPath.startsWith('redeem')) ||
      routeTarget === 'family-links/redeem' ||
      routeTarget.startsWith('family-links/redeem');

    if (isFamilyRedeem && isAuthenticated && user?.role === 'patient') {
      handledDeepLinkRef.current = incomingUrl;
      const inviteToken =
        typeof parsed.queryParams?.token === 'string' ? parsed.queryParams.token.trim() : '';
      const inviteCode =
        typeof parsed.queryParams?.code === 'string'
          ? parsed.queryParams.code.trim()
          : typeof parsed.queryParams?.shortCode === 'string'
            ? parsed.queryParams.shortCode.trim()
            : '';
      router.replace({
        pathname: '/(patient)/family',
        params: {
          ...(inviteToken ? { inviteToken } : {}),
          ...(inviteCode ? { inviteCode } : {}),
        },
      });
      return;
    }

    if (
      (routeTarget === 'premium' || Boolean(parsed.queryParams?.vnpay)) &&
      isAuthenticated &&
      user?.role === 'patient'
    ) {
      handledDeepLinkRef.current = incomingUrl;
      if (pathname !== '/premium') {
        router.replace({
          pathname: '/(patient)/premium',
          params: { vnpay: 'return' },
        });
      }
    }
  }, [incomingUrl, isAuthenticated, user?.role, pathname, router]);

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
      setSessionExpiredVisible(false);
      disconnectAllSockets();
      queryClient.clear();
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
      <SessionExpiredModal
        visible={sessionExpiredVisible}
        onConfirm={() => void handleSessionExpiredConfirm()}
      />
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
          <AppToast />
        </AppThemeProvider>
      </QueryClientProvider>
    </SafeAreaProvider>
  );
}
