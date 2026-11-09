import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  RefreshControl,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Search,
  UserPlus,
  ChevronRight,
  BrainCircuit,
  Stethoscope,
  Trash2,
  CheckCircle,
  ShieldAlert,
  FileCode2,
  ClipboardCheck,
  RefreshCw,
  X,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import Toast from 'react-native-toast-message';
import {
  AiSummaryModal,
  ClinicalNotesModal,
  VoidDataModal,
  PatientProfileModal,
  DoctorReviewTaskModal,
  ProgramRulePreviewModal,
} from '@/components/modals';

interface PatientItem {
  id: number;
  name: string;
  program: string | null;
  enrollmentStatus: 'active' | 'paused' | 'completed' | 'cancelled' | 'pending_activation' | null;
  adherence: number | null;
  trend: string | null;
  baseline: string | null;
  current: string | null;
  lastDoctorReviewCode?: string;
  lastDoctorReviewWhenKey?: string;
}

export default function PatientsManagementScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const reviewLabel = (code?: string, whenKey?: string) => {
    if (!code) return '';
    const codeKeyMap: Record<string, string> = {
      reviewed_no_action: 'mobile.doc_rev_no_action',
      follow_up_needed: 'mobile.doc_rev_follow_up',
      consultation_recommended: 'mobile.doc_rev_consult_rec',
      care_plan_adjustment_needed: 'mobile.doc_rev_adjust_plan',
    };
    const label = codeKeyMap[code] ? t(codeKeyMap[code]) : code;
    const when = whenKey ? t(whenKey) : '';
    return when ? `${label} • ${when}` : label;
  };

  const localizeProgramName = (program?: string | null) => {
    if (!program) return '';
    if (program === 'Hypertension Management') return t('mobile.hypertension_management');
    if (program === 'Diabetes Care') return t('mobile.diabetes_care');
    return program;
  };

  const enrollmentStatusLabel = (status: PatientItem['enrollmentStatus']) => {
    if (!status) return '';
    const map: Record<NonNullable<PatientItem['enrollmentStatus']>, string> = {
      active: t('mobile.enrollment_status_active'),
      paused: t('mobile.enrollment_status_paused'),
      completed: t('mobile.enrollment_status_completed'),
      cancelled: t('mobile.enrollment_status_cancelled'),
      pending_activation: t('mobile.enroll_status_pending'),
    };
    return map[status] || status;
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);

  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [clinicalNotesVisible, setClinicalNotesVisible] = useState(false);
  const [programRulePreviewVisible, setProgramRulePreviewVisible] = useState(false);
  const [doctorReviewTaskVisible, setDoctorReviewTaskVisible] = useState(false);
  const [voidDataVisible, setVoidDataVisible] = useState(false);
  const [patientProfileVisible, setPatientProfileVisible] = useState(false);
  const [activePatientData, setActivePatientData] = useState<PatientItem | null>(null);

  const [lifecycleModalVisible, setLifecycleModalVisible] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<'pause' | 'resume' | 'complete' | 'cancel'>(
    'pause'
  );
  const [lifecycleReason, setLifecycleReason] = useState('');
  const [isSubmittingLifecycle, setIsSubmittingLifecycle] = useState(false);

  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [eligibilityStatus, setEligibilityStatus] = useState<
    'idle' | 'checking' | 'passed' | 'failed'
  >('idle');
  const [isSendingConsent, setIsSendingConsent] = useState(false);

  const [patients, setPatients] = useState<PatientItem[]>([
    {
      id: 1,
      name: 'Alex Johnson',
      program: 'Hypertension Management',
      enrollmentStatus: 'active',
      adherence: 85,
      trend: 'Stable',
      baseline: '150/95',
      current: '135/85',
      lastDoctorReviewCode: 'reviewed_no_action',
      lastDoctorReviewWhenKey: 'mobile.two_days_ago',
    },
    {
      id: 2,
      name: 'Maria Garcia',
      program: 'Diabetes Care',
      enrollmentStatus: 'active',
      adherence: 60,
      trend: 'Warning',
      baseline: '180 mg/dL',
      current: '210 mg/dL',
      lastDoctorReviewCode: 'follow_up_needed',
      lastDoctorReviewWhenKey: 'mobile.yesterday',
    },
    {
      id: 3,
      name: 'James Smith',
      program: null,
      enrollmentStatus: null,
      adherence: null,
      trend: null,
      baseline: null,
      current: null,
    },
  ]);

  const handleEnroll = (patient: PatientItem) => {
    setSelectedPatient(patient);
    setSelectedProgram(null);
    setEligibilityStatus('idle');
    setEnrollModalVisible(true);
  };

  const handleCheckEligibility = () => {
    setEligibilityStatus('checking');
    setTimeout(() => {
      setEligibilityStatus('passed');
    }, 600);
  };

  const handleSendConsent = async () => {
    if (isSendingConsent) return;
    setIsSendingConsent(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      setEnrollModalVisible(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.consent_sent'),
      });
    } finally {
      setIsSendingConsent(false);
    }
  };

  const handleLifecycleSubmit = async () => {
    if (!activePatientData || isSubmittingLifecycle) return;
    if (!lifecycleReason.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.reason_required'),
        text2: t('mobile.lifecycle_reason_desc'),
      });
      return;
    }

    setIsSubmittingLifecycle(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      const nextStatusMap: Record<typeof lifecycleAction, PatientItem['enrollmentStatus']> = {
        pause: 'paused',
        resume: 'active',
        complete: 'completed',
        cancel: 'cancelled',
      };

      setPatients((prev) =>
        prev.map((p) =>
          p.id === activePatientData.id
            ? { ...p, enrollmentStatus: nextStatusMap[lifecycleAction] }
            : p
        )
      );
      setLifecycleModalVisible(false);
      setLifecycleReason('');
      Toast.show({
        type: 'success',
        text1: t('mobile.enrollment_updated'),
        text2: `${activePatientData.name} • ${enrollmentStatusLabel(nextStatusMap[lifecycleAction])}`,
      });
    } finally {
      setIsSubmittingLifecycle(false);
    }
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 600);
  };

  const filteredPatients = patients.filter(
    (p) =>
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.id.toString().includes(searchQuery)
  );

  const renderSkeleton = () => (
    <View
      style={tw(
        'bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800'
      )}
    >
      <View style={tw('flex-row justify-between items-start mb-4')}>
        <View style={tw('flex-1')}>
          <View style={tw('w-1/2 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-1/3 h-6 bg-slate-200 dark:bg-slate-700 rounded-full mt-1')} />
        </View>
        <View style={tw('w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
      <View style={tw('w-full h-[1px] bg-slate-100 dark:bg-slate-800 mb-4')} />
      <View style={tw('w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded self-end')} />
    </View>
  );

  const renderEmptyState = () => (
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
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <View
        style={tw(
          'px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white mb-4')}>
          {t('mobile.patient_management')}
        </Text>
        <View
          style={tw(
            'flex-row items-center bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700'
          )}
        >
          <Search color={twInstance.color('text-slate-400')} size={20} style={tw('mr-2')} />
          <TextInput
            style={tw('flex-1 text-base text-slate-900 dark:text-white')}
            placeholder={t('mobile.search_patients')}
            placeholderTextColor={twInstance.color('text-slate-400')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
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
          <>
            {renderSkeleton()}
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <View
              key={patient.id}
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-row justify-between items-start mb-4')}>
                <View style={tw('flex-1 mr-3')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {patient.name}
                  </Text>
                  {patient.program ? (
                    <View style={tw('flex-row items-center flex-wrap gap-1.5 mt-2')}>
                      <View
                        style={tw(
                          'bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full self-start'
                        )}
                      >
                        <Text style={tw('text-xs font-bold text-indigo-600 dark:text-indigo-400')}>
                          {localizeProgramName(patient.program)}
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
                {!patient.program ? (
                  <TouchableOpacity
                    onPress={() => handleEnroll(patient)}
                    style={tw('flex-row items-center bg-brand px-3.5 py-2 rounded-xl shrink-0')}
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
                    <RefreshCw size={14} color={twInstance.color('text-slate-600 dark:text-slate-300')} />
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>
                      {t('mobile.status_label')}
                    </Text>
                  </TouchableOpacity>
                )}
              </View>

              {patient.program && (
                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800'
                  )}
                >
                  <View style={tw('flex-row justify-between mb-3')}>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>
                        {t('mobile.baseline')}
                      </Text>
                      <Text style={tw('font-bold text-slate-700 dark:text-slate-300')}>
                        {patient.baseline}
                      </Text>
                    </View>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>
                        {t('mobile.current')}
                      </Text>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>
                        {patient.current}
                      </Text>
                    </View>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>
                        {t('mobile.adherence')}
                      </Text>
                      <Text
                        style={tw(
                          `font-bold ${
                            patient.adherence! >= 80 ? 'text-emerald-500' : 'text-amber-500'
                          }`
                        )}
                      >
                        {patient.adherence}%
                      </Text>
                    </View>
                  </View>

                  {patient.lastDoctorReviewCode && (
                    <Text style={tw('text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mb-2')}>
                      {t('mobile.last_review_label')}:{' '}
                      {reviewLabel(patient.lastDoctorReviewCode, patient.lastDoctorReviewWhenKey)}
                    </Text>
                  )}

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

                  {/* Row 2 Actions: Clinical Notes + Active CareRule Preview + Void Data */}
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
                      onPress={() => {
                        setActivePatientData(patient);
                        setVoidDataVisible(true);
                      }}
                      style={tw(
                        'px-3 bg-red-50 dark:bg-red-900/10 flex-row items-center justify-center py-2.5 rounded-lg border border-red-100 dark:border-red-900/30'
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
          ))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Enroll Modal */}
      <Modal visible={enrollModalVisible} transparent={true} animationType="slide">
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-2')}>
              {t('mobile.enroll_in_program')}
            </Text>
            <Text style={tw('text-slate-500 mb-6')}>
              {t('mobile.select_program_for')} {selectedPatient?.name}
            </Text>

            <TouchableOpacity
              onPress={() => setSelectedProgram('hypertension')}
              style={tw(
                `p-4 rounded-2xl mb-3 border ${
                  selectedProgram === 'hypertension'
                    ? 'bg-brand/10 border-brand'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                }`
              )}
            >
              <Text
                style={tw(
                  `font-bold text-lg ${
                    selectedProgram === 'hypertension'
                      ? 'text-brand-dark dark:text-brand-light'
                      : 'text-slate-900 dark:text-white'
                  }`
                )}
              >
                {t('mobile.hypertension_management')}
              </Text>
              <Text style={tw('text-sm text-slate-500 mt-1')}>
                {t('mobile.hypertension_desc')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setSelectedProgram('diabetes')}
              style={tw(
                `p-4 rounded-2xl mb-6 border ${
                  selectedProgram === 'diabetes'
                    ? 'bg-brand/10 border-brand'
                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                }`
              )}
            >
              <Text
                style={tw(
                  `font-bold text-lg ${
                    selectedProgram === 'diabetes'
                      ? 'text-brand-dark dark:text-brand-light'
                      : 'text-slate-900 dark:text-white'
                  }`
                )}
              >
                {t('mobile.diabetes_care')}
              </Text>
              <Text style={tw('text-sm text-slate-500 mt-1')}>
                {t('mobile.diabetes_desc')}
              </Text>
            </TouchableOpacity>

            {/* Eligibility Status */}
            {selectedProgram && eligibilityStatus === 'passed' && (
              <View
                style={tw(
                  'flex-row items-center bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl mb-6'
                )}
              >
                <CheckCircle color="#10b981" size={20} style={tw('mr-2')} />
                <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold')}>
                  {t('mobile.eligibility_passed')}
                </Text>
              </View>
            )}

            {selectedProgram && eligibilityStatus === 'failed' && (
              <View
                style={tw(
                  'flex-row items-center bg-red-50 dark:bg-red-900/30 p-3 rounded-xl mb-6'
                )}
              >
                <ShieldAlert color="#ef4444" size={20} style={tw('mr-2')} />
                <Text style={tw('text-red-700 dark:text-red-400 font-bold')}>
                  {t('mobile.eligibility_failed')}
                </Text>
              </View>
            )}

            <View style={tw('flex-row gap-4')}>
              <TouchableOpacity
                onPress={() => setEnrollModalVisible(false)}
                disabled={isSendingConsent}
                style={tw('flex-1 p-4 items-center bg-slate-100 dark:bg-slate-800 rounded-2xl')}
              >
                <Text style={tw('font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.cancel')}
                </Text>
              </TouchableOpacity>

              {!selectedProgram ? (
                <TouchableOpacity
                  disabled
                  style={tw(
                    'flex-1 p-4 items-center bg-slate-200 dark:bg-slate-700 rounded-2xl opacity-50'
                  )}
                >
                  <Text style={tw('font-bold text-slate-400 dark:text-slate-500')}>
                    {t('mobile.check_eligibility')}
                  </Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'idle' ? (
                <TouchableOpacity
                  onPress={handleCheckEligibility}
                  style={tw('flex-1 p-4 items-center bg-blue-500 rounded-2xl')}
                >
                  <Text style={tw('font-bold text-white')}>
                    {t('mobile.check_eligibility')}
                  </Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'checking' ? (
                <TouchableOpacity
                  disabled
                  style={tw(
                    'flex-1 p-4 items-center bg-blue-500 rounded-2xl opacity-70 flex-row justify-center'
                  )}
                >
                  <ActivityIndicator color="white" size="small" style={tw('mr-2')} />
                  <Text style={tw('font-bold text-white')}>
                    {t('mobile.check_eligibility')}
                  </Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'passed' ? (
                <TouchableOpacity
                  onPress={handleSendConsent}
                  disabled={isSendingConsent}
                  style={tw(`flex-1 p-4 items-center bg-brand rounded-2xl ${isSendingConsent ? 'opacity-60' : ''}`)}
                >
                  <Text style={tw('font-bold text-slate-900')}>
                    {t('mobile.send_consent')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  disabled
                  style={tw(
                    'flex-1 p-4 items-center bg-slate-200 dark:bg-slate-700 rounded-2xl opacity-50'
                  )}
                >
                  <Text style={tw('font-bold text-slate-400 dark:text-slate-500')}>
                    {t('mobile.send_consent')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Enrollment Lifecycle Modal */}
      <Modal
        visible={lifecycleModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setLifecycleModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/50')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.enrollment_lifecycle_title')}
              </Text>
              <TouchableOpacity
                disabled={isSubmittingLifecycle}
                onPress={() => setLifecycleModalVisible(false)}
              >
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-3')}>
              {t('mobile.patient_label')}: <Text style={tw('font-bold')}>{activePatientData?.name}</Text> •{' '}
              {activePatientData?.program}
            </Text>

            <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
              {(
                [
                  { id: 'pause', label: t('mobile.program_pause') },
                  { id: 'resume', label: t('mobile.program_resume') },
                  { id: 'complete', label: t('mobile.program_complete') },
                  { id: 'cancel', label: t('mobile.program_cancel') },
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
                        lifecycleAction === act.id
                          ? 'text-white'
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
              onPress={handleLifecycleSubmit}
              disabled={isSubmittingLifecycle}
              style={tw(`bg-brand py-4 rounded-xl items-center flex-row justify-center ${isSubmittingLifecycle ? 'opacity-60' : ''}`)}
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

      {/* 1. AI Summary Modal */}
      <AiSummaryModal
        visible={aiSummaryVisible}
        onClose={() => setAiSummaryVisible(false)}
        patientName={activePatientData?.name}
        programName={localizeProgramName(activePatientData?.program) || undefined}
        baseline={activePatientData?.baseline || undefined}
        current={activePatientData?.current || undefined}
        adherence={activePatientData?.adherence || undefined}
      />

      {/* 2. Clinical Notes Modal */}
      <ClinicalNotesModal
        visible={clinicalNotesVisible}
        onClose={() => setClinicalNotesVisible(false)}
        patientName={activePatientData?.name}
      />

      {/* 3. Program Active Rule Preview & Activation Modal */}
      <ProgramRulePreviewModal
        visible={programRulePreviewVisible}
        onClose={() => setProgramRulePreviewVisible(false)}
        programName={localizeProgramName(activePatientData?.program) || t('mobile.hypertension_management')}
      />

      {/* 4. Doctor Review Task Modal */}
      <DoctorReviewTaskModal
        visible={doctorReviewTaskVisible}
        onClose={() => setDoctorReviewTaskVisible(false)}
        patientName={activePatientData?.name}
        programName={localizeProgramName(activePatientData?.program) || undefined}
        onSubmitReview={(payload) => {
          if (activePatientData) {
            setPatients((prev) =>
              prev.map((p) =>
                p.id === activePatientData.id
                  ? {
                      ...p,
                      lastDoctorReviewCode: payload.reasonCode,
                      lastDoctorReviewWhenKey: 'mobile.just_now',
                    }
                  : p
              )
            );
          }
          setDoctorReviewTaskVisible(false);
        }}
      />

      {/* 5. Void Data Modal */}
      <VoidDataModal
        visible={voidDataVisible}
        onClose={() => setVoidDataVisible(false)}
        patientName={activePatientData?.name}
        metricLabel={activePatientData ? `${t('mobile.current')}: ${activePatientData.current}` : undefined}
      />

      {/* 6. Patient Profile Modal */}
      <PatientProfileModal
        visible={patientProfileVisible}
        onClose={() => setPatientProfileVisible(false)}
        patient={activePatientData}
      />
    </SafeAreaView>
  );
}
