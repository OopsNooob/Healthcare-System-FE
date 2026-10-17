import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, LineChart, Activity, Heart, Droplet, TrendingUp } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

interface HealthChartModalProps {
  visible: boolean;
  onClose: () => void;
  patientName?: string;
}

export const HealthChartModal: React.FC<HealthChartModalProps> = ({
  visible,
  onClose,
  patientName = 'Alex Johnson',
}) => {
  const { t } = useTranslation();
  const [activeMetric, setActiveMetric] = useState<'bp' | 'glucose' | 'heartRate'>('bp');

  const bpData = [
    { day: 'Mon', sys: 142, dia: 92, label: '142/92', alert: true },
    { day: 'Tue', sys: 138, dia: 88, label: '138/88', alert: false },
    { day: 'Wed', sys: 135, dia: 85, label: '135/85', alert: false },
    { day: 'Thu', sys: 148, dia: 96, label: '148/96', alert: true },
    { day: 'Fri', sys: 136, dia: 86, label: '136/86', alert: false },
    { day: 'Sat', sys: 130, dia: 82, label: '130/82', alert: false },
    { day: 'Sun', sys: 165, dia: 100, label: '165/100', alert: true },
  ];

  const glucoseData = [
    { day: 'Mon', val: 115, label: '115 mg/dL', alert: false },
    { day: 'Tue', val: 122, label: '122 mg/dL', alert: false },
    { day: 'Wed', val: 145, label: '145 mg/dL', alert: true },
    { day: 'Thu', val: 118, label: '118 mg/dL', alert: false },
    { day: 'Fri', val: 110, label: '110 mg/dL', alert: false },
    { day: 'Sat', val: 128, label: '128 mg/dL', alert: false },
    { day: 'Sun', val: 138, label: '138 mg/dL', alert: true },
  ];

  const hrData = [
    { day: 'Mon', val: 76, label: '76 bpm', alert: false },
    { day: 'Tue', val: 78, label: '78 bpm', alert: false },
    { day: 'Wed', val: 82, label: '82 bpm', alert: false },
    { day: 'Thu', val: 94, label: '94 bpm', alert: true },
    { day: 'Fri', val: 75, label: '75 bpm', alert: false },
    { day: 'Sat', val: 72, label: '72 bpm', alert: false },
    { day: 'Sun', val: 88, label: '88 bpm', alert: false },
  ];

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <LineChart color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.health_chart', 'Health Vital Chart')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName} • {t('mobile.last_7_days', 'Last 7 Days')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* Metric Switcher */}
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

            {/* Visual Bar / Point Trend Card */}
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

              {/* Chart Visualization Simulation */}
              <View style={tw('flex-row justify-between items-end h-40 pt-6 pb-2 border-b border-slate-200 dark:border-slate-800')}>
                {(activeMetric === 'bp' ? bpData : activeMetric === 'glucose' ? glucoseData : hrData).map((item, idx) => {
                  const heightPercent =
                    activeMetric === 'bp'
                      ? Math.min(100, Math.max(30, (item as any).sys - 80))
                      : activeMetric === 'glucose'
                      ? Math.min(100, Math.max(30, (item as any).val - 50))
                      : Math.min(100, Math.max(30, (item as any).val - 30));

                  return (
                    <View key={idx} style={tw('items-center flex-1')}>
                      <Text style={tw('text-[9px] font-bold text-slate-500 dark:text-slate-400 mb-1')}>
                        {activeMetric === 'bp' ? (item as any).sys : (item as any).val}
                      </Text>
                      <View
                        style={[
                          tw(
                            `w-5 rounded-t-lg ${
                              item.alert ? 'bg-red-500' : 'bg-emerald-500 dark:bg-emerald-600'
                            }`
                          ),
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

              {/* Summary Stats */}
              <View style={tw('flex-row justify-between items-center mt-4 pt-2')}>
                <View>
                  <Text style={tw('text-xs text-slate-500')}>{t('mobile.weekly_avg', 'Weekly Avg')}</Text>
                  <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>
                    {activeMetric === 'bp' ? '142/91 mmHg' : activeMetric === 'glucose' ? '124 mg/dL' : '80 bpm'}
                  </Text>
                </View>
                <View>
                  <Text style={tw('text-xs text-slate-500')}>{t('mobile.peak_reading', 'Peak')}</Text>
                  <Text style={tw('font-bold text-sm text-red-500')}>
                    {activeMetric === 'bp' ? '165/100 mmHg' : activeMetric === 'glucose' ? '145 mg/dL' : '94 bpm'}
                  </Text>
                </View>
                <View>
                  <Text style={tw('text-xs text-slate-500')}>{t('mobile.target_compliance', 'Target Status')}</Text>
                  <Text style={tw('font-bold text-sm text-amber-500')}>3 {t('mobile.out_of_range', 'Alerts')}</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
