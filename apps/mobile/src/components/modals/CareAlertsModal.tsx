import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, AlertTriangle, CheckCircle2, Clock, AlertCircle } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface CareAlertItem {
  id: string;
  type: 'urgent' | 'attention';
  metric: string;
  value: string;
  reason: string;
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

  const [alerts, setAlerts] = useState<CareAlertItem[]>([
    {
      id: '1',
      type: 'urgent',
      metric: 'Blood Pressure',
      value: '165/100 mmHg',
      reason: 'Systolic exceeded critical threshold (>160 mmHg)',
      time: 'Today, 08:30 AM',
      acknowledged: false,
    },
    {
      id: '2',
      type: 'attention',
      metric: 'Blood Glucose',
      value: '145 mg/dL',
      reason: 'Fasting glucose above target margin (130 mg/dL)',
      time: 'Yesterday, 07:15 AM',
      acknowledged: false,
    },
    {
      id: '3',
      type: 'attention',
      metric: 'Medication Adherence',
      value: 'Missed Dose',
      reason: 'Evening Amlodipine dose unconfirmed for >4 hours',
      time: '2 days ago',
      acknowledged: true,
    },
  ]);

  const handleAcknowledge = (id: string) => {
    setAlerts((prev) =>
      prev.map((a) => (a.id === id ? { ...a, acknowledged: true } : a))
    );
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t('mobile.alert_acknowledged', 'Alert acknowledged and stamped'),
    });
  };

  const handleAcknowledgeAll = () => {
    setAlerts((prev) => prev.map((a) => ({ ...a, acknowledged: true })));
    Toast.show({
      type: 'success',
      text1: t('mobile.success', 'Success'),
      text2: t('mobile.all_alerts_acknowledged', 'All clinical alerts acknowledged'),
    });
  };

  const pendingCount = alerts.filter((a) => !a.acknowledged).length;

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[85%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3')}>
                <AlertTriangle color={twInstance.color('text-amber-600 dark:text-amber-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.care_alerts', 'Care Program Telemetry Alerts')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName} • {pendingCount} {t('mobile.active_pending', 'active pending')}
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
                <View style={tw('flex-row justify-between items-start mb-2')}>
                  <View style={tw('flex-row items-center')}>
                    <View
                      style={tw(
                        `w-2 h-2 rounded-full mr-2 ${
                          alert.type === 'urgent' ? 'bg-red-500' : 'bg-amber-500'
                        }`
                      )}
                    />
                    <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>
                      {alert.metric}
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
                        {alert.type === 'urgent'
                          ? t('mobile.urgent', 'Urgent')
                          : t('mobile.attention', 'Attention')}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                    {alert.value}
                  </Text>
                </View>

                <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-4 mb-3')}>
                  {alert.reason}
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
                        {t('mobile.acknowledged', 'Acknowledged')}
                      </Text>
                    </View>
                  ) : (
                    <TouchableOpacity
                      onPress={() => handleAcknowledge(alert.id)}
                      style={tw('bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg')}
                    >
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                        {t('mobile.acknowledge', 'Acknowledge')}
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
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.close', 'Close')}</Text>
            </TouchableOpacity>
            {pendingCount > 0 && (
              <TouchableOpacity
                onPress={handleAcknowledgeAll}
                style={tw('flex-1 bg-brand py-3.5 rounded-xl items-center')}
              >
                <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.acknowledge_all', 'Acknowledge All')}</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
