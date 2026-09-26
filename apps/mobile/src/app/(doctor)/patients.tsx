import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, ScrollView, SafeAreaView, TextInput, Modal, RefreshControl, ActivityIndicator } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Search, UserPlus, FileText, ChevronRight, Activity, CalendarDays, BrainCircuit, Stethoscope, Settings2, Trash2, CheckCircle, ShieldAlert } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import Toast from 'react-native-toast-message';

export default function PatientsManagementScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();

  const [searchQuery, setSearchQuery] = useState('');
  const [enrollModalVisible, setEnrollModalVisible] = useState(false);
  const [selectedPatient, setSelectedPatient] = useState<any>(null);
  
  // Enroll Modal States
  const [selectedProgram, setSelectedProgram] = useState<string | null>(null);
  const [eligibilityStatus, setEligibilityStatus] = useState<'idle' | 'checking' | 'passed' | 'failed'>('idle');
  
  const patients = [
    { id: 1, name: 'Alex Johnson', program: 'Hypertension Management', adherence: 85, trend: 'Stable', baseline: '150/95', current: '135/85' },
    { id: 2, name: 'Maria Garcia', program: 'Diabetes Care', adherence: 60, trend: 'Warning', baseline: '180 mg/dL', current: '210 mg/dL' },
    { id: 3, name: 'James Smith', program: null, adherence: null, trend: null, baseline: null, current: null },
  ];

  const handleEnroll = (patient: any) => {
    setSelectedPatient(patient);
    setSelectedProgram(null);
    setEligibilityStatus('idle');
    setEnrollModalVisible(true);
  };

  const handleCheckEligibility = () => {
    setEligibilityStatus('checking');
    setTimeout(() => {
      setEligibilityStatus('passed');
    }, 1500);
  };

  const handleSendConsent = () => {
    setEnrollModalVisible(false);
    Toast.show({
      type: 'success',
      text1: 'Success',
      text2: 'Consent request sent to patient',
    });
  };

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    setTimeout(() => setLoading(false), 1200);
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 1200);
  };

  const filteredPatients = patients.filter(p => 
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.id.toString().includes(searchQuery)
  );

  const renderSkeleton = () => (
    <View style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800')}>
      <View style={tw('flex-row justify-between items-start mb-4')}>
        <View style={tw('flex-1')}>
          <View style={tw('w-1/2 h-5 bg-slate-200 dark:bg-slate-700 rounded mb-2')} />
          <View style={tw('w-1/3 h-6 bg-slate-200 dark:bg-slate-700 rounded-full mt-1')} />
        </View>
        <View style={tw('w-20 h-8 bg-slate-200 dark:bg-slate-700 rounded-xl')} />
      </View>
      <View style={tw('w-full h-[1px] bg-slate-100 dark:bg-slate-800 mb-4')} />
      <View style={tw('w-32 h-4 bg-slate-200 dark:bg-slate-700 rounded self-end')} />
    </View>
  );

  const renderEmptyState = () => (
    <View style={tw('items-center justify-center py-20')}>
      <View style={tw('w-20 h-20 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mb-4')}>
        <UserPlus color={twInstance.color('text-slate-400')} size={32} />
      </View>
      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-2')}>{t('mobile.no_patients_found', 'No patients found')}</Text>
      <Text style={tw('text-slate-500 text-center px-6')}>{t('mobile.try_different_search_patients', 'Try adjusting your search by name or ID.')}</Text>
    </View>
  );

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <View style={tw('px-6 pt-6 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white mb-4')}>{t('mobile.patient_management', 'Patient Management')}</Text>
        <View style={tw('flex-row items-center bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl border border-slate-200 dark:border-slate-700')}>
          <Search color={twInstance.color('text-slate-400')} size={20} style={tw('mr-2')} />
          <TextInput
            style={tw('flex-1 text-base text-slate-900 dark:text-white')}
            placeholder={t('mobile.search_patients', 'Search by name or ID...')}
            placeholderTextColor={twInstance.color('text-slate-400')}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      <ScrollView 
        contentContainerStyle={tw('p-6 pb-20')} 
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={twInstance.color('text-slate-900 dark:text-white')} />}
      >
        {loading ? (
          <>
            {renderSkeleton()}
            {renderSkeleton()}
            {renderSkeleton()}
          </>
        ) : filteredPatients.length > 0 ? (
          filteredPatients.map((patient) => (
            <View key={patient.id} style={tw('bg-white dark:bg-slate-900 rounded-3xl p-5 mb-4 shadow-sm border border-slate-200 dark:border-slate-800')}>
              <View style={tw('flex-row justify-between items-start mb-4')}>
                <View>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>{patient.name}</Text>
                  {patient.program ? (
                    <View style={tw('bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-full mt-2 self-start')}>
                      <Text style={tw('text-xs font-bold text-indigo-600 dark:text-indigo-400')}>{patient.program}</Text>
                    </View>
                  ) : (
                    <View style={tw('bg-slate-100 dark:bg-slate-800 px-3 py-1 rounded-full mt-2 self-start')}>
                      <Text style={tw('text-xs font-medium text-slate-500 dark:text-slate-400')}>{t('mobile.no_active_program', 'No Active Program')}</Text>
                    </View>
                  )}
                </View>
                {!patient.program && (
                  <TouchableOpacity 
                    onPress={() => handleEnroll(patient)}
                    style={tw('flex-row items-center bg-brand px-3 py-2 rounded-xl')}
                  >
                    <UserPlus color="#0f172a" size={16} />
                    <Text style={tw('text-slate-900 font-bold ml-1 text-sm')}>{t('mobile.enroll', 'Enroll')}</Text>
                  </TouchableOpacity>
                )}
              </View>

              {patient.program && (
                <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800')}>
                  <View style={tw('flex-row justify-between mb-3')}>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>{t('mobile.baseline', 'Baseline')}</Text>
                      <Text style={tw('font-bold text-slate-700 dark:text-slate-300')}>{patient.baseline}</Text>
                    </View>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>{t('mobile.current', 'Current')}</Text>
                      <Text style={tw('font-bold text-slate-900 dark:text-white')}>{patient.current}</Text>
                    </View>
                    <View>
                      <Text style={tw('text-xs text-slate-500')}>{t('mobile.adherence', 'Adherence')}</Text>
                      <Text style={tw(`font-bold ${patient.adherence! >= 80 ? 'text-emerald-500' : 'text-amber-500'}`)}>{patient.adherence}%</Text>
                    </View>
                  </View>

                  {/* Actions */}
                  <View style={tw('flex-row gap-2 mt-2 pt-3 border-t border-slate-200 dark:border-slate-800')}>
                    <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'AI Summary tapped' })} style={tw('flex-1 bg-white dark:bg-slate-900 flex-row items-center justify-center py-2 rounded-lg border border-slate-200 dark:border-slate-700')}>
                      <BrainCircuit color={twInstance.color('text-purple-500')} size={16} />
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>{t('mobile.ai_summary', 'AI Summary')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'Clinical Notes tapped' })} style={tw('flex-1 bg-white dark:bg-slate-900 flex-row items-center justify-center py-2 rounded-lg border border-slate-200 dark:border-slate-700')}>
                      <Stethoscope color={twInstance.color('text-blue-500')} size={16} />
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>{t('mobile.clinical_notes', 'Clinical Notes')}</Text>
                    </TouchableOpacity>
                  </View>
                  <View style={tw('flex-row gap-2 mt-2')}>
                    <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'Modify Thresholds tapped' })} style={tw('flex-1 bg-white dark:bg-slate-900 flex-row items-center justify-center py-2 rounded-lg border border-slate-200 dark:border-slate-700')}>
                      <Settings2 color={twInstance.color('text-amber-500')} size={16} />
                      <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-300 ml-1')}>{t('mobile.modify_thresholds', 'Modify Thresholds')}</Text>
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => {
                        Toast.show({ type: 'success', text1: 'Success', text2: 'Data voided' });
                    }} style={tw('flex-1 bg-red-50 dark:bg-red-900/10 flex-row items-center justify-center py-2 rounded-lg border border-red-100 dark:border-red-900/30')}>
                      <Trash2 color={twInstance.color('text-red-500')} size={16} />
                      <Text style={tw('text-xs font-bold text-red-500 ml-1')}>{t('mobile.void_data', 'Void Data')}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              )}
              
              <TouchableOpacity onPress={() => Toast.show({ type: 'info', text1: 'Info', text2: 'View Full Profile tapped' })} style={tw('flex-row justify-between items-center px-2')}>
                <Text style={tw('text-sm font-bold text-brand-dark dark:text-brand-light')}>{t('mobile.view_full_profile', 'View Full Profile')}</Text>
                <ChevronRight color={twInstance.color('text-brand-dark dark:text-brand-light')} size={20} />
              </TouchableOpacity>
            </View>
          ))
        ) : (
          renderEmptyState()
        )}
      </ScrollView>

      {/* Enroll Modal */}
      <Modal visible={enrollModalVisible} transparent={true} animationType="slide">
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <Text style={tw('text-xl font-bold text-slate-900 dark:text-white mb-2')}>{t('mobile.enroll_in_program', 'Enroll in Care Program')}</Text>
            <Text style={tw('text-slate-500 mb-6')}>{t('mobile.select_program_for', 'Select a program for')} {selectedPatient?.name}</Text>
            
            <TouchableOpacity 
              onPress={() => setSelectedProgram('hypertension')}
              style={tw(`p-4 rounded-2xl mb-3 border ${selectedProgram === 'hypertension' ? 'bg-brand/10 border-brand' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'}`)}
            >
              <Text style={tw(`font-bold text-lg ${selectedProgram === 'hypertension' ? 'text-brand-dark dark:text-brand-light' : 'text-slate-900 dark:text-white'}`)}>Hypertension Management</Text>
              <Text style={tw('text-sm text-slate-500 mt-1')}>BP tracking, medication reminders, diet tasks.</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={() => setSelectedProgram('diabetes')}
              style={tw(`p-4 rounded-2xl mb-6 border ${selectedProgram === 'diabetes' ? 'bg-brand/10 border-brand' : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-700'}`)}
            >
              <Text style={tw(`font-bold text-lg ${selectedProgram === 'diabetes' ? 'text-brand-dark dark:text-brand-light' : 'text-slate-900 dark:text-white'}`)}>Diabetes Care</Text>
              <Text style={tw('text-sm text-slate-500 mt-1')}>Glucose tracking, insulin reminders, foot checks.</Text>
            </TouchableOpacity>

            {/* Eligibility Status */}
            {selectedProgram && eligibilityStatus === 'passed' && (
               <View style={tw('flex-row items-center bg-emerald-50 dark:bg-emerald-900/30 p-3 rounded-xl mb-6')}>
                 <CheckCircle color="#10b981" size={20} style={tw('mr-2')} />
                 <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold')}>{t('mobile.eligibility_passed', 'Eligibility Passed')}</Text>
               </View>
            )}

            {selectedProgram && eligibilityStatus === 'failed' && (
               <View style={tw('flex-row items-center bg-red-50 dark:bg-red-900/30 p-3 rounded-xl mb-6')}>
                 <ShieldAlert color="#ef4444" size={20} style={tw('mr-2')} />
                 <Text style={tw('text-red-700 dark:text-red-400 font-bold')}>{t('mobile.eligibility_failed', 'Eligibility Failed')}</Text>
               </View>
            )}

            <View style={tw('flex-row gap-4')}>
              <TouchableOpacity onPress={() => setEnrollModalVisible(false)} style={tw('flex-1 p-4 items-center bg-slate-100 dark:bg-slate-800 rounded-2xl')}>
                <Text style={tw('font-bold text-slate-700 dark:text-slate-300')}>{t('mobile.cancel', 'Cancel')}</Text>
              </TouchableOpacity>
              
              {!selectedProgram ? (
                <TouchableOpacity disabled style={tw('flex-1 p-4 items-center bg-slate-200 dark:bg-slate-700 rounded-2xl opacity-50')}>
                  <Text style={tw('font-bold text-slate-400 dark:text-slate-500')}>{t('mobile.check_eligibility', 'Check Eligibility')}</Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'idle' ? (
                <TouchableOpacity onPress={handleCheckEligibility} style={tw('flex-1 p-4 items-center bg-blue-500 rounded-2xl')}>
                  <Text style={tw('font-bold text-white')}>{t('mobile.check_eligibility', 'Check Eligibility')}</Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'checking' ? (
                <TouchableOpacity disabled style={tw('flex-1 p-4 items-center bg-blue-500 rounded-2xl opacity-70 flex-row justify-center')}>
                  <ActivityIndicator color="white" size="small" style={tw('mr-2')} />
                  <Text style={tw('font-bold text-white')}>{t('mobile.check_eligibility', 'Check Eligibility')}</Text>
                </TouchableOpacity>
              ) : eligibilityStatus === 'passed' ? (
                <TouchableOpacity onPress={handleSendConsent} style={tw('flex-1 p-4 items-center bg-brand rounded-2xl')}>
                  <Text style={tw('font-bold text-slate-900')}>{t('mobile.send_consent', 'Send Consent Request')}</Text>
                </TouchableOpacity>
              ) : (
                 <TouchableOpacity disabled style={tw('flex-1 p-4 items-center bg-slate-200 dark:bg-slate-700 rounded-2xl opacity-50')}>
                  <Text style={tw('font-bold text-slate-400 dark:text-slate-500')}>{t('mobile.send_consent', 'Send Consent Request')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
