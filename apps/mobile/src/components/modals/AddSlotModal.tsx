import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { ArrowRight, Clock, Plus, Save, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { generateIdempotencyKey, mobileApi } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { extractApiErrorMessage } from '@/utils/apiError';

export interface EditableSlotTarget {
  id: string;
  startAt: string;
  endAt: string;
  timezone: string;
}

interface AddSlotModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate: string;
  timezone?: string;
  defaultDurationMinutes?: number;
  editingSlot?: EditableSlotTarget | null;
  onSaved: () => void;
}

const ITEM_HEIGHT = 40;
const WHEEL_HEIGHT = ITEM_HEIGHT * 3;
const QUICK_DURATIONS = [15, 30, 45, 60] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const MAX_WHEEL_MINUTES = 23 * 60 + 55;

const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Ho_Chi_Minh': '+07:00',
  'Asia/Bangkok': '+07:00',
  'Asia/Singapore': '+08:00',
  UTC: 'Z',
};

function splitMinutes(totalMinutes: number): { hour: number; minute: number } {
  const clamped = Math.max(0, Math.min(MAX_WHEEL_MINUTES, totalMinutes));
  return {
    hour: Math.floor(clamped / 60),
    minute: clamped % 60,
  };
}

function formatHHMM(hour: number, minute: number): string {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

function buildMinuteOptions(extraMinute?: number): number[] {
  if (typeof extraMinute === 'number' && !BASE_MINUTES.includes(extraMinute)) {
    return [...BASE_MINUTES, extraMinute].sort((a, b) => a - b);
  }
  return BASE_MINUTES;
}

function getDateYyyyMmDdInZone(iso: string, timezone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return d.toLocaleDateString('en-CA', { timeZone: timezone || 'Asia/Ho_Chi_Minh' });
  } catch {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

function formatIsoTimeInZone(iso: string, timezone: string): { hour: number; minute: number } {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { hour: 9, minute: 0 };
  try {
    const formatted = d.toLocaleTimeString('en-GB', {
      timeZone: timezone || 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const [hStr, mStr] = formatted.split(':');
    const hour = Number(hStr);
    const minute = Number(mStr);
    if (Number.isFinite(hour) && Number.isFinite(minute)) {
      return { hour, minute };
    }
  } catch {
    // fallback below
  }
  return { hour: d.getHours(), minute: d.getMinutes() };
}

function computeDefaultSlotWindow(
  selectedDate: string,
  timezone: string,
  durationMinutes: number
): { startHour: number; startMinute: number; endHour: number; endMinute: number } {
  const safeDuration = Math.max(5, Math.min(240, durationMinutes));
  const nowIso = new Date().toISOString();
  const todayInZone = getDateYyyyMmDdInZone(nowIso, timezone);

  let startTotal = 9 * 60;
  if (selectedDate === todayInZone) {
    const nowParts = formatIsoTimeInZone(nowIso, timezone);
    const nowTotal = nowParts.hour * 60 + nowParts.minute;
    // Advance at least 15 minutes into the future and round up to a clean 15-min mark
    const futureRounded = Math.ceil((nowTotal + 15) / 15) * 15;
    startTotal = Math.min(23 * 60 + 45, futureRounded);
  }

  const endTotal = Math.min(MAX_WHEEL_MINUTES, startTotal + safeDuration);
  const startParts = splitMinutes(startTotal);
  const endParts = splitMinutes(endTotal);
  return {
    startHour: startParts.hour,
    startMinute: startParts.minute,
    endHour: endParts.hour,
    endMinute: endParts.minute,
  };
}

function buildIsoFromDateAndHHMM(dateStr: string, hhmm: string, timezone: string): string | null {
  const trimmed = hhmm.trim();
  if (!/^\d{2}:\d{2}$/.test(trimmed)) return null;
  const [hh, mm] = trimmed.split(':').map(Number);
  if (hh < 0 || hh > 23 || mm < 0 || mm > 59) return null;
  const offset = TIMEZONE_OFFSETS[timezone] ?? '+07:00';
  const d = new Date(`${dateStr}T${trimmed}:00${offset}`);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString();
}

interface TimeWheelColumnProps {
  items: number[];
  selectedValue: number;
  label: string;
  onChange: (value: number) => void;
}

const TimeWheelColumn: React.FC<TimeWheelColumnProps> = ({
  items,
  selectedValue,
  label,
  onChange,
}) => {
  const scrollRef = useRef<ScrollView>(null);
  const selectedIndex = Math.max(0, items.indexOf(selectedValue));

  const syncScrollPosition = useCallback(
    (animated: boolean) => {
      scrollRef.current?.scrollTo({
        y: selectedIndex * ITEM_HEIGHT,
        animated,
      });
    },
    [selectedIndex]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      syncScrollPosition(true);
    }, 40);
    return () => clearTimeout(timer);
  }, [syncScrollPosition]);

  const commitOffset = useCallback(
    (offsetY: number) => {
      const idx = Math.max(0, Math.min(items.length - 1, Math.round(offsetY / ITEM_HEIGHT)));
      const nextVal = items[idx];
      if (nextVal !== undefined && nextVal !== selectedValue) {
        onChange(nextVal);
      }
    },
    [items, onChange, selectedValue]
  );

  const handleMomentumScrollEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    commitOffset(e.nativeEvent.contentOffset.y);
  };

  const handleScrollEndDrag = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const velocityY = Math.abs(e.nativeEvent.velocity?.y ?? 0);
    if (velocityY < 0.05) {
      commitOffset(e.nativeEvent.contentOffset.y);
    }
  };

  return (
    <View style={tw('flex-1 items-center')}>
      <Text
        style={tw(
          'text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-1'
        )}
      >
        {label}
      </Text>
      <View
        style={[
          tw(
            'w-full rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 overflow-hidden relative'
          ),
          { height: WHEEL_HEIGHT },
        ]}
      >
        {/* Center selection bar */}
        <View
          pointerEvents="none"
          style={[
            tw(
              'absolute left-1 right-1 rounded-xl bg-brand/15 dark:bg-brand/20 border border-brand/40'
            ),
            { top: ITEM_HEIGHT, height: ITEM_HEIGHT },
          ]}
        />
        <ScrollView
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          snapToInterval={ITEM_HEIGHT}
          decelerationRate="fast"
          nestedScrollEnabled
          onLayout={() => syncScrollPosition(false)}
          onMomentumScrollEnd={handleMomentumScrollEnd}
          onScrollEndDrag={handleScrollEndDrag}
          contentContainerStyle={{ paddingVertical: ITEM_HEIGHT }}
        >
          {items.map((item) => {
            const isSelected = item === selectedValue;
            return (
              <TouchableOpacity
                key={item}
                activeOpacity={0.7}
                onPress={() => onChange(item)}
                style={[{ height: ITEM_HEIGHT }, tw('items-center justify-center')]}
              >
                <Text
                  style={tw(
                    isSelected
                      ? 'text-lg font-extrabold text-slate-900 dark:text-white'
                      : 'text-sm font-medium text-slate-400 dark:text-slate-500'
                  )}
                >
                  {String(item).padStart(2, '0')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>
    </View>
  );
};

export const AddSlotModal: React.FC<AddSlotModalProps> = ({
  visible,
  onClose,
  selectedDate,
  timezone = 'Asia/Ho_Chi_Minh',
  defaultDurationMinutes = 30,
  editingSlot = null,
  onSaved,
}) => {
  const { t } = useTranslation();
  useThemeContext();

  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(30);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIsSubmitting(false);
    setNowMs(Date.now());
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 15_000);

    const activeTz = editingSlot?.timezone || timezone || 'Asia/Ho_Chi_Minh';
    if (editingSlot) {
      const startParts = formatIsoTimeInZone(editingSlot.startAt, activeTz);
      const endParts = formatIsoTimeInZone(editingSlot.endAt, activeTz);
      setStartHour(startParts.hour);
      setStartMinute(startParts.minute);
      setEndHour(endParts.hour);
      setEndMinute(endParts.minute);
    } else {
      const defaults = computeDefaultSlotWindow(selectedDate, activeTz, defaultDurationMinutes);
      setStartHour(defaults.startHour);
      setStartMinute(defaults.startMinute);
      setEndHour(defaults.endHour);
      setEndMinute(defaults.endMinute);
    }

    return () => clearInterval(interval);
  }, [visible, editingSlot, selectedDate, defaultDurationMinutes, timezone]);

  const activeTz = editingSlot?.timezone || timezone || 'Asia/Ho_Chi_Minh';
  const baseDate = editingSlot
    ? getDateYyyyMmDdInZone(editingSlot.startAt, activeTz) || selectedDate
    : selectedDate;

  const startMinuteOptions = useMemo(() => buildMinuteOptions(startMinute), [startMinute]);
  const endMinuteOptions = useMemo(() => buildMinuteOptions(endMinute), [endMinute]);

  const startTotalMinutes = startHour * 60 + startMinute;
  const endTotalMinutes = endHour * 60 + endMinute;
  const durationMinutes = endTotalMinutes - startTotalMinutes;
  const isValidRange = durationMinutes > 0;

  const isPastStart = useMemo(() => {
    const startAt = buildIsoFromDateAndHHMM(baseDate, formatHHMM(startHour, startMinute), activeTz);
    if (!startAt) return false;
    return new Date(startAt).getTime() <= nowMs;
  }, [baseDate, startHour, startMinute, activeTz, nowMs]);

  const updateStartAndAutoAdvanceEnd = (nextHour: number, nextMinute: number) => {
    setStartHour(nextHour);
    setStartMinute(nextMinute);
    const nextStartMins = nextHour * 60 + nextMinute;
    if (nextStartMins >= endTotalMinutes) {
      const nextEnd = splitMinutes(
        Math.min(MAX_WHEEL_MINUTES, nextStartMins + Math.max(15, defaultDurationMinutes))
      );
      setEndHour(nextEnd.hour);
      setEndMinute(nextEnd.minute);
    }
  };

  const applyQuickDuration = (minutes: number) => {
    const nextEnd = splitMinutes(Math.min(MAX_WHEEL_MINUTES, startTotalMinutes + minutes));
    setEndHour(nextEnd.hour);
    setEndMinute(nextEnd.minute);
  };

  const handleSave = async () => {
    if (isSubmitting) return;
    if (!isValidRange) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.wheel_invalid_range'),
      });
      return;
    }

    const startAt = buildIsoFromDateAndHHMM(baseDate, formatHHMM(startHour, startMinute), activeTz);
    const endAt = buildIsoFromDateAndHHMM(baseDate, formatHHMM(endHour, endMinute), activeTz);

    if (!startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.wheel_invalid_range'),
      });
      return;
    }

    if (new Date(startAt).getTime() <= Date.now()) {
      setNowMs(Date.now());
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.wheel_past_time_error'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      if (editingSlot) {
        await mobileApi.availabilitySlotsUpdate({
          params: { id: editingSlot.id },
          body: { startAt, endAt, timezone: activeTz },
        });
        Toast.show({
          type: 'success',
          text1: t('mobile.success', 'Success'),
          text2: t('mobile.slot_updated_success'),
        });
      } else {
        await mobileApi.availabilitySlotsCreate({
          body: { startAt, endAt, timezone: activeTz },
          headers: { 'Idempotency-Key': generateIdempotencyKey() },
        });
        Toast.show({
          type: 'success',
          text1: t('mobile.success', 'Success'),
          text2: t('mobile.slot_added_success'),
        });
      }
      onSaved();
      onClose();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.slot_save_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = isValidRange && !isPastStart && !isSubmitting;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800'
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between'
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-2')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-800 items-center justify-center mr-3'
                )}
              >
                <Clock color="#ffffff" size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {editingSlot ? t('mobile.edit_time_slot') : t('mobile.add_time_slot')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.date')}: {baseDate} ({activeTz})
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <View style={tw('p-5 gap-4')}>
            {/* Live Preview Summary */}
            <View
              style={tw(
                `rounded-2xl p-3.5 border flex-row items-center justify-between ${
                  isValidRange && !isPastStart
                    ? 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                    : 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                }`
              )}
            >
              <View style={tw('flex-row items-center gap-2')}>
                <Text style={tw('text-lg font-extrabold text-slate-900 dark:text-white')}>
                  {formatHHMM(startHour, startMinute)}
                </Text>
                <ArrowRight
                  size={16}
                  color={twInstance.color('text-slate-500 dark:text-slate-400')}
                />
                <Text style={tw('text-lg font-extrabold text-slate-900 dark:text-white')}>
                  {formatHHMM(endHour, endMinute)}
                </Text>
              </View>
              <Text
                style={tw(
                  `text-xs font-bold flex-1 text-right ml-3 ${
                    isValidRange && !isPastStart
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-rose-600 dark:text-rose-300'
                  }`
                )}
              >
                {!isValidRange
                  ? t('mobile.wheel_invalid_range')
                  : isPastStart
                    ? t('mobile.wheel_past_time_error')
                    : t('mobile.wheel_duration_summary', { minutes: durationMinutes })}
              </Text>
            </View>

            {/* Dual Clock Wheel Pickers */}
            <View style={tw('flex-row gap-3')}>
              {/* Start Time Wheel */}
              <View
                style={tw(
                  'flex-1 rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800'
                )}
              >
                <Text
                  style={tw(
                    'text-xs font-bold text-center text-slate-700 dark:text-slate-200 mb-2'
                  )}
                >
                  {t('mobile.wheel_start_time')}
                </Text>
                <View style={tw('flex-row items-center gap-1.5')}>
                  <TimeWheelColumn
                    items={HOURS}
                    selectedValue={startHour}
                    label={t('mobile.wheel_hour')}
                    onChange={(h) => updateStartAndAutoAdvanceEnd(h, startMinute)}
                  />
                  <Text style={tw('text-lg font-bold text-slate-400 pt-4')}>:</Text>
                  <TimeWheelColumn
                    items={startMinuteOptions}
                    selectedValue={startMinute}
                    label={t('mobile.wheel_minute')}
                    onChange={(m) => updateStartAndAutoAdvanceEnd(startHour, m)}
                  />
                </View>
              </View>

              {/* End Time Wheel */}
              <View
                style={tw(
                  'flex-1 rounded-2xl bg-slate-50 dark:bg-slate-950 p-3 border border-slate-200 dark:border-slate-800'
                )}
              >
                <Text
                  style={tw(
                    'text-xs font-bold text-center text-slate-700 dark:text-slate-200 mb-2'
                  )}
                >
                  {t('mobile.wheel_end_time')}
                </Text>
                <View style={tw('flex-row items-center gap-1.5')}>
                  <TimeWheelColumn
                    items={HOURS}
                    selectedValue={endHour}
                    label={t('mobile.wheel_hour')}
                    onChange={setEndHour}
                  />
                  <Text style={tw('text-lg font-bold text-slate-400 pt-4')}>:</Text>
                  <TimeWheelColumn
                    items={endMinuteOptions}
                    selectedValue={endMinute}
                    label={t('mobile.wheel_minute')}
                    onChange={setEndMinute}
                  />
                </View>
              </View>
            </View>

            {/* Quick Duration Stepper Pills */}
            <View>
              <Text
                style={tw(
                  'text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2'
                )}
              >
                {t('mobile.wheel_quick_duration')}
              </Text>
              <View style={tw('flex-row gap-2')}>
                {QUICK_DURATIONS.map((mins) => {
                  const isActive = durationMinutes === mins;
                  return (
                    <TouchableOpacity
                      key={mins}
                      onPress={() => applyQuickDuration(mins)}
                      style={tw(
                        `flex-1 py-2 rounded-xl border items-center ${
                          isActive
                            ? 'bg-brand border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            isActive ? 'text-slate-900' : 'text-slate-600 dark:text-slate-300'
                          }`
                        )}
                      >
                        +{t('mobile.minutes_unit', { count: mins })}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                {t('mobile.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleSave()}
              disabled={!canSubmit}
              style={tw(
                `flex-1 bg-slate-900 dark:bg-brand py-3.5 rounded-xl items-center flex-row justify-center ${
                  !canSubmit ? 'opacity-50' : ''
                }`
              )}
            >
              {isSubmitting ? (
                <ActivityIndicator
                  size="small"
                  color={twInstance.color('text-white dark:text-slate-900')}
                />
              ) : (
                <>
                  {editingSlot ? (
                    <Save
                      color={twInstance.color('text-white dark:text-slate-900')}
                      size={17}
                      style={tw('mr-1.5')}
                    />
                  ) : (
                    <Plus
                      color={twInstance.color('text-white dark:text-slate-900')}
                      size={18}
                      style={tw('mr-1')}
                    />
                  )}
                  <Text style={tw('text-white dark:text-slate-900 font-bold text-sm')}>
                    {editingSlot ? t('mobile.save_changes') : t('mobile.create_slot')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
