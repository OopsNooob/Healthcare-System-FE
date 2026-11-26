import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Droplet,
  HeartPulse,
  RefreshCw,
  Shield,
  Sparkles,
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

interface BaselineFieldSchema {
  key: string;
  type: 'number' | 'integer' | 'boolean' | 'string' | 'date';
  unit?: string;
  range?: { min?: number; max?: number };
  required: boolean;
}

const STANDARD_FIELDS_BY_DISEASE: Record<string, BaselineFieldSchema[]> = {
  hypertension: [
    {
      key: 'usual_systolic',
      type: 'number',
      unit: 'mmHg',
      range: { min: 50, max: 300 },
      required: true,
    },
    {
      key: 'usual_diastolic',
      type: 'number',
      unit: 'mmHg',
      range: { min: 30, max: 200 },
      required: true,
    },
  ],
  diabetes: [
    {
      key: 'usual_fasting_glucose',
      type: 'number',
      unit: 'mg/dL',
      range: { min: 20, max: 600 },
      required: true,
    },
  ],
};

function parseSchemaFields(
  programDetail: FeTypes.CareProgramRuleGetProgramResponse | null,
  enrollmentDetail: FeTypes.CareEnrollmentDetailResponse
): BaselineFieldSchema[] {
  const enrollmentBaselineForm = (
    enrollmentDetail as unknown as {
      baselineForm?: { schemaVersion?: string; fields?: Array<Record<string, unknown>> };
    }
  )?.baselineForm;
  const rawForm =
    enrollmentBaselineForm ??
    (programDetail?.baselineForm as
      | { schemaVersion?: string; fields?: Array<Record<string, unknown>> }
      | undefined);
  if (rawForm && Array.isArray(rawForm.fields) && rawForm.fields.length > 0) {
    return rawForm.fields.map((f) => ({
      key: String(f.key ?? ''),
      type: (f.type as BaselineFieldSchema['type']) ?? 'number',
      unit: typeof f.unit === 'string' ? f.unit : undefined,
      range:
        f.range && typeof f.range === 'object'
          ? {
              min: typeof (f.range as Record<string, unknown>).min === 'number'
                ? ((f.range as Record<string, unknown>).min as number)
                : undefined,
              max: typeof (f.range as Record<string, unknown>).max === 'number'
                ? ((f.range as Record<string, unknown>).max as number)
                : undefined,
            }
          : undefined,
      required: Boolean(f.required),
    }));
  }

  const diseaseKey = enrollmentDetail.program.diseaseKey?.toLowerCase() ?? '';
  const code = enrollmentDetail.program.programCode?.toLowerCase() ?? '';
  if (diseaseKey.includes('diabetes') || code.includes('diabetes')) {
    return STANDARD_FIELDS_BY_DISEASE.diabetes;
  }
  return STANDARD_FIELDS_BY_DISEASE.hypertension;
}

