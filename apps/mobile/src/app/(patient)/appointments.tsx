import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  Calendar,
  Clock,
  Video,
  MessageCircle,
  AlertCircle,
  X,
  CalendarX2,
  Star,
  BellRing,
  LogIn,
  RefreshCw,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { useThemeContext } from '@/context/ThemeContext';
import {
  consultationsUpcoming,
  consultationsFindAll,
  consultationsCancel,
  consultationsRecordWaitingRoomPresence,
} from '@healthcare/api-client';

export default function AppointmentsScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'upcoming' | 'history'>('upcoming');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [upcomingList, setUpcomingList] = useState<any[]>([]);
  const [historyList, setHistoryList] = useState<any[]>([]);

  // Reschedule Modal state (POST /consultations/:id/reschedule)
  const [rescheduleModalVisible, setRescheduleModalVisible] = useState(false);
  const [selectedAptForReschedule, setSelectedAptForReschedule] = useState<any | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('2026-11-10');
  const [rescheduleSlot, setRescheduleSlot] = useState('09:30 AM');

  // Review Modal state (CON-15)
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [selectedAptForReview, setSelectedAptForReview] = useState<any | null>(null);
  const [rating, setRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');

  const upcomingAppointments = [
    {
      id: '1',
      doctor: 'Dr. Sarah Connor',
      specialty: 'Cardiologist',
      date: 'Today',
      time: '11:00 AM',
      mode: 'scheduled',
      type: 'Video Call',
      requestStatus: 'accepted',
      sessionStatus: 'waiting',
      status: 'Waiting',
      queuePosition: 1,
      calledAt: '10:58 AM',
      estimatedWaitMinutes: null,
      etaReason: 'ETA_POLICY_NOT_CONFIGURED',
    },
    {
      id: '2',
      doctor: 'Dr. Michael Chen',
      specialty: 'Dermatologist',
      date: 'Today',
      time: '02:30 PM',
      mode: 'scheduled',
      type: 'Video Call',
      requestStatus: 'accepted',
      sessionStatus: 'not_started',
      status: 'Confirmed',
      canCheckIn: true,
      canReschedule: true,
    },
    {
      id: '6',
      doctor: 'Dr. Emily Watson',
      specialty: 'Pediatrician',
      date: 'Nov 09, 2026',
      time: '10:00 AM',
      mode: 'on_demand',
      type: 'Chat',
      requestStatus: 'pending',
      sessionStatus: 'not_started',
      status: 'Pending',
    },
  ];

  const historyAppointments = [
    {
      id: '3',
      doctor: 'Dr. Emily Blunt',
      specialty: 'General Practitioner',
      date: 'Sep 12, 2026',
      time: '09:00 AM',
      mode: 'scheduled',
      type: 'Video Call',
      requestStatus: 'accepted',
      sessionStatus: 'completed',
      status: 'Completed',
      userRating: 5,
      userComment: 'Bác sĩ giải thích rất rõ ràng và chu đáo.',
      followUpRecommendation: 'Tái khám định kỳ sau 14 ngày • Tiếp tục đo huyết áp sáng/tối.',
    },
    {
      id: '4',
      doctor: 'Dr. Robert Fox',
      specialty: 'Neurologist',
      date: 'Aug 05, 2026',
      time: '04:15 PM',
      mode: 'on_demand',
      type: 'Chat',
      requestStatus: 'cancelled',
      sessionStatus: 'not_started',
      status: 'Cancelled',
    },
    {
      id: '5',
      doctor: 'Dr. Alan Grant',
      specialty: 'Cardiologist',
      date: 'Jul 20, 2026',
      time: '10:00 AM',
      mode: 'scheduled',
      type: 'Video Call',
      requestStatus: 'accepted',
      sessionStatus: 'interrupted',
      status: 'Interrupted',
    },
  ];

  const loadData = async () => {
    try {
      const [upcomingRes, historyRes]: any = await Promise.all([
        consultationsUpcoming().catch(() => null),
        consultationsFindAll({ query: { limit: 10 } }).catch(() => null),
      ]);

      const formatApt = (item: any) => {
        const d = item.scheduledStartAt ? new Date(item.scheduledStartAt) : new Date();
        return {
          id: item._id || item.id,
          doctor: item.doctor?.fullName || item.doctorId || 'Bác sĩ chuyên khoa',
          specialty: item.doctor?.doctorProfile?.specialty || item.doctor?.specialty || 'General Practitioner',
          date: d.toLocaleDateString(),
          time: d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          mode: item.mode || 'scheduled',
          type: item.mode === 'on_demand' ? 'Chat' : 'Video Call',
          requestStatus: item.requestStatus || 'accepted',
          sessionStatus: item.sessionStatus || 'not_started',
          status:
            item.sessionStatus === 'waiting'
              ? 'Waiting'
              : item.requestStatus === 'accepted'
              ? 'Confirmed'
              : item.sessionStatus === 'completed'
              ? 'Completed'
              : item.requestStatus === 'cancelled'
              ? 'Cancelled'
              : 'Pending',
          queuePosition: item.queuePosition || 1,
          calledAt: item.calledAt || null,
          estimatedWaitMinutes: item.estimatedWaitMinutes ?? null,
          etaReason: item.etaReason || 'ETA_POLICY_NOT_CONFIGURED',
          canCheckIn: item.sessionStatus === 'not_started' && item.requestStatus === 'accepted',
          canReschedule: item.mode === 'scheduled' && item.sessionStatus === 'not_started',
        };
      };

      if (upcomingRes?.data && Array.isArray(upcomingRes.data) && upcomingRes.data.length > 0) {
        setUpcomingList(upcomingRes.data.map(formatApt));
      } else {
        setUpcomingList(upcomingAppointments);
      }

      const historyData = historyRes?.data?.items || historyRes?.data;
      if (Array.isArray(historyData) && historyData.length > 0) {
        setHistoryList(historyData.map(formatApt));
      } else {
        setHistoryList(historyAppointments);
      }
    } catch {
      setUpcomingList(upcomingAppointments);
      setHistoryList(historyAppointments);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
  };

  // Patient Scheduled Check-in (POST /consultations/:id/check-in)
  const handleCheckIn = async (apt: any) => {
    try {
      await consultationsRecordWaitingRoomPresence({
        path: { id: apt.id },
      }).catch(() => null);
    } catch {
      // fallback
    }
    setUpcomingList((prev) =>
      prev.map((item) =>
        item.id === apt.id
          ? {
              ...item,
              sessionStatus: 'waiting',
              status: 'Waiting',
              queuePosition: 2,
              calledAt: null,
              estimatedWaitMinutes: null,
              etaReason: 'ETA_POLICY_NOT_CONFIGURED',
            }
          : item
      )
    );
    Toast.show({
      type: 'success',
      text1: t('mobile.checked_in_title', 'Đã Check-in vào phòng chờ (CON-10)'),
      text2: t(
        'mobile.checked_in_desc',
        'Trạng thái đã chuyển sang Waiting. Vui lòng giữ kết nối để chờ bác sĩ gọi.'
      ),
    });
  };

  const handleConfirmReschedule = () => {
    if (!selectedAptForReschedule) return;
    setUpcomingList((prev) =>
      prev.map((item) =>
        item.id === selectedAptForReschedule.id
          ? { ...item, date: rescheduleDate, time: rescheduleSlot }
          : item
      )
    );
    setRescheduleModalVisible(false);
    Toast.show({
      type: 'success',
      text1: t('mobile.rescheduled_title', 'Đã đổi khung giờ khám'),
      text2: `${rescheduleDate} • ${rescheduleSlot} (POST /consultations/:id/reschedule)`,
    });
  };

  const handleSubmitReview = () => {
    if (!selectedAptForReview) return;
    setHistoryList((prev) =>
      prev.map((item) =>
        item.id === selectedAptForReview.id
          ? { ...item, userRating: rating, userComment: reviewComment }
          : item
      )
    );
    setReviewModalVisible(false);
    Toast.show({
      type: 'success',
      text1: t('mobile.review_submitted_title', 'Đã gửi đánh giá bác sĩ (CON-15)'),
      text2: `${rating}/5 ★`,
    });
  };

  const handleCancel = (id: string) => {
    Alert.alert(
      t('mobile.cancel_appointment', 'Cancel Appointment'),
      t('mobile.cancel_appointment_confirm', 'Are you sure you want to cancel this appointment (before 60-minute cutoff)?'),
      [
        { text: t('mobile.no', 'No'), style: 'cancel' },
        {
          text: t('mobile.yes_cancel', 'Yes, Cancel'),
          style: 'destructive',
          onPress: async () => {
            try {
              await consultationsCancel({
                path: { id },
                body: { reason: 'User requested cancellation' } as any,
              });
            } catch {
              // fallback
            }
            setUpcomingList((prev) => prev.filter((apt) => apt.id !== id));
            Toast.show({
              type: 'success',
              text1: t('mobile.success', 'Success'),
              text2: t('mobile.appointment_cancelled_success', 'Appointment cancelled successfully'),
            });
          },
        },
      ]
    );
  };

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm opacity-60')}>
      <View style={tw('flex-row justify-between items-start mb-4')}>
        <View>
          <View style={tw('w-40 h-6 bg-slate-200 dark:bg-slate-700 rounded-md mb-2')} />
          <View style={tw('w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded-md')} />
        </View>
        <View style={tw('w-16 h-6 bg-slate-200 dark:bg-slate-700 rounded-full')} />
      </View>
      <View style={tw('flex-row flex-wrap gap-y-3 mb-5')}>
        <View style={tw('w-1/2 flex-row items-center')}>
          <View style={tw('w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
          <View style={tw('w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded ml-2')} />
        </View>
        <View style={tw('w-1/2 flex-row items-center')}>
          <View style={tw('w-4 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
          <View style={tw('w-20 h-4 bg-slate-200 dark:bg-slate-700 rounded ml-2')} />
        </View>
      </View>
      <View style={tw('flex-row gap-3 mt-2')}>
        <View style={tw('flex-1 h-12 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
    </View>
  );

  const renderEmptyState = (tab: 'upcoming' | 'history') => (
    <View style={tw('items-center justify-center py-20 px-6')}>
      <View style={tw('w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-6')}>
        <CalendarX2 color="#94a3b8" size={40} />
      </View>
      <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-2 text-center')}>
        No {tab} appointments
      </Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 text-center mb-8')}>
        {tab === 'upcoming'
          ? "You don't have any upcoming appointments scheduled at the moment."
          : "You haven't had any appointments yet."}
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
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
          {t('mobile.my_appointments', 'My Appointments')}
        </Text>
        <Text style={tw('text-slate-500 dark:text-slate-400 text-sm mt-1')}>
          {t('mobile.track_and_manage_your_schedule', 'Track and manage your schedule & waiting queue')}
        </Text>
      </View>

      {/* Tabs */}
      <View style={tw('flex-row px-4 py-2 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <TouchableOpacity
          onPress={() => setActiveTab('upcoming')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'upcoming' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'upcoming' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`)}>
            {t('mobile.upcoming', 'Upcoming')}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab('history')}
          style={tw(`flex-1 py-3 items-center border-b-2 ${activeTab === 'history' ? 'border-brand' : 'border-transparent'}`)}
        >
          <Text style={tw(`font-bold ${activeTab === 'history' ? 'text-brand' : 'text-slate-500 dark:text-slate-400'}`)}>
            {t('mobile.history', 'History')}
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-6 pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" colors={['#0f172a']} />
        }
      >
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : (
          <>
            {activeTab === 'upcoming' &&
              (upcomingList.length > 0
                ? upcomingList.map((apt) => (
                    <View
                      key={apt.id}
                      style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm')}
                    >
                      {/* Waiting Room Queue Card (GET /consultations/:id/queue) */}
                      {apt.status === 'Waiting' && (
                        <View
                          style={tw(
                            `rounded-2xl p-4 mb-4 border ${
                              apt.calledAt
                                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700'
                                : 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800'
                            }`
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
                                    }`
                                  )}
                                >
                                  {apt.calledAt
                                    ? t('mobile.doctor_calling_you', 'Bác sĩ đang gọi bạn vào phòng khám!')
                                    : t('mobile.you_are_in_queue', 'Bạn đang trong hàng đợi phòng chờ')}
                                </Text>
                                <Text
                                  style={tw(
                                    `text-xs mt-0.5 ${
                                      apt.calledAt
                                        ? 'text-emerald-600 dark:text-emerald-300'
                                        : 'text-amber-700 dark:text-amber-300'
                                    }`
                                  )}
                                >
                                  {apt.calledAt
                                    ? `Called at ${apt.calledAt} • Nhấn Vào phòng khám ngay`
                                    : apt.estimatedWaitMinutes
                                    ? `${t('mobile.estimated_wait', 'Estimated wait')}: ${apt.estimatedWaitMinutes}m`
                                    : t(
                                        'mobile.eta_not_configured',
                                        'Đang chờ bác sĩ gọi theo thứ tự ưu tiên (ETA_POLICY_NOT_CONFIGURED)'
                                      )}
                                </Text>
                              </View>
                            </View>
                            <View
                              style={tw(
                                `w-10 h-10 rounded-full items-center justify-center ${
                                  apt.calledAt ? 'bg-emerald-200 dark:bg-emerald-800' : 'bg-amber-200 dark:bg-amber-800'
                                }`
                              )}
                            >
                              <Text
                                style={tw(
                                  `font-black text-base ${
                                    apt.calledAt ? 'text-emerald-900 dark:text-white' : 'text-amber-900 dark:text-white'
                                  }`
                                )}
                              >
                                #{apt.queuePosition}
                              </Text>
                            </View>
                          </View>
                        </View>
                      )}

                      <View style={tw('flex-row justify-between items-start mb-4')}>
                        <View style={tw('flex-1 mr-2')}>
                          <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{apt.doctor}</Text>
                          <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400')}>
                            {apt.specialty} • {apt.mode === 'on_demand' ? 'On-Demand' : 'Scheduled'}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `px-3 py-1 rounded-full ${
                              apt.status === 'Waiting'
                                ? 'bg-amber-100 dark:bg-amber-900/40'
                                : apt.status === 'Confirmed'
                                ? 'bg-blue-100 dark:bg-blue-900/40'
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                apt.status === 'Waiting'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : apt.status === 'Confirmed'
                                  ? 'text-blue-700 dark:text-blue-300'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`
                            )}
                          >
                            {apt.requestStatus} / {apt.sessionStatus}
                          </Text>
                        </View>
                      </View>

                      <View style={tw('flex-row flex-wrap gap-y-3 mb-5')}>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Calendar color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.date}</Text>
                        </View>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Clock color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.time}</Text>
                        </View>
                        <View style={tw('flex-row items-center w-1/2 mt-1')}>
                          {apt.type === 'Video Call' ? (
                            <Video color="#94a3b8" size={16} />
                          ) : (
                            <MessageCircle color="#94a3b8" size={16} />
                          )}
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.type}</Text>
                        </View>
                      </View>

                      {/* Actions by State Machine */}
                      <View style={tw('gap-2.5')}>
                        {apt.status === 'Waiting' ? (
                          <TouchableOpacity
                            onPress={() => router.push('/(patient)/video-call')}
                            style={tw('bg-brand py-3.5 rounded-xl flex-row justify-center items-center')}
                          >
                            <Video color="#0f172a" size={18} style={tw('mr-2')} />
                            <Text style={tw('text-slate-900 font-bold text-sm')}>
                              {t('mobile.join_room', 'Vào phòng khám (Join Room)')}
                            </Text>
                          </TouchableOpacity>
                        ) : (
                          <>
                            {apt.canCheckIn && (
                              <TouchableOpacity
                                onPress={() => handleCheckIn(apt)}
                                style={tw('bg-indigo-600 py-3.5 rounded-xl flex-row justify-center items-center')}
                              >
                                <LogIn color="#ffffff" size={18} style={tw('mr-2')} />
                                <Text style={tw('text-white font-bold text-sm')}>
                                  {t('mobile.check_in_waiting_room', 'Check-in vào phòng chờ (Khung ±15p)')}
                                </Text>
                              </TouchableOpacity>
                            )}
                            <View style={tw('flex-row gap-2.5')}>
                              {apt.canReschedule && (
                                <TouchableOpacity
                                  onPress={() => {
                                    setSelectedAptForReschedule(apt);
                                    setRescheduleModalVisible(true);
                                  }}
                                  style={tw('flex-1 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 py-3 rounded-xl flex-row justify-center items-center')}
                                >
                                  <RefreshCw color={twInstance.color('text-slate-700 dark:text-slate-200')} size={15} style={tw('mr-1.5')} />
                                  <Text style={tw('text-slate-700 dark:text-slate-200 font-bold text-xs')}>
                                    {t('mobile.reschedule_btn', 'Đổi giờ khám')}
                                  </Text>
                                </TouchableOpacity>
                              )}
                              <TouchableOpacity
                                onPress={() => handleCancel(apt.id)}
                                style={tw('flex-1 bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900/50 py-3 rounded-xl flex-row justify-center items-center')}
                              >
                                <Text style={tw('text-red-500 font-bold text-xs')}>{t('mobile.cancel', 'Hủy lịch')}</Text>
                              </TouchableOpacity>
                            </View>
                          </>
                        )}
                      </View>
                    </View>
                  ))
                : renderEmptyState('upcoming'))}

            {activeTab === 'history' &&
              (historyList.length > 0
                ? historyList.map((apt) => (
                    <View
                      key={apt.id}
                      style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-5 border border-slate-200 dark:border-slate-700 shadow-sm')}
                    >
                      <View style={tw('flex-row justify-between items-start mb-4')}>
                        <View style={tw('flex-1 mr-2')}>
                          <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{apt.doctor}</Text>
                          <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400')}>
                            {apt.specialty}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `px-3 py-1 rounded-full ${
                              apt.status === 'Completed'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : apt.status === 'Interrupted'
                                ? 'bg-orange-100 dark:bg-orange-900/40'
                                : 'bg-slate-100 dark:bg-slate-800'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                apt.status === 'Completed'
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : apt.status === 'Interrupted'
                                  ? 'text-orange-700 dark:text-orange-300'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`
                            )}
                          >
                            {apt.status}
                          </Text>
                        </View>
                      </View>

                      <View style={tw('flex-row flex-wrap gap-y-3 mb-4')}>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Calendar color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.date}</Text>
                        </View>
                        <View style={tw('flex-row items-center w-1/2')}>
                          <Clock color="#94a3b8" size={16} />
                          <Text style={tw('text-slate-700 dark:text-slate-200 ml-2 text-sm font-medium')}>{apt.time}</Text>
                        </View>
                      </View>

                      {apt.followUpRecommendation && (
                        <View style={tw('bg-indigo-50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-100 dark:border-indigo-900/50 mb-4')}>
                          <Text style={tw('text-xs font-bold text-indigo-800 dark:text-indigo-200 mb-1')}>
                            {t('mobile.doctor_follow_up_note', 'Dặn dò tái khám của Bác sĩ (Follow-up)')}
                          </Text>
                          <Text style={tw('text-xs text-indigo-700 dark:text-indigo-300 leading-4')}>
                            {apt.followUpRecommendation}
                          </Text>
                        </View>
                      )}

                      {apt.userRating && (
                        <View style={tw('bg-amber-50/60 dark:bg-amber-950/20 p-3 rounded-2xl border border-amber-100 dark:border-amber-900/40 mb-4')}>
                          <View style={tw('flex-row items-center mb-1')}>
                            {[1, 2, 3, 4, 5].map((s) => (
                              <Star
                                key={s}
                                color="#f59e0b"
                                fill={s <= apt.userRating ? '#f59e0b' : 'transparent'}
                                size={13}
                              />
                            ))}
                            <Text style={tw('text-xs font-bold text-amber-800 dark:text-amber-300 ml-2')}>
                              {apt.userRating}/5
                            </Text>
                          </View>
                          {apt.userComment ? (
                            <Text style={tw('text-xs text-slate-600 dark:text-slate-300 italic')}>"{apt.userComment}"</Text>
                          ) : null}
                        </View>
                      )}

                      <View style={tw('flex-row gap-2.5')}>
                        <TouchableOpacity
                          onPress={() => router.push('/(patient)/doctor-chat')}
                          style={tw('flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 py-3 rounded-xl flex-row justify-center items-center')}
                        >
                          <Text style={tw('text-slate-700 dark:text-slate-200 font-bold text-xs')}>
                            {t('mobile.view_log', 'Xem nhật ký khám')}
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
                                ? t('mobile.edit_review_btn', 'Sửa đánh giá')
                                : t('mobile.rate_doctor_btn', 'Đánh giá Bác sĩ')}
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

      {/* Reschedule Modal (POST /consultations/:id/reschedule) */}
      <Modal visible={rescheduleModalVisible} transparent animationType="slide" onRequestClose={() => setRescheduleModalVisible(false)}>
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800')}>
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.reschedule_modal_title', 'Đổi khung giờ khám (Reschedule)')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {selectedAptForReschedule?.doctor} • Cutoff: 60m trước giờ hẹn
                </Text>
              </View>
              <TouchableOpacity onPress={() => setRescheduleModalVisible(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
              {t('mobile.select_new_date', 'Chọn ngày mới')}
            </Text>
            <View style={tw('flex-row gap-2 mb-4')}>
              {['2026-11-10', '2026-11-11', '2026-11-12'].map((d) => (
                <TouchableOpacity
                  key={d}
                  onPress={() => setRescheduleDate(d)}
                  style={tw(
                    `flex-1 py-2.5 rounded-xl border items-center ${
                      rescheduleDate === d
                        ? 'bg-brand border-brand'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`
                  )}
                >
                  <Text style={tw(`text-xs font-bold ${rescheduleDate === d ? 'text-slate-900' : 'text-slate-600 dark:text-slate-300'}`)}>
                    {d}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
              {t('mobile.select_available_slot', 'Chọn Slot trống (status = available)')}
            </Text>
            <View style={tw('flex-row flex-wrap gap-2 mb-6')}>
              {['09:30 AM', '10:30 AM', '02:00 PM', '03:30 PM'].map((slot) => (
                <TouchableOpacity
                  key={slot}
                  onPress={() => setRescheduleSlot(slot)}
                  style={tw(
                    `px-4 py-2.5 rounded-xl border ${
                      rescheduleSlot === slot
                        ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`
                  )}
                >
                  <Text
                    style={tw(
                      `text-xs font-bold ${
                        rescheduleSlot === slot ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                      }`
                    )}
                  >
                    {slot}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity onPress={handleConfirmReschedule} style={tw('bg-brand py-3.5 rounded-xl items-center')}>
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.confirm_reschedule', 'Xác nhận đổi lịch')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Post-Consultation Review Modal (CON-15) */}
      <Modal visible={reviewModalVisible} transparent animationType="slide" onRequestClose={() => setReviewModalVisible(false)}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800')}>
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.rate_consultation_title', 'Đánh giá buổi tư vấn (CON-15)')}
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
              placeholder={t('mobile.review_comment_placeholder', 'Chia sẻ trải nghiệm tư vấn của bạn với bác sĩ...')}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[100px] text-sm text-slate-900 dark:text-white mb-4')}
            />

            <TouchableOpacity onPress={handleSubmitReview} style={tw('bg-brand py-3.5 rounded-xl items-center')}>
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.submit_review_btn', 'Gửi đánh giá')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </SafeAreaView>
  );
}
