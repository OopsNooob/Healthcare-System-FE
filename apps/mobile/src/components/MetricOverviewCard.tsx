import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable } from 'react-native';
import {
  Activity,
  Droplet,
  Droplets,
  Flame,
  Gauge,
  Heart,
  Ruler,
  Thermometer,
  Weight,
  Wind,
} from 'lucide-react-native';
import type { MetricsTypes } from '@repo/shared-hooks';
import { tw } from '../tw';
import { useThemeContext } from '@/context/ThemeContext';

interface MetricEntry {
  value: number;
  recordedAt: Date | string;
}

interface MetricOverviewCardProps {
  patientId: string;
  metricsType: MetricsTypes;
  values: Record<string, MetricEntry>;
  unit: string;
  onView: () => void;
}

type VariantStyle = {
  icon: React.ReactNode;
  labelKey: string;
  fallbackLabel: string;
  textColor: string;
  iconBgColor: string;
};

const VARIANT_STYLES: Record<MetricsTypes, VariantStyle> = {
  blood_pressure: {
    icon: <Heart color="#dc2626" size={24} />,
    labelKey: 'mobile.blood_pressure',
    fallbackLabel: 'Blood Pressure',
    textColor: 'text-red-600 dark:text-red-400',
    iconBgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  heart_rate: {
    icon: <Activity color="#db2777" size={24} />,
    labelKey: 'mobile.heart_rate',
    fallbackLabel: 'Heart Rate',
    textColor: 'text-pink-600 dark:text-pink-400',
    iconBgColor: 'bg-pink-100 dark:bg-pink-900/30',
  },
  bmi: {
    icon: <Weight color="#ea580c" size={24} />,
    labelKey: 'mobile.bmi',
    fallbackLabel: 'BMI',
    textColor: 'text-orange-600 dark:text-orange-400',
    iconBgColor: 'bg-orange-100 dark:bg-orange-900/30',
  },
  weight: {
    icon: <Weight color="#d97706" size={24} />,
    labelKey: 'mobile.weight',
    fallbackLabel: 'Weight',
    textColor: 'text-amber-600 dark:text-amber-400',
    iconBgColor: 'bg-amber-100 dark:bg-amber-900/30',
  },
  height: {
    icon: <Ruler color="#2563eb" size={24} />,
    labelKey: 'mobile.height',
    fallbackLabel: 'Height',
    textColor: 'text-blue-600 dark:text-blue-400',
    iconBgColor: 'bg-blue-100 dark:bg-blue-900/30',
  },
  water_intake: {
    icon: <Droplet color="#0891b2" size={24} />,
    labelKey: 'mobile.water_intake',
    fallbackLabel: 'Water Intake',
    textColor: 'text-cyan-600 dark:text-cyan-400',
    iconBgColor: 'bg-cyan-100 dark:bg-cyan-900/30',
  },
  kcal_intake: {
    icon: <Flame color="#ca8a04" size={24} />,
    labelKey: 'mobile.calories',
    fallbackLabel: 'Calories',
    textColor: 'text-yellow-600 dark:text-yellow-400',
    iconBgColor: 'bg-yellow-100 dark:bg-yellow-900/30',
  },
  blood_glucose: {
    icon: <Droplets color="#9333ea" size={24} />,
    labelKey: 'mobile.blood_sugar',
    fallbackLabel: 'Blood Glucose',
    textColor: 'text-purple-600 dark:text-purple-400',
    iconBgColor: 'bg-purple-100 dark:bg-purple-900/30',
  },
  oxygen_saturation: {
    icon: <Wind color="#0284c7" size={24} />,
    labelKey: 'mobile.oxygen_saturation',
    fallbackLabel: 'SpO2',
    textColor: 'text-sky-600 dark:text-sky-400',
    iconBgColor: 'bg-sky-100 dark:bg-sky-900/30',
  },
  body_temperature: {
    icon: <Thermometer color="#dc2626" size={24} />,
    labelKey: 'mobile.body_temperature',
    fallbackLabel: 'Temperature',
    textColor: 'text-red-600 dark:text-red-400',
    iconBgColor: 'bg-red-100 dark:bg-red-900/30',
  },
  respiratory_rate: {
    icon: <Gauge color="#16a34a" size={24} />,
    labelKey: 'mobile.respiratory_rate',
    fallbackLabel: 'Respiratory Rate',
    textColor: 'text-green-600 dark:text-green-400',
    iconBgColor: 'bg-green-100 dark:bg-green-900/30',
  },
};

function formatMetricValue(
  metricsType: MetricsTypes,
  values: Record<string, MetricEntry>
): string | null {
  if (metricsType === 'blood_pressure') {
    const systolic = values?.systolic?.value;
    const diastolic = values?.diastolic?.value;
    if (systolic !== undefined && diastolic !== undefined) {
      return `${Math.round(systolic)}/${Math.round(diastolic)}`;
    }
    return null;
  }
  const primaryKey =
    metricsType === 'water_intake' || metricsType === 'kcal_intake' ? 'amount' : 'value';
  const val = values?.[primaryKey]?.value;
  return val !== undefined ? String(Math.round(val * 10) / 10) : null;
}

export function MetricOverviewCard({
  metricsType,
  values,
  unit,
  onView,
}: MetricOverviewCardProps) {
  const { t } = useTranslation();
  useThemeContext();

  const variant = VARIANT_STYLES[metricsType];
  const displayValue = formatMetricValue(metricsType, values);

  const getLatestTimestamp = (): Date | string | undefined => {
    if (!values) return undefined;
    const entries = Object.values(values);
    if (entries.length === 0) return undefined;
    return entries[entries.length - 1]?.recordedAt;
  };

  const formatLocalizedTime = (recordedAt?: Date | string): string => {
    if (!recordedAt) return '—';
    const date = new Date(recordedAt);
    if (Number.isNaN(date.getTime())) return '—';

    const locale = t('mobile.date_locale', 'vi-VN');
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let dayStr = '';
    if (date.toDateString() === today.toDateString()) {
      dayStr = t('mobile.today', 'Today');
    } else if (date.toDateString() === yesterday.toDateString()) {
      dayStr = t('mobile.yesterday', 'Yesterday');
    } else {
      dayStr = date.toLocaleDateString(locale, { month: 'short', day: 'numeric' });
    }

    const timeStr = date.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
    return `${dayStr}, ${timeStr}`;
  };

  const formattedTime = formatLocalizedTime(getLatestTimestamp());
  const hasData = displayValue !== null;

  return (
    <Pressable
      style={tw('flex-col gap-3 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-4')}
      onPress={onView}
    >
      <View style={tw('flex-row items-center justify-between')}>
        <View style={tw(`flex h-12 w-12 items-center justify-center rounded-2xl ${variant.iconBgColor}`)}>
          {variant.icon}
        </View>
        {hasData ? (
          <View style={tw('rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5')}>
            <Text style={tw('text-xs font-semibold text-emerald-700 dark:text-emerald-400')}>
              {t('mobile.active', 'Active')}
            </Text>
          </View>
        ) : (
          <View style={tw('rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5')}>
            <Text style={tw('text-xs font-semibold text-zinc-600 dark:text-zinc-400')}>
              {t('mobile.no_data', 'No Data')}
            </Text>
          </View>
        )}
      </View>

      <View style={tw('mt-2')}>
        <Text style={tw('text-xl font-semibold text-zinc-900 dark:text-white')}>
          {t(variant.labelKey, variant.fallbackLabel)}
        </Text>
      </View>

      {hasData ? (
        <View style={tw('mt-2')}>
          <View style={tw('flex-row items-baseline gap-1')}>
            <Text style={tw(`text-4xl font-bold ${variant.textColor}`)}>{displayValue}</Text>
            <Text style={tw('text-sm font-normal text-zinc-500 dark:text-zinc-400')}>{unit}</Text>
          </View>
          <View style={tw('flex-row items-center justify-between mt-4')}>
            <Text style={tw('text-xs text-zinc-500 dark:text-zinc-400')}>
              {t('mobile.last_update', 'Last update')}: {formattedTime}
            </Text>
            <Text style={tw(`text-sm font-semibold ${variant.textColor}`)}>
              {t('mobile.view_', 'View ›')}
            </Text>
          </View>
        </View>
      ) : (
        <View style={tw('mt-2 flex-row items-center justify-between')}>
          <Text style={tw('text-sm text-zinc-500 dark:text-zinc-400')}>
            {t('mobile.no_data_available_yet', 'No data available yet')}
          </Text>
          <Text style={tw('text-sm font-semibold text-blue-600 dark:text-blue-400')}>
            {t('mobile.add_data_', 'Add Data ›')}
          </Text>
        </View>
      )}
    </Pressable>
  );
}
