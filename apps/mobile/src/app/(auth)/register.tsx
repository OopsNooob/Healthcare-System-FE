import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Toast from 'react-native-toast-message';
import {
  connectNotificationsSocket,
  connectPresenceSocket,
  getStorage,
  mobileApi,
  updateSocketAuth,
  useSharedAuthStore,
  useSignUpDoctor,
  useSignUpPatient,
} from '@repo/shared-hooks';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Mail, Lock, Cross, User, Phone, Briefcase, Stethoscope, Clock, UploadCloud } from 'lucide-react-native';
import { tw } from '@/tw';
import { RestoreDraftModal, DocUploadModal } from '@/components/modals';
import type { VerificationDocument } from '@/components/modals/DocUploadModal';

export default function RegisterScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const setUser = useSharedAuthStore((s) => s.setUser);
  const { signUpPatient, isLoading: isPatientLoading } = useSignUpPatient();
  const { signUpDoctor, isLoading: isDoctorLoading } = useSignUpDoctor();

  const [role, setRole] = useState<'patient' | 'doctor'>('patient');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const [specialty, setSpecialty] = useState('');
  const [workplace, setWorkplace] = useState('');
  const [experience, setExperience] = useState('');

  const [restoreDraftModalVisible, setRestoreDraftModalVisible] = useState(false);
  const [docUploadModalVisible, setDocUploadModalVisible] = useState(false);
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocument[]>([]);

  const isLoading = isPatientLoading || isDoctorLoading;

  const handleRegister = async () => {
    if (isLoading) return;

    const cleanEmail = email.trim();
    const cleanName = fullName.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !cleanName || !password) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.fill_required_fields', 'Please complete all required fields.'),
      });
      return;
    }

    if (password.length < 8) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.password_min_8', 'Password must be at least 8 characters.'),
      });
      return;
    }

    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.passwords_do_not_match', 'Passwords do not match.'),
      });
      return;
    }

    try {
      if (role === 'patient') {
        const res = await signUpPatient({
          email: cleanEmail,
          password,
          fullName: cleanName,
          phoneNumber: cleanPhone,
        });

        if (res.accessToken && res.user) {
          await getStorage().setItem('accessToken', res.accessToken);
          await getStorage().setItem('refreshToken', res.refreshToken || '');
          setUser(
            {
              id: res.user.id,
              email: res.user.email,
              name: res.user.fullName,
              role: res.user.role,
            },
            res.accessToken,
            res.refreshToken || '',
          );
          updateSocketAuth(res.accessToken);
          void connectNotificationsSocket(res.accessToken);
          void connectPresenceSocket(res.accessToken);
          Toast.show({
            type: 'success',
            text1: t('mobile.registration_success', 'Account Created'),
          });
          router.replace('/(patient)');
        } else {
          Toast.show({
            type: 'success',
            text1: t('mobile.registration_success', 'Account Created'),
          });
          router.replace('/(auth)/login');
        }
        return;
      }

      const expYears = Number(experience);
      if (!specialty.trim() || !workplace.trim() || !Number.isFinite(expYears) || expYears <= 0) {
        Toast.show({
          type: 'error',
          text1: t('mobile.error', 'Error'),
          text2: t('mobile.fill_doctor_fields', 'Please complete specialty, workplace, and experience years.'),
        });
        return;
      }

      const newFiles = verificationDocs
        .filter((d) => Boolean(d.uri))
        .map((d) => ({
          uri: d.uri as string,
          name: d.fileName,
          type: d.mimeType || 'application/pdf',
        }));
      const existingUrls = verificationDocs
        .map((d) => d.remoteUrl)
        .filter((url): url is string => Boolean(url));

      if (newFiles.length === 0 && existingUrls.length === 0) {
        Toast.show({
          type: 'error',
          text1: t('mobile.error', 'Error'),
          text2: t('mobile.please_upload_verification_docs', 'Please attach your verification documents.'),
        });
        return;
      }

      const res = await signUpDoctor({
        email: cleanEmail,
        password,
        fullName: cleanName,
        phoneNumber: cleanPhone,
        specialty: specialty.trim(),
        workplace: workplace.trim(),
        experienceYears: expYears,
        newVerificationDocuments: newFiles,
        existingVerificationDocuments: existingUrls,
      });

      let verificationStatus: string = 'pending';
      try {
        const statusInfo = await mobileApi.usersFindDoctorByEmail({ params: { email: cleanEmail } });
        verificationStatus = statusInfo?.verificationStatus ?? 'pending';
      } catch {
        // Keep safe pending default
      }

      if (res.accessToken && res.user && verificationStatus === 'approved') {
        await getStorage().setItem('accessToken', res.accessToken);
        await getStorage().setItem('refreshToken', res.refreshToken || '');
        setUser(
          {
            id: res.user.id,
            email: res.user.email,
            name: res.user.fullName,
            role: res.user.role,
          },
          res.accessToken,
          res.refreshToken || '',
        );
        updateSocketAuth(res.accessToken);
        void connectNotificationsSocket(res.accessToken);
        void connectPresenceSocket(res.accessToken);
        router.replace('/(doctor)');
      } else {
        Toast.show({
          type: 'success',
          text1: t('mobile.doctor_registration_submitted', 'Application Submitted'),
          text2: t('mobile.doctor_pending_review_desc', 'Your credentials are under admin review. Sign in once approved.'),
        });
        router.replace('/(auth)/login');
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}
    >
      <ScrollView
        contentContainerStyle={tw('flex-grow items-center justify-center px-6 py-10')}
        keyboardShouldPersistTaps="handled"
      >
        <View style={tw('flex-col items-center gap-2 mb-8')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Cross color="#10b981" fill="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34] dark:text-slate-100')}>
              {t('mobile.healthcare', 'Healthcare')}
            </Text>
          </View>
          <Text style={tw('text-sm text-gray-500 dark:text-slate-400 text-center')}>
            {t('mobile.your_intelligent_telecare_ai_s', 'Your intelligent telecare AI solutions.')}
          </Text>
        </View>

        <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] dark:text-slate-100 mb-2')}>
            {t('mobile.sign_up', 'Sign up')}
          </Text>
          <Text style={tw('text-center text-sm text-gray-500 dark:text-slate-400 mb-6')}>
            {t('mobile.create_a_new_account', 'Create a new account')}
          </Text>

          <View style={tw('flex-row bg-gray-100 dark:bg-slate-800 p-1 rounded-xl mb-6')}>
            <TouchableOpacity
              style={tw(`flex-1 py-2 items-center rounded-lg ${role === 'patient' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              onPress={() => setRole('patient')}
              disabled={isLoading}
            >
              <Text style={tw(`font-medium ${role === 'patient' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`)}>
                {t('mobile.patient', 'Patient')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={tw(`flex-1 py-2 items-center rounded-lg ${role === 'doctor' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              onPress={() => setRole('doctor')}
              disabled={isLoading}
            >
              <Text style={tw(`font-medium ${role === 'doctor' ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-slate-400'}`)}>
                {t('mobile.doctor', 'Doctor')}
              </Text>
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.email', 'Email')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Mail color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.enter_your_email', 'Enter your email account')}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
            </View>

            {role === 'doctor' && (
              <TouchableOpacity
                onPress={() => setRestoreDraftModalVisible(true)}
                disabled={isLoading}
                style={tw('flex-row items-center justify-end -mt-2 mb-2 active:opacity-80')}
              >
                <Text style={tw('text-sm text-emerald-600 dark:text-emerald-400 font-medium')}>
                  {t('mobile.load_previous_registration_dat', 'Load previous registration data?')}
                </Text>
              </TouchableOpacity>
            )}

            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.full_name', 'Full Name')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <User color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.enter_full_name', 'Full Name')}
                  placeholderTextColor="#9ca3af"
                  value={fullName}
                  onChangeText={setFullName}
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.phone_number', 'Phone number')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Phone color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.enter_your_phone', 'Enter your phone number')}
                  placeholderTextColor="#9ca3af"
                  value={phone}
                  onChangeText={setPhone}
                  keyboardType="phone-pad"
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.password', 'Password')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.create_password_hint', 'Create a password')}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.confirm_password', 'Confirm Password')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.reenter_password_hint', 'Re-enter your password')}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>
            </View>

            {role === 'doctor' && (
              <>
                <View style={tw('gap-1.5')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                    {t('mobile.specialty', 'Specialty')}
                  </Text>
                  <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                    <Stethoscope color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                      placeholder={t('mobile.specialty_hint', 'e.g. Cardiology')}
                      placeholderTextColor="#9ca3af"
                      value={specialty}
                      onChangeText={setSpecialty}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={tw('gap-1.5')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                    {t('mobile.years_of_experience', 'Years of Experience')}
                  </Text>
                  <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                    <Clock color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                      placeholder={t('mobile.experience_hint', 'e.g. 5')}
                      placeholderTextColor="#9ca3af"
                      value={experience}
                      onChangeText={setExperience}
                      keyboardType="number-pad"
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={tw('gap-1.5')}>
                  <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                    {t('mobile.current_workplace_hospital', 'Current workplace / Hospital')}
                  </Text>
                  <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                    <Briefcase color="#9ca3af" size={20} />
                    <TextInput
                      style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                      placeholder={t('mobile.workplace_hint', 'e.g. City Hospital')}
                      placeholderTextColor="#9ca3af"
                      value={workplace}
                      onChangeText={setWorkplace}
                      editable={!isLoading}
                    />
                  </View>
                </View>

                <View style={tw('gap-1.5 mt-2')}>
                  <View style={tw('flex-row items-center justify-between')}>
                    <Text style={tw('text-sm font-bold text-[#1E1E1E] dark:text-slate-200')}>
                      {t('mobile.professional_verification', 'Professional Verification')}
                    </Text>
                    <Text style={tw('text-xs text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full font-bold')}>
                      {t('mobile.required', 'Required')}
                    </Text>
                  </View>
                  <Text style={tw('text-xs text-gray-500 dark:text-slate-400 mb-2')}>
                    {t('mobile.required_to_activate_your_acco', 'Required to activate your account')}
                  </Text>

                  <TouchableOpacity
                    onPress={() => setDocUploadModalVisible(true)}
                    style={tw('border border-dashed border-gray-300 dark:border-slate-600 rounded-2xl bg-gray-50 dark:bg-slate-800/50 py-6 items-center active:opacity-80')}
                    disabled={isLoading}
                  >
                    <View style={tw('bg-gray-200 dark:bg-slate-700 p-3 rounded-full mb-2')}>
                      <UploadCloud color="#9ca3af" size={24} />
                    </View>
                    <Text style={tw('text-sm font-semibold text-gray-700 dark:text-slate-300')}>
                      {verificationDocs.length > 0
                        ? `${verificationDocs.length} ${t('mobile.docs_uploaded', 'documents attached')}`
                        : t('mobile.tap_to_select_documents', 'Tap to select documents')}
                    </Text>
                    <Text style={tw('text-xs text-gray-500 dark:text-slate-400 mt-1')}>
                      {t('mobile.upload_medical_degree_and_prac', 'Upload Medical Degree and Practice License')}
                    </Text>
                    <Text style={tw('text-xs text-gray-500 dark:text-slate-400')}>
                      {t('mobile.pdf_jpg_png_max_10_mb', 'PDF, JPG, PNG, MAX 10 MB')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            )}

            <TouchableOpacity
              style={tw(
                `h-12 w-full mt-4 rounded-2xl items-center justify-center ${
                  isLoading ? 'bg-emerald-400' : 'bg-emerald-500'
                }`,
              )}
              onPress={handleRegister}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw('text-white text-base font-semibold')}>{t('mobile.sign_up', 'Sign up')}</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={tw('mt-4 items-center')}
              onPress={() => router.push('/(auth)/login')}
              disabled={isLoading}
            >
              <Text style={tw('text-sm text-gray-500 dark:text-slate-400')}>
                {t('mobile.already_have_account', 'Already have an account?')}{' '}
                <Text style={tw('font-medium text-emerald-600 dark:text-emerald-400')}>
                  {t('mobile.log_in', 'Log in')}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>

      <RestoreDraftModal
        visible={restoreDraftModalVisible}
        onClose={() => setRestoreDraftModalVisible(false)}
        initialEmail={email}
        onRestore={(draft) => {
          setFullName(draft.fullName);
          setEmail(draft.email);
          setPhone(draft.phone);
          setSpecialty(draft.specialty);
          setWorkplace(draft.workplace);
          setExperience(draft.experience);
          if (draft.verificationDocuments && draft.verificationDocuments.length > 0) {
            setVerificationDocs(
              draft.verificationDocuments.map((url, idx) => ({
                id: `restored-${idx}`,
                type: 'license',
                title: t('mobile.doc_practice_license', 'Existing Verification Document'),
                fileName: url.split('/').pop() || `document-${idx + 1}.pdf`,
                fileSize: 'URL',
                status: 'verified',
                uploadDate: '',
                remoteUrl: url,
              })),
            );
          }
        }}
        onClearDraft={() => {
          setVerificationDocs([]);
        }}
      />

      <DocUploadModal
        visible={docUploadModalVisible}
        onClose={() => setDocUploadModalVisible(false)}
        initialDocuments={verificationDocs}
        onConfirm={(docs) => {
          setVerificationDocs(docs);
        }}
      />
    </KeyboardAvoidingView>
  );
}