export default function BaselineAssessmentScreen() {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ enrollmentId?: string }>();

  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [enrollment, setEnrollment] = useState<FeTypes.CareEnrollmentDetailResponse | null>(null);
  const [programDetail, setProgramDetail] = useState<FeTypes.CareProgramRuleGetProgramResponse | null>(null);
  const [fields, setFields] = useState<BaselineFieldSchema[]>(STANDARD_FIELDS_BY_DISEASE.hypertension);
  const [answersText, setAnswersText] = useState<Record<string, string>>({});
  const [answersBool, setAnswersBool] = useState<Record<string, boolean>>({});

  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [hasAgreedConsent, setHasAgreedConsent] = useState(false);
  const [isConsentAlreadyAccepted, setIsConsentAlreadyAccepted] = useState(false);

  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  const [isSubmittingConsent, setIsSubmittingConsent] = useState(false);
  const [isActivating, setIsActivating] = useState(false);
  const [activationStatus, setActivationStatus] = useState<string>('active');

  const loadData = useCallback(async (isRefresh = false) => {
    if (!isRefresh) setIsLoading(true);
    setLoadError(null);
    try {
      let targetId = typeof params.enrollmentId === 'string' && params.enrollmentId ? params.enrollmentId : '';
      if (!targetId) {
        const listRes = await mobileApi.careEnrollmentList({
          query: { limit: 20, sortBy: 'updatedAt', sortOrder: -1 },
        });
        const { items } = normalizePaginatedList<Record<string, unknown>>(listRes);
        const preferred =
          items.find((item) => item.status === 'pending') ??
          items.find((item) => item.status === 'active') ??
          items[0];
        targetId = preferred ? String(preferred.id ?? preferred._id ?? '') : '';
      }

      if (!targetId) {
        setEnrollment(null);
        setProgramDetail(null);
        return;
      }

      const detail = await mobileApi.careEnrollmentDetail({ params: { id: targetId } });
      setEnrollment(detail);
      setActivationStatus(detail.status);

      let prog: FeTypes.CareProgramRuleGetProgramResponse | null = null;
      if (detail.program?.id) {
        try {
          prog = await mobileApi.careProgramRuleGetProgram({ params: { id: detail.program.id } });
          setProgramDetail(prog);
        } catch {
          setProgramDetail(null);
        }
      }

      const parsedFields = parseSchemaFields(prog, detail);
      setFields(parsedFields);

      const existingAnswers = (detail.baseline?.answers ?? {}) as Record<string, unknown>;
      const nextText: Record<string, string> = {};
      const nextBool: Record<string, boolean> = {};
      for (const f of parsedFields) {
        const existingVal = existingAnswers[f.key];
        if (f.type === 'boolean') {
          nextBool[f.key] = Boolean(existingVal);
        } else {
          nextText[f.key] = existingVal !== undefined && existingVal !== null ? String(existingVal) : '';
        }
      }
      setAnswersText(nextText);
      setAnswersBool(nextBool);

      const consentAccepted = Boolean(
        (detail.consent as Record<string, unknown> | undefined)?.acceptedAt
      );
      setIsConsentAlreadyAccepted(consentAccepted);
      setHasAgreedConsent(consentAccepted);

      if (detail.status === 'active' || (consentAccepted && detail.baseline?.completedAt)) {
        setCurrentStep(4);
      } else if (consentAccepted && detail.allowedActions?.includes('submit_baseline')) {
        setCurrentStep(2);
      } else {
        setCurrentStep(1);
      }
    } catch (err) {
      setLoadError(extractApiErrorMessage(err, 'mobile.load_enrollment_failed'));
    } finally {
      setIsLoading(false);
      setRefreshing(false);
    }
  }, [params.enrollmentId]);

  useEffect(() => {
    void loadData(false);
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadData(true);
  }, [loadData]);

  const getFieldLabel = (key: string): string => {
    switch (key) {
      case 'usual_systolic':
        return t('mobile.bp_systolic_label', 'Usual Systolic Blood Pressure');
      case 'usual_diastolic':
        return t('mobile.bp_diastolic_label', 'Usual Diastolic Blood Pressure');
      case 'usual_fasting_glucose':
        return t('mobile.glucose_label', 'Usual Fasting Blood Glucose');
      case 'current_medications':
        return t('mobile.current_medications_label', 'Current Medications');
      default:
        return t(`mobile.baseline_field_${key}`, key.replace(/_/g, ' '));
    }
  };

  const getFieldIcon = (key: string) => {
    if (key.includes('systolic') || key.includes('diastolic') || key.includes('bp')) {
      return <HeartPulse size={16} color={twInstance.color('text-rose-500')} />;
    }
    if (key.includes('glucose') || key.includes('sugar')) {
      return <Droplet size={16} color={twInstance.color('text-amber-500')} />;
    }
    return <Activity size={16} color={twInstance.color('text-indigo-500')} />;
  };

  const handleNextStep1 = async () => {
    if (!enrollment || isSubmittingConsent) return;
    if (!hasAgreedConsent) {
      Toast.show({
        type: 'error',
        text1: t('mobile.validation_error', 'Consent Required'),
        text2: t('mobile.consent_required_msg', 'Please accept all monitoring terms to continue.'),
      });
      return;
    }

    if (isConsentAlreadyAccepted && !enrollment.allowedActions?.includes('submit_consent')) {
      setCurrentStep(2);
      return;
    }

    setIsSubmittingConsent(true);
    try {
      const reviewPolicy = (programDetail?.reviewPolicy ?? {}) as Record<string, unknown>;
      const consentRecord = (enrollment.consent ?? {}) as Record<string, unknown>;
      const policyVersion =
        typeof consentRecord.policyVersion === 'string' && consentRecord.policyVersion
          ? consentRecord.policyVersion
          : typeof reviewPolicy.consentPolicyVersion === 'string' && reviewPolicy.consentPolicyVersion
            ? reviewPolicy.consentPolicyVersion
            : 'v1';

      const updated = await mobileApi.careEnrollmentConsent({
        params: { id: enrollment.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('care-consent') },
        body: {
          policyVersion,
          purposes: ['remote_monitoring', 'clinical_alerts', 'care_coordination'],
        },
      });
      setIsConsentAlreadyAccepted(true);
      setActivationStatus(updated.status);
      setCurrentStep(2);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.consent_submit_failed'),
      });
    } finally {
      setIsSubmittingConsent(false);
    }
  };

  const buildValidatedAnswers = (): Record<string, unknown> | null => {
    const out: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.type === 'boolean') {
        out[f.key] = Boolean(answersBool[f.key]);
        continue;
      }

      const raw = (answersText[f.key] ?? '').trim();
      if (!raw) {
        if (f.required) {
          Toast.show({
            type: 'error',
            text1: t('mobile.validation_error', 'Missing Information'),
            text2: t('mobile.baseline_field_required', {
              field: getFieldLabel(f.key),
              defaultValue: `Please enter ${getFieldLabel(f.key)}`,
            }),
          });
          return null;
        }
        continue;
      }

      if (f.type === 'number' || f.type === 'integer') {
        const num = Number(raw);
        if (!Number.isFinite(num) || (f.type === 'integer' && !Number.isInteger(num))) {
          Toast.show({
            type: 'error',
            text1: t('mobile.validation_error', 'Invalid Value'),
            text2: t('mobile.baseline_field_invalid_number', {
              field: getFieldLabel(f.key),
              defaultValue: `${getFieldLabel(f.key)} must be a valid number.`,
            }),
          });
          return null;
        }
        if (f.range) {
          if (
            (f.range.min !== undefined && num < f.range.min) ||
            (f.range.max !== undefined && num > f.range.max)
          ) {
            Toast.show({
              type: 'error',
              text1: t('mobile.validation_error', 'Out of Range'),
              text2: t('mobile.baseline_field_out_of_range', {
                field: getFieldLabel(f.key),
                min: f.range.min ?? '',
                max: f.range.max ?? '',
                defaultValue: `${getFieldLabel(f.key)} must be between ${f.range.min ?? ''} and ${f.range.max ?? ''}.`,
              }),
            });
            return null;
          }
        }
        out[f.key] = num;
      } else {
        out[f.key] = raw;
      }
    }
    return out;
  };

  const handleNextStep2 = () => {
    const validated = buildValidatedAnswers();
    if (!validated) return;
    setCurrentStep(3);
  };

  const handleActivateProgram = async () => {
    if (!enrollment || isActivating) return;
    const answers = buildValidatedAnswers();
    if (!answers) return;

    const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
    if (!timeRegex.test(quietStart.trim()) || !timeRegex.test(quietEnd.trim())) {
      Toast.show({
        type: 'error',
        text1: t('mobile.validation_error', 'Invalid Time Format'),
        text2: t('mobile.quiet_hours_format_err', 'Please use HH:MM format (e.g. 22:00).'),
      });
      return;
    }

    setIsActivating(true);
    try {
      const updated = await mobileApi.careEnrollmentBaseline({
        params: { id: enrollment.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('care-baseline') },
        body: { answers },
      });
      setActivationStatus(updated.status);
      setCurrentStep(4);
      Toast.show({
        type: 'success',
        text1: t('mobile.activation_success_title', 'Program Activated Successfully!'),
        text2: t('mobile.activation_success_desc', 'Your chronic care monitoring program is now active.'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.baseline_submit_failed'),
      });
    } finally {
      setIsActivating(false);
    }
  };

  const nextTaskInfo = (enrollment?.taskSummary as Record<string, unknown> | undefined)?.next as
    | { scheduledFor?: string; taskType?: string }
    | null
    | undefined;
  const formattedNextTaskTime = nextTaskInfo?.scheduledFor
    ? new Date(nextTaskInfo.scheduledFor).toLocaleString(
        t('mobile.date_locale', 'vi-VN'),
        { month: 'short', day: '2-digit', hour: '2-digit', minute: '2-digit' }
      )
    : t('mobile.scheduled_daily_tasks', 'Scheduled per care plan');

  const firstBaselineSummary = fields
    .map((f) => {
      const val = f.type === 'boolean' ? String(Boolean(answersBool[f.key])) : answersText[f.key];
      return val ? `${val}${f.unit ? ` ${f.unit}` : ''}` : null;
    })
    .filter(Boolean)
    .join(' / ');

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      <KeyboardAvoidingView
        style={tw('flex-1')}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={tw('flex-row items-center justify-between px-5 py-4 border-b border-slate-200/60 dark:border-slate-800/60 bg-white dark:bg-slate-900')}>
          <TouchableOpacity
            onPress={() => router.back('/(patient)')}
            style={tw('w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center')}
          >
            <ArrowLeft size={20} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
          </TouchableOpacity>
          <Text style={tw('text-lg font-bold text-slate-900 dark:text-slate-100')}>
            {t('mobile.baseline_setup_title', 'Program Activation')}
          </Text>
          <View style={tw('w-10')} />
        </View>

        {enrollment && currentStep < 4 && !isLoading && !loadError && (
          <View style={tw('px-8 pt-5 pb-3 items-center')}>
            <View style={tw('w-full max-w-[300px] flex-row items-center justify-between mb-2')}>
              {[1, 2, 3].map((step) => (
                <View
                  key={step}
                  style={tw(step < 3 ? 'flex-1 flex-row items-center' : 'flex-row items-center')}
                >
                  <View
                    style={tw(`w-8 h-8 rounded-full items-center justify-center border-2 ${
                      currentStep === step
                        ? 'bg-indigo-600 border-indigo-600'
                        : currentStep > step
                          ? 'bg-emerald-500 border-emerald-500'
                          : 'bg-slate-200 dark:bg-slate-800 border-slate-300 dark:border-slate-700'
                    }`)}
                  >
                    {currentStep > step ? (
                      <Check size={16} color="#ffffff" />
                    ) : (
                      <Text
                        style={tw(`text-xs font-bold ${
                          currentStep === step ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                        }`)}
                      >
                        {step}
                      </Text>
                    )}
                  </View>
                  {step < 3 && (
                    <View
                      style={tw(`flex-1 h-1 mx-2 rounded-full ${
                        currentStep > step ? 'bg-emerald-500' : 'bg-slate-200 dark:bg-slate-800'
                      }`)}
                    />
                  )}
                </View>
              ))}
            </View>
          </View>
        )}

        {isLoading ? (
          <View style={tw('p-5 gap-4')}>
            <Skeleton className="h-8 w-48 rounded-lg" />
            <Skeleton className="h-40 w-full rounded-3xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
            <Skeleton className="h-14 w-full rounded-2xl" />
          </View>
        ) : loadError ? (
          <View style={tw('flex-1 justify-center items-center px-6 gap-4')}>
            <AlertCircle color="#ef4444" size={40} />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white text-center')}>
              {loadError}
            </Text>
            <TouchableOpacity
              onPress={() => void loadData(false)}
              style={tw('px-5 py-3 rounded-2xl bg-indigo-600 flex-row items-center')}
            >
              <RefreshCw color="#ffffff" size={16} style={tw('mr-2')} />
              <Text style={tw('text-white font-bold text-sm')}>
                {t('mobile.retry', 'Retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : !enrollment ? (
          <ScrollView
            contentContainerStyle={tw('flex-1 justify-center items-center px-6 py-12 gap-4')}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            <View style={tw('w-16 h-16 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center')}>
              <Shield size={32} color={twInstance.color('text-slate-400')} />
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {t('mobile.no_care_enrollment_title', 'No Care Program Enrollment')}
            </Text>
            <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center max-w-[300px]')}>
              {t(
                'mobile.no_care_enrollment_desc',
                'Your doctor has not assigned an active or pending chronic care program enrollment yet.'
              )}
            </Text>
            <TouchableOpacity
              onPress={() => router.back('/(patient)')}
              style={tw('px-6 py-3.5 rounded-2xl bg-indigo-600')}
            >
              <Text style={tw('text-white font-bold text-sm')}>
                {t('mobile.back_to_home', 'Back to Home')}
              </Text>
            </TouchableOpacity>
          </ScrollView>
        ) : (
          <ScrollView
            style={tw('flex-1')}
            contentContainerStyle={tw('p-5 pb-12')}
            keyboardShouldPersistTaps="handled"
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          >
            {currentStep < 4 && (
              <View style={tw('mb-5')}>
                <Text style={tw('text-xs font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400')}>
                  {currentStep === 1 && t('mobile.step_1_consent', '1. Program Consent')}
                  {currentStep === 2 && t('mobile.step_2_vitals', '2. Baseline Vitals')}
                  {currentStep === 3 && t('mobile.step_3_quiet_hours', '3. Quiet Hours & Activation')}
                </Text>
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-slate-100 mt-1')}>
                  {currentStep === 1 && t('mobile.step_1_consent_desc', 'Please review and agree to terms for remote chronic care monitoring.')}
                  {currentStep === 2 && t('mobile.step_2_vitals_desc', 'Enter your most recent clinical metrics to calibrate safety thresholds.')}
                  {currentStep === 3 && t('mobile.step_3_quiet_hours_desc', 'Set quiet hours when non-urgent reminder notifications will be muted.')}
                </Text>
              </View>
            )}

            {currentStep === 1 && (
              <View style={tw('gap-4')}>
                <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm')}>
                  <View style={tw('flex-row items-center gap-3 mb-4')}>
                    <View style={tw('w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center')}>
                      <Shield size={22} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-base font-bold text-slate-900 dark:text-slate-100')}>
                        {enrollment.program.name}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {enrollment.assignedDoctor?.fullName
                          ? `${enrollment.assignedDoctor.fullName} • ${enrollment.timezone}`
                          : enrollment.timezone}
                      </Text>
                    </View>
                  </View>

                  <View style={tw('mb-2')}>
                    <View style={tw('flex-row items-start gap-3')}>
                      <View style={tw('w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mt-0.5')}>
                        <Check size={14} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
                      </View>
                      <Text style={tw('flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed')}>
                        {t('mobile.consent_item_1', 'I agree to share daily health readings with my assigned clinical team.')}
                      </Text>
                    </View>

                    <View style={tw('flex-row items-start gap-3 mt-3')}>
                      <View style={tw('w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mt-0.5')}>
                        <Check size={14} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
                      </View>
                      <Text style={tw('flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed')}>
                        {t('mobile.consent_item_2', 'I understand automated monitoring assists care delivery and does not replace emergency services.')}
                      </Text>
                    </View>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.8}
                  disabled={isSubmittingConsent || isConsentAlreadyAccepted}
                  onPress={() => setHasAgreedConsent(!hasAgreedConsent)}
                  style={tw(`flex-row items-center p-4 rounded-2xl border ${
                    hasAgreedConsent
                      ? 'bg-indigo-50/70 dark:bg-indigo-950/40 border-indigo-400 dark:border-indigo-600'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                  }`)}
                >
                  <View
                    style={tw(`w-6 h-6 rounded-lg items-center justify-center mr-3.5 border ${
                      hasAgreedConsent
                        ? 'bg-indigo-600 border-indigo-600'
                        : 'border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800'
                    }`)}
                  >
                    {hasAgreedConsent && <Check size={16} color="#ffffff" />}
                  </View>
                  <Text style={tw('flex-1 text-sm font-medium text-slate-800 dark:text-slate-200 leading-snug')}>
                    {t('mobile.consent_agree_check', 'I have read, understood, and agree to enroll in this care program.')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  activeOpacity={0.85}
                  disabled={isSubmittingConsent}
                  onPress={() => void handleNextStep1()}
                  style={tw(`mt-6 bg-indigo-600 py-4 rounded-2xl flex-row items-center justify-center shadow-md ${
                    isSubmittingConsent ? 'opacity-60' : ''
                  }`)}
                >
                  {isSubmittingConsent ? (
                    <ActivityIndicator color="#ffffff" size="small" style={tw('mr-2')} />
                  ) : null}
                  <Text style={tw('text-white font-bold text-base mr-2')}>
                    {t('mobile.btn_next', 'Next')}
                  </Text>
                  <ChevronRight size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {currentStep === 2 && (
              <View style={tw('gap-4')}>
                <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm gap-4')}>
                  {fields.map((field) => (
                    <View key={field.key}>
                      <View style={tw('flex-row items-center justify-between mb-1.5')}>
                        <View style={tw('flex-row items-center gap-2 flex-1')}>
                          {getFieldIcon(field.key)}
                          <Text style={tw('text-sm font-semibold text-slate-800 dark:text-slate-200')}>
                            {getFieldLabel(field.key)}
                            {field.unit ? ` (${field.unit})` : ''}
                            {field.required ? ' *' : ''}
                          </Text>
                        </View>
                        {field.range && (
                          <Text style={tw('text-xs text-slate-400 dark:text-slate-500')}>
                            {field.range.min ?? ''}–{field.range.max ?? ''}
                          </Text>
                        )}
                      </View>

                      {field.type === 'boolean' ? (
                        <TouchableOpacity
                          onPress={() =>
                            setAnswersBool((prev) => ({ ...prev, [field.key]: !prev[field.key] }))
                          }
                          style={tw(`p-3.5 rounded-2xl border flex-row items-center justify-between ${
                            answersBool[field.key]
                              ? 'bg-indigo-50 dark:bg-indigo-950/30 border-indigo-400'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          }`)}
                        >
                          <Text style={tw('text-sm font-semibold text-slate-800 dark:text-slate-200')}>
                            {answersBool[field.key] ? t('mobile.yes', 'Yes') : t('mobile.no', 'No')}
                          </Text>
                          {answersBool[field.key] && (
                            <Check size={16} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
                          )}
                        </TouchableOpacity>
                      ) : (
                        <TextInput
                          value={answersText[field.key] ?? ''}
                          onChangeText={(txt) =>
                            setAnswersText((prev) => ({ ...prev, [field.key]: txt }))
                          }
                          keyboardType={
                            field.type === 'number' || field.type === 'integer'
                              ? 'decimal-pad'
                              : 'default'
                          }
                          placeholder={
                            field.range?.min !== undefined && field.range?.max !== undefined
                              ? `${field.range.min} - ${field.range.max}`
                              : t('mobile.enter_value', 'Enter value')
                          }
                          placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                          style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-bold text-base')}
                        />
                      )}
                    </View>
                  ))}
                </View>

                <View style={tw('flex-row gap-3 mt-4')}>
                  <TouchableOpacity
                    onPress={() => setCurrentStep(1)}
                    style={tw('flex-1 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-center justify-center')}
                  >
                    <Text style={tw('text-slate-700 dark:text-slate-300 font-semibold text-base')}>
                      {t('mobile.btn_back', 'Back')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleNextStep2}
                    style={tw('flex-1 py-4 rounded-2xl bg-indigo-600 items-center justify-center shadow-md')}
                  >
                    <Text style={tw('text-white font-bold text-base')}>
                      {t('mobile.btn_next', 'Next')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentStep === 3 && (
              <View style={tw('gap-4')}>
                <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm gap-4')}>
                  <View style={tw('flex-row items-center gap-2 mb-1')}>
                    <Clock size={18} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
                    <Text style={tw('text-base font-bold text-slate-900 dark:text-slate-100')}>
                      {t('mobile.step_3_quiet_hours', '3. Quiet Hours & Activation')}
                    </Text>
                  </View>

                  <View style={tw('flex-row gap-3')}>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1.5')}>
                        {t('mobile.quiet_hours_start', 'Quiet Hours Start')}
                      </Text>
                      <TextInput
                        value={quietStart}
                        onChangeText={setQuietStart}
                        placeholder="22:00"
                        placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                        style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-bold text-base text-center')}
                      />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1.5')}>
                        {t('mobile.quiet_hours_end', 'Quiet Hours End')}
                      </Text>
                      <TextInput
                        value={quietEnd}
                        onChangeText={setQuietEnd}
                        placeholder="07:00"
                        placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                        style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-bold text-base text-center')}
                      />
                    </View>
                  </View>

                  <View style={tw('flex-row gap-2 mt-1')}>
                    {[
                      { start: '22:00', end: '07:00' },
                      { start: '23:00', end: '06:00' },
                      { start: '21:30', end: '06:30' },
                    ].map((preset, idx) => (
                      <TouchableOpacity
                        key={idx}
                        onPress={() => {
                          setQuietStart(preset.start);
                          setQuietEnd(preset.end);
                        }}
                        style={tw(`px-3 py-1.5 rounded-full border ${
                          quietStart === preset.start && quietEnd === preset.end
                            ? 'bg-indigo-50 dark:bg-indigo-900/40 border-indigo-500'
                            : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        }`)}
                      >
                        <Text
                          style={tw(`text-xs font-medium ${
                            quietStart === preset.start && quietEnd === preset.end
                              ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                              : 'text-slate-600 dark:text-slate-400'
                          }`)}
                        >
                          {preset.start} - {preset.end}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View style={tw('bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/60 flex-row gap-3 items-start')}>
                  <AlertTriangle size={20} color={twInstance.color('text-amber-600 dark:text-amber-400')} style={tw('mt-0.5')} />
                  <Text style={tw('flex-1 text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium')}>
                    {t('mobile.emergency_notice', 'Note: Urgent critical health alerts will always be delivered immediately for patient safety.')}
                  </Text>
                </View>

                <View style={tw('flex-row items-center gap-3 mt-4')}>
                  <TouchableOpacity
                    onPress={() => setCurrentStep(2)}
                    disabled={isActivating}
                    style={tw('w-28 py-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 items-center justify-center shadow-sm')}
                  >
                    <Text style={tw('text-slate-700 dark:text-slate-300 font-semibold text-base')}>
                      {t('mobile.btn_back', 'Back')}
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => void handleActivateProgram()}
                    disabled={isActivating}
                    activeOpacity={0.85}
                    style={tw(`flex-1 py-4 px-3 rounded-2xl bg-emerald-600 dark:bg-emerald-500 items-center justify-center shadow-md overflow-hidden ${
                      isActivating ? 'opacity-60' : ''
                    }`)}
                  >
                    {isActivating ? (
                      <View style={tw('flex-row items-center justify-center')}>
                        <ActivityIndicator color="#ffffff" size="small" style={tw('mr-2')} />
                        <Text style={tw('text-white font-bold text-base')}>
                          {t('mobile.activating', 'Activating...')}
                        </Text>
                      </View>
                    ) : (
                      <View style={tw('flex-row items-center justify-center')}>
                        <Sparkles size={18} color="#ffffff" style={tw('mr-2 shrink-0')} />
                        <Text
                          numberOfLines={1}
                          ellipsizeMode="tail"
                          style={tw('text-white font-bold text-sm sm:text-base text-center')}
                        >
                          {t('mobile.activate_program_btn', 'Complete & Activate')}
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {currentStep === 4 && (
              <View style={tw('items-center justify-center pt-8 pb-6 gap-6')}>
                <View style={tw('w-24 h-24 rounded-full bg-emerald-100 dark:bg-emerald-950/60 items-center justify-center border-4 border-emerald-500/30')}>
                  <CheckCircle2 size={56} color={twInstance.color('text-emerald-500')} />
                </View>

                <View style={tw('items-center')}>
                  <Text style={tw('text-2xl font-extrabold text-slate-900 dark:text-slate-100 text-center mb-2')}>
                    {t('mobile.activation_success_title', 'Program Activated Successfully!')}
                  </Text>
                  <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center max-w-[300px] leading-relaxed')}>
                    {t('mobile.activation_success_desc', 'Your chronic care program is now active. You can now start completing your scheduled daily health tasks.')}
                  </Text>
                  <Text style={tw('text-xs text-indigo-600 dark:text-indigo-400 text-center max-w-[300px] mt-2 font-medium')}>
                    {t('mobile.activation_tasks_syncing_note')}
                  </Text>
                </View>

                <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm gap-3.5')}>
                  <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500')}>
                    {t('mobile.configuration_summary', 'Configuration Summary')}
                  </Text>

                  <View style={tw('flex-row justify-between items-start py-1 border-b border-slate-100 dark:border-slate-800 gap-2')}>
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-400 shrink-0')}>
                      {t('mobile.active_program', 'Active Program')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-slate-100 flex-1 text-right')}>
                      {enrollment.program.name}
                    </Text>
                  </View>

                  <View style={tw('flex-row justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800')}>
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-400')}>
                      {t('mobile.status', 'Status')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-emerald-600 dark:text-emerald-400 uppercase')}>
                      {t(`mobile.enrollment_status_${activationStatus}`, activationStatus)}
                    </Text>
                  </View>

                  {firstBaselineSummary ? (
                    <View style={tw('flex-row justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800')}>
                      <Text style={tw('text-sm text-slate-600 dark:text-slate-400')}>
                        {t('mobile.baseline_values', 'Baseline')}
                      </Text>
                      <Text style={tw('text-sm font-bold text-slate-900 dark:text-slate-100')}>
                        {firstBaselineSummary}
                      </Text>
                    </View>
                  ) : null}

                  <View style={tw('flex-row justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800')}>
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-400')}>
                      {t('mobile.step_3_quiet_hours', 'Quiet Hours')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-slate-100')}>
                      {quietStart} - {quietEnd}
                    </Text>
                  </View>

                  <View style={tw('flex-row justify-between items-center py-1')}>
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-400')}>
                      {t('mobile.task_scheduled', 'Next Task')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-indigo-600 dark:text-indigo-400')}>
                      {formattedNextTaskTime}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.replace('/(patient)')}
                  style={tw('w-full py-4 rounded-2xl bg-indigo-600 items-center justify-center shadow-md')}
                >
                  <Text style={tw('text-white font-bold text-base')}>
                    {t('mobile.back_to_home', 'Back to Home')}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </ScrollView>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}
