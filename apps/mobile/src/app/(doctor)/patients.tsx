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
  lastDoctorReview?: string;
}

export default function PatientsManagementScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';

  const reviewLabel = (raw?: string) => {
    if (!raw) return '';
    const m = raw.match(/^(\w+)\s*(?:\((.*)\))?$/);
    if (!m) return raw;
    const codes: Record<string, [string, string]> = {
      reviewed_no_action: ['Đã rà soát, không cần xử lý', 'Reviewed, no action needed'],
      follow_up_needed: ['Cần theo dõi thêm', 'Follow-up needed'],
      consultation_recommended: ['Đề nghị tư vấn', 'Consultation recommended'],
      care_plan_adjustment_needed: ['Cần điều chỉnh kế hoạch chăm sóc', 'Care plan adjustment needed'],
    };
    const whens: Record<string, string> = {
      '2 ngày trước': '2 days ago',
      'Hôm qua': 'Yesterday',
      'Vừa xong': 'Just now',
    };
    const label = codes[m[1]] ? (isVi ? codes[m[1]][0] : codes[m[1]][1]) : m[1];
    const when = m[2] ? (isVi ? m[2] : whens[m[2]] || m[2]) : '';
    return when ? `${label} (${when})` : label;
  };
  useThemeContext();

  const [searchQuery, setSearchQuery] = useState('');
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<PatientItem | null>(null);

  // Clinical Modals States
  const [aiSummaryVisible, setAiSummaryVisible] = useState(false);
  const [clinicalNotesVisible, setClinicalNotesVisible] = useState(false);
  const [programRulePreviewVisible, setProgramRulePreviewVisible] = useState(false);
  const [doctorReviewTaskVisible, setDoctorReviewTaskVisible] = useState(false);
  const [voidDataVisible, setVoidDataVisible] = useState(false);
  const [patientProfileVisible, setPatientProfileVisible] = useState(false);
  const [activePatientData, setActivePatientData] = useState<PatientItem | null>(null);

  // Enrollment Lifecycle Modal State (CARE-17)
  const [lifecycleModalVisible, setLifecycleModalVisible] = useState(false);
  const [lifecycleAction, setLifecycleAction] = useState<'pause' | 'resume' | 'complete' | 'cancel'>(
    'pause'
  );
  const [lifecycleReason, setLifecycleReason] = useState('');

  // Enroll Modal States
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [eligibilityStatus, setEligibilityStatus] = useState<
    'idle' | 'checking' | 'passed' | 'failed'
  >('idle');

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
      lastDoctorReview: 'reviewed_no_action (2 ngày trước)',
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
      lastDoctorReview: 'follow_up_needed (Hôm qua)',
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
    }, 1000);
  };

  const handleSendConsent = () => {
    setEnrollModalVisible(false);
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t(
        'mobile.consent_sent',
        'Đã tạo hồ sơ pending_activation. Chờ Bệnh nhân ký Consent và hoàn tất Baseline.'
      ),
    });
  };

  const handleLifecycleSubmit = () => {
    if (!activePatientData) return;
    if (!lifecycleReason.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.reason_required', 'Cần nhập lý do'),
        text2: t('mobile.lifecycle_reason_desc', 'Mọi thao tác đổi trạng thái đăng ký đều cần lý do để lưu nhật ký.'),
      });
      return;
    }

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
      text1: t('mobile.enrollment_updated', 'Đã cập nhật đăng ký chương trình'),
      text2: `${activePatientData.name} -> ${nextStatusMap[lifecycleAction]}`,
    });
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 800);
    return () => clearTimeout(timer);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
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
        {t('mobile.no_patients_found', 'No patients found')}
      </Text>
      <Text style={tw('text-slate-500 text-center px-6')}>
        {t('mobile.try_different_search_patients', 'Try adjusting your search by name or ID.')}
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
          {t('mobile.patient_management', 'Patient Management')}
        </Text>
        <View
          style={tw(
            'flex-row items-center bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700'
          )}
        >
          <Search color={twInstance.color('text-slate-400')} size={20} style={tw('mr-2')} />
          <TextInput
            style={tw('flex-1 text-base text-slate-900 dark:text-white')}
            placeholder={t('mobile.search_patients', 'Search by name or ID...')}
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
                          {patient.program}
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
                          {patient.enrollmentStatus}
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
                        {t('mobile.no_active_program', 'No Active Program')}
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
                      {t('mobile.enroll', 'Enroll')}
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
                      {isVi ? 'Trạng thái' : 'Status'}
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
                        {t('mobile.baseline', 'Baseline')}
                      </Text>
                      <Text style={tw('font-bold text-slate-700 dark:text-slate-300')}>
                        {patient.baseline}
                      </Text>
                    </View>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>
                        {t('mobile.current', 'Current')}
                      </Text>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>
                        {patient.current}
                      </Text>
                    </View>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>
                        {t('mobile.adherence', 'Adherence')}
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

                  {patient.lastDoctorReview && (
                    <Text style={tw('text-[11px] text-indigo-600 dark:text-indigo-400 font-semibold mb-2')}>
                      {isVi ? 'Rà soát gần nhất' : 'Last review'}: {reviewLabel(patient.lastDoctorReview)}
                    </Text>
                  )}

                  {/* Row 1 Actions: AI Summary + Doctor Review Task (CARE-35) */}
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
                        {t('mobile.ai_summary', 'AI Summary')}
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
                        {t('mobile.doctor_review_task', 'Rà soát')}
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Row 2 Actions: Clinical Notes + Active CareRule Preview (CARE-18/21) + Void Data */}
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
                        {t('mobile.clinical_notes', 'Notes')}
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
                        {t('mobile.active_rule_preview', 'Quy tắc')}
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
                  {t('mobile.view_full_profile', 'View Full Profile')}
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
              {t('mobile.enroll_in_program', 'Enroll in Care Program')}
            </Text>
            <Text style={tw('text-slate-500 mb-6')}>
              {t('mobile.select_program_for', 'Select a program for')} {selectedPatient?.name}
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
                {t('mobile.hypertension_management', 'Hypertension Management')}
              </Text>
              <Text style={tw('text-sm text-slate-500 mt-1')}>
                {t('mobile.hypertension_desc', 'BP tracking, medication reminders, diet tasks.')}
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
                {t('mobile.diabetes_care', 'Diabetes Care')}
              </Text>
              <Text style={tw('text-sm text-slate-500 mt-1')}>
                {t('mobile.diabetes_desc', 'Glucose tracking, insulin reminders, foot checks.')}
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
                  {t('mobile.eligibility_passed', 'Eligibility Passed (Gói CARE hợp lệ)')}
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
                  {t('mobile.eligibility_failed', 'Eligibility Failed')}
                </Text>
              </View>
            )}

            <View style={tw('flex-row gap-4')}>
              <TouchableOpacity
                onPress={() => setEnrollModalVisible(false)}
                style={tw('flex-1 p-4 items-center bg-slate-100 dark:bg-slate-800 rounded-2xl')}
              >
                <Text style={tw('font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.cancel', 'Cancel')}
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
                    {t('mobile.check_eligibility', 'Check Eligibility')}
                  </Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'idle' ? (
                <TouchableOpacity
                  onPress={handleCheckEligibility}
                  style={tw('flex-1 p-4 items-center bg-blue-500 rounded-2xl')}
                >
                  <Text style={tw('font-bold text-white')}>
                    {t('mobile.check_eligibility', 'Check Eligibility')}
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
                    {t('mobile.check_eligibility', 'Check Eligibility')}
                  </Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'passed' ? (
                <TouchableOpacity
                  onPress={handleSendConsent}
                  style={tw('flex-1 p-4 items-center bg-brand rounded-2xl')}
                >
                  <Text style={tw('font-bold text-slate-900')}>
                    {t('mobile.send_consent', 'Send Consent Request')}
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
                    {t('mobile.send_consent', 'Send Consent Request')}
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Enrollment Lifecycle Modal (CARE-17: Pause / Resume / Complete / Cancel) */}
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
                {t('mobile.enrollment_lifecycle_title', 'Trạng thái đăng ký chương trình')}
              </Text>
              <TouchableOpacity onPress={() => setLifecycleModalVisible(false)}>
                <X color="#64748b" size={24} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-3')}>
              {isVi ? 'Bệnh nhân' : 'Patient'}: <Text style={tw('font-bold')}>{activePatientData?.name}</Text> •{' '}
              {activePatientData?.program}
            </Text>

            <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
              {(
                [
                  { id: 'pause', label: isVi ? 'Tạm dừng' : 'Pause' },
                  { id: 'resume', label: isVi ? 'Tiếp tục' : 'Resume' },
                  { id: 'complete', label: isVi ? 'Hoàn thành' : 'Complete' },
                  { id: 'cancel', label: isVi ? 'Hủy chương trình' : 'Cancel program' },
                ] as const
              ).map((act) => (
                <TouchableOpacity
                  key={act.id}
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
              {t('mobile.lifecycle_reason_label', 'Lý do chuyển trạng thái (bắt buộc)')}
            </Text>
            <TextInput
              value={lifecycleReason}
              onChangeText={setLifecycleReason}
              placeholder={t('mobile.lifecycle_reason_placeholder', 'Nhập lý do lâm sàng hoặc hành chính để lưu nhật ký...'
              )}
              placeholderTextColor="#94a3b8"
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl p-3.5 text-slate-900 dark:text-white h-24 mb-4'
              )}
              textAlignVertical="top"
            />

            <TouchableOpacity
              onPress={handleLifecycleSubmit}
              style={tw('bg-brand py-4 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-900 font-bold text-base')}>
                {t('mobile.confirm_lifecycle_change', 'Xác nhận cập nhật trạng thái')}
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
        programName={activePatientData?.program || undefined}
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

      {/* 3. Program Active Rule Preview & Activation Modal (CARE-18, CARE-21) */}
      <ProgramRulePreviewModal
        visible={programRulePreviewVisible}
        onClose={() => setProgramRulePreviewVisible(false)}
        programName={activePatientData?.program || (isVi ? 'Quản lý tăng huyết áp' : 'Hypertension Management')}
      />

      {/* 4. Doctor Review Task Modal (CARE-35) */}
      <DoctorReviewTaskModal
        visible={doctorReviewTaskVisible}
        onClose={() => setDoctorReviewTaskVisible(false)}
        patientName={activePatientData?.name}
        programName={activePatientData?.program || undefined}
        onSubmitReview={(payload) => {
          if (activePatientData) {
            setPatients((prev) =>
              prev.map((p) =>
                p.id === activePatientData.id
                  ? { ...p, lastDoctorReview: `${payload.reasonCode} (Vừa xong)` }
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
        metricLabel={activePatientData ? `Current: ${activePatientData.current}` : undefined}
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
