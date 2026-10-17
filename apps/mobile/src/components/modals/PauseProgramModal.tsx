import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, PauseCircle, AlertTriangle, Calendar, CheckCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface PauseProgramModalProps {
  visible: boolean;
  onClose: () => void;
  programName?: string;
  onConfirmPause: (reason: string, durationDays: number) => void;
}

export const PauseProgramModal: React.FC<PauseProgramModalProps> = ({
  visible,
  onClose,
  programName = 'Hypertension Care Program',
  onConfirmPause,
}) => {
  const { t } = useTranslation();

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

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onConfirmPause(selectedReason, selectedDuration);
      Toast.show({
        type: 'info',
        text1: t('mobile.program_paused', 'Program Paused'),
        text2: t('mobile.program_paused_desc', 'Care program tasks suspended for selected duration'),
      });
      onClose();
    }, 600);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-center items-center bg-black/65 px-4')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl')}>
          {/* Header Banner */}
          <View style={tw('bg-amber-50 dark:bg-amber-950/40 p-5 items-center border-b border-amber-100 dark:border-amber-900/30')}>
            <View style={tw('w-14 h-14 bg-amber-100 dark:bg-amber-900/50 rounded-full items-center justify-center mb-2')}>
              <PauseCircle color="#d97706" size={28} />
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {t('mobile.pause_care_program', 'Pause Care Program')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
              {programName}
            </Text>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            <View style={tw('bg-amber-50/50 dark:bg-amber-950/20 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/40 flex-row items-start')}>
              <AlertTriangle color={twInstance.color('text-amber-500')} size={18} style={tw('mr-2.5 mt-0.5')} />
              <Text style={tw('text-xs text-amber-800 dark:text-amber-200 flex-1 leading-4')}>
                {t(
                  'mobile.pause_notice',
                  'Pausing will freeze your daily task streak and mute non-critical reminders. You can resume anytime.'
                )}
              </Text>
            </View>

            {/* Reason selector */}
            <View>
              <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                {t('mobile.reason_for_pausing', 'Reason for Pausing')}
              </Text>
              <View style={tw('gap-2')}>
                {pauseReasons.map((r) => (
                  <TouchableOpacity
                    key={r.id}
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

            {/* Pause duration */}
            <View>
              <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                {t('mobile.pause_duration', 'Pause Duration')}
              </Text>
              <View style={tw('flex-row gap-2')}>
                {durations.map((d) => (
                  <TouchableOpacity
                    key={d.days}
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
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3 bg-slate-50 dark:bg-slate-950/60')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-white dark:bg-slate-800 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={tw('flex-1 bg-amber-500 py-3 rounded-xl items-center flex-row justify-center shadow-sm')}
            >
              <PauseCircle color="#ffffff" size={16} style={tw('mr-1.5')} />
              <Text style={tw('text-white font-bold text-xs')}>
                {isSubmitting ? t('mobile.pausing', 'Pausing...') : t('mobile.confirm_pause', 'Confirm Pause')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
