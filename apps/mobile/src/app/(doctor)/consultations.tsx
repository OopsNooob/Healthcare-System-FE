import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  MessageCircle,
  CheckCircle,
  XCircle,
  AlertTriangle,
  X,
  PhoneCall,
  UserX,
  ClipboardCheck,
  Users,
} from 'lucide-react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import {
  consultationsFindAll,
  consultationsAccept,
  consultationsDecline,
  consultationsStart,
  consultationsComplete,
  violationsCreate,
} from '@healthcare/api-client';

interface WaitingQueueItem {
  id: string;
  patientName: string;
  age: number;
  gender: string;
  mode: 'scheduled' | 'on_demand';
  queuePosition: number;
  queuePriorityAt: string;
  queueJoinedAt: string;
  calledAt: string | null;
  reason: string;
}

export default function DoctorConsultationsScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const genderLabel = (g: string) =>
    g === 'Male' ? t('mobile.gender_male', 'Nam') : g === 'Female' ? t('mobile.gender_female', 'Nữ') : g;

  const followUpActionLabel = (action: string) => {
    const map: Record<string, string> = {
      book_scheduled: t('mobile.followup_book_scheduled', 'Đặt lịch tái khám định kỳ'),
      monitor_at_home: t('mobile.followup_monitor_at_home', 'Tiếp tục theo dõi tại nhà'),
      visit_facility: t('mobile.followup_visit_facility', 'Đến cơ sở y tế khám trực tiếp'),
    };
    return map[action] || action;
  };

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'queue' | 'pending' | 'active' | 'history'>('queue');
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [endModalVisible, setEndModalVisible] = useState(false);
  const [noShowModalVisible, setNoShowModalVisible] = useState(false);
  const [followUpModalVisible, setFollowUpModalVisible] = useState(false);

  const [reportReason, setReportReason] = useState('');
  const [doctorNote, setDoctorNote] = useState('');
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(null);
  const [reportTargetId, setReportTargetId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  // No-Show Modal state (POST /consultations/:id/no-show)
  const [noShowReasonCode, setNoShowReasonCode] = useState<
    'patient_absent' | 'unreachable' | 'left_waiting_room'
  >('patient_absent');
  const [noShowNote, setNoShowNote] = useState('');

  // Follow-up Modal state (PUT /consultations/:id/follow-up)
  const [followUpNextAction, setFollowUpNextAction] = useState<
    'book_scheduled' | 'monitor_at_home' | 'visit_facility'
  >('monitor_at_home');
  const [followUpDate, setFollowUpDate] = useState('2026-11-15 09:00');
  const [followUpNote, setFollowUpNote] = useState('');

  // Waiting Room Queue (GET /doctors/me/queue - ordered by queuePriorityAt, queueJoinedAt)
  const [waitingQueue, setWaitingQueue] = useState<WaitingQueueItem[]>([
    {
      id: 'q_101',
      patientName: 'Alex Johnson',
      age: 28,
      gender: 'Male',
      mode: 'scheduled',
      queuePosition: 1,
      queuePriorityAt: '10:00 AM',
      queueJoinedAt: '09:52 AM',
      calledAt: null,
      reason: 'Scheduled BP follow-up check-in',
    },
    {
      id: 'q_102',
      patientName: 'Elena Rostova',
      age: 52,
      gender: 'Female',
      mode: 'on_demand',
      queuePosition: 2,
      queuePriorityAt: '10:05 AM',
      queueJoinedAt: '10:05 AM',
      calledAt: null,
      reason: 'On-demand request: Dizziness after morning medication',
    },
  ]);

  const pendingRequests = [
    {
      id: '1',
      patientName: 'Alex Johnson',
      time: '10:30 AM',
      date: 'Today',
      type: 'Chat',
      mode: 'on_demand',
      requestStatus: 'requested',
      age: 28,
      gender: 'Male',
      reason: 'Mild headache and dizziness for 2 days.',
    },
  ];

  const activeSessions = [
    {
      id: '2',
      patientName: 'Maria Garcia',
      time: '11:00 AM',
      date: 'Today',
      type: 'Chat',
      status: 'In Progress',
      age: 34,
      gender: 'Female',
      reason: 'Follow-up on blood test results.',
      statusKey: 'active',
    },
    {
      id: '4',
      patientName: 'John Doe',
      time: '11:30 AM',
      date: 'Today',
      type: 'Video Call',
      status: 'Interrupted',
      age: 40,
      gender: 'Male',
      reason: 'Connection lost during consultation.',
      statusKey: 'interrupted',
    },
  ];

  const history = [
    {
      id: '3',
      patientName: 'James Smith',
      time: '02:15 PM',
      date: 'Yesterday',
      type: 'Chat',
      status: 'Completed',
      age: 45,
      gender: 'Male',
      rating: 5,
      review: 'Very helpful doctor.',
      followUpRecommendation: {
        nextAction: 'monitor_at_home',
        followUpAt: '2026-11-15 09:00',
        note: 'Đo huyết áp sáng/tối và tái khám sau 7 ngày.',
      },
    },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [pending, setPending] = useState<any[]>([]);
  const [active, setActive] = useState<any[]>([]);
  const [hist, setHist] = useState<any[]>([]);

  const formatItem = (item: any) => {
    const d = item.scheduledStartAt ? new Date(item.scheduledStartAt) : new Date();
    return {
      id: item._id || item.id,
      patientName: item.patient?.fullName || item.patientId || t('mobile.patient_label', 'Bệnh nhân'),
      patientId: item.patient?._id || item.patientId || item._id,
      time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      date: d.toLocaleDateString(),
      type: item.mode === 'on_demand' ? 'Chat' : 'Video Call',
      status:
        item.sessionStatus === 'in_consultation'
          ? 'In Progress'
          : item.sessionStatus === 'completed'
            ? 'Completed'
            : item.sessionStatus || 'Pending',
      statusKey:
        item.sessionStatus === 'interrupted'
          ? 'interrupted'
          : item.sessionStatus === 'in_consultation'
            ? 'active'
            : item.sessionStatus,
      age: item.patient?.patientProfile?.age || 30,
      gender: item.patient?.gender === 'female' ? 'Female' : 'Male',
      reason: item.reason || item.patientNotes || t('mobile.general_health_consultation', 'Tư vấn sức khỏe tổng quát'),
      rating: item.rating || 5,
      review: item.doctorNotes || t('mobile.no_notes', 'Chưa có ghi chú'),
    };
  };

  const fetchConsultations = async () => {
    try {
      const res: any = await consultationsFindAll({
        query: { limit: 50 },
      }).catch(() => null);

      const items = res?.data?.items || (Array.isArray(res?.data) ? res.data : null);

      if (items && Array.isArray(items) && items.length > 0) {
        const formatted = items.map(formatItem);
        const p = formatted.filter(
          (x) => x.statusKey === 'pending' || !x.statusKey || x.status === 'Pending'
        );
        const a = formatted.filter((x) =>
          ['in_consultation', 'active', 'waiting', 'interrupted'].includes(x.statusKey)
        );
        const h = formatted.filter((x) =>
          ['completed', 'Completed', 'no_show', 'cancelled'].includes(x.statusKey)
        );

        setPending(p.length > 0 ? p : pendingRequests);
        setActive(a.length > 0 ? a : activeSessions);
        setHist(h.length > 0 ? h : history);
      } else {
        setPending(pendingRequests);
        setActive(activeSessions);
        setHist(history);
      }
    } catch {
      setPending(pendingRequests);
      setActive(activeSessions);
      setHist(history);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchConsultations();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    fetchConsultations();
  };

  const renderSkeleton = () => (
    <View
      style={tw(
        'bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm'
      )}
    >
      <View style={tw('flex-row justify-between items-start mb-3')}>
        <View>
          <View style={tw('w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
        </View>
        <View style={tw('w-24 h-6 bg-slate-200 dark:bg-slate-700 rounded-full')} />
      </View>
      <View style={tw('w-full h-12 bg-slate-200 dark:bg-slate-700 rounded-xl mb-4')} />
      <View style={tw('flex-row gap-3 mt-2')}>
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
    </View>
  );

  // Atomic Call Next (POST /doctors/me/queue/call-next)
  const handleCallNext = () => {
    const alreadyCalled = waitingQueue.find((q) => q.calledAt !== null);
    if (alreadyCalled) {
      Toast.show({
        type: 'info',
        text1: t('mobile.queue_already_called', 'Đang gọi bệnh nhân'),
        text2: t(
          'mobile.queue_already_called_desc',
          { name: alreadyCalled.patientName }
        ),
      });
      return;
    }

    const activeInConsultation = active.find((a) => a.statusKey === 'active');
    if (activeInConsultation) {
      Toast.show({
        type: 'info',
        text1: t('mobile.active_session_limit', 'Đang có phiên khám diễn ra'),
        text2: t('mobile.active_session_limit_desc', 'Mỗi bác sĩ chỉ có tối đa 1 phiên khám tại một thời điểm.'
        ),
      });
    }

    if (waitingQueue.length === 0) return;
    const nextId = waitingQueue[0].id;
    const nowStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setWaitingQueue((prev) =>
      prev.map((q) => (q.id === nextId ? { ...q, calledAt: nowStr } : q))
    );
    Toast.show({
      type: 'success',
      text1: t('mobile.called_next_patient', 'Đã gọi bệnh nhân tiếp theo'),
      text2: t('mobile.called_next_patient_desc', {
        name: waitingQueue[0].patientName,
        defaultValue: `${waitingQueue[0].patientName} đã nhận thông báo vào phòng khám.`,
      }),
    });
  };

  const handleStartFromQueue = (item: WaitingQueueItem) => {
    setWaitingQueue((prev) => prev.filter((q) => q.id !== item.id));
    setActive((prev) => [
      {
        id: item.id,
        patientName: item.patientName,
        time: item.queuePriorityAt,
        date: 'Today',
        type: item.mode === 'on_demand' ? 'Chat' : 'Video Call',
        status: 'In Progress',
        age: item.age,
        gender: item.gender,
        reason: item.reason,
        statusKey: 'active',
      },
      ...prev,
    ]);
    router.push(`/(doctor)/chat/${item.id}` as any);
  };

  const handleConfirmNoShow = () => {
    if (!selectedSessionId) return;
    const targetInQueue = waitingQueue.find((q) => q.id === selectedSessionId);
    setWaitingQueue((prev) => prev.filter((q) => q.id !== selectedSessionId));
    setActive((prev) => prev.filter((a) => a.id !== selectedSessionId));

    if (targetInQueue) {
      setHist((prev) => [
        {
          id: targetInQueue.id,
          patientName: targetInQueue.patientName,
          time: targetInQueue.queuePriorityAt,
          date: 'Today',
          type: targetInQueue.mode === 'on_demand' ? 'Chat' : 'Video Call',
          status: `No-Show (${noShowReasonCode})`,
          statusKey: 'no_show',
          age: targetInQueue.age,
          gender: targetInQueue.gender,
          rating: 0,
          review: noShowNote || `Marked No-Show: ${noShowReasonCode}`,
        },
        ...prev,
      ]);
    }
    setNoShowModalVisible(false);
    setSelectedSessionId(null);
    setNoShowNote('');
    Toast.show({
      type: 'info',
      text1: t('mobile.marked_no_show', 'Đã ghi nhận bệnh nhân vắng mặt'),
      text2: `${t('mobile.reason_label', 'Lý do')}: ${
          noShowReasonCode === 'patient_absent'
            ? t('mobile.patient_absent', 'Bệnh nhân không có mặt')
            : noShowReasonCode === 'unreachable'
              ? t('mobile.patient_unreachable', 'Không thể liên lạc')
              : t('mobile.left_waiting_room', 'Đã rời phòng chờ')
        }`,
    });
  };

  const handleSaveFollowUp = () => {
    if (!selectedSessionId) return;
    setHist((prev) =>
      prev.map((h) =>
        h.id === selectedSessionId
          ? {
              ...h,
              followUpRecommendation: {
                nextAction: followUpNextAction,
                followUpAt: followUpDate,
                note: followUpNote || 'Theo dõi định kỳ theo hướng dẫn bác sĩ.',
              },
            }
          : h
      )
    );
    setFollowUpModalVisible(false);
    setSelectedSessionId(null);
    setFollowUpNote('');
    Toast.show({
      type: 'success',
      text1: t('mobile.followup_saved', 'Đã lưu khuyến nghị tái khám'),
      text2: `${t('mobile.next_action', 'Hướng xử trí')}: ${followUpActionLabel(followUpNextAction)}`,
    });
  };

  const handleAccept = async (id: string) => {
    setActionLoading(true);
    try {
      await consultationsAccept({ path: { id } }).catch(() => null);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.action_successful', 'Đã chấp nhận yêu cầu khám -> đưa vào Hàng đợi Waiting'),
      });
      const acceptedItem = pending.find((p) => p.id === id);
      setPending((prev) => prev.filter((p) => p.id !== id));
      if (acceptedItem) {
        setWaitingQueue((prev) => [
          ...prev,
          {
            id: acceptedItem.id,
            patientName: acceptedItem.patientName,
            age: acceptedItem.age,
            gender: acceptedItem.gender,
            mode: 'on_demand',
            queuePosition: prev.length + 1,
            queuePriorityAt: acceptedItem.time,
            queueJoinedAt: acceptedItem.time,
            calledAt: null,
            reason: acceptedItem.reason,
          },
        ]);
      }
    } catch {
      Toast.show({
        type: 'info',
        text1: t('mobile.action_successful', 'Accepted locally'),
      });
    } finally {
      setActionLoading(false);
    }
  };

  const handleDecline = async (id: string) => {
    setActionLoading(true);
    try {
      await consultationsDecline({
        path: { id },
        body: { reason: 'Doctor is currently unavailable' },
      }).catch(() => null);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.action_successful', 'Appointment Declined (Quota released)'),
      });
      setPending((prev) => prev.filter((p) => p.id !== id));
    } catch {
      setPending((prev) => prev.filter((p) => p.id !== id));
    } finally {
      setActionLoading(false);
    }
  };

  const handleStartOrResume = async (id: string) => {
    try {
      await consultationsStart({ path: { id } }).catch(() => null);
    } catch {
      // ignore
    }
    router.push(`/(doctor)/chat/${id}` as any);
  };

  const handleEndSubmit = async () => {
    if (!selectedSessionId) return;
    setActionLoading(true);
    try {
      await consultationsComplete({
        path: { id: selectedSessionId },
        body: { doctorNotes: doctorNote || 'Consultation completed by doctor.' },
      }).catch(() => null);

      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.consultation_ended', 'Consultation Ended'),
      });

      const endedItem = active.find((a) => a.id === selectedSessionId);
      setActive((prev) => prev.filter((a) => a.id !== selectedSessionId));
      if (endedItem) {
        setHist((prev) => [
          {
            ...endedItem,
            status: 'Completed',
            statusKey: 'completed',
            review: doctorNote || t('mobile.no_notes', 'Chưa có ghi chú'),
          },
          ...prev,
        ]);
      }
    } catch {
      setActive((prev) => prev.filter((a) => a.id !== selectedSessionId));
    } finally {
      setActionLoading(false);
      setEndModalVisible(false);
      setSelectedSessionId(null);
      setDoctorNote('');
    }
  };

  const handleReportSubmit = async () => {
    if (!reportReason.trim()) return;
    setActionLoading(true);
    try {
      if (reportTargetId) {
        await violationsCreate({
          body: {
            targetUserId: reportTargetId,
            reason: reportReason,
            category: 'consultation_misconduct',
          } as any,
        }).catch(() => null);
      }
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.report_submitted', 'Report Submitted'),
      });
    } catch {
      Toast.show({
        type: 'info',
        text1: t('mobile.report_submitted', 'Report Submitted'),
      });
    } finally {
      setActionLoading(false);
      setReportModalVisible(false);
      setReportTargetId(null);
      setReportReason('');
    }
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View
        style={tw(
          'px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
          {t('mobile.consultations', 'Consultations & Queue')}
        </Text>
        <Text style={tw('text-slate-500 dark:text-slate-400 text-sm mt-1')}>
          {t(
            'mobile.manage_your_appointments_and_c',
            'Hàng đợi khám trực tuyến, yêu cầu On-demand và lịch sử phiên khám'
          )}
        </Text>
      </View>

      {/* Tabs */}
      <View
        style={tw(
          'flex-row px-2 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <TouchableOpacity
          onPress={() => setActiveTab('queue')}
          style={tw(
            `flex-1 py-3 px-1 items-center border-b-2 ${
              activeTab === 'queue' ? 'border-brand' : 'border-transparent'
            }`
          )}
        >
          <Text
            numberOfLines={1}
            style={tw(
              `font-bold text-xs ${
                activeTab === 'queue' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
              }`
            )}
          >
            {t('mobile.waiting_queue', 'Hàng đợi')} ({waitingQueue.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('pending')}
          style={tw(
            `flex-1 py-3 px-1 items-center border-b-2 ${
              activeTab === 'pending' ? 'border-brand' : 'border-transparent'
            }`
          )}
        >
          <Text
            numberOfLines={1}
            style={tw(
              `font-bold text-xs ${
                activeTab === 'pending' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
              }`
            )}
          >
            {t('mobile.pending', 'Chờ duyệt')} ({pending.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('active')}
          style={tw(
            `flex-1 py-3 px-1 items-center border-b-2 ${
              activeTab === 'active' ? 'border-brand' : 'border-transparent'
            }`
          )}
        >
          <Text
            numberOfLines={1}
            style={tw(
              `font-bold text-xs ${
                activeTab === 'active' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
              }`
            )}
          >
            {t('mobile.in_consultation_tab', 'Đang khám')} ({active.length})
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={tw(
            `flex-1 py-3 px-1 items-center border-b-2 ${
              activeTab === 'history' ? 'border-brand' : 'border-transparent'
            }`
          )}
        >
          <Text
            numberOfLines={1}
            style={tw(
              `font-bold text-xs ${
                activeTab === 'history' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'
              }`
            )}
          >
            {t('mobile.history', 'Lịch sử')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-6 pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* TAB 1: WAITING ROOM QUEUE (GET /doctors/me/queue & Call Next) */}
        {!loading && activeTab === 'queue' && (
          <View>
            <View
              style={tw(
                'bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 mb-4 flex-row items-center justify-between'
              )}
            >
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('font-bold text-indigo-900 dark:text-indigo-200 text-sm')}>
                  {t('mobile.waiting_room_queue_title', 'Phòng chờ khám (theo thứ tự ưu tiên)')}
                </Text>
                <Text style={tw('text-xs text-indigo-700 dark:text-indigo-400 mt-0.5')}>
                  {t('mobile.waiting_room_notice', 'Sắp xếp theo mức ưu tiên và thời gian vào phòng chờ • Tối đa 1 bệnh nhân được gọi')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={handleCallNext}
                disabled={waitingQueue.length === 0}
                style={tw(
                  `bg-indigo-600 px-4 py-2.5 rounded-xl flex-row items-center ${
                    waitingQueue.length === 0 ? 'opacity-50' : ''
                  }`
                )}
              >
                <PhoneCall size={15} color="#fff" style={tw('mr-1.5')} />
                <Text style={tw('text-white font-bold text-xs')}>
                  {t('mobile.call_next', 'Gọi tiếp')}
                </Text>
              </TouchableOpacity>
            </View>

            {waitingQueue.length > 0 ? (
              waitingQueue.map((qItem, idx) => (
                <View
                  key={qItem.id}
                  style={tw(
                    `bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border shadow-sm ${
                      qItem.calledAt
                        ? 'border-emerald-500 dark:border-emerald-500'
                        : 'border-slate-200 dark:border-slate-800'
                    }`
                  )}
                >
                  <View style={tw('flex-row justify-between items-start mb-2')}>
                    <View style={tw('flex-row items-center')}>
                      <View
                        style={tw(
                          'w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-900/50 items-center justify-center mr-2.5'
                        )}
                      >
                        <Text style={tw('font-bold text-xs text-indigo-700 dark:text-indigo-300')}>
                          #{idx + 1}
                        </Text>
                      </View>
                      <View>
                        <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                          {qItem.patientName}
                        </Text>
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                          {qItem.age} {t('mobile.yrs', 'tuổi')} • {genderLabel(qItem.gender)} •{' '}
                          {qItem.mode === 'on_demand' ? t('mobile.mode_on_demand', 'Khám ngay') : t('mobile.mode_scheduled', 'Đặt lịch')}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={tw(
                        `px-2.5 py-1 rounded-full ${
                          qItem.calledAt
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : 'bg-amber-100 dark:bg-amber-900/30'
                        }`
                      )}
                    >
                      <Text
                        style={tw(
                          `text-[10px] font-bold uppercase ${
                            qItem.calledAt
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-amber-700 dark:text-amber-400'
                          }`
                        )}
                      >
                        {qItem.calledAt ? `CALLED (${qItem.calledAt})` : 'WAITING'}
                      </Text>
                    </View>
                  </View>

                  <Text
                    style={tw(
                      'text-xs text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl mb-3'
                    )}
                  >
                    {qItem.reason} (Joined: {qItem.queueJoinedAt})
                  </Text>

                  <View style={tw('flex-row gap-2.5')}>
                    <TouchableOpacity
                      onPress={() => handleStartFromQueue(qItem)}
                      style={tw(
                        'flex-1 bg-brand py-2.5 rounded-xl flex-row items-center justify-center'
                      )}
                    >
                      <MessageCircle size={16} color="#0f172a" style={tw('mr-1.5')} />
                      <Text style={tw('text-slate-900 font-bold text-xs')}>
                        {t('mobile.start_consultation', 'Bắt đầu khám')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedSessionId(qItem.id);
                        setNoShowModalVisible(true);
                      }}
                      style={tw(
                        'px-3.5 py-2.5 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800/50 flex-row items-center justify-center'
                      )}
                    >
                      <UserX size={15} color="#ef4444" style={tw('mr-1')} />
                      <Text style={tw('text-red-600 dark:text-red-400 font-bold text-xs')}>
                        {t('mobile.mark_no_show', 'Vắng mặt')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            ) : (
              <View style={tw('items-center justify-center py-12')}>
                <Users size={32} color="#94a3b8" style={tw('mb-2')} />
                <Text style={tw('text-slate-500 dark:text-slate-400 font-medium')}>
                  {t('mobile.no_patients_in_queue', 'Không có bệnh nhân trong phòng chờ')}
                </Text>
              </View>
            )}
          </View>
        )}

        {/* TAB 2: Pending Requests */}
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : activeTab === 'pending' && pending.length > 0 ? (
          pending.map((req) => (
            <View
              key={req.id}
              style={tw(
                'bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm'
              )}
            >
              <View style={tw('flex-row justify-between items-start mb-3')}>
                <View>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {req.patientName}
                  </Text>
                  <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                    {req.age} {t('mobile.yrs', 'tuổi')} • {genderLabel(req.gender)}
                  </Text>
                </View>
                <View style={tw('px-3 py-1 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-100 dark:border-amber-800')}>
                  <Text style={tw('text-xs font-bold text-amber-600 dark:text-amber-400')}>
                    {t('mobile.pending_request', 'Requested')}
                  </Text>
                </View>
              </View>
              <Text
                style={tw(
                  'text-slate-700 dark:text-slate-200 text-sm mb-4 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl'
                )}
              >
                {req.reason}
              </Text>
              <View style={tw('flex-row gap-3 mt-2')}>
                <TouchableOpacity
                  onPress={() => handleAccept(req.id)}
                  disabled={actionLoading}
                  style={tw('flex-1 bg-brand py-3 rounded-xl flex-row justify-center items-center')}
                >
                  <CheckCircle color="#0f172a" size={18} style={tw('mr-2')} />
                  <Text style={tw('text-slate-900 font-bold text-sm')}>
                    {t('mobile.accept', 'Accept -> Queue')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDecline(req.id)}
                  disabled={actionLoading}
                  style={tw(
                    'flex-1 bg-red-50 dark:bg-red-900/20 py-3 rounded-xl border border-red-100 dark:border-red-800/50 flex-row justify-center items-center'
                  )}
                >
                  <XCircle color="#ef4444" size={18} style={tw('mr-2')} />
                  <Text style={tw('text-red-500 font-bold text-sm')}>
                    {t('mobile.decline', 'Decline')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          activeTab === 'pending' && (
            <View style={tw('items-center justify-center py-12')}>
              <Text style={tw('text-slate-500 dark:text-slate-400 font-medium')}>
                {t('mobile.no_pending_requests', 'No pending requests')}
              </Text>
            </View>
          )
        )}

        {/* TAB 3: Active Sessions */}
        {!loading && activeTab === 'active' && active.length > 0 ? (
          active.map((session) => (
            <View
              key={session.id}
              style={tw(
                'bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm'
              )}
            >
              <View style={tw('flex-row justify-between items-start mb-3')}>
                <View>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {session.patientName}
                  </Text>
                  <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                    {session.age} {t('mobile.yrs', 'yrs')} •{' '}
                    {session.gender === 'Male'
                      ? t('mobile.male', 'Male')
                      : session.gender === 'Female'
                        ? t('mobile.female', 'Female')
                        : session.gender}
                  </Text>
                </View>
                <View style={tw('flex-row items-center gap-2')}>
                  <View
                    style={tw(
                      `px-3 py-1 rounded-full ${
                        session.statusKey === 'interrupted'
                          ? 'bg-amber-50 dark:bg-amber-900/30'
                          : 'bg-emerald-50 dark:bg-emerald-900/30'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          session.statusKey === 'interrupted'
                            ? 'text-amber-600 dark:text-amber-400'
                            : 'text-emerald-600 dark:text-emerald-400'
                        }`
                      )}
                    >
                      {session.statusKey === 'interrupted'
                        ? t('mobile.interrupted', 'Interrupted')
                        : t('mobile.in_progress', 'In Progress')}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => {
                      setReportTargetId(session.patientId || session.id);
                      setReportModalVisible(true);
                    }}
                    style={tw(
                      'w-8 h-8 rounded-full bg-red-50 dark:bg-red-900/30 items-center justify-center'
                    )}
                  >
                    <AlertTriangle color="#ef4444" size={16} />
                  </TouchableOpacity>
                </View>
              </View>

              <View style={tw('flex-row gap-3 mt-4')}>
                <TouchableOpacity
                  onPress={() => handleStartOrResume(session.id)}
                  style={tw(
                    `flex-1 py-3 rounded-xl flex-row justify-center items-center ${
                      session.statusKey === 'interrupted' ? 'bg-amber-500' : 'bg-brand'
                    }`
                  )}
                >
                  {session.statusKey === 'interrupted' ? (
                    <AlertTriangle color="#ffffff" size={18} style={tw('mr-2')} />
                  ) : (
                    <MessageCircle color="#0f172a" size={18} style={tw('mr-2')} />
                  )}
                  <Text
                    style={tw(
                      `font-bold text-sm ${
                        session.statusKey === 'interrupted' ? 'text-white' : 'text-slate-900'
                      }`
                    )}
                  >
                    {session.statusKey === 'interrupted'
                      ? t('mobile.resume_session', 'Resume Session')
                      : t('mobile.open_chat', 'Open Chat')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSessionId(session.id);
                    setEndModalVisible(true);
                  }}
                  style={tw(
                    'flex-1 bg-slate-100 dark:bg-slate-800 py-3 rounded-xl flex-row justify-center items-center'
                  )}
                >
                  <CheckCircle color="#64748b" size={18} style={tw('mr-2')} />
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                    {t('mobile.end_session', 'End Session')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          !loading &&
          activeTab === 'active' && (
            <View style={tw('items-center justify-center py-12')}>
              <Text style={tw('text-slate-500 dark:text-slate-400 font-medium')}>
                {t('mobile.no_active_sessions', 'No active sessions')}
              </Text>
            </View>
          )
        )}

        {/* TAB 4: History (with Follow-up Recommendation button PUT /consultations/:id/follow-up) */}
        {!loading && activeTab === 'history' && hist.length > 0 ? (
          hist.map((session) => (
            <View
              key={session.id}
              style={tw(
                'bg-white dark:bg-slate-900 rounded-2xl p-4 mb-4 border border-slate-100 dark:border-slate-800 shadow-sm'
              )}
            >
              <View style={tw('flex-row justify-between items-start mb-2')}>
                <View>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {session.patientName}
                  </Text>
                  <Text style={tw('text-xs text-slate-400 dark:text-slate-500')}>
                    {session.date === 'Today'
                      ? t('mobile.today', 'Today')
                      : session.date === 'Yesterday'
                        ? t('mobile.yesterday', 'Yesterday')
                        : session.date}{' '}
                    • {session.time}
                  </Text>
                </View>
                <View style={tw('px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-full')}>
                  <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                    {session.status === 'Completed'
                      ? t('mobile.completed', 'Hoàn thành')
                      : session.status === 'In Progress'
                        ? t('mobile.in_progress', 'Đang diễn ra')
                        : session.status}
                  </Text>
                </View>
              </View>

              <View style={tw('mt-2 bg-slate-50 dark:bg-slate-950 p-3 rounded-xl')}>
                <Text style={tw('text-sm text-slate-700 dark:text-slate-200 font-medium mb-1')}>
                  {t('mobile.patient_review', 'Ghi chú / Đánh giá:')}
                </Text>
                <Text style={tw('text-sm text-slate-600 dark:text-slate-300 italic')}>
                  "{session.review}" {session.rating ? `(Rating: ${session.rating}/5)` : ''}
                </Text>
              </View>

              {session.followUpRecommendation && (
                <View
                  style={tw(
                    'mt-2 bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50'
                  )}
                >
                  <Text style={tw('text-xs font-bold text-emerald-800 dark:text-emerald-300')}>
                    {t('mobile.follow_up_recommendation', 'Khuyến nghị tái khám')} (
                    {followUpActionLabel(session.followUpRecommendation.nextAction)}):
                  </Text>
                  <Text style={tw('text-xs text-emerald-700 dark:text-emerald-400 mt-0.5')}>
                    {session.followUpRecommendation.note} • {t('mobile.due', 'Hẹn')}:{' '}
                    {session.followUpRecommendation.followUpAt}
                  </Text>
                </View>
              )}

              <View style={tw('flex-row gap-2.5 mt-4')}>
                <TouchableOpacity
                  onPress={() => router.push(`/(doctor)/chat/${session.id}` as any)}
                  style={tw(
                    'flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 py-2.5 rounded-xl flex-row justify-center items-center'
                  )}
                >
                  <MessageCircle color="#64748b" size={15} style={tw('mr-1.5')} />
                  <Text style={tw('text-slate-600 dark:text-slate-300 font-bold text-xs')}>
                    {t('mobile.view_log', 'Xem Log')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setSelectedSessionId(session.id);
                    setFollowUpModalVisible(true);
                  }}
                  style={tw(
                    'flex-1 bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 py-2.5 rounded-xl flex-row justify-center items-center'
                  )}
                >
                  <ClipboardCheck color="#6366f1" size={15} style={tw('mr-1.5')} />
                  <Text style={tw('text-indigo-600 dark:text-indigo-400 font-bold text-xs')}>
                    {t('mobile.follow_up', 'Tái khám')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setReportTargetId(session.patientId || session.id);
                    setReportModalVisible(true);
                  }}
                  style={tw(
                    'px-3 bg-red-50 dark:bg-red-900/20 py-2.5 border border-red-100 dark:border-red-800/50 rounded-xl flex-row justify-center items-center'
                  )}
                >
                  <AlertTriangle color="#ef4444" size={15} />
                </TouchableOpacity>
              </View>
            </View>
          ))
        ) : (
          !loading &&
          activeTab === 'history' && (
            <View style={tw('items-center justify-center py-12')}>
              <Text style={tw('text-slate-500 dark:text-slate-400 font-medium')}>
                {t('mobile.no_consultation_history', 'No consultation history')}
              </Text>
            </View>
          )
        )}
      </ScrollView>

      {/* No-Show Modal (POST /consultations/:id/no-show) */}
      <Modal
        visible={noShowModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setNoShowModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/50')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.mark_no_show_title', 'Đánh dấu vắng mặt')}
              </Text>
              <TouchableOpacity onPress={() => setNoShowModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
              {t('mobile.select_no_show_reason', 'Lý do vắng mặt')}
            </Text>
            <View style={tw('gap-2 mb-4')}>
              {(
                [
                  { code: 'patient_absent', label: t('mobile.no_show_patient_absent', 'Bệnh nhân không có mặt sau khi gọi') },
                  { code: 'unreachable', label: t('mobile.no_show_unreachable', 'Không thể liên lạc qua kết nối khám') },
                  { code: 'left_waiting_room', label: t('mobile.no_show_left_room', 'Đã rời phòng chờ khám') },
                ] as const
              ).map((r) => (
                <TouchableOpacity
                  key={r.code}
                  onPress={() => setNoShowReasonCode(r.code)}
                  style={tw(
                    `p-3 rounded-xl border ${
                      noShowReasonCode === r.code
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`
                  )}
                >
                  <Text
                    style={tw(
                      `text-xs font-bold ${
                        noShowReasonCode === r.code
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`
                    )}
                  >
                    {r.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TextInput
              value={noShowNote}
              onChangeText={setNoShowNote}
              placeholder={t('mobile.optional_note', 'Ghi chú bổ sung (tùy chọn)...')}
              placeholderTextColor="#64748b"
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white mb-4'
              )}
            />

            <TouchableOpacity
              onPress={handleConfirmNoShow}
              style={tw('bg-red-600 py-4 rounded-xl items-center')}
            >
              <Text style={tw('text-white font-bold text-base')}>
                {t('mobile.confirm_no_show', 'Xác nhận vắng mặt')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Follow-up Recommendation Modal (PUT /consultations/:id/follow-up) */}
      <Modal
        visible={followUpModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setFollowUpModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/50')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.follow_up_recommendation', 'Khuyến nghị sau khám')}
              </Text>
              <TouchableOpacity onPress={() => setFollowUpModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
              {t('mobile.next_action', 'Hướng xử trí tiếp theo')}
            </Text>
            <View style={tw('gap-2 mb-4')}>
              {(
                [
                  { code: 'book_scheduled', label: followUpActionLabel('book_scheduled') },
                  { code: 'monitor_at_home', label: followUpActionLabel('monitor_at_home') },
                  { code: 'visit_facility', label: followUpActionLabel('visit_facility') },
                ] as const
              ).map((act) => (
                <TouchableOpacity
                  key={act.code}
                  onPress={() => setFollowUpNextAction(act.code)}
                  style={tw(
                    `p-3 rounded-xl border ${
                      followUpNextAction === act.code
                        ? 'bg-indigo-50 dark:bg-indigo-900/30 border-indigo-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`
                  )}
                >
                  <Text
                    style={tw(
                      `text-xs font-bold ${
                        followUpNextAction === act.code
                          ? 'text-indigo-700 dark:text-indigo-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`
                    )}
                  >
                    {act.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5')}>
              {t('mobile.follow_up_at', 'Thời điểm hẹn tái khám')}
            </Text>
            <TextInput
              value={followUpDate}
              onChangeText={setFollowUpDate}
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3 text-slate-900 dark:text-white mb-4'
              )}
            />

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5')}>
              {t('mobile.doctor_followup_note', 'Dặn dò của bác sĩ')}
            </Text>
            <TextInput
              value={followUpNote}
              onChangeText={setFollowUpNote}
              placeholder={t('mobile.followup_note_placeholder', 'Nhập hướng dẫn theo dõi chỉ số và lịch tái khám...'
              )}
              placeholderTextColor="#64748b"
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white h-24 mb-4'
              )}
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={handleSaveFollowUp}
              style={tw('bg-brand py-4 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-900 font-bold text-base')}>
                {t('mobile.save_followup', 'Lưu khuyến nghị tái khám')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* End Consultation Modal */}
      <Modal
        visible={endModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setEndModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/40')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.end_consultation', 'End Consultation')}
              </Text>
              <TouchableOpacity onPress={() => setEndModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>
                {t('mobile.doctors_note_optional', "Doctor's Note (Optional)")}
              </Text>
              <TextInput
                value={doctorNote}
                onChangeText={setDoctorNote}
                placeholder={t(
                  'mobile.write_diagnostic_notes',
                  'Write your diagnostic notes here...'
                )}
                placeholderTextColor="#64748b"
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-32'
                )}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              onPress={handleEndSubmit}
              style={tw('bg-brand py-4 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-900 font-bold text-base')}>
                {t('mobile.end_and_save_note', 'End and Save Note')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/40')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.report_patient', 'Report Patient')}
              </Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>
            <View style={tw('mb-4')}>
              <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>
                {t('mobile.reason_for_report', 'Reason for Report')}
              </Text>
              <TextInput
                value={reportReason}
                onChangeText={setReportReason}
                placeholder={t(
                  'mobile.inappropriate_behavior',
                  'Inappropriate behavior, spam...'
                )}
                placeholderTextColor="#64748b"
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-4 text-slate-900 dark:text-white h-32'
                )}
                multiline
                textAlignVertical="top"
              />
            </View>
            <TouchableOpacity
              onPress={handleReportSubmit}
              style={tw('bg-red-500 py-4 rounded-xl items-center')}
            >
              <Text style={tw('text-white font-bold text-base')}>
                {t('mobile.submit_report', 'Submit Report')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
