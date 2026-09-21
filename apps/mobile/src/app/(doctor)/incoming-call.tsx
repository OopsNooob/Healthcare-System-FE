import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { PhoneOff, Video } from 'lucide-react-native';
import { tw } from '@/tw';
import { useRouter } from 'expo-router';

export default function IncomingCallScreen() {
  const { t } = useTranslation();

  const router = useRouter();

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-900 justify-between items-center py-20')}>
      <View style={tw('items-center mt-10')}>
        <Text style={tw('text-slate-400 dark:text-slate-500 text-lg mb-2 font-medium')}>{t('mobile.patient_calling', `Patient Calling...`)}</Text>
        <Text style={tw('text-white text-3xl font-bold mb-8')}>{t('mobile.alex_johnson', `Alex Johnson`)}</Text>
        
        <View style={tw('relative items-center justify-center')}>
          <View style={tw('absolute w-48 h-48 bg-emerald-500/20 rounded-full')} />
          <View style={tw('absolute w-40 h-40 bg-emerald-500/40 rounded-full')} />
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?img=12' }} 
            style={tw('w-32 h-32 rounded-full border-4 border-slate-900 z-10')} 
          />
        </View>
        <Text style={tw('text-emerald-400 text-base font-medium mt-10')}>{t('mobile.consultation_request', `Consultation Request`)}</Text>
      </View>

      <View style={tw('flex-row gap-8 mb-10')}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={tw('bg-red-500 w-16 h-16 rounded-full items-center justify-center')}
        >
          <PhoneOff color="white" size={32} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.replace('/(doctor)/video-call')}
          style={tw('bg-emerald-500 w-16 h-16 rounded-full items-center justify-center')}
        >
          <Video color="white" size={32} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
