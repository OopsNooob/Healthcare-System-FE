import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { PhoneIncoming, PhoneOff, Video } from 'lucide-react-native';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { mobileApi } from '@repo/shared-hooks';

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function IncomingCallScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{
    consultationId?: string;
    doctorId?: string;
    callerName?: string;
    specialty?: string;
    avatarUrl?: string;
  }>();

  const [callerName, setCallerName] = useState(params.callerName || '');
  const [specialty, setSpecialty] = useState(params.specialty || '');
  const [avatarUrl, setAvatarUrl] = useState(params.avatarUrl || '');
  const [resolvedDoctorId, setResolvedDoctorId] = useState(params.doctorId || '');

  useEffect(() => {
    let active = true;
    const resolveCaller = async () => {
      try {
        let docId = params.doctorId || '';
        if (params.consultationId && !docId) {
          const cRes = await mobileApi.consultationsFindOne({
            params: { id: params.consultationId },
          });
          const data = (cRes?.data ?? {}) as Record<string, unknown>;
          const dRaw = data.doctorId;
          if (dRaw && typeof dRaw === 'object') {
            const dObj = dRaw as Record<string, unknown>;
            const dp = (dObj.doctorProfile ?? {}) as Record<string, unknown>;
            if (active) {
              setCallerName((prev) => prev || String(dObj.fullName ?? ''));
              setSpecialty((prev) => prev || String(dp.specialty ?? ''));
              setAvatarUrl((prev) => prev || String(dObj.avatarUrl ?? ''));
            }
            docId = String(dObj._id ?? dObj.id ?? '');
          } else {
            docId = String(dRaw ?? '');
          }
        }
        if (docId && active) {
          setResolvedDoctorId(docId);
          if (!callerName) {
            const u = (await mobileApi.usersFindOne({
              params: { id: docId },
            })) as unknown as Record<string, unknown>;
            const dp = (u.doctorProfile ?? {}) as Record<string, unknown>;
            if (active) {
              setCallerName(String(u.fullName ?? ''));
              setSpecialty(String(dp.specialty ?? ''));
              setAvatarUrl(String(u.avatarUrl ?? ''));
            }
          }
        }
      } catch {
        // Keep available query parameters cleanly
      }
    };
    void resolveCaller();
    return () => {
      active = false;
    };
  }, [callerName, params.consultationId, params.doctorId]);

  const displayName = callerName || t('mobile.specialist_doctor', 'Specialist Doctor');
  const displaySubtitle = specialty || t('mobile.video_consultation', 'Video Consultation');

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-900 justify-between items-center py-16 px-8')}>
      <View style={tw('items-center mt-8')}>
        <View style={tw('flex-row items-center gap-2 bg-slate-800 px-4 py-2 rounded-full mb-8')}>
          <PhoneIncoming color="#a3e635" size={16} />
          <Text style={tw('text-slate-300 font-semibold text-xs tracking-wider uppercase')}>
            {t('mobile.incoming_video_call', 'Incoming Video Call')}
          </Text>
        </View>

        <View
          style={tw(
            'w-36 h-36 rounded-full border-4 border-brand/30 p-1 items-center justify-center mb-6',
          )}
        >
          {avatarUrl ? (
            <Image
              source={{ uri: avatarUrl }}
              style={tw('w-full h-full rounded-full bg-slate-800')}
            />
          ) : (
            <View
              style={tw('w-full h-full rounded-full bg-slate-800 items-center justify-center')}
            >
              <Text style={tw('text-3xl font-bold text-white')}>{getInitials(displayName)}</Text>
            </View>
          )}
        </View>

        <Text style={tw('text-3xl font-bold text-white mb-2 text-center')}>{displayName}</Text>
        <Text style={tw('text-brand font-medium text-base text-center')}>
          {displaySubtitle}
        </Text>
      </View>

      <View style={tw('w-full flex-row justify-around items-center px-6 mb-8')}>
        <TouchableOpacity
          onPress={() => router.back('/(patient)')}
          style={tw('items-center gap-3')}
        >
          <View style={tw('w-16 h-16 rounded-full bg-red-500 items-center justify-center shadow-lg')}>
            <PhoneOff color="#ffffff" size={28} />
          </View>
          <Text style={tw('text-slate-300 font-medium text-sm')}>
            {t('mobile.decline', 'Decline')}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          onPress={() => {
            const query = [
              params.consultationId ? `consultationId=${params.consultationId}` : '',
              resolvedDoctorId ? `doctorId=${resolvedDoctorId}` : '',
            ]
              .filter(Boolean)
              .join('&');
            router.replace(query ? `/(patient)/video-call?${query}` : '/(patient)/video-call');
          }}
          style={tw('items-center gap-3')}
        >
          <View style={tw('w-16 h-16 rounded-full bg-brand items-center justify-center shadow-lg')}>
            <Video color="#0f172a" size={28} />
          </View>
          <Text style={tw('text-brand font-bold text-sm')}>
            {t('mobile.accept', 'Accept')}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}
