import React, { useState } from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, Stethoscope, Save, Clock, FileText, CheckCircle2 } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';

interface ClinicalNotesModalProps {
  visible: boolean;
  onClose: () => void;
  patientName?: string;
  onSaved?: (note: string) => void;
}

export const ClinicalNotesModal: React.FC<ClinicalNotesModalProps> = ({
  visible,
  onClose,
  patientName = 'Alex Johnson',
  onSaved,
}) => {
  const { t } = useTranslation();
  const [newNote, setNewNote] = useState('');
  const [diagnosisTag, setDiagnosisTag] = useState('Hypertension Stage 1 - Controlled');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pastNotes = [
    {
      id: '1',
      date: 'Oct 14, 2026',
      doctor: 'Dr. Sarah Connor',
      diagnosis: 'Hypertension Stage 1',
      content: 'Patient reports mild morning headaches. Blood pressure remains within acceptable margin. Continued current dosage of Amlodipine 5mg.',
    },
    {
      id: '2',
      date: 'Sep 28, 2026',
      doctor: 'Dr. Sarah Connor',
      diagnosis: 'Routine Chronic Checkup',
      content: 'Baseline telemetry review. Recommended daily salt restriction (<2g/day) and 30 minutes brisk walking.',
    },
  ];

  const handleSave = () => {
    if (!newNote.trim()) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.note_content_required', 'Please enter clinical observation content'),
      });
      return;
    }

    setIsSubmitting(true);
    setTimeout(() => {
      setIsSubmitting(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.clinical_note_saved', 'Clinical note saved to patient record'),
      });
      if (onSaved) onSaved(newNote);
      setNewNote('');
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
              <View style={tw('w-10 h-10 rounded-2xl bg-blue-100 dark:bg-blue-900/40 items-center justify-center mr-3')}>
                <Stethoscope color={twInstance.color('text-blue-600 dark:text-blue-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.clinical_notes', 'Clinical Notes')}
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
            {/* New Observation Section */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2')}>
                {t('mobile.add_new_observation', 'Add New Clinical Observation')}
              </Text>

              {/* Diagnosis tag input */}
              <View style={tw('mb-3')}>
                <Text style={tw('text-xs font-medium text-slate-600 dark:text-slate-400 mb-1')}>
                  {t('mobile.clinical_diagnosis_status', 'Clinical Assessment / Diagnosis')}
                </Text>
                <TextInput
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 text-sm text-slate-900 dark:text-white')}
                  value={diagnosisTag}
                  onChangeText={setDiagnosisTag}
                  placeholder={t('mobile.enter_diagnosis', 'Enter diagnosis...')}
                  placeholderTextColor={twInstance.color('text-slate-400')}
                />
              </View>

              {/* Observation Content */}
              <View>
                <Text style={tw('text-xs font-medium text-slate-600 dark:text-slate-400 mb-1')}>
                  {t('mobile.observations_and_orders', 'Observations & Treatment Directives')}
                </Text>
                <TextInput
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 text-sm text-slate-900 dark:text-white min-h-[110px]')}
                  value={newNote}
                  onChangeText={setNewNote}
                  placeholder={t('mobile.enter_clinical_notes_hint', 'Record symptoms, adherence observations, therapy adjustments...')}
                  placeholderTextColor={twInstance.color('text-slate-400')}
                  multiline
                  textAlignVertical="top"
                />
              </View>

              {/* Save Button */}
              <TouchableOpacity
                onPress={handleSave}
                disabled={isSubmitting}
                style={tw('bg-blue-600 py-3.5 rounded-xl items-center flex-row justify-center mt-3 shadow-sm')}
              >
                <Save color="#ffffff" size={18} style={tw('mr-2')} />
                <Text style={tw('text-white font-bold text-sm')}>
                  {isSubmitting ? t('mobile.saving', 'Saving...') : t('mobile.save_clinical_note', 'Save Clinical Note')}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Past Notes History */}
            <View>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3')}>
                {t('mobile.previous_clinical_records', 'Previous Clinical History')}
              </Text>

              <View style={tw('gap-3')}>
                {pastNotes.map((note) => (
                  <View
                    key={note.id}
                    style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}
                  >
                    <View style={tw('flex-row justify-between items-start mb-2')}>
                      <View>
                        <Text style={tw('font-bold text-sm text-slate-900 dark:text-white')}>{note.diagnosis}</Text>
                        <Text style={tw('text-xs text-slate-400 dark:text-slate-500 mt-0.5')}>{note.doctor}</Text>
                      </View>
                      <View style={tw('flex-row items-center bg-white dark:bg-slate-900 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-800')}>
                        <Clock color={twInstance.color('text-slate-400')} size={12} style={tw('mr-1')} />
                        <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 font-medium')}>{note.date}</Text>
                      </View>
                    </View>
                    <Text style={tw('text-xs text-slate-600 dark:text-slate-300 leading-5 mt-1')}>
                      {note.content}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('bg-slate-100 dark:bg-slate-800 py-3 rounded-xl items-center')}>
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>{t('mobile.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
};
