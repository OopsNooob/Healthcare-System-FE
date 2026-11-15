import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Image,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Bot, ChevronRight, MessageSquareOff, Sparkles, Stethoscope } from 'lucide-react-native';
import { tw } from '@/tw';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  mobileApi,
  normalizePaginatedList,
  notificationsSocket,
  presenceSocket,
  socket,
  SOCKET_EVENTS,
  type FeTypes,
} from '@repo/shared-hooks';

interface DoctorChatThread {
  consultationId: string;
  doctorId: string;
  name: string;
  specialty: string;
  avatarUrl: string;
  lastMsg: string;
  timeLabel: string;
  sortTs: number;
  online: boolean;
  statusLabel: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function PatientChatHub() {
  const { t, i18n } = useTranslation();
  useThemeContext();
  const dateLocale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [threads, setThreads] = useState<DoctorChatThread[]>([]);

  const loadThreads = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setErrorMsg(null);
      try {
        const [consultRes, chatsRes] = await Promise.all([
          mobileApi.consultationsFindAll({ query: { page: 1, limit: 40, sortOrder: -1 } }),
          mobileApi.chatFindAll({ query: { page: 1, limit: 50, sortOrder: -1 } }).catch(() => null),
        ]);

        const consultations = normalizePaginatedList<Record<string, unknown>>(consultRes).items;
        const recentMessages = normalizePaginatedList<Record<string, unknown>>(chatsRes).items;

        const latestMsgByConsultation = new Map<
          string,
          { content: string; sentAt: string; hasAttachment: boolean }
        >();
        for (const m of recentMessages) {
          const cId = String(m.consultationId ?? '');
          if (!cId || latestMsgByConsultation.has(cId)) continue;
          const attachments = Array.isArray(m.attachments) ? m.attachments : [];
          latestMsgByConsultation.set(cId, {
            content: String(m.content ?? ''),
            sentAt: String(m.sentAt ?? m.createdAt ?? ''),
            hasAttachment: attachments.length > 0,
          });
        }

        const doctorIds = Array.from(
          new Set(
            consultations
              .map((c) => {
                const raw = c.doctorId;
                return raw && typeof raw === 'object'
                  ? String((raw as Record<string, unknown>)._id ?? (raw as Record<string, unknown>).id ?? '')
                  : String(raw ?? '');
              })
              .filter(Boolean),
          ),
        );

        let onlineSet = new Set<string>();
        if (doctorIds.length > 0) {
          try {
            const presenceRes = await mobileApi.presenceCheckUsersStatus({
              body: { userIds: doctorIds },
            } as unknown as FeTypes.PresenceCheckUsersStatusRequest);
            onlineSet = new Set((presenceRes?.data?.onlineUserIds ?? []).map((id) => String(id)));
          } catch {
            // Presence check is non-blocking
          }
        }

        const mapped: DoctorChatThread[] = consultations
          .filter((c) => {
            const cId = String(c._id ?? c.id ?? '');
            const req = String(c.requestStatus ?? '');
            if (req === 'declined' || req === 'cancelled') {
              return latestMsgByConsultation.has(cId);
            }
            return Boolean(cId);
          })
          .map((c) => {
            const cId = String(c._id ?? c.id ?? '');
            const docRaw = c.doctorId;
            const docObj =
              docRaw && typeof docRaw === 'object' ? (docRaw as Record<string, unknown>) : null;
            const docId = docObj ? String(docObj._id ?? docObj.id ?? '') : String(docRaw ?? '');
            const dp = (docObj?.doctorProfile ?? {}) as Record<string, unknown>;
            const lastMsgInfo = latestMsgByConsultation.get(cId);

            const tsRaw =
              lastMsgInfo?.sentAt ||
              String(c.lastMessageAt ?? c.updatedAt ?? c.scheduledStartAt ?? c.requestedAt ?? '');
            const dt = tsRaw ? new Date(tsRaw) : new Date();
            const sortTs = dt.getTime();

            const timeLabel = Number.isFinite(sortTs)
              ? dt.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
              : '';

            const fallbackMsg =
              c.patientNotes
                ? String(c.patientNotes)
                : t('mobile.tap_to_open_consultation_chat', 'Tap to open consultation chat');

            const ses = String(c.sessionStatus ?? '');
            const req = String(c.requestStatus ?? '');
            let statusLabel = '';
            if (ses === 'waiting') statusLabel = t('mobile.status_waiting', 'Waiting');
            else if (ses === 'in_consultation') statusLabel = t('mobile.status_in_consultation', 'Active');
            else if (ses === 'completed') statusLabel = t('mobile.status_completed', 'Completed');
            else if (req === 'pending') statusLabel = t('mobile.status_pending', 'Pending');

            return {
              consultationId: cId,
              doctorId: docId,
              name: docObj?.fullName
                ? String(docObj.fullName)
                : t('mobile.specialist_doctor', 'Specialist Doctor'),
              specialty: dp.specialty
                ? String(dp.specialty)
                : t('mobile.specialty_general_practitioner', 'General Practitioner'),
              avatarUrl: String(docObj?.avatarUrl ?? ''),
              lastMsg: lastMsgInfo?.content || fallbackMsg,
              timeLabel,
              sortTs: Number.isFinite(sortTs) ? sortTs : 0,
              online: onlineSet.has(docId),
              statusLabel,
            };
          })
          .sort((a, b) => b.sortTs - a.sortTs);

        setThreads(mapped);
      } catch (err) {
        setErrorMsg(extractApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateLocale, t],
  );

  useEffect(() => {
    void loadThreads(false);
  }, [loadThreads]);

  useEffect(() => {
    const onPresence = (payload: FeTypes.RealtimePresenceChanged) => {
      if (!payload?.userId) return;
      setThreads((prev) =>
        prev.map((th) =>
          th.doctorId === payload.userId ? { ...th, online: payload.status === 'online' } : th,
        ),
      );
    };
    const onMessage = () => {
      void loadThreads(true);
    };
    presenceSocket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);
    socket.on(SOCKET_EVENTS.CONSULTATION_MESSAGE, onMessage);
    notificationsSocket.on(SOCKET_EVENTS.CONSULTATION_MESSAGE_NOTIFICATION, onMessage);
    return () => {
      presenceSocket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);
      socket.off(SOCKET_EVENTS.CONSULTATION_MESSAGE, onMessage);
      notificationsSocket.off(SOCKET_EVENTS.CONSULTATION_MESSAGE_NOTIFICATION, onMessage);
    };
  }, [loadThreads]);

  const renderSkeleton = () => (
    <View style={tw('gap-3')}>
      <View
        style={tw(
          'flex-row items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800',
        )}
      >
        <Skeleton className="w-12 h-12 rounded-full mr-4" />
        <View style={tw('flex-1 gap-2')}>
          <Skeleton className="w-36 h-4 rounded" />
          <Skeleton className="w-52 h-3.5 rounded" />
        </View>
      </View>
      <View
        style={tw(
          'flex-row items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800',
        )}
      >
        <Skeleton className="w-12 h-12 rounded-full mr-4" />
        <View style={tw('flex-1 gap-2')}>
          <Skeleton className="w-40 h-4 rounded" />
          <Skeleton className="w-48 h-3.5 rounded" />
        </View>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View
      style={tw(
        'items-center justify-center py-12 px-6 bg-white dark:bg-slate-900 rounded-3xl border border-slate-100 dark:border-slate-800',
      )}
    >
      <View
        style={tw(
          'w-16 h-16 bg-slate-50 dark:bg-slate-950 rounded-full items-center justify-center mb-4',
        )}
      >
        <MessageSquareOff color="#94a3b8" size={28} />
      </View>
      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-1 text-center')}>
        {t('mobile.no_active_chats', 'No active chats yet')}
      </Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 text-center text-sm mb-6')}>
        {t(
          'mobile.start_consultation_or_browse_doctors',
          'Start a consultation with our specialists to view your conversation history here.',
        )}
      </Text>
      <TouchableOpacity
        onPress={() => router.push('/(patient)/my-doctors')}
        style={tw('bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-xl')}
      >
        <Text style={tw('text-slate-900 dark:text-white font-bold text-sm')}>
          {t('mobile.find_a_doctor', 'Find a Doctor')}
        </Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView
        contentContainerStyle={tw('pb-24')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadThreads(true);
            }}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        }
      >
        {/* Header */}
        <View style={tw('px-6 pt-6 pb-4')}>
          <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
            {t('mobile.consultation_and_ai_hub', 'Consultation & AI Hub')}
          </Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-sm mt-1')}>
            {t(
              'mobile.connect_with_doctors_or_get_ai_advice',
              'Connect with your doctors or ask our medical AI assistant',
            )}
          </Text>
        </View>

        {/* AI Assistant Hero Banner */}
        <View style={tw('px-6 mb-6')}>
          <TouchableOpacity
            onPress={() => router.push('/(patient)/ai-chat')}
            activeOpacity={0.9}
            style={tw(
              'bg-slate-900 dark:bg-slate-800 rounded-3xl p-6 shadow-md border border-slate-800 dark:border-slate-700 overflow-hidden',
            )}
          >
            <View style={tw('flex-row items-center justify-between mb-4')}>
              <View style={tw('flex-row items-center gap-3')}>
                <View style={tw('w-12 h-12 rounded-2xl bg-brand items-center justify-center')}>
                  <Bot color="#0f172a" size={28} />
                </View>
                <View>
                  <View style={tw('flex-row items-center gap-1.5')}>
                    <Text style={tw('text-white font-bold text-lg')}>
                      {t('mobile.ai_health_assistant', 'AI Health Assistant')}
                    </Text>
                    <Sparkles color="#a3e635" size={16} />
                  </View>
                  <Text style={tw('text-slate-400 text-xs font-medium')}>
                    {t('mobile.always_available_medical_triage', 'Available 24/7 for health triage')}
                  </Text>
                </View>
              </View>
              <View style={tw('bg-slate-800 dark:bg-slate-700 p-2 rounded-full')}>
                <ChevronRight color="#a3e635" size={20} />
              </View>
            </View>

            <Text style={tw('text-slate-300 text-sm leading-5 mb-4')}>
              {t(
                'mobile.ai_assistant_desc',
                'Discuss symptoms, ask medication questions, or review your recent vitals with guided AI triage.',
              )}
            </Text>

            <View style={tw('bg-brand py-3 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-sm')}>
                {t('mobile.open_ai_chatbot', 'Open AI Assistant')}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Doctor Chats List */}
        <View style={tw('px-6')}>
          <Text
            style={tw(
              'text-sm font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest mb-4',
            )}
          >
            {t('mobile.doctor_messages', 'Doctor Messages')}
          </Text>
          <View style={tw('gap-3')}>
            {loading ? (
              renderSkeleton()
            ) : errorMsg ? (
              <View
                style={tw(
                  'bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-100 dark:border-slate-800 items-center',
                )}
              >
                <Text style={tw('text-sm text-red-500 text-center mb-3')}>{errorMsg}</Text>
                <TouchableOpacity
                  onPress={() => void loadThreads(false)}
                  style={tw('px-5 py-2.5 bg-brand rounded-xl')}
                >
                  <Text style={tw('text-slate-900 font-bold text-xs')}>
                    {t('mobile.retry', 'Retry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : threads.length > 0 ? (
              threads.map((chat) => (
                <TouchableOpacity
                  key={chat.consultationId}
                  onPress={() =>
                    router.push(
                      `/(patient)/doctor-chat?consultationId=${chat.consultationId}&doctorId=${chat.doctorId}`,
                    )
                  }
                  style={tw(
                    'flex-row items-center bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm',
                  )}
                >
                  <View style={tw('relative mr-4')}>
                    {chat.avatarUrl ? (
                      <Image
                        source={{ uri: chat.avatarUrl }}
                        style={tw('w-12 h-12 rounded-full bg-slate-200 dark:bg-slate-700')}
                      />
                    ) : (
                      <View
                        style={tw(
                          'w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center',
                        )}
                      >
                        <Text style={tw('text-sm font-bold text-slate-600 dark:text-slate-300')}>
                          {getInitials(chat.name)}
                        </Text>
                      </View>
                    )}
                    {chat.online && (
                      <View
                        style={tw(
                          'w-3 h-3 bg-emerald-500 rounded-full border-2 border-white dark:border-slate-900 absolute bottom-0 right-0',
                        )}
                      />
                    )}
                  </View>

                  <View style={tw('flex-1 mr-2')}>
                    <View style={tw('flex-row justify-between items-center mb-0.5')}>
                      <Text
                        style={tw('font-bold text-slate-900 dark:text-white text-base flex-1 mr-2')}
                        numberOfLines={1}
                      >
                        {chat.name}
                      </Text>
                      {chat.timeLabel ? (
                        <Text style={tw('text-xs font-medium text-slate-400 dark:text-slate-500')}>
                          {chat.timeLabel}
                        </Text>
                      ) : null}
                    </View>
                    <View style={tw('flex-row items-center gap-1 mb-1')}>
                      <Stethoscope color="#94a3b8" size={12} />
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                        {chat.specialty}
                        {chat.statusLabel ? ` • ${chat.statusLabel}` : ''}
                      </Text>
                    </View>
                    <Text
                      style={tw('text-sm text-slate-500 dark:text-slate-400')}
                      numberOfLines={1}
                    >
                      {chat.lastMsg}
                    </Text>
                  </View>
                </TouchableOpacity>
              ))
            ) : (
              renderEmptyState()
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
