import React, { useState } from 'react';
import { ActivityIndicator, Modal, Text, TouchableOpacity, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Calendar, Copy, X } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { generateIdempotencyKey, mobileApi } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { extractApiErrorMessage } from '@/utils/apiError';

export interface CopyableSlotItem {
  startAt: string;
  endAt: string;
  timezone: string;
}

interface CopyScheduleModalProps {
  visible: boolean;
  onClose: () => void;
  slotsToCopy: CopyableSlotItem[];
  onCopied: () => void;
}

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

export const CopyScheduleModal: React.FC<CopyScheduleModalProps> = ({
  visible,
  onClose,
  slotsToCopy,
  onCopied,
}) => {
  const { t } = useTranslation();
  const [isCopying, setIsCopying] = useState(false);

  const handleConfirm = async () => {
    if (isCopying) return;
    if (slotsToCopy.length === 0) {
      Toast.show({
        type: 'info',
        text1: t('mobile.no_slots_to_copy'),
      });
      onClose();
      return;
    }

    setIsCopying(true);
    let createdCount = 0;
    let firstError: unknown = null;

    try {
      for (const slot of slotsToCopy) {
        const nextStart = new Date(new Date(slot.startAt).getTime() + SEVEN_DAYS_MS).toISOString();
        const nextEnd = new Date(new Date(slot.endAt).getTime() + SEVEN_DAYS_MS).toISOString();
        try {
          await mobileApi.availabilitySlotsCreate({
            body: {
              startAt: nextStart,
              endAt: nextEnd,
              timezone: slot.timezone || 'Asia/Ho_Chi_Minh',
            },
            headers: { 'Idempotency-Key': generateIdempotencyKey() },
          });
          createdCount += 1;
        } catch (err) {
          if (!firstError) firstError = err;
        }
      }

      if (createdCount > 0) {
        Toast.show({
          type: 'success',
          text1: t('mobile.success', 'Success'),
          text2: t('mobile.schedule_copied_count', { count: createdCount }),
        });
        onCopied();
        onClose();
      } else {
        Toast.show({
          type: 'error',
          text1: t('mobile.error', 'Error'),
          text2: extractApiErrorMessage(firstError, 'mobile.slot_save_failed'),
        });
      }
    } finally {
      setIsCopying(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-center items-center bg-black/65 px-5')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-slate-200 dark:border-slate-800 overflow-hidden shadow-2xl'
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
                  'w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center mr-3'
                )}
              >
                <Copy color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.copy_schedule_title')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.next_week_target')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isCopying}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <View style={tw('p-5 gap-4')}>
            <View
              style={tw(
                'bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/40'
              )}
            >
              <View style={tw('flex-row items-center mb-1')}>
                <Calendar
                  color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                  size={16}
                  style={tw('mr-2')}
                />
                <Text style={tw('text-xs font-bold text-indigo-900 dark:text-indigo-200 flex-1')}>
                  {slotsToCopy.length} {t('mobile.slots_to_copy')}
                </Text>
              </View>
              <Text style={tw('text-xs text-indigo-700 dark:text-indigo-300 leading-4 mt-1')}>
                {t('mobile.copy_schedule_desc')}
              </Text>
            </View>
          </View>

          {/* Footer Actions */}
          <View
            style={tw(
              'p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3 bg-slate-50 dark:bg-slate-950/60'
            )}
          >
            <TouchableOpacity
              onPress={onClose}
              disabled={isCopying}
              style={tw(
                'flex-1 bg-white dark:bg-slate-800 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center'
              )}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>
                {t('mobile.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => void handleConfirm()}
              disabled={isCopying || slotsToCopy.length === 0}
              style={tw(
                `flex-1 bg-indigo-600 py-3 rounded-xl items-center flex-row justify-center shadow-sm ${
                  isCopying || slotsToCopy.length === 0 ? 'opacity-60' : ''
                }`
              )}
            >
              {isCopying ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Copy color="#ffffff" size={16} style={tw('mr-1.5')} />
                  <Text style={tw('text-white font-bold text-xs')}>
                    {t('mobile.confirm_copy')}
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
