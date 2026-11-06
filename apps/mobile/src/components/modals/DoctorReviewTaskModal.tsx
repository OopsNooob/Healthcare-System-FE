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
  const { t } = useTranslation();

  const [reasonCode, setReasonCode] = useState<DoctorReviewReasonCode>('reviewed_no_action');
  const [note, setNote] = useState('');

  const allowlistedReasons: { code: DoctorReviewReasonCode; title: string; desc: string }[] = [
    {
      code: 'reviewed_no_action',
      title: t('mobile.doc_rev_no_action', 'Đã xem xét — Không cần can thiệp thêm'),
      desc: 'reviewed_no_action • Chỉ số và tuân thủ ổn định theo mục tiêu chương trình.',
    },
    {
      code: 'follow_up_needed',
      title: t('mobile.doc_rev_follow_up', 'Cần theo dõi sát ở chu kỳ tiếp theo'),
      desc: 'follow_up_needed • Có dao động nhẹ, tiếp tục nhắc nhở đo chỉ số đúng khung giờ.',
    },
    {
      code: 'consultation_recommended',
      title: t('mobile.doc_rev_consult_rec', 'Khuyến nghị đặt lịch tư vấn trực tuyến'),
      desc: 'consultation_recommended • Cần trao đổi trực tiếp qua phiên khám Scheduled/On-demand.',
    },
    {
      code: 'care_plan_adjustment_needed',
      title: t('mobile.doc_rev_adjust_plan', 'Cần điều chỉnh phác đồ / kế hoạch chăm sóc'),
      desc: 'care_plan_adjustment_needed • Ghi nhận để điều chỉnh liều lượng hoặc mục tiêu theo dõi.',
    },
  ];

  const handleNoteChange = (val: string) => {
    // Strip HTML tags per contract (plaintext only, max 500 chars)
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
      text1: t('mobile.doctor_review_completed', 'Đã hoàn tất Doctor Review'),
      text2: `${reasonCode} • Task: ${taskId}`,
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
                  {t('mobile.doctor_review_task_title', 'Duyệt định kỳ Bác sĩ (Doctor Review)')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName} • {programName} (CARE-35)
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
                  'POST /care-tasks/:id/doctor-review: Bắt buộc chọn 1 trong 4 mã kết luận chuẩn (reasonCode) và ghi chú văn bản thuần tối đa 500 ký tự.'
                )}
              </Text>
            </View>

            {/* Allowlisted Reason Codes */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5')}>
                1. {t('mobile.select_reason_code', 'Mã kết luận đánh giá (Reason Code Allowlist)')} *
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
                  2. {t('mobile.plaintext_clinical_note', 'Ghi chú lâm sàng (Plaintext, tùy chọn)')}
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
                  'Nhập nhận xét chuyên môn ngắn gọn (không chứa HTML hoặc tệp đính kèm)...'
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
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>{t('mobile.cancel', 'Hủy')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              style={tw('flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row')}
            >
              <CheckCircle2 color="#0f172a" size={18} style={tw('mr-1.5')} />
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.submit_doctor_review', 'Hoàn tất Duyệt')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};

