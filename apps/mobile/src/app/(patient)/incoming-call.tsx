import { View, Text, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { PhoneOff, Phone, Video } from 'lucide-react-native';
import { tw } from '@/tw';
import { useRouter } from 'expo-router';

export default function IncomingCallScreen() {
  const router = useRouter();

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-900 justify-between items-center py-20')}>
      <View style={tw('items-center mt-10')}>
        <Text style={tw('text-slate-400 text-lg mb-2 font-medium')}>Incoming Video Call...</Text>
        <Text style={tw('text-white text-3xl font-bold mb-8')}>Dr. Sarah Connor</Text>
        
        <View style={tw('relative items-center justify-center')}>
          <View style={tw('absolute w-48 h-48 bg-brand/20 rounded-full')} />
          <View style={tw('absolute w-40 h-40 bg-brand/40 rounded-full')} />
          <Image 
            source={{ uri: 'https://i.pravatar.cc/150?img=1' }} 
            style={tw('w-32 h-32 rounded-full border-4 border-slate-900 z-10')} 
          />
        </View>
        <Text style={tw('text-brand text-base font-medium mt-10')}>Cardiologist</Text>
      </View>

      <View style={tw('flex-row gap-8 mb-10')}>
        <TouchableOpacity 
          onPress={() => router.back()}
          style={tw('bg-red-500 w-16 h-16 rounded-full items-center justify-center')}
        >
          <PhoneOff color="white" size={32} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          onPress={() => router.replace('/(patient)/video-call')}
          style={tw('bg-brand w-16 h-16 rounded-full items-center justify-center')}
        >
          <Video color="white" size={32} />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
