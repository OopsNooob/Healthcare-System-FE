import React, { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Check, Clock, Plus, Save, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { generateIdempotencyKey, mobileApi } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
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

const TIMEZONE_OFFSETS: Record<string, string> = {
  'Asia/Ho_Chi_Minh': '+07:00',
  'Asia/Bangkok': '+07:00',
  'Asia/Singapore': '+08:00',
  UTC: 'Z',
};

function addMinutesToHHMM(hhmm: string, deltaMinutes: number): string {
  const [hStr, mStr] = hhmm.split(':');
  const total = Number(hStr) * 60 + Number(mStr) + deltaMinutes;
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function formatIsoTimeInZone(iso: string, timezone: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '09:00';
  try {
    return d.toLocaleTimeString('en-GB', {
      timeZone: timezone || 'Asia/Ho_Chi_Minh',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
  } catch {
    return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  }
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

  const standardTimes = useMemo(() => {
    const starts = ['08:00', '09:00', '10:00', '11:00', '14:00', '15:00', '16:00', '17:00'];
    return starts.map((s) => `${s} - ${addMinutesToHHMM(s, defaultDurationMinutes)}`);
  }, [defaultDurationMinutes]);

  const [selectedTime, setSelectedTime] = useState(standardTimes[1] || '09:00 - 09:30');
  const [customTime, setCustomTime] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!visible) return;
    setIsSubmitting(false);
    if (editingSlot) {
      const tz = editingSlot.timezone || timezone;
      const startStr = formatIsoTimeInZone(editingSlot.startAt, tz);
      const endStr = formatIsoTimeInZone(editingSlot.endAt, tz);
      const range = `${startStr} - ${endStr}`;
      if (standardTimes.includes(range)) {
        setSelectedTime(range);
        setCustomTime('');
      } else {
        setCustomTime(range);
      }
    } else {
      setSelectedTime(standardTimes[1] || '09:00 - 09:30');
      setCustomTime('');
    }
  }, [visible, editingSlot, standardTimes, timezone]);

  const handleSave = async () => {
    if (isSubmitting) return;
    const rawRange = (customTime.trim() || selectedTime).trim();
    const parts = rawRange.split('-').map((p) => p.trim());
    if (parts.length !== 2) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.invalid_time_range_format'),
      });
      return;
    }

    const activeTz = editingSlot?.timezone || timezone || 'Asia/Ho_Chi_Minh';
    const baseDate = editingSlot
      ? new Date(editingSlot.startAt).toLocaleDateString('en-CA', { timeZone: activeTz })
      : selectedDate;

    const startAt = buildIsoFromDateAndHHMM(baseDate, parts[0], activeTz);
    const endAt = buildIsoFromDateAndHHMM(baseDate, parts[1], activeTz);

    if (!startAt || !endAt || new Date(endAt).getTime() <= new Date(startAt).getTime()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.invalid_time_range_format'),
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

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw('flex-1 justify-end bg-black/60')}
      >
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800'
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
                  {t('mobile.date')}: {selectedDate} ({editingSlot?.timezone || timezone})
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

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* Predefined Time Slots */}
            <View>
              <Text
                style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2')}
              >
                {t('mobile.select_slot_time')}
              </Text>
              <View style={tw('flex-row flex-wrap gap-2')}>
                {standardTimes.map((st) => (
                  <TouchableOpacity
                    key={st}
                    onPress={() => {
                      setSelectedTime(st);
                      setCustomTime('');
                    }}
                    style={tw(
                      `px-3 py-2.5 rounded-xl border flex-row items-center ${
                        selectedTime === st && !customTime
                          ? 'border-brand bg-brand/10 dark:bg-brand/20'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                      }`
                    )}
                  >
                    {selectedTime === st && !customTime ? (
                      <Check color="#10b981" size={14} style={tw('mr-1')} />
                    ) : null}
                    <Text
                      style={tw(
                        `text-xs font-bold ${
                          selectedTime === st && !customTime
                            ? 'text-slate-900 dark:text-white'
                            : 'text-slate-600 dark:text-slate-300'
                        }`
                      )}
                    >
                      {st}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Custom Time */}
            <View>
              <Text
                style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1')}
              >
                {t('mobile.or_custom_time')}
              </Text>
              <TextInput
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white'
                )}
                value={customTime}
                onChangeText={setCustomTime}
                placeholder="HH:MM - HH:MM"
                placeholderTextColor={twInstance.color('text-slate-400')}
              />
            </View>
          </ScrollView>

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
              disabled={isSubmitting}
              style={tw(
                `flex-1 bg-slate-900 dark:bg-brand py-3.5 rounded-xl items-center flex-row justify-center ${
                  isSubmitting ? 'opacity-60' : ''
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
                    <Save color={twInstance.color('text-white dark:text-slate-900')} size={17} style={tw('mr-1.5')} />
                  ) : (
                    <Plus color={twInstance.color('text-white dark:text-slate-900')} size={18} style={tw('mr-1')} />
                  )}
                  <Text style={tw('text-white dark:text-slate-900 font-bold text-sm')}>
                    {editingSlot ? t('mobile.save_changes') : t('mobile.create_slot')}
                  </Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
