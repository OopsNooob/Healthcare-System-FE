import { Redirect } from 'expo-router';
import {
  connectNotificationsSocket,
  connectPresenceSocket,
  getStorage,
  mobileApi,
  useSharedAuthStore as useAuthStore,
} from '@repo/shared-hooks';
import { useEffect, useState } from 'react';
import { View } from 'react-native';
import { tw } from '../tw';
import { Skeleton } from '@/components/ui/Skeleton';

export default function Index() {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const user = useAuthStore((state) => state.user);
  const setUser = useAuthStore((state) => state.setUser);
  const logout = useAuthStore((state) => state.logout);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      try {
        const storage = getStorage();
        const storedToken = await storage.getItem('accessToken');
        const storedRefresh = await storage.getItem('refreshToken');
        const currentUser = useAuthStore.getState().user;

        if (!storedToken) {
          if (storedRefresh) {
            await storage.removeItem('refreshToken');
          }
          if (currentUser || useAuthStore.getState().isAuthenticated) {
            logout();
          }
        } else if (!currentUser) {
          const profile = await mobileApi.authGetProfile();
          const profileRecord = profile as unknown as {
            id?: string;
            _id?: string;
            email?: string;
            fullName?: string;
            role?: string;
            avatarUrl?: string;
          };
          if (profileRecord && (profileRecord.id || profileRecord._id)) {
            const hydratedUser = {
              id: String(profileRecord.id ?? profileRecord._id),
              email: profileRecord.email ?? '',
              name: profileRecord.fullName ?? '',
              role: profileRecord.role ?? 'patient',
              avatar: profileRecord.avatarUrl,
            };
            setUser(hydratedUser, storedToken, storedRefresh ?? '');
            void connectNotificationsSocket(storedToken);
            void connectPresenceSocket(storedToken);
          } else {
            await storage.removeItem('accessToken');
            await storage.removeItem('refreshToken');
            logout();
          }
        } else if (useAuthStore.getState().token !== storedToken) {
          setUser(currentUser, storedToken, storedRefresh ?? '');
        }
      } catch {
        const storage = getStorage();
        await storage.removeItem('accessToken');
        await storage.removeItem('refreshToken');
        logout();
      } finally {
        if (active) {
          setIsReady(true);
        }
      }
    };

    const persistApi = (
      useAuthStore as typeof useAuthStore & {
        persist?: {
          hasHydrated?: () => boolean;
          onFinishHydration?: (cb: () => void) => () => void;
        };
      }
    ).persist;

    if (persistApi?.hasHydrated?.()) {
      void bootstrapSession();
      return () => {
        active = false;
      };
    }

    const unsubscribe = persistApi?.onFinishHydration?.(() => {
      void bootstrapSession();
    });

    const fallbackTimer = setTimeout(() => {
      void bootstrapSession();
    }, 350);

    return () => {
      active = false;
      clearTimeout(fallbackTimer);
      unsubscribe?.();
    };
  }, [logout, setUser]);

  if (!isReady) {
    return (
      <View style={tw('flex-1 justify-center px-6 bg-slate-50 dark:bg-slate-950 gap-4')}>
        <Skeleton className="h-10 w-44 self-center rounded-2xl mb-4" />
        <Skeleton className="h-28 w-full rounded-3xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
        <Skeleton className="h-20 w-full rounded-2xl" />
      </View>
    );
  }

  if (!isAuthenticated || !user) {
    return <Redirect href="/(auth)/login" />;
  }

  if (user.role === 'doctor') {
    return <Redirect href="/(doctor)" />;
  }

  return <Redirect href="/(patient)" />;
}
