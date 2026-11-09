import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, CheckCircle2, Clock } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface CareAlertItem {
  id: string;
  type: 'urgent' | 'attention';
  sourceType: 'vital_reading' | 'symptom_checkin';
  metricKey: string;
  value: string;
  reasonKey: string;
  time: string;
  acknowledged: boolean;
}

interface CareAlertsModalProps {
  visible: boolean;
  onClose: () => void;
  patientName?: string;
}

export const CareAlertsModal: React.FC<CareAlertsModalProps> = ({
  visible,
  onClose,
  patientName = 'Alex Johnson',
}) => {
  const { t } = useTranslation();
  const [busyId, setBusyId] = useState<string | null>(null);

  const [alerts, setAlerts] = useState<CareAlertItem[]>([
    {
      id: '1',
      type: 'urgent',
      sourceType: 'vital_reading',
      metricKey: 'mobile.blood_pressure',
      value: '165/100 mmHg',
      reasonKey: 'mobile.alert_reason_bp_critical',
      time: '08:30 AM',
      acknowledged: false,
    },
    {
      id: '2',
      type: 'attention',
      sourceType: 'symptom_checkin',
      metricKey: 'mobile.health_checkin_title',
      value: 'Moderate • Dizziness',
      reasonKey: 'mobile.alert_reason_symptom_dizziness',
      time: '07:45 AM',
      acknowledged: false,
    },
    {
      id: '3',
      type: 'attention',
      sourceType: 'vital_reading',
      metricKey: 'mobile.blood_glucose',
      value: '145 mg/dL',
      reasonKey: 'mobile.alert_reason_glucose_margin',
      time: '07:15 AM',
      acknowledged: true,
    },
  ]);

  const handleAcknowledge = async (id: string) => {
    if (busyId) return;
    setBusyId(id);
    try {
      await new Promise((resolve) => setTimeout(resolve, 200));
      setAlerts((prev) =>
        prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
      );
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.alert_acknowledged'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const handleAcknowledgeAll = async () => {
    if (busyId) return;
    setBusyId('all');
    try {
      await new Promise((resolve) => setTimeout(resolve, 240));
      setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.all_alerts_acknowledged'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3')}>
                <AlertTriangle color={twInstance.color('text-amber-600 dark:text-amber-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.care_alerts')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName} • {pendingCount} {t('mobile.active_pending')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-3')} showsVerticalScrollIndicator={false}>
            {alerts.map((alert) => (
              <View
                key={alert.id}
                style={tw(
                  `p-4 rounded-2xl border ${
                    alert.acknowledged
                      ? 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 opacity-60'
                      : alert.type === 'urgent'
                      ? 'bg-red-50/60 dark:bg-red-950/20 border-red-200 dark:border-red-900/40'
                      : 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/40'
                  }`
                )}
              >
                <View style={tw('flex-row justify-between items-start mb-1.5')}>
                  <View style={tw('flex-row items-center flex-wrap flex-1 mr-2')}>
                    <View
                      style={tw(
                        `w-2 h-2 rounded-full mr-2 ${
                          alert.type === 'urgent' ? 'bg-red-500' : 'bg-amber-500'
                        }`
                      )}
                    />
                    <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>
                      {t(alert.metricKey)}
                    </Text>
                    <View
                      style={tw(
                        `ml-2 px-2 py-0.5 rounded-full ${
                          alert.type === 'urgent'
                            ? 'bg-red-100 dark:bg-red-900/40'
                            : 'bg-amber-100 dark:bg-amber-900/40'
                        }`
                      )}
                    >
                      <Text
                        style={tw(
                          `text-[10px] font-bold ${
                            alert.type === 'urgent'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`
                        )}
                      >
                        {alert.type === 'urgent' ? t('mobile.urgent') : t('mobile.attention')}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                    {alert.value}
                  </Text>
                </View>

                <Text style={tw('text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 mb-1')}>
                  {alert.sourceType === 'symptom_checkin'
                    ? t('mobile.rule_source_symptom_checkin')
                    : t('mobile.rule_source_vital_readings')}
                </Text>

                <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-4 mb-3')}>
                  {t(alert.reasonKey)}
                </Text>

                <View style={tw('flex-row justify-between items-center pt-2 border-t border-slate-100 dark:border-slate-800')}>
                  <View style={tw('flex-row items-center')}>
                    <Clock color={twInstance.color('text-slate-400')} size={12} style={tw('mr-1')} />
                    <Text style={tw('text-[11px] text-slate-400')}>{alert.time}</Text>
                  </View>

                  {alert.acknowledged ? (
                    <View style={tw('flex-row items-center')}>
                      <CheckCircle2 color={twInstance.color('text-emerald-500')} size={14} style={tw('mr-1')} />
                      <Text style={tw('text-xs font-semibold text-emerald-600 dark:text-emerald-400')}>
                        {t('mobile.acknowledged')}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      disabled={busyId !== null}
                      onPress={() => handleAcknowledge(alert.id)}
                      style={tw(`bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg ${busyId === alert.id ? 'opacity-60' : ''}`)}
                    >
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                        {t('mobile.acknowledge')}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.close')}</Text>
            </TouchableOpacity>
            {pendingCount > 0 && (
              <TouchableOpacity
                disabled={busyId !== null}
                onPress={handleAcknowledgeAll}
                style={tw(`flex-1 bg-brand py-3.5 rounded-xl items-center ${busyId === 'all' ? 'opacity-60' : ''}`)}
              >
                <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.acknowledge_all')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
