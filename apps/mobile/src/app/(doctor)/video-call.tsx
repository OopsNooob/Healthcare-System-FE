import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Image, StatusBar, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageCircle, FileText, ChevronDown, BrainCircuit, Activity, Save, LineChart, AlertTriangle } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import Toast from 'react-native-toast-message';
import { AiSummaryModal, HealthChartModal, CareAlertsModal } from '@/components/modals';

export default function DoctorVideoCallScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();

  const [notesVisible, setNotesVisible] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');
  const [aiSummaryModalVisible, setAiSummaryModalVisible] = useState(false);
  const [healthChartModalVisible, setHealthChartModalVisible] = useState(false);
  const [careAlertsModalVisible, setCareAlertsModalVisible] = useState(false);

  const [isMuted, setIsMuted] = useState(false);
  const [isVideoOff, setIsVideoOff] = useState(false);

  const checkAndRequestMicPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const isAlreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.RECORD_AUDIO);
      if (isAlreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
        {
          title: t('mobile.mic_perm_title', 'Microphone Permission'),
          message: t('mobile.mic_perm_desc', 'App needs microphone access for the video call.'),
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('Mic permission error:', e);
      return false;
    }
  };

  const checkAndRequestCameraPermission = async (): Promise<boolean> => {
    if (Platform.OS !== 'android') return true;
    try {
      const isAlreadyGranted = await PermissionsAndroid.check(PermissionsAndroid.PERMISSIONS.CAMERA);
      if (isAlreadyGranted) return true;

      const granted = await PermissionsAndroid.request(
        PermissionsAndroid.PERMISSIONS.CAMERA,
        {
          title: t('mobile.camera_perm_title', 'Camera Permission'),
          message: t('mobile.video_camera_perm_desc', 'App needs camera access for video consultation.'),
          buttonPositive: 'OK',
        }
      );
      return granted === PermissionsAndroid.RESULTS.GRANTED;
    } catch (e) {
      console.warn('Camera permission error:', e);
      return false;
    }
  };

  const handleToggleMic = async () => {
    if (isMuted) {
      const hasPerm = await checkAndRequestMicPermission();
      if (!hasPerm) {
        Alert.alert(
          t('mobile.permission_required', 'Permission Required'),
          t('mobile.mic_perm_denied_desc', 'Please enable microphone permission in device settings to speak.'),
          [
            { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
            { text: t('mobile.settings', 'Settings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setIsMuted(false);
    } else {
      setIsMuted(true);
    }
  };

  const handleToggleVideo = async () => {
    if (isVideoOff) {
      const hasPerm = await checkAndRequestCameraPermission();
      if (!hasPerm) {
        Alert.alert(
          t('mobile.permission_required', 'Permission Required'),
          t('mobile.camera_perm_denied_desc', 'Please enable camera permission in device settings to show video.'),
          [
            { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
            { text: t('mobile.settings', 'Settings'), onPress: () => Linking.openSettings() },
          ]
        );
        return;
      }
      setIsVideoOff(false);
    } else {
      setIsVideoOff(true);
    }
  };

  return (
    <View style={tw('flex-1 bg-slate-900 relative')}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Video (Patient) */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=1000&auto=format&fit=crop' }} 
        style={tw(`absolute inset-0 w-full opacity-80 ${notesVisible ? 'h-1/2' : 'h-full'}`)}
        resizeMode="cover"
      />
      
      <SafeAreaView style={tw('flex-1 justify-between')}>
        {/* Top Header */}
        <View style={tw('flex-row justify-between items-start px-6 pt-6')}>
          <View>
            <View style={tw('bg-black/40 px-3 py-1.5 rounded-full flex-row items-center gap-2 mb-2 self-start')}>
              <View style={tw('w-2 h-2 rounded-full bg-red-500')} />
              <Text style={tw('text-white text-xs font-medium')}>{t('mobile.1024', `10:24`)}</Text>
            </View>
            <Text style={tw('text-white text-xl font-bold shadow-sm')}>{t('mobile.alex_johnson', `Alex Johnson`)}</Text>
            <Text style={tw('text-blue-400 text-sm font-medium')}>{t('mobile.patient_28_yrs', `Patient • 28 yrs`)}</Text>
          </View>
          
          <View style={tw('flex-row gap-2')}>
            <TouchableOpacity 
              onPress={() => setNotesVisible(!notesVisible)}
              style={tw(`w-10 h-10 rounded-full items-center justify-center ${notesVisible ? 'bg-brand' : 'bg-black/40'}`)}
            >
              <FileText color={notesVisible ? "#0f172a" : "#ffffff"} size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Area (when not split) */}
        {!notesVisible && (
          <View style={tw('px-6 pb-10')}>
            {/* Doctor PIP */}
            <View style={tw('w-28 h-40 bg-gray-800 rounded-2xl overflow-hidden mb-6 self-end border-2 border-white/20 items-center justify-center relative')}>
              {!isVideoOff ? (
                <Image 
                  source={{ uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop' }} 
                  style={tw('w-full h-full')}
                />
              ) : (
                <View style={tw('items-center justify-center p-2')}>
                  <VideoOff color="#94a3b8" size={26} />
                  <Text style={tw('text-[11px] text-slate-300 font-medium mt-1.5 text-center')}>
                    {t('mobile.camera_off', 'Camera off')}
                  </Text>
                </View>
              )}
              {isMuted && (
                <View style={tw('absolute top-2 right-2 w-6 h-6 rounded-full bg-red-600 items-center justify-center')}>
                  <MicOff color="#ffffff" size={12} />
                </View>
              )}
            </View>

            {/* Controls */}
            <View style={tw('flex-row justify-between items-center bg-black/60 p-6 rounded-full')}>
              {/* Mic Toggle */}
              <TouchableOpacity 
                onPress={handleToggleMic}
                style={tw(`w-12 h-12 rounded-full items-center justify-center ${isMuted ? 'bg-red-500' : 'bg-white/20'}`)}
              >
                {isMuted ? <MicOff color="#ffffff" size={24} /> : <Mic color="#ffffff" size={24} />}
              </TouchableOpacity>

              {/* Video Toggle */}
              <TouchableOpacity 
                onPress={handleToggleVideo}
                style={tw(`w-12 h-12 rounded-full items-center justify-center ${isVideoOff ? 'bg-red-500' : 'bg-white/20'}`)}
              >
                {isVideoOff ? <VideoOff color="#ffffff" size={24} /> : <Video color="#ffffff" size={24} />}
              </TouchableOpacity>

              {/* Chat with Patient */}
              <TouchableOpacity 
                onPress={() => router.push('/(doctor)/chat/1')}
                style={tw('w-12 h-12 rounded-full bg-white/20 items-center justify-center')}
              >
                <MessageCircle color="#ffffff" size={24} />
              </TouchableOpacity>

              {/* End Call */}
              <TouchableOpacity 
                style={tw('w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg')}
                onPress={() => router.back('/(doctor)/consultations')}
              >
                <PhoneOff color="#ffffff" size={28} />
              </TouchableOpacity>
            </View>
          </View>
        )}
      </SafeAreaView>

      {/* Clinical Notes Drawer (Split Screen Effect) */}
      <Modal visible={notesVisible} transparent={true} animationType="slide">
        <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={tw('flex-1 justify-end')}>
          <View style={tw('h-1/2 bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800')}>
            {/* Drawer Handle & Header */}
            <View style={tw('px-6 py-4 border-b border-slate-100 dark:border-slate-800 flex-row justify-between items-center')}>
              <Text style={tw('font-bold text-lg text-slate-900 dark:text-white')}>{t('mobile.clinical_notes', 'Clinical Notes')}</Text>
              <TouchableOpacity onPress={() => setNotesVisible(false)} style={tw('p-2')}>
                <ChevronDown color={twInstance.color('text-slate-500')} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={tw('p-6')} showsVerticalScrollIndicator={false}>
              {/* Quick Health Snapshot */}
              <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 border border-slate-100 dark:border-slate-800')}>
                <View style={tw('flex-row items-center mb-4')}>
                  <View style={tw('w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mr-3')}>
                    <Activity color={twInstance.color('text-red-500')} size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-slate-500 text-xs font-bold uppercase tracking-wider')}>{t('mobile.latest_bp', 'Latest BP')}</Text>
                    <Text style={tw('text-slate-900 dark:text-white font-bold text-base')}>165/100 <Text style={tw('text-sm text-red-500')}>({t('mobile.high', 'High')})</Text></Text>
                  </View>
                </View>
                
                {/* Quick Actions Row */}
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={tw('-mx-4')} contentContainerStyle={tw('px-4 gap-3')}>
                  <TouchableOpacity 
                    onPress={() => setAiSummaryModalVisible(true)} 
                    style={tw('bg-purple-100 dark:bg-purple-900/30 px-4 py-2.5 rounded-xl flex-row items-center border border-purple-200 dark:border-purple-800/50')}
                  >
                    <BrainCircuit color={twInstance.color('text-purple-600 dark:text-purple-400')} size={16} />
                    <Text style={tw('text-purple-700 dark:text-purple-300 font-bold ml-1.5 text-xs')}>{t('mobile.ai_summary', 'AI Summary')}</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    onPress={() => setHealthChartModalVisible(true)} 
                    style={tw('bg-blue-100 dark:bg-blue-900/30 px-4 py-2.5 rounded-xl flex-row items-center border border-blue-200 dark:border-blue-800/50')}
                  >
                    <LineChart color={twInstance.color('text-blue-600 dark:text-blue-400')} size={16} />
                    <Text style={tw('text-blue-700 dark:text-blue-300 font-bold ml-1.5 text-xs')}>{t('mobile.health_chart', 'Health Chart')}</Text>
                  </TouchableOpacity>

                  <TouchableOpacity 
                    onPress={() => setCareAlertsModalVisible(true)} 
                    style={tw('bg-amber-100 dark:bg-amber-900/30 px-4 py-2.5 rounded-xl flex-row items-center border border-amber-200 dark:border-amber-800/50')}
                  >
                    <AlertTriangle color={twInstance.color('text-amber-600 dark:text-amber-400')} size={16} />
                    <Text style={tw('text-amber-700 dark:text-amber-300 font-bold ml-1.5 text-xs')}>{t('mobile.care_alerts', 'Care Alerts')}</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              {/* Note Input */}
              <Text style={tw('font-bold text-slate-700 dark:text-slate-300 mb-2')}>{t('mobile.consultation_notes', 'Consultation Notes')}</Text>
              <TextInput
                style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-2xl p-4 text-slate-900 dark:text-white h-32')}
                placeholder={t('mobile.write_clinical_notes', 'Write clinical observations here...')}
                placeholderTextColor={twInstance.color('text-slate-400')}
                multiline
                textAlignVertical="top"
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
              />
              
              <TouchableOpacity onPress={() => {
                Toast.show({ type: 'success', text1: t('mobile.success', 'Success'), text2: t('mobile.clinical_notes_saved', 'Clinical notes saved') });
                setClinicalNotes('');
              }} style={tw('bg-brand flex-row items-center justify-center p-4 rounded-xl mt-4')}>
                <Save color="#0f172a" size={20} />
                <Text style={tw('text-slate-900 font-bold ml-2')}>{t('mobile.save_notes', 'Save Notes')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* In-Call Modals */}
      <AiSummaryModal
        visible={aiSummaryModalVisible}
        onClose={() => setAiSummaryModalVisible(false)}
        patientName="Alex Johnson"
        programName={t('mobile.hypertension_program', 'Hypertension Management')}
        baseline="145/95 mmHg"
        current="165/100 mmHg"
        adherence={75}
      />

      <HealthChartModal
        visible={healthChartModalVisible}
        onClose={() => setHealthChartModalVisible(false)}
        patientName="Alex Johnson"
      />

      <CareAlertsModal
        visible={careAlertsModalVisible}
        onClose={() => setCareAlertsModalVisible(false)}
        patientName="Alex Johnson"
      />
    </View>
  );
}
