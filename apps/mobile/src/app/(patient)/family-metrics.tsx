import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SafeAreaView } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Lock,
  RefreshCw,
} from 'lucide-react-native';
import { resolveApiError } from '@healthcare/api-client';
import { mobileApi, type FeTypes } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeContext } from '@/context/ThemeContext';
import { extractApiErrorMessage } from '@/utils/apiError';
import { DEFAULT_METRIC_UNIT, formatHealthMetricUnit } from '@/utils/healthMetricUnit';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';

interface MetricMeta {
  type: FeTypes.FamilySharedMetricType;
  labelKey: string;
  unit: string;
}

const ALL_METRICS: MetricMeta[] = [
  { type: 'blood_pressure', labelKey: 'mobile.metric_blood_pressure', unit: DEFAULT_METRIC_UNIT.blood_pressure },
  { type: 'heart_rate', labelKey: 'mobile.metric_heart_rate', unit: DEFAULT_METRIC_UNIT.heart_rate },
  { type: 'blood_glucose', labelKey: 'mobile.metric_blood_glucose', unit: DEFAULT_METRIC_UNIT.blood_glucose },
  { type: 'oxygen_saturation', labelKey: 'mobile.metric_oxygen_saturation', unit: DEFAULT_METRIC_UNIT.oxygen_saturation },
  { type: 'body_temperature', labelKey: 'mobile.metric_body_temperature', unit: DEFAULT_METRIC_UNIT.body_temperature },
  { type: 'respiratory_rate', labelKey: 'mobile.metric_respiratory_rate', unit: DEFAULT_METRIC_UNIT.respiratory_rate },
  { type: 'bmi', labelKey: 'mobile.metric_bmi', unit: DEFAULT_METRIC_UNIT.bmi },
  { type: 'weight', labelKey: 'mobile.metric_weight', unit: DEFAULT_METRIC_UNIT.weight },
  { type: 'height', labelKey: 'mobile.metric_height', unit: DEFAULT_METRIC_UNIT.height },
  { type: 'water_intake', labelKey: 'mobile.metric_water_intake', unit: DEFAULT_METRIC_UNIT.water_intake },
  { type: 'kcal_intake', labelKey: 'mobile.metric_kcal_intake', unit: DEFAULT_METRIC_UNIT.kcal_intake },
];

const PERIODS: FeTypes.FamilyHealthMetricPeriod[] = [
  'week',
  'month',
  'quarter',
  'year',
  'all',
  'custom',
];

function getTodayVietnamDateStr(): string {
  // Asia/Ho_Chi_Minh is always UTC+7 without DST
  const vnNow = new Date(Date.now() + 7 * 60 * 60 * 1000);
  const y = vnNow.getUTCFullYear();
  const m = String(vnNow.getUTCMonth() + 1).padStart(2, '0');
  const d = String(vnNow.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function addDaysYmd(ymd: string, deltaDays: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + deltaDays);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(dt.getUTCDate()).padStart(2, '0')}`;
}

function addMonthsYmd(ymd: string, deltaMonths: number): string {
  const [y, m, d] = ymd.split('-').map(Number);
  const dt = new Date(Date.UTC(y ?? 2026, (m ?? 1) - 1 + deltaMonths, 1));
  const maxDay = new Date(Date.UTC(dt.getUTCFullYear(), dt.getUTCMonth() + 1, 0)).getUTCDate();
  const clampedDay = Math.min(d ?? 1, maxDay);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, '0')}-${String(clampedDay).padStart(2, '0')}`;
}

function formatMetricPointValue(point: FeTypes.FamilyHealthMetricPoint): string {
  const v = point.values ?? {};
  if (point.metricType === 'blood_pressure') {
    const sys = v.systolic ?? v.sys ?? Object.values(v)[0];
    const dia = v.diastolic ?? v.dia ?? Object.values(v)[1];
    if (typeof sys === 'number' && typeof dia === 'number') {
      return `${sys}/${dia}`;
    }
  }
  const firstNum = Object.values(v).find((item) => typeof item === 'number' && Number.isFinite(item));
  return typeof firstNum === 'number' ? String(Math.round(firstNum * 10) / 10) : '—';
}

function primaryNumericValue(point: FeTypes.FamilyHealthMetricPoint): number {
  const v = point.values ?? {};
  if (point.metricType === 'blood_pressure') {
    const sys = v.systolic ?? v.sys;
    if (typeof sys === 'number' && Number.isFinite(sys)) return sys;
  }
  const first = Object.values(v).find((item) => typeof item === 'number' && Number.isFinite(item));
  return typeof first === 'number' ? first : 0;
}

