import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  StatusBar,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { MessageSquare, PhoneOff, Video } from 'lucide-react-native';
import { mobileApi } from '@repo/shared-hooks';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Skeleton } from '@/components/ui/Skeleton';

type RawRecord = Record<string, unknown>;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export default function DoctorIncomingCallScreen() {
  const params = useLocalSearchParams<{
    consultationId?: string;
    id?: string;
    callerName?: string;
    reason?: string;
  }>();
  const consultationId = String(params.consultationId ?? params.id ?? '');

  const { t } = useTranslation();
  useThemeContext();
  const router = useSafeRouter();

  const [isLoading, setIsLoading] = useState(Boolean(consultationId));
  const [patientName, setPatientName] = useState(
    params.callerName || t('mobile.patient_fallback', 'Patient'),
  );
  const [patientAvatar, setPatientAvatar] = useState<string | undefined>(undefined);
  const [subtitle, setSubtitle] = useState(
    params.reason || t('mobile.incoming_consultation_request', 'Incoming consultation call'),
  );
  const [requestStatus, setRequestStatus] = useState('pending');
  const [isBusy, setIsBusy] = useState(false);

  useEffect(() => {
    let active = true;
    const hydrate = async () => {
      if (!consultationId) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await mobileApi.consultationsFindOne({ params: { id: consultationId } });
        const raw = (res?.data ?? res) as RawRecord;
        if (!active || !raw || typeof raw !== 'object') return;

        setRequestStatus(String(raw.requestStatus ?? 'accepted'));
        if (typeof raw.reason === 'string' && raw.reason.trim()) {
          setSubtitle(raw.reason.trim());
        }

        const rawPatient = raw.patientId;
        if (typeof rawPatient === 'string') {
          const profRes = await mobileApi
            .usersFindProfile({ params: { id: rawPatient } })
            .catch(() => mobileApi.usersFindOne({ params: { id: rawPatient } }));
          const prof = ((profRes as unknown as { data?: RawRecord })?.data ?? profRes) as RawRecord;
          if (!active) return;
          const full =
            (typeof prof?.fullName === 'string' && prof.fullName.trim()) ||
            [prof?.firstName, prof?.lastName]
              .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
              .join(' ')
              .trim();
          if (full) setPatientName(full);
          if (typeof prof?.avatarUrl === 'string' && prof.avatarUrl.startsWith('http')) {
            setPatientAvatar(prof.avatarUrl);
          }
        } else if (rawPatient && typeof rawPatient === 'object') {
          const p = rawPatient as RawRecord;
          const full =
            (typeof p.fullName === 'string' && p.fullName.trim()) ||
            [p.firstName, p.lastName]
              .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
              .join(' ')
              .trim();
          if (full) setPatientName(full);
          if (typeof p.avatarUrl === 'string' && p.avatarUrl.startsWith('http')) {
            setPatientAvatar(p.avatarUrl);
          }
        }
      } catch {
        // Keep query params if detail fetch fails
      } finally {
        if (active) setIsLoading(false);
      }
    };
    hydrate();
    return () => {
      active = false;
    };
  }, [consultationId]);

  const handleDecline = useCallback(async () => {
    if (isBusy) return;
    setIsBusy(true);
    try {
      if (consultationId && requestStatus === 'pending') {
        await mobileApi.consultationsDecline({
          params: { id: consultationId },
          body: {},
        });
      }
      router.back('/(doctor)');
    } catch (err) {
      Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
      setIsBusy(false);
    }
  }, [consultationId, isBusy, requestStatus, router]);

  const handleAccept = useCallback(async () => {
    if (isBusy) return;
    if (!consultationId) {
      router.replace('/(doctor)/consultations');
      return;
    }
    setIsBusy(true);
    try {
      if (requestStatus === 'pending') {
        await mobileApi.consultationsAccept({ params: { id: consultationId } });
      }
      router.replace(`/(doctor)/video-call?consultationId=${consultationId}`);
    } catch (err) {
      Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
      setIsBusy(false);
    }
  }, [consultationId, isBusy, requestStatus, router]);

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-950 justify-between px-6 py-10')}>
      <StatusBar barStyle="light-content" />

      <View style={tw('items-center pt-6')}>
        <Text style={tw('text-xs font-bold uppercase tracking-widest text-teal-400')}>
          {t('mobile.incoming_call_header', 'Incoming Consultation')}
        </Text>

        {isLoading ? (
          <View style={tw('items-center mt-10 gap-4')}>
            <Skeleton className="w-32 h-32 rounded-full" />
            <Skeleton className="w-48 h-7 rounded-xl" />
            <Skeleton className="w-60 h-5 rounded-xl" />
          </View>
        ) : (
          <View style={tw('items-center mt-10')}>
            {patientAvatar ? (
              <Image
                source={{ uri: patientAvatar }}
                style={tw('w-32 h-32 rounded-full border-4 border-teal-500/50 bg-slate-800')}
              />
            ) : (
              <View style={tw('w-32 h-32 rounded-full bg-teal-900/70 border-4 border-teal-500/50 items-center justify-center')}>
                <Text style={tw('text-4xl font-bold text-teal-200')}>
                  {getInitials(patientName)}
                </Text>
              </View>
            )}

            <Text style={tw('text-2xl font-bold text-white mt-6 text-center')}>
              {patientName}
            </Text>
            <Text style={tw('text-sm text-slate-300 mt-2 text-center max-w-xs')}>
              {subtitle}
            </Text>
          </View>
        )}
      </View>

      <View style={tw('pb-6')}>
        {Boolean(consultationId) && (
          <TouchableOpacity
            disabled={isBusy}
            onPress={() => router.replace(`/(doctor)/chat/${consultationId}`)}
            style={tw('self-center flex-row items-center gap-2 px-4 py-2 rounded-full bg-slate-800 border border-slate-700 mb-8')}
          >
            <MessageSquare size={15} color="#5eead4" />
            <Text style={tw('text-xs font-semibold text-slate-200')}>
              {t('mobile.reply_with_message', 'Send a message instead')}
            </Text>
          </TouchableOpacity>
        )}

        <View style={tw('flex-row items-center justify-around')}>
          <TouchableOpacity
            disabled={isBusy}
            onPress={handleDecline}
            style={tw('items-center gap-2.5')}
          >
            <View style={tw('w-16 h-16 rounded-full bg-red-600 items-center justify-center')}>
              <PhoneOff size={26} color="#ffffff" />
            </View>
            <Text style={tw('text-xs font-bold text-slate-300')}>
              {t('mobile.decline', 'Decline')}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            disabled={isBusy}
            onPress={handleAccept}
            style={tw('items-center gap-2.5')}
          >
            <View style={tw('w-16 h-16 rounded-full bg-emerald-600 items-center justify-center')}>
              {isBusy ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Video size={26} color="#ffffff" />
              )}
            </View>
            <Text style={tw('text-xs font-bold text-slate-300')}>
              {t('mobile.accept_video', 'Accept Call')}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </SafeAreaView>
  );
}
