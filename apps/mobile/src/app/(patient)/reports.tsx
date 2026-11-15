import { useState, useEffect, useCallback, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft,
  LineChart,
  Sparkles,
  Activity,
  FileSpreadsheet,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { ReportExportModal } from '@/components/modals';
import type {
  ExcelHealthReadingRow,
  ExcelHealthAlertRow,
} from '@/services/excelReportGenerator';
import { mobileApi, normalizePaginatedList, type FeTypes } from '@repo/shared-hooks';

interface ParsedSummaryContent {
  overview: string;
  observations: string[];
  missingData: string[];
  alertsToMention: string[];
  questionsForDoctor: string[];
  disclaimer: string;
}

const AiSummaryAccordion = ({
  title,
  content,
  isEmpty,
}: {
  title: string;
  content: string;
  isEmpty?: boolean;
}) => {
  const [expanded, setExpanded] = useState(false);
  const { t } = useTranslation();

  if (isEmpty) {
    return (
      <View
        style={tw(
          'bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-slate-200 dark:border-slate-800 mb-3 opacity-60 flex-row justify-between items-center'
        )}
      >
        <Text style={tw('font-semibold text-slate-500 dark:text-slate-400 flex-1 mr-2')}>
          {title}
        </Text>
        <Text style={tw('text-slate-400 dark:text-slate-500 text-sm')}>
          {t('mobile.ai_no_data', 'Không có dữ liệu')}
        </Text>
      </View>
    );
  }

  return (
    <View
      style={tw(
        'bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 mb-3 overflow-hidden'
      )}
    >
      <TouchableOpacity
        style={tw('p-4 flex-row justify-between items-center')}
        onPress={() => setExpanded(!expanded)}
      >
        <Text style={tw('font-semibold text-slate-800 dark:text-slate-200 flex-1 mr-2')}>
          {title}
        </Text>
        {expanded ? (
          <ChevronUp color={twInstance.color('text-slate-400')} size={20} />
        ) : (
          <ChevronDown color={twInstance.color('text-slate-400')} size={20} />
        )}
      </TouchableOpacity>
      {expanded && (
        <View style={tw('px-4 pb-4')}>
          <Text style={tw('text-slate-600 dark:text-slate-300 leading-5')}>{content}</Text>
        </View>
      )}
    </View>
  );
};

function getObjectId(obj: Record<string, unknown> | null | undefined): string {
  return String(obj?.id ?? obj?._id ?? '');
}

function parseSummary(
  res: FeTypes.CareReportGenerateSummaryResponse | null
): ParsedSummaryContent | null {
  const raw = res?.content as Record<string, unknown> | undefined;
  if (!raw || typeof raw !== 'object') return null;
  const toList = (val: unknown) =>
    Array.isArray(val) ? val.filter((v): v is string => typeof v === 'string') : [];
  return {
    overview: typeof raw.overview === 'string' ? raw.overview : '',
    observations: toList(raw.observations),
    missingData: toList(raw.missingData),
    alertsToMention: toList(raw.alertsToMention),
    questionsForDoctor: toList(raw.questionsForDoctor),
    disclaimer: typeof raw.disclaimer === 'string' ? raw.disclaimer : '',
  };
}

export default function ReportsScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();

  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('7d');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [isRefreshingAi, setIsRefreshingAi] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [exportModalVisible, setExportModalVisible] = useState(false);

  const [patientName, setPatientName] = useState<string>('');
  const [patientCode, setPatientCode] = useState<string>('');
  const [rawMetrics, setRawMetrics] = useState<Array<Record<string, unknown>>>([]);
  const [rawAlerts, setRawAlerts] = useState<Array<Record<string, unknown>>>([]);
  const [bpStats, setBpStats] = useState<Record<string, unknown> | null>(null);
  const [activeReport, setActiveReport] = useState<Record<string, unknown> | null>(null);
  const [summaryRes, setSummaryRes] =
    useState<FeTypes.CareReportGenerateSummaryResponse | null>(null);

  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const loadReportsData = useCallback(
    async (opts?: { silent?: boolean }) => {
      if (!opts?.silent) {
        setLoading(true);
      }
      setLoadError(null);

      try {
        const now = new Date();
        const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
        const startDate = new Date(now.getTime() - days * 24 * 60 * 60 * 1000).toISOString();
        const endDate = now.toISOString();

        const [meResult, metricsResult, statsResult, alertsResult, enrollmentsResult] =
          await Promise.allSettled([
            mobileApi.usersGetMe(),
            mobileApi.healthMetricsFindAll({ query: { limit: 100 } }),
            mobileApi.healthMetricsGetStatistics({
              params: { type: 'blood_pressure' },
              query: { metricType: 'blood_pressure', startDate, endDate },
            }),
            mobileApi.healthMetricsGetAlerts({ query: { page: 1, limit: 30 } }),
            mobileApi.careEnrollmentList({ query: { page: 1, limit: 20 } }),
          ]);

        if (meResult.status === 'fulfilled' && meResult.value) {
          const me = meResult.value as unknown as Record<string, unknown>;
          setPatientName(String(me.fullName || ''));
          setPatientCode(getObjectId(me).slice(-8).toUpperCase());
        }

        if (metricsResult.status === 'fulfilled') {
          const list = normalizePaginatedList<Record<string, unknown>>(metricsResult.value, 1, 100).items;
          setRawMetrics(list);
        }

        if (statsResult.status === 'fulfilled' && statsResult.value) {
          setBpStats(statsResult.value as unknown as Record<string, unknown>);
        } else {
          setBpStats(null);
        }

        if (alertsResult.status === 'fulfilled') {
          const list = normalizePaginatedList<Record<string, unknown>>(alertsResult.value, 1, 30).items;
          setRawAlerts(list);
        }

        if (
          metricsResult.status === 'rejected' &&
          enrollmentsResult.status === 'rejected'
        ) {
          setLoadError(extractApiErrorMessage(metricsResult.reason, 'mobile.reports_load_failed'));
        }

        if (enrollmentsResult.status === 'fulfilled') {
          const enrollments = normalizePaginatedList<FeTypes.CareEnrollmentListResponse['items'][number]>(
            enrollmentsResult.value,
            1,
            20
          ).items;
          const targetEnrollment =
            enrollments.find((e) => e.status === 'active') ?? enrollments[0] ?? null;

          if (targetEnrollment?.id) {
            const reportTypeQuery =
              timeRange === '7d'
                ? { reportType: 'weekly' as const }
                : timeRange === '30d'
                  ? { reportType: 'thirty_day' as const }
                  : {};
            const reportsList = await mobileApi.careReportList({
              params: { id: String(targetEnrollment.id) },
              query: reportTypeQuery,
            });
            const reports = Array.isArray(reportsList) ? reportsList : [];
            const firstId = reports[0] ? getObjectId(reports[0]) : '';
            if (firstId) {
              const reportDetail = await mobileApi.careReportGet({ params: { id: firstId } });
              setActiveReport(reportDetail);
              try {
                const summary = await mobileApi.careReportGenerateSummary({
                  params: { id: firstId },
                  body: { audience: 'patient' },
                });
                setSummaryRes(summary);
              } catch {
                setSummaryRes(null);
              }
            } else {
              setActiveReport(null);
              setSummaryRes(null);
            }
          } else {
            setActiveReport(null);
            setSummaryRes(null);
          }
        }
      } catch (err) {
        setLoadError(extractApiErrorMessage(err, 'mobile.reports_load_failed'));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [timeRange]
  );

  useEffect(() => {
    void loadReportsData();
  }, [loadReportsData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadReportsData({ silent: true });
  }, [loadReportsData]);

  const handleRegenerateAiSummary = async () => {
    const reportId = getObjectId(activeReport);
    if (!reportId || isRefreshingAi) return;
    setIsRefreshingAi(true);
    try {
      const summary = await mobileApi.careReportGenerateSummary({
        params: { id: reportId },
        body: { audience: 'patient' },
      });
      setSummaryRes(summary);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Thành công'),
        text2: t('mobile.ai_summary_updated', 'Đã cập nhật tóm tắt từ AI.'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.ai_summary_load_failed'),
      });
    } finally {
      setIsRefreshingAi(false);
    }
  };

  const filteredMetrics = useMemo(() => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return rawMetrics.filter((item) => {
      const ts = new Date(String(item.recordedAt ?? item.createdAt ?? '')).getTime();
      return !Number.isNaN(ts) ? ts >= cutoff : true;
    });
  }, [rawMetrics, timeRange]);

  const bpPoints = useMemo(() => {
    return filteredMetrics
      .filter((m) => (m.metricType || m.type) === 'blood_pressure')
      .map((m) => {
        const vals = (m.values || m.value || {}) as Record<string, unknown>;
        const sys = Number(vals.systolic ?? 0);
        const dia = Number(vals.diastolic ?? 0);
        const recorded = String(m.recordedAt ?? m.createdAt ?? '');
        const dateObj = new Date(recorded);
        const label = Number.isNaN(dateObj.getTime())
          ? '—'
          : dateObj.toLocaleDateString(dateLocale, { day: '2-digit', month: '2-digit' });
        return { sys, dia, label, ts: dateObj.getTime() || 0 };
      })
      .filter((p) => p.sys > 0 && p.dia > 0)
      .sort((a, b) => a.ts - b.ts)
      .slice(-10);
  }, [filteredMetrics, dateLocale]);

  const exportReadings: ExcelHealthReadingRow[] = useMemo(() => {
    return filteredMetrics.slice(0, 50).map((m) => {
      const mType = String(m.metricType ?? m.type ?? '');
      const vals = (m.values || m.value || {}) as Record<string, unknown>;
      const recorded = String(m.recordedAt ?? m.createdAt ?? '');
      const d = new Date(recorded);
      const time = Number.isNaN(d.getTime())
        ? recorded
        : d.toLocaleString(dateLocale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
      const isAlert = Boolean(m.isAlertTriggered || m.severity === 'critical' || m.severity === 'warning');
      return {
        time,
        systolic: mType === 'blood_pressure' ? Number(vals.systolic ?? 0) || null : null,
        diastolic: mType === 'blood_pressure' ? Number(vals.diastolic ?? 0) || null : null,
        glucose: mType === 'blood_sugar' ? Number(vals.glucose ?? vals.value ?? 0) || null : null,
        heartRate: mType === 'heart_rate' ? Number(vals.bpm ?? vals.heartRate ?? vals.value ?? 0) || null : null,
        assessment: isAlert
          ? t('mobile.eval_elevated', 'Cần chú ý')
          : t('mobile.eval_normal', 'Bình thường'),
        isWarning: isAlert,
      };
    });
  }, [filteredMetrics, dateLocale, t]);

  const exportAlerts: ExcelHealthAlertRow[] = useMemo(() => {
    return rawAlerts.slice(0, 20).map((a) => {
      const ts = String(a.detectedAt ?? a.recordedAt ?? a.createdAt ?? '');
      const d = new Date(ts);
      const time = Number.isNaN(d.getTime())
        ? ts || '—'
        : d.toLocaleString(dateLocale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          });
      const sev = String(a.severity || a.alertLevel || 'warning');
      const isHigh = sev === 'critical' || sev === 'urgent' || sev === 'high';
      return {
        time,
        severity: isHigh
          ? t('mobile.severity_urgent', 'Khẩn cấp')
          : t('mobile.severity_attention', 'Cần chú ý'),
        isHigh,
        description: String(a.alertMessage || a.title || a.metricType || t('mobile.alert_detected', 'Chỉ số vượt ngưỡng')),
        action: String(a.status || t('mobile.alert_recorded', 'Đã ghi nhận')),
      };
    });
  }, [rawAlerts, dateLocale, t]);

  const parsedSummary = useMemo(() => parseSummary(summaryRes), [summaryRes]);
  const maxBp = Math.max(160, ...bpPoints.map((p) => p.sys));
  const avgSys =
    typeof bpStats?.averageSystolic === 'number'
      ? Math.round(bpStats.averageSystolic)
      : bpPoints.length > 0
        ? Math.round(bpPoints.reduce((acc, p) => acc + p.sys, 0) / bpPoints.length)
        : null;
  const avgDia =
    typeof bpStats?.averageDiastolic === 'number'
      ? Math.round(bpStats.averageDiastolic)
      : bpPoints.length > 0
        ? Math.round(bpPoints.reduce((acc, p) => acc + p.dia, 0) / bpPoints.length)
        : null;

  const activeReportId = getObjectId(activeReport) || null;
  const reportStats = (activeReport?.statistics as Record<string, unknown> | undefined) ?? null;
  const reportTaskStats = (reportStats?.tasks as Record<string, unknown> | undefined) ?? null;

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View
        style={tw(
          'flex-row items-center px-6 pt-6 pb-4 border-b border-slate-200 dark:border-slate-800'
        )}
      >
        <TouchableOpacity
          onPress={() => router.back('/(patient)/health-metric')}
          style={tw('p-2 -ml-2 mr-2')}
        >
          <ArrowLeft color={twInstance.color('text-slate-900 dark:text-white')} size={24} />
        </TouchableOpacity>
        <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
          {t('mobile.health_reports', 'Báo cáo sức khỏe')}
        </Text>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-6 pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {/* Time Range Selector */}
        <View style={tw('flex-row bg-slate-200 dark:bg-slate-800 rounded-xl p-1 mb-6')}>
          {(['7d', '30d', '90d'] as const).map((range) => (
            <TouchableOpacity
              key={range}
              onPress={() => setTimeRange(range)}
              style={tw(
                `flex-1 py-2.5 px-1 items-center justify-center rounded-lg ${
                  timeRange === range ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                }`
              )}
            >
              <Text
                numberOfLines={1}
                adjustsFontSizeToFit={true}
                minimumFontScale={0.75}
                style={tw(
                  `font-semibold text-center ${
                    timeRange === range
                      ? 'text-slate-900 dark:text-white'
                      : 'text-slate-500 dark:text-slate-400'
                  }`
                )}
              >
                {range === '7d'
                  ? t('mobile.range_7d_short', '7\u00A0Ngày')
                  : range === '30d'
                    ? t('mobile.range_30d_short', '30\u00A0Ngày')
                    : t('mobile.range_90d_short', '90\u00A0Ngày')}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {loadError && !loading ? (
          <View
            style={tw(
              'bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800 mb-6'
            )}
          >
            <Text style={tw('text-xs font-semibold text-red-700 dark:text-red-300')}>
              {loadError}
            </Text>
            <TouchableOpacity
              onPress={() => void loadReportsData()}
              style={tw('mt-3 self-start bg-red-600 px-3.5 py-2 rounded-xl flex-row items-center')}
            >
              <RefreshCw size={14} color="#ffffff" />
              <Text style={tw('text-xs font-bold text-white ml-1.5')}>
                {t('mobile.retry', 'Thử lại')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}

        {/* Real Blood Pressure Trend Card */}
        <View
          style={tw(
            'bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm mb-6'
          )}
        >
          <View style={tw('flex-row justify-between items-center mb-4')}>
            <View style={tw('flex-row items-center gap-2')}>
              <Activity color={twInstance.color('text-emerald-500')} size={20} />
              <Text style={tw('font-bold text-slate-900 dark:text-white text-lg')}>
                {t('mobile.blood_pressure_trend', 'Xu hướng huyết áp')}
              </Text>
            </View>
            <LineChart color={twInstance.color('text-slate-400')} size={20} />
          </View>

          {loading ? (
            <Skeleton className="h-44 w-full rounded-2xl" />
          ) : bpPoints.length === 0 ? (
            <View
              style={tw(
                'h-40 bg-slate-50 dark:bg-slate-950 rounded-xl items-center justify-center border border-slate-100 dark:border-slate-800 px-4'
              )}
            >
              <Text style={tw('text-slate-500 dark:text-slate-400 font-medium text-center text-xs')}>
                {t(
                  'mobile.no_bp_trend_data',
                  'Chưa có bản ghi huyết áp nào trong khoảng thời gian này.'
                )}
              </Text>
            </View>
          ) : (
            <>
              <View style={tw('flex-row gap-2 mb-4')}>
                <View style={tw('flex-1 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl')}>
                  <Text style={tw('text-[10px] text-slate-500 dark:text-slate-400')}>
                    {t('mobile.avg_bp_label', 'Trung bình')}
                  </Text>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mt-0.5')}>
                    {avgSys && avgDia ? `${avgSys}/${avgDia} mmHg` : '—'}
                  </Text>
                </View>
                <View style={tw('flex-1 bg-slate-50 dark:bg-slate-800/70 p-2.5 rounded-xl')}>
                  <Text style={tw('text-[10px] text-slate-500 dark:text-slate-400')}>
                    {t('mobile.readings_count_label', 'Số lần đo')}
                  </Text>
                  <Text style={tw('text-sm font-bold text-emerald-600 dark:text-emerald-400 mt-0.5')}>
                    {bpPoints.length}
                  </Text>
                </View>
              </View>

              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View
                  style={tw(
                    'flex-row items-end gap-3 h-40 px-2 pt-4 pb-1 bg-slate-50 dark:bg-slate-950 rounded-xl border border-slate-100 dark:border-slate-800'
                  )}
                >
                  {bpPoints.map((pt, idx) => {
                    const sysHeight = Math.max(16, Math.round((pt.sys / maxBp) * 96));
                    const diaHeight = Math.max(12, Math.round((pt.dia / maxBp) * 96));
                    const isElevated = pt.sys >= 140 || pt.dia >= 90;
                    return (
                      <View key={idx} style={tw('items-center w-12')}>
                        <Text
                          style={tw(
                            `text-[10px] font-bold mb-1 ${
                              isElevated
                                ? 'text-amber-600 dark:text-amber-400'
                                : 'text-slate-700 dark:text-slate-300'
                            }`
                          )}
                        >
                          {pt.sys}/{pt.dia}
                        </Text>
                        <View style={tw('flex-row items-end gap-1')}>
                          <View
                            style={{
                              width: 10,
                              height: sysHeight,
                              borderRadius: 4,
                              backgroundColor: isElevated ? '#f59e0b' : '#10b981',
                            }}
                          />
                          <View
                            style={{
                              width: 10,
                              height: diaHeight,
                              borderRadius: 4,
                              backgroundColor: '#6366f1',
                            }}
                          />
                        </View>
                        <Text style={tw('text-[9px] text-slate-400 mt-1')}>{pt.label}</Text>
                      </View>
                    );
                  })}
                </View>
              </ScrollView>
            </>
          )}
        </View>

        {/* Care Report Task Adherence (when enrollment report exists) */}
        {reportTaskStats ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 mb-6 flex-row justify-between items-center'
            )}
          >
            <View>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                {t('mobile.care_report_adherence', 'Mức độ hoàn thành nhiệm vụ theo dõi')}
              </Text>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-0.5')}>
                {String(reportTaskStats.completed ?? 0)} / {String(reportTaskStats.expected ?? 0)}{' '}
                {t('mobile.tasks_unit', 'nhiệm vụ')}
              </Text>
            </View>
            <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-3 py-1.5 rounded-full')}>
              <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300')}>
                {typeof reportTaskStats.completionRate === 'number'
                  ? `${Math.round(
                      reportTaskStats.completionRate *
                        (reportTaskStats.completionRate <= 1 ? 100 : 1)
                    )}%`
                  : '—'}
              </Text>
            </View>
          </View>
        ) : null}

        {/* AI Summary Section */}
        <View
          style={tw(
            'bg-indigo-50 dark:bg-indigo-900/20 p-5 rounded-3xl border border-indigo-100 dark:border-indigo-800/50 shadow-sm'
          )}
        >
          <View style={tw('flex-row items-center justify-between mb-4')}>
            <View style={tw('flex-row items-center gap-2 flex-1 mr-2')}>
              <Sparkles
                color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                size={20}
              />
              <Text style={tw('font-bold text-indigo-900 dark:text-indigo-100 text-lg')}>
                {t('mobile.ai_health_summary', 'Tóm tắt sức khỏe AI')}
              </Text>
            </View>
            {activeReportId ? (
              <TouchableOpacity
                onPress={() => void handleRegenerateAiSummary()}
                disabled={isRefreshingAi}
                style={tw(
                  'bg-indigo-100 dark:bg-indigo-800/60 px-3 py-1.5 rounded-full flex-row items-center'
                )}
              >
                {isRefreshingAi ? (
                  <ActivityIndicator size="small" color={twInstance.color('text-indigo-600')} />
                ) : (
                  <RefreshCw
                    size={13}
                    color={twInstance.color('text-indigo-700 dark:text-indigo-300')}
                  />
                )}
                <Text style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-200 ml-1')}>
                  {t('mobile.refresh', 'Làm mới')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>

          {loading ? (
            <View style={tw('gap-3 py-2')}>
              <Skeleton className="h-20 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </View>
          ) : parsedSummary ? (
            <View>
              <Text style={tw('text-slate-700 dark:text-slate-300 leading-6 mb-5')}>
                {parsedSummary.overview}
              </Text>

              <AiSummaryAccordion
                title={t('mobile.ai_observations', 'Nhận xét nổi bật')}
                content={parsedSummary.observations.join('\n• ')}
                isEmpty={parsedSummary.observations.length === 0}
              />
              <AiSummaryAccordion
                title={t('mobile.ai_missing_data', 'Dữ liệu còn thiếu')}
                content={parsedSummary.missingData.join('\n• ')}
                isEmpty={parsedSummary.missingData.length === 0}
              />
              <AiSummaryAccordion
                title={t('mobile.ai_alerts_to_mention', 'Cảnh báo cần lưu ý')}
                content={parsedSummary.alertsToMention.join('\n• ')}
                isEmpty={parsedSummary.alertsToMention.length === 0}
              />
              <AiSummaryAccordion
                title={t('mobile.ai_questions_for_doctor', 'Câu hỏi gợi ý cho bác sĩ')}
                content={parsedSummary.questionsForDoctor.join('\n• ')}
                isEmpty={parsedSummary.questionsForDoctor.length === 0}
              />

              <View
                style={tw(
                  'bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-200 dark:border-amber-800/50 flex-row mt-2 mb-5'
                )}
              >
                <AlertTriangle
                  color={twInstance.color('text-amber-500')}
                  size={20}
                  style={tw('mr-3 mt-0.5')}
                />
                <Text style={tw('text-amber-800 dark:text-amber-200 text-sm flex-1 leading-5')}>
                  {parsedSummary.disclaimer ||
                    t(
                      'mobile.ai_disclaimer',
                      'Phân tích do AI hỗ trợ mang tính tham khảo và không thay thế tư vấn y tế chuyên môn.'
                    )}
                </Text>
              </View>
            </View>
          ) : (
            <View
              style={tw(
                'bg-white/80 dark:bg-slate-900/70 p-4 rounded-2xl border border-indigo-100 dark:border-indigo-800/40 mb-5'
              )}
            >
              <Text style={tw('text-sm text-slate-600 dark:text-slate-300 leading-5')}>
                {t(
                  'mobile.no_care_summary_available',
                  'Chưa có báo cáo chăm sóc định kỳ cho khoảng thời gian này. Bạn vẫn có thể xuất dữ liệu chỉ số sức khỏe thực tế của mình bên dưới.'
                )}
              </Text>
            </View>
          )}

          <TouchableOpacity
            onPress={() => setExportModalVisible(true)}
            style={tw(
              'flex-row items-center justify-center gap-2 bg-emerald-100 dark:bg-emerald-900/40 px-4 py-3.5 rounded-xl active:opacity-80'
            )}
          >
            <FileSpreadsheet
              color={twInstance.color('text-emerald-600 dark:text-emerald-400')}
              size={18}
            />
            <Text style={tw('text-emerald-700 dark:text-emerald-300 font-bold')}>
              {t('mobile.export_excel_report', 'Xuất báo cáo sức khỏe')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>

      <ReportExportModal
        visible={exportModalVisible}
        onClose={() => setExportModalVisible(false)}
        defaultTimeRange={timeRange}
        reportId={activeReportId}
        patientName={patientName}
        patientCode={patientCode}
        aiSummaryText={parsedSummary?.overview}
        readings={exportReadings}
        alerts={exportAlerts}
      />
    </SafeAreaView>
  );
}
