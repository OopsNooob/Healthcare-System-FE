import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Settings2, Globe, Clock, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';

export interface DoctorBookingSettingsDto {
  timezone: string;
  bookingPolicy: 'instant' | 'approval_required';
  defaultDurationMinutes: number;
  bufferMinutes: number;
  minNoticeMinutes: number;
  cancellationDeadlineMinutes: number;
  checkInEarlyMinutes: number;
  noShowAfterMinutes: number;
}

interface BookingSettingsModalProps {
  visible: boolean;
  onClose: () => void;
  settings: DoctorBookingSettingsDto;
  onSave: (next: DoctorBookingSettingsDto) => void;
}

export const BookingSettingsModal: React.FC<BookingSettingsModalProps> = ({
  visible,
  onClose,
  settings,
  onSave,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DoctorBookingSettingsDto>(settings);

  useEffect(() => {
    if (visible) {
      setDraft(settings);
    }
  }, [visible, settings]);

  const timezones = ['Asia/Ho_Chi_Minh', 'Asia/Bangkok', 'Asia/Singapore', 'UTC'];

  const handleSave = () => {
    onSave(draft);
    Toast.show({
      type: 'success',
      text1: t('mobile.booking_settings_saved'),
      text2: draft.timezone,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800'
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between'
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center mr-3'
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
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* Timezone Preference */}
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
                      onPress={() => setDraft({ ...draft, timezone: tz })}
                      style={tw(
                        `w-[48%] py-2.5 px-2 rounded-xl border items-center justify-center ${
                          active
                            ? 'bg-indigo-600 border-indigo-600'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`
                      )}
                    >
                      <Text
                        numberOfLines={1}
                        style={tw(
                          `text-xs font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`
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
                      onPress={() => setDraft({ ...draft, defaultDurationMinutes: val })}
                      style={tw(
                        `flex-1 py-2.5 rounded-xl border items-center ${
                          active
                            ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                          }`
                        )}
                      >
                        {val} {t('mobile.minutes_short')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* System-Enforced Consultation Policy (Read-Only) */}
            <View
              style={tw(
                'bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-2.5'
              )}
            >
              <View style={tw('flex-row items-center mb-1')}>
                <ShieldCheck color={twInstance.color('text-emerald-500')} size={16} style={tw('mr-1.5')} />
                <Text
                  style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}
                >
                  {t('mobile.system_policy_title')}
                </Text>
              </View>
              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                  {t('mobile.booking_policy_label')}
                </Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.policy_instant')}
                </Text>
              </View>
              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                  {t('mobile.cancel_deadline_min')}
                </Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                  60 {t('mobile.minutes_short')}
                </Text>
              </View>
              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                  {t('mobile.noshow_after_min')}
                </Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                  10 {t('mobile.minutes_short')}
                </Text>
              </View>
              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                  {t('mobile.min_notice_label', 'Minimum Notice')}
                </Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                  {settings.minNoticeMinutes} {t('mobile.minutes_short')}
                </Text>
              </View>
              <View style={tw('flex-row justify-between items-center')}>
                <Text style={tw('text-xs text-slate-600 dark:text-slate-400')}>
                  {t('mobile.buffer_minutes_label', 'Slot Buffer')}
                </Text>
                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                  {settings.bufferMinutes} {t('mobile.minutes_short')}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={tw('flex-1 py-3.5 rounded-xl bg-brand items-center justify-center')}
            >
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.save_settings')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
