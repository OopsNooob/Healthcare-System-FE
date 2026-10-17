import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Trash2, AlertTriangle, ShieldAlert } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface VoidDataModalProps {
  visible: boolean;
  onClose: () => void;
  patientName?: string;
  metricLabel?: string;
  onVoidConfirm?: (reasonCode: string, note: string) => void;
}

export const VoidDataModal: React.FC<VoidDataModalProps> = ({
  visible,
  onClose,
  patientName = 'Alex Johnson',
  metricLabel = 'Latest Reading: 165/100 mmHg',
  onVoidConfirm,
}) => {
  const { t } = useTranslation();

  const reasonCodes = [
    { key: 'REASON_CALIBRATION_ERROR', label: t('mobile.reason_calibration_error', 'Device calibration / sensor error') },
    { key: 'REASON_PATIENT_POSTURE', label: t('mobile.reason_patient_posture', 'Improper measurement posture / post-exercise') },
    { key: 'REASON_DUPLICATE_ENTRY', label: t('mobile.reason_duplicate_entry', 'Duplicate / accidental entry') },
    { key: 'REASON_OTHER', label: t('mobile.reason_other', 'Other clinical reason') },
  ];

  const [selectedReason, setSelectedReason] = useState('REASON_CALIBRATION_ERROR');
  const [auditNote, setAuditNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleConfirm = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.data_voided_success', 'Metric entry voided and audit logged'),
      });
      if (onVoidConfirm) onVoidConfirm(selectedReason, auditNote);
      setAuditNote('');
      onClose();
    }, 600);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw('flex-1 justify-center items-center bg-black/65 px-4')}
      >
        <View style={tw('bg-white dark:bg-slate-900 rounded-3xl w-full max-w-sm border border-red-200 dark:border-red-900/50 overflow-hidden shadow-2xl')}>
          {/* Header Banner */}
          <View style={tw('bg-red-50 dark:bg-red-950/40 p-5 items-center border-b border-red-100 dark:border-red-900/30')}>
            <View style={tw('w-14 h-14 bg-red-100 dark:bg-red-900/50 rounded-full items-center justify-center mb-2')}>
              <ShieldAlert color="#ef4444" size={28} />
            </View>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {t('mobile.void_data_title', 'Void Telemetry Data')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>
              {patientName} • {metricLabel}
            </Text>
          </View>

          <View style={tw('p-5 gap-4')}>
            <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-4')}>
              {t(
                'mobile.void_warning_text',
                'Voiding this telemetry entry will exclude it from adherence scores and clinical risk calculations. An immutable audit record will be logged.'
              )}
            </Text>

            {/* Reason code selector */}
            <View>
              <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-2')}>
                {t('mobile.select_void_reason', 'Mandatory Reason Code')}
              </Text>
              <View style={tw('gap-2')}>
                {reasonCodes.map((r) => (
                  <TouchableOpacity
                    key={r.key}
                    onPress={() => setSelectedReason(r.key)}
                    style={tw(
                      `p-3 rounded-xl border flex-row items-center ${
                        selectedReason === r.key
                          ? 'border-red-500 bg-red-50/50 dark:bg-red-950/30'
                          : 'border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950'
                      }`
                    )}
                  >
                    <View
                      style={tw(
                        `w-4 h-4 rounded-full border items-center justify-center mr-2.5 ${
                          selectedReason === r.key ? 'border-red-500' : 'border-slate-400'
                        }`
                      )}
                    >
                      {selectedReason === r.key && <View style={tw('w-2 h-2 rounded-full bg-red-500')} />}
                    </View>
                    <Text
                      style={tw(
                        `text-xs font-medium flex-1 ${
                          selectedReason === r.key
                            ? 'text-red-700 dark:text-red-300 font-bold'
                            : 'text-slate-700 dark:text-slate-300'
                        }`
                      )}
                    >
                      {r.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Audit Note */}
            <View>
              <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1')}>
                {t('mobile.audit_explanation', 'Audit Explanation (Optional)')}
              </Text>
              <TextInput
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 text-xs text-slate-900 dark:text-white min-h-[60px]')}
                value={auditNote}
                onChangeText={setAuditNote}
                placeholder={t('mobile.enter_audit_explanation', 'Add additional notes for medical records...')}
                placeholderTextColor={twInstance.color('text-slate-400')}
                multiline
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3 bg-slate-50 dark:bg-slate-950/60')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-white dark:bg-slate-800 py-3 rounded-xl border border-slate-200 dark:border-slate-700 items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-xs')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleConfirm}
              disabled={isSubmitting}
              style={tw('flex-1 bg-red-600 py-3 rounded-xl items-center flex-row justify-center shadow-sm')}
            >
              <Trash2 color="#ffffff" size={16} style={tw('mr-1.5')} />
              <Text style={tw('text-white font-bold text-xs')}>
                {isSubmitting ? t('mobile.voiding', 'Voiding...') : t('mobile.confirm_void', 'Confirm Void')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
