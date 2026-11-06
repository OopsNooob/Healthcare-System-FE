import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  RefreshControl,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import {
  Star,
  MessageCircle,
  Video,
  MapPin,
  Search,
  ArrowRight,
  X,
  Clock,
  ShieldCheck,
  Mail,
  Phone,
  UserX,
  Globe,
  Calendar,
  Zap,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { bookingPolicyLabel, timezoneLabel } from '@/utils/bookingLabels';
import { DoctorReviewsModal } from '@/components/modals';

type DoctorStatus = 'unrequested' | 'pending' | 'accepted';

export default function MyDoctorsScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  useThemeContext();

  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [doctors, setDoctors] = useState([
    {
      id: 1,
      name: 'Dr. Sarah Connor',
      specialty: 'Cardiologist',
      hospital: 'Central Heart Hospital',
      rating: 4.9,
      reviews: 128,
      image: 'https://i.pravatar.cc/150?img=1',
      lastVisit: '12 Aug 2026',
      status: 'accepted' as DoctorStatus,
      experience: 15,
      email: 'sarah.connor@hospital.com',
      phone: '+1 234 567 8900',
      timezone: 'Asia/Ho_Chi_Minh',
      bookingPolicy: 'instant' as 'instant' | 'approval_required',
      isOnline: true,
    },
    {
      id: 2,
      name: 'Dr. Michael Chen',
      specialty: 'Dermatologist',
      hospital: 'Skin Care Clinic',
      rating: 4.8,
      reviews: 94,
      image: 'https://i.pravatar.cc/150?img=3',
      lastVisit: '05 Jul 2026',
      status: 'pending' as DoctorStatus,
      experience: 8,
      email: 'm.chen@skinclinic.com',
      phone: '+1 987 654 3210',
      timezone: 'Asia/Ho_Chi_Minh',
      bookingPolicy: 'approval_required' as 'instant' | 'approval_required',
      isOnline: false,
    },
    {
      id: 3,
      name: 'Dr. Emily Watson',
      specialty: 'Pediatrician',
      hospital: 'City Children Hospital',
      rating: 5.0,
      reviews: 312,
      image: 'https://i.pravatar.cc/150?img=5',
      lastVisit: '10 Jun 2026',
      status: 'unrequested' as DoctorStatus,
      experience: 12,
      email: 'ewatson@citykids.org',
      phone: '+1 555 123 4567',
      timezone: 'Asia/Ho_Chi_Minh',
      bookingPolicy: 'instant' as 'instant' | 'approval_required',
      isOnline: true,
    },
  ]);

  const params = useLocalSearchParams<{ search?: string }>();
  const [searchQuery, setSearchQuery] = useState(params.search || '');
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null);
  const [profileModalVisible, setProfileModalVisible] = useState(false);
  const [requestModalVisible, setRequestModalVisible] = useState(false);
  const [reviewsModalVisible, setReviewsModalVisible] = useState(false);

  // Consultation mode: 'scheduled' (CON-05) vs 'on_demand' (CON-06)
  const [bookingMode, setBookingMode] = useState<'scheduled' | 'on_demand'>('scheduled');
  const [patientNote, setPatientNote] = useState('');
  const [selectedDate, setSelectedDate] = useState('2026-11-08');
  const [selectedTime, setSelectedTime] = useState('09:00 AM');

  useEffect(() => {
    setTimeout(() => setLoading(false), 900);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 900);
  };

  const availableTimes = ['09:00 AM', '10:00 AM', '11:00 AM', '02:00 PM', '03:30 PM'];

  const filteredDoctors = doctors.filter(
    (doc) =>
      doc.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.specialty.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleOpenProfile = (doc: any) => {
    setSelectedDoctor(doc);
    setProfileModalVisible(true);
  };

  const handleOpenRequest = (doc: any, mode: 'scheduled' | 'on_demand' = 'scheduled') => {
    setSelectedDoctor(doc);
    setBookingMode(mode);
    setPatientNote('');
    setRequestModalVisible(true);
  };

  const handleSendRequest = () => {
    if (!selectedDoctor) return;

    const isInstantScheduled =
      bookingMode === 'scheduled' && selectedDoctor.bookingPolicy === 'instant';

    setDoctors((prev) =>
      prev.map((d) =>
        d.id === selectedDoctor.id
          ? { ...d, status: (isInstantScheduled ? 'accepted' : 'pending') as DoctorStatus }
          : d
      )
    );

    setRequestModalVisible(false);
    setTimeout(() => {
      Toast.show({
        type: 'success',
        text1: isInstantScheduled
          ? t('mobile.slot_booked_instant', 'Đặt lịch thành công (tự động xác nhận)')
          : t('mobile.request_sent', 'Request Sent'),
        text2: isInstantScheduled
          ? `${selectedDate} • ${selectedTime} (${timezoneLabel(selectedDoctor.timezone, isVi)})`
          : t('mobile.consultation_request_sent_success', 'Your consultation request has been sent to the doctor.'),
      });
    }, 400);
  };

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800')}>
      <View style={tw('flex-row gap-4')}>
        <View style={tw('w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700')} />
        <View style={tw('flex-1 justify-center')}>
          <View style={tw('w-32 h-6 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-24 h-4 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-36 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
        </View>
      </View>
      <View style={tw('w-full h-[1px] bg-slate-100 dark:bg-slate-800 my-4')} />
      <View style={tw('flex-row justify-between items-center')}>
        <View style={tw('w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
        <View style={tw('w-24 h-10 bg-slate-200 dark:bg-slate-700 rounded-full')} />
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-20 px-6')}>
      <View style={tw('w-24 h-24 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-6')}>
        <UserX color="#94a3b8" size={40} />
      </View>
      <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-2 text-center')}>
        {t('mobile.no_doctors_found', 'No doctors found')}
      </Text>
      <Text style={tw('text-slate-500 dark:text-slate-400 text-center mb-8')}>
        {searchQuery.length > 0
          ? t('mobile.no_doctors_matching_search', 'We couldn\'t find any doctors matching "{{searchQuery}}". Try different keywords.', { searchQuery })
          : t('mobile.no_doctors_added_yet', "You haven't added or connected with any doctors yet.")}
      </Text>
      {searchQuery.length > 0 && (
        <TouchableOpacity
          onPress={() => setSearchQuery('')}
          style={tw('bg-slate-100 dark:bg-slate-800 px-6 py-3 rounded-2xl')}
        >
          <Text style={tw('text-slate-900 dark:text-white font-bold')}>{t('mobile.clear_search', 'Clear Search')}</Text>
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
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#0f172a" colors={['#0f172a']} />
        }
      >
        {/* Header */}
        <View style={tw('px-6 pt-6 pb-4')}>
          <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
            {t('mobile.my_doctors', 'My Doctors')}
          </Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-sm mt-1')}>
            {t('mobile.find_and_connect_with_verified', 'Find and connect with verified healthcare specialists')}
          </Text>

          <View style={tw('mt-4 flex-row items-center bg-white dark:bg-slate-900 px-4 py-3 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-sm')}>
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
          ) : filteredDoctors.length > 0 ? (
            filteredDoctors.map((doc) => (
              <TouchableOpacity
                key={doc.id}
                style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 shadow-sm border border-slate-100 dark:border-slate-800')}
                onPress={() => handleOpenProfile(doc)}
                activeOpacity={0.7}
              >
                <View style={tw('flex-row gap-4')}>
                  <View style={tw('relative')}>
                    <Image
                      source={{ uri: doc.image }}
                      style={tw('w-20 h-20 rounded-2xl bg-slate-200 dark:bg-slate-700')}
                    />
                    <View
                      style={tw(
                        `w-3.5 h-3.5 rounded-full border-2 border-white dark:border-slate-900 absolute -top-1 -right-1 ${
                          doc.isOnline ? 'bg-emerald-500' : 'bg-slate-400'
                        }`
                      )}
                    />
                  </View>
                  <View style={tw('flex-1 justify-center')}>
                    <View style={tw('flex-row justify-between items-start mb-1')}>
                      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white flex-1 mr-2')} numberOfLines={1}>
                        {doc.name}
                      </Text>
                      <View style={tw('flex-row items-center gap-1')}>
                        <Star color="#f59e0b" fill="#f59e0b" size={14} />
                        <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-200')}>{doc.rating}</Text>
                      </View>
                    </View>

                    <Text style={tw('text-brand font-medium mb-1')}>{doc.specialty}</Text>

                    <View style={tw('flex-row items-center gap-1')}>
                      <MapPin color="#94a3b8" size={14} />
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                        {doc.hospital}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={tw('w-full h-[1px] bg-slate-100 dark:bg-slate-800 my-4')} />

                <View style={tw('flex-row justify-between items-center')}>
                  <View style={tw('flex-1 mr-2')}>
                    <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium')} numberOfLines={1}>
                      {t('mobile.last_visit', 'Last visit')}: {doc.lastVisit}
                    </Text>
                    <Text style={tw('text-[11px] text-indigo-500 dark:text-indigo-400 font-semibold mt-0.5')}>
                      {bookingPolicyLabel(doc.bookingPolicy, isVi)} • {timezoneLabel(doc.timezone, isVi)}
                    </Text>
                  </View>

                  <View style={tw('flex-row gap-2 shrink-0')}>
                    {doc.status === 'accepted' && (
                      <>
                        <TouchableOpacity
                          style={tw('w-10 h-10 rounded-full bg-brand/10 items-center justify-center')}
                          onPress={() => router.push('/(patient)/doctor-chat')}
                        >
                          <MessageCircle color="#a3e635" size={20} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={tw('px-3.5 py-2 rounded-full bg-brand items-center justify-center flex-row')}
                          onPress={() => handleOpenRequest(doc, 'scheduled')}
                        >
                          <Calendar color="#0f172a" size={14} style={tw('mr-1')} />
                          <Text style={tw('text-slate-900 font-bold text-xs')}>
                            {t('mobile.book_slot', 'Đặt khung giờ')}
                          </Text>
                        </TouchableOpacity>
                      </>
                    )}
                    {doc.status === 'pending' && (
                      <View style={tw('flex-row items-center px-3.5 py-1.5 bg-amber-50 dark:bg-amber-900/30 rounded-full border border-amber-200 dark:border-amber-800 shrink-0')}>
                        <Clock color="#d97706" size={14} />
                        <Text style={tw('text-amber-600 dark:text-amber-400 font-semibold text-xs ml-1.5')} numberOfLines={1}>
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
                          {t('mobile.request', 'Đặt khám')}
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
          <View style={tw('flex-row items-center justify-between p-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
            <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
              {t('mobile.doctor_profile', 'Doctor Profile')}
            </Text>
            <TouchableOpacity onPress={() => setProfileModalVisible(false)} style={tw('p-2')}>
              <X color="#64748b" size={24} />
            </TouchableOpacity>
          </View>

          {selectedDoctor && (
            <ScrollView contentContainerStyle={tw('p-6')} showsVerticalScrollIndicator={false}>
              {/* Doctor Header */}
              <View style={tw('items-center mb-8')}>
                <Image
                  source={{ uri: selectedDoctor.image }}
                  style={tw('w-32 h-32 rounded-full mb-4 border-4 border-white shadow-sm bg-slate-200 dark:bg-slate-700')}
                />
                <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>{selectedDoctor.name}</Text>
                <Text style={tw('text-base text-brand font-medium mb-2')}>{selectedDoctor.specialty}</Text>

                <View style={tw('flex-row gap-2 mt-2')}>
                  <View style={tw('bg-blue-50 dark:bg-blue-950/40 px-3 py-1 rounded-full border border-blue-100 dark:border-blue-800 flex-row items-center')}>
                    <ShieldCheck color="#3b82f6" size={14} />
                    <Text style={tw('text-blue-600 dark:text-blue-300 font-bold text-xs ml-1')}>
                      {t('mobile.verified', 'Verified')}
                    </Text>
                  </View>
                  <View style={tw('bg-emerald-50 dark:bg-emerald-950/40 px-3 py-1 rounded-full border border-emerald-100 dark:border-emerald-800 flex-row items-center')}>
                    <Globe color="#10b981" size={13} />
                    <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold text-xs ml-1')}>
                      {timezoneLabel(selectedDoctor.timezone, isVi)}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Stats & Rating */}
              <TouchableOpacity
                onPress={() => {
                  setProfileModalVisible(false);
                  setTimeout(() => setReviewsModalVisible(true), 300);
                }}
                style={tw('flex-row bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 p-4 mb-6 shadow-sm')}
              >
                <View style={tw('flex-1 items-center border-r border-slate-100 dark:border-slate-800')}>
                  <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white')}>{selectedDoctor.rating}</Text>
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
                    {selectedDoctor.reviews} {t('mobile.reviews', 'reviews')} →
                  </Text>
                </View>
                <View style={tw('flex-1 items-center justify-center')}>
                  <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white')}>{selectedDoctor.experience}</Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 font-medium mt-2')}>
                    {t('mobile.years_exp', 'Years Exp.')}
                  </Text>
                </View>
              </TouchableOpacity>

              {/* Basic Info */}
              <Text style={tw('text-xs font-bold uppercase tracking-widest text-slate-400 dark:text-slate-500 mb-3')}>
                {t('mobile.professional_info', 'Professional Info')}
              </Text>
              <View style={tw('bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800 overflow-hidden mb-6')}>
                <View style={tw('flex-row items-center p-4 border-b border-slate-50 dark:border-slate-900')}>
                  <View style={tw('w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center mr-3')}>
                    <MapPin color="#64748b" size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase')}>
                      {t('mobile.workplace', 'Workplace')}
                    </Text>
                    <Text style={tw('text-base font-semibold text-slate-800 dark:text-slate-100')}>
                      {selectedDoctor.hospital}
                    </Text>
                  </View>
                </View>
                <View style={tw('flex-row items-center p-4 border-b border-slate-50 dark:border-slate-900')}>
                  <View style={tw('w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center mr-3')}>
                    <Mail color="#64748b" size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase')}>
                      {t('mobile.email', 'Email')}
                    </Text>
                    <Text style={tw('text-base font-semibold text-slate-800 dark:text-slate-100')}>
                      {selectedDoctor.email}
                    </Text>
                  </View>
                </View>
                <View style={tw('flex-row items-center p-4')}>
                  <View style={tw('w-10 h-10 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center mr-3')}>
                    <Phone color="#64748b" size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-xs font-semibold text-slate-400 dark:text-slate-500 uppercase')}>
                      {t('mobile.phone', 'Phone')}
                    </Text>
                    <Text style={tw('text-base font-semibold text-slate-800 dark:text-slate-100')}>
                      {selectedDoctor.phone}
                    </Text>
                  </View>
                </View>
              </View>

              {/* Action CTA buttons */}
              <View style={tw('flex-row gap-3 mb-6')}>
                <TouchableOpacity
                  onPress={() => {
                    setProfileModalVisible(false);
                    setTimeout(() => handleOpenRequest(selectedDoctor, 'scheduled'), 300);
                  }}
                  style={tw('flex-1 bg-brand py-3.5 rounded-2xl flex-row items-center justify-center')}
                >
                  <Calendar color="#0f172a" size={16} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-slate-900')}>
                    {t('mobile.book_scheduled_slot', 'Đặt theo khung giờ')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setProfileModalVisible(false);
                    setTimeout(() => handleOpenRequest(selectedDoctor, 'on_demand'), 300);
                  }}
                  style={tw('flex-1 bg-slate-900 dark:bg-white py-3.5 rounded-2xl flex-row items-center justify-center')}
                >
                  <Zap color={twInstance.color('text-white dark:text-slate-900')} size={16} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-white dark:text-slate-900')}>
                    {t('mobile.request_on_demand', 'Khám ngay')}
                  </Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>

      {/* Request / Slot Booking Modal (P-02: CON-05 Scheduled vs CON-06 On-Demand) */}
      <Modal
        visible={requestModalVisible}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setRequestModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-center items-center bg-black/50 p-4')}
        >
          {selectedDoctor && (
            <View style={tw('w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl overflow-hidden shadow-2xl')}>
              <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center')}>
                <View style={tw('flex-1 mr-2')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {bookingMode === 'scheduled'
                      ? t('mobile.book_scheduled_slot', 'Đặt lịch theo Slot')
                      : t('mobile.request_on_demand', 'Yêu cầu Khám ngay')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                    {timezoneLabel(selectedDoctor.timezone, isVi)} • {bookingPolicyLabel(selectedDoctor.bookingPolicy, isVi)}
                  </Text>
                </View>
                <TouchableOpacity onPress={() => setRequestModalVisible(false)} style={tw('p-2 bg-slate-50 dark:bg-slate-950 rounded-xl')}>
                  <X color="#64748b" size={20} />
                </TouchableOpacity>
              </View>

              <View style={tw('p-5')}>
                {/* Mode Switcher */}
                <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mb-4')}>
                  <TouchableOpacity
                    onPress={() => setBookingMode('scheduled')}
                    style={tw(`flex-1 py-2.5 rounded-xl items-center ${bookingMode === 'scheduled' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
                  >
                    <Text style={tw(`text-xs font-bold ${bookingMode === 'scheduled' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}>
                      {isVi ? 'Đặt theo khung giờ (30 phút)' : 'Scheduled slot (30 min)'}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => setBookingMode('on_demand')}
                    style={tw(`flex-1 py-2.5 rounded-xl items-center ${bookingMode === 'on_demand' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
                  >
                    <Text style={tw(`text-xs font-bold ${bookingMode === 'on_demand' ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`)}>
                      {isVi ? 'Yêu cầu khám ngay' : 'On-demand request'}
                    </Text>
                  </TouchableOpacity>
                </View>

                {bookingMode === 'scheduled' && (
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
                      {['2026-11-08', '2026-11-09', '2026-11-10', '2026-11-11'].map((date) => (
                        <TouchableOpacity
                          key={date}
                          onPress={() => setSelectedDate(date)}
                          style={tw(
                            `px-4 py-2.5 rounded-2xl border ${
                              selectedDate === date
                                ? 'bg-brand border-brand'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                selectedDate === date ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'
                              }`
                            )}
                          >
                            {date.split('-')[2]} Nov
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>

                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mb-2')}>
                      {t('mobile.select_time_slot', 'Select Time Slot (Available)')}
                    </Text>
                    <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
                      {availableTimes.map((time) => (
                        <TouchableOpacity
                          key={time}
                          onPress={() => setSelectedTime(time)}
                          style={tw(
                            `px-3 py-2 rounded-xl border ${
                              selectedTime === time
                                ? 'bg-brand border-brand'
                                : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                selectedTime === time ? 'text-slate-900' : 'text-slate-500 dark:text-slate-400'
                              }`
                            )}
                          >
                            {time}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </>
                )}

                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mb-2')}>
                  {t('mobile.reason_for_consultation', 'Reason for consultation (patientNotes)')}
                </Text>
                <TextInput
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 min-h-[90px] text-sm text-slate-800 dark:text-slate-100')}
                  placeholder={t('mobile.describe_symptoms_placeholder', 'Please describe what you are experiencing...')}
                  placeholderTextColor="#94a3b8"
                  multiline
                  textAlignVertical="top"
                  value={patientNote}
                  onChangeText={setPatientNote}
                />
              </View>

              <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex-row justify-end gap-3')}>
                <TouchableOpacity
                  style={tw('px-5 py-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900')}
                  onPress={() => setRequestModalVisible(false)}
                >
                  <Text style={tw('font-bold text-slate-700 dark:text-slate-200 text-xs')}>{t('mobile.cancel', 'Cancel')}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={tw(
                    `flex-row items-center px-5 py-3 rounded-xl ${
                      patientNote.trim().length > 0 ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-700'
                    }`
                  )}
                  disabled={patientNote.trim().length === 0}
                  onPress={handleSendRequest}
                >
                  <Text
                    style={tw(
                      `font-bold text-xs mr-1.5 ${
                        patientNote.trim().length > 0 ? 'text-slate-900' : 'text-slate-400 dark:text-slate-500'
                      }`
                    )}
                  >
                    {bookingMode === 'scheduled'
                      ? t('mobile.confirm_book_slot', 'Xác nhận đặt lịch')
                      : t('mobile.send_request', 'Send Request')}
                  </Text>
                  <ArrowRight color={patientNote.trim().length > 0 ? '#0f172a' : '#94a3b8'} size={15} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </KeyboardAvoidingView>
      </Modal>

      {/* Doctor Reviews & Report Abuse Modal (D-08 / MOD-01) */}
      <DoctorReviewsModal
        visible={reviewsModalVisible}
        onClose={() => setReviewsModalVisible(false)}
        doctorName={selectedDoctor?.name}
      />
    </SafeAreaView>
  );
}
