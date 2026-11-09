import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
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
  programName,
}) => {
  const { t } = useTranslation();
  const [ruleVersion, setRuleVersion] = useState('2.1');
  const [ruleStatus, setRuleStatus] = useState<'active' | 'validated_candidate'>('active');
  const [isActivating, setIsActivating] = useState(false);

  const displayProgramName =
    !programName || programName === 'Hypertension Management'
      ? t('mobile.hypertension_management')
      : programName === 'Diabetes Care'
        ? t('mobile.diabetes_care')
        : programName;

  const activeRule = {
    ruleName: t('mobile.rule_standard_bp_name'),
    version: ruleVersion,
    status: ruleStatus,
    updatedAt: '2026-11-05',
    declarativeConditions: [
      {
        id: 'cond-1',
        sourceLabel: t('mobile.rule_source_vital_readings'),
        expression: t('mobile.rule_cond1_expr'),
        window: t('mobile.rule_cond1_window'),
        severity: 'urgent' as const,
        action: t('mobile.rule_cond1_action'),
      },
      {
        id: 'cond-2',
        sourceLabel: t('mobile.rule_source_vital_readings'),
        expression: t('mobile.rule_cond2_expr'),
        window: t('mobile.rule_cond2_window'),
        severity: 'attention' as const,
        action: t('mobile.rule_cond2_action'),
      },
      {
        id: 'cond-3',
        sourceLabel: t('mobile.rule_source_symptom_checkin'),
        expression: t('mobile.rule_cond3_expr'),
        window: t('mobile.rule_cond3_window'),
        severity: 'urgent' as const,
        action: t('mobile.rule_cond3_action'),
      },
    ],
    testSummary: {
      boundaryPassed: '12/12',
      missingDataHandled: '6/6',
      repeatedSuppressionVerified: '8/8',
      lastSimulatedAt: '2026-11-05 09:15',
    },
  };

  const handleActivateValidatedRule = async () => {
    if (isActivating) return;
    setIsActivating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      setRuleVersion('2.2');
      setRuleStatus('active');
      Toast.show({
        type: 'success',
        text1: t('mobile.rule_activated_title'),
        text2: t('mobile.rule_activated_desc'),
      });
    } finally {
      setIsActivating(false);
    }
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
                  {t('mobile.program_rule_preview_title')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {displayProgramName}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              onPress={onClose}
              disabled={isActivating}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            {/* Role Scope Notice */}
            <View style={tw('bg-indigo-50 dark:bg-indigo-950/30 p-3.5 rounded-2xl border border-indigo-200 dark:border-indigo-800/50 flex-row items-start')}>
              <Info color="#6366f1" size={16} style={tw('mt-0.5 mr-2 shrink-0')} />
              <Text style={tw('text-xs text-indigo-900 dark:text-indigo-200 flex-1 leading-4')}>
                {t('mobile.doctor_rule_scope_notice')}
              </Text>
            </View>

            {/* Rule Version & Status Header */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row items-center justify-between')}>
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {activeRule.ruleName}
                </Text>
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-0.5')}>
                  {t('mobile.rule_version')} {activeRule.version}
                </Text>
              </View>
              <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1 rounded-full flex-row items-center shrink-0')}>
                <ShieldCheck color="#10b981" size={14} style={tw('mr-1')} />
                <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase')}>
                  {t('mobile.rule_active')}
                </Text>
              </View>
            </View>

            {/* Declarative Conditions */}
            <View style={tw('gap-2.5')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                {t('mobile.declarative_conditions')}
              </Text>
              {activeRule.declarativeConditions.map((cond) => (
                <View
                  key={cond.id}
                  style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}
                >
                  <View style={tw('flex-row justify-between items-center mb-1.5')}>
                    <View style={tw('flex-1 mr-2')}>
                      <Text style={tw('text-[11px] font-bold text-indigo-600 dark:text-indigo-400 mb-0.5')}>
                        {cond.sourceLabel}
                      </Text>
                      <Text style={tw('text-xs font-bold text-slate-500 dark:text-slate-400')}>{cond.window}</Text>
                    </View>
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
                        {cond.severity === 'urgent' ? t('mobile.urgent') : t('mobile.attention')}
                      </Text>
                    </View>
                  </View>
                  <View style={tw('bg-slate-100 dark:bg-slate-800 p-3 rounded-xl mb-2')}>
                    <Text style={tw('text-xs font-semibold text-slate-900 dark:text-white leading-4')}>
                      {cond.expression}
                    </Text>
                  </View>
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-4')}>→ {cond.action}</Text>
                </View>
              ))}
            </View>

            {/* Deterministic Simulation Test Summary */}
            <View style={tw('bg-emerald-50/50 dark:bg-emerald-950/20 p-4 rounded-2xl border border-emerald-200 dark:border-emerald-800/50')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-emerald-800 dark:text-emerald-300 mb-3')}>
                {t('mobile.simulation_test_summary')}
              </Text>
              <View style={tw('flex-row justify-between items-center mb-2.5')}>
                <View style={tw('flex-row items-center flex-1 mr-3')}>
                  <CheckCircle2 color="#10b981" size={14} style={tw('mr-2 shrink-0')} />
                  <Text style={tw('text-xs text-slate-700 dark:text-slate-300 flex-1')}>
                    {t('mobile.boundary_cases_label')}
                  </Text>
                </View>
                <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg shrink-0')}>
                  <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                    {activeRule.testSummary.boundaryPassed} • {t('mobile.test_passed_label')}
                  </Text>
                </View>
              </View>
              <View style={tw('flex-row justify-between items-center mb-2.5')}>
                <View style={tw('flex-row items-center flex-1 mr-3')}>
                  <CheckCircle2 color="#10b981" size={14} style={tw('mr-2 shrink-0')} />
                  <Text style={tw('text-xs text-slate-700 dark:text-slate-300 flex-1')}>
                    {t('mobile.missing_data_guard_label')}
                  </Text>
                </View>
                <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg shrink-0')}>
                  <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                    {activeRule.testSummary.missingDataHandled} • {t('mobile.test_passed_label')}
                  </Text>
                </View>
              </View>
              <View style={tw('flex-row justify-between items-center')}>
                <View style={tw('flex-row items-center flex-1 mr-3')}>
                  <CheckCircle2 color="#10b981" size={14} style={tw('mr-2 shrink-0')} />
                  <Text style={tw('text-xs text-slate-700 dark:text-slate-300 flex-1')}>
                    {t('mobile.repeated_alert_dedupe_label')}
                  </Text>
                </View>
                <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg shrink-0')}>
                  <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                    {activeRule.testSummary.repeatedSuppressionVerified} • {t('mobile.test_passed_label')}
                  </Text>
                </View>
              </View>
            </View>
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              onPress={onClose}
              disabled={isActivating}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.close')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleActivateValidatedRule}
              disabled={isActivating}
              style={tw(`flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${isActivating ? 'opacity-60' : ''}`)}
            >
              {isActivating ? (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
              ) : (
                <PlayCircle color="#0f172a" size={18} style={tw('mr-1.5')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.activate_validated_rule')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
