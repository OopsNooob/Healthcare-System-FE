import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  RefreshControl,
  ScrollView,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import Toast from 'react-native-toast-message';
import DateTimePicker from '@react-native-community/datetimepicker';
import {
  Calendar,
  Clock,
  Copy,
  Edit2,
  Lock,
  Plus,
  RefreshCw,
  Settings2,
  Trash2,
} from 'lucide-react-native';
import { mobileApi, normalizePaginatedList, type FeTypes } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { extractApiErrorMessage } from '@/utils/apiError';
import { extractUserProfileData } from '@/utils/userProfile';
import { bookingPolicyLabel, timezoneLabel } from '@/utils/bookingLabels';
import {
  AddSlotModal,
  BookingSettingsModal,
  CopyScheduleModal,
  type DoctorBookingSettingsDto,
} from '@/components/modals';
import type { EditableSlotTarget } from '@/components/modals/AddSlotModal';
import { Skeleton } from '@/components/ui/Skeleton';

const SCHEDULE_PREFS_KEY = 'doctor_schedule_prefs_v1';

interface DoctorSlotItem {
  id: string;
  startAt: string;
  endAt: string;
  timezone: string;
  status: 'available' | 'booked' | 'blocked' | 'expired';
  blockReason?: string;
  patientName?: string;
}

const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Ho_Chi_Minh': '+07:00',
  'Asia/Bangkok': '+07:00',
  'Asia/Singapore': '+08:00',
  UTC: 'Z',
};

