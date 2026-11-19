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
  ClipboardList,
  Clock,
  Crown,
  Flame,
  Heart,
  Link2,
  LogOut,
  MessageSquare,
  PauseCircle,
  Pill,
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
  const { t } = useTranslation();
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
          const locale = t('mobile.date_locale', 'vi-VN');
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
  }, [t]);

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
    return d.toLocaleTimeString(t('mobile.date_locale', 'vi-VN'), {
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
  const adherencePercent =
    typeof completionRate?.completionRate === 'number'
      ? Math.min(100, Math.max(0, Math.round(completionRate.completionRate * 100)))
      : totalTasksCount > 0
        ? Math.round((completedTasksCount / totalTasksCount) * 100)
        : 0;

  const getTaskVisual = (taskType: TaskRow['taskType']) => {
    switch (taskType) {
      case 'metric':
        return {
          Icon: Activity,
          color: '#f43f5e',
          bg: 'bg-rose-100 dark:bg-rose-900/30',
        };
      case 'check_in':
        return {
          Icon: ClipboardCheck,
          color: '#6366f1',
          bg: 'bg-indigo-100 dark:bg-indigo-900/30',
        };
      case 'education':
        return {
          Icon: Flame,
          color: '#f59e0b',
          bg: 'bg-amber-100 dark:bg-amber-900/30',
        };
      case 'appointment':
        return {
          Icon: Link2,
          color: '#3b82f6',
          bg: 'bg-blue-100 dark:bg-blue-900/30',
        };
      default:
        return {
          Icon: Pill,
          color: '#a855f7',
          bg: 'bg-purple-100 dark:bg-purple-900/30',
        };
    }
  };

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
          <View style={tw('px-6 gap-6')}>
            {/* Colored Dual Quota Pills Bar */}
            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity
                onPress={() => router.push('/(patient)/premium')}
                activeOpacity={0.85}
                style={tw('flex-row items-center bg-emerald-50 dark:bg-emerald-900/30 px-3.5 py-2.5 rounded-full border border-emerald-200/80 dark:border-emerald-800/50 flex-1')}
              >
                <MessageSquare size={16} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
                <Text
                  numberOfLines={1}
                  style={tw('ml-2 text-xs font-bold text-emerald-800 dark:text-emerald-300 flex-1')}
                >
                  {t('mobile.ai_chats_quota', 'AI Queries')}:{' '}
                  {quota.aiLimit !== null ? `${quota.aiUsed}/${quota.aiLimit}` : `${quota.aiUsed}`}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => router.push('/(patient)/premium')}
                activeOpacity={0.85}
                style={tw('flex-row items-center bg-blue-50 dark:bg-blue-900/30 px-3.5 py-2.5 rounded-full border border-blue-200/80 dark:border-blue-800/50 flex-1')}
              >
                <Video size={16} color={twInstance.color('text-blue-600 dark:text-blue-400')} />
                <Text
                  numberOfLines={1}
                  style={tw('ml-2 text-xs font-bold text-blue-800 dark:text-blue-300 flex-1')}
                >
                  {t('mobile.consultations_quota', 'Consultations')}:{' '}
                  {quota.consultationsLimit !== null
                    ? `${quota.consultationsUsed}/${quota.consultationsLimit}`
                    : `${quota.consultationsUsed}`}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Care Program Banner (Amber Pending Setup / Indigo Active / Indigo Discovery) */}
            {needsSetup && enrollment ? (
              <View style={tw('bg-amber-500 dark:bg-amber-600 rounded-3xl p-5 shadow-md border border-amber-400 dark:border-amber-500')}>
                <View style={tw('flex-row items-center justify-between mb-2.5')}>
                  <View style={tw('flex-row items-center gap-2')}>
                    <View style={tw('w-7 h-7 rounded-full bg-white/20 items-center justify-center')}>
                      <ClipboardList size={16} color="#ffffff" />
                    </View>
                    <View style={tw('bg-white/20 px-2.5 py-0.5 rounded-full')}>
                      <Text numberOfLines={1} style={tw('text-white text-xs font-bold uppercase tracking-wider shrink-0')}>
                        {t('mobile.action_required', 'Action Required')}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text style={tw('text-white font-bold text-lg mb-1 leading-snug')}>
                  {t('mobile.activate_care_program', 'Activate Care Program')}: {enrollment.program.name}
                </Text>
                <Text style={tw('text-amber-100 text-xs leading-relaxed mb-4')}>
                  {t(
                    'mobile.activate_care_program_desc',
                    'Review monitoring consent and enter baseline health values to start daily follow-up tasks.'
                  )}
                </Text>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() =>
                    router.push({
                      pathname: '/(patient)/baseline-assessment',
                      params: { enrollmentId: enrollment.id },
                    })
                  }
                  style={tw('bg-white dark:bg-slate-900 py-3 px-4 rounded-2xl flex-row items-center justify-center shadow-sm')}
                >
                  <Sparkles size={16} color={twInstance.color('text-amber-600 dark:text-amber-400')} style={tw('mr-2')} />
                  <Text numberOfLines={1} style={tw('text-amber-700 dark:text-amber-300 font-bold text-sm shrink-0')}>
                    {t('mobile.complete_assessment_now', 'Complete Assessment')}
                  </Text>
                  <ChevronRight size={16} color={twInstance.color('text-amber-700 dark:text-amber-300')} style={tw('ml-1')} />
                </TouchableOpacity>
              </View>
            ) : enrollment ? (
              <View style={tw('bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-5 shadow-md')}>
                <View style={tw('flex-row justify-between items-start mb-4')}>
                  <View style={tw('flex-1 mr-3')}>
                    <Text style={tw('text-indigo-100 text-xs font-semibold uppercase tracking-wider mb-1')}>
                      {enrollment.status === 'paused'
                        ? t('mobile.program_paused', 'Program Paused')
                        : t('mobile.active_program', 'Active Program')}
                    </Text>
                    <Text style={tw('text-white font-bold text-lg leading-tight')} numberOfLines={1}>
                      {enrollment.program.name}
                    </Text>
                    <Text style={tw('text-indigo-100 text-xs mt-1')} numberOfLines={1}>
                      {enrollment.assignedDoctor?.fullName || t('mobile.assigned_doctor', 'Assigned Doctor')}
                    </Text>
                  </View>
                  <View style={tw('bg-white/20 px-3 py-1.5 rounded-full flex-row items-center shrink-0')}>
                    <Flame size={14} color="#fca5a5" />
                    <Text numberOfLines={1} style={tw('text-white text-xs font-bold ml-1 shrink-0')}>
                      {completedTasksCount}/{totalTasksCount}
                    </Text>
                  </View>
                </View>

                {enrollment.status === 'paused' && (
                  <View style={tw('bg-white/15 p-3 rounded-2xl border border-white/20 mb-3 flex-row items-center')}>
                    <PauseCircle color="#fde68a" size={16} style={tw('mr-2 shrink-0')} />
                    <Text style={tw('text-xs text-indigo-50 flex-1')}>
                      {t('mobile.program_paused_by_doctor', 'This care program is currently paused by your physician.')}
                    </Text>
                  </View>
                )}

                {/* Adherence Progress Bar */}
                <View style={tw('mb-4')}>
                  <View style={tw('flex-row justify-between mb-1.5')}>
                    <Text style={tw('text-indigo-100 text-xs font-medium')}>
                      {t('mobile.adherence', 'Adherence')}
                    </Text>
                    <Text style={tw('text-white font-bold text-xs')}>
                      {adherencePercent}%
                    </Text>
                  </View>
                  <View style={tw('w-full h-2 bg-indigo-900/50 rounded-full overflow-hidden')}>
                    <View style={[tw('h-full bg-emerald-400 rounded-full'), { width: `${adherencePercent}%` }]} />
                  </View>
                </View>

                <View style={tw('flex-row justify-between items-center')}>
                  <View style={tw('bg-white/20 px-2.5 py-1 rounded-full')}>
                    <Text numberOfLines={1} style={tw('text-white text-xs font-bold uppercase shrink-0')}>
                      {t(`mobile.enrollment_status_${enrollment.status}`, enrollment.status)}
                    </Text>
                  </View>
                  {enrollment.allowedActions?.includes('withdraw_consent') && (
                    <TouchableOpacity
                      onPress={() => setWithdrawModalVisible(true)}
                      style={tw('bg-white/20 px-3.5 py-1.5 rounded-full flex-row items-center')}
                    >
                      <LogOut color="#ffe4e6" size={13} style={tw('mr-1.5')} />
                      <Text numberOfLines={1} style={tw('text-white text-xs font-bold shrink-0')}>
                        {t('mobile.withdraw_consent', 'Withdraw')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ) : (
              <View style={tw('bg-indigo-600 dark:bg-indigo-700 rounded-3xl p-5 shadow-md')}>
                <View style={tw('flex-row items-center gap-3 mb-2.5')}>
                  <View style={tw('w-10 h-10 rounded-2xl bg-white/20 items-center justify-center shrink-0')}>
                    <Shield color="#ffffff" size={20} />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-indigo-100 text-xs font-semibold uppercase tracking-wider')}>
                      {t('mobile.active_program', 'Care Program')}
                    </Text>
                    <Text style={tw('text-white text-base font-bold')} numberOfLines={1}>
                      {t('mobile.no_active_care_program', 'No Active Care Program')}
                    </Text>
                  </View>
                </View>
                <Text style={tw('text-xs text-indigo-100 leading-5 mb-4')}>
                  {t('mobile.no_active_care_program_desc', 'Consult with a doctor to enroll in a structured hypertension or diabetes monitoring program.')}
                </Text>
                <TouchableOpacity
                  onPress={() => router.push('/(patient)/my-doctors')}
                  activeOpacity={0.85}
                  style={tw('bg-white dark:bg-slate-900 py-2.5 px-4 rounded-xl self-start flex-row items-center shadow-sm')}
                >
                  <Stethoscope color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={15} style={tw('mr-1.5')} />
                  <Text
                    numberOfLines={1}
                    style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0')}
                  >
                    {t('mobile.find_doctor', 'Find a Doctor')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {/* Today's Tasks Section — Always Visible */}
            <View>
              <View style={tw('flex-row justify-between items-start mb-3.5')}>
                <View style={tw('flex-1 mr-3')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-slate-100')}>
                    {t('mobile.todays_tasks', "Today's Tasks")}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')} numberOfLines={1}>
                    {t('mobile.care_task_contract_subtitle', 'Daily vitals, symptoms & follow-ups')}
                  </Text>
                </View>
                <View style={tw('bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 px-3 py-1 rounded-full shrink-0')}>
                  <Text numberOfLines={1} style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400 shrink-0')}>
                    {completedTasksCount}/{totalTasksCount} {t('mobile.done', 'Done')}
                  </Text>
                </View>
              </View>

              {tasks.length === 0 ? (
                <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm items-center')}>
                  <View style={tw('w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center mb-3')}>
                    <ClipboardCheck color={twInstance.color('text-indigo-500 dark:text-indigo-400')} size={24} />
                  </View>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center leading-5')}>
                    {t('mobile.no_care_tasks_scheduled', 'No tasks scheduled for this period yet.')}
                  </Text>
                  {!enrollment && (
                    <TouchableOpacity
                      onPress={() => router.push('/(patient)/my-doctors')}
                      activeOpacity={0.85}
                      style={tw('mt-3 bg-indigo-50 dark:bg-indigo-950/40 px-4 py-2 rounded-full flex-row items-center')}
                    >
                      <Stethoscope color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={14} style={tw('mr-1.5')} />
                      <Text numberOfLines={1} style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0')}>
                        {t('mobile.find_doctor', 'Find a Doctor')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View style={tw('gap-3')}>
                  {tasks.map((task) => {
                    const visual = getTaskVisual(task.taskType);
                    const TaskIcon = visual.Icon;
                    const isDone = task.status === 'completed';
                    const isMissed = task.status === 'missed';
                    const isCancelled = task.status === 'cancelled';
                    const isTerminal = isDone || isMissed || isCancelled;
                    return (
                      <TouchableOpacity
                        key={task.id}
                        onPress={() => handleTaskPress(task)}
                        activeOpacity={0.8}
                        style={tw(
                          `p-4 rounded-2xl border flex-row items-center justify-between ${
                            isTerminal
                              ? 'bg-slate-100/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 opacity-75'
                              : task.status === 'due'
                                ? 'bg-indigo-50/70 dark:bg-indigo-950/20 border-indigo-200 dark:border-indigo-800/60 shadow-sm'
                                : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 shadow-sm'
                          }`
                        )}
                      >
                        <View style={tw('flex-row items-center flex-1 mr-3')}>
                          <View style={tw(`w-12 h-12 rounded-xl items-center justify-center mr-3.5 shrink-0 ${visual.bg}`)}>
                            <TaskIcon size={22} color={visual.color} />
                          </View>
                          <View style={tw('flex-1')}>
                            <Text
                              style={tw(
                                `text-sm font-bold ${
                                  isTerminal
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
                              <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                                {t(`mobile.task_status_${task.status}`, task.status)}
                              </Text>
                            </View>
                          </View>
                        </View>
                        <View style={tw('ml-2 shrink-0')}>
                          {isDone ? (
                            <CheckCircle2 color="#10b981" size={24} />
                          ) : isMissed ? (
                            <AlertCircle color="#ef4444" size={24} />
                          ) : task.status === 'due' ? (
                            <View style={tw('bg-indigo-600 px-3.5 py-1.5 rounded-full')}>
                              <Text numberOfLines={1} style={tw('text-white text-xs font-bold shrink-0')}>
                                {task.taskType === 'education'
                                  ? t('mobile.view_and_ack', 'View')
                                  : task.taskType === 'appointment'
                                    ? t('mobile.link_btn', 'Link')
                                    : t('mobile.start', 'Start')}
                              </Text>
                            </View>
                          ) : (
                            <Circle color={twInstance.color('text-slate-300 dark:text-slate-600')} size={24} />
                          )}
                        </View>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Upgrade Premium Banner */}
            <TouchableOpacity
              onPress={() => router.push('/(patient)/premium')}
              activeOpacity={0.88}
              style={tw('bg-amber-500 dark:bg-amber-600 rounded-3xl p-5 flex-row items-center justify-between shadow-md')}
            >
              <View style={tw('flex-1 pr-4')}>
                <View style={tw('flex-row items-center mb-1')}>
                  <Crown color="#ffffff" size={20} style={tw('mr-2 shrink-0')} />
                  <Text style={tw('text-white font-bold text-lg flex-1')} numberOfLines={1}>
                    {t('mobile.upgrade_premium', 'Upgrade Premium')}
                  </Text>
                </View>
                <Text style={tw('text-amber-50 text-xs leading-5')}>
                  {t('mobile.unlimited_ai_chats_priority_do', 'Unlimited AI chats & priority doctor queue')}
                </Text>
              </View>
              <View style={tw('w-10 h-10 bg-white/25 rounded-full items-center justify-center shrink-0')}>
                <ChevronRight color="#ffffff" size={22} />
              </View>
            </TouchableOpacity>

            {/* Upcoming Appointment Section — Always Visible */}
            <View>
              <View style={tw('flex-row justify-between items-center mb-3')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-slate-100')}>
                  {t('mobile.upcoming_appointment', 'Upcoming Appointment')}
                </Text>
                <TouchableOpacity onPress={() => router.push('/(patient)/appointments')}>
                  <Text style={tw('text-sm font-semibold text-emerald-600 dark:text-emerald-400')}>
                    {t('mobile.see_all', 'See all')}
                  </Text>
                </TouchableOpacity>
              </View>

              {upcomingConsult ? (
                <TouchableOpacity
                  onPress={() => router.push('/(patient)/appointments')}
                  activeOpacity={0.88}
                  style={tw('bg-emerald-500 dark:bg-emerald-600 rounded-3xl p-5 shadow-md')}
                >
                  <View style={tw('flex-row items-center mb-4')}>
                    <View style={tw('w-12 h-12 rounded-2xl bg-white/20 items-center justify-center shrink-0')}>
                      <Stethoscope color="#ffffff" size={24} />
                    </View>
                    <View style={tw('ml-3 flex-1')}>
                      <Text style={tw('text-white font-bold text-base')} numberOfLines={1}>
                        {upcomingConsult.doctorName}
                      </Text>
                      <Text style={tw('text-emerald-50 text-xs mt-0.5')} numberOfLines={1}>
                        {upcomingConsult.specialty}
                      </Text>
                    </View>
                    <View style={tw('w-10 h-10 bg-white dark:bg-slate-900 rounded-full items-center justify-center shrink-0')}>
                      <Video color="#10b981" size={18} />
                    </View>
                  </View>

                  <View style={tw('bg-emerald-600 dark:bg-emerald-700 rounded-2xl p-3 flex-row items-center justify-between')}>
                    <View style={tw('flex-row items-center gap-2')}>
                      <Calendar color="#d1fae5" size={16} />
                      <Text style={tw('text-emerald-50 text-xs font-semibold')}>
                        {upcomingConsult.scheduledAtText}
                      </Text>
                    </View>
                    <ChevronRight color="#d1fae5" size={16} />
                  </View>
                </TouchableOpacity>
              ) : (
                <View style={tw('bg-emerald-50 dark:bg-emerald-950/30 rounded-3xl p-5 border border-emerald-200 dark:border-emerald-800/50')}>
                  <View style={tw('flex-row items-start gap-3 mb-3')}>
                    <View style={tw('w-11 h-11 rounded-2xl bg-emerald-500 items-center justify-center shrink-0')}>
                      <Calendar color="#ffffff" size={20} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                        {t('mobile.no_upcoming_appointments_title', 'No upcoming appointments')}
                      </Text>
                      <Text style={tw('text-xs text-slate-600 dark:text-slate-300 mt-0.5 leading-5')}>
                        {t('mobile.no_upcoming_appointments_desc', 'You do not have any upcoming appointments.')}
                      </Text>
                    </View>
                  </View>
                  <TouchableOpacity
                    onPress={() => router.push('/(patient)/my-doctors')}
                    activeOpacity={0.85}
                    style={tw('bg-emerald-500 dark:bg-emerald-600 py-2.5 px-4 rounded-xl self-start flex-row items-center')}
                  >
                    <Calendar color="#ffffff" size={14} style={tw('mr-1.5')} />
                    <Text numberOfLines={1} style={tw('text-xs font-bold text-white shrink-0')}>
                      {t('mobile.book_doctor', 'Find Doctors')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

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
