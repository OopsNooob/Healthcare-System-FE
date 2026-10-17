import React from 'react';
import { View, Text, Modal, TouchableOpacity, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { X, User, Phone, MapPin, HeartPulse, ShieldCheck, Activity, Calendar, AlertCircle } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

interface PatientProfileModalProps {
  visible: boolean;
  onClose: () => void;
  patient?: any;
}

export const PatientProfileModal: React.FC<PatientProfileModalProps> = ({
  visible,
  onClose,
  patient,
}) => {
  const { t } = useTranslation();

  const mockPatient = patient || {
    name: 'Alex Johnson',
    age: 36,
    gender: 'Male',
    phone: '+1 234 567 890',
    email: 'alex.johnson@example.com',
    address: '123 Health Street, Ward 5, District 1, Metropolis',
    bloodType: 'O+',
    allergies: 'Penicillin, Shellfish',
    program: 'Hypertension Care Program',
    baseline: '145/95 mmHg',
    current: '138/88 mmHg',
    adherence: 85,
    enrolledDate: 'Aug 15, 2026',
    emergencyContact: 'Sarah Johnson (Spouse) - +1 234 567 891',
  };

  return (
    <Modal visible={visible} transparent={true} animationType="slide" onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800')}>
          {/* Header */}
          <View style={tw('p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center')}>
              <View style={tw('w-10 h-10 rounded-2xl bg-emerald-100 dark:bg-emerald-900/40 items-center justify-center mr-3')}>
                <User color={twInstance.color('text-emerald-600 dark:text-emerald-400')} size={22} />
              </View>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.patient_full_profile', 'Patient Dossier & History')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {mockPatient.name} • {mockPatient.gender}, {mockPatient.age} {t('mobile.years_old', 'yrs')}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={onClose} style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}>
              <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-5')} showsVerticalScrollIndicator={false}>
            {/* Hero Card */}
            <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex-row items-center gap-4')}>
              <Image
                source={{ uri: 'https://i.pravatar.cc/150?img=12' }}
                style={tw('w-16 h-16 rounded-2xl bg-slate-200 dark:bg-slate-700')}
              />
              <View style={tw('flex-1')}>
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-0.5')}>{mockPatient.name}</Text>
                <Text style={tw('text-xs text-brand font-medium mb-1.5')}>{mockPatient.program}</Text>
                <View style={tw('flex-row items-center gap-2')}>
                  <View style={tw('bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full')}>
                    <Text style={tw('text-[10px] font-bold text-emerald-700 dark:text-emerald-300')}>
                      {t('mobile.active_enrolled', 'Active Enrolled')}
                    </Text>
                  </View>
                  <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                    {t('mobile.blood_type', 'Blood')}: {mockPatient.bloodType}
                  </Text>
                </View>
              </View>
            </View>

            {/* Demographics & Contact */}
            <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3')}>
                {t('mobile.contact_and_identity', 'Contact & Identity')}
              </Text>
              <View style={tw('gap-2.5')}>
                <View style={tw('flex-row items-center')}>
                  <Phone color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-24')}>{t('mobile.phone', 'Phone')}:</Text>
                  <Text style={tw('text-xs font-medium text-slate-800 dark:text-slate-200 flex-1')}>{mockPatient.phone}</Text>
                </View>
                <View style={tw('flex-row items-center')}>
                  <MapPin color={twInstance.color('text-slate-400')} size={16} style={tw('mr-2.5')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-24')}>{t('mobile.address', 'Address')}:</Text>
                  <Text style={tw('text-xs font-medium text-slate-800 dark:text-slate-200 flex-1')}>{mockPatient.address}</Text>
                </View>
                <View style={tw('flex-row items-center')}>
                  <AlertCircle color={twInstance.color('text-amber-500')} size={16} style={tw('mr-2.5')} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 w-24')}>{t('mobile.emergency', 'Emergency')}:</Text>
                  <Text style={tw('text-xs font-medium text-slate-800 dark:text-slate-200 flex-1')}>{mockPatient.emergencyContact}</Text>
                </View>
              </View>
            </View>

            {/* Clinical & Allergies */}
            <View style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4')}>
              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500 mb-3')}>
                {t('mobile.clinical_baseline', 'Clinical Baseline & Allergies')}
              </Text>
              <View style={tw('gap-2.5')}>
                <View style={tw('flex-row justify-between py-1 border-b border-slate-100 dark:border-slate-800')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.known_allergies', 'Known Allergies')}</Text>
                  <Text style={tw('text-xs font-bold text-red-500')}>{mockPatient.allergies}</Text>
                </View>
                <View style={tw('flex-row justify-between py-1 border-b border-slate-100 dark:border-slate-800')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.baseline_survey_bp', 'Baseline Survey BP')}</Text>
                  <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}>{mockPatient.baseline}</Text>
                </View>
                <View style={tw('flex-row justify-between py-1 border-b border-slate-100 dark:border-slate-800')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.current_telemetry_avg', 'Current Telemetry Avg')}</Text>
                  <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200')}>{mockPatient.current}</Text>
                </View>
                <View style={tw('flex-row justify-between py-1')}>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>{t('mobile.program_adherence', 'Care Adherence')}</Text>
                  <Text style={tw('text-xs font-bold text-emerald-500')}>{mockPatient.adherence}%</Text>
                </View>
              </View>
            </View>
          </ScrollView>

          {/* Footer */}
          <View style={tw('p-4 border-t border-slate-100 dark:border-slate-800')}>
            <TouchableOpacity onPress={onClose} style={tw('bg-brand py-3.5 rounded-xl items-center')}>
              <Text style={tw('text-slate-900 font-bold text-sm')}>{t('mobile.close', 'Close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};
