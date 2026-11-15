import React, { useCallback, useEffect, useState } from 'react';
import {
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  Activity,
  AlertCircle,
  Bell,
  Bot,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardCheck,
  Clock,
  Heart,
  LogOut,
  PauseCircle,
  RefreshCw,
  Shield,
  Sparkles,
  Stethoscope,
  Video,
} from 'lucide-react-native';
import {
  generateIdempotencyKey,
  mobileApi,
  normalizePaginatedList,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  AppointmentTaskLinkModal,
  EducationTaskModal,
  HealthCheckInTaskModal,
  PauseProgramModal,
} from '@/components/modals';

interface TaskRow {
  id: string;
  taskType: 'metric' | 'check_in' | 'education' | 'appointment' | 'doctor_review';
  templateKey: string;
  status: 'scheduled' | 'due' | 'completed' | 'missed' | 'cancelled';
  scheduledFor?: string;
  allowedActions?: string[];
}

interface QuotaSummary {
  aiUsed: number;
  aiLimit: number | null;
  consultationsUsed: number;
  consultationsLimit: number | null;
  hasSubscription: boolean;
}

interface UpcomingConsultationItem {
  id: string;
  doctorName: string;
  specialty: string;
  scheduledAtText: string;
  mode: string;
  sessionStatus: string;
}

