import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
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
  Monitor,
  Trash2,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  getStorage,
  mobileApi,
  updateSocketAuth,
  useAuthSessions,
  useLogout,
  useSharedAuthStore,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
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
  const { isDark } = useThemeContext();
  const router = useRouter();
  const user = useSharedAuthStore((s) => s.user);
  const setUser = useSharedAuthStore((s) => s.setUser);
  const refreshToken = useSharedAuthStore((s) => s.refreshToken);
  const { logout } = useLogout();
  const {
    sessions,
    isLoading: isLoadingSessions,
    revokingId,
    isLoggingOutAll,
    loadSessions,
    revokeSession,
    logoutAll,
  } = useAuthSessions();

  const [isLoadingProfile, setIsLoadingProfile] = useState(false);
  const [isRefreshingToken, setIsRefreshingToken] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isPullRefreshing, setIsPullRefreshing] = useState(false);
  const [accountStatus, setAccountStatus] = useState<string>('active');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  const [verifiedEmail, setVerifiedEmail] = useState<string>(user?.email || '');

  const dateLocale = t('mobile.date_locale', 'vi-VN');

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

  const loadAllSessionData = useCallback(async () => {
    await Promise.allSettled([fetchSessionInfo(), loadSessions()]);
  }, [fetchSessionInfo, loadSessions]);

  useEffect(() => {
    if (visible) {
      void loadAllSessionData();
    }
  }, [visible, loadAllSessionData]);

  const handlePullRefresh = useCallback(async () => {
    setIsPullRefreshing(true);
    try {
      await loadAllSessionData();
    } finally {
      setIsPullRefreshing(false);
    }
  }, [loadAllSessionData]);

  const formatSessionDate = (iso?: string) => {
    if (!iso) return '—';
    const parsed = new Date(iso);
    if (Number.isNaN(parsed.getTime())) return iso;
    return parsed.toLocaleString(dateLocale, {
      dateStyle: 'short',
      timeStyle: 'short',
    });
  };

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
        refreshToken: storedRefresh,
      });

      await storage.setItem('accessToken', refreshed.accessToken);
      await storage.setItem('refreshToken', refreshed.refreshToken);
      setUser(
        {
          id: refreshed.user?.id || user.id,
          email: refreshed.user?.email ?? user.email,
          name: refreshed.user?.fullName ?? user.name,
          role: refreshed.user?.role ?? user.role,
          avatar: refreshed.user?.avatarUrl ?? user.avatar,
        },
        refreshed.accessToken,
        refreshed.refreshToken,
      );
      updateSocketAuth(refreshed.accessToken);
      void loadSessions().catch(() => {});
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

  const handleRevokeSession = async (sessionId: string) => {
    if (revokingId || isLoggingOutAll) return;
    try {
      await revokeSession(sessionId);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.session_revoked', 'Device session has been revoked.'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    }
  };

  const handleLogoutCurrent = async () => {
    if (isLoggingOut || isLoggingOutAll) return;
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

  const handleLogoutAllDevices = async () => {
    if (isLoggingOut || isLoggingOutAll) return;
    try {
      await logoutAll();
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.logout_all_success', 'Logged out from all devices.'),
      });
      onClose();
      router.replace('/(auth)/login');
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    }
  };

  const anyBusy = isRefreshingToken || isLoggingOut || isLoggingOutAll || Boolean(revokingId);

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
                  {t('mobile.security_sessions_subtitle', 'Manage your password and active device sessions')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={tw('p-5 gap-4')}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={isPullRefreshing}
                onRefresh={() => void handlePullRefresh()}
                tintColor={isDark ? '#34d399' : '#10b981'}
              />
            }
          >
            {onNavigateChangePassword && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onNavigateChangePassword();
                }}
                disabled={anyBusy}
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
                        {verifiedEmail || user?.name || t('mobile.authenticated_user', 'Authenticated User')}
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
                    onPress={() => void handleRefreshSession()}
                    disabled={anyBusy}
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
                    onPress={() => void handleLogoutCurrent()}
                    disabled={anyBusy}
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

            <View style={tw('flex-row items-center justify-between mt-1')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                {t('mobile.active_sessions_list', 'Active Sessions')}
              </Text>
              <TouchableOpacity
                onPress={() => void loadSessions()}
                disabled={isLoadingSessions || anyBusy}
                style={tw('flex-row items-center px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800')}
              >
                <RefreshCw color={isDark ? '#94a3b8' : '#64748b'} size={12} style={tw('mr-1')} />
                <Text style={tw('text-[11px] font-semibold text-slate-600 dark:text-slate-300')}>
                  {t('mobile.refresh', 'Refresh')}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoadingSessions ? (
              <View style={tw('gap-2.5')}>
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </View>
            ) : sessions.length === 0 ? (
              <View style={tw('p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 items-center')}>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.no_other_sessions', 'No active sessions reported by the server.')}
                </Text>
              </View>
            ) : (
              <View style={tw('gap-2.5')}>
                {sessions.map((session) => {
                  const isRevoked = Boolean(session.revokedAt);
                  const isRevokingThis = revokingId === session.id;
                  return (
                    <View
                      key={session.id}
                      style={tw('p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row items-center justify-between gap-3')}
                    >
                      <View style={tw('flex-row items-start flex-1 gap-2.5')}>
                        <View style={tw('w-9 h-9 rounded-xl bg-white dark:bg-slate-800 items-center justify-center border border-slate-200 dark:border-slate-700')}>
                          <Monitor color={isDark ? '#94a3b8' : '#475569'} size={16} />
                        </View>
                        <View style={tw('flex-1')}>
                          <View style={tw('flex-row items-center flex-wrap gap-1.5')}>
                            <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                              {session.deviceLabel || t('mobile.unknown_device', 'Recognized Device')}
                            </Text>
                            {session.current && (
                              <View style={tw('bg-emerald-100 dark:bg-emerald-900/50 px-2 py-0.5 rounded-full')}>
                                <Text style={tw('text-[10px] font-bold text-emerald-700 dark:text-emerald-300')}>
                                  {t('mobile.session_current_badge', 'This device')}
                                </Text>
                              </View>
                            )}
                            {isRevoked && (
                              <View style={tw('bg-rose-100 dark:bg-rose-900/50 px-2 py-0.5 rounded-full')}>
                                <Text style={tw('text-[10px] font-bold text-rose-700 dark:text-rose-300')}>
                                  {t('mobile.session_revoked_badge', 'Revoked')}
                                </Text>
                              </View>
                            )}
                          </View>
                          <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-0.5')}>
                            {t('mobile.last_seen', 'Last seen')}: {formatSessionDate(session.lastActiveAt || session.issuedAt)}
                          </Text>
                        </View>
                      </View>

                      {!session.current && !isRevoked && (
                        <TouchableOpacity
                          onPress={() => void handleRevokeSession(session.id)}
                          disabled={anyBusy}
                          style={tw('px-2.5 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 flex-row items-center')}
                        >
                          {isRevokingThis ? (
                            <ActivityIndicator size="small" color="#ef4444" />
                          ) : (
                            <>
                              <Trash2 color="#ef4444" size={13} style={tw('mr-1')} />
                              <Text style={tw('text-[11px] font-bold text-rose-600 dark:text-rose-400')}>
                                {t('mobile.revoke_session', 'Revoke')}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            <TouchableOpacity
              onPress={() => void handleLogoutAllDevices()}
              disabled={anyBusy}
              style={tw('mt-1 py-3 px-4 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 flex-row items-center justify-center')}
            >
              {isLoggingOutAll ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <>
                  <LogOut color="#ef4444" size={15} style={tw('mr-2')} />
                  <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400')}>
                    {t('mobile.logout_all_devices', 'Sign out from all devices')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('py-3.5 rounded-xl bg-slate-900 dark:bg-white items-center')}>
              <Text style={tw('font-bold text-white dark:text-slate-900 text-sm')}>
                {t('mobile.close', 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
