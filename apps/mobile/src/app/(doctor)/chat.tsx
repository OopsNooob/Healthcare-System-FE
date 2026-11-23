import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  MessageCircle,
  RefreshCw,
  Search,
  Video,
  X,
} from 'lucide-react-native';
import {
  connectNotificationsSocket,
  connectPresenceSocket,
  connectSocket,
  mobileApi,
  normalizePaginatedList,
  notificationsSocket,
  presenceSocket,
  socket,
  SOCKET_EVENTS,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { evaluateConsultationAccess } from '@/utils/consultationAccess';
import { Skeleton } from '@/components/ui/Skeleton';

type RawRecord = Record<string, unknown>;
type ThreadFilter = 'all' | 'online' | 'active';

interface ChatThreadItem {
  consultationId: string;
  patientId: string;
  patientName: string;
  avatarUrl?: string;
  mode: string;
  requestStatus: string;
  sessionStatus: string;
  queueJoinedAt?: string;
  calledAt?: string;
  scheduledStartAt: string;
  lastMessage: string;
  lastMessageAt: string;
  isOnline: boolean;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function extractPatientMeta(field: unknown, fallbackLabel: string): {
  id: string;
  name: string;
  avatarUrl?: string;
} {
  if (typeof field === 'string') {
    return { id: field, name: fallbackLabel };
  }
  if (field && typeof field === 'object') {
    const obj = field as RawRecord;
    const id = String(obj._id ?? obj.id ?? obj.userId ?? '');
    const name =
      (typeof obj.fullName === 'string' && obj.fullName.trim()) ||
      [obj.firstName, obj.lastName]
        .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
        .join(' ')
        .trim() ||
      (typeof obj.email === 'string' ? obj.email : fallbackLabel);
    const avatarUrl =
      typeof obj.avatarUrl === 'string' && obj.avatarUrl.startsWith('http')
        ? obj.avatarUrl
        : undefined;
    return { id, name: name || fallbackLabel, avatarUrl };
  }
  return { id: '', name: fallbackLabel };
}

export default function DoctorChatListScreen() {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useSafeRouter();

  const [threads, setThreads] = useState<ChatThreadItem[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<ThreadFilter>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const profileCacheRef = useRef<Map<string, { name: string; avatarUrl?: string }>>(new Map());
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const loadThreads = useCallback(async () => {
    try {
      setLoadError(null);
      const fallbackPatient = t('mobile.patient_fallback', 'Patient');

      const [consultationsRes, chatRes] = await Promise.all([
        mobileApi.consultationsFindAll({
          query: { page: 1, limit: 40, sortOrder: -1 },
        }),
        mobileApi.chatFindAll({
          query: { page: 1, limit: 50, sortOrder: -1 },
        }),
      ]);

      const consultationItems = normalizePaginatedList<RawRecord>(consultationsRes).items;
      const chatItems = normalizePaginatedList<RawRecord>(chatRes).items;

      const latestMessageByConsultation = new Map<
        string,
        { content: string; sentAt: string }
      >();

      for (const msg of chatItems) {
        const cid = String(msg.consultationId ?? '');
        if (!cid || latestMessageByConsultation.has(cid)) continue;
        const rawAttachments = Array.isArray(msg.attachments) ? msg.attachments : [];
        const rawContent = typeof msg.content === 'string' ? msg.content.trim() : '';
        const preview =
          rawContent ||
          (rawAttachments.length > 0
            ? t('mobile.attachment_preview', 'Sent an attachment')
            : '');
        const sentAt = String(msg.sentAt ?? msg.createdAt ?? '');
        latestMessageByConsultation.set(cid, { content: preview, sentAt });
      }

      const rawThreads: ChatThreadItem[] = [];
      const seenConsultations = new Set<string>();
      for (const c of consultationItems) {
        const cid = String(c._id ?? c.id ?? '');
        if (!cid || seenConsultations.has(cid)) continue;
        seenConsultations.add(cid);

        const patient = extractPatientMeta(c.patientId, fallbackPatient);
        const latest = latestMessageByConsultation.get(cid);
        rawThreads.push({
          consultationId: cid,
          patientId: patient.id,
          patientName: patient.name,
          avatarUrl: patient.avatarUrl,
          mode: String(c.mode ?? ''),
          requestStatus: String(c.requestStatus ?? ''),
          sessionStatus: String(c.sessionStatus ?? 'scheduled'),
          queueJoinedAt: typeof c.queueJoinedAt === 'string' ? c.queueJoinedAt : undefined,
          calledAt: typeof c.calledAt === 'string' ? c.calledAt : undefined,
          scheduledStartAt: String(c.scheduledStartAt ?? c.createdAt ?? ''),
          lastMessage:
            latest?.content ||
            String(c.reason ?? t('mobile.tap_to_start_chat', 'Tap to message patient')),
          lastMessageAt: latest?.sentAt || String(c.updatedAt ?? c.scheduledStartAt ?? c.createdAt ?? ''),
          isOnline: false,
        });
      }

      const missingIds = Array.from(
        new Set(
          rawThreads
            .filter(
              (row) =>
                row.patientId &&
                row.patientName === fallbackPatient &&
                !profileCacheRef.current.has(row.patientId),
            )
            .map((row) => row.patientId),
        ),
      );

      if (missingIds.length > 0) {
        await Promise.all(
          missingIds.slice(0, 12).map(async (pid) => {
            try {
              const profileRes = await mobileApi.usersFindProfile({ params: { id: pid } });
              const data = ((profileRes as unknown as { data?: RawRecord })?.data ?? profileRes) as RawRecord;
              const name =
                (typeof data?.fullName === 'string' && data.fullName.trim()) ||
                [data?.firstName, data?.lastName]
                  .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                  .join(' ')
                  .trim();
              const avatarUrl =
                typeof data?.avatarUrl === 'string' && data.avatarUrl.startsWith('http')
                  ? data.avatarUrl
                  : undefined;
              if (name) {
                profileCacheRef.current.set(pid, { name, avatarUrl });
              }
            } catch {
              // Keep fallback label
            }
          }),
        );
      }

      const patientIds = Array.from(
        new Set(rawThreads.map((row) => row.patientId).filter(Boolean)),
      );
      let onlineSet = new Set<string>();
      if (patientIds.length > 0) {
        try {
          const presenceRes = await mobileApi.presenceCheckUsersStatus({
            body: { userIds: patientIds },
          } as unknown as FeTypes.PresenceCheckUsersStatusRequest);
          const payload = (presenceRes?.data ?? presenceRes) as { onlineUserIds?: string[] };
          if (Array.isArray(payload?.onlineUserIds)) {
            onlineSet = new Set(payload.onlineUserIds.map(String));
          }
        } catch {
          // Non-blocking presence lookup
        }
      }

      const hydrated = rawThreads
        .map((row) => {
          const cached = profileCacheRef.current.get(row.patientId);
          return {
            ...row,
            patientName: cached?.name ?? row.patientName,
            avatarUrl: row.avatarUrl ?? cached?.avatarUrl,
            isOnline: onlineSet.has(row.patientId),
          };
        })
        .sort((a, b) => {
          const tA = new Date(a.lastMessageAt || 0).getTime();
          const tB = new Date(b.lastMessageAt || 0).getTime();
          return (Number.isNaN(tB) ? 0 : tB) - (Number.isNaN(tA) ? 0 : tA);
        });

      setThreads(hydrated);
    } catch (err) {
      setLoadError(extractApiErrorMessage(err));
    }
  }, [t]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadThreads().finally(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [loadThreads]);

  useEffect(() => {
    connectSocket();
    connectPresenceSocket();
    connectNotificationsSocket();

    const onPresence = (event: FeTypes.RealtimePresenceChanged) => {
      const uid = String(event?.userId ?? '');
      if (!uid) return;
      setThreads((prev) =>
        prev.map((row) =>
          row.patientId === uid ? { ...row, isOnline: event?.status === 'online' } : row,
        ),
      );
    };

    const onNewMessage = () => {
      loadThreads();
    };

    presenceSocket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);
    socket.on(SOCKET_EVENTS.CONSULTATION_MESSAGE, onNewMessage);
    notificationsSocket.on(SOCKET_EVENTS.CONSULTATION_MESSAGE_NOTIFICATION, onNewMessage);

    return () => {
      presenceSocket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);
      socket.off(SOCKET_EVENTS.CONSULTATION_MESSAGE, onNewMessage);
      notificationsSocket.off(SOCKET_EVENTS.CONSULTATION_MESSAGE_NOTIFICATION, onNewMessage);
    };
  }, [loadThreads]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadThreads();
    setIsRefreshing(false);
  }, [loadThreads]);

  const filteredThreads = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return threads.filter((item) => {
      if (filter === 'online' && !item.isOnline) return false;
      if (filter === 'active' && !evaluateConsultationAccess(item).canChat) {
        return false;
      }
      if (!q) return true;
      return (
        item.patientName.toLowerCase().includes(q) ||
        item.lastMessage.toLowerCase().includes(q)
      );
    });
  }, [filter, searchQuery, threads]);

  const formatTimeLabel = (iso: string) => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      <View style={tw('px-5 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
          {t('mobile.doctor_messages_title', 'Patient Messages')}
        </Text>
        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5 mb-3')}>
          {t('mobile.doctor_messages_subtitle', 'Real-time consultation threads with your patients')}
        </Text>

        <View style={tw('flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2')}>
          <Search size={16} color={isDark ? '#94a3b8' : '#64748b'} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('mobile.search_messages_placeholder', 'Search patient name or message...')}
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            style={tw('flex-1 text-sm text-slate-900 dark:text-white py-0')}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        <View style={tw('flex-row gap-2 pt-3')}>
          {(
            [
              { key: 'all', label: t('mobile.filter_all', 'All') },
              { key: 'online', label: t('mobile.online', 'Online') },
              { key: 'active', label: t('mobile.active_sessions', 'Active Sessions') },
            ] as const
          ).map((chip) => {
            const selected = filter === chip.key;
            return (
              <TouchableOpacity
                key={chip.key}
                onPress={() => setFilter(chip.key)}
                style={tw(
                  `px-3 py-1.5 rounded-full border ${
                    selected
                      ? 'bg-teal-600 border-teal-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                  }`,
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-semibold ${selected ? 'text-white' : 'text-slate-600 dark:text-slate-300'}`,
                  )}
                >
                  {chip.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {isLoading ? (
        <View style={tw('px-5 pt-4 gap-3')}>
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </View>
      ) : loadError ? (
        <View style={tw('flex-1 items-center justify-center px-8')}>
          <AlertCircle size={38} color="#ef4444" />
          <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
            {t('mobile.load_error_title', 'Unable to load conversations')}
          </Text>
          <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>{loadError}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsLoading(true);
              loadThreads().finally(() => setIsLoading(false));
            }}
            style={tw('mt-4 px-5 py-2.5 rounded-xl bg-teal-600 flex-row items-center gap-2')}
          >
            <RefreshCw size={15} color="#ffffff" />
            <Text style={tw('text-sm font-bold text-white')}>{t('mobile.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={tw('px-5 pt-4 pb-24 gap-2.5')}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {filteredThreads.length === 0 ? (
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-2xl p-8 items-center border border-slate-100 dark:border-slate-800',
              )}
            >
              <MessageCircle size={36} color="#94a3b8" />
              <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-100 mt-3')}>
                {t('mobile.no_chat_threads', 'No consultation conversations yet')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
                {t('mobile.pull_to_refresh_hint', 'Pull down to refresh or adjust filters.')}
              </Text>
            </View>
          ) : (
            filteredThreads.map((item) => (
              <TouchableOpacity
                key={item.consultationId}
                onPress={() => router.push(`/(doctor)/chat/${item.consultationId}`)}
                style={[
                  tw(
                    'bg-white dark:bg-slate-900 rounded-2xl p-3.5 border border-slate-100 dark:border-slate-800 flex-row items-center gap-3',
                  ),
                  {
                    shadowColor: '#0f172a',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.05,
                    shadowRadius: 8,
                    elevation: 2,
                  },
                ]}
              >
                <View style={tw('relative')}>
                  {item.avatarUrl ? (
                    <Image
                      source={{ uri: item.avatarUrl }}
                      style={tw('w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700')}
                    />
                  ) : (
                    <View style={tw('w-12 h-12 rounded-full bg-teal-100 dark:bg-teal-900/60 items-center justify-center')}>
                      <Text style={tw('text-sm font-bold text-teal-800 dark:text-teal-200')}>
                        {getInitials(item.patientName)}
                      </Text>
                    </View>
                  )}
                  <View
                    style={tw(
                      `absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 ${
                        item.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                      }`,
                    )}
                  />
                </View>

                <View style={tw('flex-1 min-w-0')}>
                  <View style={tw('flex-row items-center justify-between gap-2')}>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white flex-1')} numberOfLines={1}>
                      {item.patientName}
                    </Text>
                    <Text style={tw('text-[11px] text-slate-400')}>
                      {formatTimeLabel(item.lastMessageAt)}
                    </Text>
                  </View>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')} numberOfLines={1}>
                    {item.lastMessage}
                  </Text>
                </View>

                {evaluateConsultationAccess(item).canVideoCall && (
                  <TouchableOpacity
                    onPress={() => router.push(`/(doctor)/video-call?consultationId=${item.consultationId}`)}
                    style={tw('p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60')}
                  >
                    <Video size={16} color="#0d9488" />
                  </TouchableOpacity>
                )}
              </TouchableOpacity>
            ))
          )}
        </ScrollView>
      )}
    </SafeAreaView>
  );
}
