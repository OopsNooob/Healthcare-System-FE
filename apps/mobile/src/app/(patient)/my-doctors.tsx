import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Image,
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
import { useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import {
  ArrowRight,
  Calendar,
  Clock,
  Globe,
  Mail,
  MapPin,
  MessageCircle,
  Phone,
  Search,
  ShieldCheck,
  Star,
  UserX,
  X,
  Zap,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { bookingPolicyLabel, timezoneLabel } from '@/utils/bookingLabels';
import { DoctorReviewsModal } from '@/components/modals';
import {
  generateIdempotencyKey,
  mobileApi,
  normalizePaginatedList,
  presenceSocket,
  SOCKET_EVENTS,
  type FeTypes,
} from '@repo/shared-hooks';

type DoctorRelationStatus = 'unrequested' | 'pending' | 'accepted';

interface DoctorItem {
  id: string;
  name: string;
  specialty: string;
  workplace: string;
  rating: number;
  reviewCount: number;
  avatarUrl: string;
  lastVisit: string;
  status: DoctorRelationStatus;
  latestConsultationId?: string;
  experienceYears: number;
  email: string;
  phone: string;
  timezone: string;
  bookingPolicy: string;
  isOnline: boolean;
  verificationStatus: string;
}

interface AvailableSlotItem {
  id: string;
  startAt: string;
  endAt: string;
  timezone: string;
  dateKey: string;
  dateLabel: string;
  timeLabel: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function MyDoctorsScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const router = useRouter();
  const params = useLocalSearchParams<{ search?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [doctors, setDoctors] = useState<DoctorItem[]>([]);

  const [selectedDoctor, setSelectedDoctor] = useState<DoctorItem | null>(null);
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);

  const [bookingMode, setBookingMode] = useState<'scheduled' | 'on_demand'>('scheduled');
  const [patientNote, setPatientNote] = useState('');
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState<string | null>(null);
  const [availableSlots, setAvailableSlots] = useState<AvailableSlotItem[]>([]);
  const [selectedDateKey, setSelectedDateKey] = useState<string>('');
  const [selectedSlotId, setSelectedSlotId] = useState<string>('');
  const [submittingBooking, setSubmittingBooking] = useState(false);

  const loadDoctors = useCallback(
    async (isRefresh = false, queryText = searchQuery) => {
      if (!isRefresh) setLoading(true);
      setErrorMsg(null);
      try {
        const trimmed = queryText.trim();
        const [doctorsRes, consultationsRes] = await Promise.all([
          mobileApi.usersSearchDoctors({
            query: {
              page: 1,
              limit: 40,
              sortOrder: -1,
              ...(trimmed.length >= 2 ? { search: trimmed } : {}),
            } as FeTypes.UsersSearchDoctorsRequest['query'],
          }),
          mobileApi
            .consultationsFindAll({ query: { page: 1, limit: 50, sortOrder: -1 } })
            .catch(() => null),
        ]);

        const pageData = normalizePaginatedList<Record<string, unknown>>(doctorsRes);
        const rawDoctors = pageData.items;

        const consultationMap = new Map<
          string,
          { status: DoctorRelationStatus; latestConsultationId?: string; lastCompletedAt?: string }
        >();
        const consultItems = normalizePaginatedList<Record<string, unknown>>(consultationsRes).items;
        for (const c of consultItems) {
          const docRaw = c.doctorId;
          const docId =
            docRaw && typeof docRaw === 'object'
              ? String((docRaw as Record<string, unknown>)._id ?? (docRaw as Record<string, unknown>).id ?? '')
              : String(docRaw ?? '');
          if (!docId) continue;

          const reqStatus = String(c.requestStatus ?? '');
          const sesStatus = String(c.sessionStatus ?? '');
          const cId = String(c._id ?? c.id ?? '');
          const prev = consultationMap.get(docId) ?? { status: 'unrequested' as DoctorRelationStatus };

          let nextStatus = prev.status;
          if (reqStatus === 'accepted') {
            nextStatus = 'accepted';
          } else if (reqStatus === 'pending' && prev.status === 'unrequested') {
            nextStatus = 'pending';
          }

          let lastCompletedAt = prev.lastCompletedAt;
          if (!lastCompletedAt && sesStatus === 'completed' && c.completedAt) {
            lastCompletedAt = String(c.completedAt);
          }

          consultationMap.set(docId, {
            status: nextStatus,
            latestConsultationId: prev.latestConsultationId || cId || undefined,
            lastCompletedAt,
          });
        }

        const doctorIds = rawDoctors
          .map((d) => String(d._id ?? d.id ?? ''))
          .filter(Boolean);

        let onlineSet = new Set<string>();
        if (doctorIds.length > 0) {
          try {
            const presenceRes = await mobileApi.presenceCheckUsersStatus({
              body: { userIds: doctorIds },
            } as unknown as FeTypes.PresenceCheckUsersStatusRequest);
            const ids = presenceRes?.data?.onlineUserIds ?? [];
            onlineSet = new Set(ids.map((v) => String(v)));
          } catch {
            // Presence check is non-blocking; fallback to user.isOnline
          }
        }

        const mapped: DoctorItem[] = rawDoctors.map((doc) => {
          const id = String(doc._id ?? doc.id ?? '');
          const dp = (doc.doctorProfile ?? {}) as Record<string, unknown>;
          const rel = consultationMap.get(id);
          const lastVisit = rel?.lastCompletedAt
            ? new Date(rel.lastCompletedAt).toLocaleDateString(dateLocale, {
                day: '2-digit',
                month: 'short',
                year: 'numeric',
              })
            : t('mobile.no_prior_visit', 'First consultation');

          return {
            id,
            name: String(doc.fullName ?? ''),
            specialty: String(dp.specialty ?? t('mobile.specialty_general_practitioner', 'General Practitioner')),
            workplace: String(dp.workplace ?? t('mobile.workplace_not_listed', 'Clinic not listed')),
            rating: Number(dp.averageRating ?? 0),
            reviewCount: Number(dp.reviewCount ?? 0),
            avatarUrl: String(doc.avatarUrl ?? ''),
            lastVisit,
            status: rel?.status ?? 'unrequested',
            latestConsultationId: rel?.latestConsultationId,
            experienceYears: Number(dp.experienceYears ?? 0),
            email: String(doc.email ?? ''),
            phone: String(doc.phoneNumber ?? ''),
            timezone: 'Asia/Ho_Chi_Minh',
            bookingPolicy: 'instant',
            isOnline: onlineSet.has(id) || Boolean(doc.isOnline),
            verificationStatus: String(dp.verificationStatus ?? 'approved'),
          };
        });

        setDoctors(mapped);
      } catch (err) {
        setErrorMsg(extractApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [dateLocale, searchQuery, t],
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      void loadDoctors(false, searchQuery);
    }, 250);
    return () => clearTimeout(timer);
  }, [searchQuery, loadDoctors]);

  useEffect(() => {
    const onStatusChanged = (payload: FeTypes.RealtimePresenceChanged) => {
      if (!payload?.userId) return;
      setDoctors((prev) =>
        prev.map((d) =>
          d.id === payload.userId ? { ...d, isOnline: payload.status === 'online' } : d,
        ),
      );
      setSelectedDoctor((prev) =>
        prev && prev.id === payload.userId
          ? { ...prev, isOnline: payload.status === 'online' }
          : prev,
      );
    };

    presenceSocket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, onStatusChanged);
    return () => {
      presenceSocket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, onStatusChanged);
    };
  }, []);

  const loadDoctorSlots = useCallback(
    async (doctorId: string) => {
      setSlotsLoading(true);
      setSlotsError(null);
      setAvailableSlots([]);
      setSelectedDateKey('');
      setSelectedSlotId('');
      try {
        const now = new Date();
        const twoWeeksLater = new Date(now.getTime() + 14 * 86400_000);
        const res = await mobileApi.availabilitySlotsListAvailable({
          params: { doctorId },
          query: {
            from: now.toISOString(),
            to: twoWeeksLater.toISOString(),
            page: 1,
            limit: 100,
          },
        });
        const items = normalizePaginatedList<Record<string, unknown>>(res).items;
        const parsed: AvailableSlotItem[] = items
          .filter((slot) => !slot.status || slot.status === 'available')
          .map((slot) => {
            const startAt = String(slot.startAt ?? '');
            const endAt = String(slot.endAt ?? '');
            const tz = String(slot.timezone ?? 'Asia/Ho_Chi_Minh');
            const startDate = new Date(startAt);
            const y = startDate.getFullYear();
            const m = String(startDate.getMonth() + 1).padStart(2, '0');
            const d = String(startDate.getDate()).padStart(2, '0');
            const dateKey = `${y}-${m}-${d}`;
            return {
              id: String(slot.id ?? slot._id ?? ''),
              startAt,
              endAt,
              timezone: tz,
              dateKey,
              dateLabel: startDate.toLocaleDateString(dateLocale, {
                month: 'short',
                day: '2-digit',
              }),
              timeLabel: startDate.toLocaleTimeString(dateLocale, {
                hour: '2-digit',
                minute: '2-digit',
              }),
            };
          })
          .filter((slot) => Boolean(slot.id && slot.startAt));

        setAvailableSlots(parsed);
        if (parsed.length > 0) {
          setSelectedDateKey(parsed[0].dateKey);
          setSelectedSlotId(parsed[0].id);
        }
      } catch (err) {
        setSlotsError(extractApiErrorMessage(err));
      } finally {
        setSlotsLoading(false);
      }
    },
    [dateLocale],
  );

  const filteredDoctors = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return doctors;
    return doctors.filter(
      (doc) =>
        doc.name.toLowerCase().includes(q) ||
        doc.specialty.toLowerCase().includes(q) ||
        doc.workplace.toLowerCase().includes(q),
    );
  }, [doctors, searchQuery]);

  const dateGroups = useMemo(() => {
    const map = new Map<string, { dateKey: string; dateLabel: string; slots: AvailableSlotItem[] }>();
    for (const slot of availableSlots) {
      const existing = map.get(slot.dateKey);
      if (existing) {
        existing.slots.push(slot);
      } else {
        map.set(slot.dateKey, { dateKey: slot.dateKey, dateLabel: slot.dateLabel, slots: [slot] });
      }
    }
    return Array.from(map.values());
  }, [availableSlots]);

  const visibleSlotsForSelectedDate = useMemo(() => {
    const found = dateGroups.find((g) => g.dateKey === selectedDateKey);
    return found ? found.slots : [];
  }, [dateGroups, selectedDateKey]);

  const handleOpenProfile = async (doc: DoctorItem) => {
    setSelectedDoctor(doc);
    setProfileModalVisible(true);
    setProfileLoading(true);
    try {
      const [profileRes, ratingRes] = await Promise.all([
        mobileApi.usersFindProfile({ params: { id: doc.id } }).catch(() => null),
        mobileApi.reviewsGetDoctorRating({ params: { doctorId: doc.id } }).catch(() => null),
      ]);
      const p = profileRes as FeTypes.UsersFindProfileResponse | null;
      const r = (ratingRes as FeTypes.ReviewsGetDoctorRatingResponse | null)?.data;
      setSelectedDoctor((prev) => {
        if (!prev || prev.id !== doc.id) return prev;
        return {
          ...prev,
          name: p?.full_name || prev.name,
          avatarUrl: p?.avatar_url || prev.avatarUrl,
          email: p?.email || prev.email,
          phone: p?.phone_number || prev.phone,
          specialty: p?.role_specific?.specialty || prev.specialty,
          workplace: p?.role_specific?.workplace || p?.address_display || prev.workplace,
          experienceYears: p?.role_specific?.experience_years ?? prev.experienceYears,
          verificationStatus: p?.role_specific?.verification_status || prev.verificationStatus,
          rating: r?.averageRating ?? p?.doctor_review_metrics?.average_rating ?? prev.rating,
          reviewCount:
            typeof r?.totalReviews === 'number'
              ? r.totalReviews
              : p?.doctor_review_metrics?.total_reviews ?? prev.reviewCount,
        };
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleOpenRequest = (doc: DoctorItem, mode: 'scheduled' | 'on_demand' = 'scheduled') => {
    setSelectedDoctor(doc);
    setBookingMode(mode);
    setPatientNote('');
    setRequestModalVisible(true);
    void loadDoctorSlots(doc.id);
  };

  const handleSendRequest = async () => {
    if (!selectedDoctor || submittingBooking) return;
    if (bookingMode === 'scheduled' && !selectedSlotId) {
      Toast.show({
        type: 'info',
        text1: t('mobile.select_time_slot', 'Select Time Slot'),
      });
      return;
    }
    if (bookingMode === 'on_demand' && !patientNote.trim()) {
      Toast.show({
        type: 'info',
        text1: t('mobile.reason_for_consultation', 'Consultation Reason'),
      });
      return;
    }

    setSubmittingBooking(true);
    try {
      if (bookingMode === 'scheduled') {
        const res = await mobileApi.consultationsCreateScheduled({
          headers: { 'Idempotency-Key': generateIdempotencyKey('book') },
          body: {
            availabilitySlotId: selectedSlotId,
            ...(patientNote.trim() ? { patientNotes: patientNote.trim() } : {}),
          },
        });
        const createdId = res?.data?.id;
        const bookedSlot = availableSlots.find((s) => s.id === selectedSlotId);
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === selectedDoctor.id
              ? { ...d, status: 'accepted', latestConsultationId: createdId || d.latestConsultationId }
              : d,
          ),
        );
        setRequestModalVisible(false);
        Toast.show({
          type: 'success',
          text1: t('mobile.slot_booked_instant', 'Appointment booked'),
          text2: bookedSlot
            ? `${bookedSlot.dateLabel} • ${bookedSlot.timeLabel} (${timezoneLabel(bookedSlot.timezone)})`
            : t('mobile.consultation_request_sent_success', 'Your consultation has been scheduled.'),
        });
      } else {
        const res = await mobileApi.consultationsCreate({
          doctorId: selectedDoctor.id,
          expectedDurationMinutes: 30,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh',
          patientNotes: patientNote.trim(),
        });
        const createdObj = (res?.data ?? {}) as Record<string, unknown>;
        const createdId = String(createdObj._id ?? createdObj.id ?? '');
        setDoctors((prev) =>
          prev.map((d) =>
            d.id === selectedDoctor.id
              ? { ...d, status: 'pending', latestConsultationId: createdId || d.latestConsultationId }
              : d,
          ),
        );
        setRequestModalVisible(false);
        Toast.show({
          type: 'success',
          text1: t('mobile.request_sent', 'Request Sent'),
          text2: t(
            'mobile.consultation_request_sent_success',
            'Your consultation request has been sent to the doctor.',
          ),
        });
      }
      void loadDoctors(true, searchQuery);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Booking failed'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSubmittingBooking(false);
    }
  };

  const renderSkeleton = () => (
    <View
      style={tw(
        'bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800',
      )}
    >
      <View style={tw('flex-row gap-4')}>
        <Skeleton className="w-20 h-20 rounded-2xl" />
        <View style={tw('flex-1 justify-center gap-2')}>
          <Skeleton className="w-32 h-5 rounded-md" />
          <Skeleton className="w-24 h-4 rounded-md" />
          <Skeleton className="w-40 h-4 rounded-md" />
        </View>
      </View>
      <View style={tw('w-full h-[1px] bg-slate-100 dark:bg-slate-800 my-4')} />
      <View style={tw('flex-row justify-between items-center')}>
        <Skeleton className="w-32 h-4 rounded-md" />
        <Skeleton className="w-24 h-9 rounded-full" />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-20 px-6')}>
      <View
        style={tw(
          'w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-6',
        )}
      >
        <UserX color="#94a3b8" size={40} />
      </View>
      <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-2 text-center')}>
        {t('mobile.no_doctors_found', 'No doctors found')}
      </Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 text-center mb-8')}>
        {searchQuery.length > 0
          ? t(
              'mobile.no_doctors_matching_search',
              'We could not find any doctors matching your search.',
              { searchQuery },
            )
          : t('mobile.no_doctors_available_yet', 'No verified specialists are currently listed.')}
      </Text>
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={() => setSearchQuery('')}
          style={tw('bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl')}
        >
          <Text style={tw('text-slate-900 dark:text-white font-bold')}>
            {t('mobile.clear_search', 'Clear Search')}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView
        contentContainerStyle={tw('pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => {
              setRefreshing(true);
              void loadDoctors(true, searchQuery);
            }}
            tintColor="#0f172a"
            colors={['#0f172a']}
          />
        }
      >
        {/* Header */}
        <View style={tw('px-6 pt-6 pb-4')}>
          <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
            {t('mobile.my_doctors', 'My Doctors')}
          </Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-sm mt-1')}>
            {t('mobile.find_and_connect_with_verified', 'Find and connect with verified specialists')}
          </Text>

          <View
            style={tw(
              'mt-4 flex-row items-center bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm',
            )}
          >
            <Search color="#94a3b8" size={20} style={tw('mr-2')} />
            <TextInput
              style={tw('flex-1 text-base text-slate-900 dark:text-white')}
              placeholder={t('mobile.search_by_name_or_specialty', 'Search by name or specialty...')}
              placeholderTextColor="#94a3b8"
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            {searchQuery.length > 0 && (
              <TouchableOpacity onPress={() => setSearchQuery('')}>
                <X color="#94a3b8" size={20} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Doctors List */}
        <View style={tw('px-6 gap-4 mt-2')}>
          {loading ? (
            <>
              {renderSkeleton()}
              {renderSkeleton()}
              {renderSkeleton()}
            </>
          ) : errorMsg ? (
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-3xl p-6 items-center border border-slate-200 dark:border-slate-800',
              )}
            >
              <Text style={tw('text-sm text-red-500 text-center mb-4')}>{errorMsg}</Text>
              <TouchableOpacity
                onPress={() => void loadDoctors(false, searchQuery)}
                style={tw('bg-brand px-6 py-3 rounded-2xl')}
              >
                <Text style={tw('text-slate-900 font-bold text-sm')}>
                  {t('mobile.retry', 'Retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={tw(
                  'bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800',
                )}
                onPress={() => void handleOpenProfile(doc)}
                activeOpacity={0.7}
              >
                <View style={tw('flex-row gap-4')}>
                  <View style={tw('relative')}>
                    {doc.avatarUrl ? (
                      <Image
                        source={{ uri: doc.avatarUrl }}
                        style={tw('w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700')}
                      />
                    ) : (
                      <View
                        style={tw(
                          'w-20 h-20 rounded-2xl bg-slate-100 dark:bg-slate-800 items-center justify-center',
                        )}
                      >
                        <Text style={tw('text-lg font-bold text-slate-600 dark:text-slate-300')}>
                          {getInitials(doc.name)}
                        </Text>
                      </View>
                    )}
                    <View
                      style={tw(
                        `w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 absolute -top-1 -right-1 ${
                          doc.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`,
                      )}
                    />
                  </View>
                  <View style={tw('flex-1 justify-center')}>
                    <View style={tw('flex-row justify-between items-start mb-1')}>
                      <Text
                        style={tw('text-lg font-bold text-slate-900 dark:text-white flex-1 mr-2')}
                        numberOfLines={1}
                      >
                        {doc.name}
                      </Text>
                      <View style={tw('flex-row items-center gap-1')}>
                        <Star color="#f59e0b" fill="#f59e0b" size={14} />
                        <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-200')}>
                          {doc.rating.toFixed(1)}
                        </Text>
                      </View>
                    </View>

                    <Text style={tw('text-brand font-medium mb-1')}>{doc.specialty}</Text>

                    <View style={tw('flex-row items-center gap-1')}>
                      <MapPin color="#94a3b8" size={14} />
                      <Text
                        style={tw('text-xs text-slate-500 dark:text-slate-400 flex-1')}
                        numberOfLines={1}
                      >
                        {doc.workplace}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={tw('w-full h-[1px] bg-slate-100 dark:bg-slate-800 my-4')} />

                <View style={tw('flex-row justify-between items-center')}>
                  <View style={tw('flex-1 mr-2')}>
                    <Text
                      style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium')}
                      numberOfLines={1}
                    >
                      {t('mobile.last_visit', 'Last visit')}: {doc.lastVisit}
                    </Text>
                    <Text style={tw('text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5')}>
                      {bookingPolicyLabel(doc.bookingPolicy)} • {timezoneLabel(doc.timezone)}
                    </Text>
                  </View>

                  <View style={tw('flex-row gap-2 shrink-0')}>
                    {doc.status === 'accepted' && (
                      <>
                        <TouchableOpacity
                          style={tw('w-10 h-10 rounded-full bg-brand/10 items-center justify-center')}
                          onPress={() =>
                            router.push(
                              doc.latestConsultationId
                                ? `/(patient)/doctor-chat?consultationId=${doc.latestConsultationId}&doctorId=${doc.id}`
                                : `/(patient)/doctor-chat?doctorId=${doc.id}`,
                            )
                          }
                        >
                          <MessageCircle color="#a3e635" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={tw(
                            'px-3.5 py-2 rounded-full bg-brand items-center justify-center flex-row',
                          )}
                          onPress={() => handleOpenRequest(doc, 'scheduled')}
                        >
                          <Calendar color="#0f172a" size={14} style={tw('mr-1')} />
                          <Text style={tw('text-slate-900 font-bold text-xs')}>
                            {t('mobile.book_slot', 'Book Slot')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {doc.status === 'pending' && (
                      <View
                        style={tw(
                          'flex-row items-center px-3.5 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-800 shrink-0',
                        )}
                      >
                        <Clock color="#d97706" size={14} />
                        <Text
                          style={tw(
                            'text-amber-600 dark:text-amber-400 font-semibold text-xs ml-1.5',
                          )}
                          numberOfLines={1}
                        >
                          {t('mobile.pending', 'Pending')}
                        </Text>
                      </View>
                    )}
                    {doc.status === 'unrequested' && (
                      <TouchableOpacity
                        style={tw('flex-row items-center px-4 py-2 bg-brand rounded-full shrink-0')}
                        onPress={() => handleOpenRequest(doc, 'scheduled')}
                      >
                        <Text style={tw('text-slate-900 font-bold text-sm')} numberOfLines={1}>
                          {t('mobile.request', 'Request')}
                        </Text>
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
              </TouchableOpacity>
            ))
          ) : (
            renderEmptyState()
          )}
        </View>
      </ScrollView>

      {/* Doctor Profile Modal */}
      <Modal
        visible={profileModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setProfileModalVisible(false)}
      >
        <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
          <View
            style={tw(
              'flex-row items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800',
            )}
          >
            <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
              {t('mobile.doctor_profile', 'Doctor Profile')}
            </Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={tw('p-2')}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          {selectedDoctor && (
            <ScrollView contentContainerStyle={tw('p-6')} showsVerticalScrollIndicator={false}>
              <View style={tw('items-center mb-8')}>
                {selectedDoctor.avatarUrl ? (
                  <Image
                    source={{ uri: selectedDoctor.avatarUrl }}
                    style={tw(
                      'w-32 h-32 rounded-full mb-4 border-4 border-white dark:border-slate-800 shadow-sm bg-slate-200 dark:bg-slate-700',
                    )}
                  />
                ) : (
                  <View
                    style={tw(
                      'w-32 h-32 rounded-full mb-4 border-4 border-white dark:border-slate-800 shadow-sm bg-slate-200 dark:bg-slate-800 items-center justify-center',
                    )}
                  >
                    <Text style={tw('text-3xl font-bold text-slate-700 dark:text-slate-200')}>
                      {getInitials(selectedDoctor.name)}
                    </Text>
                  </View>
                )}
                <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
                  {selectedDoctor.name}
                </Text>
                <Text style={tw('text-base text-brand font-medium mb-2')}>
                  {selectedDoctor.specialty}
                </Text>

                <View style={tw('flex-row gap-2 mt-2')}>
                  <View
                    style={tw(
                      'bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800 flex-row items-center',
                    )}
                  >
                    <ShieldCheck color="#3b82f6" size={14} />
                    <Text style={tw('text-blue-600 dark:text-blue-300 font-bold text-xs ml-1')}>
                      {t('mobile.verified', 'Verified')}
                    </Text>
                  </View>
                  <View
                    style={tw(
                      'bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 flex-row items-center',
                    )}
                  >
                    <Globe color="#10b981" size={13} />
                    <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold text-xs ml-1')}>
                      {timezoneLabel(selectedDoctor.timezone)}
                    </Text>
                  </View>
                </View>
              </View>

              {profileLoading ? (
                <View style={tw('gap-3 mb-6')}>
                  <Skeleton className="h-24 w-full rounded-2xl" />
                  <Skeleton className="h-44 w-full rounded-2xl" />
                </View>
              ) : (
                <>
                  <TouchableOpacity
                    onPress={() => {
                      setProfileModalVisible(false);
                      setTimeout(() => setReviewsModalVisible(true), 250);
                    }}
                    style={tw(
                      'flex-row bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 mb-6 shadow-sm',
                    )}
                  >
                    <View
                      style={tw('flex-1 items-center border-r border-slate-100 dark:border-slate-800')}
                    >
                      <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white')}>
                        {selectedDoctor.rating.toFixed(1)}
                      </Text>
                      <View style={tw('flex-row my-1')}>
                        {[1, 2, 3, 4, 5].map((i) => (
                          <Star
                            key={i}
                            color="#f59e0b"
                            fill={i <= Math.round(selectedDoctor.rating) ? '#f59e0b' : 'transparent'}
                            size={12}
                          />
                        ))}
                      </View>
                      <Text style={tw('text-xs text-indigo-600 dark:text-indigo-400 font-bold')}>
                        {selectedDoctor.reviewCount} {t('mobile.reviews', 'reviews')} →
                      </Text>
                    </View>
                    <View style={tw('flex-1 items-center justify-center')}>
                      <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white')}>
                        {selectedDoctor.experienceYears}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 font-medium mt-2')}>
                        {t('mobile.years_exp', 'Years Exp.')}
                      </Text>
                    </View>
                  </TouchableOpacity>

                  <Text
                    style={tw(
                      'text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3',
                    )}
                  >
                    {t('mobile.professional_info', 'Professional Info')}
                  </Text>
                  <View
                    style={tw(
                      'bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden mb-6',
                    )}
                  >
                    <View
                      style={tw('flex-row items-center p-4 border-b border-slate-50 dark:border-slate-800')}
                    >
                      <View
                        style={tw(
                          'w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center mr-3',
                        )}
                      >
                        <MapPin color="#64748b" size={20} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text
                          style={tw('text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase')}
                        >
                          {t('mobile.workplace', 'Workplace')}
                        </Text>
                        <Text style={tw('text-base font-semibold text-slate-800 dark:text-slate-100')}>
                          {selectedDoctor.workplace}
                        </Text>
                      </View>
                    </View>
                    <View
                      style={tw('flex-row items-center p-4 border-b border-slate-50 dark:border-slate-800')}
                    >
                      <View
                        style={tw(
                          'w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center mr-3',
                        )}
                      >
                        <Mail color="#64748b" size={20} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text
                          style={tw('text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase')}
                        >
                          {t('mobile.email', 'Email')}
                        </Text>
                        <Text style={tw('text-base font-semibold text-slate-800 dark:text-slate-100')}>
                          {selectedDoctor.email || '—'}
                        </Text>
                      </View>
                    </View>
                    <View style={tw('flex-row items-center p-4')}>
                      <View
                        style={tw(
                          'w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center mr-3',
                        )}
                      >
                        <Phone color="#64748b" size={20} />
                      </View>
                      <View style={tw('flex-1')}>
                        <Text
                          style={tw('text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase')}
                        >
                          {t('mobile.phone', 'Phone')}
                        </Text>
                        <Text style={tw('text-base font-semibold text-slate-800 dark:text-slate-100')}>
                          {selectedDoctor.phone || '—'}
                        </Text>
                      </View>
                    </View>
                  </View>
                </>
              )}

              <View style={tw('flex-row gap-3 mb-6')}>
                <TouchableOpacity
                  onPress={() => {
                    setProfileModalVisible(false);
                    setTimeout(() => handleOpenRequest(selectedDoctor, 'scheduled'), 250);
                  }}
                  style={tw('flex-1 bg-brand py-3.5 rounded-2xl flex-row items-center justify-center')}
                >
                  <Calendar color="#0f172a" size={16} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-slate-900')}>
                    {t('mobile.book_scheduled_slot', 'Book Scheduled Slot')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setProfileModalVisible(false);
                    setTimeout(() => handleOpenRequest(selectedDoctor, 'on_demand'), 250);
                  }}
                  style={tw(
                    'flex-1 bg-slate-900 dark:bg-white py-3.5 rounded-2xl flex-row items-center justify-center',
                  )}
                >
                  <Zap color={twInstance.color('text-white dark:text-slate-900')} size={16} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-white dark:text-slate-900')}>
                    {t('mobile.request_on_demand', 'On-Demand Request')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Request / Slot Booking Modal */}
      <Modal
        visible={requestModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-center items-center bg-black/50 p-4')}
        >
          {selectedDoctor && (
            <View
              style={tw(
                'w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl',
              )}
            >
              <View
                style={tw(
                  'p-5 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center',
                )}
              >
                <View style={tw('flex-1 mr-2')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {bookingMode === 'scheduled'
                      ? t('mobile.book_scheduled_slot', 'Book Scheduled Slot')
                      : t('mobile.request_on_demand', 'On-Demand Request')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {selectedDoctor.name} • {bookingPolicyLabel(selectedDoctor.bookingPolicy)}
                  </Text>
                </View>
                <TouchableOpacity
                  onPress={() => setRequestModalVisible(false)}
                  style={tw('p-2 bg-slate-50 dark:bg-slate-950 rounded-xl')}
                >
                  <X color="#64748b" size={20} />
                </TouchableOpacity>
              </View>

              <View style={tw('p-5')}>
                <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4')}>
                  <TouchableOpacity
                    onPress={() => setBookingMode('scheduled')}
                    style={tw(
                      `flex-1 py-2.5 rounded-xl items-center ${
                        bookingMode === 'scheduled' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                      }`,
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          bookingMode === 'scheduled'
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400'
                        }`,
                      )}
                    >
                      {t('mobile.scheduled_slot_30m', 'Scheduled Slot')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBookingMode('on_demand')}
                    style={tw(
                      `flex-1 py-2.5 rounded-xl items-center ${
                        bookingMode === 'on_demand' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                      }`,
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          bookingMode === 'on_demand'
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-500 dark:text-slate-400'
                        }`,
                      )}
                    >
                      {t('mobile.on_demand_request_tab', 'On-Demand')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {bookingMode === 'scheduled' && (
                  <>
                    {slotsLoading ? (
                      <View style={tw('gap-2.5 mb-4')}>
                        <Skeleton className="h-10 w-full rounded-xl" />
                        <Skeleton className="h-20 w-full rounded-xl" />
                      </View>
                    ) : slotsError ? (
                      <View style={tw('bg-red-50 dark:bg-red-950/30 p-3 rounded-xl mb-4')}>
                        <Text style={tw('text-xs text-red-600 dark:text-red-300 mb-2')}>
                          {slotsError}
                        </Text>
                        <TouchableOpacity onPress={() => void loadDoctorSlots(selectedDoctor.id)}>
                          <Text style={tw('text-xs font-bold text-red-700 dark:text-red-200')}>
                            {t('mobile.retry', 'Retry')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    ) : dateGroups.length === 0 ? (
                      <View
                        style={tw(
                          'bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-4',
                        )}
                      >
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}>
                          {t(
                            'mobile.no_available_slots_desc',
                            'No open slots are available right now. You can send an on-demand request instead.',
                          )}
                        </Text>
                      </View>
                    ) : (
                      <>
                        <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mb-2')}>
                          {t('mobile.select_date', 'Select Date')}
                        </Text>
                        <ScrollView
                          horizontal
                          showsHorizontalScrollIndicator={false}
                          style={tw('mb-4 -mx-5 px-5')}
                          contentContainerStyle={tw('gap-2.5 pr-10')}
                        >
                          {dateGroups.map((group) => (
                            <TouchableOpacity
                              key={group.dateKey}
                              onPress={() => {
                                setSelectedDateKey(group.dateKey);
                                if (group.slots.length > 0) {
                                  setSelectedSlotId(group.slots[0].id);
                                }
                              }}
                              style={tw(
                                `px-4 py-2.5 rounded-2xl border ${
                                  selectedDateKey === group.dateKey
                                    ? 'bg-brand border-brand'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                                }`,
                              )}
                            >
                              <Text
                                style={tw(
                                  `text-xs font-bold ${
                                    selectedDateKey === group.dateKey
                                      ? 'text-slate-900'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`,
                                )}
                              >
                                {group.dateLabel}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>

                        <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mb-2')}>
                          {t('mobile.select_time_slot', 'Select Time Slot')}
                        </Text>
                        <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
                          {visibleSlotsForSelectedDate.map((slot) => (
                            <TouchableOpacity
                              key={slot.id}
                              onPress={() => setSelectedSlotId(slot.id)}
                              style={tw(
                                `px-3 py-2 rounded-xl border ${
                                  selectedSlotId === slot.id
                                    ? 'bg-brand border-brand'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                                }`,
                              )}
                            >
                              <Text
                                style={tw(
                                  `text-xs font-bold ${
                                    selectedSlotId === slot.id
                                      ? 'text-slate-900'
                                      : 'text-slate-500 dark:text-slate-400'
                                  }`,
                                )}
                              >
                                {slot.timeLabel}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </>
                    )}
                  </>
                )}

                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mb-2')}>
                  {t('mobile.reason_for_consultation', 'Reason for consultation')}
                </Text>
                <TextInput
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[90px] text-sm text-slate-800 dark:text-slate-100',
                  )}
                  placeholder={t(
                    'mobile.describe_symptoms_placeholder',
                    'Please describe your symptoms or question...',
                  )}
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  value={patientNote}
                  onChangeText={setPatientNote}
                />
              </View>

              <View
                style={tw(
                  'p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row justify-end gap-3',
                )}
              >
                <TouchableOpacity
                  style={tw(
                    'px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900',
                  )}
                  onPress={() => setRequestModalVisible(false)}
                >
                  <Text style={tw('font-bold text-slate-700 dark:text-slate-200 text-xs')}>
                    {t('mobile.cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw(
                    `flex-row items-center px-5 py-3 rounded-xl ${
                      submittingBooking ||
                      (bookingMode === 'scheduled' ? !selectedSlotId : !patientNote.trim())
                        ? 'bg-slate-200 dark:bg-slate-700'
                        : 'bg-brand'
                    }`,
                  )}
                  disabled={
                    submittingBooking ||
                    (bookingMode === 'scheduled' ? !selectedSlotId : !patientNote.trim())
                  }
                  onPress={() => void handleSendRequest()}
                >
                  {submittingBooking ? (
                    <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />
                  ) : null}
                  <Text
                    style={tw(
                      `font-bold text-xs mr-1.5 ${
                        submittingBooking ||
                        (bookingMode === 'scheduled' ? !selectedSlotId : !patientNote.trim())
                          ? 'text-slate-400 dark:text-slate-500'
                          : 'text-slate-900'
                      }`,
                    )}
                  >
                    {bookingMode === 'scheduled'
                      ? t('mobile.confirm_book_slot', 'Confirm Booking')
                      : t('mobile.send_request', 'Send Request')}
                  </Text>
                  <ArrowRight
                    color={
                      submittingBooking ||
                      (bookingMode === 'scheduled' ? !selectedSlotId : !patientNote.trim())
                        ? '#94a3b8'
                        : '#0f172a'
                    }
                    size={15}
                  />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      <DoctorReviewsModal
        visible={reviewsModalVisible}
        onClose={() => setReviewsModalVisible(false)}
        doctorId={selectedDoctor?.id}
        doctorName={selectedDoctor?.name}
      />
    </SafeAreaView>
  );
}
