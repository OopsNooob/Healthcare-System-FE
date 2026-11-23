import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Calendar, Link2, CheckCircle2, Info, ArrowRight, RefreshCw, AlertCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { mobileApi, normalizePaginatedList, type FeTypes } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

export interface CandidateConsultation {
  id: string;
  doctorName: string;
  specialty: string;
  scheduledStartAt: string;
  requestStatus: string;
  sessionStatus: string;
}

export type AppointmentConsultationOutcome = 'completed' | 'missed' | 'rescheduled' | 'cancelled';

interface AppointmentTaskLinkModalProps {
  visible: boolean;
  onClose: () => void;
  taskId?: string | null;
  taskTitle?: string;
  doctorId?: string;
  linkedConsultationId?: string | null;
  onLinkConsultation: (consultationId: string) => Promise<void> | void;
  onBookNewSlot?: () => void;
}

export const AppointmentTaskLinkModal: React.FC<AppointmentTaskLinkModalProps> = ({
  visible,
  onClose,
  taskId,
  taskTitle,
  doctorId,
  linkedConsultationId,
  onLinkConsultation,
  onBookNewSlot,
}) => {
  const { t } = useTranslation();
  useThemeContext();

  const [candidates, setCandidates] = useState<CandidateConsultation[]>([]);
  const [selectedId, setSelectedId] = useState<string>(linkedConsultationId ?? '');
  const [serverLinkedId, setServerLinkedId] = useState<string | null>(linkedConsultationId ?? null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadCandidates = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [taskResult, upcomingResult, allResult] = await Promise.allSettled([
        taskId ? mobileApi.careTaskDetail({ params: { id: taskId } }) : Promise.resolve(null),
        mobileApi.consultationsUpcoming(),
        mobileApi.consultationsFindAll({
          query: {
            mode: 'scheduled',
            sortBy: 'scheduledStartAt',
            sortOrder: 1,
            limit: 30,
            ...(doctorId ? { doctorId } : {}),
          },
        }),
      ]);

      if (taskResult.status === 'fulfilled' && taskResult.value?.consultationReference) {
        const refId = (taskResult.value.consultationReference as Record<string, unknown>).consultationId;
        if (typeof refId === 'string' && refId) {
          setServerLinkedId(refId);
          setSelectedId((prev) => prev || refId);
        }
      } else {
        setServerLinkedId(linkedConsultationId ?? null);
      }

      if (upcomingResult.status === 'rejected' && allResult.status === 'rejected') {
        throw allResult.reason;
      }

      const rawList: Array<Record<string, unknown>> = [];
      if (allResult.status === 'fulfilled') {
        const paged = normalizePaginatedList<Record<string, unknown>>(allResult.value);
        rawList.push(...paged.items);
      }
      if (upcomingResult.status === 'fulfilled') {
        const up = (upcomingResult.value as FeTypes.ConsultationsUpcomingResponse)?.data ?? [];
        for (const item of up) {
          rawList.push(item as unknown as Record<string, unknown>);
        }
      }

      const seen = new Set<string>();
      const filtered = rawList.filter((item) => {
        const id = String(item.id ?? item._id ?? '');
        if (!id || seen.has(id)) return false;
        const reqStatus = String(item.requestStatus ?? '');
        const sessStatus = String(item.sessionStatus ?? '');
        const itemDoctorId = String(item.doctorId ?? '');
        if (doctorId && itemDoctorId && itemDoctorId !== doctorId) return false;
        if (item.mode && item.mode !== 'scheduled') return false;
        if (!['accepted', 'pending'].includes(reqStatus)) return false;
        if (['completed', 'no_show'].includes(sessStatus)) return false;
        seen.add(id);
        return true;
      });

      const docIds = [...new Set(filtered.map((c) => String(c.doctorId ?? '')).filter(Boolean))];
      const docProfiles = new Map<string, { fullName?: string; specialty?: string }>();
      await Promise.allSettled(
        docIds.map(async (id) => {
          try {
            const doc = await mobileApi.usersFindOne({ params: { id } });
            const raw = (doc as unknown as { data?: Record<string, unknown> })?.data ?? (doc as unknown as Record<string, unknown>);
            docProfiles.set(id, {
              fullName: typeof raw?.fullName === 'string' ? raw.fullName : undefined,
              specialty: typeof raw?.specialty === 'string' ? raw.specialty : undefined,
            });
          } catch {
            // ignore profile lookup error
          }
        })
      );

      const locale = t('mobile.date_locale', 'vi-VN');
      const mapped: CandidateConsultation[] = filtered.map((item) => {
        const id = String(item.id ?? item._id ?? '');
        const docId = String(item.doctorId ?? '');
        const doc = docProfiles.get(docId);
        const rawDate = typeof item.scheduledStartAt === 'string' ? item.scheduledStartAt : '';
        const parsedDate = rawDate ? new Date(rawDate) : null;
        const formattedTime =
          parsedDate && !Number.isNaN(parsedDate.getTime())
            ? parsedDate.toLocaleString(locale, {
                month: 'short',
                day: '2-digit',
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : rawDate || t('mobile.scheduled_slot', 'Scheduled Appointment');

        return {
          id,
          doctorName: doc?.fullName || t('mobile.assigned_doctor', 'Assigned Doctor'),
          specialty: doc?.specialty || t('mobile.specialist', 'Specialist'),
          scheduledStartAt: formattedTime,
          requestStatus: String(item.requestStatus ?? 'accepted'),
          sessionStatus: String(item.sessionStatus ?? 'not_started'),
        };
      });

      setCandidates(mapped);
      if (mapped.length > 0) {
        setSelectedId((prev) =>
          mapped.some((m) => m.id === prev) ? prev : mapped[0].id
        );
      }
    } catch (err) {
      setLoadError(extractApiErrorMessage(err, 'mobile.load_consultations_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [taskId, doctorId, linkedConsultationId, t]);

  useEffect(() => {
    if (visible) {
      setSelectedId(linkedConsultationId ?? '');
      void loadCandidates();
    }
  }, [visible, linkedConsultationId, loadCandidates]);

  const handleConfirmLink = async () => {
    if (!selectedId || isSubmitting) return;
    setIsSubmitting(true);
    try {
      await onLinkConsultation(selectedId);
      Toast.show({
        type: 'success',
        text1: t('mobile.appointment_linked_title', 'Appointment Linked'),
        text2: t('mobile.appointment_linked_desc', 'Your scheduled consultation is now linked to this task.'),
      });
      onClose();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.appointment_link_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <Link2 color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {taskTitle || t('mobile.link_appointment_task', 'Link Follow-up Appointment')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.link_appointment_task_subtitle', 'Attach a scheduled consultation with your doctor')}
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
            <View style={tw('bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex-row items-start')}>
              <Info color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={18} style={tw('mt-0.5 mr-2.5 shrink-0')} />
              <Text style={tw('text-xs text-indigo-900 dark:text-indigo-200 flex-1 leading-5')}>
                {t(
                  'mobile.appointment_task_policy_note',
                  'Only scheduled consultations with your assigned care program doctor can satisfy this task.'
                )}
              </Text>
            </View>

            <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
              {t('mobile.select_existing_scheduled_consultation', 'Select Scheduled Consultation')}
            </Text>

            {isLoading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-20 w-full rounded-2xl" />
              </View>
            ) : loadError ? (
              <View style={tw('p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 items-center gap-3')}>
                <AlertCircle color="#ef4444" size={24} />
                <Text style={tw('text-xs text-rose-700 dark:text-rose-300 font-semibold text-center')}>
                  {loadError}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadCandidates()}
                  style={tw('px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex-row items-center')}
                >
                  <RefreshCw color={twInstance.color('text-slate-700 dark:text-slate-200')} size={14} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.retry', 'Retry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : candidates.length === 0 ? (
              <View style={tw('p-5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center')}>
                <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-300 text-center')}>
                  {t('mobile.no_matching_scheduled_consultations', 'No eligible scheduled consultations found.')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center mt-1')}>
                  {t('mobile.book_slot_to_link_desc', 'Book a scheduled consultation first, then link it here.')}
                </Text>
              </View>
            ) : (
              <View style={tw('gap-3')}>
                {candidates.map((item) => {
                  const active = selectedId === item.id;
                  const isCurrentlyLinked = serverLinkedId === item.id;
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
                        <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-0.5')}>
                          {isCurrentlyLinked
                            ? t('mobile.currently_linked_consultation', 'Currently linked to this task')
                            : item.requestStatus === 'accepted'
                              ? t('mobile.accepted_not_started', 'Confirmed scheduled appointment')
                              : t('mobile.pending_doctor_confirmation', 'Pending doctor confirmation')}
                        </Text>
                      </View>
                      {active && <CheckCircle2 color={twInstance.color('text-blue-600 dark:text-blue-400')} size={20} />}
                    </TouchableOpacity>
                  );
                })}
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
                  {t('mobile.book_new_scheduled_slot', 'Book New Scheduled Consultation')}
                </Text>
                <ArrowRight color={twInstance.color('text-slate-600 dark:text-slate-400')} size={15} />
              </TouchableOpacity>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isSubmitting}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirmLink}
              disabled={isSubmitting || !selectedId || isLoading}
              style={tw(
                `flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${
                  isSubmitting || !selectedId || isLoading ? 'opacity-50' : ''
                }`
              )}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
              ) : (
                <Link2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.confirm_link_consultation', 'Confirm Link')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </View>
    </Modal>
  );
};
