import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, ActivityIndicator } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, ClipboardCheck, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export type OverallStatus = 'improved' | 'stable' | 'worsened';
export type CheckInSeverity = 'none' | 'mild' | 'moderate' | 'severe';

export interface HealthCheckInPayload {
  overallStatus: OverallStatus;
  severity: CheckInSeverity;
  symptomCodes: string[];
}

interface HealthCheckInTaskModalProps {
  visible: boolean;
  onClose: () => void;
  taskTitle?: string;
  allowedSymptomCodes?: string[];
  responseConfigured?: boolean;
  onSubmit: (payload: HealthCheckInPayload) => Promise<void> | void;
}

const SYMPTOM_ALLOWLIST = [
  { code: 'headache', key: 'mobile.sym_headache', fallback: 'Headache' },
  { code: 'dizziness', key: 'mobile.sym_dizziness', fallback: 'Dizziness' },
  { code: 'chest_discomfort', key: 'mobile.sym_chest_discomfort', fallback: 'Chest Discomfort' },
  { code: 'shortness_of_breath', key: 'mobile.sym_shortness_of_breath', fallback: 'Shortness of Breath' },
  { code: 'fatigue', key: 'mobile.sym_fatigue', fallback: 'Unusual Fatigue' },
  { code: 'blurred_vision', key: 'mobile.sym_blurred_vision', fallback: 'Blurred Vision' },
  { code: 'nausea', key: 'mobile.sym_nausea', fallback: 'Nausea' },
  { code: 'palpitations', key: 'mobile.sym_palpitations', fallback: 'Heart Palpitations' },
];

