import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import {
  ArrowLeft,
  CheckCircle2,
  Shield,
  HeartPulse,
  Activity,
  Clock,
  Sparkles,
  AlertTriangle,
  FileText,
  Check,
  ChevronRight,
  Droplet,
  Pill,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { useThemeContext } from '@/context/ThemeContext';
import Toast from 'react-native-toast-message';

export default function BaselineAssessmentScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';
  const router = useRouter();

  const [initialLoading, setInitialLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState<1 | 2 | 3 | 4>(1);
  const [isActivating, setIsActivating] = useState(false);

  // Step 1: Consent
  const [hasAgreedConsent, setHasAgreedConsent] = useState(false);

  // Step 2: Vitals
  const [systolic, setSystolic] = useState('125');
  const [diastolic, setDiastolic] = useState('82');
  const [glucose, setGlucose] = useState('105');
  const [hba1c, setHbA1c] = useState('6.2');
  const [medications, setMedications] = useState(isVi ? 'Amlodipine 5mg (1 viên/ngày)' : 'Amlodipine 5mg (1 tab/day)');

  // Step 3: Quiet Hours
  const [quietStart, setQuietStart] = useState('22:00');
  const [quietEnd, setQuietEnd] = useState('07:00');

  useEffect(() => {
    const timer = setTimeout(() => {
      setInitialLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, []);

  const handleNextStep1 = () => {
    if (!hasAgreedConsent) {
      Toast.show({
        type: 'error',
        text1: t('mobile.alert_consent_required', 'Please agree to the consent terms before proceeding.'),
      });
      return;
    }
    setCurrentStep(2);
  };

  const handleNextStep2 = () => {
    if (!systolic.trim() || !diastolic.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.alert_fill_required', 'Please enter baseline blood pressure values.'),
      });
      return;
    }
    setCurrentStep(3);
  };

  const handleActivateProgram = () => {
    setIsActivating(true);
    setTimeout(() => {
      setIsActivating(false);
      setCurrentStep(4); // Success Celebration
      Toast.show({
        type: 'success',
        text1: t('mobile.activation_success_title', 'Program Activated Successfully!'),
      });
    }, 1200);
  };

  const renderSkeleton = () => (
    <View style={tw('px-6 pt-4 gap-6')}>
      <View style={tw('h-4 w-1/3 bg-slate-200 dark:bg-slate-800 rounded-full')} />
      <View style={tw('h-8 w-2/3 bg-slate-200 dark:bg-slate-800 rounded-xl')} />
      <View style={tw('flex-row gap-2 my-2')}>
        <View style={tw('flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full')} />
        <View style={tw('flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full')} />
        <View style={tw('flex-1 h-2 bg-slate-200 dark:bg-slate-800 rounded-full')} />
      </View>
      <View style={tw('h-48 bg-slate-200 dark:bg-slate-800 rounded-3xl')} />
      <View style={tw('h-14 bg-slate-200 dark:bg-slate-800 rounded-2xl mt-4')} />
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw('flex-1')}
      >
        {/* Navigation Top Bar */}
        <View style={tw('flex-row items-center justify-between px-6 pt-4 pb-3 border-b border-slate-100 dark:border-slate-800/80')}>
          {currentStep < 4 ? (
            <TouchableOpacity
              onPress={() => {
                if (currentStep > 1) {
                  setCurrentStep((prev) => (prev - 1) as 1 | 2 | 3);
                } else {
                  router.back();
                }
              }}
              style={tw('w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center shadow-sm')}
            >
              <ArrowLeft size={20} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
            </TouchableOpacity>
          ) : (
            <View style={tw('w-10')} />
          )}

          <Text style={tw('text-base font-bold text-slate-900 dark:text-slate-100')}>
            {t('mobile.baseline_assessment_title', 'Baseline Assessment')}
          </Text>

          <View style={tw('w-10 items-end')}>
            {currentStep < 4 && (
              <View style={tw('px-2.5 py-1 rounded-full bg-indigo-50 dark:bg-indigo-900/40 border border-indigo-100 dark:border-indigo-800/60')}>
                <Text style={tw('text-xs font-bold text-indigo-600 dark:text-indigo-400')}>
                  {currentStep}/3
                </Text>
              </View>
            )}
          </View>
        </View>

        {initialLoading ? (
          renderSkeleton()
        ) : (
          <ScrollView
            contentContainerStyle={tw('pb-12 px-6 pt-4')}
            showsVerticalScrollIndicator={false}
          >
            {/* Step Progress Pills (Steps 1 to 3) */}
            {currentStep < 4 && (
              <View style={tw('mb-6')}>
                <View style={tw('flex-row gap-2 mb-3')}>
                  {[1, 2, 3].map((s) => (
                    <View
                      key={s}
                      style={[
                        tw('flex-1 h-2 rounded-full'),
                        s <= currentStep
                          ? tw('bg-indigo-600 dark:bg-indigo-500')
                          : tw('bg-slate-200 dark:bg-slate-800'),
                      ]}
                    />
                  ))}
                </View>

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

            {/* STEP 1: CONSENT */}
            {currentStep === 1 && (
              <View style={tw('gap-4')}>
                <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm')}>
                  <View style={tw('flex-row items-center gap-3 mb-4')}>
                    <View style={tw('w-10 h-10 rounded-2xl bg-indigo-50 dark:bg-indigo-900/30 items-center justify-center')}>
                      <Shield size={22} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text style={tw('text-base font-bold text-slate-900 dark:text-slate-100')}>
                        {t('mobile.hypertension_program', 'Hypertension Management')}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        Care Protocol v2.4 • Remote Telemetry
                      </Text>
                    </View>
                  </View>

                  <View style={tw('space-y-3.5 mb-2')}>
                    <View style={tw('flex-row items-start gap-3')}>
                      <View style={tw('w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mt-0.5')}>
                        <Check size={14} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
                      </View>
                      <Text style={tw('flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed')}>
                        {t('mobile.consent_item_1', 'I agree to share daily blood pressure/glucose readings with my assigned clinical team.')}
                      </Text>
                    </View>

                    <View style={tw('flex-row items-start gap-3 mt-3')}>
                      <View style={tw('w-6 h-6 rounded-full bg-emerald-50 dark:bg-emerald-900/30 items-center justify-center mt-0.5')}>
                        <Check size={14} color={twInstance.color('text-emerald-600 dark:text-emerald-400')} />
                      </View>
                      <Text style={tw('flex-1 text-sm text-slate-600 dark:text-slate-300 leading-relaxed')}>
                        {t('mobile.consent_item_2', 'I understand AI provides assistive alerts and does not replace emergency medical services.')}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Agreement Checkbox Card */}
                <TouchableOpacity
                  activeOpacity={0.8}
                  onPress={() => setHasAgreedConsent(!hasAgreedConsent)}
                  style={tw(`flex-row items-center p-4 rounded-2xl border transition-all ${
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

                {/* Next Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={handleNextStep1}
                  style={tw('mt-6 bg-indigo-600 dark:bg-indigo-600 py-4 rounded-2xl flex-row items-center justify-center shadow-md')}
                >
                  <Text style={tw('text-white font-bold text-base mr-2')}>
                    {t('mobile.btn_next', 'Next')}
                  </Text>
                  <ChevronRight size={18} color="#ffffff" />
                </TouchableOpacity>
              </View>
            )}

            {/* STEP 2: VITALS FORM */}
            {currentStep === 2 && (
              <View style={tw('gap-4')}>
                <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm gap-4')}>
                  {/* Blood Pressure Pair */}
                  <View>
                    <View style={tw('flex-row items-center gap-2 mb-2')}>
                      <HeartPulse size={16} color={twInstance.color('text-rose-500')} />
                      <Text style={tw('text-sm font-semibold text-slate-800 dark:text-slate-200')}>
                        {t('mobile.blood_pressure', 'Blood Pressure')} (mmHg) *
                      </Text>
                    </View>
                    <View style={tw('flex-row gap-3')}>
                      <View style={tw('flex-1')}>
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                          {t('mobile.bp_systolic_label', 'Systolic (mmHg)')}
                        </Text>
                        <TextInput
                          value={systolic}
                          onChangeText={setSystolic}
                          keyboardType="numeric"
                          placeholder={t('mobile.bp_systolic_ph', 'e.g. 125')}
                          placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                          style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-bold text-base')}
                        />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                          {t('mobile.bp_diastolic_label', 'Diastolic (mmHg)')}
                        </Text>
                        <TextInput
                          value={diastolic}
                          onChangeText={setDiastolic}
                          keyboardType="numeric"
                          placeholder={t('mobile.bp_diastolic_ph', 'e.g. 80')}
                          placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                          style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-bold text-base')}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Fasting Glucose */}
                  <View>
                    <View style={tw('flex-row items-center gap-2 mb-1.5')}>
                      <Droplet size={16} color={twInstance.color('text-amber-500')} />
                      <Text style={tw('text-sm font-semibold text-slate-800 dark:text-slate-200')}>
                        {t('mobile.glucose_label', 'Fasting Blood Glucose (mg/dL)')}
                      </Text>
                    </View>
                    <TextInput
                      value={glucose}
                      onChangeText={setGlucose}
                      keyboardType="numeric"
                      placeholder={t('mobile.glucose_ph', 'e.g. 105')}
                      placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                      style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-medium text-base')}
                    />
                  </View>

                  {/* HbA1c */}
                  <View>
                    <View style={tw('flex-row items-center gap-2 mb-1.5')}>
                      <Activity size={16} color={twInstance.color('text-indigo-500')} />
                      <Text style={tw('text-sm font-semibold text-slate-800 dark:text-slate-200')}>
                        {t('mobile.hba1c_label', 'Latest HbA1c (%)')}
                      </Text>
                    </View>
                    <TextInput
                      value={hba1c}
                      onChangeText={setHbA1c}
                      keyboardType="decimal-pad"
                      placeholder={t('mobile.hba1c_ph', 'e.g. 6.2')}
                      placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                      style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-medium text-base')}
                    />
                  </View>

                  {/* Daily Medications */}
                  <View>
                    <View style={tw('flex-row items-center gap-2 mb-1.5')}>
                      <Pill size={16} color={twInstance.color('text-emerald-500')} />
                      <Text style={tw('text-sm font-semibold text-slate-800 dark:text-slate-200')}>
                        {t('mobile.medication_label', 'Current Daily Medications')}
                      </Text>
                    </View>
                    <TextInput
                      value={medications}
                      onChangeText={setMedications}
                      multiline
                      numberOfLines={3}
                      placeholder={t('mobile.medication_ph', 'Medication name, daily dosage...')}
                      placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                      style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3 text-slate-900 dark:text-slate-100 font-medium min-h-[80px]')}
                    />
                  </View>
                </View>

                {/* Back & Next Actions */}
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
                    style={tw('flex-1 py-4 rounded-2xl bg-indigo-600 dark:bg-indigo-600 items-center justify-center shadow-md')}
                  >
                    <Text style={tw('text-white font-bold text-base')}>
                      {t('mobile.btn_next', 'Next')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* STEP 3: QUIET HOURS & ACTIVATE */}
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

                  {/* Preset quick buttons */}
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
                        <Text style={tw(`text-xs font-medium ${
                          quietStart === preset.start && quietEnd === preset.end
                            ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                            : 'text-slate-600 dark:text-slate-400'
                        }`)}>
                          {preset.start} - {preset.end}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                {/* Safety Notice Callout */}
                <View style={tw('bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-4 border border-amber-200 dark:border-amber-800/60 flex-row gap-3 items-start')}>
                  <AlertTriangle size={20} color={twInstance.color('text-amber-600 dark:text-amber-400')} style={tw('mt-0.5')} />
                  <Text style={tw('flex-1 text-xs text-amber-800 dark:text-amber-200 leading-relaxed font-medium')}>
                    {t('mobile.emergency_notice', 'Note: Urgent critical health alerts will always be delivered immediately for patient safety.')}
                  </Text>
                </View>

                {/* Back & Activate Actions */}
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
                    onPress={handleActivateProgram}
                    disabled={isActivating}
                    activeOpacity={0.85}
                    style={tw('flex-1 py-4 px-3 rounded-2xl bg-emerald-600 dark:bg-emerald-500 items-center justify-center shadow-md overflow-hidden')}
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

            {/* STEP 4: CELEBRATION / SUCCESS */}
            {currentStep === 4 && (
              <View style={tw('items-center justify-center pt-8 pb-6 gap-6')}>
                {/* Glowing Success Badge */}
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
                </View>

                {/* Calibrated Program Card */}
                <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm gap-3.5')}>
                  <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500')}>
                    Configuration Summary
                  </Text>

                  <View style={tw('flex-row justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800')}>
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-400')}>
                      {t('mobile.active_program', 'Active Program')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-slate-100')}>
                      {t('mobile.hypertension_program', 'Hypertension Management')}
                    </Text>
                  </View>

                  <View style={tw('flex-row justify-between items-center py-1 border-b border-slate-100 dark:border-slate-800')}>
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-400')}>
                      {t('mobile.blood_pressure', 'Baseline BP')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-emerald-600 dark:text-emerald-400')}>
                      {systolic}/{diastolic} mmHg
                    </Text>
                  </View>

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
                      08:00 AM Tomorrow
                    </Text>
                  </View>
                </View>

                {/* Return Home Button */}
                <TouchableOpacity
                  activeOpacity={0.85}
                  onPress={() => router.push('/(patient)')}
                  style={tw('w-full py-4 rounded-2xl bg-indigo-600 dark:bg-indigo-600 items-center justify-center shadow-md')}
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
