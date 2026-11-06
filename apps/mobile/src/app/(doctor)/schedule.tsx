import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar,
  Plus,
  Clock,
  Copy,
  Trash2,
  Settings2,
  Lock,
  Unlock,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import {
  AddSlotModal,
  CopyScheduleModal,
  BookingSettingsModal,
  type DoctorBookingSettingsDto,
} from '@/components/modals';

interface DoctorSlotItem {
  id: string;
  time: string;
  status: 'available' | 'booked' | 'blocked' | 'expired';
  patient?: string;
}

import { bookingPolicyLabel, timezoneLabel } from '@/utils/bookingLabels';

export default function DoctorScheduleScreen() {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language === 'vi';
  useThemeContext();

  const [selectedDate, setSelectedDate] = useState('2026-11-06');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAcceptingAppts, setIsAcceptingAppts] = useState(true);
  const [addSlotModalVisible, setAddSlotModalVisible] = useState(false);
  const [copyScheduleModalVisible, setCopyScheduleModalVisible] = useState(false);
  const [bookingSettingsVisible, setBookingSettingsVisible] = useState(false);

  const [bookingSettings, setBookingSettings] = useState<DoctorBookingSettingsDto>({
    timezone: 'Asia/Ho_Chi_Minh',
    bookingPolicy: 'instant',
    defaultDurationMinutes: 30,
    bufferMinutes: 10,
    minNoticeMinutes: 60,
    cancellationDeadlineMinutes: 120,
    checkInEarlyMinutes: 15,
    noShowAfterMinutes: 15,
  });

  const generateDates = (selectedStr: string) => {
    const dayNamesEn = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const dayNamesVi = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
    const base = new Date(selectedStr);
    const res = [];
    for (let offset = -1; offset <= 5; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      res.push({
        date: `${yyyy}-${mm}-${dd}`,
        dayName: isVi ? dayNamesVi[d.getDay()] : dayNamesEn[d.getDay()],
        dayNum: dd,
      });
    }
    return res;
  };

  const dates = generateDates(selectedDate);
  const selectedDateObj = new Date(selectedDate);
  const monthYearTitle = isVi
    ? `Tháng ${selectedDateObj.getMonth() + 1}, ${selectedDateObj.getFullYear()}`
    : `${selectedDateObj.toLocaleString('en-US', { month: 'long' })}, ${selectedDateObj.getFullYear()}`;

  const timeSlots: DoctorSlotItem[] = [
    { id: '1', time: '08:00 AM', status: 'expired' },
    { id: '2', time: '09:00 AM', status: 'booked', patient: 'Alex Johnson' },
    { id: '3', time: '10:00 AM', status: 'available' },
    { id: '4', time: '11:00 AM', status: 'booked', patient: 'Maria Garcia' },
    { id: '5', time: '02:00 PM', status: 'blocked' },
    { id: '6', time: '03:30 PM', status: 'available' },
  ];

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [slots, setSlots] = useState<DoctorSlotItem[]>([]);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setSlots(timeSlots);
      setLoading(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedDate]);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 700);
  };

  const renderSlotSkeleton = () => (
    <View
      style={tw(
        'flex-row items-center p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 mb-4'
      )}
    >
      <View style={tw('w-2 h-2 rounded-full bg-slate-200 dark:bg-slate-700 mr-3')} />
      <View style={tw('flex-1')}>
        <View style={tw('w-24 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-1')} />
        <View style={tw('w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded')} />
      </View>
    </View>
  );

  const handleAddSlot = () => {
    setAddSlotModalVisible(true);
  };

  const handleCreateSlot = (newSlot: { time: string; type: string }) => {
    const newId = (slots.length + 1).toString();
    setSlots((prev) => [...prev, { id: newId, time: newSlot.time, status: 'available' }]);
  };

  // Block / Unblock available slots (CON-01..03: cannot block/delete booked slots directly)
  const handleToggleBlockSlot = (slot: DoctorSlotItem) => {
    if (slot.status === 'booked') {
      Toast.show({
        type: 'error',
        text1: t('mobile.slot_booked_locked', 'Không thể khóa khung giờ đã đặt'),
        text2: t('mobile.slot_booked_locked_desc', 'Khung giờ đã có lịch hẹn của bệnh nhân nên không thể khóa hoặc xóa trực tiếp.'
        ),
      });
      return;
    }
    const nextStatus = slot.status === 'blocked' ? 'available' : 'blocked';
    setSlots((prev) =>
      prev.map((s) => (s.id === slot.id ? { ...s, status: nextStatus } : s))
    );
    Toast.show({
      type: 'success',
      text1:
        nextStatus === 'blocked'
          ? t('mobile.slot_blocked', 'Đã khóa khung giờ')
          : t('mobile.slot_unblocked', 'Đã mở lại khung giờ'),
      text2: `${slot.time} -> ${nextStatus}`,
    });
  };

  const handleDeleteSlot = (slot: DoctorSlotItem) => {
    if (slot.status === 'booked') {
      Toast.show({
        type: 'error',
        text1: t('mobile.slot_booked_locked', 'Không thể xóa Slot đã đặt'),
      });
      return;
    }
    Alert.alert(
      t('mobile.delete_slot_title', 'Delete Slot'),
      t('mobile.delete_slot_confirm', 'Are you sure you want to remove this time slot?'),
      [
        { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('mobile.delete', 'Delete'),
          style: 'destructive',
          onPress: () => {
            setSlots((prev) => prev.filter((s) => s.id !== slot.id));
            Toast.show({
              type: 'success',
              text1: t('mobile.success', 'Success'),
              text2: t('mobile.slot_deleted', 'Slot removed from schedule'),
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View
        style={tw(
          'px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <View style={tw('flex-row justify-between items-start')}>
          <View style={tw('flex-1 mr-3')}>
            <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
              {t('mobile.my_schedule', 'My Schedule')}
            </Text>
            <Text style={tw('text-slate-500 dark:text-slate-400 text-xs mt-1')}>
              {timezoneLabel(bookingSettings.timezone, isVi)} • {bookingPolicyLabel(bookingSettings.bookingPolicy, isVi)} •{' '}
              {bookingSettings.defaultDurationMinutes} {t('mobile.minutes_short', 'phút')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setBookingSettingsVisible(true)}
            style={tw(
              'bg-indigo-50 dark:bg-indigo-900/30 px-3.5 py-2 rounded-xl border border-indigo-200 dark:border-indigo-800 flex-row items-center'
            )}
          >
            <Settings2 size={16} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
            <Text style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300 ml-1.5')}>
              {t('mobile.booking_settings', 'Cấu hình')}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={tw(
            'flex-row items-center justify-between mt-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl'
          )}
        >
          <View>
            <Text style={tw('font-bold text-slate-900 dark:text-white')}>
              {t('mobile.accepting_appointments', 'Accepting Appointments')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
              {t('mobile.patients_can_book_available_sl', 'Patients can book available slots')}
            </Text>
          </View>
          <Switch
            value={isAcceptingAppts}
            onValueChange={setIsAcceptingAppts}
            trackColor={{ false: '#cbd5e1', true: '#34d399' }}
            thumbColor={'#ffffff'}
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={tw('pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Date Selector */}
        <View
          style={tw(
            'py-6 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
          )}
        >
          <View style={tw('flex-row justify-between items-center px-6 mb-4')}>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
              {monthYearTitle}
            </Text>
            <TouchableOpacity
              onPress={() => setShowDatePicker(true)}
              style={tw('flex-row items-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800')}
            >
              <Calendar color="#64748b" size={16} style={tw('mr-1.5')} />
              <Text style={tw('text-slate-600 dark:text-slate-300 font-medium text-xs')}>
                {t('mobile.pick_date', 'Pick Date')}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            style={tw('px-6')}
            contentContainerStyle={tw('gap-3 pr-12')}
          >
            {dates.map((d) => (
              <TouchableOpacity
                key={d.date}
                onPress={() => setSelectedDate(d.date)}
                style={tw(
                  `w-16 h-20 items-center justify-center rounded-2xl border ${
                    selectedDate === d.date
                      ? 'bg-brand border-brand'
                      : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'
                  }`
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-bold mb-1 ${
                      selectedDate === d.date
                        ? 'text-slate-700'
                        : 'text-slate-400 dark:text-slate-500'
                    }`
                  )}
                >
                  {d.dayName}
                </Text>
                <Text
                  style={tw(
                    `text-xl font-bold ${
                      selectedDate === d.date
                        ? 'text-slate-900'
                        : 'text-slate-700 dark:text-slate-200'
                    }`
                  )}
                >
                  {d.dayNum}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Time Slots */}
        <View style={tw('p-6')}>
          <View style={tw('flex-row justify-between items-center mb-6')}>
            <View>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.time_slots', 'Time Slots')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                {t('mobile.slot_status_legend', 'còn trống • đã đặt • đã khóa • đã qua giờ')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={handleAddSlot}
              style={tw('w-10 h-10 bg-slate-900 dark:bg-white rounded-full items-center justify-center')}
            >
              <Plus color={twInstance.color('text-white dark:text-slate-900')} size={20} />
            </TouchableOpacity>
          </View>

          <View style={tw('gap-4')}>
            {loading ? (
              <>
                {renderSlotSkeleton()}
                {renderSlotSkeleton()}
                {renderSlotSkeleton()}
              </>
            ) : slots.length > 0 ? (
              slots.map((slot) => (
                <View
                  key={slot.id}
                  style={tw(
                    `flex-row items-center p-4 rounded-2xl border ${
                      slot.status === 'booked'
                        ? 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                        : slot.status === 'blocked'
                          ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/50'
                          : slot.status === 'expired'
                            ? 'bg-slate-100 dark:bg-slate-900/50 border-slate-200 dark:border-slate-800 opacity-60'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700 border-dashed'
                    }`
                  )}
                >
                  <View style={tw('flex-row items-center flex-1')}>
                    <View
                      style={tw(
                        `w-2.5 h-2.5 rounded-full mr-3 ${
                          slot.status === 'booked'
                            ? 'bg-red-500'
                            : slot.status === 'blocked'
                              ? 'bg-amber-500'
                              : slot.status === 'expired'
                                ? 'bg-slate-400'
                                : 'bg-emerald-500'
                        }`
                      )}
                    />
                    <View>
                      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-0.5')}>
                        {slot.time}
                      </Text>
                      {slot.status === 'booked' ? (
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                          {t('mobile.booked_by', 'Booked by')}:{' '}
                          <Text style={tw('font-bold text-slate-700 dark:text-slate-200')}>
                            {slot.patient}
                          </Text>{' '}
                          ({t('mobile.slot_locked_pill', 'Đã khóa')})
                        </Text>
                      ) : slot.status === 'blocked' ? (
                        <Text style={tw('text-xs text-amber-600 dark:text-amber-400 font-bold')}>
                          {t('mobile.slot_blocked_notice', 'ĐÃ KHÓA (tạm ngưng đặt lịch)')}
                        </Text>
                      ) : slot.status === 'expired' ? (
                        <Text style={tw('text-xs text-slate-400 font-medium')}>
                          {t('mobile.slot_expired_notice', 'ĐÃ QUA GIỜ')}
                        </Text>
                      ) : (
                        <Text style={tw('text-xs text-emerald-600 dark:text-emerald-400 font-bold')}>
                          {t('mobile.slot_available_notice', 'CÒN TRỐNG')} ({bookingSettings.defaultDurationMinutes} {t('mobile.minutes_short', 'phút')})
                        </Text>
                      )}
                    </View>
                  </View>

                  {(slot.status === 'available' || slot.status === 'blocked') && (
                    <View style={tw('flex-row items-center gap-1')}>
                      <TouchableOpacity
                        onPress={() => handleToggleBlockSlot(slot)}
                        style={tw('p-2 bg-slate-100 dark:bg-slate-800 rounded-xl')}
                      >
                        {slot.status === 'blocked' ? (
                          <Unlock color="#10b981" size={18} />
                        ) : (
                          <Lock color="#f59e0b" size={18} />
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => handleDeleteSlot(slot)} style={tw('p-2')}>
                        <Trash2 color="#ef4444" size={18} />
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))
            ) : (
              <View
                style={tw(
                  'items-center justify-center py-8 border border-slate-200 dark:border-slate-700 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-950'
                )}
              >
                <Clock color="#94a3b8" size={32} style={tw('mb-2')} />
                <Text style={tw('text-slate-500 dark:text-slate-400 font-medium')}>
                  {t('mobile.no_time_slots_for_this_date', 'No time slots for this date')}
                </Text>
              </View>
            )}
          </View>

          <TouchableOpacity
            onPress={() => setCopyScheduleModalVisible(true)}
            style={tw(
              'mt-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex-row items-center justify-center border-dashed'
            )}
          >
            <Copy color="#64748b" size={18} style={tw('mr-2')} />
            <Text style={tw('text-slate-600 dark:text-slate-300 font-bold')}>
              {t('mobile.copy_schedule_to_next_week', 'Copy schedule to next week')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Add Slot Modal */}
      <AddSlotModal
        visible={addSlotModalVisible}
        onClose={() => setAddSlotModalVisible(false)}
        selectedDate={selectedDate}
        onAddSlot={handleCreateSlot}
      />

      {/* Copy Schedule Modal */}
      <CopyScheduleModal
        visible={copyScheduleModalVisible}
        onClose={() => setCopyScheduleModalVisible(false)}
        slotCount={slots.filter((s) => s.status === 'available').length || 4}
      />

      {/* Booking Settings Modal (D-03, PUT /doctors/me/booking-settings) */}
      <BookingSettingsModal
        visible={bookingSettingsVisible}
        onClose={() => setBookingSettingsVisible(false)}
        settings={bookingSettings}
        onSave={(next) => setBookingSettings(next)}
      />

      {/* Date Picker Native Dialog */}
      {showDatePicker && (
        <DateTimePicker
          value={new Date(selectedDate)}
          mode="date"
          display="default"
          onChange={(event, date) => {
            setShowDatePicker(false);
            if (date && event.type !== 'dismissed') {
              const yyyy = date.getFullYear();
              const mm = String(date.getMonth() + 1).padStart(2, '0');
              const dd = String(date.getDate()).padStart(2, '0');
              setSelectedDate(`${yyyy}-${mm}-${dd}`);
            }
          }}
        />
      )}
    </SafeAreaView>
  );
}
