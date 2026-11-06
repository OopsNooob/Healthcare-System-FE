import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Stethoscope, CheckCircle2, Info } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

export type DoctorReviewReasonCode =
  | 'reviewed_no_action'
  | 'follow_up_needed'
  | 'consultation_recommended'
  | 'care_plan_adjustment_needed';

export interface DoctorReviewTaskPayload {
  reasonCode: DoctorReviewReasonCode;
  note?: string;
}

interface DoctorReviewTaskModalProps {
  visible: boolean;
  onClose: () => void;
  patientName?: string;
  programName?: string;
  taskId?: string;
  onSubmitReview: (payload: DoctorReviewTaskPayload) => void;
}

export const DoctorReviewTaskModal: React.FC<DoctorReviewTaskModalProps> = ({
  visible,
  onClose,
  patientName = 'Alex Johnson',
  programName = 'Hypertension Management',
  taskId = 'task-doc-rev-01',
  onSubmitReview,
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith('vi');

  const [reasonCode, setReasonCode] = useState<DoctorReviewReasonCode>('reviewed_no_action');
  const [note, setNote] = useState('');

  const allowlistedReasons: { code: DoctorReviewReasonCode; title: string; desc: string }[] = [
    {
      code: 'reviewed_no_action',
      title: t(
        'mobile.doc_rev_no_action',
        isVi ? 'Đã xem xét — Không cần can thiệp thêm' : 'Reviewed — No Further Action Required'
      ),
      desc: isVi
        ? 'Chỉ số sinh hiệu và mức độ tuân thủ ổn định theo mục tiêu chương trình.'
        : 'Vital readings and adherence remain stable within program targets.',
    },
    {
      code: 'follow_up_needed',
      title: t(
        'mobile.doc_rev_follow_up',
        isVi ? 'Cần theo dõi sát ở chu kỳ tiếp theo' : 'Close Monitoring Needed in Next Cycle'
      ),
      desc: isVi
        ? 'Có dao động nhẹ, tiếp tục nhắc nhở bệnh nhân đo chỉ số đúng khung giờ.'
        : 'Mild fluctuations observed; continue reminding patient to log readings on time.',
    },
    {
      code: 'consultation_recommended',
      title: t(
        'mobile.doc_rev_consult_rec',
        isVi ? 'Khuyến nghị đặt lịch tư vấn trực tuyến' : 'Recommend Scheduling a Teleconsultation'
      ),
      desc: isVi
        ? 'Cần trao đổi trực tiếp với bệnh nhân qua buổi tư vấn trực tuyến.'
        : 'Direct clinical discussion recommended via a scheduled or on-demand session.',
    },
    {
      code: 'care_plan_adjustment_needed',
      title: t(
        'mobile.doc_rev_adjust_plan',
        isVi ? 'Cần điều chỉnh phác đồ / kế hoạch chăm sóc' : 'Care Plan / Regimen Adjustment Needed'
      ),
      desc: isVi
        ? 'Ghi nhận để điều chỉnh hướng dẫn sinh hoạt hoặc mục tiêu theo dõi.'
        : 'Record need to adjust lifestyle guidance or monitoring targets.',
    },
  ];

  const handleNoteChange = (val: string) => {
    const stripped = val.replace(/<[^>]*>?/gm, '');
    if (stripped.length <= 500) {
      setNote(stripped);
    }
  };

  const handleConfirm = () => {
    const cleanNote = note.trim();
    onSubmitReview({
      reasonCode,
      ...(cleanNote ? { note: cleanNote } : {}),
    });
    Toast.show({
      type: 'success',
      text1: t(
        'mobile.doctor_review_completed',
        isVi ? 'Đã hoàn tất đánh giá định kỳ' : 'Periodic Clinical Review Completed'
      ),
      text2: `${patientName} • ${programName}`,
    });
    setNote('');
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw('flex-1 justify-end bg-black/60')}
      >
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <Stethoscope color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.doctor_review_task_title', isVi ? 'Đánh giá định kỳ của Bác sĩ' : 'Periodic Doctor Review')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName} • {programName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            <View style={tw('bg-blue-50 dark:bg-blue-950/30 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-800/50 flex-row items-start')}>
              <Info color="#3b82f6" size={16} style={tw('mt-0.5 mr-2 shrink-0')} />
              <Text style={tw('text-xs text-blue-800 dark:text-blue-200 flex-1 leading-4')}>
                {t(
                  'mobile.doctor_review_contract_hint',
                  isVi
                    ? 'Vui lòng chọn kết luận đánh giá phù hợp và nhập ghi chú chuyên môn (tối đa 500 ký tự).'
                    : 'Please select an appropriate clinical conclusion and add an optional note (up to 500 characters).'
                )}
              </Text>
            </View>

            {/* Allowlisted Reason Codes */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5')}>
                1. {t('mobile.select_reason_code', isVi ? 'Kết luận đánh giá' : 'Clinical Assessment Conclusion')} *
              </Text>
              <View style={tw('gap-2.5')}>
                {allowlistedReasons.map((item) => {
                  const active = reasonCode === item.code;
                  return (
                    <TouchableOpacity
                      key={item.code}
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
                              active ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-900 dark:text-white'
                            }`
                          )}
                        >
                          {item.title}
                        </Text>
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 leading-4')}>
                          {item.desc}
                        </Text>
                      </View>
                      {active && <CheckCircle2 color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={18} />}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>

            {/* Optional Plaintext Note (<= 500 chars) */}
            <View>
              <View style={tw('flex-row justify-between items-center mb-2')}>
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                  2. {t('mobile.plaintext_clinical_note', isVi ? 'Ghi chú lâm sàng (tùy chọn)' : 'Clinical Note (optional)')}
                </Text>
                <Text style={tw(`text-xs font-semibold ${note.length >= 480 ? 'text-amber-500' : 'text-slate-400'}`)}>
                  {note.length}/500
                </Text>
              </View>
              <TextInput
                value={note}
                onChangeText={handleNoteChange}
                placeholder={t(
                  'mobile.doctor_review_note_placeholder',
                  isVi ? 'Nhập nhận xét chuyên môn ngắn gọn...' : 'Enter brief clinical observations...'
                )}
                placeholderTextColor="#94a3b8"
                multiline
                maxLength={500}
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
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.cancel', isVi ? 'Hủy' : 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={tw('flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row')}
            >
              <CheckCircle2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.submit_doctor_review', isVi ? 'Hoàn tất đánh giá' : 'Submit Review')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