export const HealthCheckInTaskModal: React.FC<HealthCheckInTaskModalProps> = ({
  visible,
  onClose,
  taskTitle,
  allowedSymptomCodes,
  responseConfigured = true,
  onSubmit,
}) => {
  const { t } = useTranslation();
  useThemeContext();

  const [overallStatus, setOverallStatus] = useState<OverallStatus>('stable');
  const [severity, setSeverity] = useState<CheckInSeverity>('none');
  const [symptomCodes, setSymptomCodes] = useState<string[]>([]);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const visibleSymptoms =
    allowedSymptomCodes && allowedSymptomCodes.length > 0
      ? SYMPTOM_ALLOWLIST.filter((s) => allowedSymptomCodes.includes(s.code))
      : SYMPTOM_ALLOWLIST;

  const handleSelectSeverity = (nextSeverity: CheckInSeverity) => {
    setSeverity(nextSeverity);
    setValidationError(null);
    if (nextSeverity === 'none') {
      setSymptomCodes([]);
    }
  };

  const toggleSymptom = (code: string) => {
    setValidationError(null);
    if (severity === 'none') {
      setSeverity('mild');
    }
    setSymptomCodes((prev) => {
      if (prev.includes(code)) {
        const next = prev.filter((c) => c !== code);
        if (next.length === 0 && severity !== 'none') {
          setSeverity('none');
        }
        return next;
      }
      if (prev.length >= 8) return prev;
      return [...prev, code];
    });
  };

  const handleConfirm = async () => {
    if (isSubmitting || !responseConfigured) return;

    if (severity === 'none' && symptomCodes.length > 0) {
      setValidationError(
        t(
          'mobile.checkin_err_none_with_symptoms',
          'When severity is None, no symptoms can be selected.'
        )
      );
      return;
    }
    if (severity !== 'none' && symptomCodes.length === 0) {
      setValidationError(
        t(
          'mobile.checkin_err_require_symptom',
          'Please select at least 1 symptom when severity is not None.'
        )
      );
      return;
    }

    setIsSubmitting(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 260));
      const payload: HealthCheckInPayload = {
        overallStatus,
        severity,
        symptomCodes: severity === 'none' ? [] : symptomCodes,
      };
      await onSubmit(payload);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t(
          'mobile.checkin_submitted_desc',
          'Routine symptom check-in submitted successfully.'
        ),
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  const statusOptions: { id: OverallStatus; label: string }[] = [
    {
      id: 'improved',
      label: t('mobile.status_improved', 'Improved'),
    },
    {
      id: 'stable',
      label: t('mobile.status_stable', 'Stable'),
    },
    {
      id: 'worsened',
      label: t('mobile.status_worsened', 'Worsened'),
    },
  ];

  const severityOptions: { id: CheckInSeverity; label: string }[] = [
    { id: 'none', label: t('mobile.sev_none', 'None') },
    { id: 'mild', label: t('mobile.sev_mild', 'Mild') },
    { id: 'moderate', label: t('mobile.sev_moderate', 'Moderate') },
    { id: 'severe', label: t('mobile.sev_severe', 'Severe') },
  ];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-indigo-100 dark:bg-indigo-900/40 items-center justify-center mr-3')}>
                <ClipboardCheck color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={22} />
              </View>
              <View style={tw('flex-1')}>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                  {taskTitle || t('mobile.health_check_in_title', 'Routine Symptom Check-in')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {t('mobile.structured_only', 'Structured daily health assessment')}
                </Text>
              </View>
            </View>
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={onClose}
              style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
            >
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          {!responseConfigured ? (
            <View style={tw('p-6 items-center')}>
              <View style={tw('w-12 h-12 rounded-full bg-amber-100 dark:bg-amber-900/30 items-center justify-center mb-3')}>
                <AlertCircle color="#f59e0b" size={24} />
              </View>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white text-center mb-1')}>
                {t('mobile.checkin_not_configured_title', 'Check-in Form Unavailable')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center leading-5')}>
                {t(
                  'mobile.checkin_not_configured_desc',
                  'This symptom check-in form is currently being updated by your care team. Please try again later.'
                )}
              </Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
              {/* 1. Overall Status */}
              <View>
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5')}>
                  1. {t('mobile.overall_status_label', 'Overall Health Status Today')}
                </Text>
                <View style={tw('gap-2')}>
                  {statusOptions.map((opt) => {
                    const active = overallStatus === opt.id;
                    return (
                      <TouchableOpacity
                        key={opt.id}
                        onPress={() => setOverallStatus(opt.id)}
                        style={tw(
                          `p-3.5 rounded-2xl border flex-row items-center justify-between ${
                            active
                              ? 'bg-indigo-50 dark:bg-indigo-950/40 border-indigo-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          }`
                        )}
                      >
                        <Text
                          style={tw(
                            `text-sm font-bold ${
                              active ? 'text-indigo-700 dark:text-indigo-300' : 'text-slate-700 dark:text-slate-300'
                            }`
                          )}
                        >
                          {opt.label}
                        </Text>
                        {active && <CheckCircle2 color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={18} />}
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 2. Severity */}
              <View>
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5')}>
                  2. {t('mobile.severity_label', 'Symptom Severity')}
                </Text>
                <View style={tw('flex-row flex-wrap gap-2')}>
                  {severityOptions.map((sev) => {
                    const active = severity === sev.id;
                    return (
                      <TouchableOpacity
                        key={sev.id}
                        onPress={() => handleSelectSeverity(sev.id)}
                        style={tw(
                          `px-3.5 py-2.5 rounded-xl border ${
                            active
                              ? sev.id === 'severe'
                                ? 'bg-rose-600 border-rose-600'
                                : 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          }`
                        )}
                      >
                        <Text
                          style={tw(
                            `text-xs font-bold ${
                              active
                                ? sev.id === 'severe'
                                  ? 'text-white'
                                  : 'text-white dark:text-slate-900'
                                : 'text-slate-700 dark:text-slate-300'
                            }`
                          )}
                        >
                          {sev.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {/* 3. Reported Symptoms */}
              <View>
                <View style={tw('flex-row justify-between items-center mb-2.5')}>
                  <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400')}>
                    3. {t('mobile.symptom_codes_label', 'Reported Symptoms')}
                  </Text>
                  <Text style={tw('text-xs font-semibold text-indigo-600 dark:text-indigo-400')}>
                    {symptomCodes.length}/8
                  </Text>
                </View>

                {severity === 'none' && (
                  <View style={tw('bg-emerald-50 dark:bg-emerald-950/30 p-3 rounded-xl border border-emerald-200 dark:border-emerald-800/50 mb-3 flex-row items-center')}>
                    <ShieldCheck color="#10b981" size={16} style={tw('mr-2')} />
                    <Text style={tw('text-xs text-emerald-800 dark:text-emerald-300 flex-1')}>
                      {t(
                        'mobile.severity_none_hint',
                        'You selected no symptoms. Selecting any symptom below will automatically set severity to Mild.'
                      )}
                    </Text>
                  </View>
                )}

                <View style={tw('flex-row flex-wrap gap-2')}>
                  {visibleSymptoms.map((sym) => {
                    const selected = symptomCodes.includes(sym.code);
                    return (
                      <TouchableOpacity
                        key={sym.code}
                        onPress={() => toggleSymptom(sym.code)}
                        style={tw(
                          `px-3.5 py-2.5 rounded-xl border flex-row items-center ${
                            selected
                              ? 'bg-amber-50 dark:bg-amber-950/40 border-amber-500'
                              : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                          }`
                        )}
                      >
                        <Text
                          style={tw(
                            `text-xs font-semibold ${
                              selected ? 'text-amber-800 dark:text-amber-300 font-bold' : 'text-slate-700 dark:text-slate-300'
                            }`
                          )}
                        >
                          {t(sym.key, sym.fallback)}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>

              {validationError && (
                <View style={tw('bg-rose-50 dark:bg-rose-950/40 p-3.5 rounded-2xl border border-rose-200 dark:border-rose-800 flex-row items-center')}>
                  <AlertCircle color="#ef4444" size={18} style={tw('mr-2')} />
                  <Text style={tw('text-xs text-rose-700 dark:text-rose-300 font-semibold flex-1')}>{validationError}</Text>
                </View>
              )}
            </ScrollView>
          )}

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity
              disabled={isSubmitting}
              onPress={onClose}
              style={tw('flex-1 py-3.5 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
            >
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-sm')}>
                {t('mobile.cancel', 'Cancel')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              disabled={isSubmitting || !responseConfigured}
              onPress={handleConfirm}
              style={tw(
                `flex-1 py-3.5 rounded-xl bg-brand items-center justify-center flex-row ${
                  isSubmitting || !responseConfigured ? 'opacity-50' : ''
                }`
              )}
            >
              {isSubmitting && <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.submit_check_in', 'Submit Check-in')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
