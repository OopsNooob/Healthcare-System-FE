import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  AlertCircle,
  Bell,
  Calendar as CalendarIcon,
  CheckCircle,
  Clock,
  Eye,
  PhoneCall,
  Power,
  Star,
  Stethoscope,
  Users,
  X,
  XCircle,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  generateIdempotencyKey,
  mobileApi,
  normalizePaginatedList,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { extractUserProfileData } from '@/utils/userProfile';
import { CareAlertsModal } from '@/components/modals/CareAlertsModal';

interface PriorityAlertItem {
  id: string;
  patientId: string;
  name: string;
  detectedAt: string;
  status: 'open' | 'acknowledged';
  severity: 'urgent' | 'attention';
  reasonCodes: string[];
  revision: number;
  linkedConsultationId?: string | null;
}

interface DoctorQueueEntry {
  consultationId: string;
  patientId: string;
  patientName: string;
  mode: string;
  scheduledStartAt: string;
  queuePosition: number;
  isCurrent: boolean;
  isLate: boolean;
}

function formatCodeLabel(code: string): string {
  return code
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function DoctorHomeScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [doctorName, setDoctorName] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [togglingOnline, setTogglingOnline] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  const [totalEnrolledCount, setTotalEnrolledCount] = useState(0);
  const [upcomingConsultCount, setUpcomingConsultCount] = useState(0);
  const [ratingSummary, setRatingSummary] = useState<string>('—');

  const [queueEntries, setQueueEntries] = useState<DoctorQueueEntry[]>([]);
  const [callingNext, setCallingNext] = useState(false);

  const [alerts, setAlerts] = useState<PriorityAlertItem[]>([]);
  const [severityFilter, setSeverityFilter] = useState<'all' | 'urgent' | 'attention'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged'>('all');

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [busyActionId, setBusyActionId] = useState<string | null>(null);

  const [resolveModalVisible, setResolveModalVisible] = useState(false);
  const [dismissModalVisible, setDismissModalVisible] = useState(false);
  const [allAlertsModalVisible, setAllAlertsModalVisible] = useState(false);
  const [selectedAlert, setSelectedAlert] = useState<PriorityAlertItem | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [dismissReason, setDismissReason] = useState('');

  const dismissPresets = [
    { id: 'duplicate', label: t('mobile.duplicate') },
    { id: 'invalid_metric', label: t('mobile.invalid_metric') },
    { id: 'rule_false_positive', label: t('mobile.rule_false_positive') },
  ];

  const loadDashboard = useCallback(async () => {
    setErrorMsg(null);
    try {
      const [meRes, unreadRes, enrollRes, upcomingRes, queueRes, alertsRes] =
        await Promise.all([
          mobileApi.usersGetMe(),
          mobileApi.notificationsCountUnread(),
          mobileApi.careEnrollmentList({ query: { page: 1, limit: 1 } }),
          mobileApi.consultationsUpcoming({ query: { days: 7 } }),
          mobileApi.doctorQueueList({ query: { page: 1, limit: 10 } }),
          mobileApi.careAlertInbox({ query: { limit: 25 } }),
        ]);

      const profile = extractUserProfileData(meRes);
      setDoctorName(profile.fullName);
      setIsOnline(profile.isOnline);

      const rawUnread = unreadRes as unknown as { data?: { count?: number }; count?: number };
      setUnreadNotifications(Number(rawUnread?.data?.count ?? rawUnread?.count ?? 0));

      const enrollPage = normalizePaginatedList<Record<string, unknown>>(enrollRes);
      setTotalEnrolledCount(Number(enrollPage.total ?? enrollPage.items.length));

      const upcomingList = normalizePaginatedList<Record<string, unknown>>(upcomingRes).items;
      setUpcomingConsultCount(upcomingList.length);

      if (profile.id) {
        try {
          const ratingRes = await mobileApi.reviewsGetDoctorRating({
            params: { doctorId: profile.id },
          });
          const rawRating = ratingRes as unknown as Record<string, unknown>;
          const avg = Number(rawRating.averageRating ?? rawRating.average ?? 0);
          const count = Number(rawRating.totalReviews ?? rawRating.count ?? 0);
          setRatingSummary(count > 0 ? `${avg.toFixed(1)} (${count})` : '—');
        } catch {
          setRatingSummary('—');
        }
      }

      const rawQueue = queueRes as unknown as Record<string, unknown>;
      const qRows = Array.isArray(rawQueue?.data) ? (rawQueue.data as Array<Record<string, unknown>>) : [];
      setQueueEntries(
        qRows.map((entry) => {
          const p = (entry.patient ?? {}) as Record<string, unknown>;
          return {
            consultationId: String(entry.consultationId ?? ''),
            patientId: String(p.id ?? ''),
            patientName: String(p.fullName ?? t('mobile.patient')),
            mode: String(entry.mode ?? 'scheduled'),
            scheduledStartAt: String(entry.scheduledStartAt ?? ''),
            queuePosition: Number(entry.queuePosition ?? 1),
            isCurrent: Boolean(entry.isCurrent),
            isLate: Boolean(entry.isLate),
          };
        })
      );

      const rawAlerts = normalizePaginatedList<Record<string, unknown>>(alertsRes).items;
      const patientIds = Array.from(
        new Set(rawAlerts.map((a) => String(a.patientId ?? '')).filter(Boolean))
      ).slice(0, 15);
      const nameMap: Record<string, string> = {};
      await Promise.allSettled(
        patientIds.map(async (id) => {
          const prof = await mobileApi.usersFindProfile({ params: { id } });
          const raw = prof as unknown as { data?: { fullName?: string }; fullName?: string };
          const fullName = raw?.data?.fullName ?? raw?.fullName;
          if (fullName) nameMap[id] = String(fullName);
        })
      );

      setAlerts(
        rawAlerts
          .map((item) => {
            const pId = String(item.patientId ?? '');
            return {
              id: String(item.id ?? item._id ?? ''),
              patientId: pId,
              name: nameMap[pId] || t('mobile.patient'),
              detectedAt: String(item.detectedAt ?? item.createdAt ?? ''),
              status:
                String(item.status ?? 'open') === 'acknowledged'
                  ? ('acknowledged' as const)
                  : ('open' as const),
              severity:
                String(item.severity ?? 'attention') === 'urgent'
                  ? ('urgent' as const)
                  : ('attention' as const),
              reasonCodes: Array.isArray(item.reasonCodes) ? item.reasonCodes.map(String) : [],
              revision: Number(item.revision ?? 1),
              linkedConsultationId: null,
            };
          })
          .filter((a) => Boolean(a.id))
      );
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'mobile.load_dashboard_failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [t]);

  useEffect(() => {
    void loadDashboard();
  }, [loadDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    void loadDashboard();
  };

  const handleToggleOnline = async (nextValue: boolean) => {
    if (togglingOnline) return;
    const prev = isOnline;
    setIsOnline(nextValue);
    setTogglingOnline(true);
    try {
      await mobileApi.usersUpdateMe({ isOnline: nextValue });
    } catch (err) {
      setIsOnline(prev);
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.update_status_failed'),
      });
    } finally {
      setTogglingOnline(false);
    }
  };

  const handleCallNext = async () => {
    if (callingNext) return;
    setCallingNext(true);
    try {
      const res = await mobileApi.doctorQueueCallNext({
        headers: { 'Idempotency-Key': generateIdempotencyKey() },
      });
      const raw = res as unknown as { data?: { id?: string; _id?: string } };
      const consultationId = String(raw?.data?.id ?? raw?.data?._id ?? '');
      Toast.show({
        type: 'success',
        text1: t('mobile.next_patient_called'),
      });
      await loadDashboard();
      if (consultationId) {
        router.push(`/(doctor)/video-call?consultationId=${consultationId}` as never);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.call_next_failed'),
      });
    } finally {
      setCallingNext(false);
    }
  };

  const handleAcknowledge = async (alertItem: PriorityAlertItem) => {
    if (busyActionId) return;
    setBusyActionId(`ack-${alertItem.id}`);
    try {
      const updated = await mobileApi.careAlertAcknowledge({
        params: { id: alertItem.id },
        body: {
          expectedRevision: alertItem.revision,
          reason: t('mobile.alert_acknowledged_by_doctor'),
        },
      });
      const raw = updated as unknown as { revision?: number };
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === alertItem.id
            ? {
                ...item,
                status: 'acknowledged',
                revision: Number(raw?.revision ?? item.revision + 1),
              }
            : item
        )
      );
      Toast.show({
        type: 'success',
        text1: t('mobile.alert_acknowledged'),
        text2: alertItem.name,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.alert_action_failed'),
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const handleCreateConsultationFromAlert = async (alertItem: PriorityAlertItem) => {
    if (busyActionId) return;
    setBusyActionId(`consult-${alertItem.id}`);
    try {
      const res = await mobileApi.careAlertCreateConsultation({
        params: { id: alertItem.id },
        body: {
          followUpNote: t('mobile.alert_followup_consultation_note'),
          nextAction: 'follow_up_consultation',
        },
      });
      const raw = res as unknown as { id?: string; _id?: string; data?: { id?: string } };
      const consultId = String(raw?.data?.id ?? raw?.id ?? raw?._id ?? 'linked');
      setAlerts((prev) =>
        prev.map((item) =>
          item.id === alertItem.id
            ? { ...item, linkedConsultationId: consultId }
            : item
        )
      );
      Toast.show({
        type: 'success',
        text1: t('mobile.consultation_created_from_alert'),
        text2: alertItem.name,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.alert_action_failed'),
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const confirmResolve = async () => {
    if (!selectedAlert || busyActionId) return;
    if (!resolutionNote.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.reason_required'),
      });
      return;
    }
    setBusyActionId(`resolve-${selectedAlert.id}`);
    try {
      await mobileApi.careAlertResolve({
        params: { id: selectedAlert.id },
        body: {
          expectedRevision: selectedAlert.revision,
          reason: resolutionNote.trim(),
        },
      });
      setAlerts((prev) => prev.filter((item) => item.id !== selectedAlert.id));
      setResolveModalVisible(false);
      setResolutionNote('');
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.alert_resolved'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.alert_action_failed'),
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const confirmDismiss = async () => {
    if (!selectedAlert || busyActionId) return;
    if (!dismissReason.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.reason_required'),
      });
      return;
    }
    setBusyActionId(`dismiss-${selectedAlert.id}`);
    try {
      await mobileApi.careAlertDismiss({
        params: { id: selectedAlert.id },
        body: {
          expectedRevision: selectedAlert.revision,
          reason: dismissReason.trim(),
        },
      });
      setAlerts((prev) => prev.filter((item) => item.id !== selectedAlert.id));
      setDismissModalVisible(false);
      setDismissReason('');
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.alert_dismissed'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.alert_action_failed'),
      });
    } finally {
      setBusyActionId(null);
    }
  };

  const filteredAlerts = alerts.filter((item) => {
    const matchSeverity = severityFilter === 'all' || item.severity === severityFilter;
    const matchStatus = statusFilter === 'all' || item.status === statusFilter;
    return matchSeverity && matchStatus;
  });

  const stats = [
    {
      title: t('mobile.total_patients'),
      value: String(totalEnrolledCount),
      icon: <Users color="#3b82f6" size={22} />,
      bg: 'bg-blue-50 dark:bg-blue-900/30',
      onPress: () => router.push('/(doctor)/patients'),
    },
    {
      title: t('mobile.upcoming'),
      value: String(upcomingConsultCount),
      icon: <CalendarIcon color="#10b981" size={22} />,
      bg: 'bg-emerald-50 dark:bg-emerald-900/30',
      onPress: () => router.push('/(doctor)/consultations'),
    },
    {
      title: t('mobile.doctor_rating_label'),
      value: ratingSummary,
      icon: <Star color="#f59e0b" size={22} />,
      bg: 'bg-yellow-50 dark:bg-yellow-900/30',
      onPress: () => router.push('/(doctor)/profile'),
    },
  ];

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView
        contentContainerStyle={tw('pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={twInstance.color('text-slate-900 dark:text-white')}
          />
        }
      >
        {/* Header */}
        <View style={tw('flex-row justify-between items-center px-6 pt-5 pb-4')}>
          <View style={tw('flex-1 mr-3')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 text-xs')}>
              {t('mobile.good_morning')}
            </Text>
            <Text numberOfLines={1} style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
              {doctorName || t('mobile.doctor_role_label')}
            </Text>
          </View>
          <View style={tw('flex-row items-center gap-2')}>
            <View
              style={tw(
                'flex-row items-center bg-white dark:bg-slate-900 px-3 py-1 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm'
              )}
            >
              <Power color={isOnline ? '#10b981' : '#94a3b8'} size={15} style={tw('mr-1.5')} />
              <Switch
                value={isOnline}
                disabled={togglingOnline}
                onValueChange={(v) => void handleToggleOnline(v)}
                trackColor={{ false: '#cbd5e1', true: '#34d399' }}
                thumbColor="#ffffff"
                style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
              />
            </View>
            <TouchableOpacity
              style={tw(
                'p-2.5 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-slate-200 dark:border-slate-800 relative'
              )}
              onPress={() => router.push('/(doctor)/notifications')}
            >
              <Bell color={twInstance.color('text-slate-900 dark:text-white')} size={20} />
              {unreadNotifications > 0 && (
                <View
                  style={tw(
                    'absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 rounded-full items-center justify-center border-2 border-white dark:border-slate-900'
                  )}
                >
                  <Text style={tw('text-white text-[10px] font-bold')}>
                    {unreadNotifications > 99 ? '99+' : unreadNotifications}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {loading ? (
          <View style={tw('px-6 gap-4 mt-2')}>
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-32 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
          </View>
        ) : errorMsg ? (
          <View style={tw('px-6 mt-4')}>
            <View
              style={tw(
                'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 items-center'
              )}
            >
              <AlertCircle color="#e11d48" size={30} style={tw('mb-2')} />
              <Text style={tw('text-sm font-semibold text-rose-700 dark:text-rose-300 text-center mb-4')}>
                {errorMsg}
              </Text>
              <TouchableOpacity
                onPress={() => void loadDashboard()}
                style={tw('bg-rose-600 px-5 py-2.5 rounded-xl')}
              >
                <Text style={tw('text-white font-bold text-xs')}>{t('mobile.retry')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <>
            {/* KPI Stats */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={tw('px-6 py-2 gap-3')}
            >
              {stats.map((stat) => (
                <TouchableOpacity
                  key={stat.title}
                  onPress={stat.onPress}
                  style={tw(
                    'w-40 bg-white dark:bg-slate-900 p-4 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm'
                  )}
                >
                  <View
                    style={tw(
                      `w-10 h-10 rounded-2xl ${stat.bg} items-center justify-center mb-3`
                    )}
                  >
                    {stat.icon}
                  </View>
                  <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
                    {stat.value}
                  </Text>
                  <Text numberOfLines={1} style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                    {stat.title}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Consultation Check-In Queue */}
            <View style={tw('px-6 mt-5')}>
              <View style={tw('flex-row items-center justify-between mb-3')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.consultation_queue_title')}
                </Text>
                <TouchableOpacity
                  disabled={callingNext || queueEntries.length === 0}
                  onPress={() => void handleCallNext()}
                  style={tw(
                    `bg-brand px-3.5 py-2 rounded-xl flex-row items-center ${
                      callingNext || queueEntries.length === 0 ? 'opacity-50' : ''
                    }`
                  )}
                >
                  {callingNext ? (
                    <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
                  ) : (
                    <PhoneCall color="#0f172a" size={14} style={tw('mr-1.5')} />
                  )}
                  <Text style={tw('text-xs font-bold text-slate-900')}>
                    {t('mobile.call_next_patient')}
                  </Text>
                </TouchableOpacity>
              </View>

              {queueEntries.length === 0 ? (
                <View
                  style={tw(
                    'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex-row items-center justify-between gap-3'
                  )}
                >
                  <View style={tw('flex-row items-center flex-1')}>
                    <Clock color={twInstance.color('text-slate-400')} size={18} style={tw('mr-2.5 shrink-0')} />
                    <Text
                      numberOfLines={1}
                      style={tw('flex-1 text-xs text-slate-500 dark:text-slate-400 leading-4')}
                    >
                      {t('mobile.queue_empty_msg')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(doctor)/consultations')}
                    style={tw('bg-slate-100 dark:bg-slate-800 px-3.5 py-2 rounded-xl shrink-0')}
                  >
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                      {t('mobile.view_all')}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View style={tw('gap-2.5')}>
                  {queueEntries.slice(0, 3).map((entry) => (
                    <TouchableOpacity
                      key={entry.consultationId}
                      onPress={() =>
                        router.push(
                          `/(doctor)/video-call?consultationId=${entry.consultationId}` as never
                        )
                      }
                      style={tw(
                        'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 flex-row items-center justify-between'
                      )}
                    >
                      <View style={tw('flex-row items-center flex-1 mr-2')}>
                        <View
                          style={tw(
                            `w-9 h-9 rounded-full items-center justify-center mr-3 ${
                              entry.isCurrent ? 'bg-emerald-500' : 'bg-blue-100 dark:bg-blue-900/40'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                entry.isCurrent ? 'text-white' : 'text-blue-700 dark:text-blue-300'
                              }`
                            )}
                          >
                            #{entry.queuePosition}
                          </Text>
                        </View>
                        <View style={tw('flex-1')}>
                          <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                            {entry.patientName}
                          </Text>
                          <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                            {entry.scheduledStartAt
                              ? new Date(entry.scheduledStartAt).toLocaleTimeString(dateLocale, {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}{' '}
                            {entry.isLate ? `• ${t('mobile.late_checkin')}` : ''}
                          </Text>
                        </View>
                      </View>
                      <View style={tw('bg-emerald-50 dark:bg-emerald-900/30 px-3 py-1.5 rounded-lg')}>
                        <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                          {entry.isCurrent ? t('mobile.active_session') : t('mobile.waiting')}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </View>
              )}
            </View>

            {/* Priority Care Alerts Inbox */}
            <View style={tw('px-6 mt-6')}>
              <View style={tw('flex-row items-center justify-between mb-3')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.priority_care_alerts')}
                </Text>
                <TouchableOpacity onPress={() => setAllAlertsModalVisible(true)}>
                  <Text style={tw('text-xs font-bold text-brand-dark dark:text-brand-light')}>
                    {t('mobile.view_all')} ({alerts.length})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Filters */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={tw('gap-2 mb-3')}
              >
                {(
                  [
                    { id: 'all', label: t('mobile.all') },
                    { id: 'urgent', label: t('mobile.urgent') },
                    { id: 'attention', label: t('mobile.attention') },
                  ] as const
                ).map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() => setSeverityFilter(tab.id)}
                    style={tw(
                      `px-3.5 py-1.5 rounded-full border items-center justify-center ${
                        severityFilter === tab.id
                          ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`
                    )}
                  >
                    <Text
                      numberOfLines={1}
                      style={tw(
                        `text-xs font-bold ${
                          severityFilter === tab.id
                            ? 'text-white dark:text-slate-900'
                            : 'text-slate-600 dark:text-slate-300'
                        }`
                      )}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
                {(
                  [
                    { id: 'open', label: t('mobile.open_alerts') },
                    { id: 'acknowledged', label: t('mobile.acknowledged_alerts') },
                  ] as const
                ).map((tab) => (
                  <TouchableOpacity
                    key={tab.id}
                    onPress={() =>
                      setStatusFilter((prev) => (prev === tab.id ? 'all' : tab.id))
                    }
                    style={tw(
                      `px-3.5 py-1.5 rounded-full border items-center justify-center ${
                        statusFilter === tab.id
                          ? 'bg-indigo-600 border-indigo-600'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                      }`
                    )}
                  >
                    <Text
                      numberOfLines={1}
                      style={tw(
                        `text-xs font-bold ${
                          statusFilter === tab.id ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                        }`
                      )}
                    >
                      {tab.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {filteredAlerts.length > 0 ? (
                filteredAlerts.map((item) => {
                  const isUrgent = item.severity === 'urgent';
                  return (
                    <View
                      key={item.id}
                      style={tw(
                        `bg-white dark:bg-slate-900 p-4 rounded-3xl shadow-sm mb-3 border ${
                          isUrgent
                            ? 'border-red-200 dark:border-red-900/50'
                            : 'border-amber-200 dark:border-amber-900/50'
                        }`
                      )}
                    >
                      <View style={tw('flex-row justify-between items-start gap-2 mb-2')}>
                        <View style={tw('flex-row items-center flex-wrap gap-1.5')}>
                          <View
                            style={tw(
                              `px-2.5 py-0.5 rounded-md ${
                                isUrgent ? 'bg-red-500' : 'bg-amber-500'
                              }`
                            )}
                          >
                            <Text style={tw('text-white text-[10px] font-bold uppercase')}>
                              {isUrgent ? t('mobile.urgent') : t('mobile.attention')}
                            </Text>
                          </View>
                          <View
                            style={tw(
                              `px-2.5 py-0.5 rounded-md ${
                                item.status === 'acknowledged'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                  : 'bg-slate-100 dark:bg-slate-800'
                              }`
                            )}
                          >
                            <Text
                              style={tw(
                                `text-[10px] font-bold uppercase ${
                                  item.status === 'acknowledged'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`
                              )}
                            >
                              {item.status === 'acknowledged'
                                ? t('mobile.status_acknowledged')
                                : t('mobile.status_open')}
                            </Text>
                          </View>
                        </View>
                        <Text style={tw('text-xs text-slate-400')}>
                          {item.detectedAt
                            ? new Date(item.detectedAt).toLocaleTimeString(dateLocale, {
                                hour: '2-digit',
                                minute: '2-digit',
                              })
                            : '—'}
                        </Text>
                      </View>

                      <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1')}>
                        {item.name}
                      </Text>

                      <View style={tw('flex-row flex-wrap gap-1.5 mb-3')}>
                        {item.reasonCodes.length > 0 ? (
                          item.reasonCodes.map((code) => (
                            <View
                              key={code}
                              style={tw(
                                'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg'
                              )}
                            >
                              <Text style={tw('text-xs font-medium text-slate-700 dark:text-slate-200')}>
                                {formatCodeLabel(code)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                            {t('mobile.clinical_threshold_alert')}
                          </Text>
                        )}
                      </View>

                      {item.linkedConsultationId && (
                        <View
                          style={tw(
                            'flex-row items-center bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-lg self-start mb-3'
                          )}
                        >
                          <CheckCircle size={12} color="#10b981" style={tw('mr-1')} />
                          <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                            {t('mobile.consultation_created')}
                          </Text>
                        </View>
                      )}

                      <View style={tw('flex-row gap-2 mb-2')}>
                        {item.status === 'open' && (
                          <TouchableOpacity
                            disabled={busyActionId !== null}
                            onPress={() => void handleAcknowledge(item)}
                            style={tw(
                              `flex-1 bg-indigo-50 dark:bg-indigo-900/30 py-2.5 rounded-xl flex-row justify-center items-center border border-indigo-200 dark:border-indigo-800 ${
                                busyActionId === `ack-${item.id}` ? 'opacity-60' : ''
                              }`
                            )}
                          >
                            <Eye color="#6366f1" size={15} style={tw('mr-1.5')} />
                            <Text style={tw('text-indigo-700 dark:text-indigo-300 font-bold text-xs')}>
                              {t('mobile.acknowledge_alert')}
                            </Text>
                          </TouchableOpacity>
                        )}
                        <TouchableOpacity
                          disabled={busyActionId !== null}
                          onPress={() => void handleCreateConsultationFromAlert(item)}
                          style={tw(
                            `flex-1 bg-emerald-50 dark:bg-emerald-900/30 py-2.5 rounded-xl flex-row justify-center items-center border border-emerald-200 dark:border-emerald-800 ${
                              busyActionId === `consult-${item.id}` ? 'opacity-60' : ''
                            }`
                          )}
                        >
                          <Stethoscope color="#10b981" size={15} style={tw('mr-1.5')} />
                          <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold text-xs')}>
                            {t('mobile.create_consult_from_alert')}
                          </Text>
                        </TouchableOpacity>
                      </View>

                      <View style={tw('flex-row gap-2.5')}>
                        <TouchableOpacity
                          disabled={busyActionId !== null}
                          onPress={() => {
                            setSelectedAlert(item);
                            setResolutionNote('');
                            setResolveModalVisible(true);
                          }}
                          style={tw(
                            'flex-1 bg-brand py-2.5 rounded-xl flex-row justify-center items-center'
                          )}
                        >
                          <CheckCircle color="#0f172a" size={16} style={tw('mr-1.5')} />
                          <Text style={tw('text-slate-900 font-bold text-xs')}>
                            {t('mobile.resolve')}
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          disabled={busyActionId !== null}
                          onPress={() => {
                            setSelectedAlert(item);
                            setDismissReason('');
                            setDismissModalVisible(true);
                          }}
                          style={tw(
                            'flex-1 bg-slate-100 dark:bg-slate-800 py-2.5 rounded-xl flex-row justify-center items-center border border-slate-200 dark:border-slate-700'
                          )}
                        >
                          <XCircle
                            color={twInstance.color('text-slate-500 dark:text-slate-400')}
                            size={16}
                            style={tw('mr-1.5')}
                          />
                          <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>
                            {t('mobile.dismiss')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  );
                })
              ) : (
                <View
                  style={tw(
                    'items-center justify-center py-8 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200 dark:border-slate-800 border-dashed'
                  )}
                >
                  <CheckCircle color="#10b981" size={28} style={tw('mb-2')} />
                  <Text style={tw('text-slate-600 dark:text-slate-300 font-medium text-sm')}>
                    {t('mobile.no_care_alerts')}
                  </Text>
                </View>
              )}
            </View>
          </>
        )}
      </ScrollView>

      {/* Resolve Alert Modal */}
      <Modal
        visible={resolveModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setResolveModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-3')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.resolve_care_alert')}
              </Text>
              <TouchableOpacity onPress={() => setResolveModalVisible(false)}>
                <X color={twInstance.color('text-slate-400')} size={20} />
              </TouchableOpacity>
            </View>
            <Text style={tw('text-xs text-slate-500 mb-3')}>{selectedAlert?.name}</Text>
            <TextInput
              value={resolutionNote}
              onChangeText={setResolutionNote}
              placeholder={t('mobile.enter_clinical_note_placeholder')}
              placeholderTextColor="#94a3b8"
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white h-24 mb-4'
              )}
              textAlignVertical="top"
            />
            <TouchableOpacity
              disabled={busyActionId !== null}
              onPress={() => void confirmResolve()}
              style={tw('bg-brand py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('font-bold text-slate-900')}>{t('mobile.resolve')}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Dismiss Alert Modal */}
      <Modal
        visible={dismissModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setDismissModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-3')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.dismiss_care_alert')}
              </Text>
              <TouchableOpacity onPress={() => setDismissModalVisible(false)}>
                <X color={twInstance.color('text-slate-400')} size={20} />
              </TouchableOpacity>
            </View>
            <View style={tw('flex-row flex-wrap gap-2 mb-3')}>
              {dismissPresets.map((p) => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => setDismissReason(p.label)}
                  style={tw(
                    `px-3 py-1.5 rounded-full border ${
                      dismissReason === p.label
                        ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`
                  )}
                >
                  <Text
                    style={tw(
                      `text-xs font-bold ${
                        dismissReason === p.label
                          ? 'text-white dark:text-slate-900'
                          : 'text-slate-700 dark:text-slate-200'
                      }`
                    )}
                  >
                    {p.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={dismissReason}
              onChangeText={setDismissReason}
              placeholder={t('mobile.dismissal_reason_label')}
              placeholderTextColor="#94a3b8"
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white h-24 mb-4'
              )}
              textAlignVertical="top"
            />
            <TouchableOpacity
              disabled={busyActionId !== null}
              onPress={() => void confirmDismiss()}
              style={tw('bg-slate-900 dark:bg-brand py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('font-bold text-white dark:text-slate-900')}>
                {t('mobile.dismiss')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <CareAlertsModal
        visible={allAlertsModalVisible}
        onClose={() => setAllAlertsModalVisible(false)}
        onChanged={() => void loadDashboard()}
      />
    </SafeAreaView>
  );
}
