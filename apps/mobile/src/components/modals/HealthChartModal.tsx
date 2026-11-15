import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, LineChart, Activity, Heart, Droplet, AlertCircle, RefreshCw } from 'lucide-react-native';
import { mobileApi, type FeTypes } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

interface HealthChartModalProps {
  visible: boolean;
  onClose: () => void;
  patientId?: string;
  patientName?: string;
}

interface ChartPoint {
  label: string;
  primary: number;
  secondary?: number;
  alert: boolean;
  day: string;
}

export const HealthChartModal: React.FC<HealthChartModalProps> = ({
  visible,
  onClose,
  patientId,
  patientName,
}) => {
  const { t, i18n } = useTranslation();
  useThemeContext();
  const [activeMetric, setActiveMetric] = useState<'bp' | 'glucose' | 'heartRate'>('bp');
  const [points, setPoints] = useState<ChartPoint[]>([]);
  const [avgLabel, setAvgLabel] = useState('—');
  const [peakLabel, setPeakLabel] = useState('—');
  const [alertsCount, setAlertsCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const metricType =
    activeMetric === 'bp'
      ? 'blood_pressure'
      : activeMetric === 'glucose'
        ? 'blood_glucose'
        : 'heart_rate';

  const loadChartData = useCallback(async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const [listRes, statsRes] = await Promise.allSettled([
        mobileApi.healthMetricsFindAll({
          query: {
            patientId,
            metricType,
            limit: 14,
            sortBy: 'recordedAt',
            sortOrder: -1,
          },
        }),
        mobileApi.healthMetricsGetStatistics({
          params: { type: metricType },
          query: { patientId, limit: 30 },
        }),
      ]);

      if (listRes.status === 'rejected' && statsRes.status === 'rejected') {
        throw listRes.reason;
      }

      const rawItems =
        listRes.status === 'fulfilled'
          ? (listRes.value as FeTypes.HealthMetricsFindAllResponse).data ?? []
          : [];
      const locale = i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US';

      const mapped: ChartPoint[] = [...rawItems]
        .slice(0, 7)
        .reverse()
        .map((item) => {
          const vals = (item.values ?? {}) as Record<string, { value?: number }>;
          const dt = new Date(item.recordedAt);
          const day = !Number.isNaN(dt.getTime())
            ? dt.toLocaleDateString(locale, { weekday: 'short' })
            : '';
          if (metricType === 'blood_pressure') {
            const sys = Number(vals.systolic?.value ?? 0);
            const dia = Number(vals.diastolic?.value ?? 0);
            return {
              label: `${Math.round(sys)}/${Math.round(dia)}`,
              primary: sys,
              secondary: dia,
              alert: sys >= 140 || dia >= 90 || (item.validationReasonCodes?.length ?? 0) > 0,
              day,
            };
          }
          const v = Number(vals.value?.value ?? vals.amount?.value ?? 0);
          const isElevated =
            metricType === 'blood_glucose'
              ? v < 70 || v > 140
              : v < 50 || v > 100;
          return {
            label: `${Math.round(v)}`,
            primary: v,
            alert: isElevated || (item.validationReasonCodes?.length ?? 0) > 0,
            day,
          };
        });

      setPoints(mapped);
      setAlertsCount(mapped.filter((p) => p.alert).length);

      const statsData =
        statsRes.status === 'fulfilled'
          ? (statsRes.value as FeTypes.HealthMetricsGetStatisticsResponse).data
          : null;

      if (metricType === 'blood_pressure') {
        if (mapped.length > 0) {
          const sysAvg = mapped.reduce((acc, p) => acc + p.primary, 0) / mapped.length;
          const diaAvg =
            mapped.reduce((acc, p) => acc + (p.secondary ?? 0), 0) / mapped.length;
          const sysMax = Math.max(...mapped.map((p) => p.primary));
          const diaMax = Math.max(...mapped.map((p) => p.secondary ?? 0));
          setAvgLabel(`${Math.round(sysAvg)}/${Math.round(diaAvg)} mmHg`);
          setPeakLabel(`${Math.round(sysMax)}/${Math.round(diaMax)} mmHg`);
        } else {
          setAvgLabel('—');
          setPeakLabel('—');
        }
      } else {
        const unit = metricType === 'blood_glucose' ? 'mg/dL' : 'bpm';
        const computedAvg =
          mapped.length > 0
            ? mapped.reduce((acc, p) => acc + p.primary, 0) / mapped.length
            : undefined;
        const computedMax =
          mapped.length > 0 ? Math.max(...mapped.map((p) => p.primary)) : undefined;
        const avgVal = statsData?.average ?? computedAvg;
        const peakVal = statsData?.maximum ?? computedMax;
        setAvgLabel(avgVal !== undefined ? `${Math.round(avgVal)} ${unit}` : '—');
        setPeakLabel(peakVal !== undefined ? `${Math.round(peakVal)} ${unit}` : '—');
      }
    } catch (err) {
      setLoadError(extractApiErrorMessage(err, 'mobile.load_chart_failed'));
    } finally {
      setIsLoading(false);
    }
  }, [patientId, metricType, i18n.language]);

  useEffect(() => {
    if (visible) {
      void loadChartData();
    }
  }, [visible, loadChartData]);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <LineChart color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {t('mobile.health_chart', 'Health Vital Chart')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')} numberOfLines={1}>
                  {patientName
                    ? `${patientName} • ${t('mobile.recent_readings', 'Recent Readings')}`
                    : t('mobile.recent_readings', 'Recent Readings')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl')}>
              <TouchableOpacity
                onPress={() => setActiveMetric('bp')}
                style={tw(`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${activeMetric === 'bp' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              >
                <Activity color={activeMetric === 'bp' ? '#ef4444' : '#94a3b8'} size={16} style={tw('mr-1.5')} />
                <Text style={tw(`text-xs font-bold ${activeMetric === 'bp' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`)}>
                  {t('mobile.blood_pressure', 'Blood Pressure')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveMetric('glucose')}
                style={tw(`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${activeMetric === 'glucose' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              >
                <Droplet color={activeMetric === 'glucose' ? '#3b82f6' : '#94a3b8'} size={16} style={tw('mr-1.5')} />
                <Text style={tw(`text-xs font-bold ${activeMetric === 'glucose' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`)}>
                  {t('mobile.blood_sugar', 'Glucose')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setActiveMetric('heartRate')}
                style={tw(`flex-1 py-2.5 rounded-xl items-center flex-row justify-center ${activeMetric === 'heartRate' ? 'bg-white dark:bg-slate-900 shadow-sm' : ''}`)}
              >
                <Heart color={activeMetric === 'heartRate' ? '#ec4899' : '#94a3b8'} size={16} style={tw('mr-1.5')} />
                <Text style={tw(`text-xs font-bold ${activeMetric === 'heartRate' ? 'text-slate-900 dark:text-white' : 'text-slate-500'}`)}>
                  {t('mobile.heart_rate', 'Heart Rate')}
                </Text>
              </TouchableOpacity>
            </View>

            {isLoading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-44 w-full rounded-2xl" />
                <Skeleton className="h-12 w-full rounded-xl" />
              </View>
            ) : loadError ? (
              <View style={tw('p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 items-center gap-3')}>
                <AlertCircle color="#ef4444" size={24} />
                <Text style={tw('text-xs font-semibold text-rose-700 dark:text-rose-300 text-center')}>
                  {loadError}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadChartData()}
                  style={tw('px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 flex-row items-center')}
                >
                  <RefreshCw color={twInstance.color('text-slate-700 dark:text-slate-200')} size={14} style={tw('mr-1.5')} />
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.retry', 'Retry')}
                  </Text>
                </TouchableOpacity>
              </View>
            ) : points.length === 0 ? (
              <View style={tw('p-8 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 items-center')}>
                <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400 text-center')}>
                  {t('mobile.no_records_found', 'No records found')}
                </Text>
              </View>
            ) : (
              <View style={tw('bg-slate-50 dark:bg-slate-950 p-5 rounded-2xl border border-slate-200 dark:border-slate-800')}>
                <View style={tw('flex-row justify-between items-center mb-4')}>
                  <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>
                    {activeMetric === 'bp'
                      ? t('mobile.systolic_diastolic_trend', 'Systolic / Diastolic Trend')
                      : activeMetric === 'glucose'
                        ? t('mobile.glucose_trend', 'Blood Glucose Trend (mg/dL)')
                        : t('mobile.hr_trend', 'Resting Heart Rate (BPM)')}
                  </Text>
                  <View style={tw('flex-row items-center gap-2')}>
                    <View style={tw('w-2 h-2 rounded-full bg-emerald-500')} />
                    <Text style={tw('text-[11px] text-slate-500 mr-2')}>{t('mobile.normal', 'Normal')}</Text>
                    <View style={tw('w-2 h-2 rounded-full bg-red-500')} />
                    <Text style={tw('text-[11px] text-slate-500')}>{t('mobile.elevated', 'Elevated')}</Text>
                  </View>
                </View>

                <View style={tw('flex-row justify-between items-end h-40 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800')}>
                  {points.map((item, idx) => {
                    const maxVal = Math.max(...points.map((p) => p.primary), 1);
                    const heightPercent = Math.min(100, Math.max(25, Math.round((item.primary / maxVal) * 90)));

                    return (
                      <View key={idx} style={tw('items-center flex-1')}>
                        <Text style={tw('text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1')}>
                          {Math.round(item.primary)}
                        </Text>
                        <View
                          style={[
                            tw(`w-5 rounded-t-lg ${item.alert ? 'bg-red-500' : 'bg-emerald-500 dark:bg-emerald-600'}`),
                            { height: `${heightPercent}%` },
                          ]}
                        />
                        <Text style={tw('text-[10px] font-medium text-slate-600 dark:text-slate-400 mt-2')}>
                          {item.day}
                        </Text>
                      </View>
                    );
                  })}
                </View>

                <View style={tw('flex-row justify-between items-center mt-4 pt-2')}>
                  <View>
                    <Text style={tw('text-xs text-slate-500')}>{t('mobile.weekly_avg', 'Average')}</Text>
                    <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>{avgLabel}</Text>
                  </View>
                  <View>
                    <Text style={tw('text-xs text-slate-500')}>{t('mobile.peak_reading', 'Peak')}</Text>
                    <Text style={tw('font-bold text-sm text-red-500')}>{peakLabel}</Text>
                  </View>
                  <View>
                    <Text style={tw('text-xs text-slate-500')}>{t('mobile.target_compliance', 'Alerts')}</Text>
                    <Text style={tw('font-bold text-sm text-amber-500')}>
                      {alertsCount} {t('mobile.out_of_range', 'Alerts')}
                    </Text>
                  </View>
                </View>
              </View>
            )}
          </ScrollView>

          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                {t('mobile.close', 'Close')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
