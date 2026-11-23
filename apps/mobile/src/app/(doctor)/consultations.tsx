import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  AlertCircle,
  Calendar,
  Check,
  CheckCircle2,
  Clock,
  FileText,
  Flag,
  MessageCircle,
  PhoneCall,
  Play,
  RefreshCw,
  Search,
  Sparkles,
  UserCheck,
  UserX,
  Users,
  Video,
  X,
} from 'lucide-react-native';
import {
  connectConsultationsSocket,
  consultationsSocket,
  generateIdempotencyKey,
  mobileApi,
  normalizePaginatedList,
  SOCKET_EVENTS,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Skeleton } from '@/components/ui/Skeleton';
import { AppModalToast } from '@/components/ui/AppToast';
import { AiSummaryModal, ClinicalNotesModal } from '@/components/modals';

type TabKey = 'queue' | 'all';
type StatusFilter = 'all' | 'pending' | 'waiting' | 'in_consultation' | 'completed' | 'cancelled';

type RawRecord = Record<string, unknown>;

interface ConsultationRow {
  id: string;
  patientId: string;
  patientName: string;
  mode: string;
  requestStatus: string;
  sessionStatus: string;
  scheduledStartAt: string;
  reason: string;
  doctorNotes: string;
  checkedInAt?: string;
}

interface QueueRow {
  consultationId: string;
  position: number;
  patientId: string;
  patientName: string;
  scheduledStartAt: string;
  checkedInAt: string;
  waitMinutes: number;
  sessionStatus: string;
  mode: string;
}

const REPORT_TYPES: Array<{ value: FeTypes.ViolationsCreateRequest['report_type']; labelKey: string; defaultLabel: string }> = [
  { value: 'harassment', labelKey: 'mobile.report_type_harassment', defaultLabel: 'Harassment' },
  { value: 'inappropriate_content', labelKey: 'mobile.report_type_inappropriate', defaultLabel: 'Inappropriate behavior' },
  { value: 'spam', labelKey: 'mobile.report_type_spam', defaultLabel: 'Spam' },
  { value: 'fraud', labelKey: 'mobile.report_type_fraud', defaultLabel: 'Fraud' },
  { value: 'other', labelKey: 'mobile.report_type_other', defaultLabel: 'Other' },
];

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function resolveIdAndName(field: unknown, fallbackLabel: string): { id: string; name: string } {
  if (typeof field === 'string') {
    return { id: field, name: fallbackLabel };
  }
  if (field && typeof field === 'object') {
    const obj = field as RawRecord;
    const id = String(obj._id ?? obj.id ?? obj.userId ?? '');
    const fullName =
      typeof obj.fullName === 'string' && obj.fullName.trim()
        ? obj.fullName.trim()
        : [obj.firstName, obj.lastName]
            .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
            .join(' ')
            .trim() ||
          (typeof obj.email === 'string' ? obj.email : fallbackLabel);
    return { id, name: fullName || fallbackLabel };
  }
  return { id: '', name: fallbackLabel };
}

function mapRawConsultation(raw: RawRecord, fallbackPatient: string): ConsultationRow {
  const patient = resolveIdAndName(raw.patientId, fallbackPatient);
  return {
    id: String(raw._id ?? raw.id ?? ''),
    patientId: patient.id,
    patientName: patient.name,
    mode: String(raw.mode ?? 'video'),
    requestStatus: String(raw.requestStatus ?? 'pending'),
    sessionStatus: String(raw.sessionStatus ?? 'scheduled'),
    scheduledStartAt: String(raw.scheduledStartAt ?? raw.createdAt ?? ''),
    reason: String(raw.reason ?? raw.patientNotes ?? ''),
    doctorNotes: String(raw.doctorNotes ?? ''),
    checkedInAt: typeof raw.checkedInAt === 'string' ? raw.checkedInAt : undefined,
  };
}

