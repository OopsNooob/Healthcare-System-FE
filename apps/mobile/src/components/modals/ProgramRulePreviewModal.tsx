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
  CheckCircle2,
  ClipboardList,
  FileCode2,
  Info,
  RefreshCw,
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

interface ProgramRulePreviewModalProps {
  visible: boolean;
  onClose: () => void;
  programId?: string;
  programName?: string;
}

interface DoctorRuleProjection {
  id: string;
  careProgramId: string;
  version: number;
  status: string;
  testSummary?: {
    status: 'passed' | 'failed' | 'unavailable';
    total?: number;
    passed?: number;
    failed?: number;
    reasonCodes?: string[];
    interpreterVersion?: string;
    executedAt?: string;
  };
}

function getId(item: Record<string, unknown> | null | undefined): string {
  return String(item?.id ?? item?._id ?? '');
}

function formatHumanCode(code: string): string {
  return code
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

export const ProgramRulePreviewModal: React.FC<ProgramRulePreviewModalProps> = ({
  visible,
  onClose,
  programId,
  programName,
}) => {
  const { t } = useTranslation();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [program, setProgram] = useState<FeTypes.CareProgramRuleGetProgramResponse | null>(null);
  const [activeRule, setActiveRule] = useState<DoctorRuleProjection | null>(null);

  const loadData = useCallback(async () => {
    if (!visible) return;
    setLoading(true);
    setErrorMsg(null);
    try {
      let targetProgramId = programId ?? '';
      if (!targetProgramId) {
        const listRes = await mobileApi.careProgramRuleListPrograms({
          query: { status: 'published', page: 1, limit: 20 },
        });
        const programs = normalizePaginatedList<Record<string, unknown>>(listRes).items;
        const normalizedTargetName = (programName ?? '').trim().toLowerCase();
        const matched =
          (normalizedTargetName
            ? programs.find((p) => {
                const name = String(p.name ?? '').toLowerCase();
                const disease = String(p.diseaseKey ?? '').toLowerCase();
                return (
                  name === normalizedTargetName ||
                  name.includes(normalizedTargetName) ||
                  normalizedTargetName.includes(name) ||
                  normalizedTargetName.includes(disease)
                );
              })
            : undefined) ?? programs[0];
        targetProgramId = matched ? getId(matched) : '';
      }

      if (!targetProgramId) {
        setProgram(null);
        setActiveRule(null);
        return;
      }

      const [programRes, ruleRes] = await Promise.allSettled([
        mobileApi.careProgramRuleGetProgram({ params: { id: targetProgramId } }),
        mobileApi.careProgramRuleGetRule({
          params: { id: targetProgramId },
          query: { view: 'active' },
        }),
      ]);

      if (programRes.status === 'fulfilled') {
        const raw = programRes.value as unknown as { data?: FeTypes.CareProgramRuleGetProgramResponse } & FeTypes.CareProgramRuleGetProgramResponse;
        setProgram(raw.data && typeof raw.data === 'object' ? raw.data : raw);
      } else {
        throw programRes.reason;
      }

      if (ruleRes.status === 'fulfilled') {
        const rawRule = ruleRes.value as unknown as { data?: DoctorRuleProjection } & DoctorRuleProjection;
        const rule = rawRule.data && typeof rawRule.data === 'object' ? rawRule.data : rawRule;
        setActiveRule(rule?.id || rule?.version ? rule : null);
      } else {
        setActiveRule(null);
      }
    } catch (err) {
      setErrorMsg(extractApiErrorMessage(err, 'mobile.load_program_rule_failed'));
    } finally {
      setLoading(false);
    }
  }, [programId, programName, visible]);

  useEffect(() => {
    if (visible) {
      void loadData();
    }
  }, [loadData, visible]);

  const testSummary = activeRule?.testSummary;
  const testStatus = testSummary?.status ?? 'unavailable';
  const taskTemplates = Array.isArray(program?.taskTemplates) ? program.taskTemplates : [];

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
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
                  'w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3'
                )}
              >
                <FileCode2 color={twInstance.color('text-amber-600 dark:text-amber-400')} size={20} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.program_rule_preview_title')}
                </Text>
                <Text
                  numberOfLines={1}
                  style={tw('text-xs text-slate-500 dark:text-slate-400')}
                >
                  {program?.name || programName || t('mobile.chronic_care')}
                </Text>
              </View>
            </View>
            <View style={tw('flex-row items-center gap-2')}>
              <TouchableOpacity
                onPress={() => void loadData()}
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
            {/* Intro Notice */}
            <View
              style={tw(
                'bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800/50 rounded-2xl p-3.5 flex-row items-start'
              )}
            >
              <Info color="#3b82f6" size={16} style={tw('mt-0.5 mr-2.5 shrink-0')} />
              <Text style={tw('text-xs text-blue-800 dark:text-blue-200 flex-1 leading-4')}>
                {t('mobile.program_rule_preview_hint')}
              </Text>
            </View>

            {loading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-24 w-full rounded-2xl" />
                <Skeleton className="h-36 w-full rounded-2xl" />
                <Skeleton className="h-28 w-full rounded-2xl" />
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
                  onPress={() => void loadData()}
                  style={tw('bg-rose-600 px-4 py-2 rounded-xl')}
                >
                  <Text style={tw('text-white font-bold text-xs')}>{t('mobile.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : !program ? (
              <View
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-6 items-center'
                )}
              >
                <Info color={twInstance.color('text-slate-400')} size={26} style={tw('mb-2')} />
                <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-300 text-center')}>
                  {t('mobile.no_published_program_rule')}
                </Text>
              </View>
            ) : (
              <>
                {/* Active Rule Projection Card */}
                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                  )}
                >
                  <View style={tw('flex-row flex-wrap items-center justify-between gap-2')}>
                    <View style={tw('flex-1 min-w-[140px]')}>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                        {t('mobile.active_rule_version')}
                      </Text>
                      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mt-0.5')}>
                        {activeRule
                          ? `${t('mobile.version_prefix')} ${activeRule.version}`
                          : `${t('mobile.version_prefix')} ${program.version}`}
                      </Text>
                    </View>
                    <View
                      style={tw(
                        `px-3 py-1.5 rounded-full flex-row items-center self-start ${
                          activeRule
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : 'bg-amber-100 dark:bg-amber-900/40'
                        }`
                      )}
                    >
                      <ShieldCheck
                        color={activeRule ? '#10b981' : '#f59e0b'}
                        size={14}
                        style={tw('mr-1.5')}
                      />
                      <Text
                        style={tw(
                          `text-xs font-bold uppercase ${
                            activeRule
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`
                        )}
                      >
                        {activeRule
                          ? t('mobile.currently_active')
                          : t('mobile.pending_rule_activation')}
                      </Text>
                    </View>
                  </View>

                  {program.description ? (
                    <Text style={tw('text-xs text-slate-600 dark:text-slate-300 mt-3 leading-5')}>
                      {program.description}
                    </Text>
                  ) : null}

                  <View style={tw('flex-row flex-wrap gap-2 mt-3')}>
                    <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl')}>
                      <Text style={tw('text-[11px] font-semibold text-slate-600 dark:text-slate-300')}>
                        {t('mobile.condition_focus')}: {formatHumanCode(program.diseaseKey)}
                      </Text>
                    </View>
                    <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 px-3 py-1.5 rounded-xl')}>
                      <Text style={tw('text-[11px] font-semibold text-slate-600 dark:text-slate-300')}>
                        {t('mobile.program_version_label')}: v{program.version}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* Clinical Care Protocol Components (No raw code) */}
                {taskTemplates.length > 0 && (
                  <View
                    style={tw(
                      'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4'
                    )}
                  >
                    <View style={tw('flex-row items-center mb-3')}>
                      <ClipboardList color={twInstance.color('text-indigo-500')} size={16} style={tw('mr-2')} />
                      <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                        {t('mobile.monitored_care_components')} ({taskTemplates.length})
                      </Text>
                    </View>

                    <View style={tw('gap-2.5')}>
                      {taskTemplates.map((tpl, idx) => {
                        const title = String(
                          tpl.title ?? tpl.label ?? tpl.name ?? formatHumanCode(String(tpl.templateKey ?? tpl.key ?? `${t('mobile.care_task')} ${idx + 1}`))
                        );
                        const taskType = formatHumanCode(String(tpl.taskType ?? tpl.type ?? 'check_in'));
                        const cadenceDays = tpl.frequencyDays ?? tpl.intervalDays ?? tpl.cadenceDays;
                        return (
                          <View
                            key={`${title}-${idx}`}
                            style={tw(
                              'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3'
                            )}
                          >
                            <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                              {title}
                            </Text>
                            <View style={tw('flex-row flex-wrap items-center gap-2 mt-1.5')}>
                              <View style={tw('bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 rounded-md')}>
                                <Text style={tw('text-[11px] font-semibold text-indigo-700 dark:text-indigo-300')}>
                                  {taskType}
                                </Text>
                              </View>
                              {cadenceDays !== undefined && cadenceDays !== null && (
                                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                                  {t('mobile.every_n_days', { count: Number(cadenceDays) })}
                                </Text>
                              )}
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}

                {/* Safety Verification Results — flex-wrap / stacked, never overflows */}
                {activeRule && (
                  <View
                    style={tw(
                      'bg-emerald-50 dark:bg-emerald-950/20 border border-emerald-200 dark:border-emerald-800/40 rounded-2xl p-4'
                    )}
                  >
                    <Text
                      style={tw(
                        'text-xs font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-300 mb-3'
                      )}
                    >
                      {t('mobile.rule_test_results')}
                    </Text>

                    <View style={tw('gap-2.5')}>
                      {/* Boundary / Passed scenarios */}
                      <View
                        style={tw(
                          'bg-white/80 dark:bg-slate-900/80 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3'
                        )}
                      >
                        <View style={tw('flex-row items-center mb-1.5')}>
                          <CheckCircle2
                            color={testStatus === 'failed' ? '#e11d48' : '#10b981'}
                            size={15}
                            style={tw('mr-2 shrink-0')}
                          />
                          <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 flex-1')}>
                            {t('mobile.safety_scenario_verification')}
                          </Text>
                        </View>
                        <View style={tw('flex-row flex-wrap items-center gap-2')}>
                          <View
                            style={tw(
                              `px-2.5 py-1 rounded-lg ${
                                testStatus === 'passed'
                                  ? 'bg-emerald-100 dark:bg-emerald-900/50'
                                  : testStatus === 'failed'
                                  ? 'bg-rose-100 dark:bg-rose-900/50'
                                  : 'bg-slate-100 dark:bg-slate-800'
                              }`
                            )}
                          >
                            <Text
                              style={tw(
                                `text-xs font-bold ${
                                  testStatus === 'passed'
                                    ? 'text-emerald-700 dark:text-emerald-300'
                                    : testStatus === 'failed'
                                    ? 'text-rose-700 dark:text-rose-300'
                                    : 'text-slate-600 dark:text-slate-300'
                                }`
                              )}
                            >
                              {testStatus === 'passed'
                                ? t('mobile.test_passed_label')
                                : testStatus === 'failed'
                                ? t('mobile.test_failed_label')
                                : t('mobile.test_unavailable_label')}
                            </Text>
                          </View>
                          {typeof testSummary?.passed === 'number' &&
                            typeof testSummary?.total === 'number' && (
                              <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-100')}>
                                {testSummary.passed}/{testSummary.total} {t('mobile.scenarios_passed_short')}
                              </Text>
                            )}
                          {typeof testSummary?.failed === 'number' && testSummary.failed > 0 && (
                            <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400')}>
                              • {testSummary.failed} {t('mobile.failed_short')}
                            </Text>
                          )}
                        </View>
                      </View>

                      {testSummary?.reasonCodes && testSummary.reasonCodes.length > 0 && (
                        <View
                          style={tw(
                            'bg-white/80 dark:bg-slate-900/80 border border-emerald-200/80 dark:border-emerald-800/40 rounded-xl p-3'
                          )}
                        >
                          <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2')}>
                            {t('mobile.verified_alert_triggers')}
                          </Text>
                          <View style={tw('flex-row flex-wrap gap-1.5')}>
                            {testSummary.reasonCodes.map((code) => (
                              <View
                                key={code}
                                style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-2.5 py-1 rounded-lg')}
                              >
                                <Text style={tw('text-[11px] font-semibold text-emerald-800 dark:text-emerald-200')}>
                                  {formatHumanCode(code)}
                                </Text>
                              </View>
                            ))}
                          </View>
                        </View>
                      )}

                      {testSummary?.executedAt && (
                        <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                          {t('mobile.verified_at')}:{' '}
                          {new Date(testSummary.executedAt).toLocaleString(dateLocale)}
                        </Text>
                      )}
                    </View>
                  </View>
                )}
              </>
            )}
          </ScrollView>

          {/* Footer Close */}
          <View
            style={tw(
              'p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900'
            )}
          >
            <TouchableOpacity
              onPress={onClose}
              style={tw('bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-800 dark:text-slate-200 font-bold text-sm')}>
                {t('mobile.close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
