import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, ShieldCheck, FileCode2, CheckCircle2, PlayCircle, Info } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface ProgramRulePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  programName?: string;
}

export const ProgramRulePreviewModal: React.FC<ProgramRulePreviewModalProps> = ({
  visible,
  onClose,
  programName = 'Hypertension Management',
}) => {
  const { t, i18n } = useTranslation();
  const isVi = i18n.language?.startsWith('vi');
  const [ruleVersion, setRuleVersion] = useState('v2.1');
  const [ruleStatus, setRuleStatus] = useState<'active' | 'validated_candidate'>('active');

  const activeRule = {
    ruleId: 'rule-htn-bp-v2',
    version: ruleVersion,
    status: ruleStatus,
    updatedAt: '2026-11-05',
    declarativeConditions: [
      {
        id: 'cond-1',
        expression: 'blood_pressure.systolic >= 160 OR blood_pressure.diastolic >= 100',
        window: isVi ? '2 lần đo liên tiếp trong 24 giờ' : '2 consecutive readings within 24h',
        severity: 'urgent',
        action: isVi
          ? 'Kích hoạt cảnh báo khẩn cấp + Thông báo bác sĩ phụ trách'
          : 'Trigger Priority Inbox Alert + Notify Assigned Doctor',
      },
      {
        id: 'cond-2',
        expression: 'blood_pressure.systolic BETWEEN 140 AND 159',
        window: isVi ? '3 lần đo trong 72 giờ' : '3 readings within 72h',
        severity: 'attention',
        action: isVi
          ? 'Tạo cảnh báo lưu ý + Giao nhiệm vụ kiểm tra triệu chứng'
          : 'Create Attention Alert + Schedule Check-in Task',
      },
    ],
    testSummary: {
      boundaryPassed: '12/12',
      missingDataHandled: '6/6',
      repeatedSuppressionVerified: '8/8',
      lastSimulatedAt: '2026-11-05 09:15 UTC',
    },
  };

  const handleActivateValidatedRule = () => {
    setRuleVersion('v2.2');
    setRuleStatus('active');
    Toast.show({
      type: 'success',
      text1: t('mobile.rule_activated_title', isVi ? 'Đã kích hoạt quy tắc cảnh báo' : 'Alert Rule Activated'),
      text2: t(
        'mobile.rule_activated_desc',
        isVi
          ? 'Phiên bản quy tắc mới đã được kích hoạt cho chương trình theo dõi.'
          : 'The new alert rule version is now active for this care program.'
      ),
    });
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3')}>
                <FileCode2 color={twInstance.color('text-amber-600 dark:text-amber-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {t('mobile.program_rule_preview_title', isVi ? 'Quy tắc Cảnh báo Chương trình' : 'Program Alert Rules')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {programName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Role Scope Notice */}
            <View style={tw('bg-indigo-50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex-row items-start')}>
              <Info color="#6366f1" size={16} style={tw('mt-0.5 mr-2 shrink-0')} />
              <Text style={tw('text-xs text-indigo-900 dark:text-indigo-200 flex-1 leading-4')}>
                {t(
                  'mobile.doctor_rule_scope_notice',
                  isVi
                    ? 'Xem cấu hình ngưỡng cảnh báo đang áp dụng cho chương trình theo dõi và kích hoạt phiên bản quy tắc mới đã qua kiểm thử.'
                    : 'View the active alert thresholds for this care program and activate validated rule updates.'
                )}
              </Text>
            </View>

            {/* Rule Version & Status Header */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row items-center justify-between')}>
              <View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {isVi ? 'Mã quy tắc' : 'Rule ID'}: {activeRule.ruleId}
                </Text>
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-0.5')}>
                  {isVi ? 'Phiên bản' : 'Version'} {activeRule.version}
                </Text>
              </View>
              <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full flex-row items-center')}>
                <ShieldCheck color="#10b981" size={14} style={tw('mr-1')} />
                <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase')}>
                  {isVi ? 'Đang áp dụng' : 'Active'}
                </Text>
              </View>
            </View>

            {/* Declarative Conditions */}
            <View style={tw('gap-2.5')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                {t('mobile.declarative_conditions', isVi ? 'Điều kiện ngưỡng cảnh báo' : 'Alert Threshold Conditions')}
              </Text>
              {activeRule.declarativeConditions.map((cond) => (
                <View
                  key={cond.id}
                  style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}
                >
                  <View style={tw('flex-row justify-between items-center mb-1.5')}>
                    <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400')}>{cond.window}</Text>
                    <View
                      style={tw(
                        `px-2.5 py-0.5 rounded-full ${
                          cond.severity === 'urgent'
                            ? 'bg-rose-100 dark:bg-rose-900/40'
                            : 'bg-amber-100 dark:bg-amber-900/40'
                        }`
                      )}
                    >
                      <Text
                        style={tw(
                          `text-[10px] font-bold uppercase ${
                            cond.severity === 'urgent'
                              ? 'text-rose-700 dark:text-rose-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`
                        )}
                      >
                        {cond.severity === 'urgent'
                          ? isVi
                            ? 'Khẩn cấp'
                            : 'Urgent'
                          : isVi
                          ? 'Cần lưu ý'
                          : 'Attention'}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw('text-xs font-mono font-bold text-slate-900 dark:text-white bg-slate-100 dark:bg-slate-800 p-2.5 rounded-xl mb-2')}>
                    {cond.expression}
                  </Text>
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300')}>→ {cond.action}</Text>
                </View>
              ))}
            </View>

            {/* Deterministic Simulation Test Summary */}
            <View style={tw('bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-2.5')}>
                {t('mobile.simulation_test_summary', isVi ? 'Kết quả kiểm thử an toàn' : 'Safety Validation Summary')}
              </Text>
              <View style={tw('flex-row justify-between mb-2')}>
                <View style={tw('flex-row items-center')}>
                  <CheckCircle2 color="#10b981" size={14} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs text-slate-700 dark:text-slate-300')}>
                    {isVi ? 'Kiểm thử giá trị biên:' : 'Boundary cases:'}
                  </Text>
                </View>
                <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                  {activeRule.testSummary.boundaryPassed} {isVi ? 'Đạt' : 'Passed'}
                </Text>
              </View>
              <View style={tw('flex-row justify-between mb-2')}>
                <View style={tw('flex-row items-center')}>
                  <CheckCircle2 color="#10b981" size={14} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs text-slate-700 dark:text-slate-300')}>
                    {isVi ? 'Kiểm tra thiếu dữ liệu:' : 'Missing data guard:'}
                  </Text>
                </View>
                <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                  {activeRule.testSummary.missingDataHandled} {isVi ? 'Đạt' : 'Passed'}
                </Text>
              </View>
              <View style={tw('flex-row justify-between')}>
                <View style={tw('flex-row items-center')}>
                  <CheckCircle2 color="#10b981" size={14} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs text-slate-700 dark:text-slate-300')}>
                    {isVi ? 'Chống lặp cảnh báo:' : 'Repeated alert dedupe:'}
                  </Text>
                </View>
                <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                  {activeRule.testSummary.repeatedSuppressionVerified} {isVi ? 'Đạt' : 'Passed'}
                </Text>
              </View>
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.close', isVi ? 'Đóng' : 'Close')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleActivateValidatedRule}
              style={tw('flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row')}
            >
              <PlayCircle color="#0f172a" size={18} style={tw('mr-1.5')} />
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.activate_validated_rule', isVi ? 'Kích hoạt quy tắc mới' : 'Activate New Rule')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

