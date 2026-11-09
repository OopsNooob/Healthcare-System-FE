import { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import {
  Bell,
  Calendar,
  ChevronRight,
  Activity,
  Crown,
  MessageSquare,
  Droplet,
  Flame,
  CheckCircle2,
  Circle,
  XCircle,
  ClipboardList,
  Sparkles,
  ClipboardCheck,
  Link2,
  Pill,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import {
  PauseProgramModal,
  HealthCheckInTaskModal,
  EducationTaskModal,
  AppointmentTaskLinkModal,
  AppointmentConsultationOutcome,
} from '@/components/modals';

export default function PatientHomeScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [hasPendingProgram, setHasPendingProgram] = useState(true);
  const [pauseModalVisible, setPauseModalVisible] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [isTogglingProgram, setIsTogglingProgram] = useState(false);
  const [busyTaskId, setBusyTaskId] = useState<string | null>(null);

  const [selectedTask, setSelectedTask] = useState<any | null>(null);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [educationModalVisible, setEducationModalVisible] = useState(false);
  const [appointmentLinkModalVisible, setAppointmentLinkModalVisible] = useState(false);

  const [todayTasks, setTodayTasks] = useState<any[]>([
    {
      id: '1',
      type: 'metric',
      titleKey: 'mobile.measure_bp',
      time: '08:00 AM',
      status: 'missed',
      allowedActions: [],
      icon: Activity,
      color: twInstance.color('text-rose-500'),
      bg: 'bg-rose-100 dark:bg-rose-900/30',
    },
    {
      id: '2',
      type: 'metric',
      titleKey: 'mobile.measure_bg',
      time: '01:00 PM',
      status: 'completed',
      allowedActions: [],
      icon: Droplet,
      color: twInstance.color('text-emerald-500'),
      bg: 'bg-emerald-100 dark:bg-emerald-900/30',
    },
    {
      id: '3',
      type: 'check_in',
      titleKey: 'mobile.health_check_in_title',
      timeKey: 'mobile.anytime',
      status: 'due',
      allowedActions: ['submit_check_in'],
      allowedSymptomCodes: ['headache', 'dizziness', 'fatigue', 'chest_tightness', 'shortness_of_breath'],
      responseConfigured: true,
      icon: ClipboardCheck,
      color: twInstance.color('text-indigo-500'),
      bg: 'bg-indigo-100 dark:bg-indigo-900/30',
    },
    {
      id: '4',
      type: 'education',
      titleKey: 'mobile.read_diet',
      timeKey: 'mobile.anytime',
      status: 'due',
      allowedActions: ['acknowledge'],
      isContentAvailable: true,
      icon: Flame,
      color: twInstance.color('text-amber-500'),
      bg: 'bg-amber-100 dark:bg-amber-900/30',
    },
    {
      id: '5',
      type: 'appointment',
      titleKey: 'mobile.link_appointment_task',
      timeKey: 'mobile.anytime',
      status: 'due',
      allowedActions: ['link_appointment'],
      linkedConsultationId: null,
      icon: Link2,
      color: twInstance.color('text-blue-500'),
      bg: 'bg-blue-100 dark:bg-blue-900/30',
    },
    {
      id: '6',
      type: 'medication',
      titleKey: 'mobile.medication_task_title',
      time: '08:00 PM',
      status: 'due',
      allowedActions: ['confirm_medication'],
      icon: Pill,
      color: twInstance.color('text-purple-500'),
      bg: 'bg-purple-100 dark:bg-purple-900/30',
    },
  ]);

  const patientTasks = todayTasks.filter((task) => task.type !== 'doctor_review');
  const completedPatientTasksCount = patientTasks.filter((task) => task.status === 'completed').length;
  const computedAdherence =
    patientTasks.length > 0 ? Math.round((completedPatientTasksCount / patientTasks.length) * 100) : 75;

  const careProgram = {
    name: t('mobile.hypertension_program'),
    progress: Math.max(computedAdherence, 50),
    streak: 12,
    daysLeft: 45,
  };

  const quotas = {
    aiRemaining: 15,
    aiTotal: 20,
    consultsRemaining: 2,
    consultsTotal: 3,
  };

  const upcomingAppointment = {
    id: 1,
    doctorName: 'Dr. Sarah Connor',
    specialty: t('mobile.cardiologist'),
    date: 'Mon, 12 Aug',
    time: '10:00 AM',
    image: 'https://i.pravatar.cc/150?img=1',
  };

  const loadHomeData = useCallback(async () => {
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      const enrollmentId = await AsyncStorage.getItem('activeCareEnrollmentId');
      if (enrollmentId) {
        setHasPendingProgram(false);
      }
      const savedPaused = await AsyncStorage.getItem('mockCareProgramPaused');
      if (savedPaused === 'true') {
        setIsPaused(true);
      }
    } catch {
      // Fallback to default state
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    loadHomeData();
  }, [loadHomeData]);

  const onRefresh = () => {
    setRefreshing(true);
    loadHomeData();
  };

  const handleTaskPress = async (task: any) => {
    if (busyTaskId) return;
    setSelectedTask(task);
    if (task.type === 'check_in') {
      setCheckInModalVisible(true);
    } else if (task.type === 'education') {
      setEducationModalVisible(true);
    } else if (task.type === 'appointment') {
      setAppointmentLinkModalVisible(true);
    } else if (task.type === 'medication') {
      setBusyTaskId(task.id);
      try {
        await new Promise((resolve) => setTimeout(resolve, 220));
        setTodayTasks((prev) =>
          prev.map((item) => (item.id === task.id ? { ...item, status: 'completed' } : item))
        );
        Toast.show({
          type: 'success',
          text1: t('mobile.medication_confirmed_title'),
          text2: t(task.titleKey),
        });
      } finally {
        setBusyTaskId(null);
      }
    } else {
      router.push('/(patient)/health-metric');
    }
  };

  const handlePauseConfirm = async (_reason: string, _durationDays: number) => {
    if (isTogglingProgram) return;
    setIsTogglingProgram(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      await AsyncStorage.setItem('mockCareProgramPaused', 'true');
      setIsPaused(true);
      setPauseModalVisible(false);
    } finally {
      setIsTogglingProgram(false);
    }
  };

  const handleResume = async () => {
    if (isTogglingProgram) return;
    setIsTogglingProgram(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      await AsyncStorage.setItem('mockCareProgramPaused', 'false');
      setIsPaused(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.program_resumed_toast'),
        text2: careProgram.name,
      });
    } finally {
      setIsTogglingProgram(false);
    }
  };

  const handleAppointmentOutcome = (outcome: AppointmentConsultationOutcome, consultationId: string) => {
    if (!selectedTask) return;
    if (outcome === 'completed') {
      setTodayTasks((prev) =>
        prev.map((item) =>
          item.id === selectedTask.id
            ? { ...item, status: 'completed', linkedConsultationId: consultationId }
            : item
        )
      );
      Toast.show({
        type: 'success',
        text1: t('mobile.appointment_outcome_completed_toast'),
        text2: t(selectedTask.titleKey),
      });
    } else if (outcome === 'missed') {
      setTodayTasks((prev) =>
        prev.map((item) =>
          item.id === selectedTask.id
            ? { ...item, status: 'missed', linkedConsultationId: consultationId }
            : item
        )
      );
      Toast.show({
        type: 'error',
        text1: t('mobile.appointment_outcome_missed_toast'),
        text2: t(selectedTask.titleKey),
      });
    } else if (outcome === 'rescheduled') {
      setTodayTasks((prev) =>
        prev.map((item) =>
          item.id === selectedTask.id
            ? { ...item, status: 'due', linkedConsultationId: consultationId }
            : item
        )
      );
      Toast.show({
        type: 'info',
        text1: t('mobile.appointment_outcome_rescheduled_toast'),
        text2: consultationId,
      });
    } else if (outcome === 'cancelled') {
      setTodayTasks((prev) =>
        prev.map((item) =>
          item.id === selectedTask.id
            ? { ...item, status: 'due', linkedConsultationId: null }
            : item
        )
      );
      Toast.show({
        type: 'info',
        text1: t('mobile.appointment_outcome_cancelled_toast'),
        text2: t('mobile.appointment_outcome_cancelled_desc'),
      });
    }
  };

  const renderTaskSkeleton = () => (
    <View style={tw('flex-row items-center rounded-2xl p-4 bg-white dark:bg-slate-900 border border-gray-100 dark:border-gray-800')}>
      <View style={tw('w-12 h-12 rounded-xl bg-slate-200 dark:bg-slate-700 mr-4')} />
      <View style={tw('flex-1')}>
        <View style={tw('w-40 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
        <View style={tw('w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
      <View style={tw('w-16 h-7 rounded-full bg-slate-200 dark:bg-slate-700')} />
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView
        contentContainerStyle={tw('pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={twInstance.color('text-slate-900 dark:text-slate-100')}
          />
        }
      >
        {/* Header */}
        <View style={tw('flex-row justify-between items-center px-6 pt-6 pb-4')}>
          <View>
            <Text style={tw('text-gray-500 dark:text-gray-400 text-sm')}>{t('mobile.good_morning')}</Text>
            <Text style={tw('text-2xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.alex_johnson')}</Text>
          </View>
          <TouchableOpacity
            style={tw('p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm border border-gray-100 dark:border-gray-800 relative')}
            onPress={() => router.push('/(patient)/notifications')}
          >
            <Bell color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
            <View style={tw('absolute top-2 right-2 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white dark:border-slate-900')} />
          </TouchableOpacity>
        </View>

        {/* Quotas Bar */}
        <View style={tw('px-6 mb-6 flex-row gap-3')}>
          <TouchableOpacity
            onPress={() => router.push('/(patient)/premium')}
            style={tw('flex-row items-center bg-emerald-50 dark:bg-emerald-900/30 px-3 py-2 rounded-full border border-emerald-100 dark:border-emerald-800/50 flex-1')}
          >
            <MessageSquare size={16} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
            <Text style={tw('ml-2 text-xs font-medium text-emerald-800 dark:text-emerald-300')}>
              {t('mobile.ai_tokens')}: {quotas.aiRemaining}/{quotas.aiTotal}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => router.push('/(patient)/premium')}
            style={tw('flex-row items-center bg-blue-50 dark:bg-blue-900/30 px-3 py-2 rounded-full border border-blue-100 dark:border-blue-800/50 flex-1')}
          >
            <Activity size={16} color={twInstance.color('text-blue-600 dark:text-blue-400')} />
            <Text style={tw('ml-2 text-xs font-medium text-blue-800 dark:text-blue-300')}>
              {t('mobile.call_quota_label')}: {quotas.consultsRemaining}/{quotas.consultsTotal} {t('mobile.left')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Pending Care Program Assessment Banner */}
        {hasPendingProgram && (
          <View style={tw('px-6 mb-6')}>
            <View style={tw('bg-amber-500 dark:bg-amber-600 rounded-3xl p-5 shadow-sm border border-amber-400 dark:border-amber-500')}>
              <View style={tw('flex-row items-center justify-between mb-2.5')}>
                <View style={tw('flex-row items-center gap-2')}>
                  <View style={tw('w-7 h-7 rounded-full bg-white/20 items-center justify-center')}>
                    <ClipboardList size={16} color="#ffffff" />
                  </View>
                  <View style={tw('bg-white/20 px-2.5 py-0.5 rounded-full')}>
                    <Text style={tw('text-white text-[10px] font-bold uppercase tracking-wider')}>
                      {t('mobile.enroll_status_pending')}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  onPress={() => setHasPendingProgram(false)}
                  style={tw('w-6 h-6 rounded-full bg-white/20 items-center justify-center')}
                >
                  <Text style={tw('text-white text-xs font-bold leading-none')}>✕</Text>
                </TouchableOpacity>
              </View>

              <Text style={tw('text-white font-bold text-lg mb-1 leading-snug')}>
                {t('mobile.pending_program_banner_title')}
              </Text>
              <Text style={tw('text-amber-100 text-xs leading-relaxed mb-4')}>
                {t('mobile.pending_program_banner_desc')}
              </Text>

              <TouchableOpacity
                activeOpacity={0.85}
                onPress={() => router.push('/(patient)/baseline-assessment')}
                style={tw('bg-white dark:bg-slate-900 py-3 px-4 rounded-2xl flex-row items-center justify-center shadow-sm')}
              >
                <Sparkles size={16} color={twInstance.color('text-amber-600 dark:text-amber-400')} style={tw('mr-2')} />
                <Text style={tw('text-amber-700 dark:text-amber-300 font-bold text-sm')}>
                  {t('mobile.complete_assessment_now')}
                </Text>
                <ChevronRight size={16} color={twInstance.color('text-amber-700 dark:text-amber-300')} style={tw('ml-1')} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Care Program Banner */}
        <View style={tw('px-6 mb-6')}>
          <View style={tw('bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-5 shadow-sm')}>
            <View style={tw('flex-row justify-between items-start mb-4')}>
              <View style={tw('flex-1')}>
                <Text style={tw('text-indigo-100 text-xs font-medium uppercase tracking-wider mb-1')}>
                  {isPaused ? t('mobile.program_paused') : t('mobile.active_program')}
                </Text>
                <Text style={tw('text-white font-bold text-lg leading-tight')}>{careProgram.name}</Text>
              </View>
              <View style={tw('bg-white/20 px-3 py-1.5 rounded-full flex-row items-center')}>
                <Flame size={14} color="#fca5a5" />
                <Text style={tw('text-white text-xs font-bold ml-1')}>
                  {careProgram.streak} {t('mobile.days')}
                </Text>
              </View>
            </View>

            {/* Progress bar */}
            <View style={tw('mb-4')}>
              <View style={tw('flex-row justify-between mb-1')}>
                <Text style={tw('text-indigo-100 text-xs')}>{t('mobile.adherence')}</Text>
                <Text style={tw('text-white font-bold text-xs')}>{careProgram.progress}%</Text>
              </View>
              <View style={tw('w-full h-2 bg-indigo-900/50 rounded-full overflow-hidden')}>
                <View style={[tw('h-full bg-emerald-400 rounded-full'), { width: `${careProgram.progress}%` }]} />
              </View>
            </View>

            <View style={tw('flex-row justify-between items-center')}>
              <Text style={tw('text-indigo-200 text-xs')}>
                {careProgram.daysLeft} {t('mobile.days_remaining')}
              </Text>
              <TouchableOpacity
                disabled={isTogglingProgram}
                onPress={() => {
                  if (isPaused) {
                    handleResume();
                  } else {
                    setPauseModalVisible(true);
                  }
                }}
                style={tw(`bg-white/20 px-3 py-1.5 rounded-full active:opacity-80 ${isTogglingProgram ? 'opacity-50' : ''}`)}
              >
                <Text style={tw('text-white text-xs font-medium')}>
                  {isPaused ? t('mobile.resume_program') : t('mobile.pause_program')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Today's Tasks */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('flex-row justify-between items-start mb-4')}>
            <View style={tw('flex-1 mr-3')}>
              <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100')}>
                {t('mobile.todays_tasks')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')} numberOfLines={1}>
                {t('mobile.care_task_contract_subtitle')}
              </Text>
            </View>
            <View style={tw('bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-1 rounded-full shrink-0')}>
              <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                {completedPatientTasksCount}/{patientTasks.length} {t('mobile.done')}
              </Text>
            </View>
          </View>

          <View style={tw('gap-3')}>
            {loading ? (
              <>
                {renderTaskSkeleton()}
                {renderTaskSkeleton()}
                {renderTaskSkeleton()}
              </>
            ) : (
              patientTasks.map((task) => {
                const Icon = task.icon;
                const isTerminal = task.status === 'completed' || task.status === 'missed' || task.status === 'cancelled';
                const isDisabled = isTerminal || task.status === 'scheduled' || busyTaskId === task.id;
                const taskTitle = task.titleKey ? t(task.titleKey) : task.title;
                const taskTime = task.timeKey ? t(task.timeKey) : task.time;

                return (
                  <TouchableOpacity
                    key={task.id}
                    disabled={isDisabled}
                    style={tw(
                      `flex-row items-center rounded-2xl p-4 shadow-sm border ${isTerminal ? 'opacity-60' : ''} ${
                        task.status === 'due'
                          ? 'bg-indigo-50 dark:bg-indigo-900/20 border-indigo-200 dark:border-indigo-800/50'
                          : 'bg-white dark:bg-slate-900 border-gray-100 dark:border-gray-800'
                      }`
                    )}
                    onPress={() => handleTaskPress({ ...task, title: taskTitle })}
                  >
                    <View style={tw(`w-12 h-12 rounded-xl items-center justify-center mr-4 ${task.bg}`)}>
                      <Icon size={24} color={task.color as string} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text
                        style={tw(
                          `text-base font-bold dark:text-slate-100 ${
                            isTerminal ? 'text-gray-400 dark:text-gray-500 line-through' : 'text-[#313A34]'
                          }`
                        )}
                      >
                        {taskTitle}
                      </Text>
                      {task.linkedConsultationId && task.status !== 'completed' && (
                        <Text style={tw('text-xs font-semibold text-blue-600 dark:text-blue-400 mt-0.5')}>
                          {t('mobile.linked_to_consultation')}: {task.linkedConsultationId} • {t('mobile.waiting_for_completion')}
                        </Text>
                      )}
                      {task.status === 'scheduled' && (
                        <Text style={tw('text-sm text-indigo-500 dark:text-indigo-400 font-medium mt-0.5')}>
                          {t('mobile.task_scheduled')} {taskTime}
                        </Text>
                      )}
                      {task.status === 'due' && (
                        <Text style={tw('text-sm text-amber-500 dark:text-amber-400 font-medium mt-0.5')}>
                          {t('mobile.task_due')} • {taskTime}
                        </Text>
                      )}
                      {task.status === 'missed' && (
                        <Text style={tw('text-sm text-rose-500 dark:text-rose-400 font-medium mt-0.5')}>
                          {t('mobile.task_missed')}
                        </Text>
                      )}
                      {task.status === 'cancelled' && (
                        <Text style={tw('text-sm text-gray-500 dark:text-gray-400 mt-0.5')}>
                          {t('mobile.task_cancelled')}
                        </Text>
                      )}
                      {task.status === 'completed' && (
                        <Text style={tw('text-sm text-emerald-500 dark:text-emerald-400 font-medium mt-0.5')}>
                          {t('mobile.task_completed')}
                        </Text>
                      )}
                    </View>
                    <View style={tw('ml-2')}>
                      {task.status === 'completed' ? (
                        <CheckCircle2 size={24} color={twInstance.color('text-emerald-500')} />
                      ) : task.status === 'missed' ? (
                        <XCircle size={24} color={twInstance.color('text-rose-500')} />
                      ) : task.status === 'due' ? (
                        <View style={tw('bg-indigo-600 px-3.5 py-1.5 rounded-full')}>
                          <Text style={tw('text-white text-xs font-bold')}>
                            {task.type === 'education'
                              ? t('mobile.view_and_ack')
                              : task.type === 'appointment'
                              ? t('mobile.link_btn')
                              : t('mobile.start')}
                          </Text>
                        </View>
                      ) : (
                        <Circle size={24} color={twInstance.color('text-gray-300 dark:text-gray-600')} />
                      )}
                    </View>
                  </TouchableOpacity>
                );
              })
            )}
          </View>
        </View>

        {/* Premium Banner */}
        <View style={tw('px-6 mb-8')}>
          <TouchableOpacity
            onPress={() => router.push('/(patient)/premium')}
            style={tw('bg-amber-500 rounded-3xl p-5 flex-row items-center justify-between shadow-md')}
          >
            <View style={tw('flex-1 pr-4')}>
              <View style={tw('flex-row items-center mb-1')}>
                <Crown color="#ffffff" size={20} style={tw('mr-2')} />
                <Text style={tw('text-white font-bold text-lg')}>{t('mobile.upgrade_premium')}</Text>
              </View>
              <Text style={tw('text-amber-50 text-sm leading-tight')}>
                {t('mobile.unlimited_ai_chats_priority_do')}
              </Text>
            </View>
            <View style={tw('bg-white dark:bg-slate-900/20 p-2 rounded-full')}>
              <ChevronRight color={twInstance.color('text-amber-500 dark:text-white')} size={24} />
            </View>
          </TouchableOpacity>
        </View>

        {/* Upcoming Appointment */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('flex-row justify-between items-end mb-4')}>
            <Text style={tw('text-lg font-bold text-[#313A34] dark:text-slate-100')}>
              {t('mobile.upcoming_appointment')}
            </Text>
            <TouchableOpacity onPress={() => router.push('/(patient)/appointments')}>
              <Text style={tw('text-sm font-medium text-emerald-500')}>{t('mobile.see_all')}</Text>
            </TouchableOpacity>
          </View>

          <View style={tw('bg-emerald-500 dark:bg-emerald-600 rounded-3xl p-5 shadow-sm')}>
            <View style={tw('flex-row items-center mb-4')}>
              <Image source={{ uri: upcomingAppointment.image }} style={tw('w-14 h-14 rounded-2xl bg-emerald-400')} />
              <View style={tw('ml-3 flex-1')}>
                <Text style={tw('text-white font-bold text-lg')}>{upcomingAppointment.doctorName}</Text>
                <Text style={tw('text-emerald-100 text-sm')}>{upcomingAppointment.specialty}</Text>
              </View>
              <TouchableOpacity
                style={tw('w-10 h-10 bg-white dark:bg-slate-900/20 rounded-full items-center justify-center')}
                onPress={() => router.push('/(patient)/video-call')}
              >
                <View style={tw('w-10 h-10 bg-white dark:bg-slate-900 rounded-full items-center justify-center')}>
                  <Activity color="#10b981" size={20} />
                </View>
              </TouchableOpacity>
            </View>

            <View style={tw('bg-emerald-600 dark:bg-emerald-700 rounded-2xl p-3 flex-row items-center justify-between')}>
              <View style={tw('flex-row items-center gap-2')}>
                <Calendar color="#d1fae5" size={16} />
                <Text style={tw('text-emerald-50 text-sm font-medium')}>{upcomingAppointment.date}</Text>
              </View>
              <View style={tw('w-[1px] h-4 bg-emerald-400')} />
              <View style={tw('flex-row items-center gap-2')}>
                <Text style={tw('text-emerald-50 text-sm font-medium')}>{upcomingAppointment.time}</Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <PauseProgramModal
        visible={pauseModalVisible}
        onClose={() => setPauseModalVisible(false)}
        programName={careProgram.name}
        onConfirmPause={handlePauseConfirm}
      />

      <HealthCheckInTaskModal
        visible={checkInModalVisible}
        onClose={() => setCheckInModalVisible(false)}
        taskTitle={selectedTask?.title}
        allowedSymptomCodes={selectedTask?.allowedSymptomCodes}
        responseConfigured={selectedTask?.responseConfigured ?? true}
        onSubmit={() => {
          if (selectedTask) {
            setTodayTasks((prev) =>
              prev.map((item) => (item.id === selectedTask.id ? { ...item, status: 'completed' } : item))
            );
          }
        }}
      />

      <EducationTaskModal
        visible={educationModalVisible}
        onClose={() => setEducationModalVisible(false)}
        isContentAvailable={selectedTask?.isContentAvailable ?? true}
        onAcknowledge={() => {
          if (selectedTask) {
            setTodayTasks((prev) =>
              prev.map((item) => (item.id === selectedTask.id ? { ...item, status: 'completed' } : item))
            );
          }
        }}
      />

      <AppointmentTaskLinkModal
        visible={appointmentLinkModalVisible}
        onClose={() => setAppointmentLinkModalVisible(false)}
        taskTitle={selectedTask?.title}
        linkedConsultationId={selectedTask?.linkedConsultationId}
        onLinkConsultation={(consultationId) => {
          if (selectedTask) {
            setTodayTasks((prev) =>
              prev.map((item) =>
                item.id === selectedTask.id ? { ...item, linkedConsultationId: consultationId } : item
              )
            );
          }
        }}
        onSimulateOutcome={handleAppointmentOutcome}
        onBookNewSlot={() => router.push('/(patient)/my-doctors')}
      />
    </SafeAreaView>
  );
}
