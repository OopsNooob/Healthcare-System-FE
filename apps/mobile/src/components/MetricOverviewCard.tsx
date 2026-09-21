import React from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, Pressable } from 'react-native';
import { tw } from '../tw';
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
} from "lucide-react-native";
import type { MetricsTypes } from "@repo/shared-hooks";

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
  label: string;
  borderColor: string;
  bgColor: string;
  textColor: string;
  iconBgColor: string;
};

const VARIANT_STYLES: Record<MetricsTypes, VariantStyle> = {
  blood_pressure: {
    icon: <Heart color="#dc2626" size={24} />,
    label: "Blood Pressure",
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    iconBgColor: "bg-red-100",
  },
  heart_rate: {
    icon: <Activity color="#db2777" size={24} />,
    label: "Heart Rate",
    borderColor: "border-pink-200",
    bgColor: "bg-pink-50",
    textColor: "text-pink-600",
    iconBgColor: "bg-pink-100",
  },
  bmi: {
    icon: <Weight color="#ea580c" size={24} />,
    label: "BMI",
    borderColor: "border-orange-200",
    bgColor: "bg-orange-50",
    textColor: "text-orange-600",
    iconBgColor: "bg-orange-100",
  },
  weight: {
    icon: <Weight color="#d97706" size={24} />,
    label: "Weight",
    borderColor: "border-amber-200",
    bgColor: "bg-amber-50",
    textColor: "text-amber-600",
    iconBgColor: "bg-amber-100",
  },
  height: {
    icon: <Ruler color="#2563eb" size={24} />,
    label: "Height",
    borderColor: "border-blue-200",
    bgColor: "bg-blue-50",
    textColor: "text-blue-600",
    iconBgColor: "bg-blue-100",
  },
  water_intake: {
    icon: <Droplet color="#0891b2" size={24} />,
    label: "Water Intake",
    borderColor: "border-cyan-200",
    bgColor: "bg-cyan-50",
    textColor: "text-cyan-600",
    iconBgColor: "bg-cyan-100",
  },
  kcal_intake: {
    icon: <Flame color="#ca8a04" size={24} />,
    label: "Calories",
    borderColor: "border-yellow-200",
    bgColor: "bg-yellow-50",
    textColor: "text-yellow-600",
    iconBgColor: "bg-yellow-100",
  },
  blood_glucose: {
    icon: <Droplets color="#9333ea" size={24} />,
    label: "Blood Glucose",
    borderColor: "border-purple-200",
    bgColor: "bg-purple-50",
    textColor: "text-purple-600",
    iconBgColor: "bg-purple-100",
  },
  oxygen_saturation: {
    icon: <Wind color="#0284c7" size={24} />,
    label: "O2 Saturation",
    borderColor: "border-sky-200",
    bgColor: "bg-sky-50",
    textColor: "text-sky-600",
    iconBgColor: "bg-sky-100",
  },
  body_temperature: {
    icon: <Thermometer color="#dc2626" size={24} />,
    label: "Temperature",
    borderColor: "border-red-200",
    bgColor: "bg-red-50",
    textColor: "text-red-600",
    iconBgColor: "bg-red-100",
  },
  respiratory_rate: {
    icon: <Gauge color="#16a34a" size={24} />,
    label: "Respiratory Rate",
    borderColor: "border-green-200",
    bgColor: "bg-green-50",
    textColor: "text-green-600",
    iconBgColor: "bg-green-100",
  },
};

function formatMetricValue(
  metricsType: MetricsTypes,
  values: Record<string, MetricEntry>
): string {
  switch (metricsType) {
    case "blood_pressure": {
      const systolic = values?.systolic?.value;
      const diastolic = values?.diastolic?.value;
      if (systolic !== undefined && diastolic !== undefined) {
        return `${Math.round(systolic)}/${Math.round(diastolic)}`;
      }
      return "N/A";
    }
    case "heart_rate":
    case "bmi":
    case "weight":
    case "height":
    case "water_intake":
    case "kcal_intake":
    case "blood_glucose":
    case "oxygen_saturation":
    case "body_temperature":
    case "respiratory_rate": {
      const primaryKey =
        metricsType === "water_intake" || metricsType === "kcal_intake"
          ? "amount"
          : "value";
      const val = values?.[primaryKey]?.value;
      return val !== undefined ? Math.round(val).toString() : "N/A";
    }
    default:
      return "N/A";
  }
}