function todayYyyyMmDd(): string {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function dayRangeIso(dateStr: string, timezone: string): { from: string; to: string } {
  const offset = TIMEZONE_OFFSETS[timezone] ?? '+07:00';
  const start = new Date(`${dateStr}T00:00:00${offset}`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);
  return {
    from: start.toISOString(),
    to: end.toISOString(),
  };
}

export default function DoctorScheduleScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [selectedDate, setSelectedDate] = useState(todayYyyyMmDd);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [isAcceptingAppts, setIsAcceptingAppts] = useState(false);
  const [updatingOnline, setUpdatingOnline] = useState(false);

  const [addSlotModalVisible, setAddSlotModalVisible] = useState(false);
  const [editingSlot, setEditingSlot] = useState<EditableSlotTarget | null>(null);
  const [copyScheduleModalVisible, setCopyScheduleModalVisible] = useState(false);
  const [bookingSettingsVisible, setBookingSettingsVisible] = useState(false);

  const [bookingSettings, setBookingSettings] = useState<DoctorBookingSettingsDto>({
    timezone: 'Asia/Ho_Chi_Minh',
    bookingPolicy: 'instant',
    defaultDurationMinutes: 30,
    bufferMinutes: 15,
    minNoticeMinutes: 60,
    cancellationDeadlineMinutes: 60,
    checkInEarlyMinutes: 15,
    noShowAfterMinutes: 10,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [slots, setSlots] = useState<DoctorSlotItem[]>([]);
  const [busySlotId, setBusySlotId] = useState<string | null>(null);

  useEffect(() => {
    AsyncStorage.getItem(SCHEDULE_PREFS_KEY)
      .then((raw) => {
        if (!raw) return;
        const parsed = JSON.parse(raw) as Partial<DoctorBookingSettingsDto>;
        setBookingSettings((prev) => ({
          ...prev,
          ...(parsed.timezone ? { timezone: parsed.timezone } : {}),
          ...(typeof parsed.defaultDurationMinutes === 'number'
            ? { defaultDurationMinutes: parsed.defaultDurationMinutes }
            : {}),
        }));
      })
      .catch(() => {});
  }, []);

  const dates = useMemo(() => {
    const dayKeys = [
      { key: 'mobile.day_sun', fallback: 'CN' },
      { key: 'mobile.day_mon', fallback: 'T2' },
      { key: 'mobile.day_tue', fallback: 'T3' },
      { key: 'mobile.day_wed', fallback: 'T4' },
      { key: 'mobile.day_thu', fallback: 'T5' },
      { key: 'mobile.day_fri', fallback: 'T6' },
      { key: 'mobile.day_sat', fallback: 'T7' },
    ];
    const base = new Date(`${selectedDate}T12:00:00`);
    const res = [];
    for (let offset = -1; offset <= 5; offset++) {
      const d = new Date(base);
      d.setDate(base.getDate() + offset);
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      const dayItem = dayKeys[d.getDay()];
      res.push({
        date: `${yyyy}-${mm}-${dd}`,
        dayName: t(dayItem.key, dayItem.fallback),
        dayNum: dd,
      });
    }
    return res;
  }, [selectedDate, t]);

  const selectedDateObj = new Date(`${selectedDate}T12:00:00`);
  const monthYearTitle = t('mobile.month_year_format', {
    month: selectedDateObj.getMonth() + 1,
    year: selectedDateObj.getFullYear(),
    defaultValue: `Tháng ${selectedDateObj.getMonth() + 1}, ${selectedDateObj.getFullYear()}`,
  });

  const loadScheduleData = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const { from, to } = dayRangeIso(selectedDate, bookingSettings.timezone);

        const [meRes, slotsRes, consultsRes] = await Promise.allSettled([
          mobileApi.usersGetMe(),
          mobileApi.availabilitySlotsListMine({
            query: { from, to, page: 1, limit: 100, sortOrder: 1 },
          }),
          mobileApi.consultationsFindAll({
            query: { page: 1, limit: 50, sortOrder: -1 },
          }),
        ]);

        if (meRes.status === 'fulfilled') {
          const parsedMe = extractUserProfileData(meRes.value);
          setIsAcceptingAppts(parsedMe.isOnline);
        }

        if (slotsRes.status !== 'fulfilled') {
          throw slotsRes.reason;
        }

        const slotPatientMap = new Map<string, string>();
        if (consultsRes.status === 'fulfilled') {
          const consultItems = normalizePaginatedList<Record<string, unknown>>(
            consultsRes.value,
            1,
            50
          ).items;
          for (const c of consultItems) {
            const slotId = typeof c.availabilitySlotId === 'string' ? c.availabilitySlotId : '';
            const patientObj = c.patient as Record<string, unknown> | undefined;
            const pName =
              (typeof patientObj?.fullName === 'string' && patientObj.fullName) ||
              (typeof c.patientName === 'string' ? c.patientName : '');
            if (slotId && pName) {
              slotPatientMap.set(slotId, pName);
            }
          }
        }

        const rawSlotsRes = slotsRes.value as FeTypes.AvailabilitySlotsListMineResponse;
        const normalizedSlots = normalizePaginatedList<Record<string, unknown>>(
          Array.isArray(rawSlotsRes?.data) ? rawSlotsRes.data : rawSlotsRes,
          1,
          100
        ).items;

        const mappedSlots: DoctorSlotItem[] = normalizedSlots
          .map((item) => {
            const id = String(item.id ?? item._id ?? '');
            const statusRaw = String(item.status ?? 'available').toLowerCase();
            const status: DoctorSlotItem['status'] =
              statusRaw === 'booked' ||
              statusRaw === 'blocked' ||
              statusRaw === 'expired'
                ? statusRaw
                : 'available';
            return {
              id,
              startAt: String(item.startAt ?? ''),
              endAt: String(item.endAt ?? ''),
              timezone: String(item.timezone ?? bookingSettings.timezone),
              status,
              blockReason:
                typeof item.blockReason === 'string' ? item.blockReason : undefined,
              patientName: slotPatientMap.get(id),
            };
          })
          .filter((s) => s.id.length > 0);

        setSlots(mappedSlots);
      } catch (err) {
        setLoadError(extractApiErrorMessage(err, 'mobile.schedule_load_failed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [selectedDate, bookingSettings.timezone]
  );

  useEffect(() => {
    void loadScheduleData(false);
  }, [loadScheduleData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadScheduleData(true);
  }, [loadScheduleData]);

  const handleToggleAcceptingAppts = async (next: boolean) => {
    if (updatingOnline) return;
    const prev = isAcceptingAppts;
    setIsAcceptingAppts(next);
    setUpdatingOnline(true);
    try {
      await mobileApi.usersUpdateMe({ isOnline: next });
    } catch (err) {
      setIsAcceptingAppts(prev);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.profile_update_failed'),
      });
    } finally {
      setUpdatingOnline(false);
    }
  };

  const handleSavePrefs = (next: DoctorBookingSettingsDto) => {
    setBookingSettings(next);
    AsyncStorage.setItem(
      SCHEDULE_PREFS_KEY,
      JSON.stringify({
        timezone: next.timezone,
        defaultDurationMinutes: next.defaultDurationMinutes,
      })
    ).catch(() => {});
  };

  const handleBlockSlot = (slot: DoctorSlotItem) => {
    if (busySlotId) return;
    if (slot.status === 'booked') {
      Toast.show({
        type: 'error',
        text1: t('mobile.slot_booked_locked'),
        text2: t('mobile.slot_booked_locked_desc'),
      });
      return;
    }

    Alert.alert(t('mobile.block_slot_title'), t('mobile.block_slot_confirm'), [
      { text: t('mobile.cancel'), style: 'cancel' },
      {
        text: t('mobile.confirm'),
        style: 'destructive',
        onPress: async () => {
          setBusySlotId(slot.id);
          try {
            await mobileApi.availabilitySlotsBlock({
              params: { id: slot.id },
              body: { reason: t('mobile.block_slot_default_reason') },
            });
            Toast.show({
              type: 'success',
              text1: t('mobile.slot_blocked'),
            });
            await loadScheduleData(true);
          } catch (err) {
            Toast.show({
              type: 'error',
              text1: t('mobile.error', 'Error'),
              text2: extractApiErrorMessage(err, 'mobile.slot_action_failed'),
            });
          } finally {
            setBusySlotId(null);
          }
        },
      },
    ]);
  };

  const handleDeleteSlot = (slot: DoctorSlotItem) => {
    if (busySlotId) return;
    if (slot.status === 'booked') {
      Toast.show({
        type: 'error',
        text1: t('mobile.slot_booked_locked'),
      });
      return;
    }

    Alert.alert(t('mobile.delete_slot_title'), t('mobile.delete_slot_confirm'), [
      { text: t('mobile.cancel'), style: 'cancel' },
      {
        text: t('mobile.delete'),
        style: 'destructive',
        onPress: async () => {
          setBusySlotId(slot.id);
          try {
            await mobileApi.availabilitySlotsRemove({ params: { id: slot.id } });
            setSlots((prev) => prev.filter((s) => s.id !== slot.id));
            Toast.show({
              type: 'success',
              text1: t('mobile.success', 'Success'),
              text2: t('mobile.slot_deleted'),
            });
          } catch (err) {
            Toast.show({
              type: 'error',
              text1: t('mobile.error', 'Error'),
              text2: extractApiErrorMessage(err, 'mobile.slot_action_failed'),
            });
          } finally {
            setBusySlotId(null);
          }
        },
      },
    ]);
  };

  const formatSlotWindow = (slot: DoctorSlotItem) => {
    const start = new Date(slot.startAt);
    const end = new Date(slot.endAt);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
      return { label: '--:--', durationMin: bookingSettings.defaultDurationMinutes };
    }
    const opts: Intl.DateTimeFormatOptions = {
      timeZone: slot.timezone || bookingSettings.timezone,
      hour: '2-digit',
      minute: '2-digit',
    };
    const startLabel = start.toLocaleTimeString(dateLocale, opts);
    const endLabel = end.toLocaleTimeString(dateLocale, opts);
    const durationMin = Math.max(1, Math.round((end.getTime() - start.getTime()) / 60_000));
    return { label: `${startLabel} - ${endLabel}`, durationMin };
  };

  const availableSlotsForCopy = slots
    .filter((s) => s.status === 'available')
    .map((s) => ({ startAt: s.startAt, endAt: s.endAt, timezone: s.timezone }));

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      {/* Header */}
      <View
        style={tw(
          'px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800'
        )}
      >
        <View style={tw('flex-row justify-between items-start')}>
          <View style={tw('flex-1 mr-3')}>
            <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
              {t('mobile.my_schedule')}
            </Text>
            <Text style={tw('text-slate-500 dark:text-slate-400 text-xs mt-1')}>
              {timezoneLabel(bookingSettings.timezone)} • {bookingPolicyLabel(bookingSettings.bookingPolicy)} •{' '}
              {bookingSettings.defaultDurationMinutes} {t('mobile.minutes_short')}
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
              {t('mobile.booking_settings')}
            </Text>
          </TouchableOpacity>
        </View>

        <View
          style={tw(
            'flex-row items-center justify-between mt-5 bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl'
          )}
        >
          <View style={tw('flex-1 mr-3')}>
            <Text style={tw('font-bold text-slate-900 dark:text-white')}>
              {t('mobile.accepting_appointments')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
              {t('mobile.patients_can_book_available_sl')}
            </Text>
          </View>
          <Switch
            value={isAcceptingAppts}
            disabled={updatingOnline}
            onValueChange={(v) => void handleToggleAcceptingAppts(v)}
            trackColor={{ false: '#cbd5e1', true: '#34d399' }}
            thumbColor="#ffffff"
          />
        </View>
      </View>

      <ScrollView
        contentContainerStyle={tw('pb-24')}
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
              style={tw(
                'flex-row items-center px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800'
              )}
            >
              <Calendar color="#64748b" size={16} style={tw('mr-1.5')} />
              <Text style={tw('text-slate-600 dark:text-slate-300 font-medium text-xs')}>
                {t('mobile.pick_date')}
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
                        ? 'text-slate-800'
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
            <View style={tw('flex-1 mr-3')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.time_slots')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                {t('mobile.slot_status_legend_caps')}
              </Text>
            </View>
            <TouchableOpacity
              onPress={() => {
                setEditingSlot(null);
                setAddSlotModalVisible(true);
              }}
              style={tw(
                'w-10 h-10 bg-slate-900 dark:bg-brand rounded-full items-center justify-center'
              )}
            >
              <Plus color={twInstance.color('text-white dark:text-slate-900')} size={20} />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={tw('gap-3')}>
              {[1, 2, 3].map((idx) => (
                <View
                  key={idx}
                  style={tw(
                    'p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 gap-2'
                  )}
                >
                  <Skeleton className="h-5 w-32 rounded-lg" />
                  <Skeleton className="h-3.5 w-44 rounded-lg" />
                </View>
              ))}
            </View>
          ) : loadError ? (
            <View
              style={tw(
                'p-6 rounded-2xl bg-white dark:bg-slate-900 border border-rose-200 dark:border-rose-900/40 items-center'
              )}
            >
              <Text style={tw('text-sm font-bold text-slate-900 dark:text-white text-center')}>
                {t('mobile.schedule_load_failed')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center mt-1 mb-4')}>
                {loadError}
              </Text>
              <TouchableOpacity
                onPress={() => void loadScheduleData(false)}
                style={tw('bg-brand px-5 py-2.5 rounded-full flex-row items-center')}
              >
                <RefreshCw size={14} color="#0f172a" />
                <Text style={tw('text-slate-900 font-bold text-xs ml-1.5')}>
                  {t('mobile.retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={tw('gap-3.5')}>
              {slots.length > 0 ? (
                slots.map((slot) => {
                  const win = formatSlotWindow(slot);
                  const isBusy = busySlotId === slot.id;
                  return (
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
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 border-dashed'
                        }`
                      )}
                    >
                      <View style={tw('flex-row items-center flex-1 mr-2')}>
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
                        <View style={tw('flex-1')}>
                          <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-0.5')}>
                            {win.label}
                          </Text>
                          {slot.status === 'booked' ? (
                            <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                              {slot.patientName ? `${t('mobile.booked_by')}: ${slot.patientName} • ` : ''}
                              {t('mobile.slot_booked_badge')}
                            </Text>
                          ) : slot.status === 'blocked' ? (
                            <Text style={tw('text-xs text-amber-600 dark:text-amber-400 font-bold')}>
                              {t('mobile.slot_blocked_notice')}
                              {slot.blockReason ? ` — ${slot.blockReason}` : ''}
                            </Text>
                          ) : slot.status === 'expired' ? (
                            <Text style={tw('text-xs text-slate-400 font-medium')}>
                              {t('mobile.slot_expired_notice')}
                            </Text>
                          ) : (
                            <Text style={tw('text-xs text-emerald-600 dark:text-emerald-400 font-bold')}>
                              {t('mobile.slot_available_notice')} ({win.durationMin} {t('mobile.minutes_short')})
                            </Text>
                          )}
                        </View>
                      </View>

                      {isBusy ? (
                        <ActivityIndicator size="small" color={twInstance.color('text-slate-500')} />
                      ) : slot.status === 'available' || slot.status === 'blocked' ? (
                        <View style={tw('flex-row items-center gap-1.5')}>
                          {slot.status === 'available' ? (
                            <>
                              <TouchableOpacity
                                disabled={Boolean(busySlotId)}
                                onPress={() => {
                                  setEditingSlot({
                                    id: slot.id,
                                    startAt: slot.startAt,
                                    endAt: slot.endAt,
                                    timezone: slot.timezone,
                                  });
                                  setAddSlotModalVisible(true);
                                }}
                                style={tw('p-2 bg-slate-100 dark:bg-slate-800 rounded-xl')}
                              >
                                <Edit2 color={twInstance.color('text-slate-600 dark:text-slate-300')} size={16} />
                              </TouchableOpacity>
                              <TouchableOpacity
                                disabled={Boolean(busySlotId)}
                                onPress={() => handleBlockSlot(slot)}
                                style={tw('p-2 bg-amber-50 dark:bg-amber-900/30 rounded-xl')}
                              >
                                <Lock color="#f59e0b" size={16} />
                              </TouchableOpacity>
                            </>
                          ) : null}
                          <TouchableOpacity
                            disabled={Boolean(busySlotId)}
                            onPress={() => handleDeleteSlot(slot)}
                            style={tw('p-2 bg-rose-50 dark:bg-rose-900/30 rounded-xl')}
                          >
                            <Trash2 color="#ef4444" size={16} />
                          </TouchableOpacity>
                        </View>
                      ) : null}
                    </View>
                  );
                })
              ) : (
                <View
                  style={tw(
                    'items-center justify-center py-8 border border-slate-200 dark:border-slate-700 border-dashed rounded-2xl bg-slate-50 dark:bg-slate-950'
                  )}
                >
                  <Clock color="#94a3b8" size={32} style={tw('mb-2')} />
                  <Text style={tw('text-slate-500 dark:text-slate-400 font-medium')}>
                    {t('mobile.no_time_slots_for_this_date')}
                  </Text>
                </View>
              )}
            </View>
          )}

          <TouchableOpacity
            onPress={() => setCopyScheduleModalVisible(true)}
            disabled={availableSlotsForCopy.length === 0}
            style={tw(
              `mt-8 py-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl flex-row items-center justify-center border-dashed ${
                availableSlotsForCopy.length === 0 ? 'opacity-50' : ''
              }`
            )}
          >
            <Copy color="#64748b" size={18} style={tw('mr-2')} />
            <Text style={tw('text-slate-600 dark:text-slate-300 font-bold')}>
              {t('mobile.copy_schedule_to_next_week')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <AddSlotModal
        visible={addSlotModalVisible}
        onClose={() => {
          setAddSlotModalVisible(false);
          setEditingSlot(null);
        }}
        selectedDate={selectedDate}
        timezone={bookingSettings.timezone}
        defaultDurationMinutes={bookingSettings.defaultDurationMinutes}
        minNoticeMinutes={bookingSettings.minNoticeMinutes}
        onMinNoticeDetected={(minutes) =>
          setBookingSettings((prev) =>
            prev.minNoticeMinutes === minutes ? prev : { ...prev, minNoticeMinutes: minutes }
          )
        }
        editingSlot={editingSlot}
        onSaved={(savedDate) => {
          if (savedDate && savedDate !== selectedDate) {
            setSelectedDate(savedDate);
          } else {
            void loadScheduleData(true);
          }
        }}
      />

      <CopyScheduleModal
        visible={copyScheduleModalVisible}
        onClose={() => setCopyScheduleModalVisible(false)}
        slotsToCopy={availableSlotsForCopy}
        onCopied={() => void loadScheduleData(true)}
      />

      <BookingSettingsModal
        visible={bookingSettingsVisible}
        onClose={() => setBookingSettingsVisible(false)}
        settings={bookingSettings}
        onSave={handleSavePrefs}
      />

      {showDatePicker ? (
        <DateTimePicker
          value={selectedDateObj}
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
      ) : null}
    </SafeAreaView>
  );
}
