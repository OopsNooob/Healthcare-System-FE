import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
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
import {
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  ChevronRight,
  ClipboardCheck,
  FileCode2,
  RefreshCw,
  Search,
  Stethoscope,
  Trash2,
  UserPlus,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  generateIdempotencyKey,
  mobileApi,
  normalizePaginatedList,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { AiSummaryModal } from '@/components/modals/AiSummaryModal';
import { ClinicalNotesModal } from '@/components/modals/ClinicalNotesModal';
import { ProgramRulePreviewModal } from '@/components/modals/ProgramRulePreviewModal';
import { DoctorReviewTaskModal } from '@/components/modals/DoctorReviewTaskModal';
import { VoidDataModal } from '@/components/modals/VoidDataModal';
import { PatientProfileModal } from '@/components/modals/PatientProfileModal';
import { CareAlertsModal } from '@/components/modals/CareAlertsModal';

type EnrollmentStatus = 'pending' | 'active' | 'paused' | 'completed' | 'cancelled';

interface PublishedProgramOption {
  id: string;
  name: string;
  diseaseKey: string;
  description: string;
}

interface DoctorPatientRecord {
  id: string;
  patientId: string;
  name: string;
  enrollmentId?: string;
  programId?: string;
  programName?: string;
  enrollmentStatus?: EnrollmentStatus;
  revision: number;
  baseline: string;
  current: string;
  latestMetricId?: string;
  adherence?: number;
  openAlertCount: number;
  pendingReviewTaskId?: string;
}

function formatMetricCompact(item: Record<string, unknown> | undefined): string {
  if (!item) return '—';
  const unit = String(item.unit ?? '');
  const values = (item.values ?? {}) as Record<string, unknown>;
  if (values.systolic !== undefined && values.diastolic !== undefined) {
    return `${String(values.systolic)}/${String(values.diastolic)} ${unit}`.trim();
  }
  const v = values.value ?? values.amount;
  if (v !== undefined) return `${String(v)} ${unit}`.trim();
  return '—';
}

function formatBaselineCompact(detail: Record<string, unknown>): string {
  const baseline = detail.baseline as Record<string, unknown> | undefined;
  const answers = (baseline?.answers ?? detail.baselineAnswers) as Record<string, unknown> | undefined;
  if (!answers || typeof answers !== 'object') return '—';
  const entries = Object.entries(answers).slice(0, 2);
  if (entries.length === 0) return '—';
  return entries.map(([, v]) => String(v)).join(' / ');
}

export default function DoctorPatientsScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const [patients, setPatients] = useState<DoctorPatientRecord[]>([]);
  const [publishedPrograms, setPublishedPrograms] = useState<PublishedProgramOption[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'enrolled' | 'unenrolled'>('all');

  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Enroll Modal state
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<DoctorPatientRecord | null>(null);
  const [selectedProgramId, setSelectedProgramId] = useState('');
  const [isEnrolling, setIsEnrolling] = useState(false);

  // Lifecycle Transition Modal State
  const [lifecycleModalVisible, setLifecycleModalVisible] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<'pause' | 'resume' | 'complete' | 'cancel'>('pause');
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [isSubmittingLifecycle, setIsSubmittingLifecycle] = useState(false);

  // Child Modals State
  const [activePatientData, setActivePatientData] = useState<DoctorPatientRecord | null>(null);
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [clinicalNotesVisible, setClinicalNotesVisible] = useState(false);
  const [programRulePreviewVisible, setProgramRulePreviewVisible] = useState(false);
  const [doctorReviewTaskVisible, setDoctorReviewTaskVisible] = useState(false);
  const [voidDataVisible, setVoidDataVisible] = useState(false);
  const [patientProfileVisible, setPatientProfileVisible] = useState(false);
  const [careAlertsVisible, setCareAlertsVisible] = useState(false);

  const loadPatients = useCallback(async (targetPage = 1, append = false) => {
    if (append) setLoadingMore(true);
    else if (!refreshing) setLoading(true);
    setErrorMsg(null);

    try {
      const [enrollRes, programsRes, consultRes, alertsRes] = await Promise.all([
        mobileApi.careEnrollmentList({
          query: { page: targetPage, limit: 20, sortOrder: -1 },
        }),
        targetPage === 1
          ? mobileApi.careProgramRuleListPrograms({
              query: { status: 'published', page: 1, limit: 30 },
            })
          : Promise.resolve(null),
        targetPage === 1
          ? mobileApi.consultationsFindAll({
              query: { page: 1, limit: 30, sortOrder: -1 },
            })
          : Promise.resolve(null),
        targetPage === 1
          ? mobileApi.careAlertInbox({ query: { limit: 50 } })
          : Promise.resolve(null),
      ]);

      const programMap: Record<string, PublishedProgramOption> = {};
      if (programsRes) {
        const progItems = normalizePaginatedList<Record<string, unknown>>(programsRes).items;
        const progOptions: PublishedProgramOption[] = progItems
          .map((p) => ({
            id: String(p.id ?? p._id ?? ''),
            name: String(p.name ?? ''),
            diseaseKey: String(p.diseaseKey ?? ''),
            description: String(p.description ?? ''),
          }))
          .filter((p) => Boolean(p.id));
        setPublishedPrograms(progOptions);
        for (const p of progOptions) programMap[p.id] = p;
        setSelectedProgramId((prev) => prev || progOptions[0]?.id || '');
      }

      const alertCountByPatient: Record<string, number> = {};
      if (alertsRes) {
        const alertItems = normalizePaginatedList<Record<string, unknown>>(alertsRes).items;
        for (const a of alertItems) {
          const pId = String(a.patientId ?? '');
          if (pId) alertCountByPatient[pId] = (alertCountByPatient[pId] ?? 0) + 1;
        }
      }

      const enrollmentPage = normalizePaginatedList<Record<string, unknown>>(enrollRes);
      const rawEnrollments = enrollmentPage.items;

      // Collect unique patient IDs + fallback names from consultations
      const patientNameFallback: Record<string, string> = {};
      const consultationPatientIds: string[] = [];
      if (consultRes) {
        const consultItems = normalizePaginatedList<Record<string, unknown>>(consultRes).items;
        for (const c of consultItems) {
          const pRaw = c.patientId ?? c.patient;
          const pObj = typeof pRaw === 'object' && pRaw !== null ? (pRaw as Record<string, unknown>) : null;
          const pId = String(pObj?._id ?? pObj?.id ?? pRaw ?? '');
          if (pId) {
            if (!consultationPatientIds.includes(pId)) consultationPatientIds.push(pId);
            if (pObj?.fullName && !patientNameFallback[pId]) {
              patientNameFallback[pId] = String(pObj.fullName);
            }
          }
        }
      }

      const enrolledPatientIds = new Set<string>();
      const allPatientIdsToResolve = new Set<string>();

      for (const enr of rawEnrollments) {
        const pRaw = enr.patientId ?? enr.patient;
        const pObj = typeof pRaw === 'object' && pRaw !== null ? (pRaw as Record<string, unknown>) : null;
        const pId = String(pObj?._id ?? pObj?.id ?? pRaw ?? '');
        if (pId) {
          enrolledPatientIds.add(pId);
          allPatientIdsToResolve.add(pId);
          if (pObj?.fullName) patientNameFallback[pId] = String(pObj.fullName);
        }
      }

      const unenrolledPatientIds =
        targetPage === 1
          ? consultationPatientIds.filter((id) => !enrolledPatientIds.has(id))
          : [];
      for (const id of unenrolledPatientIds) allPatientIdsToResolve.add(id);

      const profileNames: Record<string, string> = { ...patientNameFallback };
      const latestMetricMap: Record<string, { label: string; id: string }> = {};

      await Promise.allSettled(
        Array.from(allPatientIdsToResolve)
          .slice(0, 25)
          .map(async (pId) => {
            const [profRes, metricRes] = await Promise.allSettled([
              profileNames[pId]
                ? Promise.resolve(null)
                : mobileApi.usersFindProfile({ params: { id: pId } }),
              mobileApi.healthMetricsFindAll({
                query: { patientId: pId, limit: 1, sortBy: 'recordedAt', sortOrder: -1 },
              }),
            ]);
            if (profRes.status === 'fulfilled' && profRes.value) {
              const rawP = profRes.value as unknown as { data?: { fullName?: string }; fullName?: string };
              const fullName = rawP?.data?.fullName ?? rawP?.fullName;
              if (fullName) profileNames[pId] = String(fullName);
            }
            if (metricRes.status === 'fulfilled') {
              const firstMetric = normalizePaginatedList<Record<string, unknown>>(metricRes.value).items[0];
              if (firstMetric) {
                latestMetricMap[pId] = {
                  label: formatMetricCompact(firstMetric),
                  id: String(firstMetric.id ?? firstMetric._id ?? ''),
                };
              }
            }
          })
      );

      // Enrich each enrollment with completion rate & pending doctor_review task
      const enrolledRows: DoctorPatientRecord[] = await Promise.all(
        rawEnrollments.map(async (enr) => {
          const enrollmentId = String(enr.id ?? enr._id ?? '');
          const pRaw = enr.patientId ?? enr.patient;
          const pObj = typeof pRaw === 'object' && pRaw !== null ? (pRaw as Record<string, unknown>) : null;
          const pId = String(pObj?._id ?? pObj?.id ?? pRaw ?? '');

          const progRaw = enr.programId ?? enr.program;
          const progObj =
            typeof progRaw === 'object' && progRaw !== null ? (progRaw as Record<string, unknown>) : null;
          const progId = String(progObj?._id ?? progObj?.id ?? progRaw ?? '');
          const progName = String(
            enr.programName ??
              progObj?.name ??
              programMap[progId]?.name ??
              t('mobile.chronic_care')
          );

          let adherence: number | undefined;
          let pendingReviewTaskId: string | undefined;

          if (enrollmentId) {
            const [rateRes, tasksRes] = await Promise.allSettled([
              mobileApi.careTaskCompletionRate({ params: { id: enrollmentId } }),
              mobileApi.careTaskTasks({
                params: { id: enrollmentId },
                query: { type: 'doctor_review', page: 1, limit: 5 },
              }),
            ]);
            if (rateRes.status === 'fulfilled') {
              const rawRate = rateRes.value as unknown as Record<string, unknown>;
              const dataRate =
                rawRate.data && typeof rawRate.data === 'object'
                  ? (rawRate.data as Record<string, unknown>)
                  : rawRate;
              const val = dataRate.completionRate ?? dataRate.rate;
              if (typeof val === 'number') {
                adherence = val <= 1 ? Math.round(val * 100) : Math.round(val);
              }
            }
            if (tasksRes.status === 'fulfilled') {
              const tasks = normalizePaginatedList<Record<string, unknown>>(tasksRes.value).items;
              const openTask =
                tasks.find((tk) => tk.status === 'due' || tk.status === 'overdue' || tk.status === 'upcoming') ??
                tasks[0];
              if (openTask) {
                pendingReviewTaskId = String(openTask.id ?? openTask._id ?? '') || undefined;
              }
            }
          }

          return {
            id: enrollmentId || pId,
            patientId: pId,
            name: profileNames[pId] || t('mobile.patient'),
            enrollmentId,
            programId: progId || undefined,
            programName: progName,
            enrollmentStatus: (String(enr.status ?? 'active') as EnrollmentStatus) || 'active',
            revision: Number(enr.revision ?? 1),
            baseline: formatBaselineCompact(enr),
            current: latestMetricMap[pId]?.label ?? '—',
            latestMetricId: latestMetricMap[pId]?.id,
            adherence,
            openAlertCount: alertCountByPatient[pId] ?? 0,
            pendingReviewTaskId,
          };
        })
      );

      const unenrolledRows: DoctorPatientRecord[] = unenrolledPatientIds.map((pId) => ({
        id: `consult-patient-${pId}`,
        patientId: pId,
        name: profileNames[pId] || t('mobile.patient'),
        revision: 1,
        baseline: '—',
        current: latestMetricMap[pId]?.label ?? '—',
        latestMetricId: latestMetricMap[pId]?.id,
        openAlertCount: alertCountByPatient[pId] ?? 0,
      }));

      setPatients((prev) =>
        append ? [...prev, ...enrolledRows] : [...enrolledRows, ...unenrolledRows]
      );
      setPage(targetPage);

      const totalPages = Number(enrollmentPage.totalPages ?? 1);
      setHasMore(Boolean(enrollmentPage.hasNextPage) || targetPage < totalPages);
    } catch (err) {
      if (!append) {
        setErrorMsg(extractApiErrorMessage(err, 'mobile.load_patients_failed'));
      }
    } finally {
      setLoading(false);
      setLoadingMore(false);
      setRefreshing(false);
    }
  }, [refreshing, t]);

  useEffect(() => {
    void loadPatients(1, false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    void loadPatients(1, false);
  };

  const enrollmentStatusLabel = (status?: EnrollmentStatus): string => {
    switch (status) {
      case 'pending':
        return t('mobile.enrollment_pending');
      case 'paused':
        return t('mobile.enrollment_paused');
      case 'completed':
        return t('mobile.enrollment_completed');
      case 'cancelled':
        return t('mobile.enrollment_cancelled');
      default:
        return t('mobile.enrollment_active');
    }
  };

  const handleOpenEnroll = (patient: DoctorPatientRecord) => {
    setSelectedPatient(patient);
    setSelectedProgramId((prev) => prev || publishedPrograms[0]?.id || '');
    setEnrollModalVisible(true);
  };

  const confirmEnroll = async () => {
    if (!selectedPatient || !selectedProgramId || isEnrolling) return;
    setIsEnrolling(true);
    try {
      const tz =
        typeof Intl !== 'undefined'
          ? Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh'
          : 'Asia/Ho_Chi_Minh';
      await mobileApi.careEnrollmentCreate({
        body: {
          patientId: selectedPatient.patientId,
          programId: selectedProgramId,
          timezone: tz,
        },
        headers: { 'Idempotency-Key': generateIdempotencyKey() },
      });
      setEnrollModalVisible(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.patient_enrolled'),
        text2: selectedPatient.name,
      });
      await loadPatients(1, false);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.enroll_patient_failed'),
      });
    } finally {
      setIsEnrolling(false);
    }
  };

  const handleLifecycleSubmit = async () => {
    if (!activePatientData?.enrollmentId || isSubmittingLifecycle) return;
    if (!lifecycleReason.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.reason_required'),
      });
      return;
    }

    setIsSubmittingLifecycle(true);
    try {
      const params = { id: activePatientData.enrollmentId };
      const body = {
        expectedRevision: activePatientData.revision,
        reason: lifecycleReason.trim(),
      };
      const headers = { 'Idempotency-Key': generateIdempotencyKey() };

      if (lifecycleAction === 'pause') {
        await mobileApi.careEnrollmentPause({ params, body, headers });
      } else if (lifecycleAction === 'resume') {
        await mobileApi.careEnrollmentResume({ params, body, headers });
      } else if (lifecycleAction === 'complete') {
        await mobileApi.careEnrollmentComplete({ params, body, headers });
      } else {
        await mobileApi.careEnrollmentCancel({ params, body, headers });
      }

      setLifecycleModalVisible(false);
      setLifecycleReason('');
      Toast.show({
        type: 'success',
        text1: t('mobile.enrollment_updated'),
        text2: activePatientData.name,
      });
      await loadPatients(1, false);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.enrollment_update_failed'),
      });
    } finally {
      setIsSubmittingLifecycle(false);
    }
  };

  const filteredPatients = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return patients.filter((p) => {
      if (statusFilter === 'enrolled' && !p.enrollmentId) return false;
      if (statusFilter === 'unenrolled' && p.enrollmentId) return false;
      if (!q) return true;
      return (
        p.name.toLowerCase().includes(q) ||
        (p.programName ?? '').toLowerCase().includes(q) ||
        p.patientId.toLowerCase().includes(q)
      );
    });
  }, [patients, searchQuery, statusFilter]);

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View
        style={tw(
          'px-6 pt-5 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <View style={tw('flex-row items-center justify-between mb-4')}>
          <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
            {t('mobile.patient_management')}
          </Text>
          <TouchableOpacity
            onPress={() => {
              setActivePatientData(null);
              setCareAlertsVisible(true);
            }}
            style={tw(
              'flex-row items-center bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-3 py-1.5 rounded-xl'
            )}
          >
            <AlertTriangle color="#ef4444" size={14} style={tw('mr-1.5')} />
            <Text style={tw('text-xs font-bold text-red-600 dark:text-red-300')}>
              {t('mobile.care_alerts')}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={tw(
            'flex-row items-center bg-slate-100 dark:bg-slate-800 px-4 py-2.5 rounded-2xl border border-slate-200 dark:border-slate-700'
          )}
        >
          <Search color={twInstance.color('text-slate-400')} size={18} style={tw('mr-2')} />
          <TextInput
            style={tw('flex-1 text-sm text-slate-900 dark:text-white')}
            placeholder={t('mobile.search_patients')}
            placeholderTextColor={twInstance.color('text-slate-400')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
          {searchQuery.length > 0 && (
            <TouchableOpacity onPress={() => setSearchQuery('')}>
              <X color={twInstance.color('text-slate-400')} size={16} />
            </TouchableOpacity>
          )}
        </View>

        {/* Filter tabs */}
        <View style={tw('flex-row gap-2 mt-3')}>
          {(
            [
              { id: 'all', label: t('mobile.all') },
              { id: 'enrolled', label: t('mobile.enrolled_only') },
              { id: 'unenrolled', label: t('mobile.unenrolled_only') },
            ] as const
          ).map((tab) => {
            const active = statusFilter === tab.id;
            return (
              <TouchableOpacity
                key={tab.id}
                onPress={() => setStatusFilter(tab.id)}
                style={tw(
                  `px-3.5 py-1.5 rounded-full border ${
                    active
                      ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-bold ${
                      active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                    }`
                  )}
                >
                  {tab.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-6 pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={twInstance.color('text-slate-900 dark:text-white')}
          />
        }
      >
        {loading ? (
          <View style={tw('gap-4')}>
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
            <Skeleton className="h-44 w-full rounded-3xl" />
          </View>
        ) : errorMsg ? (
          <View
            style={tw(
              'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-3xl p-6 items-center'
            )}
          >
            <AlertCircle color="#e11d48" size={32} style={tw('mb-2')} />
            <Text style={tw('text-sm font-semibold text-rose-700 dark:text-rose-300 text-center mb-4')}>
              {errorMsg}
            </Text>
            <TouchableOpacity
              onPress={() => void loadPatients(1, false)}
              style={tw('bg-rose-600 px-5 py-2.5 rounded-xl')}
            >
              <Text style={tw('text-white font-bold text-xs')}>{t('mobile.retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : filteredPatients.length > 0 ? (
          <>
            {filteredPatients.map((patient) => (
              <View
                key={patient.id}
                style={tw(
                  'bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800'
                )}
              >
                <View style={tw('flex-row justify-between items-start mb-4')}>
                  <View style={tw('flex-1 mr-3')}>
                    <View style={tw('flex-row flex-wrap items-center gap-2')}>
                      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                        {patient.name}
                      </Text>
                      {patient.openAlertCount > 0 && (
                        <TouchableOpacity
                          onPress={() => {
                            setActivePatientData(patient);
                            setCareAlertsVisible(true);
                          }}
                          style={tw('bg-red-100 dark:bg-red-900/40 px-2 py-0.5 rounded-full flex-row items-center')}
                        >
                          <AlertTriangle color="#ef4444" size={11} style={tw('mr-1')} />
                          <Text style={tw('text-[11px] font-bold text-red-700 dark:text-red-300')}>
                            {patient.openAlertCount}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>

                    {patient.enrollmentId ? (
                      <View style={tw('flex-row items-center flex-wrap gap-1.5 mt-2')}>
                        <View
                          style={tw(
                            'bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full self-start'
                          )}
                        >
                          <Text style={tw('text-xs font-bold text-indigo-600 dark:text-indigo-400')}>
                            {patient.programName}
                          </Text>
                        </View>
                        <View
                          style={tw(
                            `px-2.5 py-1 rounded-full ${
                              patient.enrollmentStatus === 'active'
                                ? 'bg-emerald-100 dark:bg-emerald-900/40'
                                : patient.enrollmentStatus === 'paused'
                                ? 'bg-amber-100 dark:bg-amber-900/40'
                                : 'bg-slate-200 dark:bg-slate-800'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-[10px] font-bold uppercase ${
                                patient.enrollmentStatus === 'active'
                                  ? 'text-emerald-700 dark:text-emerald-300'
                                  : patient.enrollmentStatus === 'paused'
                                  ? 'text-amber-700 dark:text-amber-300'
                                  : 'text-slate-600 dark:text-slate-400'
                              }`
                            )}
                          >
                            {enrollmentStatusLabel(patient.enrollmentStatus)}
                          </Text>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={tw(
                          'bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full mt-2 self-start'
                        )}
                      >
                        <Text style={tw('text-xs font-medium text-slate-500 dark:text-slate-400')}>
                          {t('mobile.no_active_program')}
                        </Text>
                      </View>
                    )}
                  </View>

                  {!patient.enrollmentId ? (
                    <TouchableOpacity
                      disabled={publishedPrograms.length === 0}
                      onPress={() => handleOpenEnroll(patient)}
                      style={tw(
                        `flex-row items-center bg-brand px-3.5 py-2 rounded-xl shrink-0 ${
                          publishedPrograms.length === 0 ? 'opacity-50' : ''
                        }`
                      )}
                    >
                      <UserPlus color="#0f172a" size={16} />
                      <Text style={tw('text-slate-900 font-bold ml-1.5 text-sm')} numberOfLines={1}>
                        {t('mobile.enroll')}
                      </Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      onPress={() => {
                        setActivePatientData(patient);
                        setLifecycleAction(
                          patient.enrollmentStatus === 'paused' ? 'resume' : 'pause'
                        );
                        setLifecycleModalVisible(true);
                      }}
                      style={tw(
                        'flex-row items-center bg-slate-100 dark:bg-slate-800 px-3 py-2 rounded-xl border border-slate-200 dark:border-slate-700'
                      )}
                    >
                      <RefreshCw
                        size={14}
                        color={twInstance.color('text-slate-600 dark:text-slate-300')}
                      />
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>
                        {t('mobile.status_label')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {patient.enrollmentId && (
                  <View
                    style={tw(
                      'bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800'
                    )}
                  >
                    <View style={tw('flex-row justify-between gap-2 mb-3')}>
                      <View style={tw('flex-1')}>
                        <Text style={tw('text-xs text-slate-500')}>{t('mobile.baseline')}</Text>
                        <Text numberOfLines={1} style={tw('font-bold text-slate-700 dark:text-slate-300 mt-0.5')}>
                          {patient.baseline}
                        </Text>
                      </View>
                      <View style={tw('flex-1 items-center')}>
                        <Text style={tw('text-xs text-slate-500')}>{t('mobile.current')}</Text>
                        <Text numberOfLines={1} style={tw('font-bold text-slate-900 dark:text-white mt-0.5')}>
                          {patient.current}
                        </Text>
                      </View>
                      <View style={tw('items-end')}>
                        <Text style={tw('text-xs text-slate-500')}>{t('mobile.adherence')}</Text>
                        <Text
                          style={tw(
                            `font-bold mt-0.5 ${
                              (patient.adherence ?? 0) >= 80 ? 'text-emerald-500' : 'text-amber-500'
                            }`
                          )}
                        >
                          {typeof patient.adherence === 'number' ? `${patient.adherence}%` : '—'}
                        </Text>
                      </View>
                    </View>

                    {/* Row 1 Actions: AI Summary + Doctor Review Task */}
                    <View
                      style={tw(
                        'flex-row gap-2 mt-2 pt-3 border-t border-slate-200 dark:border-slate-800'
                      )}
                    >
                      <TouchableOpacity
                        onPress={() => {
                          setActivePatientData(patient);
                          setAiSummaryVisible(true);
                        }}
                        style={tw(
                          'flex-1 bg-white dark:bg-slate-900 flex-row items-center justify-center py-2.5 rounded-lg border border-slate-200 dark:border-slate-700'
                        )}
                      >
                        <BrainCircuit color={twInstance.color('text-purple-500')} size={16} />
                        <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>
                          {t('mobile.ai_summary')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setActivePatientData(patient);
                          setDoctorReviewTaskVisible(true);
                        }}
                        style={tw(
                          'flex-1 bg-emerald-50 dark:bg-emerald-900/20 flex-row items-center justify-center py-2.5 rounded-lg border border-emerald-200 dark:border-emerald-800'
                        )}
                      >
                        <ClipboardCheck color={twInstance.color('text-emerald-600')} size={16} />
                        <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1')}>
                          {t('mobile.doctor_review_task')}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Row 2 Actions: Clinical Notes + Active CareRule Preview + Void Metric */}
                    <View style={tw('flex-row gap-2 mt-2')}>
                      <TouchableOpacity
                        onPress={() => {
                          setActivePatientData(patient);
                          setClinicalNotesVisible(true);
                        }}
                        style={tw(
                          'flex-1 bg-white dark:bg-slate-900 flex-row items-center justify-center py-2.5 rounded-lg border border-slate-200 dark:border-slate-700'
                        )}
                      >
                        <Stethoscope color={twInstance.color('text-blue-500')} size={15} />
                        <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>
                          {t('mobile.clinical_notes')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        onPress={() => {
                          setActivePatientData(patient);
                          setProgramRulePreviewVisible(true);
                        }}
                        style={tw(
                          'flex-1 bg-white dark:bg-slate-900 flex-row items-center justify-center py-2.5 rounded-lg border border-slate-200 dark:border-slate-700'
                        )}
                      >
                        <FileCode2 color={twInstance.color('text-amber-500')} size={15} />
                        <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>
                          {t('mobile.active_rule_preview')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={!patient.latestMetricId}
                        onPress={() => {
                          setActivePatientData(patient);
                          setVoidDataVisible(true);
                        }}
                        style={tw(
                          `px-3 bg-red-50 dark:bg-red-900/10 flex-row items-center justify-center py-2.5 rounded-lg border border-red-100 dark:border-red-900/30 ${
                            !patient.latestMetricId ? 'opacity-40' : ''
                          }`
                        )}
                      >
                        <Trash2 color={twInstance.color('text-red-500')} size={15} />
                      </TouchableOpacity>
                    </View>
                  </View>
                )}

                <TouchableOpacity
                  onPress={() => {
                    setActivePatientData(patient);
                    setPatientProfileVisible(true);
                  }}
                  style={tw('flex-row justify-between items-center px-2')}
                >
                  <Text style={tw('text-sm font-bold text-brand-dark dark:text-brand-light')}>
                    {t('mobile.view_full_profile')}
                  </Text>
                  <ChevronRight
                    color={twInstance.color('text-brand-dark dark:text-brand-light')}
                    size={20}
                  />
                </TouchableOpacity>
              </View>
            ))}

            {hasMore && (
              <TouchableOpacity
                disabled={loadingMore}
                onPress={() => void loadPatients(page + 1, true)}
                style={tw(
                  'py-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center flex-row'
                )}
              >
                {loadingMore && (
                  <ActivityIndicator size="small" color="#3b82f6" style={tw('mr-2')} />
                )}
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                  {t('mobile.load_more')}
                </Text>
              </TouchableOpacity>
            )}
          </>
        ) : (
          <View style={tw('items-center justify-center py-20')}>
            <View
              style={tw(
                'w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4'
              )}
            >
              <UserPlus color={twInstance.color('text-slate-400')} size={32} />
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-2')}>
              {t('mobile.no_patients_found')}
            </Text>
            <Text style={tw('text-slate-500 text-center px-6')}>
              {t('mobile.try_different_search_patients')}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Enroll Modal using Real Published Care Programs */}
      <Modal
        visible={enrollModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isEnrolling && setEnrollModalVisible(false)}
      >
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[82%]')}>
            <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-1')}>
              {t('mobile.enroll_in_program')}
            </Text>
            <Text style={tw('text-slate-500 text-sm mb-4')}>
              {t('mobile.select_program_for')} {selectedPatient?.name}
            </Text>

            <ScrollView showsVerticalScrollIndicator={false} style={tw('max-h-72 mb-4')}>
              {publishedPrograms.map((prog) => {
                const active = selectedProgramId === prog.id;
                return (
                  <TouchableOpacity
                    key={prog.id}
                    disabled={isEnrolling}
                    onPress={() => setSelectedProgramId(prog.id)}
                    style={tw(
                      `p-4 rounded-2xl mb-3 border ${
                        active
                          ? 'bg-brand/10 border-brand'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `font-bold text-base ${
                          active
                            ? 'text-brand-dark dark:text-brand-light'
                            : 'text-slate-900 dark:text-white'
                        }`
                      )}
                    >
                      {prog.name}
                    </Text>
                    {prog.description ? (
                      <Text style={tw('text-xs text-slate-500 mt-1')} numberOfLines={2}>
                        {prog.description}
                      </Text>
                    ) : null}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>

            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity
                disabled={isEnrolling}
                onPress={() => setEnrollModalVisible(false)}
                style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
              >
                <Text style={tw('font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isEnrolling || !selectedProgramId}
                onPress={() => void confirmEnroll()}
                style={tw(
                  `flex-1 bg-brand py-3.5 rounded-xl items-center flex-row justify-center ${
                    isEnrolling || !selectedProgramId ? 'opacity-60' : ''
                  }`
                )}
              >
                {isEnrolling && (
                  <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />
                )}
                <Text style={tw('font-bold text-slate-900')}>{t('mobile.enroll')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Lifecycle Transition Modal */}
      <Modal
        visible={lifecycleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isSubmittingLifecycle && setLifecycleModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800'
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.manage_enrollment_title')}
                </Text>
                <Text style={tw('text-xs text-slate-500 mt-0.5')}>
                  {activePatientData?.name} • {activePatientData?.programName}
                </Text>
              </View>
              <TouchableOpacity
                disabled={isSubmittingLifecycle}
                onPress={() => setLifecycleModalVisible(false)}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-500')} size={20} />
              </TouchableOpacity>
            </View>

            <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
              {(
                [
                  { id: 'pause', label: t('mobile.pause_program') },
                  { id: 'resume', label: t('mobile.resume_program') },
                  { id: 'complete', label: t('mobile.complete_program') },
                  { id: 'cancel', label: t('mobile.cancel_program') },
                ] as const
              ).map((act) => (
                <TouchableOpacity
                  key={act.id}
                  disabled={isSubmittingLifecycle}
                  onPress={() => setLifecycleAction(act.id)}
                  style={tw(
                    `px-3.5 py-2 rounded-xl border ${
                      lifecycleAction === act.id
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`
                  )}
                >
                  <Text
                    style={tw(
                      `text-xs font-bold ${
                        lifecycleAction === act.id ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                      }`
                    )}
                  >
                    {act.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-1.5')}>
              {t('mobile.lifecycle_reason_label')}
            </Text>
            <TextInput
              value={lifecycleReason}
              onChangeText={setLifecycleReason}
              editable={!isSubmittingLifecycle}
              placeholder={t('mobile.lifecycle_reason_placeholder')}
              placeholderTextColor="#94a3b8"
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white h-24 mb-4'
              )}
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={() => void handleLifecycleSubmit()}
              disabled={isSubmittingLifecycle}
              style={tw(
                `bg-brand py-4 rounded-xl items-center flex-row justify-center ${
                  isSubmittingLifecycle ? 'opacity-60' : ''
                }`
              )}
            >
              {isSubmittingLifecycle && (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />
              )}
              <Text style={tw('text-slate-900 font-bold text-base')}>
                {t('mobile.confirm_lifecycle_change')}
              </Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modals wired to real IDs */}
      <AiSummaryModal
        visible={aiSummaryVisible}
        onClose={() => setAiSummaryVisible(false)}
        enrollmentId={activePatientData?.enrollmentId}
        audience="doctor"
        patientName={activePatientData?.name}
        programName={activePatientData?.programName}
        baseline={activePatientData?.baseline}
        current={activePatientData?.current}
        adherence={activePatientData?.adherence}
      />

      <ClinicalNotesModal
        visible={clinicalNotesVisible}
        onClose={() => setClinicalNotesVisible(false)}
        patientId={activePatientData?.patientId}
        patientName={activePatientData?.name}
        onSaved={() => void loadPatients(1, false)}
      />

      <ProgramRulePreviewModal
        visible={programRulePreviewVisible}
        onClose={() => setProgramRulePreviewVisible(false)}
        programId={activePatientData?.programId}
        programName={activePatientData?.programName}
      />

      <DoctorReviewTaskModal
        visible={doctorReviewTaskVisible}
        onClose={() => setDoctorReviewTaskVisible(false)}
        taskId={activePatientData?.pendingReviewTaskId}
        enrollmentId={activePatientData?.enrollmentId}
        patientName={activePatientData?.name}
        programName={activePatientData?.programName}
        onSubmitReview={() => void loadPatients(1, false)}
      />

      <VoidDataModal
        visible={voidDataVisible}
        onClose={() => setVoidDataVisible(false)}
        metricId={activePatientData?.latestMetricId}
        patientName={activePatientData?.name}
        metricLabel={
          activePatientData ? `${t('mobile.current')}: ${activePatientData.current}` : undefined
        }
        onVoidConfirm={async (_reasonCode, note) => {
          if (!activePatientData?.latestMetricId) return;
          await mobileApi.healthMetricsVoid({
            params: { id: activePatientData.latestMetricId },
            body: { reason: note.trim() || t('mobile.clinician_voided') },
          });
          await loadPatients(1, false);
        }}
      />

      <PatientProfileModal
        visible={patientProfileVisible}
        onClose={() => setPatientProfileVisible(false)}
        patient={
          activePatientData
            ? {
                id: activePatientData.patientId,
                patientId: activePatientData.patientId,
                enrollmentId: activePatientData.enrollmentId,
                name: activePatientData.name,
                program: activePatientData.programName,
                status: activePatientData.enrollmentStatus,
                baseline: activePatientData.baseline,
                current: activePatientData.current,
                adherence: activePatientData.adherence,
              }
            : null
        }
      />

      <CareAlertsModal
        visible={careAlertsVisible}
        onClose={() => setCareAlertsVisible(false)}
        patientId={activePatientData?.patientId}
        enrollmentId={activePatientData?.enrollmentId}
        patientName={activePatientData?.name}
        onChanged={() => void loadPatients(1, false)}
      />
    </SafeAreaView>
  );
}
