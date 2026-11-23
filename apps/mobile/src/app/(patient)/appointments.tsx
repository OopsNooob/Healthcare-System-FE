import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  AlertCircle,
  BellRing,
  Calendar,
  CalendarX2,
  Clock,
  FileEdit,
  LogIn,
  MessageCircle,
  RefreshCw,
  Star,
  Video,
  X,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  consultationsSocket,
  generateIdempotencyKey,
  mobileApi,
  normalizePaginatedList,
  SOCKET_EVENTS,
  type FeTypes,
} from '@repo/shared-hooks';

interface AppointmentViewItem {
  id: string;
  doctorId: string;
  doctor: string;
  specialty: string;
  date: string;
  time: string;
  mode: 'on_demand' | 'scheduled';
  requestStatus: string;
  sessionStatus: string;
  status: 'Waiting' | 'InConsultation' | 'Confirmed' | 'Pending' | 'Completed' | 'Cancelled' | 'Interrupted' | 'NoShow' | 'Declined';
  queuePosition: number | null;
  calledAt: string | null;
  estimatedWaitMinutes: number | null;
  etaReason: string;
  canCheckIn: boolean;
  canReschedule: boolean;
  canCancel: boolean;
  patientNotes: string;
  doctorNotes: string;
  existingReviewId?: string;
  userRating?: number;
  userComment?: string;
}

interface SlotOption {
  id: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
  startAt: string;
}

