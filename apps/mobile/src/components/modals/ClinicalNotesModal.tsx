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
  Clock,
  FileText,
  RefreshCw,
  Save,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  mobileApi,
  normalizePaginatedList,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

interface ClinicalNotesModalProps {
  visible: boolean;
  onClose: () => void;
  consultationId?: string;
  patientId?: string;
  patientName?: string;
  onSaved?: () => void;
}

interface ConsultationNoteItem {
  id: string;
  reason: string;
  doctorNotes: string;
  patientNotes: string;
  sessionStatus: string;
  dateLabel: string;
}

export const ClinicalNotesModal: React.FC<ClinicalNotesModalProps> = ({
  visible,
  onClose,
  consultationId,
  patientId,
  patientName,
  onSaved,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [consultations, setConsultations] = useState<ConsultationNoteItem[]>([]);
  const [selectedConsultationId, setSelectedConsultationId] = useState(consultationId ?? '');

  const [diagnosisTag, setDiagnosisTag] = useState('');
  const [newNote, setNewNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadConsultations = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      let rows: Array<Record<string, unknown>> = [];
      if (consultationId) {
        const single = await mobileApi.consultationsFindOne({
          params: { id: consultationId },
        });
        const raw = single as unknown as { data?: Record<string, unknown> } & Record<string, unknown>;
        const doc = raw.data && typeof raw.data === 'object' ? raw.data : raw;
        if (doc && (doc.id || doc._id)) rows = [doc];
      } else {
        const listRes = await mobileApi.consultationsFindAll({
          query: {
            page: 1,
            limit: 30,
            sortOrder: -1,
            ...(patientId ? { patientId } : {}),
          },
        });
        rows = normalizePaginatedList<Record<string, unknown>>(listRes).items;
        if (patientId) {
          rows = rows.filter((item) => {
            const pRaw = item.patient ?? item.patientId;
            const pId =
              typeof pRaw === 'object' && pRaw !== null
                ? String((pRaw as Record<string, unknown>)._id ?? (pRaw as Record<string, unknown>).id ?? '')
                : String(pRaw ?? '');
            return !pId || pId === patientId;
          });
        }
      }

      const mapped: ConsultationNoteItem[] = rows
        .map((item) => {
          const id = String(item.id ?? item._id ?? '');
          const rawDate = String(
            item.completedAt ?? item.scheduledStartAt ?? item.requestedAt ?? item.createdAt ?? ''
          );
          return {
            id,
            reason: String(item.reason ?? ''),
            doctorNotes: String(item.doctorNotes ?? ''),
            patientNotes: String(item.patientNotes ?? ''),
            sessionStatus: String(item.sessionStatus ?? ''),
            dateLabel: rawDate
              ? new Date(rawDate).toLocaleString(dateLocale, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                })
              : '—',
          };
        })
        .filter((item) => Boolean(item.id));

      setConsultations(mapped);
      const targetId = consultationId || mapped[0]?.id || '';
      setSelectedConsultationId(targetId);
      const selected = mapped.find((c) => c.id === targetId);
      if (selected) {
        setDiagnosisTag(selected.reason);
        setNewNote(selected.doctorNotes);
      } else {
        setDiagnosisTag('');
        setNewNote('');
      }
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'mobile.load_clinical_notes_failed'));
    } finally {
      setLoading(false);
    }
  }, [consultationId, dateLocale, patientId, visible]);

  useEffect(() => {
    if (visible) {
      void loadConsultations();
    }
  }, [loadConsultations, visible]);

  const handleSelectConsultation = (item: ConsultationNoteItem) => {
    setSelectedConsultationId(item.id);
    setDiagnosisTag(item.reason);
    setNewNote(item.doctorNotes);
  };

  const selectedConsultation = consultations.find((c) => c.id === selectedConsultationId);
  const isReadonlyStatus =
    selectedConsultation?.sessionStatus === 'completed' ||
    selectedConsultation?.sessionStatus === 'cancelled' ||
    selectedConsultation?.sessionStatus === 'no_show';

  const handleSave = async () => {
    if (isSubmitting || !selectedConsultationId || isReadonlyStatus) return;
    if (!newNote.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.note_cannot_be_empty'),
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await mobileApi.consultationsUpdate({
        params: { id: selectedConsultationId },
        body: {
          doctorNotes: newNote.trim(),
          ...(diagnosisTag.trim() ? { reason: diagnosisTag.trim() } : {}),
        },
      });
      Toast.show({
        type: 'success',
        text1: t('mobile.note_saved'),
        text2: t('mobile.clinical_note_recorded_msg'),
      });
      await loadConsultations();
      onSaved?.();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.save_clinical_note_failed'),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1 justify-end bg-black/60')}
      >
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl h-[86%] border-t border-slate-200 dark:border-slate-800'
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
                <FileText color="#3b82f6" size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.clinical_notes')}
                </Text>
                <Text numberOfLines={1} style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName
                    ? `${t('mobile.patient')}: ${patientName}`
                    : t('mobile.charting_and_orders')}
                </Text>
              </View>
            </View>
            <View style={tw('flex-row items-center gap-2')}>
              <TouchableOpacity
                onPress={() => void loadConsultations()}
                disabled={loading}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <RefreshCw
                  color={twInstance.color('text-slate-600 dark:text-slate-300')}
                  size={18}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-28 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </View>
            ) : errorMsg ? (
              <View
                style={tw(
                  'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 items-center'
                )}
              >
                <AlertCircle color="#e11d48" size={28} style={tw('mb-2')} />
                <Text style={tw('text-sm font-semibold text-rose-700 dark:text-rose-300 text-center mb-3')}>
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadConsultations()}
                  style={tw('bg-rose-600 px-4 py-2 rounded-xl')}
                >
                  <Text style={tw('text-white font-bold text-xs')}>{t('mobile.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : consultations.length === 0 ? (
              <View
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 items-center'
                )}
              >
                <FileText color={twInstance.color('text-slate-400')} size={28} style={tw('mb-2')} />
                <Text style={tw('text-sm font-bold text-slate-800 dark:text-white text-center mb-1')}>
                  {t('mobile.no_consultations_for_notes')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}>
                  {t('mobile.no_consultations_for_notes_desc')}
                </Text>
              </View>
            ) : (
              <>
                {consultations.length > 1 && (
                  <View>
                    <Text
                      style={tw(
                        'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2'
                      )}
                    >
                      {t('mobile.select_consultation')}
                    </Text>
                    <ScrollView
                      horizontal
                      showsHorizontalScrollIndicator={false}
                      contentContainerStyle={tw('gap-2')}
                    >
                      {consultations.map((c) => {
                        const active = c.id === selectedConsultationId;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => handleSelectConsultation(c)}
                            style={tw(
                              `px-3.5 py-2 rounded-xl border ${
                                active
                                  ? 'bg-blue-600 border-blue-600'
                                  : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                              }`
                            )}
                          >
                            <Text
                              style={tw(
                                `text-xs font-bold ${
                                  active ? 'text-white' : 'text-slate-700 dark:text-slate-200'
                                }`
                              )}
                            >
                              {c.dateLabel}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </ScrollView>
                  </View>
                )}

                {/* Add/Update Clinical Note Box */}
                <View>
                  <Text
                    style={tw(
                      'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2'
                    )}
                  >
                    {t('mobile.update_clinical_note')}
                  </Text>

                  <View style={tw('mb-3')}>
                    <Text style={tw('text-xs font-medium text-slate-600 dark:text-slate-400 mb-1')}>
                      {t('mobile.clinical_diagnosis_status')}
                    </Text>
                    <TextInput
                      style={tw(
                        'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white'
                      )}
                      value={diagnosisTag}
                      onChangeText={setDiagnosisTag}
                      placeholder={t('mobile.enter_diagnosis')}
                      placeholderTextColor={twInstance.color('text-slate-400')}
                      editable={!isSubmitting && !isReadonlyStatus}
                    />
                  </View>

                  <View>
                    <Text style={tw('text-xs font-medium text-slate-600 dark:text-slate-400 mb-1')}>
                      {t('mobile.observations_and_orders')}
                    </Text>
                    <TextInput
                      style={tw(
                        'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-900 dark:text-white min-h-[110px]'
                      )}
                      value={newNote}
                      onChangeText={setNewNote}
                      placeholder={t('mobile.enter_clinical_notes_hint')}
                      placeholderTextColor={twInstance.color('text-slate-400')}
                      multiline
                      textAlignVertical="top"
                      editable={!isSubmitting && !isReadonlyStatus}
                    />
                  </View>

                  {isReadonlyStatus ? (
                    <View
                      style={tw(
                        'mt-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/40 rounded-xl p-3'
                      )}
                    >
                      <Text style={tw('text-xs text-amber-800 dark:text-amber-200 text-center')}>
                        {t('mobile.consultation_completed_readonly_notes')}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => void handleSave()}
                      disabled={isSubmitting || !selectedConsultationId}
                      style={tw(
                        `bg-blue-600 py-3.5 rounded-xl items-center flex-row justify-center mt-3 shadow-sm ${
                          isSubmitting || !selectedConsultationId ? 'opacity-60' : ''
                        }`
                      )}
                    >
                      {isSubmitting ? (
                        <ActivityIndicator size="small" color="#ffffff" style={tw('mr-2')} />
                      ) : (
                        <Save color="#ffffff" size={18} style={tw('mr-2')} />
                      )}
                      <Text style={tw('text-white font-bold text-sm')}>
                        {isSubmitting ? t('mobile.saving') : t('mobile.save_clinical_note')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>

                {/* Past Consultation Records */}
                <View>
                  <Text
                    style={tw(
                      'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3'
                    )}
                  >
                    {t('mobile.previous_clinical_records')}
                  </Text>

                  <View style={tw('gap-3')}>
                    {consultations.map((item) => (
                      <View
                        key={item.id}
                        style={tw(
                          'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                        )}
                      >
                        <View style={tw('flex-row flex-wrap justify-between items-start gap-2 mb-2')}>
                          <Text style={tw('font-bold text-sm text-slate-900 dark:text-white flex-1')}>
                            {item.reason || t('mobile.clinical_consultation')}
                          </Text>
                          <View
                            style={tw(
                              'flex-row items-center bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800'
                            )}
                          >
                            <Clock color={twInstance.color('text-slate-400')} size={12} style={tw('mr-1')} />
                            <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 font-medium')}>
                              {item.dateLabel}
                            </Text>
                          </View>
                        </View>
                        <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5')}>
                          {item.doctorNotes || item.patientNotes || t('mobile.no_notes_recorded_yet')}
                        </Text>
                      </View>
                    ))}
                  </View>
                </View>
              </>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('bg-slate-100 dark:bg-slate-800 py-3 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                {t('mobile.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
