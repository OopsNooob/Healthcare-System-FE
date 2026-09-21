import { useFonts } from 'expo-font';
import { Stack, ThemeProvider, DarkTheme, DefaultTheme } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Toast from 'react-native-toast-message';
import "../global.css";
import '../i18n';
import { useDeviceContext, useAppColorScheme } from 'twrnc';
import { twInstance } from '@/tw';
import { ThemeContext } from '@/context/ThemeContext';

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

export default function RootLayout() {
  useDeviceContext(twInstance);
  const [colorScheme] = useAppColorScheme(twInstance);
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

  const activeScheme = (colorScheme ?? 'light') as 'light' | 'dark';

  return (
    <QueryClientProvider client={queryClient}>
      <ThemeContext.Provider value={{ colorScheme: activeScheme }}>
        <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="(auth)" options={{ headerShown: false }} />
            <Stack.Screen name="(patient)" options={{ headerShown: false }} />
            <Stack.Screen name="(doctor)" options={{ headerShown: false }} />
            <Stack.Screen name="+not-found" />
          </Stack>
          <StatusBar style="auto" />
        </ThemeProvider>
      </ThemeContext.Provider>
      <Toast />
    </QueryClientProvider>
  );
}
