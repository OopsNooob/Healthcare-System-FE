import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertTriangle,
  Clock,
  Globe,
  Settings2,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { extractApiErrorMessage } from '@/utils/apiError';

export interface DoctorBookingSettingsDto {
  timezone: string;
  bookingPolicy: 'instant';
  defaultDurationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  cancellationDeadlineMinutes: number;
  checkInEarlyMinutes: number;
  noShowAfterMinutes: number;
  effectiveFrom?: string;
  updatedAt?: string;
}

interface BookingSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: DoctorBookingSettingsDto;
  isConfigured?: boolean;
  onSave: (next: DoctorBookingSettingsDto) => Promise<void> | void;
}

interface NumericFieldState {
  bufferMinutes: string;
  minNoticeMinutes: string;
  cancellationDeadlineMinutes: string;
  checkInEarlyMinutes: string;
  noShowAfterMinutes: string;
}

const NUMERIC_RULES = {
  bufferMinutes: { min: 0, max: 60 },
  minNoticeMinutes: { min: 0, max: 10080 },
  cancellationDeadlineMinutes: { min: 0, max: 10080 },
  checkInEarlyMinutes: { min: 0, max: 1440 },
  noShowAfterMinutes: { min: 0, max: 1440 },
} as const;

function toFieldStrings(s: DoctorBookingSettingsDto): NumericFieldState {
  return {
    bufferMinutes: String(s.bufferMinutes),
    minNoticeMinutes: String(s.minNoticeMinutes),
    cancellationDeadlineMinutes: String(s.cancellationDeadlineMinutes),
    checkInEarlyMinutes: String(s.checkInEarlyMinutes),
    noShowAfterMinutes: String(s.noShowAfterMinutes),
  };
}

