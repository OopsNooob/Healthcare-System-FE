import React, { useState, useEffect } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Settings2, Globe, Clock, CheckCircle2, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

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
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith('vi');
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
      text1: t('mobile.booking_settings_saved', isVi ? 'Đã lưu cấu hình đặt lịch' : 'Booking Settings Saved'),
      text2: `${draft.timezone}`,
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center mr-3')}>
                <Settings2 color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.booking_settings_title', isVi ? 'Cấu hình Đặt lịch & Phòng chờ' : 'Booking & Waiting Room Settings')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t(
                    'mobile.booking_settings_subtitle',
                    'Thiết lập múi giờ, thời lượng ca khám và chính sách nhận lịch'
                  )}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* 1. Timezone */}
            <View>
              <View style={tw('flex-row items-center mb-2')}>
                <Globe color={twInstance.color('text-indigo-500')} size={16} style={tw('mr-1.5')} />
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                  {t('mobile.iana_timezone', isVi ? 'Múi giờ làm việc' : 'Working Timezone')}
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
                        style={tw(`text-xs font-bold ${active ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`)}
                      >
                        {tz}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* 2. Booking Policy */}
            <View>
              <View style={tw('flex-row items-center mb-2')}>
                <ShieldCheck color={twInstance.color('text-emerald-500')} size={16} style={tw('mr-1.5')} />
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                  {t('mobile.booking_policy_label', isVi ? 'Chính sách xác nhận lịch đặt' : 'Booking Confirmation Policy')}
                </Text>
              </View>
              <View style={tw('gap-2.5')}>
                <TouchableOpacity
                  onPress={() => setDraft({ ...draft, bookingPolicy: 'instant' })}
                  style={tw(
                    `p-3.5 rounded-2xl border flex-row items-center justify-between ${
                      draft.bookingPolicy === 'instant'
                        ? 'bg-emerald-50 dark:bg-emerald-950/30 border-emerald-500'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`
                  )}
                >
                  <View style={tw('flex-1 mr-2')}>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                      {t('mobile.policy_instant', isVi ? 'Tự động xác nhận' : 'Instant Confirmation')}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                      {t(
                        'mobile.policy_instant_desc',
                        isVi
                          ? 'Lịch đặt của bệnh nhân được xác nhận và giữ chỗ ngay lập tức.'
                          : 'Patient bookings are automatically accepted and reserved immediately.'
                      )}
                    </Text>
                  </View>
                  {draft.bookingPolicy === 'instant' && <CheckCircle2 color="#10b981" size={18} />}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setDraft({ ...draft, bookingPolicy: 'approval_required' })}
                  style={tw(
                    `p-3.5 rounded-2xl border flex-row items-center justify-between ${
                      draft.bookingPolicy === 'approval_required'
                        ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-500'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`
                  )}
                >
                  <View style={tw('flex-1 mr-2')}>
                    <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                      {t('mobile.policy_approval', isVi ? 'Cần bác sĩ phê duyệt' : 'Doctor Approval Required')}
                    </Text>
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                      {t(
                        'mobile.policy_approval_desc',
                        isVi
                          ? 'Lịch đặt sẽ ở trạng thái chờ duyệt cho tới khi bác sĩ bấm Chấp nhận.'
                          : 'Bookings remain pending until you manually review and accept them.'
                      )}
                    </Text>
                  </View>
                  {draft.bookingPolicy === 'approval_required' && <CheckCircle2 color="#f59e0b" size={18} />}
                </TouchableOpacity>
              </View>
            </View>

            {/* 3. Timing & Window Parameters */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 gap-3.5')}>
              <View style={tw('flex-row items-center')}>
                <Clock color={twInstance.color('text-slate-500')} size={16} style={tw('mr-1.5')} />
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                  {t('mobile.window_parameters', isVi ? 'Thông số Khung giờ & Phòng chờ' : 'Slot & Waiting Room Timing')}
                </Text>
              </View>

              {[
                {
                  key: 'defaultDurationMinutes' as const,
                  label: t('mobile.default_duration_min', isVi ? 'Thời lượng mỗi ca khám (phút)' : 'Default Slot Duration (minutes)'),
                  options: [15, 30, 45, 60],
                },
                {
                  key: 'bufferMinutes' as const,
                  label: t('mobile.buffer_min', isVi ? 'Khoảng nghỉ giữa 2 ca khám (phút)' : 'Buffer Between Slots (minutes)'),
                  options: [0, 10, 15, 30],
                },
                {
                  key: 'minNoticeMinutes' as const,
                  label: t('mobile.min_notice_min', isVi ? 'Thời gian đặt trước tối thiểu (phút)' : 'Minimum Advance Notice (minutes)'),
                  options: [30, 60, 120],
                },
                {
                  key: 'cancellationDeadlineMinutes' as const,
                  label: t('mobile.cancel_deadline_min', isVi ? 'Hạn chót đổi hoặc hủy lịch (phút)' : 'Cancellation / Reschedule Deadline (minutes)'),
                  options: [60, 120, 240],
                },
                {
                  key: 'checkInEarlyMinutes' as const,
                  label: t('mobile.checkin_early_min', isVi ? 'Cho phép vào phòng chờ sớm (phút)' : 'Early Check-in Window (minutes)'),
                  options: [10, 15, 30],
                },
                {
                  key: 'noShowAfterMinutes' as const,
                  label: t('mobile.noshow_after_min', isVi ? 'Thời gian chờ tối đa trước khi tính vắng mặt (phút)' : 'No-Show Grace Period (minutes)'),
                  options: [10, 15, 30],
                },
              ].map((param) => (
                <View key={param.key}>
                  <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5')}>
                    {param.label}
                  </Text>
                  <View style={tw('flex-row gap-2')}>
                    {param.options.map((val) => {
                      const active = draft[param.key] === val;
                      return (
                        <TouchableOpacity
                          key={val}
                          onPress={() => setDraft({ ...draft, [param.key]: val })}
                          style={tw(
                            `flex-1 py-2 rounded-xl border items-center ${
                              active
                                ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-400'
                              }`
                            )}
                          >
                            {val}m
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.cancel', isVi ? 'Hủy' : 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={tw('flex-1 py-3.5 rounded-xl bg-brand items-center justify-center')}
            >
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.save_settings', isVi ? 'Lưu cấu hình' : 'Save Settings')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

