import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  CheckCircle2,
  ClipboardCheck,
  Info,
  Stethoscope,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  mobileApi,
  normalizePaginatedList,
  generateIdempotencyKey,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { isDoctorReviewTaskOpenNow } from '@/utils/careTaskHelpers';

export type DoctorReviewReasonCode =
  | 'reviewed_no_action'
  | 'follow_up_needed'
  | 'consultation_recommended'
  | 'care_plan_adjustment_needed';

interface CareTaskSummary {
  id: string;
  taskType: string;
  templateKey: string;
  status: string;
  scheduledFor: string;
  windowStart?: string;
  windowEnd?: string;
  allowedActions?: string[];
}

interface DoctorReviewTaskModalProps {
  visible: boolean;
  onClose: () => void;
  taskId?: string;
  enrollmentId?: string;
  patientName?: string;
  programName?: string;
  onSubmitReview?: (payload: {
    taskId: string;
    reasonCode: DoctorReviewReasonCode;
    note?: string;
  }) => void;
}

export const DoctorReviewTaskModal: React.FC<DoctorReviewTaskModalProps> = ({
  visible,
  onClose,
  taskId: initialTaskId,
  enrollmentId,
  patientName,
  programName,
  onSubmitReview,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [reasonCode, setReasonCode] =
    useState<DoctorReviewReasonCode>('reviewed_no_action');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [loadingTasks, setLoadingTasks] = useState(false);
  const [tasksError, setTasksError] = useState<string | null>(null);
  const [reviewTasks, setReviewTasks] = useState<CareTaskSummary[]>([]);
  const [selectedTaskId, setSelectedTaskId] = useState<string>(initialTaskId ?? '');
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const loadReviewTasks = useCallback(async () => {
    if (!visible) return;
    if (!enrollmentId) {
      setReviewTasks([]);
      setSelectedTaskId(initialTaskId ?? '');
      setTasksError(null);
      return;
    }

    setLoadingTasks(true);
    setTasksError(null);
    try {
      const res = await mobileApi.careTaskTasks({
        params: { id: enrollmentId },
        query: {
          type: 'doctor_review',
          page: 1,
          limit: 20,
          sortBy: 'scheduledFor',
          sortOrder: 1,
        },
      });
      const currentNowMs = Date.now();
      setNowMs(currentNowMs);
      const items: CareTaskSummary[] = normalizePaginatedList<Record<string, unknown>>(res).items
        .map((item) => ({
          id: String(item.id ?? item._id ?? ''),
          taskType: String(item.taskType ?? 'doctor_review'),
          templateKey: String(item.templateKey ?? ''),
          status: String(item.status ?? ''),
          scheduledFor: String(item.scheduledFor ?? ''),
          windowStart: typeof item.windowStart === 'string' ? item.windowStart : undefined,
          windowEnd: typeof item.windowEnd === 'string' ? item.windowEnd : undefined,
          allowedActions: Array.isArray(item.allowedActions)
            ? item.allowedActions.filter((a): a is string => typeof a === 'string')
            : undefined,
        }))
        .filter((item) => Boolean(item.id));

      setReviewTasks(items);
      const openTasks = items.filter((item) => isDoctorReviewTaskOpenNow(item, currentNowMs));
      const preferred =
        (initialTaskId ? openTasks.find((item) => item.id === initialTaskId) : undefined) ??
        openTasks[0];
      setSelectedTaskId(preferred?.id ?? '');
    } catch (err) {
      setTasksError(extractApiErrorMessage(err, 'mobile.load_review_tasks_failed'));
    } finally {
      setLoadingTasks(false);
    }
  }, [enrollmentId, initialTaskId, visible]);

  const openReviewTasks = reviewTasks.filter((item) => isDoctorReviewTaskOpenNow(item, nowMs));
  const selectedReviewTask = reviewTasks.find((item) => item.id === selectedTaskId);
  const isSelectedTaskOpenNow = enrollmentId
    ? Boolean(selectedReviewTask && isDoctorReviewTaskOpenNow(selectedReviewTask, nowMs))
    : Boolean(selectedTaskId);

  const nextUpcomingReviewTask = reviewTasks.find((item) => {
    const st = String(item.status ?? '').toLowerCase();
    if (st !== 'scheduled' && st !== 'due') return false;
    const startMs = item.windowStart ? Date.parse(item.windowStart) : NaN;
    return Number.isNaN(startMs) || startMs > nowMs;
  });

  const formatTimeHm = (iso?: string): string => {
    if (!iso) return '';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
  };

  useEffect(() => {
    if (visible) {
      setReasonCode('reviewed_no_action');
      setNote('');
      void loadReviewTasks();
    }
  }, [loadReviewTasks, visible]);

  const handleNoteChange = (text: string) => {
    const clean = text.replace(/<[^>]*>?/gm, '');
    setNote(clean.slice(0, 500));
  };

  const allowlistedReasons: { code: DoctorReviewReasonCode; title: string; desc: string }[] = [
    {
      code: 'reviewed_no_action',
      title: t('mobile.reason_reviewed_no_action'),
      desc: t('mobile.reason_reviewed_no_action_desc'),
    },
    {
      code: 'follow_up_needed',
      title: t('mobile.reason_follow_up_needed'),
      desc: t('mobile.reason_follow_up_needed_desc'),
    },
    {
      code: 'consultation_recommended',
      title: t('mobile.reason_consultation_recommended'),
      desc: t('mobile.reason_consultation_recommended_desc'),
    },
    {
      code: 'care_plan_adjustment_needed',
      title: t('mobile.reason_care_plan_adjustment_needed'),
      desc: t('mobile.reason_care_plan_adjustment_needed_desc'),
    },
  ];

  const handleConfirm = async () => {
    if (isSubmitting || !selectedTaskId || !isSelectedTaskOpenNow) return;
    setIsSubmitting(true);
    try {
      const trimmedNote = note.trim() || undefined;
      await mobileApi.careTaskDoctorReview({
        params: { id: selectedTaskId },
        body: {
          reasonCode,
          ...(trimmedNote ? { note: trimmedNote } : {}),
        },
        headers: { 'Idempotency-Key': generateIdempotencyKey() },
      });

      onSubmitReview?.({
        taskId: selectedTaskId,
        reasonCode,
        note: trimmedNote,
      });

      Toast.show({
        type: 'success',
        text1: t('mobile.doctor_review_submitted'),
        text2: allowlistedReasons.find((r) => r.code === reasonCode)?.title,
      });
      setNote('');
      onClose();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.doctor_review_submit_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const displayProgramName = programName || t('mobile.chronic_care');

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw('flex-1 justify-end bg-black/60')}
      >
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
                  'w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3'
                )}
              >
                <Stethoscope
                  color={twInstance.color('text-blue-600 dark:text-blue-400')}
                  size={22}
                />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.doctor_review_task_title')}
                </Text>
                <Text numberOfLines={1} style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {[patientName, displayProgramName].filter(Boolean).join(' • ')}
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
            <View
              style={tw(
                'bg-blue-50 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/50 flex-row items-start'
              )}
            >
              <Info color="#3b82f6" size={16} style={tw('mt-0.5 mr-2 shrink-0')} />
              <Text style={tw('text-xs text-blue-800 dark:text-blue-200 flex-1 leading-4')}>
                {t('mobile.doctor_review_contract_hint')}
              </Text>
            </View>

            {/* Task Selector when loaded from enrollment */}
            {(Boolean(enrollmentId) || !initialTaskId) && (
              <View>
                {loadingTasks ? (
                  <Skeleton className="h-16 w-full rounded-2xl" />
                ) : tasksError ? (
                  <View
                    style={tw(
                      'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-4 items-center'
                    )}
                  >
                    <AlertCircle color="#e11d48" size={20} style={tw('mb-1.5')} />
                    <Text style={tw('text-xs text-rose-700 dark:text-rose-300 text-center mb-2')}>
                      {tasksError}
                    </Text>
                    <TouchableOpacity
                      onPress={() => void loadReviewTasks()}
                      style={tw('bg-rose-600 px-3 py-1.5 rounded-lg')}
                    >
                      <Text style={tw('text-xs font-bold text-white')}>{t('mobile.retry')}</Text>
                    </TouchableOpacity>
                  </View>
                ) : reviewTasks.length === 0 ? (
                  <View
                    style={tw(
                      'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-4 flex-row items-center'
                    )}
                  >
                    <ClipboardCheck color="#d97706" size={18} style={tw('mr-2.5 shrink-0')} />
                    <Text style={tw('text-xs text-amber-800 dark:text-amber-200 flex-1')}>
                      {t('mobile.no_doctor_review_tasks_pending')}
                    </Text>
                  </View>
                ) : (
                  <View>
                    {openReviewTasks.length === 0 && (
                      <View
                        style={tw(
                          'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-2xl p-3.5 flex-row items-start mb-3'
                        )}
                      >
                        <AlertCircle color="#d97706" size={17} style={tw('mt-0.5 mr-2 shrink-0')} />
                        <Text style={tw('text-xs text-amber-800 dark:text-amber-200 flex-1 leading-4')}>
                          {nextUpcomingReviewTask?.windowStart || nextUpcomingReviewTask?.scheduledFor
                            ? t('mobile.doctor_review_window_not_open', {
                                time: new Date(
                                  nextUpcomingReviewTask.windowStart ??
                                    nextUpcomingReviewTask.scheduledFor
                                ).toLocaleString(dateLocale),
                              })
                            : t('mobile.doctor_review_no_open_window')}
                        </Text>
                      </View>
                    )}
                    <Text
                      style={tw(
                        'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2'
                      )}
                    >
                      {t('mobile.select_review_task')}
                    </Text>
                    <View style={tw('gap-2')}>
                      {reviewTasks
                        .slice(0, Math.max(4, openReviewTasks.length))
                        .map((task) => {
                          const isSelected = selectedTaskId === task.id;
                          const taskOpenNow = isDoctorReviewTaskOpenNow(task, nowMs);
                          const statusKey = `mobile.task_status_${task.status.trim().toLowerCase()}`;
                          const localizedStatus = i18n.exists(statusKey)
                            ? t(statusKey)
                            : t('mobile.task_status_scheduled');
                          const startHm = formatTimeHm(task.windowStart);
                          const endHm = formatTimeHm(task.windowEnd);
                          const windowLabel =
                            startHm && endHm
                              ? ` • ${t('mobile.doctor_review_window_label')}: ${startHm} – ${endHm}`
                              : '';
                          return (
                            <TouchableOpacity
                              key={task.id}
                              disabled={isSubmitting || !taskOpenNow}
                              onPress={() => setSelectedTaskId(task.id)}
                              style={tw(
                                `p-3 rounded-xl border flex-row items-center justify-between ${
                                  isSelected
                                    ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                                    : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                                } ${!taskOpenNow ? 'opacity-50' : ''}`
                              )}
                            >
                              <View style={tw('flex-1 mr-2')}>
                                <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                                  {task.scheduledFor
                                    ? new Date(task.scheduledFor).toLocaleString(dateLocale)
                                    : t('mobile.doctor_review_task_title')}
                                </Text>
                                <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-0.5')}>
                                  {localizedStatus}
                                  {windowLabel}
                                </Text>
                              </View>
                              {isSelected && (
                                <CheckCircle2
                                  color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                                  size={16}
                                />
                              )}
                            </TouchableOpacity>
                          );
                        })}
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* Clinical Assessment Conclusion */}
            <View>
              <Text
                style={tw(
                  'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5'
                )}
              >
                1. {t('mobile.select_reason_code')} *
              </Text>
              <View style={tw('gap-2.5')}>
                {allowlistedReasons.map((item) => {
                  const active = reasonCode === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
                      disabled={isSubmitting}
                      onPress={() => setReasonCode(item.code)}
                      style={tw(
                        `p-3.5 rounded-2xl border flex-row items-start justify-between ${
                          active
                            ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`
                      )}
                    >
                      <View style={tw('flex-1 mr-2')}>
                        <Text
                          style={tw(
                            `text-sm font-bold ${
                              active
                                ? 'text-indigo-800 dark:text-indigo-200'
                                : 'text-slate-900 dark:text-white'
                            }`
                          )}
                        >
                          {item.title}
                        </Text>
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 leading-4')}>
                          {item.desc}
                        </Text>
                      </View>
                      {active && (
                        <CheckCircle2
                          color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                          size={18}
                        />
                      )}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Optional Plaintext Note */}
            <View>
              <View style={tw('flex-row justify-between items-center mb-2')}>
                <Text
                  style={tw(
                    'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400'
                  )}
                >
                  2. {t('mobile.plaintext_clinical_note')}
                </Text>
                <Text
                  style={tw(
                    `text-xs font-semibold ${note.length >= 480 ? 'text-amber-500' : 'text-slate-400'}`
                  )}
                >
                  {note.length}/500
                </Text>
              </View>
              <TextInput
                value={note}
                onChangeText={handleNoteChange}
                placeholder={t('mobile.doctor_review_note_placeholder')}
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={500}
                editable={!isSubmitting}
                textAlignVertical="top"
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-900 dark:text-white min-h-[100px]'
                )}
              />
            </View>
          </ScrollView>

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
              onPress={() => void handleConfirm()}
              disabled={isSubmitting || !selectedTaskId || !isSelectedTaskOpenNow}
              style={tw(
                `flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${
                  isSubmitting || !selectedTaskId || !isSelectedTaskOpenNow ? 'opacity-60' : ''
                }`
              )}
            >
              {isSubmitting ? (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
              ) : (
                <CheckCircle2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.submit_doctor_review')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        <AppModalToast visible={visible} />
      </KeyboardAvoidingView>
    </Modal>
  );
};