export const BookingSettingsModal: React.FC<BookingSettingsModalProps> = ({
  visible,
  onClose,
  settings,
  isConfigured = true,
  onSave,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DoctorBookingSettingsDto>(settings);
  const [fields, setFields] = useState<NumericFieldState>(() => toFieldStrings(settings));
  const [isSaving, setIsSaving] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    if (visible) {
      setDraft({ ...settings, bookingPolicy: 'instant' });
      setFields(toFieldStrings(settings));
      setFormError(null);
      setIsSaving(false);
      submitLockRef.current = false;
    }
  }, [visible, settings]);

  const timezones = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'UTC'];

  const handleNumericChange = (key: keyof NumericFieldState, raw: string) => {
    const cleaned = raw.replace(/[^\d]/g, '');
    setFields((prev) => ({ ...prev, [key]: cleaned }));
    setFormError(null);
  };

  const handleSave = async () => {
    if (isSaving || submitLockRef.current) return;
    setFormError(null);

    const parsedBuffer = Number(fields.bufferMinutes);
    const parsedMinNotice = Number(fields.minNoticeMinutes);
    const parsedCancel = Number(fields.cancellationDeadlineMinutes);
    const parsedCheckInEarly = Number(fields.checkInEarlyMinutes);
    const parsedNoShow = Number(fields.noShowAfterMinutes);

    const checks: Array<{
      raw: string;
      val: number;
      min: number;
      max: number;
      label: string;
    }> = [
      {
        raw: fields.bufferMinutes,
        val: parsedBuffer,
        ...NUMERIC_RULES.bufferMinutes,
        label: t('mobile.buffer_minutes_label'),
      },
      {
        raw: fields.minNoticeMinutes,
        val: parsedMinNotice,
        ...NUMERIC_RULES.minNoticeMinutes,
        label: t('mobile.min_notice_label'),
      },
      {
        raw: fields.cancellationDeadlineMinutes,
        val: parsedCancel,
        ...NUMERIC_RULES.cancellationDeadlineMinutes,
        label: t('mobile.cancel_deadline_min'),
      },
      {
        raw: fields.checkInEarlyMinutes,
        val: parsedCheckInEarly,
        ...NUMERIC_RULES.checkInEarlyMinutes,
        label: t('mobile.check_in_early_min'),
      },
      {
        raw: fields.noShowAfterMinutes,
        val: parsedNoShow,
        ...NUMERIC_RULES.noShowAfterMinutes,
        label: t('mobile.noshow_after_min'),
      },
    ];

    for (const c of checks) {
      if (!c.raw.trim() || !Number.isInteger(c.val) || c.val < c.min || c.val > c.max) {
        const msg = t('mobile.booking_settings_range_error', {
          field: c.label,
          min: c.min,
          max: c.max,
        });
        setFormError(msg);
        Toast.show({ type: 'error', text1: t('mobile.error'), text2: msg });
        return;
      }
    }

    submitLockRef.current = true;
    setIsSaving(true);
    try {
      await onSave({
        ...draft,
        bookingPolicy: 'instant',
        bufferMinutes: parsedBuffer,
        minNoticeMinutes: parsedMinNotice,
        cancellationDeadlineMinutes: parsedCancel,
        checkInEarlyMinutes: parsedCheckInEarly,
        noShowAfterMinutes: parsedNoShow,
      });
      onClose();
    } catch (err) {
      const msg = extractApiErrorMessage(err, 'mobile.booking_settings_save_failed');
      setFormError(msg);
      Toast.show({ type: 'error', text1: t('mobile.error'), text2: msg });
    } finally {
      submitLockRef.current = false;
      setIsSaving(false);
    }
  };

  const renderNumberInput = (
    key: keyof NumericFieldState,
    label: string,
    hint: string,
  ) => (
    <View style={tw('gap-1.5')}>
      <View style={tw('flex-row items-center justify-between')}>
        <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1 mr-2')}>
          {label}
        </Text>
        <Text style={tw('text-[11px] text-slate-400 dark:text-slate-500')}>{hint}</Text>
      </View>
      <View
        style={tw(
          'flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5',
        )}
      >
        <TextInput
          value={fields[key]}
          onChangeText={(v) => handleNumericChange(key, v)}
          keyboardType="number-pad"
          editable={!isSaving}
          placeholder="0"
          placeholderTextColor="#94a3b8"
          style={tw('flex-1 text-sm font-bold text-slate-900 dark:text-white')}
        />
        <Text style={tw('text-xs font-medium text-slate-500 dark:text-slate-400 ml-2')}>
          {t('mobile.minutes_short')}
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={isSaving ? undefined : onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800',
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between',
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center mr-3',
                )}
              >
                <Settings2 color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.booking_settings_title')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.booking_settings_subtitle')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={tw('p-5 gap-5')}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {!isConfigured ? (
              <View
                style={tw(
                  'p-3.5 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 flex-row items-start',
                )}
              >
                <AlertTriangle color="#d97706" size={18} style={tw('mt-0.5 mr-2.5')} />
                <Text style={tw('text-xs text-amber-800 dark:text-amber-200 flex-1 leading-4')}>
                  {t('mobile.booking_settings_unconfigured_desc')}
                </Text>
              </View>
            ) : null}

            {formError ? (
              <View
                style={tw(
                  'p-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800',
                )}
              >
                <Text style={tw('text-xs text-rose-700 dark:text-rose-300 font-medium')}>
                  {formError}
                </Text>
              </View>
            ) : null}

            {/* Fixed Booking Policy Notice */}
            <View
              style={tw(
                'bg-emerald-50/70 dark:bg-emerald-950/30 px-4 py-3 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 flex-row items-center justify-between',
              )}
            >
              <View style={tw('flex-row items-center flex-1 mr-2')}>
                <ShieldCheck color="#10b981" size={16} style={tw('mr-2')} />
                <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200')}>
                  {t('mobile.booking_policy_label')}
                </Text>
              </View>
              <View style={tw('px-2.5 py-1 rounded-lg bg-emerald-100 dark:bg-emerald-900/60')}>
                <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                  {t('mobile.policy_instant')}
                </Text>
              </View>
            </View>

            {/* Editable Backend E1 Rules */}
            <View
              style={tw(
                'bg-slate-50/70 dark:bg-slate-950/60 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-3.5',
              )}
            >
              <Text
                style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}
              >
                {t('mobile.booking_rules_section_title')}
              </Text>
              {renderNumberInput('bufferMinutes', t('mobile.buffer_minutes_label'), '0–60')}
              {renderNumberInput('minNoticeMinutes', t('mobile.min_notice_label'), '0–10080')}
              {renderNumberInput(
                'cancellationDeadlineMinutes',
                t('mobile.cancel_deadline_min'),
                '0–10080',
              )}
              {renderNumberInput('checkInEarlyMinutes', t('mobile.check_in_early_min'), '0–1440')}
              {renderNumberInput('noShowAfterMinutes', t('mobile.noshow_after_min'), '0–1440')}
            </View>

            {/* Local UI Timezone Preference */}
            <View>
              <View style={tw('flex-row items-center mb-2')}>
                <Globe color={twInstance.color('text-indigo-500')} size={16} style={tw('mr-1.5')} />
                <Text
                  style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}
                >
                  {t('mobile.iana_timezone')}
                </Text>
              </View>
              <View style={tw('flex-row flex-wrap justify-between gap-y-2.5')}>
                {timezones.map((tz) => {
                  const active = draft.timezone === tz;
                  return (
                    <TouchableOpacity
                      key={tz}
                      disabled={isSaving}
                      onPress={() => setDraft({ ...draft, timezone: tz })}
                      style={tw(
                        `w-[48%] py-2.5 px-2 rounded-xl border items-center justify-center ${
                          active
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`,
                      )}
                    >
                      <Text
                        numberOfLines={1}
                        style={tw(
                          `text-xs font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`,
                        )}
                      >
                        {tz}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Default Slot Duration for Creating New Slots */}
            <View>
              <View style={tw('flex-row items-center mb-2')}>
                <Clock color={twInstance.color('text-slate-500')} size={16} style={tw('mr-1.5')} />
                <Text
                  style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}
                >
                  {t('mobile.default_duration_min')}
                </Text>
              </View>
              <View style={tw('flex-row gap-2')}>
                {[15, 30, 45, 60].map((val) => {
                  const active = draft.defaultDurationMinutes === val;
                  return (
                    <TouchableOpacity
                      key={val}
                      disabled={isSaving}
                      onPress={() => setDraft({ ...draft, defaultDurationMinutes: val })}
                      style={tw(
                        `flex-1 py-2.5 rounded-xl border items-center ${
                          active
                            ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`,
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                          }`,
                        )}
                      >
                        {val} {t('mobile.minutes_short')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSaving}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleSave()}
              disabled={isSaving}
              style={tw(
                `flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${
                  isSaving ? 'opacity-70' : ''
                }`,
              )}
            >
              {isSaving ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={tw('font-bold text-slate-900 text-sm')}>
                  {t('mobile.save_settings')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
