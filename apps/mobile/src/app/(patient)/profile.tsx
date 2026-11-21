import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  Activity,
  Bell,
  Building2,
  Calendar,
  Camera,
  CheckCircle2,
  ChevronRight,
  Circle,
  ClipboardList,
  Crown,
  Edit3,
  FileBarChart2,
  Globe,
  Lock,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Stethoscope,
  Sun,
  User,
  Users,
  X,
} from 'lucide-react-native';
import {
  mobileApi,
  normalizePaginatedList,
  useLogout,
  useSharedAuthStore,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  extractUserProfileData,
  formatAddressSummary,
  uploadAndPersistUserAvatar,
  type NormalizedGender,
  type UserAddressFields,
} from '@/utils/userProfile';
import {
  AvatarPickerModal,
  PrivacyDataModal,
  SecuritySessionsModal,
} from '@/components/modals';
import { Skeleton } from '@/components/ui/Skeleton';

type SubscriptionItem = FeTypes.PatientBillingReadSubscriptionsResponse['items'][number];

interface ProfileFormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: NormalizedGender;
  dateOfBirth: string;
  address: UserAddressFields;
}

const EMPTY_FORM: ProfileFormState = {
  fullName: '',
  email: '',
  phoneNumber: '',
  gender: '',
  dateOfBirth: '',
  address: {
    street: '',
    ward: '',
    district: '',
    city: '',
    country: '',
  },
};

