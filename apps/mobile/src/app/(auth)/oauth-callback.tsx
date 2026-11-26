import React, { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, Text, TouchableOpacity, View } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { AlertCircle, CheckCircle2 } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  connectNotificationsSocket,
  connectPresenceSocket,
  getStorage,
  mobileApi,
  updateSocketAuth,
  useSharedAuthStore,
} from '@repo/shared-hooks';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage, translateApiErrorCode } from '@/utils/apiError';
import {
  clearPendingGoogleOAuthAttempt,
  consumePendingGoogleOAuthAttempt,
} from '@/utils/oauthPkce';
import { Skeleton } from '@/components/ui/Skeleton';

export default function OAuthCallbackScreen() {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ ticket?: string; error?: string }>();
  const handledKeyRef = useRef<string | null>(null);

  const [status, setStatus] = useState<'exchanging' | 'success' | 'error'>('exchanging');
  const [errorText, setErrorText] = useState<string | null>(null);

  const ticket = typeof params.ticket === 'string' ? params.ticket.trim() : '';
  const oauthError = typeof params.error === 'string' ? params.error.trim() : '';

  useEffect(() => {
    const executionKey = oauthError ? `error:${oauthError}` : ticket ? `ticket:${ticket}` : 'missing';
    if (handledKeyRef.current === executionKey) {
      return;
    }
    handledKeyRef.current = executionKey;

    if (oauthError) {
      void clearPendingGoogleOAuthAttempt();
      setStatus('error');
      const localized = translateApiErrorCode(oauthError, undefined, t);
      if (localized) {
        setErrorText(localized);
      } else if (oauthError === 'local_account_exists') {
        setErrorText(t('mobile.oauth_local_account_exists'));
      } else if (oauthError === 'account_ineligible') {
        setErrorText(t('mobile.oauth_account_ineligible'));
      } else {
        setErrorText(t('mobile.oauth_failed'));
      }
      return;
    }

    if (!ticket) {
      void clearPendingGoogleOAuthAttempt();
      setStatus('error');
      setErrorText(t('mobile.oauth_missing_ticket'));
      return;
    }

    let cancelled = false;

    const completeLogin = async () => {
      setStatus('exchanging');
      setErrorText(null);

      try {
        const pendingAttempt = await consumePendingGoogleOAuthAttempt();
        if (cancelled) return;

        if (!pendingAttempt) {
          setStatus('error');
          setErrorText(t('mobile.oauth_session_expired'));
          return;
        }

        const res = await mobileApi.authExchangeGoogleOAuthTicket({
          attemptId: pendingAttempt.attemptId,
          ticket,
          verifier: pendingAttempt.verifier,
        });
        if (cancelled) return;

        if (res.user.role === 'admin') {
          throw new Error(t('mobile.oauth_admin_blocked'));
        }

        await getStorage().setItem('accessToken', res.accessToken);
        await getStorage().setItem('refreshToken', res.refreshToken);

        useSharedAuthStore.getState().setUser(
          {
            id: res.user.id,
            email: res.user.email ?? '',
            emailVerified: res.user.emailVerified,
            name: res.user.fullName,
            role: res.user.role,
            avatar: res.user.avatarUrl,
          },
          res.accessToken,
          res.refreshToken,
        );
        updateSocketAuth(res.accessToken);
        void connectNotificationsSocket(res.accessToken);
        void connectPresenceSocket(res.accessToken);

        setStatus('success');
        Toast.show({
          type: 'success',
          text1: t('mobile.welcome_back'),
          text2: t('mobile.oauth_success'),
        });

        router.replace(res.user.role === 'doctor' ? '/(doctor)' : '/(patient)');
      } catch (err) {
        await clearPendingGoogleOAuthAttempt();
        if (cancelled) return;
        const msg = extractApiErrorMessage(err, 'mobile.oauth_failed');
        setStatus('error');
        setErrorText(msg);
      }
    };

    void completeLogin();

    return () => {
      cancelled = true;
    };
  }, [oauthError, ticket, router, t]);

  return (
    <View style={tw('flex-1 bg-white dark:bg-slate-950 items-center justify-center px-6')}>
      <View
        style={tw(
          'w-full max-w-sm bg-slate-50 dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 items-center',
        )}
      >
        {status === 'exchanging' ? (
          <>
            <ActivityIndicator size="large" color={isDark ? '#34d399' : '#10b981'} />
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mt-4 text-center')}>
              {t('mobile.oauth_exchanging_title')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-2 text-center')}>
              {t('mobile.oauth_exchanging_desc')}
            </Text>
            <View style={tw('w-full gap-2 mt-6')}>
              <Skeleton className="h-3 w-full rounded-full" />
              <Skeleton className="h-3 w-3/4 rounded-full self-center" />
            </View>
          </>
        ) : status === 'success' ? (
          <>
            <CheckCircle2 color="#10b981" size={44} />
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mt-4 text-center')}>
              {t('mobile.oauth_success')}
            </Text>
          </>
        ) : (
          <>
            <AlertCircle color="#ef4444" size={44} />
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mt-4 text-center')}>
              {t('mobile.oauth_failed_title')}
            </Text>
            <Text style={tw('text-xs text-rose-600 dark:text-rose-400 mt-2 text-center leading-4')}>
              {errorText || t('mobile.oauth_failed')}
            </Text>
            <TouchableOpacity
              style={tw(
                'w-full h-12 bg-emerald-500 rounded-2xl items-center justify-center mt-6',
              )}
              onPress={() => router.replace('/(auth)/login')}
            >
              <Text style={tw('text-white font-semibold text-sm')}>
                {t('mobile.back_to_login')}
              </Text>
            </TouchableOpacity>
          </>
        )}
      </View>
    </View>
  );
}
