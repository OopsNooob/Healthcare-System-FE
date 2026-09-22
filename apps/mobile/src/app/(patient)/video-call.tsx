import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, SafeAreaView, Image, StatusBar } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { MicOff, Video, PhoneOff, Maximize, MessageCircle } from 'lucide-react-native';
import { tw } from '@/tw';

export default function VideoCallScreen() {
  const { t } = useTranslation();

  const router = useRouter();

  return (
    <View style={tw('flex-1 bg-slate-900 relative')}>
      <StatusBar barStyle="light-content" />
      
      {/* Background Video (Doctor) */}
      <Image 
        source={{ uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1000&auto=format&fit=crop' }} 
        style={tw('absolute inset-0 w-full h-full opacity-80')}
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
            <Text style={tw('text-white text-xl font-bold shadow-sm')}>{t('mobile.dr_sarah_connor', `Dr. Sarah Connor`)}</Text>
            <Text style={tw('text-emerald-400 text-sm font-medium')}>{t('mobile.cardiologist', `Cardiologist`)}</Text>
          </View>
          
          <TouchableOpacity style={tw('w-10 h-10 bg-black/40 rounded-full items-center justify-center')}>
            <Maximize color="#ffffff" size={20} />
          </TouchableOpacity>
        </View>

        {/* Bottom Area */}
        <View style={tw('px-6 pb-10')}>
          {/* User PIP */}
          <View style={tw('w-28 h-40 bg-gray-800 rounded-2xl overflow-hidden mb-6 self-end border-2 border-white/20')}>
            <Image 
              source={{ uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop' }} 
              style={tw('w-full h-full')}
            />
          </View>

          {/* Controls */}
          <View style={tw('flex-row justify-between items-center bg-black/60 p-6 rounded-full')}>
            <TouchableOpacity style={tw('w-12 h-12 rounded-full bg-white/20 dark:bg-slate-900/20 items-center justify-center')}>
              <MicOff color="#ffffff" size={24} />
            </TouchableOpacity>
            
            <TouchableOpacity style={tw('w-12 h-12 rounded-full bg-white/20 dark:bg-slate-900/20 items-center justify-center')}>
              <Video color="#ffffff" size={24} />
            </TouchableOpacity>
            
            <TouchableOpacity style={tw('w-12 h-12 rounded-full bg-white/20 dark:bg-slate-900/20 items-center justify-center')}>
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
      </SafeAreaView>
    </View>
  );
}
