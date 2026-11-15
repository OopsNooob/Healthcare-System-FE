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
  Bell,
  Briefcase,
  Building2,
  Calendar,
  Camera,
  ChevronRight,
  Clock,
  Edit3,
  Eye,
  FileText,
  Globe,
  LogOut,
  Mail,
  MapPin,
  Moon,
  Phone,
  Plus,
  RefreshCw,
  Save,
  Shield,
  ShieldCheck,
  Star,
  Sun,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import {
  mobileApi,
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
  mapVerificationUrlsToDocs,
  uploadAndPersistUserAvatar,
  type NormalizedGender,
  type UserAddressFields,
} from '@/utils/userProfile';
import {
  AvatarPickerModal,
  DocUploadModal,
  DocViewerModal,
  DoctorReviewsModal,
  SecuritySessionsModal,
  type VerificationDocument,
} from '@/components/modals';
import { Skeleton } from '@/components/ui/Skeleton';

interface DoctorFormState {
  fullName: string;
  email: string;
  phoneNumber: string;
  gender: NormalizedGender;
  dateOfBirth: string;
  specialty: string;
  workplace: string;
  experienceYears: string;
  address: UserAddressFields;
}

const EMPTY_FORM: DoctorFormState = {
  fullName: '',
  email: '',
  phoneNumber: '',
  gender: '',
  dateOfBirth: '',
  specialty: '',
  workplace: '',
  experienceYears: '',
  address: {
    street: '',
    ward: '',
    district: '',
    city: '',
    country: '',
  },
};

