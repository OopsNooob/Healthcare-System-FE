import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { PauseCircle, AlertTriangle, LogOut } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useThemeContext } from '@/context/ThemeContext';
import { extractApiErrorMessage } from '@/utils/apiError';

interface PauseProgramModalProps {
  visible: boolean;
  onClose: () => void;
  programName?: string;
  mode?: 'pause' | 'withdraw';
  onConfirmPause: (reason: string, durationDays: number) => Promise<void> | void;
}

export const PauseProgramModal: React.FC<PauseProgramModalProps> = ({
  visible,
  onClose,
  programName,
  mode = 'pause',
  onConfirmPause,
}) => {
  const { t } = useTranslation();
  useThemeContext();

  const pauseReasons = [
    { id: 'hospitalized', label: t('mobile.pause_reason_hospitalized', 'Hospitalization / Inpatient Care') },
    { id: 'travel', label: t('mobile.pause_reason_travel', 'Traveling / Out of town') },
    { id: 'doctor_advised', label: t('mobile.pause_reason_doctor', 'Physician recommended temporary hold') },
    { id: 'personal', label: t('mobile.pause_reason_personal', 'Personal break') },
  ];

  const durations = [
    { days: 7, label: `7 ${t('mobile.days', 'days')}` },
    { days: 14, label: `14 ${t('mobile.days', 'days')}` },
    { days: 30, label: `30 ${t('mobile.days', 'days')}` },
  ];

  const [selectedReason, setSelectedReason] = useState('hospitalized');
  const [selectedDuration, setSelectedDuration] = useState(7);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isWithdraw = mode === 'withdraw';

  const handleConfirm = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const reasonText =
        pauseReasons.find((r) => r.id === selectedReason)?.label ?? selectedReason;
      await onConfirmPause(reasonText, selectedDuration);
      Toast.show({
        type: 'info',
        text1: isWithdraw
          ? t('mobile.program_withdrawn_title', 'Monitoring Stopped')
          : t('mobile.program_paused', 'Program Paused'),
        text2: isWithdraw
          ? t('mobile.program_withdrawn_desc', 'Your care enrollment consent has been withdrawn.')
          : t('mobile.program_paused_desc', 'Care program tasks suspended.'),
      });
      onClose();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.program_action_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-center items-center bg-black/65 px-4')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl')}>
          <View
            style={tw(
              `p-5 items-center border-b ${
                isWithdraw
                  ? 'bg-rose-50 dark:bg-rose-950/40 border-rose-100 dark:border-rose-900/30'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-100 dark:border-amber-900/30'
              }`
            )}
          >
            <View
              style={tw(
                `w-14 h-14 rounded-full items-center justify-center mb-2 ${
                  isWithdraw ? 'bg-rose-100 dark:bg-rose-900/50' : 'bg-amber-100 dark:bg-amber-900/50'
                }`
              )}
            >
              {isWithdraw ? (
                <LogOut color="#e11d48" size={28} />
              ) : (
                <PauseCircle color="#d97706" size={28} />
              )}
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {isWithdraw
                ? t('mobile.withdraw_care_program', 'Withdraw Care Consent')
                : t('mobile.pause_care_program', 'Pause Care Program')}
            </Text>
            {programName ? (
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
                {programName}
              </Text>
            ) : null}
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            <View
              style={tw(
                `p-3.5 rounded-2xl border flex-row items-start ${
                  isWithdraw
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 border-rose-200 dark:border-rose-800/40'
                    : 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/40'
                }`
              )}
            >
              <AlertTriangle
                color={twInstance.color(isWithdraw ? 'text-rose-500' : 'text-amber-500')}
                size={18}
                style={tw('mr-2.5 mt-0.5')}
              />
              <Text
                style={tw(
                  `text-xs flex-1 leading-4 ${
                    isWithdraw ? 'text-rose-800 dark:text-rose-200' : 'text-amber-800 dark:text-amber-200'
                  }`
                )}
              >
                {isWithdraw
                  ? t(
                      'mobile.withdraw_consent_notice',
                      'Withdrawing consent cancels remaining scheduled tasks and stops remote monitoring under this enrollment.'
                    )
                  : t(
                      'mobile.pause_notice',
                      'Pausing will freeze daily task reminders until you resume the care program.'
                    )}
              </Text>
            </View>

            {!isWithdraw && (
              <>
                <View>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.reason_for_pausing', 'Reason for Pausing')}
                  </Text>
                  <View style={tw('gap-2')}>
                    {pauseReasons.map((r) => (
                      <TouchableOpacity
                        key={r.id}
                        disabled={isSubmitting}
                        onPress={() => setSelectedReason(r.id)}
                        style={tw(
                          `p-3 rounded-xl border flex-row items-center ${
                            selectedReason === r.id
                              ? 'border-amber-500 bg-amber-50/50 dark:bg-amber-950/30'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                          }`
                        )}
                      >
                        <View
                          style={tw(
                            `w-4 h-4 rounded-full border items-center justify-center mr-2.5 ${
                              selectedReason === r.id ? 'border-amber-500' : 'border-slate-400'
                            }`
                          )}
                        >
                          {selectedReason === r.id && <View style={tw('w-2 h-2 rounded-full bg-amber-500')} />}
                        </View>
                        <Text
                          style={tw(
                            `text-xs font-medium flex-1 ${
                              selectedReason === r.id
                                ? 'text-amber-800 dark:text-amber-200 font-bold'
                                : 'text-slate-700 dark:text-slate-300'
                            }`
                          )}
                        >
                          {r.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>

                <View>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                    {t('mobile.pause_duration', 'Pause Duration')}
                  </Text>
                  <View style={tw('flex-row gap-2')}>
                    {durations.map((d) => (
                      <TouchableOpacity
                        key={d.days}
                        disabled={isSubmitting}
                        onPress={() => setSelectedDuration(d.days)}
                        style={tw(
                          `flex-1 p-2.5 rounded-xl border items-center ${
                            selectedDuration === d.days
                              ? 'border-amber-500 bg-amber-100 dark:bg-amber-900/40'
                              : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                          }`
                        )}
                      >
                        <Text
                          style={tw(
                            `text-xs font-bold ${
                              selectedDuration === d.days
                                ? 'text-amber-900 dark:text-amber-200'
                                : 'text-slate-600 dark:text-slate-400'
                            }`
                          )}
                        >
                          {d.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3 bg-slate-50 dark:bg-slate-950/60')}>
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={onClose}
              style={tw('flex-1 bg-white dark:bg-slate-800 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>
                {t('mobile.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={tw(
                `flex-1 py-3 rounded-xl items-center flex-row justify-center shadow-sm ${
                  isWithdraw ? 'bg-rose-600' : 'bg-amber-500'
                } ${isSubmitting ? 'opacity-60' : ''}`
              )}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#ffffff" style={tw('mr-1.5')} />
              ) : isWithdraw ? (
                <LogOut color="#ffffff" size={16} style={tw('mr-1.5')} />
              ) : (
                <PauseCircle color="#ffffff" size={16} style={tw('mr-1.5')} />
              )}
              <Text style={tw('text-white font-bold text-xs')}>
                {isSubmitting
                  ? isWithdraw
                    ? t('mobile.withdrawing', 'Processing...')
                    : t('mobile.pausing', 'Pausing...')
                  : isWithdraw
                    ? t('mobile.confirm_withdraw', 'Confirm Withdraw')
                    : t('mobile.confirm_pause', 'Confirm Pause')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
