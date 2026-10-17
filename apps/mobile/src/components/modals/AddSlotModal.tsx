import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Clock, Plus, Video, MessageCircle, Building2, Check } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface AddSlotModalProps {
  visible: boolean;
  onClose: () => void;
  selectedDate?: string;
  onAddSlot: (newSlot: { time: string; type: string }) => void;
}

export const AddSlotModal: React.FC<AddSlotModalProps> = ({
  visible,
  onClose,
  selectedDate = 'Today',
  onAddSlot,
}) => {
  const { t } = useTranslation();

  const standardTimes = [
    '08:00 - 08:30',
    '09:00 - 09:30',
    '10:00 - 10:30',
    '11:00 - 11:30',
    '14:00 - 14:30',
    '15:00 - 15:30',
    '16:00 - 16:30',
    '17:00 - 17:30',
  ];

  const [selectedTime, setSelectedTime] = useState('09:00 - 09:30');
  const [customTime, setCustomTime] = useState('');
  const [sessionType, setSessionType] = useState<'video' | 'chat' | 'clinic'>('video');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = () => {
    const finalTime = customTime.trim() ? customTime.trim() : selectedTime;
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      onAddSlot({
        time: finalTime,
        type: sessionType === 'video' ? 'Video Call' : sessionType === 'chat' ? 'Chat Consultation' : 'Clinic Visit',
      });
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.slot_added_success', 'New appointment slot added to schedule'),
      });
      setCustomTime('');
      onClose();
    }, 500);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw('flex-1 justify-end bg-black/60')}
      >
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-slate-900 dark:bg-slate-800 items-center justify-center mr-3')}>
                <Clock color="#ffffff" size={20} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.add_time_slot', 'Add Time Slot')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.date', 'Date')}: {selectedDate}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* Consultation Type */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2')}>
                {t('mobile.consultation_type', 'Consultation Type')}
              </Text>
              <View style={tw('flex-row gap-2')}>
                <TouchableOpacity
                  onPress={() => setSessionType('video')}
                  style={tw(
                    `flex-1 p-3 rounded-2xl border items-center ${
                      sessionType === 'video'
                        ? 'border-brand bg-brand/10 dark:bg-brand/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                    }`
                  )}
                >
                  <Video color={sessionType === 'video' ? '#0f172a' : '#64748b'} size={20} style={tw('mb-1.5')} />
                  <Text style={tw(`text-xs font-bold ${sessionType === 'video' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`)}>
                    {t('mobile.video_call', 'Video Call')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSessionType('chat')}
                  style={tw(
                    `flex-1 p-3 rounded-2xl border items-center ${
                      sessionType === 'chat'
                        ? 'border-brand bg-brand/10 dark:bg-brand/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                    }`
                  )}
                >
                  <MessageCircle color={sessionType === 'chat' ? '#0f172a' : '#64748b'} size={20} style={tw('mb-1.5')} />
                  <Text style={tw(`text-xs font-bold ${sessionType === 'chat' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`)}>
                    {t('mobile.chat', 'Chat')}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setSessionType('clinic')}
                  style={tw(
                    `flex-1 p-3 rounded-2xl border items-center ${
                      sessionType === 'clinic'
                        ? 'border-brand bg-brand/10 dark:bg-brand/20'
                        : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                    }`
                  )}
                >
                  <Building2 color={sessionType === 'clinic' ? '#0f172a' : '#64748b'} size={20} style={tw('mb-1.5')} />
                  <Text style={tw(`text-xs font-bold ${sessionType === 'clinic' ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`)}>
                    {t('mobile.clinic_visit', 'In-Person')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Predefined Time Slots */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2')}>
                {t('mobile.select_slot_time', 'Select Available Window (30 min)')}
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
                    {selectedTime === st && !customTime && (
                      <Check color="#10b981" size={14} style={tw('mr-1')} />
                    )}
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
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1')}>
                {t('mobile.or_custom_time', 'Or Custom Time (e.g. 18:00 - 18:45)')}
              </Text>
              <TextInput
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-xs text-slate-900 dark:text-white')}
                value={customTime}
                onChangeText={setCustomTime}
                placeholder="HH:MM - HH:MM"
                placeholderTextColor={twInstance.color('text-slate-400')}
              />
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleCreate}
              disabled={isSubmitting}
              style={tw('flex-1 bg-slate-900 dark:bg-white py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              <Plus color={twInstance.color('text-white dark:text-slate-900')} size={18} style={tw('mr-1')} />
              <Text style={tw('text-white dark:text-slate-900 font-bold text-sm')}>
                {isSubmitting ? t('mobile.saving', 'Saving...') : t('mobile.create_slot', 'Create Slot')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
