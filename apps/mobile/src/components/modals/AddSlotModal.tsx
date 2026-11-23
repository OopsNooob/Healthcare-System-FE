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
import { AppModalToast } from '@/components/ui/AppToast';
import { extractApiErrorInfo, extractApiErrorMessage } from '@/utils/apiError';
import {
  buildIsoFromDateAndHHMM,
  computeEarliestValidSlot,
  formatHHMM,
  formatIsoTimeInZone,
  getDateYyyyMmDdInZone,
  MAX_WHEEL_MINUTES,
  splitMinutes,
} from '@/utils/slotTimeWindow';

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
  minNoticeMinutes?: number;
  onMinNoticeDetected?: (minutes: number) => void;
  editingSlot?: EditableSlotTarget | null;
  onSaved: (savedDate?: string) => void;
}

const ITEM_HEIGHT = 40;
const WHEEL_HEIGHT = ITEM_HEIGHT * 3;
const QUICK_DURATIONS = [15, 30, 45, 60] as const;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const BASE_MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);

function buildMinuteOptions(extraMinute?: number): number[] {
  if (typeof extraMinute === 'number' && !BASE_MINUTES.includes(extraMinute)) {
    return [...BASE_MINUTES, extraMinute].sort((a, b) => a - b);
  }
  return BASE_MINUTES;
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
  minNoticeMinutes = 60,
  onMinNoticeDetected,
  editingSlot = null,
  onSaved,
}) => {
  const { t } = useTranslation();
  useThemeContext();

  const [effectiveMinNotice, setEffectiveMinNotice] = useState(minNoticeMinutes);
  const [targetDate, setTargetDate] = useState(selectedDate);
  const [autoAdjustedNotice, setAutoAdjustedNotice] = useState(false);
  const [startHour, setStartHour] = useState(9);
  const [startMinute, setStartMinute] = useState(0);
  const [endHour, setEndHour] = useState(9);
  const [endMinute, setEndMinute] = useState(30);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setEffectiveMinNotice(minNoticeMinutes);
  }, [minNoticeMinutes]);

  useEffect(() => {
    if (!visible) return;
    setIsSubmitting(false);
    const currentNow = Date.now();
    setNowMs(currentNow);
    const interval = setInterval(() => {
      setNowMs(Date.now());
    }, 15_000);

    const activeTz = editingSlot?.timezone || timezone || 'Asia/Ho_Chi_Minh';
    if (editingSlot) {
      const startParts = formatIsoTimeInZone(editingSlot.startAt, activeTz);
      const endParts = formatIsoTimeInZone(editingSlot.endAt, activeTz);
      setTargetDate(getDateYyyyMmDdInZone(editingSlot.startAt, activeTz) || selectedDate);
      setStartHour(startParts.hour);
      setStartMinute(startParts.minute);
      setEndHour(endParts.hour);
      setEndMinute(endParts.minute);
      setAutoAdjustedNotice(false);
    } else {
      const defaults = computeEarliestValidSlot(
        selectedDate,
        activeTz,
        defaultDurationMinutes,
        effectiveMinNotice,
        currentNow
      );
      setTargetDate(defaults.date);
      setStartHour(defaults.startHour);
      setStartMinute(defaults.startMinute);
      setEndHour(defaults.endHour);
      setEndMinute(defaults.endMinute);
      setAutoAdjustedNotice(defaults.autoAdjustedDate || defaults.autoAdjustedTime);
    }

    return () => clearInterval(interval);
  }, [visible, editingSlot, selectedDate, defaultDurationMinutes, timezone, effectiveMinNotice]);

  const activeTz = editingSlot?.timezone || timezone || 'Asia/Ho_Chi_Minh';
  const baseDate = editingSlot
    ? getDateYyyyMmDdInZone(editingSlot.startAt, activeTz) || selectedDate
    : targetDate;

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

  const isTooSoonForNotice = useMemo(() => {
    if (isPastStart || !isValidRange) return false;
    const startAt = buildIsoFromDateAndHHMM(baseDate, formatHHMM(startHour, startMinute), activeTz);
    if (!startAt) return false;
    return new Date(startAt).getTime() < nowMs + effectiveMinNotice * 60_000;
  }, [baseDate, startHour, startMinute, activeTz, nowMs, effectiveMinNotice, isPastStart, isValidRange]);

  const earliestWindow = useMemo(
    () =>
      computeEarliestValidSlot(
        baseDate,
        activeTz,
        Math.max(15, durationMinutes > 0 ? durationMinutes : defaultDurationMinutes),
        effectiveMinNotice,
        nowMs
      ),
    [baseDate, activeTz, durationMinutes, defaultDurationMinutes, effectiveMinNotice, nowMs]
  );

  const earliestDisplayLabel =
    earliestWindow.earliestDate !== baseDate
      ? `${earliestWindow.earliestDate} ${formatHHMM(
          earliestWindow.earliestHour,
          earliestWindow.earliestMinute
        )}`
      : formatHHMM(earliestWindow.earliestHour, earliestWindow.earliestMinute);

  const jumpToEarliestValid = useCallback(
    (noticeMins = effectiveMinNotice, preserveDuration = durationMinutes) => {
      const currentNow = Date.now();
      setNowMs(currentNow);
      const nextDuration =
        preserveDuration > 0 ? preserveDuration : Math.max(15, defaultDurationMinutes);
      const nextWin = computeEarliestValidSlot(
        editingSlot ? baseDate : selectedDate,
        activeTz,
        nextDuration,
        noticeMins,
        currentNow
      );
      if (!editingSlot) {
        setTargetDate(nextWin.date);
      }
      setStartHour(nextWin.startHour);
      setStartMinute(nextWin.startMinute);
      setEndHour(nextWin.endHour);
      setEndMinute(nextWin.endMinute);
      setAutoAdjustedNotice(true);
    },
    [effectiveMinNotice, durationMinutes, defaultDurationMinutes, editingSlot, baseDate, selectedDate, activeTz]
  );

  const updateStartAndAutoAdvanceEnd = (nextHour: number, nextMinute: number) => {
    setStartHour(nextHour);
    setStartMinute(nextMinute);
    setAutoAdjustedNotice(false);
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

    const nowCheck = Date.now();
    const startMs = new Date(startAt).getTime();
    if (startMs <= nowCheck) {
      setNowMs(nowCheck);
      jumpToEarliestValid(effectiveMinNotice);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.wheel_past_time_error'),
      });
      return;
    }

    if (startMs < nowCheck + effectiveMinNotice * 60_000) {
      setNowMs(nowCheck);
      jumpToEarliestValid(effectiveMinNotice);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.api_err_min_notice_not_met', {
          minutes: effectiveMinNotice,
          defaultValue: `The slot must be scheduled at least ${effectiveMinNotice} minutes in advance.`,
        }),
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
      onSaved(baseDate);
      onClose();
    } catch (err) {
      const info = extractApiErrorInfo(err);
      if (info.code === 'MIN_NOTICE_NOT_MET') {
        const serverNotice =
          typeof info.details?.minNoticeMinutes === 'number' &&
          Number.isFinite(info.details.minNoticeMinutes)
            ? info.details.minNoticeMinutes
            : effectiveMinNotice;
        if (serverNotice !== effectiveMinNotice) {
          setEffectiveMinNotice(serverNotice);
          onMinNoticeDetected?.(serverNotice);
        }
        jumpToEarliestValid(serverNotice);
      }
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.slot_save_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const canSubmit = isValidRange && !isPastStart && !isTooSoonForNotice && !isSubmitting;

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
                `rounded-2xl p-3.5 border ${
                  !isValidRange || isPastStart
                    ? 'bg-rose-50 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/50'
                    : isTooSoonForNotice
                      ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/50'
                      : 'bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/50'
                }`
              )}
            >
              <View style={tw('flex-row items-center justify-between')}>
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
                      !isValidRange || isPastStart
                        ? 'text-rose-600 dark:text-rose-300'
                        : isTooSoonForNotice
                          ? 'text-amber-700 dark:text-amber-300'
                          : 'text-emerald-700 dark:text-emerald-300'
                    }`
                  )}
                >
                  {!isValidRange
                    ? t('mobile.wheel_invalid_range')
                    : isPastStart
                      ? t('mobile.wheel_past_time_error')
                      : isTooSoonForNotice
                        ? t('mobile.wheel_min_notice_error', {
                            minutes: effectiveMinNotice,
                            time: earliestDisplayLabel,
                            defaultValue: `Must be at least ${effectiveMinNotice} min from now (earliest: ${earliestDisplayLabel})`,
                          })
                        : t('mobile.wheel_duration_summary', { minutes: durationMinutes })}
                </Text>
              </View>

              {(isPastStart || isTooSoonForNotice) && !editingSlot ? (
                <TouchableOpacity
                  onPress={() => jumpToEarliestValid()}
                  style={tw(
                    'mt-2.5 self-start px-3 py-1.5 rounded-xl bg-slate-900 dark:bg-brand'
                  )}
                >
                  <Text style={tw('text-xs font-bold text-white dark:text-slate-900')}>
                    {t('mobile.wheel_jump_earliest', {
                      time: earliestDisplayLabel,
                      defaultValue: `Use earliest (${earliestDisplayLabel})`,
                    })}
                  </Text>
                </TouchableOpacity>
              ) : autoAdjustedNotice && !editingSlot && isValidRange ? (
                <Text style={tw('text-[11px] text-emerald-700 dark:text-emerald-300 mt-1.5')}>
                  {t('mobile.wheel_auto_adjusted_notice', {
                    minutes: effectiveMinNotice,
                    defaultValue: `Auto-adjusted to the earliest bookable time (minimum ${effectiveMinNotice}-minute notice).`,
                  })}
                </Text>
              ) : null}
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
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
