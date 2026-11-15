import React, { useCallback, useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  Info,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  X,
} from 'lucide-react-native';
import {
  mobileApi,
  normalizePaginatedList,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

interface ModifyThresholdsModalProps {
  visible: boolean;
  onClose: () => void;
  programId?: string;
  patientName?: string;
}

export const ModifyThresholdsModal: React.FC<ModifyThresholdsModalProps> = ({
  visible,
  onClose,
  programId,
  patientName,
}) => {
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [program, setProgram] = useState<FeTypes.CareProgramRuleGetProgramResponse | null>(null);
  const [ruleVersion, setRuleVersion] = useState<number | null>(null);
  const [testSummaryStatus, setTestSummaryStatus] = useState<string>('unavailable');
  const [reasonCodes, setReasonCodes] = useState<string[]>([]);
  const [executedAt, setExecutedAt] = useState<string>('');

  const loadPolicy = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      let targetProgramId = programId ?? '';
      if (!targetProgramId) {
        const listRes = await mobileApi.careProgramRuleListPrograms({
          query: { status: 'published', page: 1, limit: 10 },
        });
        const first = normalizePaginatedList<Record<string, unknown>>(listRes).items[0];
        targetProgramId = first ? String(first.id ?? first._id ?? '') : '';
      }

      if (!targetProgramId) {
        setProgram(null);
        setRuleVersion(null);
        setReasonCodes([]);
        return;
      }

      const [progRes, ruleRes] = await Promise.allSettled([
        mobileApi.careProgramRuleGetProgram({ params: { id: targetProgramId } }),
        mobileApi.careProgramRuleGetRule({
          params: { id: targetProgramId },
          query: { view: 'active' },
        }),
      ]);

      if (progRes.status === 'fulfilled') {
        const raw = progRes.value as unknown as { data?: FeTypes.CareProgramRuleGetProgramResponse } & FeTypes.CareProgramRuleGetProgramResponse;
        setProgram(raw.data && typeof raw.data === 'object' ? raw.data : raw);
      } else {
        throw progRes.reason;
      }

      if (ruleRes.status === 'fulfilled') {
        const raw = ruleRes.value as unknown as Record<string, unknown>;
        const data = raw.data && typeof raw.data === 'object' ? (raw.data as Record<string, unknown>) : raw;
        setRuleVersion(typeof data.version === 'number' ? data.version : null);
        const summary = (data.testSummary ?? {}) as Record<string, unknown>;
        setTestSummaryStatus(String(summary.status ?? 'unavailable'));
        setReasonCodes(Array.isArray(summary.reasonCodes) ? summary.reasonCodes.map(String) : []);
        setExecutedAt(String(summary.executedAt ?? ''));
      } else {
        setRuleVersion(null);
        setReasonCodes([]);
      }
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'mobile.load_program_rule_failed'));
    } finally {
      setLoading(false);
    }
  }, [programId, visible]);

  useEffect(() => {
    if (visible) {
      void loadPolicy();
    }
  }, [loadPolicy, visible]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[82%] border-t border-slate-200 dark:border-slate-800'
          )}
        >
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between'
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3'
                )}
              >
                <ShieldAlert color="#f59e0b" size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.program_thresholds_policy')}
                </Text>
                <Text numberOfLines={1} style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName
                    ? `${t('mobile.patient')}: ${patientName}`
                    : program?.name || t('mobile.chronic_care')}
                </Text>
              </View>
            </View>
            <View style={tw('flex-row items-center gap-2')}>
              <TouchableOpacity
                onPress={() => void loadPolicy()}
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

          <ScrollView contentContainerStyle={tw('p-5 gap-4')} showsVerticalScrollIndicator={false}>
            <View
              style={tw(
                'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-4 flex-row items-start'
              )}
            >
              <Info color="#3b82f6" size={18} style={tw('mt-0.5 mr-2.5 shrink-0')} />
              <Text style={tw('text-xs text-blue-800 dark:text-blue-200 flex-1 leading-5')}>
                {t('mobile.thresholds_governed_by_program_policy')}
              </Text>
            </View>

            {loading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </View>
            ) : errorMsg ? (
              <View
                style={tw(
                  'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 items-center'
                )}
              >
                <AlertCircle color="#e11d48" size={26} style={tw('mb-2')} />
                <Text style={tw('text-xs text-rose-700 dark:text-rose-300 text-center mb-3')}>
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadPolicy()}
                  style={tw('bg-rose-600 px-4 py-2 rounded-xl')}
                >
                  <Text style={tw('text-xs font-bold text-white')}>{t('mobile.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : program ? (
              <View
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 gap-3'
                )}
              >
                <View style={tw('flex-row items-center justify-between')}>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white flex-1 mr-2')}>
                    {program.name}
                  </Text>
                  <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-full flex-row items-center')}>
                    <ShieldCheck color="#10b981" size={13} style={tw('mr-1')} />
                    <Text style={tw('text-[11px] font-bold text-emerald-700 dark:text-emerald-300')}>
                      {ruleVersion !== null ? `v${ruleVersion}` : `v${program.version}`}
                    </Text>
                  </View>
                </View>

                <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5')}>
                  {program.description || t('mobile.program_rule_preview_hint')}
                </Text>

                {reasonCodes.length > 0 && (
                  <View style={tw('flex-row flex-wrap gap-1.5')}>
                    {reasonCodes.map((code) => (
                      <View
                        key={code}
                        style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 px-2.5 py-1 rounded-lg')}
                      >
                        <Text style={tw('text-[11px] font-semibold text-slate-700 dark:text-slate-200')}>
                          {code.replace(/[_-]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </Text>
                      </View>
                    ))}
                  </View>
                )}

                <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                  {t('mobile.safety_scenario_verification')}: {testSummaryStatus.toUpperCase()}
                  {executedAt ? ` • ${new Date(executedAt).toLocaleString(dateLocale)}` : ''}
                </Text>
              </View>
            ) : null}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity
              onPress={onClose}
              style={tw('bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                {t('mobile.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