export default function PatientHomeScreen() {
  const { t, i18n } = useTranslation();
  useThemeContext();
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [fullName, setFullName] = useState<string>('');
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [quota, setQuota] = useState<QuotaSummary>({
    aiUsed: 0,
    aiLimit: null,
    consultationsUsed: 0,
    consultationsLimit: null,
    hasSubscription: false,
  });

  const [enrollment, setEnrollment] = useState<FeTypes.CareEnrollmentDetailResponse | null>(null);
  const [completionRate, setCompletionRate] = useState<FeTypes.CareTaskCompletionRateResponse | null>(null);
  const [tasks, setTasks] = useState<TaskRow[]>([]);
  const [upcomingConsult, setUpcomingConsult] = useState<UpcomingConsultationItem | null>(null);
  const [healthAlertsCount, setHealthAlertsCount] = useState<number>(0);

  const [activeTask, setActiveTask] = useState<TaskRow | null>(null);
  const [checkInModalVisible, setCheckInModalVisible] = useState(false);
  const [educationModalVisible, setEducationModalVisible] = useState(false);
  const [appointmentModalVisible, setAppointmentModalVisible] = useState(false);
  const [withdrawModalVisible, setWithdrawModalVisible] = useState(false);

  const loadHomeData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setLoadError(null);
    try {
      const [
        meResult,
        unreadResult,
        usageResult,
        subsResult,
        enrollListResult,
        upcomingResult,
        metricAlertsResult,
      ] = await Promise.allSettled([
        mobileApi.usersGetMe(),
        mobileApi.notificationsCountUnread(),
        mobileApi.patientBillingReadUsage(),
        mobileApi.patientBillingReadSubscriptions({ query: {} }),
        mobileApi.careEnrollmentList({
          query: { limit: 10, sortBy: 'updatedAt', sortOrder: -1 },
        }),
        mobileApi.consultationsUpcoming(),
        mobileApi.healthMetricsGetAlerts(),
      ]);

      if (
        meResult.status === 'rejected' &&
        enrollListResult.status === 'rejected' &&
        upcomingResult.status === 'rejected'
      ) {
        throw enrollListResult.reason;
      }

      if (meResult.status === 'fulfilled') {
        const rawMe = meResult.value as unknown as { data?: FeTypes.UsersGetMeResponse };
        const me = rawMe?.data ?? (meResult.value as FeTypes.UsersGetMeResponse);
        setFullName(me?.fullName ?? '');
      }

      if (unreadResult.status === 'fulfilled') {
        const u = unreadResult.value as FeTypes.NotificationsCountUnreadResponse;
        setUnreadCount(Number(u?.data?.unreadCount ?? 0));
      }

      if (usageResult.status === 'fulfilled' || subsResult.status === 'fulfilled') {
        const usageData =
          usageResult.status === 'fulfilled'
            ? (usageResult.value as FeTypes.PatientBillingReadUsageResponse)
            : null;
        const subsData =
          subsResult.status === 'fulfilled'
            ? (subsResult.value as FeTypes.PatientBillingReadSubscriptionsResponse)
            : null;
        const subsItems = Array.isArray(subsData?.items) ? subsData.items : [];
        const activeSub =
          subsData?.effective ??
          subsItems.find((s) => s.status === 'active') ??
          subsItems[0] ??
          null;
        const aiWindow = (
          usageData as unknown as { aiUsage?: Record<string, unknown> } | null
        )?.aiUsage;

        setQuota({
          aiUsed: Number(aiWindow?.requestCount ?? aiWindow?.used ?? 0),
          aiLimit:
            typeof activeSub?.entitlement?.aiRequestLimit === 'number'
              ? activeSub.entitlement.aiRequestLimit
              : null,
          consultationsUsed: Number(usageData?.consultations?.counted ?? 0),
          consultationsLimit:
            usageData?.consultations?.unlimited
              ? null
              : typeof usageData?.consultations?.limit === 'number'
                ? usageData.consultations.limit
                : typeof activeSub?.entitlement?.consultationLimitPerCycle === 'number'
                  ? activeSub.entitlement.consultationLimitPerCycle
                  : null,
          hasSubscription: Boolean(activeSub),
        });
      }

      if (metricAlertsResult.status === 'fulfilled') {
        const alertsData = (metricAlertsResult.value as FeTypes.HealthMetricsGetAlertsResponse)?.data;
        setHealthAlertsCount(Array.isArray(alertsData) ? alertsData.length : 0);
      }

      if (upcomingResult.status === 'fulfilled') {
        const items = (upcomingResult.value as FeTypes.ConsultationsUpcomingResponse)?.data ?? [];
        const validNext = items.find(
          (c) => c.requestStatus !== 'cancelled' && c.requestStatus !== 'declined' && c.requestStatus !== 'expired'
        );
        if (validNext) {
          let doctorName = t('mobile.assigned_doctor', 'Assigned Doctor');
          let specialty = t('mobile.specialist', 'Specialist');
          if (validNext.doctorId) {
            try {
              const docRes = await mobileApi.usersFindOne({ params: { id: validNext.doctorId } });
              const rawDoc =
                (docRes as unknown as { data?: Record<string, unknown> })?.data ??
                (docRes as unknown as Record<string, unknown>);
              if (typeof rawDoc?.fullName === 'string') doctorName = rawDoc.fullName;
              if (typeof rawDoc?.specialty === 'string') specialty = rawDoc.specialty;
            } catch {
              // ignore lookup error
            }
          }
          const rawStart = validNext.scheduledStartAt ?? validNext.requestedAt;
          const dateObj = rawStart ? new Date(rawStart) : null;
          const locale = i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US';
          const scheduledAtText =
            dateObj && !Number.isNaN(dateObj.getTime())
              ? dateObj.toLocaleString(locale, {
                  month: 'short',
                  day: '2-digit',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : rawStart;
          const consultationId = String(
            (validNext as unknown as Record<string, unknown>).id ??
              (validNext as unknown as Record<string, unknown>)._id ??
              ''
          );
          setUpcomingConsult({
            id: consultationId,
            doctorName,
            specialty,
            scheduledAtText,
            mode: validNext.mode,
            sessionStatus: validNext.sessionStatus,
          });
        } else {
          setUpcomingConsult(null);
        }
      }

      if (enrollListResult.status === 'fulfilled') {
        const { items } = normalizePaginatedList<Record<string, unknown>>(enrollListResult.value);
        const target =
          items.find((e) => e.status === 'pending') ??
          items.find((e) => e.status === 'active') ??
          items.find((e) => e.status === 'paused') ??
          items[0];
        const enrollmentId = target ? String(target.id ?? target._id ?? '') : '';
        if (!enrollmentId) {
          setEnrollment(null);
          setCompletionRate(null);
          setTasks([]);
        } else {
          const [detailRes, rateRes, tasksRes] = await Promise.allSettled([
            mobileApi.careEnrollmentDetail({ params: { id: enrollmentId } }),
            mobileApi.careTaskCompletionRate({ params: { id: enrollmentId } }),
            mobileApi.careTaskTasks({
              params: { id: enrollmentId },
              query: { limit: 20, sortBy: 'scheduledFor', sortOrder: 1 },
            }),
          ]);
          if (detailRes.status === 'fulfilled') {
            setEnrollment(detailRes.value);
          }
          if (rateRes.status === 'fulfilled') {
            setCompletionRate(rateRes.value);
          }
          if (tasksRes.status === 'fulfilled') {
            const { items: rawTasks } = normalizePaginatedList<Record<string, unknown>>(tasksRes.value);
            const mappedTasks: TaskRow[] = rawTasks.map((tk) => ({
              id: String(tk.id ?? tk._id ?? ''),
              taskType: (tk.taskType as TaskRow['taskType']) ?? 'metric',
              templateKey: String(tk.templateKey ?? tk.taskType ?? 'task'),
              status: (tk.status as TaskRow['status']) ?? 'scheduled',
              scheduledFor: typeof tk.scheduledFor === 'string' ? tk.scheduledFor : undefined,
              allowedActions: Array.isArray(tk.allowedActions)
                ? tk.allowedActions.filter((a): a is string => typeof a === 'string')
                : undefined,
            }));
            setTasks(mappedTasks);
          }
        }
      }
    } catch (err) {
      setLoadError(extractApiErrorMessage(err, 'mobile.load_home_failed'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [i18n.language, t]);

  useEffect(() => {
    void loadHomeData(false);
  }, [loadHomeData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadHomeData(true);
  }, [loadHomeData]);

  const getTaskTitle = (task: TaskRow): string => {
    switch (task.templateKey) {
      case 'morning_blood_pressure':
      case 'evening_blood_pressure':
        return t('mobile.task_bp_measurement', 'Blood Pressure Measurement');
      case 'morning_blood_glucose':
        return t('mobile.task_glucose_measurement', 'Blood Glucose Measurement');
      case 'daily_symptom_check_in':
      case 'symptom_check_in':
        return t('mobile.health_check_in_title', 'Routine Symptom Check-in');
      case 'follow_up_appointment':
        return t('mobile.task_follow_up_appointment', 'Follow-up Appointment');
      default:
        return t(`mobile.task_type_${task.taskType}`, task.templateKey.replace(/_/g, ' '));
    }
  };

  const formatTaskTime = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleTaskPress = (task: TaskRow) => {
    setActiveTask(task);
    if (task.taskType === 'metric') {
      router.push('/(patient)/health-metric');
      return;
    }
    if (task.taskType === 'check_in') {
      setCheckInModalVisible(true);
      return;
    }
    if (task.taskType === 'education') {
      setEducationModalVisible(true);
      return;
    }
    if (task.taskType === 'appointment') {
      setAppointmentModalVisible(true);
      return;
    }
    Toast.show({
      type: 'info',
      text1: getTaskTitle(task),
      text2: t('mobile.task_doctor_review_info', 'This task is reviewed by your assigned doctor.'),
    });
  };

  const handleCheckInSubmit = async (payload: {
    overallStatus: 'improved' | 'stable' | 'worsened';
    severity: 'none' | 'mild' | 'moderate' | 'severe';
    symptomCodes: string[];
  }) => {
    if (!activeTask) return;
    await mobileApi.careTaskRespond({
      params: { id: activeTask.id },
      headers: { 'Idempotency-Key': generateIdempotencyKey('care-checkin') },
      body: payload,
    });
    await loadHomeData(true);
  };

  const handleEducationAcknowledge = async (payload: { action: 'acknowledge' }) => {
    if (!activeTask) return;
    await mobileApi.careTaskRespond({
      params: { id: activeTask.id },
      headers: { 'Idempotency-Key': generateIdempotencyKey('care-ack') },
      body: payload,
    });
    await loadHomeData(true);
  };

  const handleLinkConsultation = async (consultationId: string) => {
    if (!activeTask) return;
    await mobileApi.careTaskAppointmentLink({
      params: { id: activeTask.id },
      headers: { 'Idempotency-Key': generateIdempotencyKey('care-link') },
      body: { consultationId },
    });
    await loadHomeData(true);
  };

  const handleWithdrawConsent = async () => {
    if (!enrollment) return;
    await mobileApi.careEnrollmentWithdraw({
      params: { id: enrollment.id },
      headers: { 'Idempotency-Key': generateIdempotencyKey('care-withdraw') },
    });
    await loadHomeData(true);
  };

  const needsSetup =
    enrollment?.status === 'pending' &&
    (enrollment.allowedActions?.includes('submit_consent') ||
      enrollment.allowedActions?.includes('submit_baseline'));

  const completedTasksCount = completionRate?.completed ?? tasks.filter((x) => x.status === 'completed').length;
  const totalTasksCount = completionRate?.expected ?? tasks.length;

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      <ScrollView
        contentContainerStyle={tw('pb-24')}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#4f46e5" />}
      >
        <View style={tw('flex-row justify-between items-center px-6 pt-5 pb-4')}>
          <View style={tw('flex-1 mr-3')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 text-xs font-medium uppercase tracking-wider')}>
              {t('mobile.welcome_back', 'Welcome back,')}
            </Text>
            {isLoading ? (
              <Skeleton className="h-7 w-40 rounded-lg mt-1" />
            ) : (
              <Text style={tw('text-2xl font-extrabold text-slate-900 dark:text-white mt-0.5')} numberOfLines={1}>
                {fullName || t('mobile.patient_fallback_name', 'Patient')}
              </Text>
            )}
          </View>
          <TouchableOpacity
            onPress={() => router.push('/(patient)/notifications')}
            style={tw('w-11 h-11 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center shadow-sm relative')}
          >
            <Bell color={twInstance.color('text-slate-700 dark:text-slate-200')} size={20} />
            {unreadCount > 0 && (
              <View style={tw('w-2.5 h-2.5 rounded-full bg-rose-500 absolute top-2.5 right-2.5 border border-white dark:border-slate-900')} />
            )}
          </TouchableOpacity>
        </View>

        {loadError ? (
          <View style={tw('mx-6 mb-5 p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <AlertCircle color="#ef4444" size={20} style={tw('mr-2.5 shrink-0')} />
              <Text style={tw('text-xs font-semibold text-rose-700 dark:text-rose-300 flex-1')}>
                {loadError}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => void loadHomeData(false)}
              style={tw('px-3 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800')}
            >
              <RefreshCw color={twInstance.color('text-rose-600 dark:text-rose-300')} size={14} />
            </TouchableOpacity>
          </View>
        ) : null}

        {isLoading ? (
          <View style={tw('px-6 gap-4')}>
            <Skeleton className="h-14 w-full rounded-2xl" />
            <Skeleton className="h-36 w-full rounded-3xl" />
            <Skeleton className="h-28 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
          </View>
        ) : (
          <View style={tw('px-6 gap-5')}>
            <TouchableOpacity
              onPress={() => router.push('/(patient)/premium')}
              activeOpacity={0.85}
              style={tw('flex-row items-center justify-between bg-white dark:bg-slate-900 px-4 py-3.5 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm')}
            >
              <View style={tw('flex-row items-center gap-3')}>
                <View style={tw('flex-row items-center gap-1.5')}>
                  <Bot color={twInstance.color('text-indigo-500')} size={16} />
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.ai_chats_quota', 'AI Queries')}:{' '}
                    {quota.aiLimit !== null ? `${quota.aiUsed}/${quota.aiLimit}` : `${quota.aiUsed}`}
                  </Text>
                </View>
                <View style={tw('w-[1px] h-3.5 bg-slate-200 dark:bg-slate-700')} />
                <View style={tw('flex-row items-center gap-1.5')}>
                  <Video color={twInstance.color('text-emerald-500')} size={16} />
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.consultations_quota', 'Consultations')}:{' '}
                    {quota.consultationsLimit !== null
                      ? `${quota.consultationsUsed}/${quota.consultationsLimit}`
                      : `${quota.consultationsUsed}`}
                  </Text>
                </View>
              </View>
              <ChevronRight color={twInstance.color('text-slate-400')} size={16} />
            </TouchableOpacity>

            {needsSetup && enrollment ? (
              <TouchableOpacity
                onPress={() =>
                  router.push({
                    pathname: '/(patient)/baseline-assessment',
                    params: { enrollmentId: enrollment.id },
                  })
                }
                activeOpacity={0.88}
                style={tw('bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-5 shadow-lg')}
              >
                <View style={tw('flex-row items-center justify-between mb-2')}>
                  <View style={tw('flex-row items-center gap-2')}>
                    <Sparkles color="#fde047" size={18} />
                    <Text style={tw('text-xs font-bold uppercase tracking-wider text-indigo-100')}>
                      {t('mobile.action_required', 'Action Required')}
                    </Text>
                  </View>
                  <ChevronRight color="#ffffff" size={18} />
                </View>
                <Text style={tw('text-lg font-extrabold text-white mb-1')}>
                  {t('mobile.activate_care_program', 'Activate Care Program')}: {enrollment.program.name}
                </Text>
                <Text style={tw('text-xs text-indigo-100 leading-5')}>
                  {t(
                    'mobile.activate_care_program_desc',
                    'Review monitoring consent and enter baseline health values to start daily follow-up tasks.'
                  )}
                </Text>
              </TouchableOpacity>
            ) : enrollment ? (
              <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm')}>
                <View style={tw('flex-row items-start justify-between mb-3')}>
                  <View style={tw('flex-row items-center gap-3 flex-1 mr-2')}>
                    <View style={tw('w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-900/40 items-center justify-center')}>
                      <Shield color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={22} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-base font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                        {enrollment.program.name}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {enrollment.assignedDoctor?.fullName || t('mobile.assigned_doctor', 'Assigned Doctor')}
                      </Text>
                    </View>
                  </View>
                  <View
                    style={tw(
                      `px-2.5 py-1 rounded-full ${
                        enrollment.status === 'active'
                          ? 'bg-emerald-50 dark:bg-emerald-950/50'
                          : enrollment.status === 'paused'
                            ? 'bg-amber-50 dark:bg-amber-950/50'
                            : 'bg-slate-100 dark:bg-slate-800'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-[11px] font-bold uppercase ${
                          enrollment.status === 'active'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : enrollment.status === 'paused'
                              ? 'text-amber-700 dark:text-amber-300'
                              : 'text-slate-600 dark:text-slate-300'
                        }`
                      )}
                    >
                      {t(`mobile.enrollment_status_${enrollment.status}`, enrollment.status)}
                    </Text>
                  </View>
                </View>

                {enrollment.status === 'paused' && (
                  <View style={tw('bg-amber-50 dark:bg-amber-950/30 p-3 rounded-2xl border border-amber-200 dark:border-amber-800/50 mb-3 flex-row items-center')}>
                    <PauseCircle color="#d97706" size={16} style={tw('mr-2 shrink-0')} />
                    <Text style={tw('text-xs text-amber-800 dark:text-amber-200 flex-1')}>
                      {t('mobile.program_paused_by_doctor', 'This care program is currently paused by your physician.')}
                    </Text>
                  </View>
                )}

                <View style={tw('flex-row items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800')}>
                  <View>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                      {t('mobile.care_progress', 'Completed Tasks')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mt-0.5')}>
                      {completedTasksCount}/{totalTasksCount}
                      {typeof completionRate?.completionRate === 'number'
                        ? ` (${Math.round(completionRate.completionRate * 100)}%)`
                        : ''}
                    </Text>
                  </View>

                  {enrollment.allowedActions?.includes('withdraw_consent') && (
                    <TouchableOpacity
                      onPress={() => setWithdrawModalVisible(true)}
                      style={tw('flex-row items-center px-3 py-2 rounded-xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800/40')}
                    >
                      <LogOut color="#e11d48" size={14} style={tw('mr-1.5')} />
                      <Text style={tw('text-xs font-bold text-rose-700 dark:text-rose-300')}>
                        {t('mobile.withdraw_consent', 'Withdraw')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm')}>
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1')}>
                  {t('mobile.no_active_care_program', 'No Active Care Program')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 leading-5 mb-3')}>
                  {t('mobile.no_active_care_program_desc', 'Consult with a doctor to enroll in a structured hypertension or diabetes monitoring program.')}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(patient)/my-doctors')}
                  style={tw('bg-indigo-50 dark:bg-indigo-950/40 py-2.5 px-4 rounded-xl self-start flex-row items-center')}
                >
                  <Stethoscope color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={15} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300')}>
                    {t('mobile.find_doctor', 'Find a Doctor')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {upcomingConsult ? (
              <TouchableOpacity
                onPress={() => router.push('/(patient)/appointments')}
                activeOpacity={0.85}
                style={tw('bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl p-4 border border-emerald-200 dark:border-emerald-800/50 flex-row items-center justify-between')}
              >
                <View style={tw('flex-row items-center gap-3 flex-1 mr-2')}>
                  <View style={tw('w-11 h-11 rounded-2xl bg-emerald-500 items-center justify-center')}>
                    <Calendar color="#ffffff" size={20} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300')}>
                      {t('mobile.upcoming_consultation', 'Upcoming Consultation')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mt-0.5')} numberOfLines={1}>
                      {upcomingConsult.doctorName}
                    </Text>
                    <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                      {upcomingConsult.specialty} • {upcomingConsult.scheduledAtText}
                    </Text>
                  </View>
                </View>
                <ChevronRight color={twInstance.color('text-emerald-700 dark:text-emerald-300')} size={18} />
              </TouchableOpacity>
            ) : null}

            {enrollment && (
              <View>
                <View style={tw('flex-row items-center justify-between mb-3')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.care_tasks_today', 'Care Plan Tasks')}
                  </Text>
                  <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400')}>
                    {completedTasksCount}/{totalTasksCount} {t('mobile.completed', 'Completed')}
                  </Text>
                </View>

                {tasks.length === 0 ? (
                  <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800 items-center')}>
                    <ClipboardCheck color={twInstance.color('text-slate-400')} size={24} />
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-2 text-center')}>
                      {t('mobile.no_care_tasks_scheduled', 'No tasks scheduled for this period yet.')}
                    </Text>
                  </View>
                ) : (
                  <View style={tw('gap-2.5')}>
                    {tasks.map((task) => {
                      const isDone = task.status === 'completed';
                      const isMissed = task.status === 'missed';
                      return (
                        <TouchableOpacity
                          key={task.id}
                          onPress={() => handleTaskPress(task)}
                          activeOpacity={0.8}
                          style={tw(
                            `p-4 rounded-2xl border flex-row items-center justify-between ${
                              isDone
                                ? 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
                            }`
                          )}
                        >
                          <View style={tw('flex-row items-center gap-3 flex-1 mr-3')}>
                            {isDone ? (
                              <CheckCircle2 color="#10b981" size={22} />
                            ) : isMissed ? (
                              <AlertCircle color="#ef4444" size={22} />
                            ) : (
                              <Circle color={twInstance.color('text-indigo-500')} size={22} />
                            )}
                            <View style={tw('flex-1')}>
                              <Text
                                style={tw(
                                  `text-sm font-bold ${
                                    isDone
                                      ? 'text-slate-500 dark:text-slate-400 line-through'
                                      : 'text-slate-900 dark:text-white'
                                  }`
                                )}
                                numberOfLines={1}
                              >
                                {getTaskTitle(task)}
                              </Text>
                              <View style={tw('flex-row items-center gap-2 mt-0.5')}>
                                {task.scheduledFor ? (
                                  <View style={tw('flex-row items-center gap-1')}>
                                    <Clock color={twInstance.color('text-slate-400')} size={12} />
                                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                                      {formatTaskTime(task.scheduledFor)}
                                    </Text>
                                  </View>
                                ) : null}
                                <Text style={tw('text-xs text-slate-400 dark:text-slate-500')}>
                                  {t(`mobile.task_status_${task.status}`, task.status)}
                                </Text>
                              </View>
                            </View>
                          </View>
                          <ChevronRight color={twInstance.color('text-slate-400')} size={18} />
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}
              </View>
            )}

            <View>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-3')}>
                {t('mobile.quick_actions', 'Quick Actions')}
              </Text>
              <View style={tw('flex-row flex-wrap gap-3')}>
                <TouchableOpacity
                  onPress={() => router.push('/(patient)/health-metric')}
                  style={tw('w-[48%] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm')}
                >
                  <View style={tw('w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-900/30 items-center justify-center mb-2.5')}>
                    <Heart color="#f43f5e" size={20} />
                  </View>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.record_vitals', 'Record Vitals')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {healthAlertsCount > 0
                      ? t('mobile.metric_alerts_count', {
                          count: healthAlertsCount,
                          defaultValue: `${healthAlertsCount} alerts`,
                        })
                      : t('mobile.track_bp_glucose', 'Blood pressure & glucose')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(patient)/ai-chat')}
                  style={tw('w-[48%] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm')}
                >
                  <View style={tw('w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mb-2.5')}>
                    <Bot color="#4f46e5" size={20} />
                  </View>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.ai_assistant', 'AI Health Assistant')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {t('mobile.ask_medical_questions', '24/7 health guidance')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(patient)/my-doctors')}
                  style={tw('w-[48%] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm')}
                >
                  <View style={tw('w-10 h-10 rounded-xl bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mb-2.5')}>
                    <Stethoscope color="#10b981" size={20} />
                  </View>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.book_doctor', 'Find Doctors')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {t('mobile.video_and_slots', 'On-demand & scheduled')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => router.push('/(patient)/reports')}
                  style={tw('w-[48%] bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200/80 dark:border-slate-800 shadow-sm')}
                >
                  <View style={tw('w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-900/30 items-center justify-center mb-2.5')}>
                    <Activity color="#d97706" size={20} />
                  </View>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.health_reports', 'Health Reports')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {t('mobile.trends_and_exports', 'Trends & AI summary')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      <PauseProgramModal
        visible={withdrawModalVisible}
        onClose={() => setWithdrawModalVisible(false)}
        programName={enrollment?.program.name}
        mode="withdraw"
        onConfirmPause={handleWithdrawConsent}
      />

      <HealthCheckInTaskModal
        visible={checkInModalVisible}
        onClose={() => setCheckInModalVisible(false)}
        taskId={activeTask?.id}
        taskTitle={activeTask ? getTaskTitle(activeTask) : undefined}
        onSubmit={handleCheckInSubmit}
      />

      <EducationTaskModal
        visible={educationModalVisible}
        onClose={() => setEducationModalVisible(false)}
        taskId={activeTask?.id}
        onAcknowledge={handleEducationAcknowledge}
      />

      <AppointmentTaskLinkModal
        visible={appointmentModalVisible}
        onClose={() => setAppointmentModalVisible(false)}
        taskId={activeTask?.id}
        taskTitle={activeTask ? getTaskTitle(activeTask) : undefined}
        doctorId={enrollment?.assignedDoctor?.id}
        onLinkConsultation={handleLinkConsultation}
        onBookNewSlot={() => router.push('/(patient)/my-doctors')}
      />
    </SafeAreaView>
  );
}
