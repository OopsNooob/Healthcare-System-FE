import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, SafeAreaView, Image, StatusBar, Modal, ScrollView, TextInput, KeyboardAvoidingView, Platform } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { MicOff, Video, PhoneOff, Maximize, MessageCircle, FileText, ChevronDown, BrainCircuit, Activity, Save } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

export default function DoctorVideoCallScreen() {
  const { t } = useTranslation();
  const router = useRouter();

  const [notesVisible, setNotesVisible] = useState(false);
  const [clinicalNotes, setClinicalNotes] = useState('');

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
            <TouchableOpacity style={tw('w-10 h-10 bg-black/40 rounded-full items-center justify-center')}>
              <Maximize color="#ffffff" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Area (when not split) */}
        {!notesVisible && (
          <View style={tw('px-6 pb-10')}>
            {/* Doctor PIP */}
            <View style={tw('w-28 h-40 bg-gray-800 rounded-2xl overflow-hidden mb-6 self-end border-2 border-white/20')}>
              <Image 
                source={{ uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=400&auto=format&fit=crop' }} 
                style={tw('w-full h-full')}
              />
            </View>

            {/* Controls */}
            <View style={tw('flex-row justify-between items-center bg-black/60 p-6 rounded-full')}>
              <TouchableOpacity style={tw('w-12 h-12 rounded-full bg-white/20 items-center justify-center')}>
                <MicOff color="#ffffff" size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={tw('w-12 h-12 rounded-full bg-white/20 items-center justify-center')}>
                <Video color="#ffffff" size={24} />
              </TouchableOpacity>
              <TouchableOpacity style={tw('w-12 h-12 rounded-full bg-white/20 items-center justify-center')}>
                <MessageCircle color="#ffffff" size={24} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={tw('w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg')}
                onPress={() => router.back()}
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
              <View style={tw('bg-slate-50 dark:bg-slate-950 p-4 rounded-2xl mb-4 flex-row items-center justify-between border border-slate-100 dark:border-slate-800')}>
                <View style={tw('flex-row items-center')}>
                  <View style={tw('w-10 h-10 bg-red-100 dark:bg-red-900/30 rounded-full items-center justify-center mr-3')}>
                    <Activity color={twInstance.color('text-red-500')} size={20} />
                  </View>
                  <View>
                    <Text style={tw('text-slate-500 text-xs font-bold uppercase tracking-wider')}>{t('mobile.latest_bp', 'Latest BP')}</Text>
                    <Text style={tw('text-slate-900 dark:text-white font-bold text-base')}>165/100 <Text style={tw('text-sm text-red-500')}>(High)</Text></Text>
                  </View>
                </View>
                <TouchableOpacity style={tw('bg-purple-100 dark:bg-purple-900/30 px-3 py-2 rounded-xl flex-row items-center')}>
                  <BrainCircuit color={twInstance.color('text-purple-600 dark:text-purple-400')} size={16} />
                  <Text style={tw('text-purple-700 dark:text-purple-300 font-bold ml-1 text-xs')}>{t('mobile.ai_summary', 'AI Summary')}</Text>
                </TouchableOpacity>
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
              
              <TouchableOpacity style={tw('bg-brand flex-row items-center justify-center p-4 rounded-xl mt-4')}>
                <Save color="#0f172a" size={20} />
                <Text style={tw('text-slate-900 font-bold ml-2')}>{t('mobile.save_notes', 'Save Notes')}</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}