export default function AppointmentsScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [upcomingList, setUpcomingList] = useState<AppointmentViewItem[]>([]);
  const [historyList, setHistoryList] = useState<AppointmentViewItem[]>([]);
  const [actionBusyId, setActionBusyId] = useState<string | null>(null);

  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAptForReschedule, setSelectedAptForReschedule] = useState<AppointmentViewItem | null>(null);
  const [rescheduleSlotsLoading, setRescheduleSlotsLoading] = useState(false);
  const [rescheduleSlots, setRescheduleSlots] = useState<SlotOption[]>([]);
  const [rescheduleDateKey, setRescheduleDateKey] = useState('');
  const [rescheduleSlotId, setRescheduleSlotId] = useState('');
  const [submittingReschedule, setSubmittingReschedule] = useState(false);

  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedAptForReview, setSelectedAptForReview] = useState<AppointmentViewItem | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const [noteModalVisible, setNoteModalVisible] = useState(false);
  const [selectedAptForNote, setSelectedAptForNote] = useState<AppointmentViewItem | null>(null);
  const [noteDraft, setNoteDraft] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const loadData = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setErrorMsg(null);
      try {
        const [meRes, upcomingRes, allRes, reviewsRes] = await Promise.all([
          mobileApi.usersGetMe().catch(() => null),
          mobileApi.consultationsUpcoming().catch(() => null),
          mobileApi.consultationsFindAll({ query: { page: 1, limit: 60, sortOrder: -1 } }),
          mobileApi.reviewsFindAll({ query: { page: 1, limit: 60 } }).catch(() => null),
        ]);

        const meId = String(((meRes ?? {}) as Record<string, unknown>)._id ?? ((meRes ?? {}) as Record<string, unknown>).id ?? '');
        const allItems = normalizePaginatedList<Record<string, unknown>>(allRes).items;
        const upcomingItems = Array.isArray(upcomingRes?.data)
          ? (upcomingRes.data as Record<string, unknown>[])
          : [];

        const doctorCache = new Map<string, { fullName: string; specialty: string }>();
        const registerDoc = (docRaw: unknown) => {
          if (docRaw && typeof docRaw === 'object') {
            const dObj = docRaw as Record<string, unknown>;
            const id = String(dObj._id ?? dObj.id ?? '');
            if (id) {
              const dp = (dObj.doctorProfile ?? {}) as Record<string, unknown>;
              doctorCache.set(id, {
                fullName: String(dObj.fullName ?? ''),
                specialty: String(dp.specialty ?? ''),
              });
            }
          }
        };
        for (const item of allItems) registerDoc(item.doctorId);

        const missingDocIds = Array.from(
          new Set(
            [...allItems, ...upcomingItems]
              .map((item) => {
                const raw = item.doctorId;
                return raw && typeof raw === 'object'
                  ? String((raw as Record<string, unknown>)._id ?? (raw as Record<string, unknown>).id ?? '')
                  : String(raw ?? '');
              })
              .filter((id) => Boolean(id) && !doctorCache.has(id)),
          ),
        );

        if (missingDocIds.length > 0) {
          await Promise.all(
            missingDocIds.map(async (docId) => {
              try {
                const doc = (await mobileApi.usersFindOne({ params: { id: docId } })) as unknown as Record<
                  string,
                  unknown
                >;
                const dp = (doc.doctorProfile ?? {}) as Record<string, unknown>;
                doctorCache.set(docId, {
                  fullName: String(doc.fullName ?? ''),
                  specialty: String(dp.specialty ?? ''),
                });
              } catch {
                // Keep fallback label if lookup fails
              }
            }),
          );
        }

        const reviewByConsultation = new Map<string, { id: string; rating: number; comment: string }>();
        const reviewItems = normalizePaginatedList<Record<string, unknown>>(reviewsRes).items;
        for (const r of reviewItems) {
          const rPatRaw = r.patientId;
          const rPatId =
            rPatRaw && typeof rPatRaw === 'object'
              ? String((rPatRaw as Record<string, unknown>)._id ?? (rPatRaw as Record<string, unknown>).id ?? '')
              : String(rPatRaw ?? '');
          if (meId && rPatId && rPatId !== meId) continue;
          const cId = String(r.consultationId ?? '');
          if (!cId) continue;
          reviewByConsultation.set(cId, {
            id: String(r._id ?? r.id ?? ''),
            rating: Number(r.rating ?? 5),
            comment: String(r.comment ?? ''),
          });
        }

        // Merge allItems & upcomingItems by id
        const mergedMap = new Map<string, Record<string, unknown>>();
        for (const item of allItems) {
          const id = String(item._id ?? item.id ?? '');
          if (id) mergedMap.set(id, item);
        }
        for (const item of upcomingItems) {
          const id = String(item._id ?? item.id ?? '');
          if (!id) continue;
          const existing = mergedMap.get(id);
          mergedMap.set(id, existing ? { ...existing, ...item, doctorId: existing.doctorId } : item);
        }

        const waitingIds = Array.from(mergedMap.values())
          .filter((item) => item.sessionStatus === 'waiting')
          .map((item) => String(item._id ?? item.id ?? ''))
          .filter(Boolean);

        const queueMap = new Map<string, FeTypes.ConsultationsGetQueueResponse>();
        if (waitingIds.length > 0) {
          await Promise.all(
            waitingIds.map(async (cid) => {
              try {
                const q = await mobileApi.consultationsGetQueue({ params: { id: cid } });
                if (q) queueMap.set(cid, q);
              } catch {
                // Queue optional if not checked-in yet
              }
            }),
          );
        }

        const mapItem = (item: Record<string, unknown>): AppointmentViewItem => {
          const id = String(item._id ?? item.id ?? '');
          const docRaw = item.doctorId;
          const docId =
            docRaw && typeof docRaw === 'object'
              ? String((docRaw as Record<string, unknown>)._id ?? (docRaw as Record<string, unknown>).id ?? '')
              : String(docRaw ?? '');
          const docMeta = doctorCache.get(docId);

          const startIso = String(item.scheduledStartAt ?? item.requestedAt ?? item.createdAt ?? '');
          const d = startIso ? new Date(startIso) : new Date();

          const reqStatus = String(item.requestStatus ?? 'pending');
          const sesStatus = String(item.sessionStatus ?? 'not_started');

          let status: AppointmentViewItem['status'] = 'Pending';
          if (reqStatus === 'cancelled') status = 'Cancelled';
          else if (reqStatus === 'declined') status = 'Declined';
          else if (sesStatus === 'completed') status = 'Completed';
          else if (sesStatus === 'no_show') status = 'NoShow';
          else if (sesStatus === 'interrupted') status = 'Interrupted';
          else if (sesStatus === 'in_consultation') status = 'InConsultation';
          else if (sesStatus === 'waiting') status = 'Waiting';
          else if (reqStatus === 'accepted') status = 'Confirmed';

          const q = queueMap.get(id);
          const calledAtRaw = item.calledAt ? String(item.calledAt) : '';
          const calledAt = calledAtRaw
            ? new Date(calledAtRaw).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
            : null;

          const existingReview = reviewByConsultation.get(id);
          const mode: 'on_demand' | 'scheduled' =
            item.mode === 'on_demand' ? 'on_demand' : 'scheduled';

          return {
            id,
            doctorId: docId,
            doctor: docMeta?.fullName || t('mobile.specialist_doctor', 'Specialist Doctor'),
            specialty:
              docMeta?.specialty || t('mobile.specialty_general_practitioner', 'General Practitioner'),
            date: d.toLocaleDateString(dateLocale, {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
            }),
            time: d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }),
            mode,
            requestStatus: reqStatus,
            sessionStatus: sesStatus,
            status,
            queuePosition: q?.position ?? null,
            calledAt,
            estimatedWaitMinutes: q?.estimatedWaitMinutes ?? (typeof item.estimatedWaitMinutes === 'number' ? item.estimatedWaitMinutes : null),
            etaReason: q?.etaReason ?? '',
            canCheckIn:
              mode === 'scheduled' && reqStatus === 'accepted' && sesStatus === 'not_started',
            canReschedule:
              mode === 'scheduled' && reqStatus === 'accepted' && sesStatus === 'not_started',
            canCancel:
              ['pending', 'accepted'].includes(reqStatus) &&
              ['not_started', 'waiting'].includes(sesStatus),
            patientNotes: String(item.patientNotes ?? ''),
            doctorNotes: String(item.doctorNotes ?? ''),
            existingReviewId: existingReview?.id,
            userRating: existingReview?.rating,
            userComment: existingReview?.comment,
          };
        };

        const mapped = Array.from(mergedMap.values()).map(mapItem);
        const upcoming: AppointmentViewItem[] = [];
        const history: AppointmentViewItem[] = [];

        for (const apt of mapped) {
          if (
            ['Completed', 'Cancelled', 'Declined', 'Interrupted', 'NoShow'].includes(apt.status) ||
            apt.requestStatus === 'expired'
          ) {
            history.push(apt);
          } else {
            upcoming.push(apt);
          }
        }

        setUpcomingList(upcoming);
        setHistoryList(history);
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
    void loadData(false);
  }, [loadData]);

  useEffect(() => {
    const onChanged = () => {
      void loadData(true);
    };
    consultationsSocket.on(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onChanged);
    consultationsSocket.on(SOCKET_EVENTS.QUEUE_CHANGED, onChanged);
    consultationsSocket.on(SOCKET_EVENTS.QUEUE_CALLED, onChanged);
    return () => {
      consultationsSocket.off(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onChanged);
      consultationsSocket.off(SOCKET_EVENTS.QUEUE_CHANGED, onChanged);
      consultationsSocket.off(SOCKET_EVENTS.QUEUE_CALLED, onChanged);
    };
  }, [loadData]);

  const statusLabel = (status: AppointmentViewItem['status']) => {
    const map: Record<AppointmentViewItem['status'], string> = {
      Waiting: t('mobile.status_waiting', 'Waiting'),
      InConsultation: t('mobile.status_in_consultation', 'In Consultation'),
      Confirmed: t('mobile.status_confirmed', 'Confirmed'),
      Completed: t('mobile.status_completed', 'Completed'),
      Cancelled: t('mobile.status_cancelled', 'Cancelled'),
      Declined: t('mobile.status_declined', 'Declined'),
      Pending: t('mobile.status_pending', 'Pending'),
      Interrupted: t('mobile.status_interrupted', 'Interrupted'),
      NoShow: t('mobile.status_no_show', 'No Show'),
    };
    return map[status] || status;
  };

  const handleCheckIn = async (apt: AppointmentViewItem) => {
    if (actionBusyId) return;
    setActionBusyId(apt.id);
    try {
      const res = await mobileApi.consultationsCheckIn({
        params: { id: apt.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('checkin') },
      });
      await mobileApi.consultationsRecordWaitingRoomPresence({ params: { id: apt.id } }).catch(() => null);
      const q = res?.queue;
      setUpcomingList((prev) =>
        prev.map((item) =>
          item.id === apt.id
            ? {
                ...item,
                sessionStatus: 'waiting',
                status: 'Waiting',
                canCheckIn: false,
                canReschedule: false,
                queuePosition: q?.position ?? item.queuePosition,
                estimatedWaitMinutes: q?.estimatedWaitMinutes ?? null,
                etaReason: q?.etaReason ?? '',
              }
            : item,
        ),
      );
      Toast.show({
        type: 'success',
        text1: t('mobile.checked_in_title', 'Checked into waiting room'),
        text2: t(
          'mobile.checked_in_desc',
          'You are in the consultation queue. Keep your connection active for the doctor call.',
        ),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Check-in failed'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setActionBusyId(null);
    }
  };

  const handleOpenReschedule = async (apt: AppointmentViewItem) => {
    setSelectedAptForReschedule(apt);
    setRescheduleModalVisible(true);
    setRescheduleSlotsLoading(true);
    setRescheduleSlots([]);
    setRescheduleDateKey('');
    setRescheduleSlotId('');
    try {
      const now = new Date();
      const twoWeeks = new Date(now.getTime() + 14 * 86400_000);
      const res = await mobileApi.availabilitySlotsListAvailable({
        params: { doctorId: apt.doctorId },
        query: {
          from: now.toISOString(),
          to: twoWeeks.toISOString(),
          page: 1,
          limit: 100,
        },
      });
      const items = normalizePaginatedList<Record<string, unknown>>(res).items;
      const mapped: SlotOption[] = items
        .filter((s) => !s.status || s.status === 'available')
        .map((s) => {
          const startAt = String(s.startAt ?? '');
          const d = new Date(startAt);
          const dateKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
            d.getDate(),
          ).padStart(2, '0')}`;
          return {
            id: String(s.id ?? s._id ?? ''),
            dateKey,
            dateLabel: d.toLocaleDateString(dateLocale, { month: 'short', day: '2-digit' }),
            timeLabel: d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' }),
            startAt,
          };
        })
        .filter((s) => Boolean(s.id && s.startAt));

      setRescheduleSlots(mapped);
      if (mapped.length > 0) {
        setRescheduleDateKey(mapped[0].dateKey);
        setRescheduleSlotId(mapped[0].id);
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to load slots'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setRescheduleSlotsLoading(false);
    }
  };

  const rescheduleDateGroups = useMemo(() => {
    const map = new Map<string, { dateKey: string; dateLabel: string; slots: SlotOption[] }>();
    for (const s of rescheduleSlots) {
      const ex = map.get(s.dateKey);
      if (ex) ex.slots.push(s);
      else map.set(s.dateKey, { dateKey: s.dateKey, dateLabel: s.dateLabel, slots: [s] });
    }
    return Array.from(map.values());
  }, [rescheduleSlots]);

  const handleConfirmReschedule = async () => {
    if (!selectedAptForReschedule || !rescheduleSlotId || submittingReschedule) return;
    setSubmittingReschedule(true);
    try {
      await mobileApi.consultationsReschedule({
        params: { id: selectedAptForReschedule.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('reschedule') },
        body: { availabilitySlotId: rescheduleSlotId },
      });
      const chosen = rescheduleSlots.find((s) => s.id === rescheduleSlotId);
      setRescheduleModalVisible(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.rescheduled_title', 'Appointment rescheduled'),
        text2: chosen ? `${chosen.dateLabel} • ${chosen.timeLabel}` : undefined,
      });
      void loadData(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Reschedule failed'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSubmittingReschedule(false);
    }
  };

  const handleSavePatientNote = async () => {
    if (!selectedAptForNote || savingNote) return;
    setSavingNote(true);
    try {
      await mobileApi.consultationsUpdate({
        params: { id: selectedAptForNote.id },
        body: { patientNotes: noteDraft.trim() },
      });
      setUpcomingList((prev) =>
        prev.map((item) =>
          item.id === selectedAptForNote.id ? { ...item, patientNotes: noteDraft.trim() } : item,
        ),
      );
      setNoteModalVisible(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.notes_updated', 'Notes updated'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to save notes'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSavingNote(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!selectedAptForReview || submittingReview) return;
    setSubmittingReview(true);
    try {
      const comment = reviewComment.trim();
      let savedId = selectedAptForReview.existingReviewId;
      if (savedId) {
        await mobileApi.reviewsUpdate({
          params: { id: savedId },
          body: { rating, comment },
        });
      } else {
        const res = await mobileApi.reviewsCreate({
          doctorId: selectedAptForReview.doctorId,
          consultationId: selectedAptForReview.id,
          rating,
          comment,
        });
        const data = (res?.data ?? {}) as Record<string, unknown>;
        savedId = String(data._id ?? data.id ?? '');
      }
      setHistoryList((prev) =>
        prev.map((item) =>
          item.id === selectedAptForReview.id
            ? { ...item, existingReviewId: savedId || item.existingReviewId, userRating: rating, userComment: comment }
            : item,
        ),
      );
      setReviewModalVisible(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.review_submitted_title', 'Review saved'),
        text2: `${rating}/5 ★`,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to submit review'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  const handleCancel = (id: string) => {
    if (actionBusyId) return;
    Alert.alert(
      t('mobile.cancel_appointment', 'Cancel Appointment'),
      t('mobile.cancel_appointment_confirm', 'Are you sure you want to cancel this appointment?'),
      [
        { text: t('mobile.no', 'No'), style: 'cancel' },
        {
          text: t('mobile.yes_cancel', 'Yes, Cancel'),
          style: 'destructive',
          onPress: async () => {
            setActionBusyId(id);
            try {
              await mobileApi.consultationsCancel({
                params: { id },
                body: { reason: 'User requested cancellation' },
              });
              Toast.show({
                type: 'success',
                text1: t('mobile.success', 'Success'),
                text2: t('mobile.appointment_cancelled_success', 'Appointment cancelled successfully'),
              });
              void loadData(true);
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: t('mobile.error_generic', 'Cancel failed'),
                text2: extractApiErrorMessage(err),
              });
            } finally {
              setActionBusyId(null);
            }
          },
        },
      ],
    );
  };

  const renderSkeleton = () => (
    <View
      style={tw(
        'bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm',
      )}
    >
      <View style={tw('flex-row justify-between items-start mb-4')}>
        <View style={tw('gap-2')}>
          <Skeleton className="w-40 h-6 rounded-md" />
          <Skeleton className="w-24 h-4 rounded-md" />
        </View>
        <Skeleton className="w-16 h-6 rounded-full" />
      </View>
      <View style={tw('flex-row flex-wrap gap-y-3 mb-5')}>
        <Skeleton className="w-28 h-4 rounded-md mr-6" />
        <Skeleton className="w-24 h-4 rounded-md" />
      </View>
      <Skeleton className="w-full h-12 rounded-xl" />
    </View>
  );

  const renderEmptyState = (tab: 'upcoming' | 'history') => (
    <View style={tw('items-center justify-center py-20 px-6')}>
      <View
        style={tw(
          'w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-6',
        )}
      >
        <CalendarX2 color="#94a3b8" size={40} />
      </View>
      <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-2 text-center')}>
        {tab === 'upcoming'
          ? t('mobile.no_upcoming_appointments_title', 'No upcoming appointments')
          : t('mobile.no_history_appointments_title', 'No past consultations')}
      </Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 text-center mb-8')}>
        {tab === 'upcoming'
          ? t('mobile.no_upcoming_appointments_desc', 'You do not have any upcoming appointments.')
          : t('mobile.no_history_appointments_desc', 'Your completed or cancelled consultations will appear here.')}
      </Text>
      {tab === 'upcoming' && (
        <TouchableOpacity
          onPress={() => router.push('/(patient)/my-doctors')}
          style={tw('bg-brand px-8 py-4 rounded-2xl flex-row items-center')}
        >
          <Text style={tw('text-slate-900 font-bold')}>
            {t('mobile.book_new_appointment', 'Book New Appointment')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View
        style={tw(
          'px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800',
        )}
      >
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
          {t('mobile.my_appointments', 'My Appointments')}
        </Text>
        <Text style={tw('text-slate-500 dark:text-slate-400 text-sm mt-1')}>
          {t('mobile.track_and_manage_your_schedule', 'Track and manage your schedule & waiting queue')}
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={tw(
          'flex-row px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800',
        )}
      >
        <TouchableOpacity
          onPress={() => setActiveTab('upcoming')}
          style={tw(
            `flex-1 py-3 items-center border-b-2 ${
              activeTab === 'upcoming' ? 'border-brand' : 'border-transparent'
            }`,
          )}
        >
          <Text
            style={tw(
              `font-bold ${
                activeTab === 'upcoming' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
              }`,
            )}
          >
            {t('mobile.upcoming', 'Upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={tw(
            `flex-1 py-3 items-center border-b-2 ${
              activeTab === 'history' ? 'border-brand' : 'border-transparent'
            }`,
          )}
        >
          <Text
            style={tw(
              `font-bold ${
                activeTab === 'history' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
              }`,
            )}
          >
            {t('mobile.history', 'History')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-6 pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadData(true);
            }}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        }
      >
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : errorMsg ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-3xl p-6 items-center border border-slate-200 dark:border-slate-800',
            )}
          >
            <Text style={tw('text-sm text-red-500 text-center mb-4')}>{errorMsg}</Text>
            <TouchableOpacity onPress={() => void loadData(false)} style={tw('bg-brand px-6 py-3 rounded-2xl')}>
              <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {activeTab === 'upcoming' &&
              (upcomingList.length > 0
                ? upcomingList.map((apt) => (
                    <View
                      key={apt.id}
                      style={tw(
                        'bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm',
                      )}
                    >
                      {apt.status === 'Waiting' && (
                        <View
                          style={tw(
                            `rounded-2xl p-4 mb-4 border ${
                              apt.calledAt
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                            }`,
                          )}
                        >
                          <View style={tw('flex-row items-center justify-between')}>
                            <View style={tw('flex-row items-center flex-1 mr-3')}>
                              {apt.calledAt ? (
                                <BellRing color="#10b981" size={20} />
                              ) : (
                                <AlertCircle color="#d97706" size={20} />
                              )}
                              <View style={tw('ml-3 flex-1')}>
                                <Text
                                  style={tw(
                                    `font-bold text-sm ${
                                      apt.calledAt
                                        ? 'text-emerald-800 dark:text-emerald-200'
                                        : 'text-amber-800 dark:text-amber-200'
                                    }`,
                                  )}
                                >
                                  {apt.calledAt
                                    ? t('mobile.doctor_calling_you', 'Doctor is calling you now!')
                                    : t('mobile.you_are_in_queue', 'You are in the waiting queue')}
                                </Text>
                                <Text
                                  style={tw(
                                    `text-xs mt-0.5 ${
                                      apt.calledAt
                                        ? 'text-emerald-600 dark:text-emerald-300'
                                        : 'text-amber-700 dark:text-amber-300'
                                    }`,
                                  )}
                                >
                                  {apt.calledAt
                                    ? t('mobile.called_at_tap_join', {
                                        time: apt.calledAt,
                                        defaultValue: `Called at ${apt.calledAt} • Tap Join Room now`,
                                      })
                                    : apt.estimatedWaitMinutes != null
                                      ? `${t('mobile.estimated_wait', 'Estimated wait')}: ${apt.estimatedWaitMinutes} ${t('mobile.minutes_short', 'min')}`
                                      : t('mobile.eta_not_configured', 'Waiting for the doctor to call next patient')}
                                </Text>
                              </View>
                            </View>
                            {apt.queuePosition != null && (
                              <View
                                style={tw(
                                  `w-10 h-10 rounded-full items-center justify-center ${
                                    apt.calledAt
                                      ? 'bg-emerald-200 dark:bg-emerald-800'
                                      : 'bg-amber-200 dark:bg-amber-800'
                                  }`,
                                )}
                              >
                                <Text
                                  style={tw(
                                    `font-black text-base ${
                                      apt.calledAt
                                        ? 'text-emerald-900 dark:text-white'
                                        : 'text-amber-900 dark:text-white'
                                    }`,
                                  )}
                                >
                                  #{apt.queuePosition}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      )}

                      <View style={tw('flex-row justify-between items-start mb-4')}>
                        <View style={tw('flex-1 mr-2')}>
                          <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                            {apt.doctor}
                          </Text>
                          <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400')}>
                            {apt.specialty} •{' '}
                            {apt.mode === 'on_demand'
                              ? t('mobile.mode_on_demand', 'On-demand')
                              : t('mobile.mode_scheduled', 'Scheduled')}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `px-3 py-1 rounded-full shrink-0 self-start ${
                              apt.status === 'Waiting'
                                ? 'bg-amber-100 dark:bg-amber-900/40'
                                : apt.status === 'InConsultation'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                  : apt.status === 'Confirmed'
                                    ? 'bg-blue-100 dark:bg-blue-900/40'
                                    : 'bg-slate-100 dark:bg-slate-800'
                            }`,
                          )}
                        >
                          <Text
                            numberOfLines={1}
                            style={tw(
                              `text-xs font-bold ${
                                apt.status === 'Waiting'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : apt.status === 'InConsultation'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : apt.status === 'Confirmed'
                                      ? 'text-blue-700 dark:text-blue-300'
                                      : 'text-slate-600 dark:text-slate-300'
                              }`,
                            )}
                          >
                            {statusLabel(apt.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={tw('flex-row flex-wrap gap-y-3 mb-4')}>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Calendar color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>
                            {apt.date}
                          </Text>
                        </View>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Clock color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>
                            {apt.time}
                          </Text>
                        </View>
                        <View style={tw('flex-row items-center w-1/2 mt-1')}>
                          {apt.mode === 'scheduled' ? (
                            <Video color="#94a3b8" size={16} />
                          ) : (
                            <MessageCircle color="#94a3b8" size={16} />
                          )}
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>
                            {apt.mode === 'scheduled'
                              ? t('mobile.mode_video', 'Video Call')
                              : t('mobile.mode_chat', 'Chat & Video')}
                          </Text>
                        </View>
                      </View>

                      {apt.patientNotes ? (
                        <View
                          style={tw(
                            'bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-800 rounded-2xl p-3 mb-4',
                          )}
                        >
                          <Text style={tw('text-[11px] font-bold text-slate-400 uppercase mb-1')}>
                            {t('mobile.patient_notes_label', 'Your Notes')}
                          </Text>
                          <Text style={tw('text-xs text-slate-600 dark:text-slate-300')}>
                            {apt.patientNotes}
                          </Text>
                        </View>
                      ) : null}

                      {/* Actions */}
                      <View style={tw('gap-2.5')}>
                        {(apt.status === 'Waiting' || apt.status === 'InConsultation') && (
                          <View style={tw('flex-row gap-2.5')}>
                            <TouchableOpacity
                              onPress={() =>
                                router.push(
                                  `/(patient)/video-call?consultationId=${apt.id}&doctorId=${apt.doctorId}`,
                                )
                              }
                              style={tw('flex-1 bg-brand py-3.5 rounded-xl flex-row justify-center items-center')}
                            >
                              <Video color="#0f172a" size={18} style={tw('mr-2')} />
                              <Text style={tw('text-slate-900 font-bold text-sm')}>
                                {t('mobile.join_room', 'Join Room')}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              onPress={() =>
                                router.push(
                                  `/(patient)/doctor-chat?consultationId=${apt.id}&doctorId=${apt.doctorId}`,
                                )
                              }
                              style={tw(
                                'px-4 bg-slate-100 dark:bg-slate-800 rounded-xl justify-center items-center',
                              )}
                            >
                              <MessageCircle
                                color={twInstance.color('text-slate-700 dark:text-slate-200')}
                                size={18}
                              />
                            </TouchableOpacity>
                          </View>
                        )}

                        {apt.canCheckIn && (
                          <TouchableOpacity
                            disabled={actionBusyId === apt.id}
                            onPress={() => void handleCheckIn(apt)}
                            style={tw('bg-indigo-600 py-3.5 rounded-xl flex-row justify-center items-center')}
                          >
                            {actionBusyId === apt.id ? (
                              <ActivityIndicator size="small" color="#ffffff" style={tw('mr-2')} />
                            ) : (
                              <LogIn color="#ffffff" size={18} style={tw('mr-2')} />
                            )}
                            <Text style={tw('text-white font-bold text-sm')}>
                              {t('mobile.check_in_waiting_room', 'Check In to Waiting Room')}
                            </Text>
                          </TouchableOpacity>
                        )}

                        <View style={tw('flex-row gap-2.5')}>
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedAptForNote(apt);
                              setNoteDraft(apt.patientNotes);
                              setNoteModalVisible(true);
                            }}
                            style={tw(
                              'flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl flex-row justify-center items-center',
                            )}
                          >
                            <FileEdit
                              color={twInstance.color('text-slate-700 dark:text-slate-200')}
                              size={15}
                              style={tw('mr-1.5')}
                            />
                            <Text style={tw('text-slate-700 dark:text-slate-200 font-bold text-xs')}>
                              {t('mobile.edit_note_btn', 'Notes')}
                            </Text>
                          </TouchableOpacity>
                          {apt.canReschedule && (
                            <TouchableOpacity
                              onPress={() => void handleOpenReschedule(apt)}
                              style={tw(
                                'flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl flex-row justify-center items-center',
                              )}
                            >
                              <RefreshCw
                                color={twInstance.color('text-slate-700 dark:text-slate-200')}
                                size={15}
                                style={tw('mr-1.5')}
                              />
                              <Text style={tw('text-slate-700 dark:text-slate-200 font-bold text-xs')}>
                                {t('mobile.reschedule_btn', 'Reschedule')}
                              </Text>
                            </TouchableOpacity>
                          )}
                          {apt.canCancel && (
                            <TouchableOpacity
                              disabled={actionBusyId === apt.id}
                              onPress={() => handleCancel(apt.id)}
                              style={tw(
                                'flex-1 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 py-3 rounded-xl flex-row justify-center items-center',
                              )}
                            >
                              <Text style={tw('text-red-500 font-bold text-xs')}>
                                {t('mobile.cancel', 'Cancel')}
                              </Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </View>
                  ))
                : renderEmptyState('upcoming'))}

            {activeTab === 'history' &&
              (historyList.length > 0
                ? historyList.map((apt) => (
                    <View
                      key={apt.id}
                      style={tw(
                        'bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm',
                      )}
                    >
                      <View style={tw('flex-row justify-between items-start mb-4')}>
                        <View style={tw('flex-1 mr-2')}>
                          <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                            {apt.doctor}
                          </Text>
                          <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400')}>
                            {apt.specialty}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `px-3 py-1 rounded-full shrink-0 self-start ${
                              apt.status === 'Completed'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : apt.status === 'Interrupted'
                                  ? 'bg-orange-100 dark:bg-orange-900/40'
                                  : 'bg-slate-100 dark:bg-slate-800'
                            }`,
                          )}
                        >
                          <Text
                            numberOfLines={1}
                            style={tw(
                              `text-xs font-bold ${
                                apt.status === 'Completed'
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : apt.status === 'Interrupted'
                                    ? 'text-orange-700 dark:text-orange-300'
                                    : 'text-slate-600 dark:text-slate-300'
                              }`,
                            )}
                          >
                            {statusLabel(apt.status)}
                          </Text>
                        </View>
                      </View>

                      <View style={tw('flex-row flex-wrap gap-y-3 mb-4')}>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Calendar color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>
                            {apt.date}
                          </Text>
                        </View>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Clock color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>
                            {apt.time}
                          </Text>
                        </View>
                      </View>

                      {apt.doctorNotes ? (
                        <View
                          style={tw(
                            'bg-indigo-50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 mb-4',
                          )}
                        >
                          <Text style={tw('text-xs font-bold text-indigo-800 dark:text-indigo-200 mb-1')}>
                            {t('mobile.doctor_follow_up_note', 'Doctor Clinical Notes')}
                          </Text>
                          <Text style={tw('text-xs text-indigo-700 dark:text-indigo-300 leading-4')}>
                            {apt.doctorNotes}
                          </Text>
                        </View>
                      ) : null}

                      {apt.userRating ? (
                        <View
                          style={tw(
                            'bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40 mb-4',
                          )}
                        >
                          <View style={tw('flex-row items-center mb-1')}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                color="#f59e0b"
                                fill={s <= (apt.userRating ?? 0) ? '#f59e0b' : 'transparent'}
                                size={13}
                              />
                            ))}
                            <Text style={tw('text-xs font-bold text-amber-800 dark:text-amber-300 ml-2')}>
                              {apt.userRating}/5
                            </Text>
                          </View>
                          {apt.userComment ? (
                            <Text style={tw('text-xs text-slate-600 dark:text-slate-300 italic')}>
                              &ldquo;{apt.userComment}&rdquo;
                            </Text>
                          ) : null}
                        </View>
                      ) : null}

                      <View style={tw('flex-row gap-2.5')}>
                        <TouchableOpacity
                          onPress={() =>
                            router.push(
                              `/(patient)/doctor-chat?consultationId=${apt.id}&doctorId=${apt.doctorId}`,
                            )
                          }
                          style={tw(
                            'flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 py-3 rounded-xl flex-row justify-center items-center',
                          )}
                        >
                          <Text style={tw('text-slate-700 dark:text-slate-200 font-bold text-xs')}>
                            {t('mobile.view_log', 'View Chat Log')}
                          </Text>
                        </TouchableOpacity>
                        {apt.status === 'Completed' && (
                          <TouchableOpacity
                            onPress={() => {
                              setSelectedAptForReview(apt);
                              setRating(apt.userRating || 5);
                              setReviewComment(apt.userComment || '');
                              setReviewModalVisible(true);
                            }}
                            style={tw('flex-1 bg-amber-500 py-3 rounded-xl flex-row justify-center items-center')}
                          >
                            <Star color="#ffffff" fill="#ffffff" size={14} style={tw('mr-1.5')} />
                            <Text style={tw('text-white font-bold text-xs')}>
                              {apt.userRating
                                ? t('mobile.edit_review_btn', 'Edit Review')
                                : t('mobile.rate_doctor_btn', 'Rate Doctor')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  ))
                : renderEmptyState('history'))}
          </>
        )}
      </ScrollView>

      {/* Reschedule Modal */}
      <Modal
        visible={rescheduleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRescheduleModalVisible(false)}
      >
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800',
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.reschedule_modal_title', 'Reschedule Appointment')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {selectedAptForReschedule?.doctor} •{' '}
                  {t('mobile.reschedule_cutoff_desc', 'Cutoff: 60 minutes before appointment')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            {rescheduleSlotsLoading ? (
              <View style={tw('gap-3 mb-6')}>
                <Skeleton className="h-10 w-full rounded-xl" />
                <Skeleton className="h-24 w-full rounded-xl" />
              </View>
            ) : rescheduleDateGroups.length === 0 ? (
              <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-6')}>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}>
                  {t('mobile.no_available_slots_desc', 'No open slots are available for rescheduling.')}
                </Text>
              </View>
            ) : (
              <>
                <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
                  {t('mobile.select_new_date', 'Select New Date')}
                </Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  style={tw('mb-4')}
                  contentContainerStyle={tw('gap-2')}
                >
                  {rescheduleDateGroups.map((g) => (
                    <TouchableOpacity
                      key={g.dateKey}
                      onPress={() => {
                        setRescheduleDateKey(g.dateKey);
                        if (g.slots.length > 0) setRescheduleSlotId(g.slots[0].id);
                      }}
                      style={tw(
                        `px-4 py-2.5 rounded-xl border items-center ${
                          rescheduleDateKey === g.dateKey
                            ? 'bg-brand border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`,
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            rescheduleDateKey === g.dateKey
                              ? 'text-slate-900'
                              : 'text-slate-600 dark:text-slate-300'
                          }`,
                        )}
                      >
                        {g.dateLabel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>

                <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
                  {t('mobile.select_available_slot', 'Select Available Slot')}
                </Text>
                <View style={tw('flex-row flex-wrap gap-2 mb-6')}>
                  {(
                    rescheduleDateGroups.find((g) => g.dateKey === rescheduleDateKey)?.slots ?? []
                  ).map((slot) => (
                    <TouchableOpacity
                      key={slot.id}
                      onPress={() => setRescheduleSlotId(slot.id)}
                      style={tw(
                        `px-4 py-2.5 rounded-xl border ${
                          rescheduleSlotId === slot.id
                            ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`,
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            rescheduleSlotId === slot.id
                              ? 'text-white dark:text-slate-900'
                              : 'text-slate-600 dark:text-slate-300'
                          }`,
                        )}
                      >
                        {slot.timeLabel}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}

            <TouchableOpacity
              disabled={!rescheduleSlotId || submittingReschedule}
              onPress={() => void handleConfirmReschedule()}
              style={tw(
                `py-3.5 rounded-xl items-center flex-row justify-center ${
                  !rescheduleSlotId || submittingReschedule
                    ? 'bg-slate-200 dark:bg-slate-700'
                    : 'bg-brand'
                }`,
              )}
            >
              {submittingReschedule && (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.confirm_reschedule', 'Confirm Reschedule')}
              </Text>
            </TouchableOpacity>
          </View>
          <AppModalToast visible={rescheduleModalVisible} />
        </View>
      </Modal>

      {/* Edit Notes Modal */}
      <Modal
        visible={noteModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoteModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800',
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.edit_patient_notes_title', 'Update Consultation Notes')}
              </Text>
              <TouchableOpacity onPress={() => setNoteModalVisible(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={noteDraft}
              onChangeText={setNoteDraft}
              placeholder={t(
                'mobile.describe_symptoms_placeholder',
                'Describe your symptoms or questions for the doctor...',
              )}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[110px] text-sm text-slate-900 dark:text-white mb-4',
              )}
            />
            <TouchableOpacity
              disabled={savingNote}
              onPress={() => void handleSavePatientNote()}
              style={tw('bg-brand py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              {savingNote && <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.save', 'Save')}
              </Text>
            </TouchableOpacity>
          </View>
          <AppModalToast visible={noteModalVisible} />
        </KeyboardAvoidingView>
      </Modal>

      {/* Post-Consultation Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800',
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.rate_consultation_title', 'Rate Consultation')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {selectedAptForReview?.doctor}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            <View style={tw('flex-row justify-center gap-3 my-4')}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setRating(star)} style={tw('p-1')}>
                  <Star
                    color="#f59e0b"
                    fill={star <= rating ? '#f59e0b' : 'transparent'}
                    size={34}
                  />
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder={t(
                'mobile.review_comment_placeholder',
                'Share your consultation experience with the doctor...',
              )}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[100px] text-sm text-slate-900 dark:text-white mb-4',
              )}
            />

            <TouchableOpacity
              disabled={submittingReview}
              onPress={() => void handleSubmitReview()}
              style={tw('bg-brand py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              {submittingReview && (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.submit_review_btn', 'Submit Review')}
              </Text>
            </TouchableOpacity>
          </View>
          <AppModalToast visible={reviewModalVisible} />
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