export default function PatientProfileScreen() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleColorScheme } = useThemeContext();
  const router = useRouter();
  const { logout } = useLogout();
  const updateCurrentUser = useSharedAuthStore((s) => s.updateCurrentUser);

  const [form, setForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<ProfileFormState>(EMPTY_FORM);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPublicId, setAvatarPublicId] = useState('');
  const [activeSubscription, setActiveSubscription] = useState<SubscriptionItem | null>(null);
  const [usageSummary, setUsageSummary] = useState<FeTypes.PatientBillingReadUsageResponse | null>(
    null
  );
  const [enrollmentDetail, setEnrollmentDetail] =
    useState<FeTypes.CareEnrollmentDetailResponse | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);
  const [privacyModalVisible, setPrivacyModalVisible] = useState(false);

  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const loadProfileData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const [meRes, subsRes, usageRes, enrollListRes] = await Promise.allSettled([
          mobileApi.usersGetMe(),
          mobileApi.patientBillingReadSubscriptions({ query: { page: 1, limit: 10 } }),
          mobileApi.patientBillingReadUsage(),
          mobileApi.careEnrollmentList({
            query: { page: 1, limit: 10, sortBy: 'updatedAt', sortOrder: -1 },
          }),
        ]);

        if (meRes.status !== 'fulfilled') {
          throw meRes.reason;
        }

        const parsed = extractUserProfileData(meRes.value);
        const nextForm: ProfileFormState = {
          fullName: parsed.fullName,
          email: parsed.email,
          phoneNumber: parsed.phoneNumber,
          gender: parsed.gender,
          dateOfBirth: parsed.dateOfBirth,
          address: parsed.address,
        };
        setForm(nextForm);
        setSavedForm(nextForm);
        setAvatarUrl(parsed.avatarUrl);
        setAvatarPublicId(parsed.avatarPublicId);

        updateCurrentUser({
          name: parsed.fullName || undefined,
          avatar: parsed.avatarUrl || undefined,
        });

        if (subsRes.status === 'fulfilled') {
          const subs = normalizePaginatedList<SubscriptionItem>(subsRes.value, 1, 10).items;
          const active =
            subs.find((sub) => sub.status === 'active') ??
            subs.find((sub) => sub.status === 'pending_activation') ??
            subs[0] ??
            null;
          setActiveSubscription(active);
        }

        if (usageRes.status === 'fulfilled') {
          setUsageSummary(usageRes.value);
        }

        if (enrollListRes.status === 'fulfilled') {
          const enrollments = normalizePaginatedList<
            FeTypes.CareEnrollmentListResponse['items'][number]
          >(enrollListRes.value, 1, 10).items;
          const preferred =
            enrollments.find((e) => e.status === 'active') ??
            enrollments.find((e) => e.status === 'pending') ??
            enrollments.find((e) => e.status === 'paused') ??
            null;

          if (preferred?.id) {
            try {
              const detail = await mobileApi.careEnrollmentDetail({
                params: { id: String(preferred.id) },
              });
              setEnrollmentDetail(detail);
            } catch {
              setEnrollmentDetail(null);
            }
          } else {
            setEnrollmentDetail(null);
          }
        }
      } catch (err) {
        setLoadError(extractApiErrorMessage(err, 'mobile.profile_load_failed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [updateCurrentUser]
  );

  useEffect(() => {
    void loadProfileData(false);
  }, [loadProfileData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadProfileData(true);
  }, [loadProfileData]);

  const handleSaveProfile = async () => {
    if (isSaving) return;
    if (!form.fullName.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.full_name_required'),
      });
      return;
    }

    const dobTrimmed = form.dateOfBirth.trim();
    if (dobTrimmed && !/^\d{4}-\d{2}-\d{2}$/.test(dobTrimmed)) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.date_format_hint'),
      });
      return;
    }

    setIsSaving(true);
    try {
      await mobileApi.usersUpdateMe({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        ...(form.gender ? { gender: form.gender } : {}),
        ...(dobTrimmed ? { dateOfBirth: dobTrimmed } : {}),
        address: {
          street: form.address.street.trim(),
          ward: form.address.ward.trim(),
          district: form.address.district.trim(),
          city: form.address.city.trim(),
          country: form.address.country.trim(),
        },
      });
      setSavedForm(form);
      setIsEditing(false);
      updateCurrentUser({ name: form.fullName.trim() });
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.profile_updated'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.profile_update_failed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleAvatarSelected = async (newUri: string) => {
    try {
      const uploaded = await uploadAndPersistUserAvatar({
        uri: newUri,
        previousPublicId: avatarPublicId || undefined,
      });
      setAvatarUrl(uploaded.avatarUrl);
      setAvatarPublicId(uploaded.avatarPublicId);
      updateCurrentUser({ avatar: uploaded.avatarUrl });
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.avatar_updated'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.avatar_upload_failed'),
      });
      throw err;
    }
  };

  const handleLanguageChange = async (lang: 'en' | 'vi') => {
    await AsyncStorage.setItem('app_language', lang).catch(() => {});
    await i18n.changeLanguage(lang);
  };

  const handleLogout = () => {
    if (isLoggingOut) return;
    Alert.alert(t('mobile.logout'), t('mobile.logout_confirm'), [
      { text: t('mobile.cancel'), style: 'cancel' },
      {
        text: t('mobile.logout'),
        style: 'destructive',
        onPress: async () => {
          if (isLoggingOut) return;
          setIsLoggingOut(true);
          try {
            await logout();
            router.replace('/(auth)/login');
          } finally {
            setIsLoggingOut(false);
          }
        },
      },
    ]);
  };

  const currentLang = t('mobile.lang_code', 'vi') === 'en' ? 'en' : 'vi';
  const consentAccepted = Boolean(
    (enrollmentDetail?.consent as Record<string, unknown> | undefined)?.acceptedAt
  );
  const baselineCompleted = Boolean(enrollmentDetail?.baseline?.completedAt);
  const needsOnboardingAction = Boolean(
    enrollmentDetail &&
      (enrollmentDetail.status === 'pending' || !consentAccepted || !baselineCompleted)
  );

  const genderLabel = (g: NormalizedGender) => {
    if (g === 'male') return t('mobile.gender_male');
    if (g === 'female') return t('mobile.gender_female');
    if (g === 'other') return t('mobile.gender_other');
    return t('mobile.not_set');
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      <ScrollView
        contentContainerStyle={tw('pb-24')}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Header Bar */}
        <View style={tw('px-5 pt-4 pb-2 flex-row items-center justify-between')}>
          <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
            {t('mobile.profile_title')}
          </Text>
          <View style={tw('flex-row items-center gap-2')}>
            <TouchableOpacity
              onPress={() => router.push('/(patient)/notifications')}
              style={tw(
                'w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center'
              )}
            >
              <Bell size={19} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
            </TouchableOpacity>
            {isEditing ? (
              <TouchableOpacity
                onPress={() => {
                  setForm(savedForm);
                  setIsEditing(false);
                }}
                disabled={isSaving}
                style={tw(
                  'px-3.5 py-2 rounded-full bg-slate-200 dark:bg-slate-800 flex-row items-center'
                )}
              >
                <X size={15} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200 ml-1')}>
                  {t('mobile.cancel')}
                </Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                onPress={() => setIsEditing(true)}
                disabled={loading}
                style={tw(
                  'px-3.5 py-2 rounded-full bg-brand/15 border border-brand/30 flex-row items-center'
                )}
              >
                <Edit3 size={15} color={twInstance.color('text-slate-900 dark:text-brand')} />
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-brand ml-1.5')}>
                  {t('mobile.edit')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {loading ? (
          <View style={tw('px-5 pt-4 gap-4')}>
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 items-center gap-3'
              )}
            >
              <Skeleton className="h-24 w-24 rounded-full" />
              <Skeleton className="h-6 w-48 rounded-lg" />
              <Skeleton className="h-4 w-36 rounded-lg" />
            </View>
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 gap-3'
              )}
            >
              <Skeleton className="h-5 w-40 rounded-lg" />
              <Skeleton className="h-14 w-full rounded-2xl" />
              <Skeleton className="h-14 w-full rounded-2xl" />
            </View>
          </View>
        ) : loadError ? (
          <View style={tw('px-5 pt-10 items-center')}>
            <View
              style={tw(
                'w-full bg-white dark:bg-slate-900 rounded-3xl p-6 border border-rose-200 dark:border-rose-900/40 items-center'
              )}
            >
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white text-center')}>
                {t('mobile.profile_load_failed')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center mt-1 mb-4')}>
                {loadError}
              </Text>
              <View style={tw('flex-row flex-wrap items-center justify-center gap-3')}>
                <TouchableOpacity
                  onPress={() => void loadProfileData(false)}
                  style={tw('bg-brand px-5 py-2.5 rounded-full flex-row items-center')}
                >
                  <RefreshCw size={15} color="#0f172a" />
                  <Text style={tw('text-slate-900 font-bold text-sm ml-1.5')}>
                    {t('mobile.retry')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleLogout}
                  disabled={isLoggingOut}
                  style={tw(
                    `bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 px-5 py-2.5 rounded-full flex-row items-center ${
                      isLoggingOut ? 'opacity-60' : ''
                    }`
                  )}
                >
                  <LogOut size={15} color={twInstance.color('text-rose-600 dark:text-rose-400')} />
                  <Text style={tw('text-rose-600 dark:text-rose-400 font-bold text-sm ml-1.5')}>
                    {t('mobile.logout')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        ) : (
          <View style={tw('px-5 pt-3 gap-4')}>
            {/* Hero Profile Card */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 items-center shadow-sm'
              )}
            >
              <TouchableOpacity
                onPress={() => setAvatarModalVisible(true)}
                activeOpacity={0.85}
                style={tw('relative mb-3')}
              >
                {avatarUrl ? (
                  <Image
                    source={{ uri: avatarUrl }}
                    style={tw(
                      'w-24 h-24 rounded-full border-4 border-brand bg-slate-200 dark:bg-slate-800'
                    )}
                  />
                ) : (
                  <View
                    style={tw(
                      'w-24 h-24 rounded-full border-4 border-brand bg-slate-100 dark:bg-slate-800 items-center justify-center'
                    )}
                  >
                    <User size={38} color={twInstance.color('text-slate-400 dark:text-slate-500')} />
                  </View>
                )}
                <View
                  style={tw(
                    'absolute bottom-0 right-0 w-8 h-8 rounded-full bg-brand items-center justify-center border-2 border-white dark:border-slate-900'
                  )}
                >
                  <Camera size={14} color="#0f172a" />
                </View>
              </TouchableOpacity>

              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white text-center')}>
                {savedForm.fullName || t('mobile.patient_role')}
              </Text>
              {savedForm.email ? (
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400 mt-0.5')}>
                  {savedForm.email}
                </Text>
              ) : null}

              {/* Subscription Summary Pill */}
              <TouchableOpacity
                onPress={() => router.push('/(patient)/premium')}
                style={tw(
                  'mt-4 w-full bg-amber-50 dark:bg-amber-950/30 rounded-2xl p-3.5 border border-amber-200 dark:border-amber-800/50 flex-row items-center justify-between'
                )}
              >
                <View style={tw('flex-row items-center flex-1 mr-2')}>
                  <View
                    style={tw(
                      'w-10 h-10 rounded-xl bg-amber-500/15 dark:bg-amber-500/20 items-center justify-center mr-3'
                    )}
                  >
                    <Crown size={18} color="#f59e0b" />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-xs text-amber-700 dark:text-amber-300 font-semibold')}>
                      {t('mobile.current_plan')}
                    </Text>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                      {activeSubscription?.plan?.name || t('mobile.free_tier')}
                    </Text>
                    {activeSubscription?.expiresAt ? (
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                        {t('mobile.expires_on')}:{' '}
                        {new Date(activeSubscription.expiresAt).toLocaleDateString(dateLocale)}
                      </Text>
                    ) : usageSummary?.consultations ? (
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                        {t('mobile.consultations_quota', 'Consultations')}:{' '}
                        {usageSummary.consultations.counted} /{' '}
                        {usageSummary.consultations.unlimited
                          ? '∞'
                          : usageSummary.consultations.limit}
                      </Text>
                    ) : null}
                  </View>
                </View>
                <ChevronRight
                  size={18}
                  color={twInstance.color('text-amber-600 dark:text-amber-400')}
                />
              </TouchableOpacity>
            </View>

            {/* Active Care Program Status */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm'
              )}
            >
              <View style={tw('flex-row items-center justify-between mb-3')}>
                <View style={tw('flex-row items-center flex-1 mr-2')}>
                  <ClipboardList
                    size={18}
                    color={twInstance.color('text-emerald-600 dark:text-emerald-400')}
                    style={tw('shrink-0')}
                  />
                  <Text style={tw('text-base font-bold text-slate-900 dark:text-white ml-2 flex-1')}>
                    {t('mobile.care_program_status')}
                  </Text>
                </View>
                {enrollmentDetail ? (
                  <View
                    style={tw(
                      `px-2.5 py-1 rounded-full shrink-0 ${
                        enrollmentDetail.status === 'active'
                          ? 'bg-emerald-100 dark:bg-emerald-900/30'
                          : 'bg-amber-100 dark:bg-amber-900/30'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          enrollmentDetail.status === 'active'
                            ? 'text-emerald-700 dark:text-emerald-300'
                            : 'text-amber-700 dark:text-amber-300'
                        }`
                      )}
                    >
                      {t(`mobile.enrollment_status_${enrollmentDetail.status}`, enrollmentDetail.status)}
                    </Text>
                  </View>
                ) : null}
              </View>

              {enrollmentDetail ? (
                <View style={tw('gap-2.5')}>
                  <Text style={tw('text-sm font-semibold text-slate-800 dark:text-slate-200')}>
                    {enrollmentDetail.program?.name || t('mobile.care_program_default_name')}
                  </Text>

                  <View style={tw('flex-row items-center')}>
                    {consentAccepted ? (
                      <CheckCircle2
                        size={16}
                        color={twInstance.color('text-emerald-500')}
                      />
                    ) : (
                      <Circle size={16} color={twInstance.color('text-slate-400')} />
                    )}
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-300 ml-2')}>
                      {t('mobile.onboarding_consent_step')}
                    </Text>
                  </View>

                  <View style={tw('flex-row items-center')}>
                    {baselineCompleted ? (
                      <CheckCircle2
                        size={16}
                        color={twInstance.color('text-emerald-500')}
                      />
                    ) : (
                      <Circle size={16} color={twInstance.color('text-slate-400')} />
                    )}
                    <Text style={tw('text-sm text-slate-600 dark:text-slate-300 ml-2')}>
                      {t('mobile.onboarding_baseline_step')}
                    </Text>
                  </View>

                  <View style={tw('flex-row gap-2.5 mt-2')}>
                    <TouchableOpacity
                      onPress={() =>
                        router.push({
                          pathname: '/(patient)/baseline-assessment',
                          params: { enrollmentId: enrollmentDetail.id },
                        })
                      }
                      style={tw(
                        'flex-1 py-2.5 px-3 rounded-xl bg-brand items-center justify-center'
                      )}
                    >
                      <Text style={tw('text-xs font-bold text-slate-900')}>
                        {needsOnboardingAction
                          ? t('mobile.continue_onboarding')
                          : t('mobile.view_baseline_info')}
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => router.push('/(patient)/reports')}
                      style={tw(
                        'flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center'
                      )}
                    >
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                        {t('mobile.view_reports')}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ) : (
                <View style={tw('gap-2.5')}>
                  <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                    {t('mobile.no_active_enrollment')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => router.push('/(patient)/my-doctors')}
                    style={tw(
                      'self-start flex-row items-center py-2.5 px-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40'
                    )}
                  >
                    <Stethoscope
                      size={15}
                      color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                      style={tw('mr-1.5')}
                    />
                    <Text
                      numberOfLines={1}
                      style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300 shrink-0')}
                    >
                      {t('mobile.find_doctor')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Personal Information Section */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm gap-3.5'
              )}
            >
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                {t('mobile.personal_info')}
              </Text>

              {isEditing ? (
                <>
                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1')}>
                      {t('mobile.full_name')}
                    </Text>
                    <TextInput
                      value={form.fullName}
                      onChangeText={(v) => setForm((p) => ({ ...p, fullName: v }))}
                      placeholder={t('mobile.full_name')}
                      placeholderTextColor="#94a3b8"
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                    />
                  </View>

                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1')}>
                      {t('mobile.email')}
                    </Text>
                    <View
                      style={tw(
                        'flex-row items-center bg-slate-100 dark:bg-slate-800/60 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5'
                      )}
                    >
                      <TextInput
                        value={form.email || t('mobile.not_set')}
                        editable={false}
                        selectTextOnFocus={false}
                        style={tw('flex-1 text-sm text-slate-500 dark:text-slate-400')}
                      />
                      <Lock size={14} color={twInstance.color('text-slate-400 dark:text-slate-500')} />
                    </View>
                    <Text style={tw('text-[11px] text-slate-400 dark:text-slate-500 mt-1')}>
                      {t('mobile.email_readonly_hint')}
                    </Text>
                  </View>

                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1')}>
                      {t('mobile.phone_number')}
                    </Text>
                    <TextInput
                      value={form.phoneNumber}
                      onChangeText={(v) => setForm((p) => ({ ...p, phoneNumber: v }))}
                      keyboardType="phone-pad"
                      placeholder={t('mobile.phone_number')}
                      placeholderTextColor="#94a3b8"
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                    />
                  </View>

                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1.5')}>
                      {t('mobile.gender')}
                    </Text>
                    <View style={tw('flex-row gap-2')}>
                      {(['male', 'female', 'other'] as const).map((g) => (
                        <TouchableOpacity
                          key={g}
                          onPress={() => setForm((p) => ({ ...p, gender: g }))}
                          style={tw(
                            `flex-1 py-2.5 rounded-xl border items-center ${
                              form.gender === g
                                ? 'bg-brand border-brand'
                                : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                form.gender === g
                                  ? 'text-slate-900'
                                  : 'text-slate-600 dark:text-slate-300'
                              }`
                            )}
                          >
                            {genderLabel(g)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1')}>
                      {t('mobile.date_of_birth')} (YYYY-MM-DD)
                    </Text>
                    <TextInput
                      value={form.dateOfBirth}
                      onChangeText={(v) => setForm((p) => ({ ...p, dateOfBirth: v }))}
                      placeholder="1990-01-31"
                      placeholderTextColor="#94a3b8"
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                    />
                  </View>

                  <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mt-1')}>
                    {t('mobile.address')}
                  </Text>
                  {(
                    [
                      ['street', t('mobile.address_street')],
                      ['ward', t('mobile.address_ward')],
                      ['district', t('mobile.address_district')],
                      ['city', t('mobile.address_city')],
                      ['country', t('mobile.address_country')],
                    ] as const
                  ).map(([field, label]) => (
                    <TextInput
                      key={field}
                      value={form.address[field]}
                      onChangeText={(v) =>
                        setForm((p) => ({
                          ...p,
                          address: { ...p.address, [field]: v },
                        }))
                      }
                      placeholder={label}
                      placeholderTextColor="#94a3b8"
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                    />
                  ))}

                  <TouchableOpacity
                    onPress={() => void handleSaveProfile()}
                    disabled={isSaving}
                    style={tw(
                      `mt-2 bg-brand py-3.5 rounded-2xl items-center justify-center flex-row ${
                        isSaving ? 'opacity-60' : ''
                      }`
                    )}
                  >
                    {isSaving ? (
                      <ActivityIndicator size="small" color="#0f172a" />
                    ) : (
                      <>
                        <Save size={16} color="#0f172a" />
                        <Text style={tw('text-slate-900 font-bold text-sm ml-2')}>
                          {t('mobile.save_changes')}
                        </Text>
                      </>
                    )}
                  </TouchableOpacity>
                </>
              ) : (
                <View style={tw('gap-3')}>
                  <View style={tw('flex-row items-center')}>
                    <Mail size={16} color={twInstance.color('text-slate-400')} />
                    <Text style={tw('text-sm text-slate-700 dark:text-slate-200 ml-3 flex-1')}>
                      {savedForm.email || t('mobile.not_set')}
                    </Text>
                  </View>
                  <View style={tw('flex-row items-center')}>
                    <Phone size={16} color={twInstance.color('text-slate-400')} />
                    <Text style={tw('text-sm text-slate-700 dark:text-slate-200 ml-3 flex-1')}>
                      {savedForm.phoneNumber || t('mobile.not_set')}
                    </Text>
                  </View>
                  <View style={tw('flex-row items-center')}>
                    <User size={16} color={twInstance.color('text-slate-400')} />
                    <Text style={tw('text-sm text-slate-700 dark:text-slate-200 ml-3 flex-1')}>
                      {genderLabel(savedForm.gender)}
                    </Text>
                  </View>
                  <View style={tw('flex-row items-center')}>
                    <Calendar size={16} color={twInstance.color('text-slate-400')} />
                    <Text style={tw('text-sm text-slate-700 dark:text-slate-200 ml-3 flex-1')}>
                      {savedForm.dateOfBirth || t('mobile.not_set')}
                    </Text>
                  </View>
                  <View style={tw('flex-row items-start')}>
                    <MapPin size={16} color={twInstance.color('text-slate-400')} style={tw('mt-0.5')} />
                    <Text style={tw('text-sm text-slate-700 dark:text-slate-200 ml-3 flex-1')}>
                      {formatAddressSummary(savedForm.address) || t('mobile.not_set')}
                    </Text>
                  </View>
                </View>
              )}
            </View>

            {/* Quick Links */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-2 border border-slate-200 dark:border-slate-800 shadow-sm'
              )}
            >
              {[
                {
                  icon: Activity,
                  label: t('mobile.health_metrics'),
                  onPress: () => router.push('/(patient)/health-metric'),
                },
                {
                  icon: FileBarChart2,
                  label: t('mobile.health_reports'),
                  onPress: () => router.push('/(patient)/reports'),
                },
                {
                  icon: Users,
                  label: t('mobile.family_members'),
                  onPress: () => router.push('/(patient)/family'),
                },
                {
                  icon: Building2,
                  label: t('mobile.medical_facilities'),
                  onPress: () => router.push('/(patient)/facilities'),
                },
                {
                  icon: Shield,
                  label: t('mobile.security_sessions'),
                  onPress: () => setSecurityModalVisible(true),
                },
                {
                  icon: ShieldCheck,
                  label: t('mobile.privacy_data'),
                  onPress: () => setPrivacyModalVisible(true),
                },
              ].map((item, idx) => (
                <TouchableOpacity
                  key={item.label}
                  onPress={item.onPress}
                  style={tw(
                    `flex-row items-center justify-between px-3.5 py-3.5 ${
                      idx > 0 ? 'border-t border-slate-100 dark:border-slate-800' : ''
                    }`
                  )}
                >
                  <View style={tw('flex-row items-center')}>
                    <item.icon
                      size={18}
                      color={twInstance.color('text-slate-600 dark:text-slate-300')}
                    />
                    <Text style={tw('text-sm font-medium text-slate-800 dark:text-slate-100 ml-3')}>
                      {item.label}
                    </Text>
                  </View>
                  <ChevronRight
                    size={16}
                    color={twInstance.color('text-slate-400 dark:text-slate-500')}
                  />
                </TouchableOpacity>
              ))}
            </View>

            {/* App Settings: Theme & Language */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm gap-4'
              )}
            >
              <View style={tw('flex-row items-center justify-between')}>
                <View style={tw('flex-row items-center')}>
                  {isDark ? (
                    <Moon size={18} color={twInstance.color('text-indigo-400')} />
                  ) : (
                    <Sun size={18} color={twInstance.color('text-amber-500')} />
                  )}
                  <Text style={tw('text-sm font-medium text-slate-800 dark:text-slate-100 ml-3')}>
                    {t('mobile.dark_mode')}
                  </Text>
                </View>
                <Switch
                  value={isDark}
                  onValueChange={toggleColorScheme}
                  trackColor={{ false: '#cbd5e1', true: '#a3e635' }}
                  thumbColor="#ffffff"
                />
              </View>

              <View style={tw('pt-3 border-t border-slate-100 dark:border-slate-800')}>
                <View style={tw('flex-row items-center mb-2.5')}>
                  <Globe size={18} color={twInstance.color('text-slate-600 dark:text-slate-300')} />
                  <Text style={tw('text-sm font-medium text-slate-800 dark:text-slate-100 ml-3')}>
                    {t('mobile.language')}
                  </Text>
                </View>
                <View style={tw('flex-row gap-2.5')}>
                  <TouchableOpacity
                    onPress={() => void handleLanguageChange('vi')}
                    style={tw(
                      `flex-1 py-2.5 rounded-xl border items-center ${
                        currentLang === 'vi'
                          ? 'bg-brand border-brand'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          currentLang === 'vi'
                            ? 'text-slate-900'
                            : 'text-slate-600 dark:text-slate-300'
                        }`
                      )}
                    >
                      {t('mobile.lang_vi')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleLanguageChange('en')}
                    style={tw(
                      `flex-1 py-2.5 rounded-xl border items-center ${
                        currentLang === 'en'
                          ? 'bg-brand border-brand'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          currentLang === 'en'
                            ? 'text-slate-900'
                            : 'text-slate-600 dark:text-slate-300'
                        }`
                      )}
                    >
                      {t('mobile.lang_en')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Logout */}
            <TouchableOpacity
              onPress={handleLogout}
              disabled={isLoggingOut}
              style={tw(
                `bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/50 rounded-2xl py-3.5 flex-row items-center justify-center ${
                  isLoggingOut ? 'opacity-60' : ''
                }`
              )}
            >
              {isLoggingOut ? (
                <ActivityIndicator size="small" color={twInstance.color('text-rose-600')} />
              ) : (
                <>
                  <LogOut size={18} color={twInstance.color('text-rose-600 dark:text-rose-400')} />
                  <Text style={tw('text-rose-600 dark:text-rose-400 font-bold text-sm ml-2')}>
                    {t('mobile.logout')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>

      <AvatarPickerModal
        visible={avatarModalVisible}
        onClose={() => setAvatarModalVisible(false)}
        currentAvatarUri={avatarUrl}
        onSelectAvatar={handleAvatarSelected}
      />

      <SecuritySessionsModal
        visible={securityModalVisible}
        onClose={() => setSecurityModalVisible(false)}
        onNavigateChangePassword={() =>
          router.push({
            pathname: '/(auth)/forgot-password',
            params: { email: savedForm.email || '' },
          })
        }
      />

      <PrivacyDataModal
        visible={privacyModalVisible}
        onClose={() => setPrivacyModalVisible(false)}
      />
    </SafeAreaView>
  );
}
