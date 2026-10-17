import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Sparkles, AlertTriangle, TrendingUp, CheckCircle, ShieldCheck, Info } from 'lucide-react-native';
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
  const { t } = useTranslation();

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-purple-100 dark:bg-purple-900/40 items-center justify-center mr-3')}>
                <Sparkles color={twInstance.color('text-purple-600 dark:text-purple-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.ai_clinical_summary', 'AI Clinical Telemetry Summary')}
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
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.baseline', 'Baseline')}</Text>
                <Text style={tw('font-bold text-base text-slate-700 dark:text-slate-300')}>{baseline}</Text>
              </View>
              <View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.current', 'Current')}</Text>
                <Text style={tw('font-bold text-base text-slate-900 dark:text-white')}>{current}</Text>
              </View>
              <View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.adherence', 'Adherence')}</Text>
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
                    {t('mobile.risk_assessment', 'Risk Assessment')}
                  </Text>
                </View>
                <View style={tw('bg-purple-200 dark:bg-purple-900/60 px-2.5 py-0.5 rounded-full')}>
                  <Text style={tw('text-xs font-bold text-purple-800 dark:text-purple-200')}>
                    {adherence >= 80 ? t('mobile.risk_low_moderate', 'Low-Moderate') : t('mobile.risk_elevated', 'Elevated')}
                  </Text>
                </View>
              </View>
              <Text style={tw('text-xs text-purple-900 dark:text-purple-200 leading-5')}>
                {t(
                  'mobile.ai_risk_detail',
                  'Patient exhibits positive response to pharmacological therapy with a 5% drop in systolic baseline. Morning readings remain mildly elevated.'
                )}
              </Text>
            </View>

            {/* Clinical Observations */}
            <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}>
              <View style={tw('flex-row items-center mb-3')}>
                <TrendingUp color={twInstance.color('text-blue-500')} size={18} />
                <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-200 ml-2')}>
                  {t('mobile.telemetry_observations', 'Key Telemetry Observations')}
                </Text>
              </View>
              <View style={tw('gap-2.5')}>
                <View style={tw('flex-row items-start')}>
                  <CheckCircle color={twInstance.color('text-emerald-500')} size={16} style={tw('mt-0.5 mr-2')} />
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 leading-5')}>
                    {t('mobile.ai_obs_1', 'Target blood pressure achieved on 14 out of the last 18 measurement logs.')}
                  </Text>
                </View>
                <View style={tw('flex-row items-start')}>
                  <AlertTriangle color={twInstance.color('text-amber-500')} size={16} style={tw('mt-0.5 mr-2')} />
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 leading-5')}>
                    {t('mobile.ai_obs_2', 'Mild evening fluctuations detected on weekends, correlated with skipped dietary logs.')}
                  </Text>
                </View>
              </View>
            </View>

            {/* Recommendations */}
            <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}>
              <View style={tw('flex-row items-center mb-3')}>
                <Sparkles color={twInstance.color('text-amber-500')} size={18} />
                <Text style={tw('text-sm font-bold text-slate-800 dark:text-slate-200 ml-2')}>
                  {t('mobile.ai_recommendations', 'Suggested Clinical Next Steps')}
                </Text>
              </View>
              <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5 mb-2')}>
                • {t('mobile.ai_rec_1', 'Maintain current ACE inhibitor dosage.')}
              </Text>
              <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5 mb-2')}>
                • {t('mobile.ai_rec_2', 'Remind patient to log fasting glucose consistently before breakfast.')}
              </Text>
              <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5')}>
                • {t('mobile.ai_rec_3', 'Schedule routine follow-up consultation in 14 days.')}
              </Text>
            </View>

            {/* Disclaimer */}
            <View style={tw('flex-row items-start bg-slate-100 dark:bg-slate-800/60 p-3 rounded-xl')}>
              <Info color={twInstance.color('text-slate-400')} size={16} style={tw('mt-0.5 mr-2')} />
              <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 flex-1 leading-4')}>
                {t('mobile.ai_disclaimer', 'Disclaimer: This is AI-generated analysis and does not replace professional medical advice.')}
              </Text>
            </View>
          </ScrollView>

          {/* Footer Action */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('bg-brand py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