export default function FamilyMetricsScreen() {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{
    linkId?: string;
    relationship?: string;
    patientId?: string;
    patientName?: string;
    patientEmail?: string;
  }>();
  const linkId = typeof params.linkId === 'string' ? params.linkId.trim() : '';
  const dateLocale = t('mobile.date_locale', 'vi-VN');
  const [resolvedPatientName, setResolvedPatientName] = useState<string>(() =>
    typeof params.patientName === 'string' ? params.patientName.trim() : '',
  );
  const [resolvedPatientEmail, setResolvedPatientEmail] = useState<string>(() =>
    typeof params.patientEmail === 'string' ? params.patientEmail.trim() : '',
  );

  useEffect(() => {
    if (typeof params.patientName === 'string' && params.patientName.trim()) {
      setResolvedPatientName(params.patientName.trim());
    }
    if (typeof params.patientEmail === 'string' && params.patientEmail.trim()) {
      setResolvedPatientEmail(params.patientEmail.trim());
    }
  }, [params.patientName, params.patientEmail]);

  useEffect(() => {
    if (resolvedPatientName || !linkId) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await mobileApi.familyLinksGet({ params: { id: linkId } });
        if (cancelled) return;
        const cp = res?.data?.counterparty;
        if (cp?.fullName) setResolvedPatientName(cp.fullName);
        if (cp?.email) setResolvedPatientEmail(cp.email);
      } catch {
        // Non-blocking fallback when opened directly
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [linkId, resolvedPatientName]);

  const todayVn = useMemo(() => getTodayVietnamDateStr(), []);

  const [selectedMetric, setSelectedMetric] =
    useState<FeTypes.FamilySharedMetricType>('blood_pressure');
  const [period, setPeriod] = useState<FeTypes.FamilyHealthMetricPeriod>('week');
  const [anchor, setAnchor] = useState<string>(todayVn);
  const [customFromDate, setCustomFromDate] = useState<string>(() => addDaysYmd(todayVn, -14));
  const [customToDate, setCustomToDate] = useState<string>(todayVn);
  const [pickerMode, setPickerMode] = useState<'from' | 'to' | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [linkStatus, setLinkStatus] = useState<string>('active');
  const [sharing, setSharing] =
    useState<FeTypes.FamilyHealthMetricSharingResponse['data']['sharing']>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [summary, setSummary] =
    useState<FeTypes.FamilyHealthMetricSummaryResponse['data'] | null>(null);
  const [trendItems, setTrendItems] = useState<FeTypes.FamilyHealthMetricPoint[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [windowMeta, setWindowMeta] = useState<FeTypes.FamilyHealthMetricWindow | null>(null);

  const requestSeqRef = useRef(0);
  const resyncGuardRef = useRef(false);
  const loadMoreLockRef = useRef(false);

  const buildQueryParams = useCallback(
    (cursor?: string): FeTypes.FamilyHealthMetricQuery => {
      const base: FeTypes.FamilyHealthMetricQuery = {
        metricType: selectedMetric,
        period,
        limit: 20,
        ...(cursor ? { cursor } : {}),
      };
      if (period === 'all') {
        return base;
      }
      if (period === 'custom') {
        const fromYmd = customFromDate <= customToDate ? customFromDate : customToDate;
        const toYmd = customToDate >= customFromDate ? customToDate : customFromDate;
        const fromIso = new Date(`${fromYmd}T00:00:00+07:00`).toISOString();
        const toExclusiveYmd = addDaysYmd(toYmd, 1);
        const toIso = new Date(`${toExclusiveYmd}T00:00:00+07:00`).toISOString();
        return { ...base, from: fromIso, to: toIso };
      }
      const safeAnchor = anchor > todayVn ? todayVn : anchor;
      return { ...base, anchor: safeAnchor };
    },
    [anchor, customFromDate, customToDate, period, selectedMetric, todayVn],
  );

  const loadSharingAndMetrics = useCallback(
    async (silent = false) => {
      const seq = ++requestSeqRef.current;
      if (!silent) setLoading(true);
      setErrorMsg(null);

      if (!linkId) {
        setLoading(false);
        setRefreshing(false);
        setErrorMsg(t('mobile.family_metrics_invalid_link'));
        return;
      }

      try {
        const sharingRes = await mobileApi.familyLinksGetHealthMetricSharing({
          params: { id: linkId },
        });
        if (seq !== requestSeqRef.current) return;

        const nextStatus = sharingRes?.data?.linkStatus ?? 'unknown';
        const nextSharing = sharingRes?.data?.sharing ?? null;
        setLinkStatus(nextStatus);
        setSharing(nextSharing);

        // State 2: Non-active family link
        if (nextStatus !== 'active') {
          setSummary(null);
          setTrendItems([]);
          setNextCursor(null);
          setWindowMeta(null);
          return;
        }

        // State 3: Owner has not enabled metric sharing
        if (!nextSharing) {
          setSummary(null);
          setTrendItems([]);
          setNextCursor(null);
          setWindowMeta(null);
          return;
        }

        // State 4: Restrict to permitted metrics if scope === 'selected'
        if (nextSharing.scope === 'selected') {
          if (nextSharing.metricTypes.length === 0) {
            setSummary(null);
            setTrendItems([]);
            setNextCursor(null);
            setWindowMeta(null);
            return;
          }
          if (!nextSharing.metricTypes.includes(selectedMetric)) {
            setSelectedMetric(nextSharing.metricTypes[0]);
            return;
          }
        }

        // State 6: Fetch summary & trend with coherent window params
        const query = buildQueryParams();
        const [summaryRes, trendRes] = await Promise.all([
          mobileApi.familyLinksReadHealthMetricSummary({
            params: { id: linkId },
            query,
          }),
          mobileApi.familyLinksReadHealthMetricTrend({
            params: { id: linkId },
            query,
          }),
        ]);
        if (seq !== requestSeqRef.current) return;

        setSummary(summaryRes?.data ?? null);
        setTrendItems(Array.isArray(trendRes?.data?.items) ? trendRes.data.items : []);
        setNextCursor(trendRes?.data?.nextCursor ?? null);
        setWindowMeta(trendRes?.data?.window ?? summaryRes?.data?.window ?? null);
        resyncGuardRef.current = false;
      } catch (err) {
        if (seq !== requestSeqRef.current) return;
        const resolved = resolveApiError(err);
        if (resolved?.key === 'FAMILY_HEALTH_SHARING_CHANGED' && !resyncGuardRef.current) {
          resyncGuardRef.current = true;
          Toast.show({
            type: 'info',
            text1: t('mobile.family_metrics_sharing_changed_title'),
            text2: extractApiErrorMessage(err),
          });
          void loadSharingAndMetrics(true);
          return;
        }
        setErrorMsg(extractApiErrorMessage(err, 'mobile.family_metrics_load_failed'));
        setSummary(null);
        setTrendItems([]);
        setNextCursor(null);
      } finally {
        if (seq === requestSeqRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [buildQueryParams, linkId, selectedMetric, t],
  );

  useEffect(() => {
    void loadSharingAndMetrics(false);
  }, [loadSharingAndMetrics]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadSharingAndMetrics(true);
  }, [loadSharingAndMetrics]);

  const handleLoadMore = async () => {
    if (!nextCursor || loadingMore || loadMoreLockRef.current || !linkId) return;
    const seq = requestSeqRef.current;
    loadMoreLockRef.current = true;
    setLoadingMore(true);
    try {
      const res = await mobileApi.familyLinksReadHealthMetricTrend({
        params: { id: linkId },
        query: buildQueryParams(nextCursor),
      });
      if (seq !== requestSeqRef.current) return;
      const more = Array.isArray(res?.data?.items) ? res.data.items : [];
      setTrendItems((prev) => [...prev, ...more]);
      setNextCursor(res?.data?.nextCursor ?? null);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      loadMoreLockRef.current = false;
      setLoadingMore(false);
    }
  };

  const stepAnchor = (direction: -1 | 1) => {
    let next = anchor;
    if (period === 'week') next = addDaysYmd(anchor, direction * 7);
    else if (period === 'month') next = addMonthsYmd(anchor, direction);
    else if (period === 'quarter') next = addMonthsYmd(anchor, direction * 3);
    else if (period === 'year') next = addMonthsYmd(anchor, direction * 12);
    if (next > todayVn) next = todayVn;
    setAnchor(next);
  };

  const canStepForward = useMemo(() => {
    if (period === 'all' || period === 'custom') return false;
    return anchor < todayVn;
  }, [anchor, period, todayVn]);

  const activeMetricMeta = useMemo(
    () => ALL_METRICS.find((m) => m.type === selectedMetric) ?? ALL_METRICS[0],
    [selectedMetric],
  );
  const activeDisplayUnit = useMemo(
    () =>
      formatHealthMetricUnit(
        summary?.latest?.unit || trendItems[0]?.unit || activeMetricMeta.unit,
        t,
        selectedMetric,
      ),
    [activeMetricMeta.unit, selectedMetric, summary?.latest?.unit, t, trendItems],
  );

  const permittedSet = useMemo(() => {
    if (!sharing) return null;
    if (sharing.scope === 'all') return null;
    return new Set(sharing.metricTypes);
  }, [sharing]);

  const chartPoints = useMemo(() => {
    const slice = [...trendItems].slice(0, 14).reverse();
    const nums = slice.map((p) => primaryNumericValue(p));
    const maxVal = Math.max(1, ...nums);
    return slice.map((p) => ({
      point: p,
      num: primaryNumericValue(p),
      ratio: Math.max(0.12, primaryNumericValue(p) / maxVal),
    }));
  }, [trendItems]);

  const formatWindowLabel = () => {
    if (!windowMeta) return '';
    if (windowMeta.period === 'all') return t('mobile.period_all');
    if (!windowMeta.from || !windowMeta.to) return '';
    const fromD = new Date(windowMeta.from);
    const toD = new Date(new Date(windowMeta.to).getTime() - 1);
    return `${fromD.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'short',
      timeZone: 'Asia/Ho_Chi_Minh',
    })} – ${toD.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      timeZone: 'Asia/Ho_Chi_Minh',
    })}`;
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      {/* Header */}
      <View
        style={tw(
          'px-5 pt-4 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800',
        )}
      >
        <View style={tw('flex-row items-center')}>
          <TouchableOpacity
            onPress={() => router.back('/(patient)/family')}
            style={tw(
              'w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mr-3',
            )}
          >
            <ArrowLeft color={twInstance.color('text-slate-700 dark:text-slate-200')} size={20} />
          </TouchableOpacity>
          <View style={tw('flex-1 min-w-0')}>
            <Text numberOfLines={1} style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
              {resolvedPatientName || t('mobile.family_metrics_title')}
            </Text>
            {resolvedPatientName && resolvedPatientEmail ? (
              <Text numberOfLines={1} style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                {resolvedPatientEmail}
              </Text>
            ) : null}
            <Text numberOfLines={1} style={tw('text-xs text-slate-500 dark:text-slate-400')}>
              {params.relationship
                ? `${t(`mobile.rel_${params.relationship}`, params.relationship)} • `
                : ''}
              {formatWindowLabel() || t('mobile.family_metrics_subtitle')}
            </Text>
          </View>
        </View>

        {/* Metric Type Horizontal Picker */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw('gap-2 pt-3.5')}
        >
          {ALL_METRICS.map((m) => {
            const isAllowed = !permittedSet || permittedSet.has(m.type);
            const active = selectedMetric === m.type;
            return (
              <TouchableOpacity
                key={m.type}
                disabled={!isAllowed}
                onPress={() => setSelectedMetric(m.type)}
                style={tw(
                  `px-3.5 py-2 rounded-full border flex-row items-center ${
                    active
                      ? 'bg-emerald-600 border-emerald-600'
                      : isAllowed
                        ? 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                        : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 opacity-45'
                  }`,
                )}
              >
                {!isAllowed ? <Lock size={11} color="#94a3b8" style={tw('mr-1')} /> : null}
                <Text
                  style={tw(
                    `text-xs font-bold ${
                      active ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                    }`,
                  )}
                >
                  {t(m.labelKey, m.type)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Period Selector */}
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={tw('gap-1.5 pt-2.5')}
        >
          {PERIODS.map((p) => {
            const active = period === p;
            return (
              <TouchableOpacity
                key={p}
                onPress={() => setPeriod(p)}
                style={tw(
                  `px-3 py-1.5 rounded-xl ${
                    active
                      ? 'bg-slate-900 dark:bg-brand'
                      : 'bg-slate-100 dark:bg-slate-800'
                  }`,
                )}
              >
                <Text
                  style={tw(
                    `text-[11px] font-bold ${
                      active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                    }`,
                  )}
                >
                  {t(`mobile.period_${p}`, p)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>

        {/* Anchor or Custom Date Controls */}
        {period !== 'all' && period !== 'custom' ? (
          <View
            style={tw(
              'flex-row items-center justify-between mt-3 bg-slate-50 dark:bg-slate-950 rounded-xl px-3 py-2 border border-slate-200 dark:border-slate-800',
            )}
          >
            <TouchableOpacity onPress={() => stepAnchor(-1)} style={tw('p-1.5')}>
              <ChevronLeft size={18} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
            </TouchableOpacity>
            <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}>
              {formatWindowLabel() || anchor}
            </Text>
            <TouchableOpacity
              disabled={!canStepForward}
              onPress={() => stepAnchor(1)}
              style={tw(`p-1.5 ${!canStepForward ? 'opacity-30' : ''}`)}
            >
              <ChevronRight size={18} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
            </TouchableOpacity>
          </View>
        ) : period === 'custom' ? (
          <View style={tw('flex-row gap-2 mt-3')}>
            <TouchableOpacity
              onPress={() => setPickerMode('from')}
              style={tw(
                'flex-1 flex-row items-center justify-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3',
              )}
            >
              <Calendar size={14} color="#6366f1" />
              <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200 ml-1.5')}>
                {customFromDate}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={() => setPickerMode('to')}
              style={tw(
                'flex-1 flex-row items-center justify-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl py-2 px-3',
              )}
            >
              <Calendar size={14} color="#6366f1" />
              <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200 ml-1.5')}>
                {customToDate}
              </Text>
            </TouchableOpacity>
          </View>
        ) : null}
      </View>

      <ScrollView
        contentContainerStyle={tw('p-5 pb-24 gap-4')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {loading ? (
          <View style={tw('gap-3')}>
            <View style={tw('flex-row gap-3')}>
              <Skeleton className="h-24 flex-1 rounded-2xl" />
              <Skeleton className="h-24 flex-1 rounded-2xl" />
            </View>
            <Skeleton className="h-44 w-full rounded-2xl" />
            <Skeleton className="h-20 w-full rounded-2xl" />
          </View>
        ) : errorMsg ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-3xl p-6 border border-rose-200 dark:border-rose-900/40 items-center',
            )}
          >
            <AlertCircle color="#ef4444" size={34} />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
              {t('mobile.family_metrics_load_failed')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center leading-5')}>
              {errorMsg}
            </Text>
            <TouchableOpacity
              onPress={() => void loadSharingAndMetrics(false)}
              style={tw('mt-4 bg-brand px-5 py-2.5 rounded-full flex-row items-center')}
            >
              <RefreshCw size={14} color="#0f172a" />
              <Text style={tw('text-slate-900 font-bold text-xs ml-1.5')}>
                {t('mobile.retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : linkStatus !== 'active' ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-3xl p-6 border border-amber-200 dark:border-amber-800/50 items-center',
            )}
          >
            <Lock size={34} color="#d97706" />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
              {t('mobile.family_metrics_link_inactive_title')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center leading-5')}>
              {t('mobile.family_metrics_link_inactive_desc', {
                status: t(`mobile.family_status_${linkStatus}`, linkStatus),
              })}
            </Text>
          </View>
        ) : !sharing ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 items-center',
            )}
          >
            <Lock size={34} color="#64748b" />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
              {t('mobile.family_metrics_not_shared_title')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center leading-5')}>
              {t('mobile.family_metrics_not_shared_desc')}
            </Text>
          </View>
        ) : summary && summary.count === 0 && trendItems.length === 0 ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 items-center',
            )}
          >
            <Activity size={34} color={isDark ? '#34d399' : '#10b981'} />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
              {t('mobile.family_metrics_empty_window_title')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center leading-5')}>
              {t('mobile.family_metrics_empty_window_desc')}
            </Text>
          </View>
        ) : (
          <>
            {/* Summary KPI Grid */}
            {summary ? (
              <View style={tw('flex-row flex-wrap gap-3')}>
                <View
                  style={tw(
                    'w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800',
                  )}
                >
                  <Text style={tw('text-[11px] text-slate-400 font-bold uppercase')}>
                    {t('mobile.family_metric_latest')}
                  </Text>
                  <Text style={tw('text-xl font-black text-emerald-600 dark:text-emerald-400 mt-1')}>
                    {summary.latest ? formatMetricPointValue(summary.latest) : '—'}{' '}
                    <Text style={tw('text-xs font-semibold text-slate-400')}>
                      {activeDisplayUnit}
                    </Text>
                  </Text>
                </View>

                <View
                  style={tw(
                    'w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800',
                  )}
                >
                  <Text style={tw('text-[11px] text-slate-400 font-bold uppercase')}>
                    {t('mobile.family_metric_average')}
                  </Text>
                  <Text style={tw('text-xl font-black text-slate-900 dark:text-white mt-1')}>
                    {Math.round(summary.average * 10) / 10}{' '}
                    <Text style={tw('text-xs font-semibold text-slate-400')}>
                      {activeDisplayUnit}
                    </Text>
                  </Text>
                </View>

                <View
                  style={tw(
                    'w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800',
                  )}
                >
                  <Text style={tw('text-[11px] text-slate-400 font-bold uppercase')}>
                    {t('mobile.family_metric_min_max')}
                  </Text>
                  <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-1')}>
                    {Math.round(summary.minimum * 10) / 10} –{' '}
                    {Math.round(summary.maximum * 10) / 10}
                  </Text>
                </View>

                <View
                  style={tw(
                    'w-[48%] bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800',
                  )}
                >
                  <Text style={tw('text-[11px] text-slate-400 font-bold uppercase')}>
                    {t('mobile.family_metric_readings_count')}
                  </Text>
                  <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-1')}>
                    {summary.count}
                  </Text>
                </View>
              </View>
            ) : null}

            {/* Trend Bar Visualization */}
            {chartPoints.length > 0 ? (
              <View
                style={tw(
                  'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800',
                )}
              >
                <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-3')}>
                  {t('mobile.family_metrics_trend_chart_title')}
                </Text>
                <View style={tw('flex-row items-end justify-between h-32 gap-1.5 pt-2')}>
                  {chartPoints.map(({ point, ratio }, idx) => (
                    <View key={`${point.recordedAt}-${idx}`} style={tw('flex-1 items-center h-full justify-end')}>
                      <Text
                        numberOfLines={1}
                        style={tw('text-[9px] text-slate-500 dark:text-slate-400 mb-1')}
                      >
                        {formatMetricPointValue(point)}
                      </Text>
                      <View
                        style={[
                          tw('w-full max-w-[18px] rounded-t-md bg-emerald-500 dark:bg-emerald-400'),
                          { height: `${Math.round(ratio * 72)}%` },
                        ]}
                      />
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {/* Chronological History + Cursor Load More */}
            <View
              style={tw(
                'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 gap-3',
              )}
            >
              <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400')}>
                {t('mobile.family_metrics_history_title')}
              </Text>
              {trendItems.map((pt, idx) => (
                <View
                  key={`${pt.recordedAt}-${idx}`}
                  style={tw(
                    'flex-row items-center justify-between py-2.5 border-b border-slate-100 dark:border-slate-800',
                  )}
                >
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {new Date(pt.recordedAt).toLocaleString(dateLocale, {
                      day: '2-digit',
                      month: 'short',
                      hour: '2-digit',
                      minute: '2-digit',
                      timeZone: 'Asia/Ho_Chi_Minh',
                    })}
                  </Text>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {formatMetricPointValue(pt)}{' '}
                    {formatHealthMetricUnit(
                      pt.unit || activeMetricMeta.unit,
                      t,
                      pt.metricType || selectedMetric,
                    )}
                  </Text>
                </View>
              ))}

              {nextCursor ? (
                <TouchableOpacity
                  disabled={loadingMore}
                  onPress={() => void handleLoadMore()}
                  style={tw(
                    'mt-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center',
                  )}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#10b981" />
                  ) : (
                    <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                      {t('mobile.load_more')}
                    </Text>
                  )}
                </TouchableOpacity>
              ) : null}
            </View>
          </>
        )}
      </ScrollView>

      {pickerMode ? (
        <DateTimePicker
          value={
            new Date(
              `${pickerMode === 'from' ? customFromDate : customToDate}T12:00:00+07:00`,
            )
          }
          mode="date"
          maximumDate={new Date(`${todayVn}T23:59:59+07:00`)}
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(event, date) => {
            const currentMode = pickerMode;
            setPickerMode(null);
            if (date && event.type !== 'dismissed') {
              const ymd = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const safe = ymd > todayVn ? todayVn : ymd;
              if (currentMode === 'from') setCustomFromDate(safe);
              else setCustomToDate(safe);
            }
          }}
        />
      ) : null}
    </SafeAreaView>
  );
}

