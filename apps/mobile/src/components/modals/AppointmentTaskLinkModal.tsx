import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Link2, CheckCircle2, Info, ArrowRight } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

export interface CandidateConsultation {
  id: string;
  doctorName: string;
  specialty: string;
  scheduledStartAt: string;
  requestStatus: 'accepted' | 'pending';
  sessionStatus: 'not_started' | 'waiting' | 'in_consultation' | 'completed';
}

interface AppointmentTaskLinkModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle?: string;
  linkedConsultationId?: string | null;
  onLinkConsultation: (consultationId: string) => void;
  onBookNewSlot?: () => void;
}

export const AppointmentTaskLinkModal: React.FC<AppointmentTaskLinkModalProps> = ({
  visible,
  onClose,
  taskTitle,
  linkedConsultationId,
  onLinkConsultation,
  onBookNewSlot,
}) => {
  const { t } = useTranslation();

  const candidateConsultations: CandidateConsultation[] = [
    {
      id: 'con-sched-101',
      doctorName: 'Dr. Sarah Connor',
      specialty: t('mobile.cardiologist', 'Cardiologist'),
      scheduledStartAt: '2026-11-08 09:30 AM',
      requestStatus: 'accepted',
      sessionStatus: 'not_started',
    },
    {
      id: 'con-sched-102',
      doctorName: 'Dr. Sarah Connor',
      specialty: t('mobile.cardiologist', 'Cardiologist'),
      scheduledStartAt: '2026-11-15 02:00 PM',
      requestStatus: 'accepted',
      sessionStatus: 'not_started',
    },
  ];

  const [selectedId, setSelectedId] = useState<string>(
    linkedConsultationId || candidateConsultations[0]?.id || ''
  );

  const handleConfirmLink = () => {
    if (!selectedId) return;
    onLinkConsultation(selectedId);
    Toast.show({
      type: 'success',
      text1: t('mobile.appointment_linked_title', 'Đã liên kết lịch khám'),
      text2: t(
        'mobile.appointment_linked_desc',
        'Nhiệm vụ sẽ tự động hoàn tất sau khi buổi tư vấn kết thúc (completed).'
      ),
    });
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <Link2 color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {taskTitle || t('mobile.link_appointment_task', 'Liên kết Lịch tái khám')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  POST /care-tasks/:id/appointment-link
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Contract Rule Notice */}
            <View style={tw('bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex-row items-start')}>
              <Info color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={18} style={tw('mt-0.5 mr-2.5 shrink-0')} />
              <Text style={tw('text-xs text-indigo-900 dark:text-indigo-200 flex-1 leading-5')}>
                {t(
                  'mobile.appointment_task_policy_note',
                  'Chọn một lịch khám theo khung giờ (scheduled) đã đặt với bác sĩ phụ trách. Nhiệm vụ này không tạo lịch khám giả và chỉ chuyển sang Hoàn thành khi buổi khám thực tế đạt trạng thái Completed.'
                )}
              </Text>
            </View>

            <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
              {t('mobile.select_existing_scheduled_consultation', 'Chọn lịch khám Scheduled hiện có')}
            </Text>

            <View style={tw('gap-3')}>
              {candidateConsultations.map((item) => {
                const active = selectedId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    onPress={() => setSelectedId(item.id)}
                    style={tw(
                      `p-4 rounded-2xl border flex-row items-center justify-between ${
                        active
                          ? 'bg-blue-50/70 dark:bg-blue-950/40 border-blue-500'
                          : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                      }`
                    )}
                  >
                    <View style={tw('flex-1 mr-3')}>
                      <View style={tw('flex-row items-center mb-1')}>
                        <Calendar color={twInstance.color('text-blue-500')} size={15} />
                        <Text style={tw('text-sm font-bold text-slate-900 dark:text-white ml-1.5')}>
                          {item.scheduledStartAt}
                        </Text>
                      </View>
                      <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300')}>
                        {item.doctorName} • {item.specialty}
                      </Text>
                      <Text style={tw('text-[11px] text-slate-400 dark:text-slate-500 mt-0.5')}>
                        ID: {item.id} • {item.requestStatus.toUpperCase()} / {item.sessionStatus}
                      </Text>
                    </View>
                    {active && <CheckCircle2 color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {onBookNewSlot && (
              <TouchableOpacity
                onPress={() => {
                  onClose();
                  onBookNewSlot();
                }}
                style={tw('p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex-row items-center justify-center')}
              >
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 mr-1.5')}>
                  {t('mobile.book_new_scheduled_slot', 'Chưa có lịch phù hợp? Đặt lịch theo khung giờ mới')}
                </Text>
                <ArrowRight color={twInstance.color('text-slate-600 dark:text-slate-400')} size={15} />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>{t('mobile.cancel', 'Hủy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmLink}
              style={tw('flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row')}
            >
              <Link2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.confirm_link_consultation', 'Liên kết lịch khám')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