export default function DoctorProfileScreen() {
  const { t, i18n } = useTranslation();
  const { isDark, toggleColorScheme } = useThemeContext();
  const router = useRouter();
  const { logout } = useLogout();
  const updateCurrentUser = useSharedAuthStore((s) => s.updateCurrentUser);

  const [doctorId, setDoctorId] = useState('');
  const [form, setForm] = useState<DoctorFormState>(EMPTY_FORM);
  const [savedForm, setSavedForm] = useState<DoctorFormState>(EMPTY_FORM);
  const [avatarUrl, setAvatarUrl] = useState('');
  const [avatarPublicId, setAvatarPublicId] = useState('');
  const [isOnline, setIsOnline] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState('pending');
  const [verificationDocs, setVerificationDocs] = useState<VerificationDocument[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalReviews, setTotalReviews] = useState(0);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [updatingOnline, setUpdatingOnline] = useState(false);
  const [updatingDocs, setUpdatingDocs] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const [avatarModalVisible, setAvatarModalVisible] = useState(false);
  const [docUploadVisible, setDocUploadVisible] = useState(false);
  const [viewingDoc, setViewingDoc] = useState<VerificationDocument | null>(null);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);
  const [securityModalVisible, setSecurityModalVisible] = useState(false);

  const loadDoctorProfile = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const meRes = await mobileApi.usersGetMe();
        const parsed = extractUserProfileData(meRes);
        setDoctorId(parsed.id);

        const nextForm: DoctorFormState = {
          fullName: parsed.fullName,
          email: parsed.email,
          phoneNumber: parsed.phoneNumber,
          gender: parsed.gender,
          dateOfBirth: parsed.dateOfBirth,
          specialty: parsed.doctorProfile?.specialty ?? '',
          workplace: parsed.doctorProfile?.workplace ?? '',
          experienceYears: parsed.doctorProfile?.experienceYears ?? '',
          address: parsed.address,
        };
        setForm(nextForm);
        setSavedForm(nextForm);
        setAvatarUrl(parsed.avatarUrl);
        setAvatarPublicId(parsed.avatarPublicId);
        setIsOnline(parsed.isOnline);
        setVerificationStatus(parsed.doctorProfile?.verificationStatus ?? 'pending');
        setVerificationDocs(
          mapVerificationUrlsToDocs(
            parsed.doctorProfile?.verificationDocuments ?? [],
            parsed.doctorProfile?.verificationStatus
          )
        );
        setAverageRating(parsed.doctorProfile?.averageRating ?? 0);
        setTotalReviews(parsed.doctorProfile?.totalReviews ?? 0);

        updateCurrentUser({
          name: parsed.fullName || undefined,
          avatar: parsed.avatarUrl || undefined,
        });

        if (parsed.id) {
          try {
            const ratingRes = await mobileApi.reviewsGetDoctorRating({
              params: { doctorId: parsed.id },
            });
            const ratingData = (ratingRes as FeTypes.ReviewsGetDoctorRatingResponse | null)?.data;
            if (ratingData) {
              setAverageRating(ratingData.averageRating ?? 0);
              setTotalReviews(Number(ratingData.totalReviews ?? 0));
            }
          } catch {
            // Keep rating from user profile if rating endpoint fails
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
    void loadDoctorProfile(false);
  }, [loadDoctorProfile]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadDoctorProfile(true);
  }, [loadDoctorProfile]);

  const handleToggleOnline = async (nextValue: boolean) => {
    if (updatingOnline) return;
    const prevValue = isOnline;
    setIsOnline(nextValue);
    setUpdatingOnline(true);
    try {
      await mobileApi.usersUpdateMe({ isOnline: nextValue });
    } catch (err) {
      setIsOnline(prevValue);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.profile_update_failed'),
      });
    } finally {
      setUpdatingOnline(false);
    }
  };

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

    const expNumber = form.experienceYears.trim() ? Number(form.experienceYears.trim()) : undefined;
    if (expNumber !== undefined && (!Number.isFinite(expNumber) || expNumber < 0)) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.invalid_experience_years'),
      });
      return;
    }

    setIsSaving(true);
    try {
      const existingUrls = verificationDocs
        .map((d) => d.remoteUrl || d.uri || '')
        .filter((url) => /^https?:\/\//i.test(url));

      await mobileApi.usersUpdateMe({
        fullName: form.fullName.trim(),
        phoneNumber: form.phoneNumber.trim() || undefined,
        ...(form.gender ? { gender: form.gender } : {}),
        ...(dobTrimmed ? { dateOfBirth: dobTrimmed } : {}),
        specialty: form.specialty.trim() || undefined,
        workplace: form.workplace.trim() || undefined,
        ...(expNumber !== undefined ? { experienceYears: expNumber } : {}),
        address: {
          street: form.address.street.trim(),
          ward: form.address.ward.trim(),
          district: form.address.district.trim(),
          city: form.address.city.trim(),
          country: form.address.country.trim(),
        },
        ...(existingUrls.length > 0
          ? {
              existingVerificationDocuments: existingUrls,
              verificationDocuments: existingUrls,
            }
          : {}),
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

  const syncVerificationDocs = async (nextDocs: VerificationDocument[]) => {
    if (updatingDocs) return;
    setUpdatingDocs(true);
    try {
      const existingUrls = nextDocs
        .map((d) => d.remoteUrl || d.uri || '')
        .filter((url) => /^https?:\/\//i.test(url));

      const localFilesToUpload = nextDocs
        .filter((d) => !/^https?:\/\//i.test(d.remoteUrl || d.uri || '') && Boolean(d.uri))
        .map(
          (d) =>
            ({
              uri: d.uri!,
              name: d.fileName || `document_${Date.now()}.pdf`,
              type: d.mimeType || 'application/pdf',
            }) as unknown as FeTypes.UploadBinary
        );

      let uploadedUrls: string[] = [];
      if (localFilesToUpload.length > 0) {
        const uploadRes = await mobileApi.uploadUploadDoctorVerification({
          files: localFilesToUpload,
        });
        uploadedUrls = (uploadRes?.data?.files ?? [])
          .map((f) => f.secureUrl ?? f.url ?? '')
          .filter(Boolean);
      }

      const mergedUrls = [...existingUrls, ...uploadedUrls];
      await mobileApi.usersUpdateMe({
        existingVerificationDocuments: mergedUrls,
        verificationDocuments: mergedUrls,
      });

      setVerificationDocs(mapVerificationUrlsToDocs(mergedUrls, verificationStatus));
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.docs_updated'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.docs_update_failed'),
      });
    } finally {
      setUpdatingDocs(false);
    }
  };

  const handleRemoveDoc = (doc: VerificationDocument) => {
    if (updatingDocs) return;
    Alert.alert(t('mobile.delete'), t('mobile.confirm_delete_doc'), [
      { text: t('mobile.cancel'), style: 'cancel' },
      {
        text: t('mobile.delete'),
        style: 'destructive',
        onPress: () => {
          const remaining = verificationDocs.filter((item) => item.id !== doc.id);
          void syncVerificationDocs(remaining);
        },
      },
    ]);
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

  const currentLang = i18n.language?.startsWith('vi') ? 'vi' : 'en';

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
            {t('mobile.doctor_profile_title')}
          </Text>
          <View style={tw('flex-row items-center gap-2')}>
            <TouchableOpacity
              onPress={() => router.push('/(doctor)/notifications')}
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
              <Skeleton className="h-6 w-52 rounded-lg" />
              <Skeleton className="h-4 w-40 rounded-lg" />
            </View>
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 gap-3'
              )}
            >
              <Skeleton className="h-5 w-44 rounded-lg" />
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
              <TouchableOpacity
                onPress={() => void loadDoctorProfile(false)}
                style={tw('bg-brand px-5 py-2.5 rounded-full flex-row items-center')}
              >
                <RefreshCw size={15} color="#0f172a" />
                <Text style={tw('text-slate-900 font-bold text-sm ml-1.5')}>
                  {t('mobile.retry')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        ) : (
          <View style={tw('px-5 pt-3 gap-4')}>
            {/* Doctor Hero Card */}
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
                {savedForm.fullName || t('mobile.doctor_role')}
              </Text>
              <Text style={tw('text-sm text-slate-500 dark:text-slate-400 mt-0.5 text-center')}>
                {savedForm.specialty || t('mobile.specialty_not_set')}
              </Text>

              <View style={tw('flex-row items-center gap-2 mt-3')}>
                <View
                  style={tw(
                    `px-3 py-1 rounded-full flex-row items-center ${
                      verificationStatus === 'verified'
                        ? 'bg-emerald-100 dark:bg-emerald-900/30'
                        : verificationStatus === 'rejected'
                          ? 'bg-rose-100 dark:bg-rose-900/30'
                          : 'bg-amber-100 dark:bg-amber-900/30'
                    }`
                  )}
                >
                  <ShieldCheck
                    size={13}
                    color={twInstance.color(
                      verificationStatus === 'verified'
                        ? 'text-emerald-600 dark:text-emerald-400'
                        : verificationStatus === 'rejected'
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-amber-600 dark:text-amber-400'
                    )}
                  />
                  <Text
                    style={tw(
                      `text-xs font-bold ml-1 ${
                        verificationStatus === 'verified'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : verificationStatus === 'rejected'
                            ? 'text-rose-700 dark:text-rose-300'
                            : 'text-amber-700 dark:text-amber-300'
                      }`
                    )}
                  >
                    {t(`mobile.verification_${verificationStatus}`, verificationStatus)}
                  </Text>
                </View>

                <TouchableOpacity
                  onPress={() => setReviewsModalVisible(true)}
                  disabled={!doctorId}
                  style={tw(
                    'px-3 py-1 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800/40 flex-row items-center'
                  )}
                >
                  <Star size={13} color="#f59e0b" fill="#f59e0b" />
                  <Text style={tw('text-xs font-bold text-slate-800 dark:text-amber-200 ml-1')}>
                    {averageRating.toFixed(1)} ({totalReviews})
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Online Status Switch */}
              <View
                style={tw(
                  'mt-4 w-full bg-slate-50 dark:bg-slate-800/70 rounded-2xl px-4 py-3 border border-slate-200 dark:border-slate-700 flex-row items-center justify-between'
                )}
              >
                <View style={tw('flex-1 mr-3')}>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {isOnline
                      ? t('mobile.doctor_online_status')
                      : t('mobile.doctor_offline_status')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {t('mobile.doctor_online_desc')}
                  </Text>
                </View>
                <Switch
                  value={isOnline}
                  disabled={updatingOnline}
                  onValueChange={(v) => void handleToggleOnline(v)}
                  trackColor={{ false: '#cbd5e1', true: '#a3e635' }}
                  thumbColor="#ffffff"
                />
              </View>
            </View>

            {/* Professional & Personal Info */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm gap-3.5'
              )}
            >
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                {t('mobile.doctor_professional_info')}
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
                      {t('mobile.specialty')}
                    </Text>
                    <TextInput
                      value={form.specialty}
                      onChangeText={(v) => setForm((p) => ({ ...p, specialty: v }))}
                      placeholder={t('mobile.specialty')}
                      placeholderTextColor="#94a3b8"
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                    />
                  </View>

                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1')}>
                      {t('mobile.workplace')}
                    </Text>
                    <TextInput
                      value={form.workplace}
                      onChangeText={(v) => setForm((p) => ({ ...p, workplace: v }))}
                      placeholder={t('mobile.workplace')}
                      placeholderTextColor="#94a3b8"
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                    />
                  </View>

                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1')}>
                      {t('mobile.experience_years')}
                    </Text>
                    <TextInput
                      value={form.experienceYears}
                      onChangeText={(v) => setForm((p) => ({ ...p, experienceYears: v }))}
                      keyboardType="numeric"
                      placeholder="0"
                      placeholderTextColor="#94a3b8"
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                    />
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
                      placeholder="1985-05-15"
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
                    <Building2 size={16} color={twInstance.color('text-slate-400')} />
                    <Text style={tw('text-sm text-slate-700 dark:text-slate-200 ml-3 flex-1')}>
                      {savedForm.workplace || t('mobile.not_set')}
                    </Text>
                  </View>
                  <View style={tw('flex-row items-center')}>
                    <Briefcase size={16} color={twInstance.color('text-slate-400')} />
                    <Text style={tw('text-sm text-slate-700 dark:text-slate-200 ml-3 flex-1')}>
                      {savedForm.experienceYears
                        ? `${savedForm.experienceYears} ${t('mobile.years_unit')}`
                        : t('mobile.not_set')}
                    </Text>
                  </View>
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

            {/* Verification Documents */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm'
              )}
            >
              <View style={tw('flex-row items-center justify-between mb-3')}>
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.verification_docs')}
                </Text>
                <TouchableOpacity
                  onPress={() => setDocUploadVisible(true)}
                  disabled={updatingDocs}
                  style={tw(
                    `px-3 py-1.5 rounded-full bg-brand flex-row items-center ${
                      updatingDocs ? 'opacity-60' : ''
                    }`
                  )}
                >
                  {updatingDocs ? (
                    <ActivityIndicator size="small" color="#0f172a" />
                  ) : (
                    <>
                      <Plus size={14} color="#0f172a" />
                      <Text style={tw('text-xs font-bold text-slate-900 ml-1')}>
                        {t('mobile.upload_doc')}
                      </Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>

              {verificationDocs.length === 0 ? (
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                  {t('mobile.no_verification_docs')}
                </Text>
              ) : (
                <View style={tw('gap-2.5')}>
                  {verificationDocs.map((doc) => (
                    <View
                      key={doc.id}
                      style={tw(
                        'p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/70 border border-slate-200 dark:border-slate-700 flex-row items-center justify-between'
                      )}
                    >
                      <View style={tw('flex-row items-center flex-1 mr-2')}>
                        <FileText size={18} color={twInstance.color('text-sky-600 dark:text-sky-400')} />
                        <Text
                          style={tw('text-sm font-medium text-slate-800 dark:text-slate-100 ml-2.5 flex-1')}
                          numberOfLines={1}
                        >
                          {doc.fileName}
                        </Text>
                      </View>
                      <View style={tw('flex-row items-center gap-2')}>
                        <TouchableOpacity
                          onPress={() => setViewingDoc(doc)}
                          style={tw('p-2 rounded-full bg-white dark:bg-slate-700')}
                        >
                          <Eye size={15} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => handleRemoveDoc(doc)}
                          disabled={updatingDocs}
                          style={tw('p-2 rounded-full bg-rose-50 dark:bg-rose-900/30')}
                        >
                          <Trash2 size={15} color={twInstance.color('text-rose-600 dark:text-rose-400')} />
                        </TouchableOpacity>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>

            {/* Consultation Policy & Schedule Link */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-5 border border-slate-200 dark:border-slate-800 shadow-sm'
              )}
            >
              <View style={tw('flex-row items-center mb-3')}>
                <Clock size={18} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white ml-2')}>
                  {t('mobile.consultation_policy_title')}
                </Text>
              </View>
              <Text style={tw('text-sm text-slate-600 dark:text-slate-300 leading-5 mb-3')}>
                {t('mobile.consultation_policy_summary')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(doctor)/schedule')}
                style={tw(
                  'py-3 px-4 rounded-2xl bg-slate-100 dark:bg-slate-800 flex-row items-center justify-between'
                )}
              >
                <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-100')}>
                  {t('mobile.manage_schedule_slots')}
                </Text>
                <ChevronRight
                  size={16}
                  color={twInstance.color('text-slate-500 dark:text-slate-400')}
                />
              </TouchableOpacity>
            </View>

            {/* Security & Preferences */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm gap-4'
              )}
            >
              <TouchableOpacity
                onPress={() => setSecurityModalVisible(true)}
                style={tw('flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800')}
              >
                <View style={tw('flex-row items-center')}>
                  <Shield size={18} color={twInstance.color('text-slate-600 dark:text-slate-300')} />
                  <Text style={tw('text-sm font-medium text-slate-800 dark:text-slate-100 ml-3')}>
                    {t('mobile.security_sessions')}
                  </Text>
                </View>
                <ChevronRight
                  size={16}
                  color={twInstance.color('text-slate-400 dark:text-slate-500')}
                />
              </TouchableOpacity>

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

      <DocUploadModal
        visible={docUploadVisible}
        onClose={() => setDocUploadVisible(false)}
        initialDocuments={verificationDocs}
        uploadImmediately
        onConfirm={(docs) => void syncVerificationDocs(docs)}
      />

      <DocViewerModal
        visible={Boolean(viewingDoc)}
        onClose={() => setViewingDoc(null)}
        fileName={viewingDoc?.fileName}
        fileSize={viewingDoc?.fileSize}
        fileUri={viewingDoc?.remoteUrl || viewingDoc?.uri}
      />

      <DoctorReviewsModal
        visible={reviewsModalVisible}
        onClose={() => setReviewsModalVisible(false)}
        doctorId={doctorId}
        doctorName={savedForm.fullName}
      />

      <SecuritySessionsModal
        visible={securityModalVisible}
        onClose={() => setSecurityModalVisible(false)}
        onNavigateChangePassword={() => router.push('/(auth)/change-password')}
      />
    </SafeAreaView>
  );
}
