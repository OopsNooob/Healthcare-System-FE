import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  Check,
  CheckCheck,
  CheckCircle2,
  Info,
  RefreshCw,
  Trash2,
} from 'lucide-react-native';
import {
  connectNotificationsSocket,
  mobileApi,
  normalizePaginatedList,
  notificationsSocket,
  useSharedAuthStore,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { localizeNotificationContent } from '@/utils/notificationI18n';
import { Skeleton } from '@/components/ui/Skeleton';

interface NotificationViewItem {
  id: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'critical';
  isRead: boolean;
  createdAt: string;
  metadata?: {
    relatedEntityId?: string;
    relatedEntityType?: string;
    action?: string;
  };
}

function mapNotificationItem(raw: Record<string, unknown>): NotificationViewItem {
  const rawType = String(raw.type ?? 'info').toLowerCase();
  const type: NotificationViewItem['type'] =
    rawType === 'critical' || rawType === 'warning' || rawType === 'success' ? rawType : 'info';
  const rawMeta =
    raw.metadata && typeof raw.metadata === 'object'
      ? (raw.metadata as Record<string, unknown>)
      : undefined;

  return {
    id: String(raw._id ?? raw.id ?? ''),
    title: String(raw.title ?? ''),
    message: String(raw.message ?? ''),
    type,
    isRead: Boolean(raw.isRead),
    createdAt: String(raw.createdAt ?? ''),
    metadata: rawMeta
      ? {
          relatedEntityId:
            typeof rawMeta.relatedEntityId === 'string' ? rawMeta.relatedEntityId : undefined,
          relatedEntityType:
            typeof rawMeta.relatedEntityType === 'string' ? rawMeta.relatedEntityType : undefined,
          action: typeof rawMeta.action === 'string' ? rawMeta.action : undefined,
        }
      : undefined,
  };
}

interface NotificationsScreenProps {
  role: 'patient' | 'doctor';
}

export function NotificationsScreen({ role }: NotificationsScreenProps) {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const token = useSharedAuthStore((s) => s.token);
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [items, setItems] = useState<NotificationViewItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [page, setPage] = useState(1);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasNextPage, setHasNextPage] = useState(false);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [markingAll, setMarkingAll] = useState(false);
  const [busyItemId, setBusyItemId] = useState<string | null>(null);

  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await mobileApi.notificationsCountUnread();
      const count = (res as FeTypes.NotificationsCountUnreadResponse)?.data?.unreadCount;
      if (typeof count === 'number') {
        setUnreadCount(count);
      }
    } catch {
      // Ignore transient unread count failure
    }
  }, []);

  const loadNotifications = useCallback(
    async (mode: 'initial' | 'refresh' | 'more' | 'silent' = 'initial') => {
      if (mode === 'initial') setLoading(true);
      if (mode === 'refresh') setRefreshing(true);
      if (mode === 'more') setLoadingMore(true);
      if (mode !== 'more') setError(null);

      const targetPage = mode === 'more' ? page + 1 : 1;

      try {
        const [listRes, countRes] = await Promise.all([
          mobileApi.notificationsFindAll({
            query: {
              page: targetPage,
              limit: 20,
              sortBy: 'createdAt',
              sortOrder: -1,
              ...(filter === 'unread' ? { unreadOnly: true } : {}),
              ...(mode === 'more' && nextCursor ? { cursor: nextCursor } : {}),
            },
          }),
          mobileApi.notificationsCountUnread().catch(() => null),
        ]);

        const dataObj = (listRes as { data?: Record<string, unknown> })?.data;
        const normalized = normalizePaginatedList<Record<string, unknown>>(
          Array.isArray(dataObj?.notifications) ? dataObj.notifications : listRes,
          targetPage,
          20
        );

        const mapped = normalized.items
          .map(mapNotificationItem)
          .filter((item) => item.id.length > 0);

        const remoteHasNext =
          typeof dataObj?.hasNextPage === 'boolean'
            ? dataObj.hasNextPage
            : normalized.hasNextPage;
        const remoteCursor =
          typeof dataObj?.nextCursor === 'string' && dataObj.nextCursor
            ? dataObj.nextCursor
            : undefined;

        setItems((prev) => {
          if (mode !== 'more') return mapped;
          const seen = new Set(prev.map((x) => x.id));
          return [...prev, ...mapped.filter((x) => !seen.has(x.id))];
        });
        setPage(targetPage);
        setNextCursor(remoteCursor);
        setHasNextPage(Boolean(remoteHasNext));

        const nextUnread = (countRes as FeTypes.NotificationsCountUnreadResponse | null)?.data
          ?.unreadCount;
        if (typeof nextUnread === 'number') {
          setUnreadCount(nextUnread);
        } else if (filter === 'unread') {
          setUnreadCount(mapped.length);
        } else {
          setUnreadCount(mapped.filter((x) => !x.isRead).length);
        }
      } catch (err) {
        if (mode !== 'more' && mode !== 'silent') {
          setError(extractApiErrorMessage(err, 'mobile.notifications_load_error'));
        } else if (mode === 'more') {
          Toast.show({
            type: 'error',
            text1: t('mobile.error', 'Error'),
            text2: extractApiErrorMessage(err, 'mobile.notifications_load_error'),
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [filter, nextCursor, page, t]
  );

  useEffect(() => {
    void loadNotifications('initial');
  }, [filter]);

  useEffect(() => {
    if (!token) return;
    let active = true;

    void connectNotificationsSocket(token).catch(() => {});

    const onNotificationEvent = () => {
      if (!active) return;
      void loadNotifications('silent');
    };

    notificationsSocket.on('notifications', onNotificationEvent);

    return () => {
      active = false;
      notificationsSocket.off('notifications', onNotificationEvent);
    };
  }, [token, loadNotifications]);

  const handleMarkAllRead = async () => {
    if (markingAll || unreadCount === 0) return;
    setMarkingAll(true);
    try {
      await mobileApi.notificationsMarkAllAsRead();
      setItems((prev) =>
        filter === 'unread' ? [] : prev.map((item) => ({ ...item, isRead: true }))
      );
      setUnreadCount(0);
      Toast.show({
        type: 'success',
        text1: t('mobile.notifications_mark_all_done'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.notifications_action_error'),
      });
    } finally {
      setMarkingAll(false);
    }
  };

  const navigateForNotification = (item: NotificationViewItem) => {
    const entityType = (item.metadata?.relatedEntityType ?? '').toLowerCase();
    const action = (item.metadata?.action ?? '').toLowerCase();
    const haystack = `${entityType} ${action} ${item.title} ${item.message}`.toLowerCase();

    if (role === 'doctor') {
      if (haystack.includes('chat') || haystack.includes('message')) {
        router.push('/(doctor)/chat');
        return;
      }
      if (
        haystack.includes('alert') ||
        haystack.includes('care') ||
        haystack.includes('task') ||
        haystack.includes('enrollment')
      ) {
        router.push('/(doctor)/patients');
        return;
      }
      if (haystack.includes('slot') || haystack.includes('schedule')) {
        router.push('/(doctor)/schedule');
        return;
      }
      if (haystack.includes('consult') || haystack.includes('appointment') || haystack.includes('session')) {
        router.push('/(doctor)/consultations');
      }
      return;
    }

    if (haystack.includes('chat') || haystack.includes('message')) {
      router.push('/(patient)/chat-hub');
      return;
    }
    if (haystack.includes('consult') || haystack.includes('appointment') || haystack.includes('session')) {
      router.push('/(patient)/appointments');
      return;
    }
    if (haystack.includes('subscription') || haystack.includes('payment') || haystack.includes('billing')) {
      router.push('/(patient)/premium');
      return;
    }
    if (haystack.includes('alert') || haystack.includes('care') || haystack.includes('vital') || haystack.includes('metric')) {
      router.push('/(patient)/health-metric');
    }
  };

  const handleOpenNotification = async (item: NotificationViewItem) => {
    if (busyItemId) return;
    if (!item.isRead) {
      setBusyItemId(item.id);
      try {
        await mobileApi.notificationsFindOne({ params: { id: item.id } });
        setItems((prev) =>
          filter === 'unread'
            ? prev.filter((x) => x.id !== item.id)
            : prev.map((x) => (x.id === item.id ? { ...x, isRead: true } : x))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      } catch {
        // Proceed gracefully and refresh unread count
        void fetchUnreadCount();
      } finally {
        setBusyItemId(null);
      }
    }
    navigateForNotification(item);
  };

  const handleToggleRead = async (item: NotificationViewItem) => {
    if (busyItemId) return;
    const nextRead = !item.isRead;
    setBusyItemId(item.id);
    try {
      await mobileApi.notificationsUpdate({
        params: { id: item.id },
        body: { read: nextRead },
      });
      setItems((prev) => {
        if (filter === 'unread' && nextRead) {
          return prev.filter((x) => x.id !== item.id);
        }
        return prev.map((x) => (x.id === item.id ? { ...x, isRead: nextRead } : x));
      });
      setUnreadCount((c) => (nextRead ? Math.max(0, c - 1) : c + 1));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.notifications_action_error'),
      });
    } finally {
      setBusyItemId(null);
    }
  };

  const handleDeleteNotification = async (item: NotificationViewItem) => {
    if (busyItemId) return;
    setBusyItemId(item.id);
    try {
      await mobileApi.notificationsDelete({ params: { id: item.id } });
      setItems((prev) => prev.filter((x) => x.id !== item.id));
      if (!item.isRead) {
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.notifications_action_error'),
      });
    } finally {
      setBusyItemId(null);
    }
  };

  const formatTimestamp = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleString(dateLocale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderTypeBadge = (type: NotificationViewItem['type']) => {
    if (type === 'critical') {
      return (
        <View style={tw('w-10 h-10 rounded-full items-center justify-center bg-rose-100 dark:bg-rose-900/40')}>
          <AlertTriangle size={18} color={twInstance.color('text-rose-600 dark:text-rose-400')} />
        </View>
      );
    }
    if (type === 'warning') {
      return (
        <View style={tw('w-10 h-10 rounded-full items-center justify-center bg-amber-100 dark:bg-amber-900/40')}>
          <Bell size={18} color={twInstance.color('text-amber-600 dark:text-amber-400')} />
        </View>
      );
    }
    if (type === 'success') {
      return (
        <View style={tw('w-10 h-10 rounded-full items-center justify-center bg-emerald-100 dark:bg-emerald-900/40')}>
          <CheckCircle2 size={18} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
        </View>
      );
    }
    return (
      <View style={tw('w-10 h-10 rounded-full items-center justify-center bg-sky-100 dark:bg-sky-900/40')}>
        <Info size={18} color={twInstance.color('text-sky-600 dark:text-sky-400')} />
      </View>
    );
  };

  const renderItem = ({ item }: { item: NotificationViewItem }) => {
    const isBusy = busyItemId === item.id;
    const localized = localizeNotificationContent(item.title, item.message, t);
    return (
      <TouchableOpacity
        activeOpacity={0.8}
        disabled={Boolean(busyItemId)}
        onPress={() => void handleOpenNotification(item)}
        style={tw(
          `p-4 rounded-2xl mb-3 border ${
            item.isRead
              ? 'bg-white dark:bg-slate-900 border-slate-100 dark:border-slate-800'
              : 'bg-sky-50/70 dark:bg-slate-800/80 border-sky-200 dark:border-sky-800/60'
          }`
        )}
      >
        <View style={tw('flex-row items-start')}>
          {renderTypeBadge(item.type)}

          <View style={tw('flex-1 ml-3')}>
            <View style={tw('flex-row items-center justify-between')}>
              <View style={tw('flex-row items-center flex-1 mr-2')}>
                {!item.isRead ? <View style={tw('w-2 h-2 rounded-full bg-brand mr-2')} /> : null}
                <Text
                  style={tw('text-slate-900 dark:text-white font-bold text-sm flex-1')}
                  numberOfLines={2}
                >
                  {localized.title}
                </Text>
              </View>
              <Text style={tw('text-slate-400 dark:text-slate-500 text-xs')}>
                {formatTimestamp(item.createdAt)}
              </Text>
            </View>

            <Text style={tw('text-slate-600 dark:text-slate-300 text-sm mt-1.5 leading-5')}>
              {localized.message}
            </Text>

            <View style={tw('flex-row items-center justify-end gap-2 mt-3')}>
              <TouchableOpacity
                disabled={Boolean(busyItemId)}
                onPress={() => void handleToggleRead(item)}
                style={tw(
                  'px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 flex-row items-center'
                )}
              >
                {isBusy ? (
                  <ActivityIndicator size="small" color={twInstance.color('text-slate-500')} />
                ) : (
                  <>
                    <Check size={13} color={twInstance.color('text-slate-600 dark:text-slate-300')} />
                    <Text style={tw('text-slate-600 dark:text-slate-300 text-xs font-medium ml-1')}>
                      {item.isRead
                        ? t('mobile.notifications_mark_unread')
                        : t('mobile.notifications_mark_read')}
                    </Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                disabled={Boolean(busyItemId)}
                onPress={() => void handleDeleteNotification(item)}
                style={tw(
                  'px-2.5 py-1.5 rounded-full bg-rose-50 dark:bg-rose-900/30 flex-row items-center'
                )}
              >
                <Trash2 size={13} color={twInstance.color('text-rose-600 dark:text-rose-400')} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      {/* Header */}
      <View
        style={tw(
          'flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <View style={tw('flex-row items-center flex-1 mr-2')}>
          <TouchableOpacity
            onPress={() => router.back(role === 'doctor' ? '/(doctor)' : '/(patient)')}
            style={tw(
              'w-10 h-10 rounded-full items-center justify-center bg-slate-100 dark:bg-slate-800 mr-3'
            )}
          >
            <ArrowLeft size={20} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
          </TouchableOpacity>
          <Text style={tw('text-slate-900 dark:text-white font-bold text-lg')} numberOfLines={1}>
            {t('mobile.notifications_title')}
          </Text>
          {unreadCount > 0 ? (
            <View style={tw('ml-2 px-2 py-0.5 rounded-full bg-brand/20')}>
              <Text style={tw('text-xs font-bold text-slate-900 dark:text-brand')}>
                {unreadCount}
              </Text>
            </View>
          ) : null}
        </View>

        <TouchableOpacity
          onPress={() => void handleMarkAllRead()}
          disabled={markingAll || unreadCount === 0}
          style={tw(
            `flex-row items-center px-3 py-1.5 rounded-full bg-slate-100 dark:bg-slate-800 ${
              markingAll || unreadCount === 0 ? 'opacity-50' : ''
            }`
          )}
        >
          {markingAll ? (
            <ActivityIndicator size="small" color={twInstance.color('text-slate-600')} />
          ) : (
            <CheckCheck size={15} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
          )}
          <Text style={tw('text-slate-700 dark:text-slate-200 text-xs font-semibold ml-1.5')}>
            {t('mobile.notifications_mark_all_read')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Filter Bar */}
      <View style={tw('flex-row px-4 pt-3 pb-1 gap-2')}>
        <TouchableOpacity
          onPress={() => setFilter('all')}
          style={tw(
            `px-4 py-2 rounded-full border ${
              filter === 'all'
                ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`
          )}
        >
          <Text
            style={tw(
              `text-xs font-bold ${
                filter === 'all'
                  ? 'text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300'
              }`
            )}
          >
            {t('mobile.notifications_filter_all')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => setFilter('unread')}
          style={tw(
            `px-4 py-2 rounded-full border ${
              filter === 'unread'
                ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
            }`
          )}
        >
          <Text
            style={tw(
              `text-xs font-bold ${
                filter === 'unread'
                  ? 'text-white dark:text-slate-900'
                  : 'text-slate-600 dark:text-slate-300'
              }`
            )}
          >
            {t('mobile.notifications_filter_unread')} ({unreadCount})
          </Text>
        </TouchableOpacity>
      </View>

      {loading && items.length === 0 ? (
        <View style={tw('p-4 gap-3')}>
          {[1, 2, 3, 4].map((idx) => (
            <View
              key={idx}
              style={tw(
                'p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 gap-2'
              )}
            >
              <Skeleton className="h-4 w-3/5 rounded-lg" />
              <Skeleton className="h-3.5 w-11/12 rounded-lg" />
              <Skeleton className="h-3 w-2/5 rounded-lg" />
            </View>
          ))}
        </View>
      ) : error && items.length === 0 ? (
        <View style={tw('flex-1 items-center justify-center px-6')}>
          <View
            style={tw(
              'w-14 h-14 rounded-full bg-rose-100 dark:bg-rose-900/30 items-center justify-center mb-3'
            )}
          >
            <AlertTriangle size={24} color={twInstance.color('text-rose-500')} />
          </View>
          <Text style={tw('text-slate-900 dark:text-white font-bold text-base text-center')}>
            {t('mobile.notifications_load_error')}
          </Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-xs text-center mt-1 mb-4')}>
            {error}
          </Text>
          <TouchableOpacity
            onPress={() => void loadNotifications('initial')}
            style={tw('bg-brand px-5 py-2.5 rounded-full flex-row items-center')}
          >
            <RefreshCw size={15} color="#0f172a" />
            <Text style={tw('text-slate-900 font-bold text-sm ml-1.5')}>{t('mobile.retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={items}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={tw('p-4 pb-8 flex-grow')}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => void loadNotifications('refresh')}
            />
          }
          ListEmptyComponent={
            <View style={tw('flex-1 items-center justify-center py-20')}>
              <View
                style={tw(
                  'w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center mb-4'
                )}
              >
                <Bell size={28} color={twInstance.color('text-slate-400 dark:text-slate-500')} />
              </View>
              <Text style={tw('text-slate-700 dark:text-slate-200 font-semibold text-base')}>
                {filter === 'unread'
                  ? t('mobile.notifications_empty_unread')
                  : t('mobile.notifications_empty')}
              </Text>
              <Text style={tw('text-slate-400 dark:text-slate-500 text-sm text-center px-8 mt-1')}>
                {t('mobile.notifications_empty_desc')}
              </Text>
            </View>
          }
          ListFooterComponent={
            hasNextPage ? (
              <TouchableOpacity
                onPress={() => void loadNotifications('more')}
                disabled={loadingMore}
                style={tw(
                  'mt-2 mb-4 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center flex-row'
                )}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color={twInstance.color('text-slate-600')} />
                ) : (
                  <Text style={tw('text-slate-700 dark:text-slate-200 font-bold text-sm')}>
                    {t('mobile.load_more')}
                  </Text>
                )}
              </TouchableOpacity>
            ) : null
          }
        />
      )}
    </SafeAreaView>
  );
}
