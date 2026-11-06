import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, AlertTriangle, TrendingUp, CheckCircle, ShieldCheck, Info, ThumbsUp, ThumbsDown } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface AiSummaryModalProps {
  visible: boolean;
  onClose: () => void;
  patientName?: string;
  programName?: string;
  baseline?: string;
  current?: string;
  adherence?: number;
}

export const AiSummaryModal: React.FC<AiSummaryModalProps> = ({
  visible,
  onClose,
  patientName = 'Alex Johnson',
  programName = 'Hypertension Care Program',
  baseline = '145/95 mmHg',
  current = '138/88 mmHg',
  adherence = 85,
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith('vi');

  const [reviewDecision, setReviewDecision] = useState<'pending' | 'reviewed' | 'rejected'>('pending');
  const [reviewerNote, setReviewerNote] = useState('');

  const handleDoctorSummaryDecision = (decision: 'reviewed' | 'rejected') => {
    setReviewDecision(decision);
    Toast.show({
      type: decision === 'reviewed' ? 'success' : 'info',
      text1:
        decision === 'reviewed'
          ? t('mobile.ai_summary_approved', isVi ? 'Đã xác nhận bản tóm tắt AI' : 'AI Summary Approved')
          : t('mobile.ai_summary_rejected', isVi ? 'Đã từ chối bản tóm tắt AI' : 'AI Summary Rejected'),
      text2: t(
        'mobile.ai_summary_audit_desc',
        isVi
          ? 'Đã ghi nhận người duyệt và ghi chú chuyên môn. Các số liệu sinh hiệu gốc được giữ nguyên.'
          : 'Reviewer and clinical notes recorded. Underlying vital statistics remain unchanged.'
      ),
    });
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-2')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/40 items-center justify-center mr-3')}>
                <Sparkles color={twInstance.color('text-purple-600 dark:text-purple-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {t('mobile.ai_clinical_summary', isVi ? 'Tóm tắt chỉ số sức khỏe bằng AI' : 'AI Clinical Telemetry Summary')}
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
            {/* Quick Metrics Comparison */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row justify-between items-center')}>
              <View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.baseline', isVi ? 'Chỉ số nền' : 'Baseline')}</Text>
                <Text style={tw('font-bold text-base text-slate-700 dark:text-slate-300')}>{baseline}</Text>
              </View>
              <View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.current', isVi ? 'Hiện tại' : 'Current')}</Text>
                <Text style={tw('font-bold text-base text-slate-900 dark:text-white')}>{current}</Text>
              </View>
              <View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.adherence', isVi ? 'Tuân thủ' : 'Adherence')}</Text>
                <Text style={tw(`font-bold text-base ${adherence >= 80 ? 'text-emerald-500' : 'text-amber-500'}`)}>
                  {adherence}%
                </Text>
              </View>
            </View>

            {/* AI Risk Assessment */}
            <View style={tw('bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800/50 p-4 rounded-2xl')}>
              <View style={tw('flex-row items-center justify-between mb-2')}>
                <View style={tw('flex-row items-center')}>
                  <ShieldCheck color={twInstance.color('text-purple-600 dark:text-purple-400')} size={18} />
                  <Text style={tw('text-sm font-bold text-purple-900 dark:text-purple-200 ml-1.5')}>
                    {t('mobile.risk_assessment', isVi ? 'Đánh giá mức độ rủi ro' : 'Risk Assessment')}
                  </Text>
                </View>
                <View style={tw('bg-purple-200 dark:bg-purple-900/60 px-2.5 py-0.5 rounded-full')}>
                  <Text style={tw('text-xs font-bold text-purple-800 dark:text-purple-200')}>
                    {adherence >= 80
                      ? t('mobile.risk_low_moderate', isVi ? 'Thấp - Trung bình' : 'Low-Moderate')
                      : t('mobile.risk_elevated', isVi ? 'Tăng cao' : 'Elevated')}
                  </Text>
                </View>
              </View>
              <Text style={tw('text-xs text-purple-900 dark:text-purple-200 leading-5')}>
                {t(
                  'mobile.ai_risk_detail',
                  isVi
                    ? 'Bệnh nhân đáp ứng tốt với phác đồ điều trị, huyết áp tâm thu giảm 5% so với chỉ số nền. Các lần đo buổi sáng vẫn còn hơi cao nhẹ.'
                    : 'Patient exhibits positive response to pharmacological therapy with a 5% drop in systolic baseline. Morning readings remain mildly elevated.'
                )}
              </Text>
            </View>

            {/* Clinical Observations */}
            <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}>
              <View style={tw('flex-row items-center mb-3')}>
                <TrendingUp color={twInstance.color('text-blue-500')} size={18} />
                <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-200 ml-2')}>
                  {t('mobile.telemetry_observations', isVi ? 'Nhận xét diễn biến chỉ số' : 'Key Telemetry Observations')}
                </Text>
              </View>
              <View style={tw('gap-2.5')}>
                <View style={tw('flex-row items-start')}>
                  <CheckCircle color={twInstance.color('text-emerald-500')} size={16} style={tw('mt-0.5 mr-2')} />
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 leading-5')}>
                    {t(
                      'mobile.ai_obs_1',
                      isVi
                        ? 'Đạt mục tiêu huyết áp ở 14 trên 18 lần đo gần nhất.'
                        : 'Target blood pressure achieved on 14 out of the last 18 measurement logs.'
                    )}
                  </Text>
                </View>
                <View style={tw('flex-row items-start')}>
                  <AlertTriangle color={twInstance.color('text-amber-500')} size={16} style={tw('mt-0.5 mr-2')} />
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 leading-5')}>
                    {t(
                      'mobile.ai_obs_2',
                      isVi
                        ? 'Ghi nhận dao động nhẹ vào buổi tối cuối tuần, liên quan đến việc quên ghi nhật ký chế độ ăn.'
                        : 'Mild evening fluctuations detected on weekends, correlated with skipped dietary logs.'
                    )}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recommendations */}
            <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}>
              <View style={tw('flex-row items-center mb-3')}>
                <Sparkles color={twInstance.color('text-amber-500')} size={18} />
                <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-200 ml-2')}>
                  {t('mobile.ai_recommendations', isVi ? 'Gợi ý hướng xử trí tiếp theo' : 'Suggested Clinical Next Steps')}
                </Text>
              </View>
              <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5 mb-2')}>
                • {t('mobile.ai_rec_1', isVi ? 'Duy trì liều thuốc ức chế men chuyển hiện tại.' : 'Maintain current ACE inhibitor dosage.')}
              </Text>
              <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5 mb-2')}>
                • {t('mobile.ai_rec_2', isVi ? 'Nhắc bệnh nhân đo đường huyết lúc đói đều đặn trước bữa sáng.' : 'Remind patient to log fasting glucose consistently before breakfast.')}
              </Text>
              <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5')}>
                • {t('mobile.ai_rec_3', isVi ? 'Đặt lịch tái khám định kỳ sau 14 ngày.' : 'Schedule routine follow-up consultation in 14 days.')}
              </Text>
            </View>

            {/* Doctor Review / Reject AI Summary Panel */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
              <View style={tw('flex-row justify-between items-center mb-2')}>
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-300')}>
                  {t('mobile.doctor_ai_review_title', isVi ? 'Kiểm duyệt Tóm tắt AI của Bác sĩ' : 'Doctor AI Summary Review')}
                </Text>
                <View
                  style={tw(
                    `px-2.5 py-0.5 rounded-full ${
                      reviewDecision === 'reviewed'
                        ? 'bg-emerald-100 dark:bg-emerald-900/40'
                        : reviewDecision === 'rejected'
                        ? 'bg-rose-100 dark:bg-rose-900/40'
                        : 'bg-amber-100 dark:bg-amber-900/40'
                    }`
                  )}
                >
                  <Text
                    style={tw(
                      `text-[10px] font-bold uppercase ${
                        reviewDecision === 'reviewed'
                          ? 'text-emerald-700 dark:text-emerald-300'
                          : reviewDecision === 'rejected'
                          ? 'text-rose-700 dark:text-rose-300'
                          : 'text-amber-700 dark:text-amber-300'
                      }`
                    )}
                  >
                    {reviewDecision === 'reviewed'
                      ? isVi
                        ? 'Đã duyệt'
                        : 'Reviewed'
                      : reviewDecision === 'rejected'
                      ? isVi
                        ? 'Từ chối'
                        : 'Rejected'
                      : isVi
                      ? 'Chờ duyệt'
                      : 'Pending'}
                  </Text>
                </View>
              </View>
              <TextInput
                value={reviewerNote}
                onChangeText={setReviewerNote}
                placeholder={t(
                  'mobile.ai_reviewer_note_placeholder',
                  isVi
                    ? 'Ghi chú kiểm duyệt của bác sĩ (không làm thay đổi số liệu thống kê gốc)...'
                    : 'Doctor review note (does not alter underlying vital statistics)...'
                )}
                placeholderTextColor="#94a3b8"
                style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 dark:text-white mb-3')}
              />
              <View style={tw('flex-row gap-2.5')}>
                <TouchableOpacity
                  onPress={() => handleDoctorSummaryDecision('reviewed')}
                  style={tw('flex-1 bg-emerald-600 py-2.5 rounded-xl flex-row items-center justify-center')}
                >
                  <ThumbsUp color="#ffffff" size={14} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-white')}>
                    {t('mobile.approve_ai_summary', isVi ? 'Xác nhận hợp lệ' : 'Approve Summary')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => handleDoctorSummaryDecision('rejected')}
                  style={tw('flex-1 bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 py-2.5 rounded-xl flex-row items-center justify-center')}
                >
                  <ThumbsDown color="#ef4444" size={14} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400')}>
                    {t('mobile.reject_ai_summary', isVi ? 'Từ chối bản tóm tắt' : 'Reject Summary')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Disclaimer */}
            <View style={tw('flex-row items-start bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl')}>
              <Info color={twInstance.color('text-slate-400')} size={16} style={tw('mt-0.5 mr-2')} />
              <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 flex-1 leading-4')}>
                {t(
                  'mobile.ai_disclaimer',
                  isVi
                    ? 'Lưu ý: Đây là bản phân tích hỗ trợ bởi AI và không thay thế cho chẩn đoán y khoa chuyên môn.'
                    : 'Disclaimer: This is AI-generated analysis and does not replace professional medical advice.'
                )}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('bg-brand py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-sm')}>
                {t('mobile.close', isVi ? 'Đóng' : 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
