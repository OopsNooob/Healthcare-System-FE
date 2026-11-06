import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TouchableOpacity, Image, StatusBar, Platform, PermissionsAndroid, Alert, Linking } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Mic, MicOff, Video, VideoOff, PhoneOff, MessageCircle } from 'lucide-react-native';
import { tw } from '@/tw';

export default function VideoCallScreen() {
  const { t } = useTranslation();
  const router = useRouter();

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

      {/* Background Video (Doctor) */}
      <Image
        source={{
          uri: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?q=80&w=1000&auto=format&fit=crop',
        }}
        style={tw('absolute inset-0 w-full h-full opacity-80')}
        resizeMode="cover"
      />

      <SafeAreaView style={tw('flex-1 justify-between')}>
        {/* Top Header */}
        <View style={tw('flex-row justify-between items-start px-6 pt-6')}>
          <View>
            <View style={tw('bg-black/40 px-3 py-1.5 rounded-full flex-row items-center gap-2 mb-2 self-start')}>
              <View style={tw('w-2 h-2 rounded-full bg-red-500')} />
              <Text style={tw('text-white text-xs font-medium')}>10:24</Text>
            </View>
            <Text style={tw('text-white text-xl font-bold shadow-sm')}>
              {t('mobile.dr_sarah_connor', 'Dr. Sarah Connor')}
            </Text>
            <Text style={tw('text-emerald-400 text-sm font-medium')}>
              {t('mobile.cardiologist', 'Cardiologist')}
            </Text>
          </View>
        </View>

        {/* Bottom Area */}
        <View style={tw('px-6 pb-10')}>
          {/* User PIP */}
          <View
            style={tw(
              'w-28 h-40 bg-gray-800 rounded-2xl overflow-hidden mb-6 self-end border-2 border-white/20 items-center justify-center relative'
            )}
          >
            {!isVideoOff ? (
              <Image
                source={{
                  uri: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?q=80&w=400&auto=format&fit=crop',
                }}
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
              style={tw(
                `w-12 h-12 rounded-full items-center justify-center ${
                  isMuted ? 'bg-red-500' : 'bg-white/20'
                }`
              )}
            >
              {isMuted ? <MicOff color="#ffffff" size={24} /> : <Mic color="#ffffff" size={24} />}
            </TouchableOpacity>

            {/* Video Toggle */}
            <TouchableOpacity
              onPress={handleToggleVideo}
              style={tw(
                `w-12 h-12 rounded-full items-center justify-center ${
                  isVideoOff ? 'bg-red-500' : 'bg-white/20'
                }`
              )}
            >
              {isVideoOff ? <VideoOff color="#ffffff" size={24} /> : <Video color="#ffffff" size={24} />}
            </TouchableOpacity>

            {/* Chat with Doctor */}
            <TouchableOpacity
              onPress={() => router.push('/(patient)/doctor-chat')}
              style={tw('w-12 h-12 rounded-full bg-white/20 items-center justify-center')}
            >
              <MessageCircle color="#ffffff" size={24} />
            </TouchableOpacity>

            {/* End Call */}
            <TouchableOpacity
              style={tw('w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg')}
              onPress={() => router.back('/(patient)/appointments')}
            >
              <PhoneOff color="#ffffff" size={28} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}
