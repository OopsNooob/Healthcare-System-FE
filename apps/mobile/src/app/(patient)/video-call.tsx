import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Image, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { MessageCircle, Mic, MicOff, PhoneOff, Video, VideoOff } from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  connectConsultationsSocket,
  consultationsSocket,
  mobileApi,
  SOCKET_EVENTS,
  useSharedAuthStore,
  type FeTypes,
} from '@repo/shared-hooks';

function formatElapsed(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function PatientVideoCallScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ consultationId?: string; doctorId?: string }>();
  const token = useSharedAuthStore((s) => s.token);
  const authUser = useSharedAuthStore((s) => s.user);

  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);
  const [loading, setLoading] = useState(true);
  const [doctorId, setDoctorId] = useState(params.doctorId || '');
  const [doctorName, setDoctorName] = useState('');
  const [doctorAvatar, setDoctorAvatar] = useState('');
  const [sessionStatus, setSessionStatus] = useState<string>('waiting');
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    let active = true;
    const loadSession = async () => {
      if (!params.consultationId) {
        setLoading(false);
        return;
      }
      try {
        const res = await mobileApi.consultationsFindOne({
          params: { id: params.consultationId },
        });
        const data = (res?.data ?? {}) as Record<string, unknown>;
        if (active) {
          setSessionStatus(String(data.sessionStatus ?? 'waiting'));
          const startedRaw = data.callStartedAt ?? data.sessionStartedAt;
          if (startedRaw) {
            const diff = Math.max(
              0,
              Math.floor((Date.now() - new Date(String(startedRaw)).getTime()) / 1000),
            );
            setElapsedSeconds(Number.isFinite(diff) ? diff : 0);
          }
        }

        const docRaw = data.doctorId;
        let docIdStr = params.doctorId || '';
        if (docRaw && typeof docRaw === 'object') {
          const dObj = docRaw as Record<string, unknown>;
          docIdStr = String(dObj._id ?? dObj.id ?? docIdStr);
          if (active) {
            setDoctorName(String(dObj.fullName ?? ''));
            setDoctorAvatar(String(dObj.avatarUrl ?? ''));
          }
        } else {
          docIdStr = String(docRaw ?? docIdStr);
        }

        if (docIdStr) {
          if (active) setDoctorId(docIdStr);
          if (!doctorName) {
            const docUser = (await mobileApi
              .usersFindOne({ params: { id: docIdStr } })
              .catch(() => null)) as unknown as Record<string, unknown> | null;
            if (docUser && active) {
              setDoctorName(String(docUser.fullName ?? ''));
              setDoctorAvatar(String(docUser.avatarUrl ?? ''));
            }
          }
        }

        await mobileApi
          .consultationsRecordWaitingRoomPresence({ params: { id: params.consultationId } })
          .catch(() => null);
      } catch (err) {
        if (active) {
          Toast.show({
            type: 'error',
            text1: t('mobile.error_generic', 'Unable to join consultation'),
            text2: extractApiErrorMessage(err),
          });
        }
      } finally {
        if (active) setLoading(false);
      }
    };
    void loadSession();
    return () => {
      active = false;
    };
  }, [doctorName, params.consultationId, params.doctorId, t]);

  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (!params.consultationId) return;
    if (token) {
      connectConsultationsSocket(token);
    }

    const heartbeatInterval = setInterval(() => {
      void mobileApi
        .consultationsRecordWaitingRoomPresence({
          params: { id: params.consultationId! },
        })
        .catch(() => null);
      consultationsSocket.emit(SOCKET_EVENTS.CONSULTATION_HEARTBEAT, {
        consultationId: params.consultationId!,
      });
    }, 25_000);

    const onConsultationChanged = (payload: FeTypes.RealtimeConsultationChanged) => {
      if (payload?.consultationId !== params.consultationId) return;
      if (payload.action === 'started') {
        setSessionStatus('in_consultation');
      } else if (payload.action === 'completed' || payload.action === 'cancelled') {
        Toast.show({
          type: 'info',
          text1: t('mobile.consultation_ended', 'Consultation ended'),
        });
        router.back('/(patient)/appointments');
      }
    };

    consultationsSocket.on(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onConsultationChanged);
    return () => {
      clearInterval(heartbeatInterval);
      consultationsSocket.off(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onConsultationChanged);
    };
  }, [params.consultationId, router, t, token]);

  const displayDoctorName = doctorName || t('mobile.specialist_doctor', 'Specialist Doctor');
  const patientName = authUser?.name || t('mobile.you', 'You');

  return (
    <View style={tw('flex-1 bg-slate-950')}>
      {/* Remote Doctor Canvas */}
      <View style={tw('w-full h-full bg-slate-900 items-center justify-center')}>
        {loading ? (
          <View style={tw('items-center gap-4')}>
            <Skeleton className="w-28 h-28 rounded-full" />
            <Skeleton className="w-40 h-5 rounded" />
          </View>
        ) : (
          <View style={tw('items-center px-6')}>
            {doctorAvatar ? (
              <Image
                source={{ uri: doctorAvatar }}
                style={tw('w-32 h-32 rounded-full border-4 border-brand/40 mb-4 bg-slate-800')}
              />
            ) : (
              <View
                style={tw(
                  'w-32 h-32 rounded-full border-4 border-brand/40 mb-4 bg-slate-800 items-center justify-center',
                )}
              >
                <Text style={tw('text-3xl font-bold text-white')}>
                  {getInitials(displayDoctorName)}
                </Text>
              </View>
            )}
            <Text style={tw('text-xl font-bold text-white text-center')}>{displayDoctorName}</Text>
            <Text style={tw('text-slate-400 text-sm mt-1 text-center')}>
              {sessionStatus === 'in_consultation'
                ? t('mobile.consultation_active_audio_video', 'Connected in consultation room')
                : t('mobile.waiting_for_doctor_video', 'Waiting in consultation room...')}
            </Text>
          </View>
        )}
      </View>

      <SafeAreaView style={tw('absolute inset-0 justify-between pointer-events-box-none')}>
        {/* Top Overlay */}
        <View style={tw('p-6 flex-row justify-between items-start')}>
          <View style={tw('bg-black/45 px-4 py-2 rounded-2xl border border-white/10')}>
            <Text style={tw('text-white font-bold text-base')}>{displayDoctorName}</Text>
            <View style={tw('flex-row items-center mt-1')}>
              <View style={tw('w-2 h-2 rounded-full bg-emerald-400 mr-2')} />
              <Text style={tw('text-slate-200 text-xs font-medium')}>
                {formatElapsed(elapsedSeconds)}
              </Text>
            </View>
          </View>

          {/* Local Camera Tile */}
          <View
            style={tw(
              'w-28 h-36 rounded-2xl overflow-hidden border-2 border-white/20 bg-slate-800 shadow-xl items-center justify-center',
            )}
          >
            {isCameraOff ? (
              <View style={tw('items-center')}>
                <VideoOff color="#94a3b8" size={24} />
                <Text style={tw('text-[10px] text-slate-400 mt-1')}>
                  {t('mobile.camera_off', 'Camera off')}
                </Text>
              </View>
            ) : authUser?.avatar ? (
              <Image source={{ uri: authUser.avatar }} style={tw('w-full h-full')} />
            ) : (
              <View style={tw('items-center justify-center')}>
                <Text style={tw('text-lg font-bold text-white')}>{getInitials(patientName)}</Text>
                <Text style={tw('text-[10px] text-slate-300 mt-1')}>{t('mobile.you', 'You')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Bottom Controls */}
        <View style={tw('pb-8 px-6')}>
          <View
            style={tw(
              'bg-slate-900/90 border border-white/10 rounded-full py-4 px-6 flex-row justify-between items-center shadow-2xl',
            )}
          >
            <TouchableOpacity
              style={tw(
                `w-14 h-14 rounded-full items-center justify-center ${
                  isMuted ? 'bg-red-500' : 'bg-slate-800'
                }`,
              )}
              onPress={() => setIsMuted(!isMuted)}
            >
              {isMuted ? <MicOff color="#ffffff" size={24} /> : <Mic color="#ffffff" size={24} />}
            </TouchableOpacity>

            <TouchableOpacity
              style={tw(
                `w-14 h-14 rounded-full items-center justify-center ${
                  isCameraOff ? 'bg-red-500' : 'bg-slate-800'
                }`,
              )}
              onPress={() => setIsCameraOff(!isCameraOff)}
            >
              {isCameraOff ? (
                <VideoOff color="#ffffff" size={24} />
              ) : (
                <Video color="#ffffff" size={24} />
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={tw('w-14 h-14 rounded-full bg-slate-800 items-center justify-center')}
              onPress={() => {
                const q = [
                  params.consultationId ? `consultationId=${params.consultationId}` : '',
                  doctorId ? `doctorId=${doctorId}` : '',
                ]
                  .filter(Boolean)
                  .join('&');
                router.push(q ? `/(patient)/doctor-chat?${q}` : '/(patient)/doctor-chat');
              }}
            >
              <MessageCircle color="#ffffff" size={24} />
            </TouchableOpacity>

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
