import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, Switch } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Copy, Calendar, CheckCircle2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface CopyScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  slotCount?: number;
  onCopyConfirm?: (overwrite: boolean) => void;
}

export const CopyScheduleModal: React.FC<CopyScheduleModalProps> = ({
  visible,
  onClose,
  slotCount = 6,
  onCopyConfirm,
}) => {
  const { t } = useTranslation();
  const [overwrite, setOverwrite] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  const handleConfirm = () => {
    setIsCopying(true);
    setTimeout(() => {
      setIsCopying(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.schedule_copied_success', 'Weekly schedule replicated to next week'),
      });
      if (onCopyConfirm) onCopyConfirm(overwrite);
      onClose();
    }, 600);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-center items-center bg-black/65 px-5')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center mr-3')}>
                <Copy color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.copy_schedule_title', 'Replicate Schedule')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.next_week_target', 'Destination: Next Week')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <View style={tw('p-5 gap-4')}>
            <View style={tw('bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/40')}>
              <View style={tw('flex-row items-center mb-1')}>
                <Calendar color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={16} style={tw('mr-2')} />
                <Text style={tw('text-xs font-bold text-indigo-900 dark:text-indigo-200')}>
                  {slotCount} {t('mobile.slots_to_copy', 'available slots will be cloned')}
                </Text>
              </View>
              <Text style={tw('text-xs text-indigo-700 dark:text-indigo-300 leading-4 mt-1')}>
                {t(
                  'mobile.copy_schedule_desc',
                  'All active open time slots from this week will be copied to matching weekdays next week.'
                )}
              </Text>
            </View>

            {/* Overwrite Toggle */}
            <View style={tw('flex-row justify-between items-center p-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950')}>
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}>
                  {t('mobile.overwrite_existing_slots', 'Replace existing slots')}
                </Text>
                <Text style={tw('text-[11px] text-slate-500 leading-3')}>
                  {t('mobile.overwrite_desc', 'Clear unbooked slots next week before copy')}
                </Text>
              </View>
              <Switch
                value={overwrite}
                onValueChange={setOverwrite}
                trackColor={{ false: '#cbd5e1', true: '#6366f1' }}
                thumbColor="#ffffff"
              />
            </View>
          </View>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3 bg-slate-50 dark:bg-slate-950/60')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-white dark:bg-slate-800 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isCopying}
              style={tw('flex-1 bg-indigo-600 py-3 rounded-xl items-center flex-row justify-center shadow-sm')}
            >
              <Copy color="#ffffff" size={16} style={tw('mr-1.5')} />
              <Text style={tw('text-white font-bold text-xs')}>
                {isCopying ? t('mobile.copying', 'Copying...') : t('mobile.confirm_copy', 'Confirm Copy')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
