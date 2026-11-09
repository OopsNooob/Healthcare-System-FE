import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Link2, CheckCircle2, Info, ArrowRight, RefreshCw, XCircle } from 'lucide-react-native';
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

export type AppointmentConsultationOutcome = 'completed' | 'missed' | 'rescheduled' | 'cancelled';

interface AppointmentTaskLinkModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle?: string;
  linkedConsultationId?: string | null;
  onLinkConsultation: (consultationId: string) => void;
  onSimulateOutcome?: (outcome: AppointmentConsultationOutcome, consultationId: string) => void;
  onBookNewSlot?: () => void;
}

export const AppointmentTaskLinkModal: React.FC<AppointmentTaskLinkModalProps> = ({
  visible,
  onClose,
  taskTitle,
  linkedConsultationId,
  onLinkConsultation,
  onSimulateOutcome,
  onBookNewSlot,
}) => {
  const { t } = useTranslation();

  const candidateConsultations: CandidateConsultation[] = [
    {
      id: 'con-sched-101',
      doctorName: 'Dr. Sarah Connor',
      specialty: t('mobile.cardiologist'),
      scheduledStartAt: '2026-11-08 09:30 AM',
      requestStatus: 'accepted',
      sessionStatus: 'not_started',
    },
    {
      id: 'con-sched-102',
      doctorName: 'Dr. Sarah Connor',
      specialty: t('mobile.cardiologist'),
      scheduledStartAt: '2026-11-15 02:00 PM',
      requestStatus: 'accepted',
      sessionStatus: 'not_started',
    },
  ];

  const [selectedId, setSelectedId] = useState<string>(
    linkedConsultationId || candidateConsultations[0]?.id || ''
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirmLink = async () => {
    if (!selectedId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      onLinkConsultation(selectedId);
      Toast.show({
        type: 'success',
        text1: t('mobile.appointment_linked_title'),
        text2: t('mobile.appointment_linked_desc'),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOutcome = async (outcome: AppointmentConsultationOutcome) => {
    if (!selectedId || isSubmitting || !onSimulateOutcome) return;
    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      const targetId = outcome === 'rescheduled' ? 'con-sched-102' : selectedId;
      onSimulateOutcome(outcome, targetId);
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <Link2 color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {taskTitle || t('mobile.link_appointment_task')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.link_appointment_task_subtitle')}
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

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Rule Notice */}
            <View style={tw('bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex-row items-start')}>
              <Info color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={18} style={tw('mt-0.5 mr-2.5 shrink-0')} />
              <Text style={tw('text-xs text-indigo-900 dark:text-indigo-200 flex-1 leading-5')}>
                {t('mobile.appointment_task_policy_note')}
              </Text>
            </View>

            <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
              {t('mobile.select_existing_scheduled_consultation')}
            </Text>

            <View style={tw('gap-3')}>
              {candidateConsultations.map((item) => {
                const active = selectedId === item.id;
                return (
                  <TouchableOpacity
                    key={item.id}
                    disabled={isSubmitting}
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
                        {t('mobile.accepted_not_started')}
                      </Text>
                    </View>
                    {active && <CheckCircle2 color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />}
                  </TouchableOpacity>
                );
              })}
            </View>

            {linkedConsultationId && onSimulateOutcome && (
              <View style={tw('p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 gap-2.5')}>
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                  {t('mobile.update_linked_consultation_status')}
                </Text>
                <View style={tw('flex-row flex-wrap gap-2')}>
                  <TouchableOpacity
                    disabled={isSubmitting}
                    onPress={() => handleOutcome('completed')}
                    style={tw('px-3 py-2 rounded-xl bg-emerald-100 dark:bg-emerald-950/50 border border-emerald-200 dark:border-emerald-800/50 flex-row items-center')}
                  >
                    <CheckCircle2 color="#10b981" size={14} style={tw('mr-1.5')} />
                    <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                      {t('mobile.consultation_outcome_completed')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={isSubmitting}
                    onPress={() => handleOutcome('rescheduled')}
                    style={tw('px-3 py-2 rounded-xl bg-blue-100 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/50 flex-row items-center')}
                  >
                    <RefreshCw color="#3b82f6" size={14} style={tw('mr-1.5')} />
                    <Text style={tw('text-xs font-bold text-blue-700 dark:text-blue-300')}>
                      {t('mobile.consultation_outcome_rescheduled')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={isSubmitting}
                    onPress={() => handleOutcome('cancelled')}
                    style={tw('px-3 py-2 rounded-xl bg-amber-100 dark:bg-amber-950/50 border border-amber-200 dark:border-amber-800/50 flex-row items-center')}
                  >
                    <XCircle color="#f59e0b" size={14} style={tw('mr-1.5')} />
                    <Text style={tw('text-xs font-bold text-amber-700 dark:text-amber-300')}>
                      {t('mobile.consultation_outcome_cancelled')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    disabled={isSubmitting}
                    onPress={() => handleOutcome('missed')}
                    style={tw('px-3 py-2 rounded-xl bg-rose-100 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800/50 flex-row items-center')}
                  >
                    <XCircle color="#f43f5e" size={14} style={tw('mr-1.5')} />
                    <Text style={tw('text-xs font-bold text-rose-700 dark:text-rose-300')}>
                      {t('mobile.consultation_outcome_missed')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {onBookNewSlot && (
              <TouchableOpacity
                disabled={isSubmitting}
                onPress={() => {
                  onClose();
                  onBookNewSlot();
                }}
                style={tw('p-3.5 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 flex-row items-center justify-center')}
              >
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 mr-1.5')}>
                  {t('mobile.book_new_scheduled_slot')}
                </Text>
                <ArrowRight color={twInstance.color('text-slate-600 dark:text-slate-400')} size={15} />
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmLink}
              disabled={isSubmitting}
              style={tw(`flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${isSubmitting ? 'opacity-60' : ''}`)}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
              ) : (
                <Link2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.confirm_link_consultation')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