function formatTime(recordedAt?: Date | string): string {
  if (!recordedAt) return "-";
  const date = new Date(recordedAt);
  if (Number.isNaN(date.getTime())) return "-";

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const isToday = date.toDateString() === today.toDateString();
  const isYesterday = date.toDateString() === yesterday.toDateString();

  let dayStr = "";
  if (isToday) dayStr = "Today";
  else if (isYesterday) dayStr = "Yesterday";
  else
    dayStr = date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    });

  const timeStr = date.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
  });

  return `${dayStr}, ${timeStr}`;
}

export function MetricOverviewCard({
  patientId,
  metricsType,
  values,
  unit,
  onView,
}: MetricOverviewCardProps) {
  const { t } = useTranslation();

  const variant = VARIANT_STYLES[metricsType];
  const displayValue = formatMetricValue(metricsType, values);

  const getLatestTimestamp = (): Date | string | undefined => {
    if (!values) return undefined;
    const entries = Object.values(values);
    if (entries.length === 0) return undefined;
    return entries[entries.length - 1]?.recordedAt;
  };

  const latestTime = getLatestTimestamp();
  const formattedTime = formatTime(latestTime);
  const hasData = displayValue !== "N/A";

  return (
    <Pressable
      style={tw(`flex-col gap-3 rounded-3xl border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 p-6 mb-4`)}
      onPress={onView}
    >
      <View style={tw("flex-row items-center justify-between")}>
        <View
          style={tw(`flex h-12 w-12 items-center justify-center rounded-2xl ${variant.iconBgColor}`)}
        >
          {variant.icon}
        </View>
        {hasData ? (
          <View style={tw("rounded-full bg-emerald-50 dark:bg-emerald-900/30 px-2.5 py-0.5")}>
            <Text style={tw("text-xs font-semibold text-emerald-700 dark:text-emerald-400")}>{t('mobile.active', `Active`)}</Text>
          </View>
        ) : (
          <View style={tw("rounded-full bg-zinc-100 dark:bg-zinc-800 px-2.5 py-0.5")}>
            <Text style={tw("text-xs font-semibold text-zinc-600 dark:text-zinc-400")}>{t('mobile.no_data', `No Data`)}</Text>
          </View>
        )}
      </View>

      <View style={tw("mt-2")}>
        <Text style={tw("text-xl font-semibold text-zinc-900 dark:text-white")}>{variant.label}</Text>
      </View>

      {hasData ? (
        <View style={tw("mt-2")}>
          <View style={tw("flex-row items-baseline gap-1")}>
            <Text style={tw(`text-4xl font-bold ${variant.textColor}`)}>
              {displayValue}
            </Text>
            <Text style={tw("text-sm font-normal text-zinc-500")}>
              {unit}
            </Text>
          </View>
          <View style={tw("flex-row items-center justify-between mt-4")}>
            <Text style={tw("text-xs text-zinc-500")}>
              Last update: {formattedTime}
            </Text>
            <Text style={tw(`text-sm font-semibold ${variant.textColor}`)}>{t('mobile.view_', `View ›`)}</Text>
          </View>
        </View>
      ) : (
        <View style={tw("mt-2 flex-row items-center justify-between")}>
          <Text style={tw("text-sm text-zinc-500")}>{t('mobile.no_data_available_yet', `No data available yet`)}</Text>
          <Text style={tw("text-sm font-semibold text-blue-600")}>{t('mobile.add_data_', `Add Data ›`)}</Text>
        </View>
      )}
    </Pressable>
  );
}
