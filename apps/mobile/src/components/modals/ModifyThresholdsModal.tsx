import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, Switch, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Settings2, Save, AlertTriangle, RotateCcw, Info } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface ModifyThresholdsModalProps {
  visible: boolean;
  onClose: () => void;
  patientName?: string;
  onSaved?: (thresholds: any) => void;
}

export const ModifyThresholdsModal: React.FC<ModifyThresholdsModalProps> = ({
  visible,
  onClose,
  patientName = 'Alex Johnson',
  onSaved,
}) => {
  const { t } = useTranslation();

  const [useCustomThresholds, setUseCustomThresholds] = useState(true);
  const [systolicMax, setSystolicMax] = useState('140');
  const [systolicMin, setSystolicMin] = useState('90');
  const [diastolicMax, setDiastolicMax] = useState('90');
  const [diastolicMin, setDiastolicMin] = useState('60');
  const [glucoseFastingMax, setGlucoseFastingMax] = useState('130');
  const [glucosePostMealMax, setGlucosePostMealMax] = useState('180');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleResetDefaults = () => {
    setSystolicMax('140');
    setSystolicMin('90');
    setDiastolicMax('90');
    setDiastolicMin('60');
    setGlucoseFastingMax('130');
    setGlucosePostMealMax('180');
    setUseCustomThresholds(false);
    Toast.show({
      type: 'info',
      text1: t('mobile.reset_complete', 'Defaults Restored'),
      text2: t('mobile.restored_standard_thresholds', 'Standard clinical protocol thresholds restored'),
    });
  };

  const handleSave = () => {
    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.thresholds_updated', 'Telemetry alert thresholds updated for this patient'),
      });
      if (onSaved) {
        onSaved({
          useCustomThresholds,
          systolicMax,
          systolicMin,
          diastolicMax,
          diastolicMin,
          glucoseFastingMax,
          glucosePostMealMax,
        });
      }
      onClose();
    }, 600);
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={tw('flex-1 justify-end bg-black/60')}
      >
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-amber-100 dark:bg-amber-900/40 items-center justify-center mr-3')}>
                <Settings2 color={twInstance.color('text-amber-600 dark:text-amber-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.modify_thresholds', 'Modify Thresholds')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* Custom Override Toggle */}
            <View style={tw('bg-amber-50 dark:bg-amber-950/30 p-4 rounded-2xl border border-amber-200 dark:border-amber-800/50 flex-row items-center justify-between')}>
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('font-bold text-sm text-amber-900 dark:text-amber-200 mb-0.5')}>
                  {t('mobile.custom_patient_override', 'Custom Patient Override')}
                </Text>
                <Text style={tw('text-xs text-amber-700 dark:text-amber-300 leading-4')}>
                  {t('mobile.custom_override_desc', 'Override global care program thresholds with tailored clinical margins.')}
                </Text>
              </View>
              <Switch
                value={useCustomThresholds}
                onValueChange={setUseCustomThresholds}
                trackColor={{ false: '#cbd5e1', true: '#f59e0b' }}
                thumbColor="#ffffff"
              />
            </View>

            {/* Blood Pressure Thresholds */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
              <Text style={tw('font-bold text-sm text-slate-900 dark:text-white mb-3')}>
                {t('mobile.blood_pressure_thresholds', 'Blood Pressure Margins (mmHg)')}
              </Text>

              <View style={tw('flex-row gap-3 mb-3')}>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                    {t('mobile.systolic_max', 'Systolic Upper Alert')}
                  </Text>
                  <TextInput
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white')}
                    value={systolicMax}
                    onChangeText={setSystolicMax}
                    keyboardType="numeric"
                    editable={useCustomThresholds}
                  />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                    {t('mobile.systolic_min', 'Systolic Lower Alert')}
                  </Text>
                  <TextInput
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white')}
                    value={systolicMin}
                    onChangeText={setSystolicMin}
                    keyboardType="numeric"
                    editable={useCustomThresholds}
                  />
                </View>
              </View>

              <View style={tw('flex-row gap-3')}>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                    {t('mobile.diastolic_max', 'Diastolic Upper Alert')}
                  </Text>
                  <TextInput
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white')}
                    value={diastolicMax}
                    onChangeText={setDiastolicMax}
                    keyboardType="numeric"
                    editable={useCustomThresholds}
                  />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                    {t('mobile.diastolic_min', 'Diastolic Lower Alert')}
                  </Text>
                  <TextInput
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white')}
                    value={diastolicMin}
                    onChangeText={setDiastolicMin}
                    keyboardType="numeric"
                    editable={useCustomThresholds}
                  />
                </View>
              </View>
            </View>

            {/* Blood Glucose Thresholds */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800')}>
              <Text style={tw('font-bold text-sm text-slate-900 dark:text-white mb-3')}>
                {t('mobile.glucose_thresholds', 'Blood Glucose Margins (mg/dL)')}
              </Text>

              <View style={tw('flex-row gap-3')}>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                    {t('mobile.fasting_glucose_max', 'Fasting Target Max')}
                  </Text>
                  <TextInput
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white')}
                    value={glucoseFastingMax}
                    onChangeText={setGlucoseFastingMax}
                    keyboardType="numeric"
                    editable={useCustomThresholds}
                  />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-1')}>
                    {t('mobile.postprandial_max', 'Post-Meal Target Max')}
                  </Text>
                  <TextInput
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-2.5 font-bold text-slate-900 dark:text-white')}
                    value={glucosePostMealMax}
                    onChangeText={setGlucosePostMealMax}
                    keyboardType="numeric"
                    editable={useCustomThresholds}
                  />
                </View>
              </View>
            </View>

            {/* Reset to Program Defaults */}
            <TouchableOpacity
              onPress={handleResetDefaults}
              style={tw('flex-row items-center justify-center p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900')}
            >
              <RotateCcw color={twInstance.color('text-slate-600 dark:text-slate-400')} size={16} style={tw('mr-2')} />
              <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300')}>
                {t('mobile.restore_defaults', 'Restore Program Standard Defaults')}
              </Text>
            </TouchableOpacity>
          </ScrollView>

          {/* Footer Actions */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}>
            <TouchableOpacity onPress={onClose} style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.cancel', 'Cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={handleSave} disabled={isSubmitting} style={tw('flex-1 bg-brand py-3.5 rounded-xl items-center flex-row justify-center')}>
              <Save color="#0f172a" size={18} style={tw('mr-1.5')} />
              <Text style={tw('text-slate-900 font-bold text-sm')}>
                {isSubmitting ? t('mobile.saving', 'Saving...') : t('mobile.save_thresholds', 'Save Thresholds')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
