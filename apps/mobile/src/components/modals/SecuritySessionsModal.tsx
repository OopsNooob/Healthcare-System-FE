import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  X,
  Shield,
  Smartphone,
  KeyRound,
  CheckCircle2,
  RefreshCw,
  LogOut,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { useRouter } from 'expo-router';
import {
  getStorage,
  mobileApi,
  updateSocketAuth,
  useLogout,
  useSharedAuthStore,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

interface SecuritySessionsModalProps {
  visible: boolean;
  onClose: () => void;
  onNavigateChangePassword?: () => void;
}

export const SecuritySessionsModal: React.FC<SecuritySessionsModalProps> = ({
  visible,
  onClose,
  onNavigateChangePassword,
}) => {
  const { t } = useTranslation();
  const router = useRouter();
  const user = useSharedAuthStore((s) => s.user);
  const setUser = useSharedAuthStore((s) => s.setUser);
  const refreshToken = useSharedAuthStore((s) => s.refreshToken);
  const { logout } = useLogout();

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string>('active');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [verifiedEmail, setVerifiedEmail] = useState<string>(user?.email || '');

  const fetchSessionInfo = useCallback(async () => {
    setIsLoadingProfile(true);
    try {
      const me = await mobileApi.authGetProfile();
      setAccountStatus(me.accountStatus ?? 'active');
      setIsOnline(Boolean(me.isOnline));
      setVerifiedEmail(me.email || user?.email || '');
    } catch {
      // Keep cached user display if transient error
    } finally {
      setIsLoadingProfile(false);
    }
  }, [user?.email]);

  useEffect(() => {
    if (visible) {
      void fetchSessionInfo();
    }
  }, [visible, fetchSessionInfo]);

  const handleRefreshSession = async () => {
    if (isRefreshingToken || !user?.id) return;
    setIsRefreshingToken(true);
    try {
      const storage = getStorage();
      const storedRefresh = refreshToken || (await storage.getItem('refreshToken'));
      if (!storedRefresh) {
        Toast.show({
          type: 'error',
          text1: t('mobile.error', 'Error'),
          text2: t('mobile.no_refresh_token', 'No active refresh token found. Please sign in again.'),
        });
        return;
      }

      const refreshed = await mobileApi.authRefresh({
        userId: user.id,
        refreshToken: storedRefresh,
      });

      await storage.setItem('accessToken', refreshed.accessToken);
      await storage.setItem('refreshToken', refreshed.refreshToken);
      setUser(
        {
          id: refreshed.user.id,
          email: refreshed.user.email ?? user.email,
          name: refreshed.user.fullName,
          role: refreshed.user.role,
          avatar: refreshed.user.avatarUrl,
        },
        refreshed.accessToken,
        refreshed.refreshToken,
      );
      updateSocketAuth(refreshed.accessToken);
      Toast.show({
        type: 'success',
        text1: t('mobile.session_refreshed', 'Session Refreshed'),
        text2: t('mobile.session_refreshed_desc', 'Your security token has been rotated.'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setIsRefreshingToken(false);
    }
  };

  const handleLogoutCurrent = async () => {
    if (isLoggingOut) return;
    setIsLoggingOut(true);
    try {
      await logout();
      onClose();
      router.replace('/(auth)/login');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setIsLoggingOut(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3')}>
                <Shield color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.security_sessions_title', 'Security & Session')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.security_sessions_subtitle', 'Manage your password and active authentication token')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {onNavigateChangePassword && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateChangePassword();
                }}
                style={tw('p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 flex-row items-center justify-between')}
              >
                <View style={tw('flex-row items-center flex-1 mr-3')}>
                  <View style={tw('w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mr-3')}>
                    <KeyRound color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                      {t('mobile.change_password', 'Reset / Change Password')}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                      {t('mobile.change_password_desc', 'Verify OTP via email to set a new password')}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
              {t('mobile.current_session', 'Current Device Session')}
            </Text>

            {isLoadingProfile ? (
              <Skeleton className="h-24 w-full rounded-2xl" />
            ) : (
              <View style={tw('p-4 rounded-2xl border bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/50 gap-3')}>
                <View style={tw('flex-row items-center justify-between')}>
                  <View style={tw('flex-row items-center flex-1 mr-2')}>
                    <View style={tw('w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center mr-3')}>
                      <Smartphone color={twInstance.color('text-slate-700 dark:text-slate-300')} size={20} />
                    </View>
                    <View style={tw('flex-1')}>
                      <View style={tw('flex-row items-center flex-wrap gap-1.5')}>
                        <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                          {Platform.OS === 'ios' ? 'iOS Mobile App' : 'Android Mobile App'}
                        </Text>
                        <View style={tw('bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full flex-row items-center')}>
                          <CheckCircle2 color="#10b981" size={11} />
                          <Text style={tw('text-[10px] font-bold text-emerald-700 dark:text-emerald-300 ml-1')}>
                            {t('mobile.current_device', 'Active')}
                          </Text>
                        </View>
                      </View>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                        {verifiedEmail || user?.name || 'Authenticated User'}
                      </Text>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-0.5')}>
                        {t('mobile.status', 'Status')}: {accountStatus} •{' '}
                        {isOnline ? t('mobile.online', 'Online') : t('mobile.offline', 'Offline')}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={tw('flex-row gap-2.5')}>
                  <TouchableOpacity
                    onPress={handleRefreshSession}
                    disabled={isRefreshingToken}
                    style={tw('flex-1 bg-white dark:bg-slate-800 border border-emerald-300 dark:border-emerald-800 py-2.5 rounded-xl flex-row items-center justify-center')}
                  >
                    {isRefreshingToken ? (
                      <ActivityIndicator size="small" color="#10b981" />
                    ) : (
                      <>
                        <RefreshCw color="#10b981" size={14} style={tw('mr-1.5')} />
                        <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                          {t('mobile.refresh_token', 'Refresh Session')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleLogoutCurrent}
                    disabled={isLoggingOut}
                    style={tw('flex-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 py-2.5 rounded-xl flex-row items-center justify-center')}
                  >
                    {isLoggingOut ? (
                      <ActivityIndicator size="small" color="#ef4444" />
                    ) : (
                      <>
                        <LogOut color="#ef4444" size={14} style={tw('mr-1.5')} />
                        <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400')}>
                          {t('mobile.sign_out', 'Sign Out')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('py-3.5 rounded-xl bg-slate-900 dark:bg-white items-center')}>
              <Text style={tw('font-bold text-white dark:text-slate-900 text-sm')}>
                {t('mobile.close', 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
