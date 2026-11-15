import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import DateTimePicker from '@react-native-community/datetimepicker';
import Toast from 'react-native-toast-message';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Bot,
  Droplet,
  Heart,
  PhoneCall,
  Plus,
  RefreshCw,
  Scale,
  Thermometer,
  Trash2,
  Wind,
  X,
} from 'lucide-react-native';
import {
  mobileApi,
  useHealthMetrics,
  type FeTypes,
  type HealthMetric,
  type MetricsTypes,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { VoidDataModal } from '@/components/modals';
import { extractApiErrorMessage } from '@/utils/apiError';

interface MetricConfig {
  id: MetricsTypes;
  titleKey: string;
  fallbackTitle: string;
  unit: string;
  bgClass: string;
  renderIcon: () => React.ReactNode;
}

const METRIC_CONFIGS: MetricConfig[] = [
  {
    id: 'blood_pressure',
    titleKey: 'mobile.blood_pressure',
    fallbackTitle: 'Blood Pressure',
    unit: 'mmHg',
    bgClass: 'bg-blue-100 dark:bg-blue-900/30',
    renderIcon: () => <Activity color={twInstance.color('text-blue-500')} size={22} />,
  },
  {
    id: 'blood_glucose',
    titleKey: 'mobile.blood_sugar',
    fallbackTitle: 'Blood Glucose',
    unit: 'mg/dL',
    bgClass: 'bg-amber-100 dark:bg-amber-900/30',
    renderIcon: () => <Droplet color={twInstance.color('text-amber-500')} size={22} />,
  },
  {
    id: 'heart_rate',
    titleKey: 'mobile.heart_rate',
    fallbackTitle: 'Heart Rate',
    unit: 'bpm',
    bgClass: 'bg-rose-100 dark:bg-rose-900/30',
    renderIcon: () => <Heart color={twInstance.color('text-rose-500')} size={22} />,
  },
  {
    id: 'oxygen_saturation',
    titleKey: 'mobile.oxygen_saturation',
    fallbackTitle: 'SpO2',
    unit: '%',
    bgClass: 'bg-sky-100 dark:bg-sky-900/30',
    renderIcon: () => <Wind color={twInstance.color('text-sky-500')} size={22} />,
  },
  {
    id: 'weight',
    titleKey: 'mobile.weight',
    fallbackTitle: 'Weight',
    unit: 'kg',
    bgClass: 'bg-emerald-100 dark:bg-emerald-900/30',
    renderIcon: () => <Scale color={twInstance.color('text-emerald-500')} size={22} />,
  },
  {
    id: 'body_temperature',
    titleKey: 'mobile.body_temperature',
    fallbackTitle: 'Temperature',
    unit: '°C',
    bgClass: 'bg-orange-100 dark:bg-orange-900/30',
    renderIcon: () => <Thermometer color={twInstance.color('text-orange-500')} size={22} />,
  },
];

function formatMetricReading(metric: HealthMetric): string {
  if (metric.type === 'blood_pressure') {
    const sys = metric.values?.systolic?.value;
    const dia = metric.values?.diastolic?.value;
    if (sys !== undefined && dia !== undefined) {
      return `${Math.round(sys)}/${Math.round(dia)}`;
    }
    return '—';
  }
  const raw = metric.values?.value?.value ?? metric.values?.amount?.value;
  return raw !== undefined ? String(raw) : '—';
}

export default function HealthMetricScreen() {
  const { t, i18n } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useRouter();

  const [selectedMetricId, setSelectedMetricId] = useState<MetricsTypes>('blood_pressure');
  const selectedConfig = useMemo(
    () => METRIC_CONFIGS.find((m) => m.id === selectedMetricId) ?? METRIC_CONFIGS[0],
    [selectedMetricId]
  );

  const {
    data: entries,
    alerts,
    isLoading,
    error,
    addEntry,
    correctEntry,
    voidEntry,
    refresh,
    refreshAlerts,
  } = useHealthMetrics({
    metricType: selectedMetricId,
    limit: 50,
    sortBy: 'recordedAt',
    sortOrder: -1,
  });

  const [stats, setStats] = useState<FeTypes.HealthMetricsGetStatisticsResponse['data'] | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const [modalVisible, setModalVisible] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [primaryInput, setPrimaryInput] = useState('');
  const [secondaryInput, setSecondaryInput] = useState('');
  const [correctionReason, setCorrectionReason] = useState('');
  const [formDateObj, setFormDateObj] = useState(new Date());
  const [showPicker, setShowPicker] = useState(false);
  const [pickerMode, setPickerMode] = useState<'date' | 'time'>('date');
  const [isSaving, setIsSaving] = useState(false);

  const [voidTarget, setVoidTarget] = useState<HealthMetric | null>(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [alertType, setAlertType] = useState<'attention' | 'urgent'>('attention');
  const [alertReason, setAlertReason] = useState('');

  const loadStatistics = useCallback(async () => {
    try {
      const res = await mobileApi.healthMetricsGetStatistics({
        params: { type: selectedMetricId },
        query: { limit: 30 },
      });
      setStats(res.data ?? null);
    } catch {
      setStats(null);
    }
  }, [selectedMetricId]);

  useEffect(() => {
    void refreshAlerts().catch(() => undefined);
    void loadStatistics();
  }, [refreshAlerts, loadStatistics]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      await Promise.allSettled([refresh(), refreshAlerts(), loadStatistics()]);
    } finally {
      setRefreshing(false);
    }
  }, [refresh, refreshAlerts, loadStatistics]);

  const locale = i18n.language.startsWith('vi') ? 'vi-VN' : 'en-US';
  const formatTime = (date: Date) =>
    date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  const formatDate = (date: Date) =>
    date.toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });

  const openAddModal = () => {
    setEditId(null);
    setPrimaryInput('');
    setSecondaryInput('');
    setCorrectionReason('');
    setFormDateObj(new Date());
    setModalVisible(true);
  };

  const openEditModal = (entry: HealthMetric) => {
    setEditId(entry.id);
    if (entry.type === 'blood_pressure') {
      const sys = entry.values?.systolic?.value;
      const dia = entry.values?.diastolic?.value;
      setPrimaryInput(sys !== undefined ? String(sys) : '');
      setSecondaryInput(dia !== undefined ? String(dia) : '');
    } else {
      const val = entry.values?.value?.value ?? entry.values?.amount?.value;
      setPrimaryInput(val !== undefined ? String(val) : '');
      setSecondaryInput('');
    }
    setCorrectionReason('');
    setFormDateObj(new Date(entry.recordedAt));
    setModalVisible(true);
  };

  const handleSave = async () => {
    if (isSaving) return;

    const primaryNum = Number(primaryInput.replace(',', '.').trim());
    if (!primaryInput.trim() || !Number.isFinite(primaryNum) || primaryNum <= 0) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.please_fill_all', 'Please enter a valid positive numeric value.'),
      });
      return;
    }

    let secondaryNum: number | undefined;
    if (selectedMetricId === 'blood_pressure') {
      secondaryNum = Number(secondaryInput.replace(',', '.').trim());
      if (!secondaryInput.trim() || !Number.isFinite(secondaryNum) || secondaryNum <= 0) {
        Toast.show({
          type: 'error',
          text1: t('mobile.error', 'Error'),
          text2: t('mobile.please_enter_diastolic', 'Please enter both systolic and diastolic values.'),
        });
        return;
      }
    }

    setIsSaving(true);
    try {
      const recordedAt = formDateObj.toISOString();
      const recordedTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Ho_Chi_Minh';

      let savedMetric: HealthMetric;
      if (editId) {
        savedMetric = await correctEntry(editId, {
          metricType: selectedMetricId,
          primaryValue: primaryNum,
          secondaryValue: secondaryNum,
          recordedAt,
          recordedTimezone,
          reason: correctionReason.trim() || t('mobile.default_correction_reason', 'User correction'),
        });
      } else {
        savedMetric = await addEntry({
          metricType: selectedMetricId,
          primaryValue: primaryNum,
          secondaryValue: secondaryNum,
          recordedAt,
          recordedTimezone,
        });
      }

      setModalVisible(false);
      await Promise.allSettled([refresh(), refreshAlerts(), loadStatistics()]);

      const latestAlerts = await refreshAlerts().catch(() => []);
      const isAlerted =
        latestAlerts.some((a) => a.id === savedMetric.id) ||
        (savedMetric.validationReasonCodes?.length ?? 0) > 0 ||
        (selectedMetricId === 'blood_pressure' && (primaryNum >= 140 || (secondaryNum ?? 0) >= 90));

      if (isAlerted) {
        const isUrgent =
          (selectedMetricId === 'blood_pressure' && (primaryNum >= 180 || (secondaryNum ?? 0) >= 120)) ||
          (selectedMetricId === 'blood_glucose' && (primaryNum < 70 || primaryNum >= 250)) ||
          (selectedMetricId === 'oxygen_saturation' && primaryNum < 90);
        setAlertType(isUrgent ? 'urgent' : 'attention');
        setAlertReason(
          isUrgent
            ? t('mobile.alert_vital_urgent_msg', {
                metric: t(selectedConfig.titleKey, selectedConfig.fallbackTitle),
                value: formatMetricReading(savedMetric),
                unit: selectedConfig.unit,
                defaultValue: `${formatMetricReading(savedMetric)} ${selectedConfig.unit} requires urgent clinical review.`,
              })
            : t('mobile.alert_vital_attention_msg', {
                metric: t(selectedConfig.titleKey, selectedConfig.fallbackTitle),
                value: formatMetricReading(savedMetric),
                unit: selectedConfig.unit,
                defaultValue: `${formatMetricReading(savedMetric)} ${selectedConfig.unit} is outside the target range.`,
              })
        );
        setAlertVisible(true);
      } else {
        Toast.show({
          type: 'success',
          text1: t('mobile.success', 'Success'),
          text2: editId
            ? t('mobile.entry_updated', 'Entry replaced (Correction logged)')
            : t('mobile.new_entry_added', 'New entry added'),
        });
      }
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err, 'mobile.save_metric_failed'),
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleVoidConfirm = async (reasonCode: string, note: string) => {
    if (!voidTarget) return;
    const reason = note.trim() ? `${reasonCode}: ${note.trim()}` : reasonCode;
    await voidEntry(voidTarget.id, reason);
    setVoidTarget(null);
    await Promise.allSettled([refresh(), refreshAlerts(), loadStatistics()]);
  };

  const handleAskAI = (entry: HealthMetric) => {
    const dt = new Date(entry.recordedAt);
    const valStr = formatMetricReading(entry);
    const metricTitle = t(selectedConfig.titleKey, selectedConfig.fallbackTitle);
    const prompt = t('mobile.ask_ai_metric_prompt', {
      metric: metricTitle,
      value: valStr,
      unit: entry.unit || selectedConfig.unit,
      time: formatTime(dt),
      date: formatDate(dt),
      defaultValue: `Please evaluate my ${metricTitle} reading of ${valStr} ${entry.unit || selectedConfig.unit} recorded at ${formatTime(dt)} on ${formatDate(dt)}.`,
    });
    router.push({
      pathname: '/(patient)/ai-chat/[id]',
      params: { id: 'new-session', prefill: prompt },
    });
  };

  const activeAlertIds = useMemo(() => new Set(alerts.map((a) => a.id)), [alerts]);

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <View style={tw('flex-row justify-between items-center px-6 pt-5 pb-4')}>
        <View style={tw('flex-row items-center gap-3 flex-1 mr-3')}>
          <TouchableOpacity
            onPress={() => router.back()}
            style={tw('w-10 h-10 rounded-full bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center justify-center')}
          >
            <ArrowLeft color={twInstance.color('text-slate-700 dark:text-slate-200')} size={18} />
          </TouchableOpacity>
          <View style={tw('flex-1')}>
            <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
              {t('mobile.health_metrics', 'Health Metrics')}
            </Text>
            <Text style={tw('text-slate-500 dark:text-slate-400 text-xs mt-0.5')}>
              {t('mobile.track_your_daily_health_status', 'Track your daily health status')}
            </Text>
          </View>
        </View>
        <TouchableOpacity
          onPress={openAddModal}
          style={tw('w-11 h-11 bg-emerald-500 dark:bg-emerald-600 rounded-full items-center justify-center shadow-sm')}
        >
          <Plus color="#ffffff" size={22} />
        </TouchableOpacity>
      </View>

      <View style={tw('mb-4')}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw('px-6 gap-2.5')}>
          {METRIC_CONFIGS.map((metric) => {
            const isSelected = selectedMetricId === metric.id;
            return (
              <TouchableOpacity
                key={metric.id}
                onPress={() => setSelectedMetricId(metric.id)}
                style={tw(
                  `flex-row items-center gap-2 px-3.5 py-2.5 rounded-2xl border ${
                    isSelected
                      ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                      : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
                  }`
                )}
              >
                <View style={tw(`w-8 h-8 rounded-full ${metric.bgClass} items-center justify-center`)}>
                  {metric.renderIcon()}
                </View>
                <Text
                  style={tw(
                    `font-semibold text-xs ${
                      isSelected ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-700 dark:text-slate-200'
                    }`
                  )}
                >
                  {t(metric.titleKey, metric.fallbackTitle)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={tw('px-6 pb-20')}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => void onRefresh()} tintColor="#10b981" />}
      >
        {stats && stats.count > 0 && (
          <View style={tw('flex-row gap-2.5 mb-4')}>
            <View style={tw('flex-1 bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800')}>
              <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                {t('mobile.total_readings', 'Readings')}
              </Text>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-0.5')}>
                {stats.count}
              </Text>
            </View>
            <View style={tw('flex-1 bg-white dark:bg-slate-900 rounded-2xl p-3 border border-slate-200/80 dark:border-slate-800')}>
              <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                {t('mobile.average', 'Average')}
              </Text>
              <Text style={tw('text-base font-bold text-emerald-600 dark:text-emerald-400 mt-0.5')}>
                {selectedMetricId === 'blood_pressure'
                  ? (() => {
                      const bpItems = entries.filter(
                        (e) =>
                          e.values?.systolic?.value !== undefined &&
                          e.values?.diastolic?.value !== undefined,
                      );
                      if (bpItems.length === 0) {
                        return stats.average ? `${Math.round(stats.average)}` : '—';
                      }
                      const avgSys =
                        bpItems.reduce((acc, e) => acc + Number(e.values?.systolic?.value ?? 0), 0) /
                        bpItems.length;
                      const avgDia =
                        bpItems.reduce((acc, e) => acc + Number(e.values?.diastolic?.value ?? 0), 0) /
                        bpItems.length;
                      return `${Math.round(avgSys)}/${Math.round(avgDia)}`;
                    })()
                  : Math.round(Number(stats.average ?? 0) * 10) / 10}
              </Text>
            </View>
          </View>
        )}

        <View style={tw('flex-row justify-between items-end mb-4')}>
          <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
            {t('mobile.recent_records', 'Recent Records')}
          </Text>
          <TouchableOpacity onPress={() => router.push('/(patient)/reports')}>
            <Text style={tw('text-sm text-emerald-600 dark:text-emerald-400 font-medium')}>
              {t('mobile.view_reports', 'View Reports ›')}
            </Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={tw('p-4 rounded-2xl bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800 items-center gap-3 mb-4')}>
            <AlertCircle color="#ef4444" size={24} />
            <Text style={tw('text-xs font-semibold text-rose-700 dark:text-rose-300 text-center')}>
              {error}
            </Text>
            <TouchableOpacity
              onPress={() => void refresh()}
              style={tw('px-4 py-2 rounded-xl bg-white dark:bg-slate-800 border border-rose-200 dark:border-rose-800 flex-row items-center')}
            >
              <RefreshCw color={twInstance.color('text-rose-600 dark:text-rose-300')} size={14} style={tw('mr-1.5')} />
              <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-300')}>
                {t('mobile.retry', 'Retry')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : isLoading ? (
          <View style={tw('gap-3')}>
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
            <Skeleton className="h-28 w-full rounded-2xl" />
          </View>
        ) : entries.length === 0 ? (
          <View style={tw('items-center justify-center py-12 bg-white dark:bg-slate-900 rounded-3xl border border-slate-200/80 dark:border-slate-800 px-6')}>
            <Text style={tw('text-slate-500 dark:text-slate-400 font-medium text-center')}>
              {t('mobile.no_records_found', 'No records found')}
            </Text>
            <TouchableOpacity
              onPress={openAddModal}
              style={tw('mt-4 px-5 py-2.5 rounded-xl bg-emerald-500 flex-row items-center')}
            >
              <Plus color="#ffffff" size={16} style={tw('mr-1.5')} />
              <Text style={tw('text-white font-bold text-xs')}>
                {t('mobile.add_record', 'Add Record')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          entries.map((entry) => {
            const dt = new Date(entry.recordedAt);
            const hasAlert = activeAlertIds.has(entry.id) || (entry.validationReasonCodes?.length ?? 0) > 0;
            const valueText = formatMetricReading(entry);
            return (
              <TouchableOpacity
                key={entry.id}
                onPress={() => openEditModal(entry)}
                activeOpacity={0.85}
                style={tw('bg-white dark:bg-slate-900 rounded-2xl p-4 mb-3 border border-slate-200/80 dark:border-slate-800 shadow-sm')}
              >
                <View style={tw('flex-row justify-between items-start mb-3')}>
                  <View style={tw('flex-1 mr-2')}>
                    <View style={tw('flex-row items-center gap-2')}>
                      <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
                        {valueText}{' '}
                        <Text style={tw('text-sm text-slate-500 dark:text-slate-400 font-medium')}>
                          {entry.unit || selectedConfig.unit}
                        </Text>
                      </Text>
                      {hasAlert && (
                        <View style={tw('px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40')}>
                          <Text style={tw('text-[10px] font-bold text-amber-700 dark:text-amber-300')}>
                            {t('mobile.alert_badge', 'Alert')}
                          </Text>
                        </View>
                      )}
                    </View>
                    <Text style={tw('text-xs text-slate-400 dark:text-slate-500 mt-1')}>
                      {formatTime(dt)} • {formatDate(dt)}
                    </Text>
                  </View>
                  <TouchableOpacity
                    onPress={() => setVoidTarget(entry)}
                    style={tw('w-8 h-8 bg-red-50 dark:bg-red-900/30 rounded-full items-center justify-center')}
                  >
                    <Trash2 color={twInstance.color('text-red-500')} size={16} />
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => handleAskAI(entry)}
                  style={tw('flex-row items-center justify-center gap-2 bg-indigo-50 dark:bg-indigo-900/30 py-2.5 rounded-xl mt-1 border border-indigo-100 dark:border-indigo-800/50')}
                >
                  <Bot color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={18} />
                  <Text style={tw('text-indigo-700 dark:text-indigo-300 font-bold text-sm')}>
                    {t('mobile.ask_ai_about_this', 'Ask AI about this')}
                  </Text>
                </TouchableOpacity>
              </TouchableOpacity>
            );
          })
        )}
      </ScrollView>

      <Modal
        visible={modalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-slate-900/40 dark:bg-black/60')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800')}>
            <View style={tw('flex-row justify-between items-center mb-5')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white flex-1 mr-3')}>
                {editId
                  ? t('mobile.edit_record', 'Correct Record')
                  : t('mobile.add_record', 'Add Record')}{' '}
                - {t(selectedConfig.titleKey, selectedConfig.fallbackTitle)}
              </Text>
              <TouchableOpacity
                disabled={isSaving}
                onPress={() => setModalVisible(false)}
                style={tw('p-2 bg-slate-100 dark:bg-slate-800 rounded-full')}
              >
                <X color={twInstance.color('text-slate-500 dark:text-slate-400')} size={20} />
              </TouchableOpacity>
            </View>

            <View style={tw('gap-4')}>
              {selectedMetricId === 'blood_pressure' ? (
                <View style={tw('flex-row gap-3')}>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5')}>
                      {t('mobile.bp_systolic_label', 'Systolic')} ({selectedConfig.unit})
                    </Text>
                    <TextInput
                      value={primaryInput}
                      onChangeText={setPrimaryInput}
                      placeholder="120"
                      placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                      keyboardType="numeric"
                      style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold')}
                    />
                  </View>
                  <View style={tw('flex-1')}>
                    <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5')}>
                      {t('mobile.bp_diastolic_label', 'Diastolic')} ({selectedConfig.unit})
                    </Text>
                    <TextInput
                      value={secondaryInput}
                      onChangeText={setSecondaryInput}
                      placeholder="80"
                      placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                      keyboardType="numeric"
                      style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold')}
                    />
                  </View>
                </View>
              ) : (
                <View>
                  <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5')}>
                    {t('mobile.value', 'Value')} ({selectedConfig.unit})
                  </Text>
                  <TextInput
                    value={primaryInput}
                    onChangeText={setPrimaryInput}
                    placeholder={t('mobile.enter_value', 'Enter value')}
                    placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                    keyboardType="decimal-pad"
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white font-bold')}
                  />
                </View>
              )}

              {editId && (
                <View>
                  <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5')}>
                    {t('mobile.correction_reason_label', 'Correction Reason')}
                  </Text>
                  <TextInput
                    value={correctionReason}
                    onChangeText={setCorrectionReason}
                    placeholder={t('mobile.correction_reason_ph', 'e.g. Entered wrong reading')}
                    placeholderTextColor={isDark ? '#94a3b8' : '#9ca3af'}
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 text-slate-900 dark:text-white text-sm')}
                  />
                </View>
              )}

              <View style={tw('flex-row gap-4')}>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5')}>
                    {t('mobile.time', 'Time')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPickerMode('time');
                      setShowPicker(true);
                    }}
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3')}
                  >
                    <Text style={tw('text-slate-900 dark:text-white font-medium')}>
                      {formatTime(formDateObj)}
                    </Text>
                  </TouchableOpacity>
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200 mb-1.5')}>
                    {t('mobile.date', 'Date')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => {
                      setPickerMode('date');
                      setShowPicker(true);
                    }}
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3')}
                  >
                    <Text style={tw('text-slate-900 dark:text-white font-medium')}>
                      {formatDate(formDateObj)}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showPicker && (
                <DateTimePicker
                  value={formDateObj}
                  mode={pickerMode}
                  is24Hour={false}
                  onChange={(_event, selectedDate) => {
                    setShowPicker(false);
                    if (selectedDate) setFormDateObj(selectedDate);
                  }}
                />
              )}

              <TouchableOpacity
                onPress={() => void handleSave()}
                disabled={isSaving}
                style={tw(`bg-emerald-500 py-4 rounded-xl items-center flex-row justify-center mt-2 ${isSaving ? 'opacity-60' : ''}`)}
              >
                {isSaving && <ActivityIndicator size="small" color="#ffffff" style={tw('mr-2')} />}
                <Text style={tw('text-white font-bold text-base')}>
                  {t('mobile.save_record', 'Save Record')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <VoidDataModal
        visible={Boolean(voidTarget)}
        onClose={() => setVoidTarget(null)}
        metricLabel={
          voidTarget
            ? `${t(selectedConfig.titleKey, selectedConfig.fallbackTitle)}: ${formatMetricReading(voidTarget)} ${voidTarget.unit || selectedConfig.unit}`
            : undefined
        }
        onVoidConfirm={handleVoidConfirm}
      />

      <Modal
        visible={alertVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setAlertVisible(false)}
      >
        <View style={tw('flex-1 justify-center items-center bg-slate-900/60 dark:bg-black/70 px-6')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full overflow-hidden shadow-2xl border border-slate-200 dark:border-slate-800')}>
            <View style={tw(`p-6 items-center ${alertType === 'urgent' ? 'bg-red-50 dark:bg-red-900/30' : 'bg-amber-50 dark:bg-amber-900/30'}`)}>
              {alertType === 'urgent' ? (
                <AlertTriangle size={48} color={twInstance.color('text-red-500')} />
              ) : (
                <AlertCircle size={48} color={twInstance.color('text-amber-500')} />
              )}
              <Text style={tw(`text-xl font-bold mt-4 text-center ${alertType === 'urgent' ? 'text-red-600 dark:text-red-400' : 'text-amber-600 dark:text-amber-400'}`)}>
                {alertType === 'urgent'
                  ? t('mobile.alert_urgent', 'Urgent Attention Required')
                  : t('mobile.alert_attention', 'Attention Needed')}
              </Text>
            </View>

            <View style={tw('p-6')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 text-center text-sm mb-4 leading-5')}>
                {alertReason}
              </Text>

              {alertType === 'urgent' && (
                <View style={tw('bg-red-50 dark:bg-red-900/20 rounded-2xl p-4 mb-5 border border-red-100 dark:border-red-800/50')}>
                  <Text style={tw('text-red-800 dark:text-red-300 font-bold mb-1.5 text-sm')}>
                    {t('mobile.safety_instructions', 'Safety Instructions:')}
                  </Text>
                  <Text style={tw('text-red-700 dark:text-red-400 text-xs mb-3 leading-5')}>
                    {t('mobile.alert_urgent_desc', 'Your vital signs require immediate attention. Please rest and contact emergency services or your physician.')}
                  </Text>
                  <TouchableOpacity
                    onPress={() => void Linking.openURL('tel:115')}
                    style={tw('flex-row items-center justify-center bg-red-600 py-3 rounded-xl gap-2')}
                  >
                    <PhoneCall size={18} color="#ffffff" />
                    <Text style={tw('text-white font-bold text-sm')}>
                      {t('mobile.call_emergency', 'Call Emergency 115')}
                    </Text>
                  </TouchableOpacity>
                </View>
              )}

              <TouchableOpacity
                onPress={() => setAlertVisible(false)}
                style={tw(`py-4 rounded-xl items-center ${alertType === 'urgent' ? 'bg-slate-100 dark:bg-slate-800' : 'bg-amber-500'}`)}
              >
                <Text style={tw(`font-bold text-base ${alertType === 'urgent' ? 'text-slate-700 dark:text-slate-300' : 'text-white'}`)}>
                  {t('mobile.i_understand', 'I Understand')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
