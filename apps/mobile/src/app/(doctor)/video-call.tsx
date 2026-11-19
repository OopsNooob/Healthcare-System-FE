import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Modal,
  PermissionsAndroid,
  Platform,
  ScrollView,
  StatusBar,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import {
  Activity,
  AlertCircle,
  AlertTriangle,
  BrainCircuit,
  ChevronDown,
  FileText,
  LineChart,
  MessageCircle,
  Mic,
  MicOff,
  PhoneOff,
  Play,
  RefreshCw,
  Save,
  Video,
  VideoOff,
} from 'lucide-react-native';
import {
  connectConsultationsSocket,
  consultationsSocket,
  mobileApi,
  normalizePaginatedList,
  SOCKET_EVENTS,
} from '@repo/shared-hooks';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  AiSummaryModal,
  CareAlertsModal,
  HealthChartModal,
} from '@/components/modals';

type RawRecord = Record<string, unknown>;

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60)
    .toString()
    .padStart(2, '0');
  const secs = (seconds % 60).toString().padStart(2, '0');
  return `${mins}:${secs}`;
}

export default function DoctorVideoCallScreen() {
  const params = useLocalSearchParams<{ consultationId?: string; id?: string }>();
  const consultationId = String(params.consultationId ?? params.id ?? '');

  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useSafeRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState(() => t('mobile.patient_fallback', 'Patient'));
  const [patientAvatar, setPatientAvatar] = useState<string | undefined>(undefined);
  const [sessionStatus, setSessionStatus] = useState('scheduled');
  const [requestStatus, setRequestStatus] = useState('pending');
  const [latestBpLabel, setLatestBpLabel] = useState<string | null>(null);
  const [latestHrLabel, setLatestHrLabel] = useState<string | null>(null);

  const [enrollmentId, setEnrollmentId] = useState<string | undefined>(undefined);
  const [programName, setProgramName] = useState<string | undefined>(undefined);
  const [openAlertsCount, setOpenAlertsCount] = useState(0);

  const [isMicOn, setIsMicOn] = useState(true);
  const [isCameraOn, setIsCameraOn] = useState(true);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  const [clinicalNotes, setClinicalNotes] = useState('');
  const [isNotesModalVisible, setIsNotesModalVisible] = useState(false);
  const [isAiSummaryVisible, setIsAiSummaryVisible] = useState(false);
  const [isChartVisible, setIsChartVisible] = useState(false);
  const [isAlertsVisible, setIsAlertsVisible] = useState(false);

  const [isStartingSession, setIsStartingSession] = useState(false);
  const [isSavingNotes, setIsSavingNotes] = useState(false);
  const [isEndingCall, setIsEndingCall] = useState(false);

  const permissionCheckedRef = useRef(false);

  const ensureMediaPermissions = useCallback(async () => {
    if (permissionCheckedRef.current) return;
    permissionCheckedRef.current = true;
    if (Platform.OS !== 'android') return;

    try {
      const results = await PermissionsAndroid.requestMultiple([
        PermissionsAndroid.PERMISSIONS.CAMERA,
        PermissionsAndroid.PERMISSIONS.RECORD_AUDIO,
      ]);
      const cameraGranted =
        results[PermissionsAndroid.PERMISSIONS.CAMERA] === PermissionsAndroid.RESULTS.GRANTED;
      const micGranted =
        results[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO] === PermissionsAndroid.RESULTS.GRANTED;
      if (!cameraGranted) setIsCameraOn(false);
      if (!micGranted) setIsMicOn(false);
      if (!cameraGranted || !micGranted) {
        Alert.alert(
          t('mobile.permissions_needed_title', 'Camera & Microphone Access'),
          t(
            'mobile.permissions_needed_body',
            'Grant camera and microphone permissions in Settings to stream audio and video.',
          ),
          [
            { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
            { text: t('mobile.open_settings', 'Open Settings'), onPress: () => Linking.openSettings() },
          ],
        );
      }
    } catch {
      // Permission check can safely degrade to muted state
    }
  }, [t]);

  const loadCallContext = useCallback(async () => {
    if (!consultationId) {
      setLoadError(t('mobile.missing_consultation_id', 'Missing consultation identifier'));
      return;
    }

    try {
      setLoadError(null);
      const consultRes = await mobileApi.consultationsFindOne({
        params: { id: consultationId },
      });
      const raw = (consultRes?.data ?? consultRes) as RawRecord;
      if (!raw || typeof raw !== 'object') {
        setLoadError(t('mobile.consultation_not_found', 'Consultation not found'));
        return;
      }

      const rawPatient = raw.patientId;
      let resolvedPatientId = '';
      let resolvedName = t('mobile.patient_fallback', 'Patient');
      let resolvedAvatar: string | undefined;

      if (typeof rawPatient === 'string') {
        resolvedPatientId = rawPatient;
        try {
          const profRes = await mobileApi.usersFindProfile({ params: { id: rawPatient } });
          const prof = ((profRes as unknown as { data?: RawRecord })?.data ?? profRes) as RawRecord;
          const full =
            (typeof prof?.fullName === 'string' && prof.fullName.trim()) ||
            [prof?.firstName, prof?.lastName]
              .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
              .join(' ')
              .trim();
          if (full) resolvedName = full;
          if (typeof prof?.avatarUrl === 'string' && prof.avatarUrl.startsWith('http')) {
            resolvedAvatar = prof.avatarUrl;
          }
        } catch {
          // Keep fallback patient label
        }
      } else if (rawPatient && typeof rawPatient === 'object') {
        const p = rawPatient as RawRecord;
        resolvedPatientId = String(p._id ?? p.id ?? '');
        const full =
          (typeof p.fullName === 'string' && p.fullName.trim()) ||
          [p.firstName, p.lastName]
            .filter((v): v is string => typeof v === 'string' && v.trim().length > 0)
            .join(' ')
            .trim();
        if (full) resolvedName = full;
        if (typeof p.avatarUrl === 'string' && p.avatarUrl.startsWith('http')) {
          resolvedAvatar = p.avatarUrl;
        }
      }

      setPatientId(resolvedPatientId);
      setPatientName(resolvedName);
      setPatientAvatar(resolvedAvatar);
      setSessionStatus(String(raw.sessionStatus ?? 'scheduled'));
      setRequestStatus(String(raw.requestStatus ?? 'accepted'));
      if (typeof raw.doctorNotes === 'string') {
        setClinicalNotes(raw.doctorNotes);
      }

      if (resolvedPatientId) {
        const [metricsRes, enrollRes, alertsRes] = await Promise.all([
          mobileApi
            .healthMetricsFindAll({ query: { patientId: resolvedPatientId, limit: 6, sortOrder: -1 } })
            .catch(() => null),
          mobileApi
            .careEnrollmentList({ query: { patientId: resolvedPatientId, status: 'active', limit: 1 } })
            .catch(() => null),
          mobileApi
            .careAlertInbox({ query: { limit: 20, status: 'open' } })
            .catch(() => null),
        ]);

        if (metricsRes) {
          const items = normalizePaginatedList<RawRecord>(metricsRes).items;
          const bp = items.find((m) => m.type === 'blood_pressure');
          const hr = items.find((m) => m.type === 'heart_rate');
          setLatestBpLabel(bp ? `${bp.systolic ?? '—'}/${bp.diastolic ?? '—'} mmHg` : null);
          setLatestHrLabel(
            hr && (typeof hr.value === 'number' || typeof hr.value === 'string')
              ? `${hr.value} bpm`
              : null,
          );
        }

        if (enrollRes) {
          const eItem = normalizePaginatedList<RawRecord>(enrollRes).items[0];
          const eid = String(eItem?._id ?? eItem?.id ?? '');
          setEnrollmentId(eid || undefined);
          const programObj = eItem?.programId as RawRecord | undefined;
          const pname =
            (typeof eItem?.programName === 'string' && eItem.programName) ||
            (typeof programObj?.name === 'string' && programObj.name) ||
            undefined;
          setProgramName(pname);
        }

        if (alertsRes && Array.isArray((alertsRes as RawRecord).data)) {
          const allOpen = (alertsRes as { data: RawRecord[] }).data;
          const mine = allOpen.filter((a) => String(a.patientId ?? '') === resolvedPatientId);
          setOpenAlertsCount(mine.length);
        }
      }
    } catch (err) {
      setLoadError(extractApiErrorMessage(err));
    }
  }, [consultationId, t]);

  useEffect(() => {
    let active = true;
    ensureMediaPermissions();
    setIsLoading(true);
    loadCallContext().finally(() => {
      if (active) setIsLoading(false);
    });
    return () => {
      active = false;
    };
  }, [ensureMediaPermissions, loadCallContext]);

  useEffect(() => {
    if (!consultationId) return;
    connectConsultationsSocket();

    const heartbeat = setInterval(() => {
      consultationsSocket.emit(SOCKET_EVENTS.CONSULTATION_HEARTBEAT, { consultationId });
    }, 15000);

    const onConsultationChanged = (event: unknown) => {
      if (!event || typeof event !== 'object') return;
      const e = event as RawRecord;
      if (String(e.consultationId ?? e._id ?? '') === consultationId) {
        loadCallContext();
      }
    };

    consultationsSocket.on(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onConsultationChanged);
    return () => {
      clearInterval(heartbeat);
      consultationsSocket.off(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onConsultationChanged);
    };
  }, [consultationId, loadCallContext]);

  useEffect(() => {
    if (sessionStatus !== 'in_consultation') return;
    const timer = setInterval(() => {
      setElapsedSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [sessionStatus]);

  const handleStartSession = useCallback(async () => {
    if (!consultationId || isStartingSession) return;
    setIsStartingSession(true);
    try {
      await mobileApi.consultationsStart({ params: { id: consultationId } });
      setSessionStatus('in_consultation');
      Toast.show({
        type: 'success',
        text1: t('mobile.consultation_started', 'Consultation session started'),
      });
    } catch (err) {
      Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
    } finally {
      setIsStartingSession(false);
    }
  }, [consultationId, isStartingSession, t]);

  const handleSaveNotes = useCallback(async () => {
    if (!consultationId || isSavingNotes) return;
    const isReadonly =
      sessionStatus === 'completed' ||
      sessionStatus === 'no_show' ||
      requestStatus === 'cancelled' ||
      requestStatus === 'declined';
    if (isReadonly) {
      Toast.show({
        type: 'info',
        text1: t('mobile.clinical_notes_readonly', 'Notes cannot be edited on closed sessions'),
      });
      return;
    }
    setIsSavingNotes(true);
    try {
      await mobileApi.consultationsUpdate({
        params: { id: consultationId },
        body: { doctorNotes: clinicalNotes.trim() },
      });
      Toast.show({
        type: 'success',
        text1: t('mobile.notes_saved', 'Clinical notes saved'),
      });
      setIsNotesModalVisible(false);
    } catch (err) {
      Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
    } finally {
      setIsSavingNotes(false);
    }
  }, [clinicalNotes, consultationId, isSavingNotes, sessionStatus, t]);

  const handleCompleteAndExit = useCallback(async () => {
    if (!consultationId || isEndingCall) return;
    if (sessionStatus === 'in_consultation') {
      setIsEndingCall(true);
      try {
        await mobileApi.consultationsComplete({
          params: { id: consultationId },
          body: clinicalNotes.trim() ? { doctorNotes: clinicalNotes.trim() } : {},
        });
        Toast.show({
          type: 'success',
          text1: t('mobile.consultation_completed', 'Consultation marked as completed'),
        });
        router.back('/(doctor)/consultations');
      } catch (err) {
        Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
      } finally {
        setIsEndingCall(false);
      }
      return;
    }
    router.back('/(doctor)/consultations');
  }, [clinicalNotes, consultationId, isEndingCall, router, sessionStatus, t]);

  const canStart =
    requestStatus === 'accepted' && (sessionStatus === 'scheduled' || sessionStatus === 'waiting');
  const isClosed =
    sessionStatus === 'completed' || sessionStatus === 'cancelled' || sessionStatus === 'no_show';

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-950')} edges={['top', 'bottom']}>
      <StatusBar barStyle="light-content" />

      {/* Top Overlay */}
      <View style={tw('px-4 pt-2 pb-3 flex-row items-center justify-between')}>
        <TouchableOpacity
          onPress={() => router.back('/(doctor)/consultations')}
          style={tw('p-2.5 rounded-full bg-slate-800/80 border border-slate-700')}
        >
          <ChevronDown size={20} color="#ffffff" />
        </TouchableOpacity>

        <View style={tw('items-center flex-1 px-3')}>
          <Text style={tw('text-base font-bold text-white')} numberOfLines={1}>
            {patientName}
          </Text>
          <View style={tw('flex-row items-center gap-1.5 mt-0.5')}>
            <View
              style={tw(
                `w-2 h-2 rounded-full ${
                  sessionStatus === 'in_consultation'
                    ? 'bg-emerald-400'
                    : sessionStatus === 'waiting'
                      ? 'bg-blue-400'
                      : 'bg-amber-400'
                }`,
              )}
            />
            <Text style={tw('text-xs font-semibold text-slate-300')}>
              {sessionStatus === 'in_consultation'
                ? `${t('mobile.live', 'Live')} • ${formatDuration(elapsedSeconds)}`
                : sessionStatus === 'waiting'
                  ? t('mobile.patient_in_waiting_room', 'Patient Waiting')
                  : t('mobile.ready_to_connect', 'Consultation Room')}
            </Text>
          </View>
        </View>

        <TouchableOpacity
          onPress={() => setIsNotesModalVisible(true)}
          style={tw('px-3 py-2 rounded-full bg-slate-800/80 border border-slate-700 flex-row items-center gap-1.5')}
        >
          <FileText size={15} color="#5eead4" />
          <Text style={tw('text-xs font-bold text-white')}>
            {t('mobile.notes', 'Notes')}
          </Text>
        </TouchableOpacity>
      </View>

      {isLoading ? (
        <View style={tw('flex-1 px-6 justify-center gap-4')}>
          <Skeleton className="h-32 w-32 rounded-full self-center" />
          <Skeleton className="h-8 w-48 rounded-xl self-center" />
          <Skeleton className="h-20 w-full rounded-2xl" />
        </View>
      ) : loadError ? (
        <View style={tw('flex-1 items-center justify-center px-8')}>
          <AlertCircle size={40} color="#ef4444" />
          <Text style={tw('text-base font-bold text-white mt-3 text-center')}>
            {t('mobile.load_error_title', 'Unable to open video room')}
          </Text>
          <Text style={tw('text-xs text-slate-400 mt-1 text-center')}>{loadError}</Text>
          <TouchableOpacity
            onPress={() => {
              setIsLoading(true);
              loadCallContext().finally(() => setIsLoading(false));
            }}
            style={tw('mt-4 px-5 py-2.5 rounded-xl bg-teal-600 flex-row items-center gap-2')}
          >
            <RefreshCw size={15} color="#ffffff" />
            <Text style={tw('text-sm font-bold text-white')}>{t('mobile.retry', 'Retry')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={tw('flex-1 justify-between px-4 pb-4')}>
          {/* Main Video Stage + Vitals Telemetry */}
          <View style={tw('flex-1 rounded-3xl bg-slate-900 border border-slate-800 items-center justify-center p-5 relative overflow-hidden')}>
            {patientAvatar ? (
              <Image
                source={{ uri: patientAvatar }}
                style={tw('w-28 h-28 rounded-full border-4 border-teal-500/40 bg-slate-800')}
              />
            ) : (
              <View style={tw('w-28 h-28 rounded-full bg-teal-900/70 border-4 border-teal-500/40 items-center justify-center')}>
                <Text style={tw('text-3xl font-bold text-teal-200')}>
                  {getInitials(patientName)}
                </Text>
              </View>
            )}

            <Text style={tw('text-xl font-bold text-white mt-4 text-center')}>{patientName}</Text>
            <Text style={tw('text-xs text-slate-400 mt-1 text-center')}>
              {isCameraOn && isMicOn
                ? t('mobile.consultation_active_audio_video', 'Camera and microphone active')
                : t('mobile.audio_or_video_muted', 'Camera or microphone muted')}
            </Text>

            {/* Real Telemetry Strip */}
            {(latestBpLabel || latestHrLabel) && (
              <View style={tw('flex-row items-center gap-2 mt-4 flex-wrap justify-center')}>
                {latestBpLabel && (
                  <View style={tw('flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700')}>
                    <Activity size={13} color="#34d399" />
                    <Text style={tw('text-xs font-bold text-white')}>{latestBpLabel}</Text>
                  </View>
                )}
                {latestHrLabel && (
                  <View style={tw('flex-row items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-800 border border-slate-700')}>
                    <Activity size={13} color="#38bdf8" />
                    <Text style={tw('text-xs font-bold text-white')}>{latestHrLabel}</Text>
                  </View>
                )}
              </View>
            )}

            {canStart && (
              <TouchableOpacity
                disabled={isStartingSession}
                onPress={handleStartSession}
                style={tw('mt-5 px-5 py-3 rounded-2xl bg-emerald-600 flex-row items-center gap-2')}
              >
                {isStartingSession ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Play size={16} color="#ffffff" />
                )}
                <Text style={tw('text-sm font-bold text-white')}>
                  {t('mobile.start_consultation_now', 'Start Consultation Session')}
                </Text>
              </TouchableOpacity>
            )}

            {/* Quick Clinical Tools Row */}
            <View style={tw('flex-row flex-wrap justify-center gap-2 mt-6')}>
              <TouchableOpacity
                onPress={() => {
                  if (!enrollmentId) {
                    Toast.show({
                      type: 'info',
                      text1: t('mobile.no_active_program_for_ai', 'No active care program for pre-visit summary'),
                    });
                    return;
                  }
                  setIsAiSummaryVisible(true);
                }}
                style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-violet-950/70 border border-violet-800')}
              >
                <BrainCircuit size={15} color="#c4b5fd" />
                <Text style={tw('text-xs font-semibold text-violet-200')}>
                  {t('mobile.ai_summary', 'AI Summary')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsChartVisible(true)}
                style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-950/70 border border-sky-800')}
              >
                <LineChart size={15} color="#7dd3fc" />
                <Text style={tw('text-xs font-semibold text-sky-200')}>
                  {t('mobile.health_chart', 'Health Chart')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => setIsAlertsVisible(true)}
                style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-950/70 border border-amber-800')}
              >
                <AlertTriangle size={15} color="#fcd34d" />
                <Text style={tw('text-xs font-semibold text-amber-200')}>
                  {t('mobile.care_alerts', 'Alerts')}
                  {openAlertsCount > 0 ? ` (${openAlertsCount})` : ''}
                </Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Bottom Controls */}
          <View style={tw('mt-4 px-4 py-3.5 rounded-3xl bg-slate-900 border border-slate-800 flex-row items-center justify-around')}>
            <TouchableOpacity
              onPress={() => setIsMicOn((prev) => !prev)}
              style={tw(
                `w-12 h-12 rounded-full items-center justify-center ${
                  isMicOn ? 'bg-slate-800' : 'bg-red-600'
                }`,
              )}
            >
              {isMicOn ? <Mic size={20} color="#ffffff" /> : <MicOff size={20} color="#ffffff" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => setIsCameraOn((prev) => !prev)}
              style={tw(
                `w-12 h-12 rounded-full items-center justify-center ${
                  isCameraOn ? 'bg-slate-800' : 'bg-red-600'
                }`,
              )}
            >
              {isCameraOn ? <Video size={20} color="#ffffff" /> : <VideoOff size={20} color="#ffffff" />}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => router.push(`/(doctor)/chat/${consultationId}`)}
              style={tw('w-12 h-12 rounded-full bg-slate-800 items-center justify-center')}
            >
              <MessageCircle size={20} color="#5eead4" />
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isEndingCall}
              onPress={handleCompleteAndExit}
              style={tw('px-5 h-12 rounded-full bg-red-600 flex-row items-center justify-center gap-2')}
            >
              {isEndingCall ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <PhoneOff size={18} color="#ffffff" />
              )}
              <Text style={tw('text-xs font-bold text-white')}>
                {sessionStatus === 'in_consultation'
                  ? t('mobile.complete_and_end', 'End Session')
                  : t('mobile.leave_room', 'Leave')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Clinical Notes Modal */}
      <Modal
        visible={isNotesModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setIsNotesModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 bg-black/60 justify-end')}
        >
          <View
            style={[
              tw('bg-white dark:bg-slate-900 rounded-t-3xl p-5 border-t border-slate-100 dark:border-slate-800'),
              {
                shadowColor: '#0f172a',
                shadowOffset: { width: 0, height: -2 },
                shadowOpacity: 0.12,
                shadowRadius: 12,
                elevation: 6,
              },
            ]}
          >
            <View style={tw('flex-row items-center justify-between mb-3')}>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                {t('mobile.clinical_notes', 'Clinical Notes')}
              </Text>
              <TouchableOpacity onPress={() => setIsNotesModalVisible(false)}>
                <ChevronDown size={22} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <ScrollView style={tw('max-h-72')}>
              <TextInput
                value={clinicalNotes}
                onChangeText={setClinicalNotes}
                editable={!isClosed}
                multiline
                placeholder={t('mobile.clinical_notes_placeholder', 'Record symptoms, observations, and plan...')}
                placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
                style={tw(
                  'p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white min-h-[140px]',
                )}
                textAlignVertical="top"
              />
            </ScrollView>
            <View style={tw('flex-row justify-end gap-2 mt-4')}>
              <TouchableOpacity
                onPress={() => setIsNotesModalVisible(false)}
                style={tw('px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800')}
              >
                <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                  {t('mobile.close', 'Close')}
                </Text>
              </TouchableOpacity>
              {!isClosed && (
                <TouchableOpacity
                  disabled={isSavingNotes}
                  onPress={handleSaveNotes}
                  style={tw('px-4 py-2.5 rounded-xl bg-teal-600 flex-row items-center gap-1.5')}
                >
                  {isSavingNotes ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Save size={14} color="#ffffff" />
                  )}
                  <Text style={tw('text-xs font-bold text-white')}>{t('mobile.save', 'Save')}</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      <AiSummaryModal
        visible={isAiSummaryVisible}
        onClose={() => setIsAiSummaryVisible(false)}
        enrollmentId={enrollmentId}
        patientName={patientName}
        programName={programName}
        audience="doctor"
      />

      <HealthChartModal
        visible={isChartVisible}
        onClose={() => setIsChartVisible(false)}
        patientId={patientId}
        patientName={patientName}
      />

      <CareAlertsModal
        visible={isAlertsVisible}
        onClose={() => setIsAlertsVisible(false)}
        patientId={patientId}
        patientName={patientName}
        onChanged={loadCallContext}
      />
    </SafeAreaView>
  );
}