export default function DoctorConsultationsScreen() {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useSafeRouter();

  const [activeTab, setActiveTab] = useState<TabKey>('queue');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const [queueEntries, setQueueEntries] = useState<QueueRow[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<ConsultationRow[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busyActionKey, setBusyActionKey] = useState<string | null>(null);

  const [notesModalTarget, setNotesModalTarget] = useState<{
    consultationId: string;
    patientId: string;
    patientName: string;
  } | null>(null);

  const [aiModalTarget, setAiModalTarget] = useState<{
    enrollmentId: string;
    patientName: string;
  } | null>(null);
  const [loadingAiForId, setLoadingAiForId] = useState<string | null>(null);

  const [declineModalTarget, setDeclineModalTarget] = useState<ConsultationRow | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  const [completeModalTarget, setCompleteModalTarget] = useState<ConsultationRow | null>(null);
  const [completeNotes, setCompleteNotes] = useState('');

  const [reportTarget, setReportTarget] = useState<ConsultationRow | null>(null);
  const [reportType, setReportType] = useState<FeTypes.ViolationsCreateRequest['report_type']>('inappropriate_content');
  const [reportReason, setReportReason] = useState('');

  const patientNameCacheRef = useRef<Map<string, string>>(new Map());
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const hydrateMissingPatientNames = useCallback(
    async (rows: ConsultationRow[]): Promise<ConsultationRow[]> => {
      const unknownLabel = t('mobile.patient_fallback', 'Patient');
      const missingIds = Array.from(
        new Set(
          rows
            .filter((r) => r.patientId && r.patientName === unknownLabel && !patientNameCacheRef.current.has(r.patientId))
            .map((r) => r.patientId),
        ),
      );
      if (missingIds.length > 0) {
        await Promise.all(
          missingIds.slice(0, 10).map(async (pid) => {
            try {
              const profileRes = await mobileApi.usersFindOne({ params: { id: pid } });
              const outer = ((profileRes as unknown as { data?: RawRecord })?.data ?? profileRes) as RawRecord;
              const data =
                outer?.user && typeof outer.user === 'object' ? (outer.user as RawRecord) : outer;
              const name =
                (typeof data?.fullName === 'string' && data.fullName.trim()) ||
                [data?.firstName, data?.lastName]
                  .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                  .join(' ')
                  .trim();
              if (name) {
                patientNameCacheRef.current.set(pid, name);
              }
            } catch {
              // Keep fallback label if profile lookup fails
            }
          }),
        );
      }
      return rows.map((row) => ({
        ...row,
        patientName: patientNameCacheRef.current.get(row.patientId) ?? row.patientName,
      }));
    },
    [t],
  );

  const fetchData = useCallback(
    async (targetPage = 1, append = false) => {
      try {
        setLoadError(null);
        const query: NonNullable<FeTypes.ConsultationsFindAllRequest['query']> = {
          page: targetPage,
          limit: 15,
          sortOrder: -1,
        };
        if (activeTab === 'all') {
          if (statusFilter === 'pending') {
            query.requestStatus = 'pending';
          } else if (statusFilter === 'waiting') {
            query.sessionStatus = 'waiting';
          } else if (statusFilter === 'in_consultation') {
            query.sessionStatus = 'in_consultation';
          } else if (statusFilter === 'completed') {
            query.sessionStatus = 'completed';
          } else if (statusFilter === 'cancelled') {
            query.requestStatus = 'cancelled';
          }
        }

        const [queueRes, listRes] = await Promise.all([
          !append ? mobileApi.doctorQueueList({ query: { page: 1, limit: 20 } }) : Promise.resolve(null),
          mobileApi.consultationsFindAll({ query }),
        ]);

        if (queueRes) {
          const rawQueue = Array.isArray(queueRes.data) ? queueRes.data : [];
          const mappedQueue: QueueRow[] = rawQueue.map((entry, idx) => {
            const e = entry as unknown as RawRecord;
            const rawPatient = e.patient as RawRecord | undefined;
            const pid = String(rawPatient?.id ?? rawPatient?._id ?? e.patientId ?? '');
            const resolvedName =
              (typeof rawPatient?.fullName === 'string' && rawPatient.fullName.trim()) ||
              [rawPatient?.firstName, rawPatient?.lastName]
                .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
                .join(' ')
                .trim() ||
              patientNameCacheRef.current.get(pid) ||
              t('mobile.patient_fallback', 'Patient');
            if (pid && resolvedName !== t('mobile.patient_fallback', 'Patient')) {
              patientNameCacheRef.current.set(pid, resolvedName);
            }
            const checkedInAt = String(e.queueJoinedAt ?? e.checkedInAt ?? '');
            const parsedJoined = checkedInAt ? new Date(checkedInAt).getTime() : Number.NaN;
            const waitMinutes =
              typeof e.waitMinutes === 'number'
                ? e.waitMinutes
                : Number.isFinite(parsedJoined)
                  ? Math.max(0, Math.round((Date.now() - parsedJoined) / 60_000))
                  : 0;
            return {
              consultationId: String(e.consultationId ?? e.id ?? e._id ?? ''),
              position:
                typeof e.queuePosition === 'number'
                  ? e.queuePosition
                  : typeof e.position === 'number'
                    ? e.position
                    : idx + 1,
              patientId: pid,
              patientName: resolvedName,
              scheduledStartAt: String(e.scheduledStartAt ?? ''),
              checkedInAt,
              waitMinutes,
              sessionStatus: String(e.sessionStatus ?? 'waiting'),
              mode: String(e.mode ?? 'scheduled'),
            };
          });
          setQueueEntries(mappedQueue);
          const cur = queueRes.currentSession as unknown as RawRecord | null | undefined;
          setCurrentSessionId(cur ? String(cur.consultationId ?? cur.id ?? cur._id ?? '') || null : null);
        }

        const normalized = normalizePaginatedList<RawRecord>(listRes);
        const mappedList = await hydrateMissingPatientNames(
          normalized.items.map((item) => mapRawConsultation(item, t('mobile.patient_fallback', 'Patient'))),
        );
        setConsultations((prev) => (append ? [...prev, ...mappedList] : mappedList));
        setPage(targetPage);
        setHasMore(Boolean(normalized.hasNextPage));
      } catch (err) {
        if (!append) {
          setLoadError(extractApiErrorMessage(err));
        } else {
          Toast.show({
            type: 'error',
            text1: t('mobile.error_title', 'Notice'),
            text2: extractApiErrorMessage(err),
          });
        }
      }
    },
    [activeTab, hydrateMissingPatientNames, statusFilter, t],
  );

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    fetchData(1, false).finally(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [fetchData]);

  useEffect(() => {
    connectConsultationsSocket();
    const onChanged = () => {
      fetchData(1, false);
    };
    consultationsSocket.on(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onChanged);
    consultationsSocket.on(SOCKET_EVENTS.QUEUE_CHANGED, onChanged);
    consultationsSocket.on(SOCKET_EVENTS.QUEUE_CALLED, onChanged);
    return () => {
      consultationsSocket.off(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onChanged);
      consultationsSocket.off(SOCKET_EVENTS.QUEUE_CHANGED, onChanged);
      consultationsSocket.off(SOCKET_EVENTS.QUEUE_CALLED, onChanged);
    };
  }, [fetchData]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await fetchData(1, false);
    setIsRefreshing(false);
  }, [fetchData]);

  const handleLoadMore = useCallback(async () => {
    if (isLoadingMore || !hasMore) return;
    setIsLoadingMore(true);
    await fetchData(page + 1, true);
    setIsLoadingMore(false);
  }, [fetchData, hasMore, isLoadingMore, page]);

  const runAction = useCallback(
    async (actionKey: string, task: () => Promise<unknown>, successMessage?: string) => {
      if (busyActionKey) return;
      setBusyActionKey(actionKey);
      try {
        await task();
        if (successMessage) {
          Toast.show({ type: 'success', text1: successMessage });
        }
        await fetchData(1, false);
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: t('mobile.action_failed', 'Action failed'),
          text2: extractApiErrorMessage(err),
        });
      } finally {
        setBusyActionKey(null);
      }
    },
    [busyActionKey, fetchData, t],
  );

  const handleCallNext = useCallback(async () => {
    if (busyActionKey || queueEntries.length === 0) return;
    setBusyActionKey('call-next');
    try {
      const res = await mobileApi.doctorQueueCallNext({
        headers: { 'Idempotency-Key': generateIdempotencyKey('call-next') },
      });
      const called = (res?.data ?? {}) as unknown as RawRecord;
      const calledId = String(called.id ?? called.consultationId ?? called._id ?? '');
      Toast.show({
        type: 'success',
        text1: t('mobile.called_next_patient', 'Called next patient in queue'),
      });
      await fetchData(1, false);
      if (calledId) {
        router.push(`/(doctor)/video-call?consultationId=${calledId}`);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.no_waiting_patient', 'No waiting patient in queue'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setBusyActionKey(null);
    }
  }, [busyActionKey, fetchData, queueEntries.length, router, t]);

  const handleOpenAiSummary = useCallback(
    async (row: ConsultationRow) => {
      if (loadingAiForId || !row.patientId) return;
      setLoadingAiForId(row.id);
      try {
        const res = await mobileApi.careEnrollmentList({
          query: { patientId: row.patientId, status: 'active', limit: 1 },
        });
        const normalized = normalizePaginatedList<RawRecord>(res);
        const enrollmentId = String(normalized.items[0]?._id ?? normalized.items[0]?.id ?? '');
        if (!enrollmentId) {
          Toast.show({
            type: 'info',
            text1: t('mobile.ai_summary_unavailable_title', 'AI Summary Unavailable'),
            text2: t('mobile.no_active_program_for_ai', 'No active care program for pre-visit summary.'),
          });
          return;
        }
        setAiModalTarget({ enrollmentId, patientName: row.patientName });
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: t('mobile.error_title', 'Notice'),
          text2: extractApiErrorMessage(err),
        });
      } finally {
        setLoadingAiForId(null);
      }
    },
    [loadingAiForId, t],
  );

  const handleSubmitDecline = useCallback(async () => {
    if (!declineModalTarget || busyActionKey) return;
    const id = declineModalTarget.id;
    const reason = declineReason.trim();
    setDeclineModalTarget(null);
    setDeclineReason('');
    await runAction(
      `decline-${id}`,
      () => mobileApi.consultationsDecline({ params: { id }, body: reason ? { reason } : {} }),
      t('mobile.request_declined', 'Consultation request declined'),
    );
  }, [busyActionKey, declineModalTarget, declineReason, runAction, t]);

  const handleSubmitComplete = useCallback(async () => {
    if (!completeModalTarget || busyActionKey) return;
    const id = completeModalTarget.id;
    const notes = completeNotes.trim();
    setCompleteModalTarget(null);
    setCompleteNotes('');
    await runAction(
      `complete-${id}`,
      () => mobileApi.consultationsComplete({ params: { id }, body: notes ? { doctorNotes: notes } : {} }),
      t('mobile.consultation_completed', 'Consultation marked as completed'),
    );
  }, [busyActionKey, completeModalTarget, completeNotes, runAction, t]);

  const handleSubmitReport = useCallback(async () => {
    if (!reportTarget || !reportTarget.patientId || busyActionKey) return;
    const trimmed = reportReason.trim();
    if (!trimmed) {
      Toast.show({
        type: 'info',
        text1: t('mobile.enter_report_reason', 'Please enter a reason'),
      });
      return;
    }
    const patientId = reportTarget.patientId;
    const id = reportTarget.id;
    setReportTarget(null);
    setReportReason('');
    await runAction(
      `report-${id}`,
      async () => {
        await mobileApi.violationsCreate({
          reported_user_id: patientId,
          report_type: reportType,
          reason: trimmed,
        });
      },
      t('mobile.report_submitted', 'Violation report submitted'),
    );
  }, [busyActionKey, reportReason, reportTarget, reportType, runAction, t]);

  const liveItemCount = useMemo(() => {
    const ids = new Set<string>();
    for (const q of queueEntries) {
      if (q.consultationId) ids.add(q.consultationId);
    }
    for (const c of consultations) {
      if (
        c.id &&
        (c.requestStatus === 'pending' ||
          c.sessionStatus === 'waiting' ||
          c.sessionStatus === 'in_consultation')
      ) {
        ids.add(c.id);
      }
    }
    return ids.size;
  }, [consultations, queueEntries]);

  const filteredConsultations = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const base =
      activeTab === 'queue'
        ? consultations.filter(
            (c) =>
              c.requestStatus === 'pending' ||
              c.sessionStatus === 'waiting' ||
              c.sessionStatus === 'in_consultation',
          )
        : consultations;
    if (!q) return base;
    return base.filter(
      (c) =>
        c.patientName.toLowerCase().includes(q) ||
        c.reason.toLowerCase().includes(q) ||
        c.id.toLowerCase().includes(q),
    );
  }, [activeTab, consultations, searchQuery]);

  const formatDateTime = (iso: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleString(dateLocale, {
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusChip = (row: ConsultationRow) => {
    if (row.requestStatus === 'pending') {
      return {
        label: t('mobile.status_pending_request', 'Pending Approval'),
        bg: 'bg-amber-50 dark:bg-amber-950/50 border-amber-200 dark:border-amber-800',
        text: 'text-amber-700 dark:text-amber-300',
      };
    }
    if (row.requestStatus === 'declined') {
      return {
        label: t('mobile.status_declined', 'Declined'),
        bg: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
        text: 'text-red-700 dark:text-red-300',
      };
    }
    switch (row.sessionStatus) {
      case 'in_consultation':
        return {
          label: t('mobile.status_in_progress', 'In Progress'),
          bg: 'bg-emerald-50 dark:bg-emerald-950/50 border-emerald-200 dark:border-emerald-800',
          text: 'text-emerald-700 dark:text-emerald-300',
        };
      case 'waiting':
        return {
          label: t('mobile.status_waiting_room', 'In Waiting Room'),
          bg: 'bg-blue-50 dark:bg-blue-950/50 border-blue-200 dark:border-blue-800',
          text: 'text-blue-700 dark:text-blue-300',
        };
      case 'completed':
        return {
          label: t('mobile.status_completed', 'Completed'),
          bg: 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700',
          text: 'text-slate-600 dark:text-slate-300',
        };
      case 'no_show':
        return {
          label: t('mobile.status_no_show', 'No-Show'),
          bg: 'bg-orange-50 dark:bg-orange-950/50 border-orange-200 dark:border-orange-800',
          text: 'text-orange-700 dark:text-orange-300',
        };
      case 'cancelled':
        return {
          label: t('mobile.status_cancelled', 'Cancelled'),
          bg: 'bg-red-50 dark:bg-red-950/50 border-red-200 dark:border-red-800',
          text: 'text-red-700 dark:text-red-300',
        };
      default:
        return {
          label: t('mobile.status_scheduled', 'Scheduled'),
          bg: 'bg-teal-50 dark:bg-teal-950/50 border-teal-200 dark:border-teal-800',
          text: 'text-teal-700 dark:text-teal-300',
        };
    }
  };

  const renderSkeleton = () => (
    <View style={tw('px-5 pt-4 gap-3')}>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-36 w-full rounded-2xl" />
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      {/* Header */}
      <View style={tw('px-5 pt-4 pb-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <View style={tw('flex-row items-center justify-between mb-3')}>
          <View style={tw('flex-1 pr-3')}>
            <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
              {t('mobile.consultations_title', 'Consultations & Queue')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
              {t('mobile.consultations_subtitle', 'Manage waiting room queue, approvals and active sessions')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={handleCallNext}
            disabled={Boolean(busyActionKey) || queueEntries.length === 0}
            style={[
              tw('flex-row items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-teal-600'),
              (busyActionKey === 'call-next' || queueEntries.length === 0) && { opacity: 0.5 },
            ]}
          >
            {busyActionKey === 'call-next' ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <PhoneCall size={15} color="#ffffff" />
            )}
            <Text style={tw('text-xs font-bold text-white')}>
              {t('mobile.call_next', 'Call Next')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Primary Tabs */}
        <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-3')}>
          {(['queue', 'all'] as const).map((tab) => {
            const active = activeTab === tab;
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={tw(
                  `flex-1 py-2 rounded-lg items-center ${active ? 'bg-white dark:bg-slate-900' : ''}`,
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-bold ${active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'}`,
                  )}
                >
                  {tab === 'queue'
                    ? `${t('mobile.live_activity_tab', 'Live & Pending')} (${liveItemCount})`
                    : t('mobile.all_consultations', 'All Consultations')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        {/* Search + Filter */}
        <View style={tw('flex-row items-center gap-2 bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2')}>
          <Search size={16} color={isDark ? '#94a3b8' : '#64748b'} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={t('mobile.search_consultations_placeholder', 'Search patient or reason...')}
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            style={tw('flex-1 text-sm text-slate-900 dark:text-white py-0')}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X size={15} color="#94a3b8" />
            </TouchableOpacity>
          )}
        </View>

        {activeTab === 'all' && (
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={tw('gap-2 pt-3')}
          >
            {(
              [
                { key: 'all', label: t('mobile.filter_all', 'All') },
                { key: 'pending', label: t('mobile.status_pending_request', 'Pending') },
                { key: 'waiting', label: t('mobile.status_waiting_room', 'Waiting') },
                { key: 'in_consultation', label: t('mobile.status_in_progress', 'Active') },
                { key: 'completed', label: t('mobile.status_completed', 'Completed') },
                { key: 'cancelled', label: t('mobile.status_cancelled', 'Cancelled') },
              ] as const
            ).map((chip) => {
              const selected = statusFilter === chip.key;
              return (
                <TouchableOpacity
                  key={chip.key}
                  onPress={() => setStatusFilter(chip.key)}
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
          </ScrollView>
        )}
      </View>

      {isLoading ? (
        renderSkeleton()
      ) : loadError ? (
        <View style={tw('flex-1 items-center justify-center px-8')}>
          <AlertCircle size={40} color="#ef4444" />
          <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
            {t('mobile.load_error_title', 'Unable to load consultations')}
          </Text>
          <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>{loadError}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsLoading(true);
              fetchData(1, false).finally(() => setIsLoading(false));
            }}
            style={tw('mt-4 px-5 py-2.5 rounded-xl bg-teal-600 flex-row items-center gap-2')}
          >
            <RefreshCw size={15} color="#ffffff" />
            <Text style={tw('text-sm font-bold text-white')}>{t('mobile.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={tw('px-5 pt-4 pb-24 gap-3')}
          refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
        >
          {/* Current Session Banner */}
          {currentSessionId && (
            <TouchableOpacity
              onPress={() => router.push(`/(doctor)/video-call?consultationId=${currentSessionId}`)}
              style={tw(
                'p-4 rounded-2xl bg-emerald-600 flex-row items-center justify-between',
              )}
            >
              <View style={tw('flex-row items-center gap-3 flex-1 pr-2')}>
                <View style={tw('w-10 h-10 rounded-full bg-white/20 items-center justify-center')}>
                  <Video size={20} color="#ffffff" />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-bold text-emerald-100 uppercase')}>
                    {t('mobile.active_session_live', 'Active Session in Progress')}
                  </Text>
                  <Text style={tw('text-sm font-bold text-white mt-0.5')} numberOfLines={1}>
                    {t('mobile.tap_to_rejoin_room', 'Tap to open video consultation room')}
                  </Text>
                </View>
              </View>
              <Play size={18} color="#ffffff" />
            </TouchableOpacity>
          )}

          {/* Checked-in Waiting Queue */}
          {activeTab === 'queue' && (
            <View
              style={[
                tw('bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800'),
                {
                  shadowColor: '#0f172a',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.05,
                  shadowRadius: 8,
                  elevation: 2,
                },
              ]}
            >
              <View style={tw('mb-3')}>
                <View style={tw('flex-row items-center justify-between')}>
                  <View style={tw('flex-row items-center gap-2')}>
                    <Users size={18} color="#0d9488" />
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                      {t('mobile.waiting_room_queue', 'Checked-in Waiting Queue')}
                    </Text>
                  </View>
                  <Text style={tw('text-xs font-semibold text-teal-600 dark:text-teal-400')}>
                    {queueEntries.length} {t('mobile.patients_unit', 'patients')}
                  </Text>
                </View>
                <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-1')}>
                  {t(
                    'mobile.checked_in_queue_hint',
                    'Includes booked scheduled patients who have checked into the waiting room.',
                  )}
                </Text>
              </View>

              {queueEntries.length === 0 ? (
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 py-2')}>
                  {t('mobile.waiting_room_empty', 'No patients currently checked into the waiting room.')}
                </Text>
              ) : (
                <View style={tw('gap-2.5')}>
                  {queueEntries.map((entry) => (
                    <View
                      key={entry.consultationId}
                      style={tw(
                        'p-3 rounded-xl bg-slate-50 dark:bg-slate-800/70 border border-slate-100 dark:border-slate-700 flex-row items-center justify-between',
                      )}
                    >
                      <View style={tw('flex-row items-center gap-3 flex-1 pr-2')}>
                        <View style={tw('w-8 h-8 rounded-full bg-teal-600 items-center justify-center')}>
                          <Text style={tw('text-xs font-bold text-white')}>#{entry.position}</Text>
                        </View>
                        <View style={tw('flex-1')}>
                          <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                            {entry.patientName}
                          </Text>
                          <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                            {t('mobile.wait_minutes_label', {
                              defaultValue: 'Waiting {{count}} min',
                              count: entry.waitMinutes,
                            })}
                          </Text>
                        </View>
                      </View>

                      <View style={tw('flex-row items-center gap-2')}>
                        <TouchableOpacity
                          onPress={() => router.push(`/(doctor)/chat/${entry.consultationId}`)}
                          style={tw('p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700')}
                        >
                          <MessageCircle size={15} color="#0d9488" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => router.push(`/(doctor)/video-call?consultationId=${entry.consultationId}`)}
                          style={tw('px-3 py-2 rounded-lg bg-teal-600')}
                        >
                          <Text style={tw('text-xs font-bold text-white')}>
                            {t('mobile.join_now', 'Join')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          )}

          {activeTab === 'queue' && (
            <View style={tw('flex-row items-center justify-between pt-1 px-0.5')}>
              <Text style={tw('flex-1 mr-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                {t('mobile.active_and_pending_section_title', 'Pending Requests & Active Sessions')}
              </Text>
              <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400')}>
                {filteredConsultations.length}
              </Text>
            </View>
          )}

          {/* Consultations List */}
          {filteredConsultations.length === 0 ? (
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-2xl p-8 items-center border border-slate-100 dark:border-slate-800',
              )}
            >
              <Calendar size={34} color="#94a3b8" />
              <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-100 mt-3')}>
                {t('mobile.no_consultations_found', 'No consultations match this view')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
                {t('mobile.pull_to_refresh_hint', 'Pull down to refresh or adjust filters.')}
              </Text>
            </View>
          ) : (
            filteredConsultations.map((row) => {
              const chip = getStatusChip(row);
              const isBusy = Boolean(busyActionKey);
              const isPending = row.requestStatus === 'pending';
              const canOperate =
                row.requestStatus === 'accepted' &&
                (row.sessionStatus === 'not_started' ||
                  row.sessionStatus === 'scheduled' ||
                  row.sessionStatus === 'waiting' ||
                  row.sessionStatus === 'in_consultation');
              const isInProgress = row.sessionStatus === 'in_consultation';
              const isFinished =
                row.sessionStatus === 'completed' ||
                row.sessionStatus === 'no_show' ||
                row.requestStatus === 'cancelled' ||
                row.requestStatus === 'expired' ||
                row.requestStatus === 'declined';

              return (
                <View
                  key={row.id}
                  style={[
                    tw('bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-100 dark:border-slate-800'),
                    {
                      shadowColor: '#0f172a',
                      shadowOffset: { width: 0, height: 2 },
                      shadowOpacity: 0.05,
                      shadowRadius: 8,
                      elevation: 2,
                    },
                  ]}
                >
                  <View style={tw('flex-row items-start justify-between gap-2')}>
                    <View style={tw('flex-row items-center gap-3 flex-1')}>
                      <View style={tw('w-11 h-11 rounded-full bg-teal-100 dark:bg-teal-900/60 items-center justify-center')}>
                        <Text style={tw('text-sm font-bold text-teal-800 dark:text-teal-200')}>
                          {getInitials(row.patientName)}
                        </Text>
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={tw('text-base font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                          {row.patientName}
                        </Text>
                        <View style={tw('flex-row items-center gap-1.5 mt-0.5')}>
                          <Clock size={12} color="#64748b" />
                          <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                            {formatDateTime(row.scheduledStartAt)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    <View style={tw(`px-2.5 py-1 rounded-full border ${chip.bg}`)}>
                      <Text style={tw(`text-[11px] font-bold ${chip.text}`)}>{chip.label}</Text>
                    </View>
                  </View>

                  {row.reason ? (
                    <View style={tw('mt-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/70')}>
                      <Text style={tw('text-xs text-slate-600 dark:text-slate-300')} numberOfLines={2}>
                        {row.reason}
                      </Text>
                    </View>
                  ) : null}

                  {/* Primary & Secondary Action Rows */}
                  <View style={tw('flex-row flex-wrap items-center gap-2 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800')}>
                    {isPending && (
                      <>
                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() =>
                            runAction(
                              `accept-${row.id}`,
                              () => mobileApi.consultationsAccept({ params: { id: row.id } }),
                              t('mobile.consultation_accepted', 'Consultation request accepted'),
                            )
                          }
                          style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600')}
                        >
                          <Check size={14} color="#ffffff" />
                          <Text style={tw('text-xs font-bold text-white')}>
                            {t('mobile.accept', 'Accept')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() => {
                            setDeclineReason('');
                            setDeclineModalTarget(row);
                          }}
                          style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60 border border-red-200 dark:border-red-800')}
                        >
                          <X size={14} color="#dc2626" />
                          <Text style={tw('text-xs font-bold text-red-600 dark:text-red-300')}>
                            {t('mobile.decline', 'Decline')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {canOperate && (
                      <>
                        {!isInProgress && (
                          <TouchableOpacity
                            disabled={isBusy}
                            onPress={() =>
                              runAction(
                                `start-${row.id}`,
                                () => mobileApi.consultationsStart({ params: { id: row.id } }),
                                t('mobile.consultation_started', 'Consultation session started'),
                              )
                            }
                            style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-600')}
                          >
                            <Play size={14} color="#ffffff" />
                            <Text style={tw('text-xs font-bold text-white')}>
                              {t('mobile.start_session', 'Start')}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <TouchableOpacity
                          onPress={() => router.push(`/(doctor)/video-call?consultationId=${row.id}`)}
                          style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-blue-600')}
                        >
                          <Video size={14} color="#ffffff" />
                          <Text style={tw('text-xs font-bold text-white')}>
                            {t('mobile.video_room', 'Video Room')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() => {
                            setCompleteNotes(row.doctorNotes || '');
                            setCompleteModalTarget(row);
                          }}
                          style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800')}
                        >
                          <CheckCircle2 size={14} color="#059669" />
                          <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                            {t('mobile.complete', 'Complete')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() =>
                            runAction(
                              `noshow-${row.id}`,
                              () => mobileApi.consultationsMarkNoShow({ params: { id: row.id }, body: {} }),
                              t('mobile.marked_no_show', 'Marked as no-show'),
                            )
                          }
                          style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-orange-50 dark:bg-orange-950/60 border border-orange-200 dark:border-orange-800')}
                        >
                          <UserX size={14} color="#ea580c" />
                          <Text style={tw('text-xs font-bold text-orange-700 dark:text-orange-300')}>
                            {t('mobile.no_show', 'No-Show')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    {/* Common quick tools */}
                    {row.requestStatus === 'accepted' && (
                      <>
                        <TouchableOpacity
                          onPress={() => router.push(`/(doctor)/chat/${row.id}`)}
                          style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800')}
                        >
                          <MessageCircle size={14} color={isDark ? '#e2e8f0' : '#334155'} />
                          <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200')}>
                            {t('mobile.chat', 'Chat')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          onPress={() =>
                            setNotesModalTarget({
                              consultationId: row.id,
                              patientId: row.patientId,
                              patientName: row.patientName,
                            })
                          }
                          style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800')}
                        >
                          <FileText size={14} color={isDark ? '#e2e8f0' : '#334155'} />
                          <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200')}>
                            {t('mobile.clinical_notes', 'Notes')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}

                    <TouchableOpacity
                      disabled={loadingAiForId === row.id}
                      onPress={() => handleOpenAiSummary(row)}
                      style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-50 dark:bg-violet-950/60')}
                    >
                      {loadingAiForId === row.id ? (
                        <ActivityIndicator size="small" color="#7c3aed" />
                      ) : (
                        <Sparkles size={14} color="#7c3aed" />
                      )}
                      <Text style={tw('text-xs font-semibold text-violet-700 dark:text-violet-300')}>
                        {t('mobile.ai_summary', 'AI Summary')}
                      </Text>
                    </TouchableOpacity>

                    {!isFinished && row.patientId && (
                      <TouchableOpacity
                        onPress={() => {
                          setReportType('inappropriate_content');
                          setReportReason('');
                          setReportTarget(row);
                        }}
                        style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50/70 dark:bg-red-950/40')}
                      >
                        <Flag size={14} color="#ef4444" />
                        <Text style={tw('text-xs font-semibold text-red-600 dark:text-red-300')}>
                          {t('mobile.report', 'Report')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              );
            })
          )}

          {hasMore && (
            <TouchableOpacity
              disabled={isLoadingMore}
              onPress={handleLoadMore}
              style={tw('py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 items-center')}
            >
              {isLoadingMore ? (
                <ActivityIndicator size="small" color="#0d9488" />
              ) : (
                <Text style={tw('text-xs font-bold text-teal-600 dark:text-teal-400')}>
                  {t('mobile.load_more', 'Load more')}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </ScrollView>
      )}

      {/* Clinical Notes Modal */}
      <ClinicalNotesModal
        visible={Boolean(notesModalTarget)}
        onClose={() => setNotesModalTarget(null)}
        consultationId={notesModalTarget?.consultationId}
        patientId={notesModalTarget?.patientId}
        patientName={notesModalTarget?.patientName}
        onSaved={() => fetchData(1, false)}
      />

      {/* AI Summary Modal */}
      <AiSummaryModal
        visible={Boolean(aiModalTarget)}
        onClose={() => setAiModalTarget(null)}
        enrollmentId={aiModalTarget?.enrollmentId}
        patientName={aiModalTarget?.patientName}
        audience="doctor"
      />

      {/* Decline Reason Modal */}
      <Modal
        visible={Boolean(declineModalTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setDeclineModalTarget(null)}
      >
        <View style={tw('flex-1 bg-black/50 justify-center px-5')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800')}>
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
              {t('mobile.decline_consultation_title', 'Decline Consultation Request')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
              {declineModalTarget?.patientName}
            </Text>
            <TextInput
              value={declineReason}
              onChangeText={setDeclineReason}
              multiline
              placeholder={t('mobile.decline_reason_placeholder', 'Optional reason for declining...')}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              style={tw(
                'mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white min-h-[88px]',
              )}
              textAlignVertical="top"
            />
            <View style={tw('flex-row justify-end gap-2 mt-4')}>
              <TouchableOpacity
                onPress={() => setDeclineModalTarget(null)}
                style={tw('px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800')}
              >
                <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                  {t('mobile.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={Boolean(busyActionKey)}
                onPress={handleSubmitDecline}
                style={tw('px-4 py-2.5 rounded-xl bg-red-600')}
              >
                <Text style={tw('text-xs font-bold text-white')}>
                  {t('mobile.confirm_decline', 'Confirm Decline')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <AppModalToast visible={Boolean(declineModalTarget)} />
        </View>
      </Modal>

      {/* Complete Session Modal */}
      <Modal
        visible={Boolean(completeModalTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setCompleteModalTarget(null)}
      >
        <View style={tw('flex-1 bg-black/50 justify-center px-5')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800')}>
            <View style={tw('flex-row items-center gap-2')}>
              <UserCheck size={18} color="#059669" />
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                {t('mobile.complete_consultation_title', 'Complete Consultation')}
              </Text>
            </View>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
              {completeModalTarget?.patientName}
            </Text>
            <TextInput
              value={completeNotes}
              onChangeText={setCompleteNotes}
              multiline
              placeholder={t('mobile.complete_notes_placeholder', 'Summary and care instructions for the patient...')}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              style={tw(
                'mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white min-h-[100px]',
              )}
              textAlignVertical="top"
            />
            <View style={tw('flex-row justify-end gap-2 mt-4')}>
              <TouchableOpacity
                onPress={() => setCompleteModalTarget(null)}
                style={tw('px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800')}
              >
                <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                  {t('mobile.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={Boolean(busyActionKey)}
                onPress={handleSubmitComplete}
                style={tw('px-4 py-2.5 rounded-xl bg-emerald-600')}
              >
                <Text style={tw('text-xs font-bold text-white')}>
                  {t('mobile.confirm_complete', 'Complete Session')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <AppModalToast visible={Boolean(completeModalTarget)} />
        </View>
      </Modal>

      {/* Report Violation Modal */}
      <Modal
        visible={Boolean(reportTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setReportTarget(null)}
      >
        <View style={tw('flex-1 bg-black/50 justify-center px-5')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800')}>
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
              {t('mobile.report_patient_title', 'Report Patient Behavior')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
              {reportTarget?.patientName}
            </Text>
            <View style={tw('flex-row flex-wrap gap-2 mt-3')}>
              {REPORT_TYPES.map((item) => {
                const selected = reportType === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setReportType(item.value)}
                    style={tw(
                      `px-3 py-1.5 rounded-full border ${
                        selected
                          ? 'bg-red-600 border-red-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`,
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-semibold ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`,
                      )}
                    >
                      {t(item.labelKey, item.defaultLabel)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              placeholder={t('mobile.report_reason_placeholder', 'Describe the issue...')}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              style={tw(
                'mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white min-h-[88px]',
              )}
              textAlignVertical="top"
            />
            <View style={tw('flex-row justify-end gap-2 mt-4')}>
              <TouchableOpacity
                onPress={() => setReportTarget(null)}
                style={tw('px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800')}
              >
                <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                  {t('mobile.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={Boolean(busyActionKey)}
                onPress={handleSubmitReport}
                style={tw('px-4 py-2.5 rounded-xl bg-red-600')}
              >
                <Text style={tw('text-xs font-bold text-white')}>
                  {t('mobile.submit_report', 'Submit Report')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <AppModalToast visible={Boolean(reportTarget)} />
        </View>
      </Modal>
    </SafeAreaView>
  );
}
