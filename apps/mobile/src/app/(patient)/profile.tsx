import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import {
  Camera,
  Mail,
  Phone,
  MapPin,
  User,
  LogOut,
  Crown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Sparkles,
  Shield,
  Database,
} from 'lucide-react-native';
import { useThemeContext } from '@/context/ThemeContext';
import { tw, twInstance } from '@/tw';
import Toast from 'react-native-toast-message';
import {
  AvatarPickerModal,
  SecuritySessionsModal,
  PrivacyDataModal,
} from '@/components/modals';

export default function ProfileScreen() {
  const { t, i18n } = useTranslation();
  const { colorScheme, setColorScheme } = useThemeContext();
  const activeScheme = colorScheme;
  const router = useRouter();

  const [avatarUri, setAvatarUri] = useState('https://i.pravatar.cc/150?img=12');
  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const [form, setForm] = useState({
    fullName: 'Alex Johnson',
    email: 'alex.johnson@example.com',
    phone: '+1 234 567 890',
    gender: 'Male',
    street: '123 Health Street',
    ward: 'Ward 5',
    district: 'District 1',
    city: 'Metropolis',
  });

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const handleSaveProfile = () => {
    setIsSaving(true);
    setTimeout(() => {
      setIsSaving(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.profile_updated_success', 'Profile information saved successfully'),
      });
    }, 600);
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
      >
        <ScrollView
          contentContainerStyle={tw('pb-24')}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={twInstance.color('text-emerald-500')}
            />
          }
        >
          {/* Header */}
          <View style={tw('px-6 pt-6 pb-4 flex-row justify-between items-center')}>
            <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
              {t('mobile.my_profile', 'My Profile')}
            </Text>
            <TouchableOpacity onPress={() => router.replace('/(auth)/login')}>
              <LogOut color="#ef4444" size={24} />
            </TouchableOpacity>
          </View>

          {/* Avatar Section */}
          <View style={tw('items-center mb-8 mt-2')}>
            <View style={tw('relative')}>
              <Image
                source={{ uri: avatarUri }}
                style={tw(
                  'w-32 h-32 rounded-full bg-slate-200 dark:bg-slate-700 border-4 border-white shadow-sm'
                )}
              />
              <TouchableOpacity
                onPress={() => setAvatarModalVisible(true)}
                style={tw(
                  'absolute bottom-0 right-2 w-10 h-10 bg-slate-900 rounded-full items-center justify-center border-4 border-white shadow-sm'
                )}
              >
                <Camera color="#ffffff" size={16} />
              </TouchableOpacity>
            </View>
            <View
              style={tw(
                'mt-4 bg-emerald-50 dark:bg-emerald-900/30 px-4 py-1.5 rounded-full border border-emerald-200 dark:border-emerald-800 flex-row items-center'
              )}
            >
              <User color="#10b981" size={14} />
              <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold text-xs ml-1')}>
                {t('mobile.patient', 'Patient')}
              </Text>
            </View>
          </View>

          {/* Premium Card */}
          <View style={tw('px-6 mb-4')}>
            <TouchableOpacity
              onPress={() => router.push('/(patient)/premium')}
              style={tw('bg-slate-900 p-4 rounded-3xl flex-row items-center justify-between shadow-lg')}
            >
              <View style={tw('flex-row items-center')}>
                <View style={tw('w-12 h-12 bg-amber-400 rounded-2xl items-center justify-center mr-4')}>
                  <Crown color="#0f172a" size={24} />
                </View>
                <View>
                  <Text style={tw('text-white font-bold text-base mb-0.5')}>
                    {t('mobile.free_plan', 'Free Plan')}
                  </Text>
                  <Text style={tw('text-amber-400 text-xs font-semibold')}>
                    {t('mobile.upgrade_to_premium', 'Upgrade to Premium')}
                  </Text>
                </View>
              </View>
              <ChevronRight color="#94a3b8" size={20} />
            </TouchableOpacity>
          </View>

          {/* Enrollment Status (DA2) */}
          <View style={tw('px-6 mb-6')}>
            <View
              style={tw(
                'bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm'
              )}
            >
              <View style={tw('mb-4')}>
                <Text style={tw('font-bold text-indigo-900 dark:text-indigo-100 text-lg mb-2')}>
                  {t('mobile.care_program_enrollment_title', 'Đăng ký chương trình chăm sóc')}
                </Text>
                <View style={tw('bg-amber-100 dark:bg-amber-900/30 px-3 py-1.5 rounded-full self-start')}>
                  <Text style={tw('text-amber-700 dark:text-amber-400 text-xs font-bold')}>
                    {t('mobile.enroll_status_pending', 'Pending Activation')}
                  </Text>
                </View>
              </View>

              <View style={tw('gap-4')}>
                <View style={tw('flex-row items-center gap-3')}>
                  <CheckCircle2 color={twInstance.color('text-emerald-500')} size={20} />
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-medium flex-1')}>
                    {t('mobile.enroll_condition_patient_active', 'Account Active')}
                  </Text>
                </View>
                <View style={tw('flex-row items-center gap-3')}>
                  <CheckCircle2 color={twInstance.color('text-emerald-500')} size={20} />
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-medium flex-1')}>
                    {t('mobile.enroll_condition_entitlement', 'Valid Subscription')}
                  </Text>
                </View>
                <View style={tw('flex-row items-center gap-3')}>
                  <CheckCircle2 color={twInstance.color('text-emerald-500')} size={20} />
                  <Text style={tw('text-slate-700 dark:text-slate-300 font-medium flex-1')}>
                    {t('mobile.enroll_condition_program_active', 'Program Published')}
                  </Text>
                </View>
                <View style={tw('flex-row items-start gap-3')}>
                  <Circle
                    color={twInstance.color('text-slate-300 dark:text-slate-600')}
                    size={20}
                    style={tw('mt-0.5')}
                  />
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-slate-500 dark:text-slate-400 font-medium')}>
                      {t('mobile.enroll_condition_doctor_active', 'Doctor Approved')}
                    </Text>
                    <Text style={tw('text-xs text-indigo-500 dark:text-indigo-400 mt-0.5')}>
                      {t('mobile.waiting_for_doctor', 'Waiting for Doctor/System')}
                    </Text>
                  </View>
                </View>
                <View style={tw('flex-row items-center gap-3')}>
                  <Circle color={twInstance.color('text-slate-300 dark:text-slate-600')} size={20} />
                  <Text style={tw('text-slate-500 dark:text-slate-400 font-medium flex-1')}>
                    {t('mobile.enroll_condition_consent', 'Consent Signed')}
                  </Text>
                  <Text style={tw('text-xs text-amber-500 font-medium')}>
                    {t('mobile.waiting', 'Pending')}
                  </Text>
                </View>
                <View style={tw('flex-row items-center gap-3')}>
                  <Circle color={twInstance.color('text-slate-300 dark:text-slate-600')} size={20} />
                  <Text style={tw('text-slate-500 dark:text-slate-400 font-medium flex-1')}>
                    {t('mobile.enroll_condition_baseline', 'Baseline Completed')}
                  </Text>
                  <Text style={tw('text-xs text-amber-500 font-medium')}>
                    {t('mobile.waiting', 'Pending')}
                  </Text>
                </View>
              </View>

              <TouchableOpacity
                onPress={() => router.push('/(patient)/baseline-assessment')}
                style={tw(
                  'mt-4 bg-indigo-600 dark:bg-indigo-600 py-3 px-4 rounded-2xl flex-row items-center justify-center shadow-sm'
                )}
              >
                <Sparkles size={16} color="#ffffff" style={tw('mr-2')} />
                <Text style={tw('text-white text-xs sm:text-sm font-bold')}>
                  {t('mobile.complete_assessment_now', 'Complete Survey')}
                </Text>
                <ChevronRight size={16} color="#ffffff" style={tw('ml-1')} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Quick Links (DA2 Features + C-05 Security & C-06 Privacy) */}
          <View style={tw('px-6 mb-8 gap-3')}>
            <TouchableOpacity
              onPress={() => router.push('/(patient)/family')}
              style={tw(
                'bg-white dark:bg-slate-900 p-4 rounded-2xl flex-row items-center justify-between shadow-sm border border-slate-100 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-row items-center')}>
                <View
                  style={tw(
                    'w-10 h-10 bg-indigo-50 dark:bg-indigo-900/30 rounded-xl items-center justify-center mr-3'
                  )}
                >
                  <User color={twInstance.color('text-indigo-500')} size={20} />
                </View>
                <Text style={tw('text-slate-900 dark:text-white font-bold')}>
                  {t('mobile.family_companion', 'Family Companion')}
                </Text>
              </View>
              <ChevronRight color={twInstance.color('text-slate-400')} size={20} />
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push('/(patient)/facilities')}
              style={tw(
                'bg-white dark:bg-slate-900 p-4 rounded-2xl flex-row items-center justify-between shadow-sm border border-slate-100 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-row items-center')}>
                <View
                  style={tw(
                    'w-10 h-10 bg-rose-50 dark:bg-rose-900/30 rounded-xl items-center justify-center mr-3'
                  )}
                >
                  <MapPin color={twInstance.color('text-rose-500')} size={20} />
                </View>
                <Text style={tw('text-slate-900 dark:text-white font-bold')}>
                  {t('mobile.medical_facilities', 'Medical Facilities')}
                </Text>
              </View>
              <ChevronRight color={twInstance.color('text-slate-400')} size={20} />
            </TouchableOpacity>

            {/* C-05: Security & Active Sessions */}
            <TouchableOpacity
              onPress={() => setSecurityModalVisible(true)}
              style={tw(
                'bg-white dark:bg-slate-900 p-4 rounded-2xl flex-row items-center justify-between shadow-sm border border-slate-100 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-row items-center')}>
                <View
                  style={tw(
                    'w-10 h-10 bg-emerald-50 dark:bg-emerald-900/30 rounded-xl items-center justify-center mr-3'
                  )}
                >
                  <Shield color={twInstance.color('text-emerald-500')} size={20} />
                </View>
                <Text style={tw('text-slate-900 dark:text-white font-bold')}>
                  {t('mobile.security_sessions', 'Bảo mật và phiên đăng nhập')}
                </Text>
              </View>
              <ChevronRight color={twInstance.color('text-slate-400')} size={20} />
            </TouchableOpacity>

            {/* C-06: Privacy, Data Export & Account Deletion */}
            <TouchableOpacity
              onPress={() => setPrivacyModalVisible(true)}
              style={tw(
                'bg-white dark:bg-slate-900 p-4 rounded-2xl flex-row items-center justify-between shadow-sm border border-slate-100 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-row items-center')}>
                <View
                  style={tw(
                    'w-10 h-10 bg-amber-50 dark:bg-amber-900/30 rounded-xl items-center justify-center mr-3'
                  )}
                >
                  <Database color={twInstance.color('text-amber-500')} size={20} />
                </View>
                <Text style={tw('text-slate-900 dark:text-white font-bold')}>
                  {t('mobile.privacy_and_data', 'Quyền riêng tư và dữ liệu cá nhân')}
                </Text>
              </View>
              <ChevronRight color={twInstance.color('text-slate-400')} size={20} />
            </TouchableOpacity>
          </View>

          {/* Basic Info Form */}
          <View style={tw('px-6')}>
            <Text
              style={tw(
                'text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4'
              )}
            >
              {t('mobile.basic_information', 'Basic Information')}
            </Text>

            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-6'
              )}
            >
              <View style={tw('mb-4')}>
                <Text
                  style={tw(
                    'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                  )}
                >
                  {t('mobile.full_name', 'Full Name')}
                </Text>
                <TextInput
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium'
                  )}
                  value={form.fullName}
                  onChangeText={(txt) => setForm({ ...form, fullName: txt })}
                />
              </View>

              <View style={tw('mb-4')}>
                <Text
                  style={tw(
                    'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                  )}
                >
                  {t('mobile.email', 'Email')}
                </Text>
                <View
                  style={tw(
                    'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center'
                  )}
                >
                  <Mail color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-500 dark:text-slate-400 font-medium')}
                    value={form.email}
                    editable={false}
                  />
                </View>
              </View>

              <View style={tw('mb-4')}>
                <Text
                  style={tw(
                    'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                  )}
                >
                  {t('mobile.phone_number', 'Phone Number')}
                </Text>
                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center'
                  )}
                >
                  <Phone color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 dark:text-white font-medium')}
                    value={form.phone}
                    onChangeText={(txt) => setForm({ ...form, phone: txt })}
                  />
                </View>
              </View>

              <View>
                <Text
                  style={tw(
                    'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                  )}
                >
                  {t('mobile.gender', 'Gender')}
                </Text>
                <TextInput
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium'
                  )}
                  value={form.gender}
                  onChangeText={(txt) => setForm({ ...form, gender: txt })}
                />
              </View>
            </View>

            {/* Address Form */}
            <Text
              style={tw(
                'text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4'
              )}
            >
              {t('mobile.contact_address', 'Contact Address')}
            </Text>

            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-8'
              )}
            >
              <View style={tw('mb-4')}>
                <Text
                  style={tw(
                    'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                  )}
                >
                  {t('mobile.street', 'Street')}
                </Text>
                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 flex-row items-center'
                  )}
                >
                  <MapPin color="#94a3b8" size={18} style={tw('mr-2')} />
                  <TextInput
                    style={tw('flex-1 text-slate-900 dark:text-white font-medium')}
                    value={form.street}
                    onChangeText={(txt) => setForm({ ...form, street: txt })}
                  />
                </View>
              </View>

              <View style={tw('flex-row gap-4 mb-4')}>
                <View style={tw('flex-1')}>
                  <Text
                    style={tw(
                      'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                    )}
                  >
                    {t('mobile.ward', 'Ward')}
                  </Text>
                  <TextInput
                    style={tw(
                      'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium'
                    )}
                    value={form.ward}
                    onChangeText={(txt) => setForm({ ...form, ward: txt })}
                  />
                </View>
                <View style={tw('flex-1')}>
                  <Text
                    style={tw(
                      'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                    )}
                  >
                    {t('mobile.district', 'District')}
                  </Text>
                  <TextInput
                    style={tw(
                      'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium'
                    )}
                    value={form.district}
                    onChangeText={(txt) => setForm({ ...form, district: txt })}
                  />
                </View>
              </View>

              <View>
                <Text
                  style={tw(
                    'text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2'
                  )}
                >
                  {t('mobile.city', 'City')}
                </Text>
                <TextInput
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 h-12 text-slate-900 dark:text-white font-medium'
                  )}
                  value={form.city}
                  onChangeText={(txt) => setForm({ ...form, city: txt })}
                />
              </View>
            </View>

            {/* Preferences */}
            <Text
              style={tw(
                'text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-4 mt-4'
              )}
            >
              {t('mobile.preferences', 'Preferences')}
            </Text>

            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-100 dark:border-slate-800 shadow-sm mb-8'
              )}
            >
              <View style={tw('mb-4 flex-row justify-between items-center')}>
                <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-200')}>
                  {t('mobile.language', 'Language')}
                </Text>
                <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1')}>
                  <TouchableOpacity
                    onPress={() => i18n.changeLanguage('en')}
                    style={tw(
                      `px-4 py-2 rounded-lg ${
                        i18n.language === 'en' || !i18n.language.startsWith('vi')
                          ? 'bg-white dark:bg-slate-700 shadow-sm'
                          : ''
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          i18n.language === 'en' || !i18n.language.startsWith('vi')
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400'
                        }`
                      )}
                    >
                      EN
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => i18n.changeLanguage('vi')}
                    style={tw(
                      `px-4 py-2 rounded-lg ${
                        i18n.language?.startsWith('vi') ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          i18n.language?.startsWith('vi')
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400'
                        }`
                      )}
                    >
                      VI
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-200')}>
                  {t('mobile.dark_mode', 'Dark Mode')}
                </Text>
                <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 rounded-xl p-1')}>
                  <TouchableOpacity
                    onPress={() => setColorScheme('light')}
                    style={tw(
                      `px-4 py-2 rounded-lg ${
                        activeScheme === 'light' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          activeScheme === 'light'
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400'
                        }`
                      )}
                    >
                      {t('mobile.light', 'Light')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setColorScheme('dark')}
                    style={tw(
                      `px-4 py-2 rounded-lg ${
                        activeScheme === 'dark' ? 'bg-white dark:bg-slate-700 shadow-sm' : ''
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          activeScheme === 'dark'
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400'
                        }`
                      )}
                    >
                      {t('mobile.dark', 'Dark')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Save Button */}
            <TouchableOpacity
              onPress={handleSaveProfile}
              disabled={isSaving}
              style={tw(
                'bg-slate-900 dark:bg-white h-14 rounded-2xl items-center justify-center shadow-md'
              )}
            >
              <Text style={tw('text-white dark:text-slate-900 font-bold text-lg')}>
                {isSaving
                  ? t('mobile.saving', 'Saving...')
                  : t('mobile.save_changes', 'Save Changes')}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Avatar Picker Modal */}
      <AvatarPickerModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        currentAvatarUri={avatarUri}
        onSelectAvatar={(uri) => setAvatarUri(uri)}
      />

      {/* Security & Active Sessions Modal (C-05) */}
      <SecuritySessionsModal
        visible={securityModalVisible}
        onClose={() => setSecurityModalVisible(false)}
        onNavigateChangePassword={() => {
          setSecurityModalVisible(false);
          router.push('/(auth)/change-password');
        }}
      />

      {/* Privacy, Data Export & Deletion Modal (C-06) */}
      <PrivacyDataModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
    </SafeAreaView>
  );
}
