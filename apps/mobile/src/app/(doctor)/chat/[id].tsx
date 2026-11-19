import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
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
  ArrowLeft,
  Download,
  Edit3,
  Eye,
  FileText,
  Flag,
  Image as ImageIcon,
  Paperclip,
  RefreshCw,
  Send,
  Trash2,
  Video,
  X,
} from 'lucide-react-native';
import {
  connectPresenceSocket,
  connectSocket,
  generateIdempotencyKey,
  mobileApi,
  normalizeCursorList,
  normalizePaginatedList,
  presenceSocket,
  socket,
  SOCKET_EVENTS,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { downloadMediaFileToDevice, type NativeMediaFile } from '@/services/nativeMedia';
import { Skeleton } from '@/components/ui/Skeleton';
import {
  AttachmentPickerModal,
  DocViewerModal,
  ImageViewerModal,
} from '@/components/modals';

type RawRecord = Record<string, unknown>;

interface ChatAttachment {
  uri: string;
  name: string;
  type: 'image' | 'file';
  mimeType: string;
  size: string;
}

interface ChatMessageItem {
  id: string;
  clientMessageId?: string;
  senderType: 'doctor' | 'patient' | 'system';
  content: string;
  sentAt: string;
  editedAt?: string;
  attachment?: ChatAttachment;
}

interface VitalPeekItem {
  id: string;
  type: string;
  valueLabel: string;
  measuredAt: string;
}

const REPORT_TYPES: Array<{
  value: FeTypes.ViolationsCreateRequest['report_type'];
  labelKey: string;
  defaultLabel: string;
}> = [
  { value: 'harassment', labelKey: 'mobile.report_type_harassment', defaultLabel: 'Harassment' },
  {
    value: 'inappropriate_content',
    labelKey: 'mobile.report_type_inappropriate',
    defaultLabel: 'Inappropriate behavior',
  },
  { value: 'spam', labelKey: 'mobile.report_type_spam', defaultLabel: 'Spam' },
  { value: 'other', labelKey: 'mobile.report_type_other', defaultLabel: 'Other' },
];

function formatFileSizeLabel(rawSize: unknown): string {
  if (typeof rawSize === 'string' && rawSize.trim()) return rawSize.trim();
  if (typeof rawSize === 'number' && rawSize > 0) {
    if (rawSize >= 1024 * 1024) return `${(rawSize / (1024 * 1024)).toFixed(1)} MB`;
    return `${Math.max(1, Math.round(rawSize / 1024))} KB`;
  }
  return 'PDF';
}

function mapRawAttachment(rawList: unknown): ChatAttachment | undefined {
  if (!Array.isArray(rawList) || rawList.length === 0) return undefined;
  const first = rawList[0];
  if (typeof first === 'string' && first.startsWith('http')) {
    const cleanName = first.split('/').pop()?.split('?')[0] || 'attachment';
    const isImage = /\.(jpg|jpeg|png|webp|gif)$/i.test(cleanName);
    return {
      uri: first,
      name: cleanName,
      type: isImage ? 'image' : 'file',
      mimeType: isImage ? 'image/jpeg' : 'application/pdf',
      size: isImage ? 'Image' : 'PDF',
    };
  }
  if (!first || typeof first !== 'object') return undefined;
  const obj = first as RawRecord;
  const uri = String(obj.url ?? obj.secureUrl ?? obj.uri ?? obj.fileUrl ?? '');
  if (!uri) return undefined;
  const name = String(obj.filename ?? obj.originalName ?? obj.name ?? 'medical_file');
  const mimeType = String(obj.mimeType ?? obj.mimetype ?? obj.contentType ?? '');
  const isImage =
    mimeType.startsWith('image/') ||
    obj.type === 'image' ||
    /\.(jpg|jpeg|png|webp|gif)$/i.test(name) ||
    /\.(jpg|jpeg|png|webp|gif)(\?|$)/i.test(uri);

  return {
    uri,
    name,
    type: isImage ? 'image' : 'file',
    mimeType: mimeType || (isImage ? 'image/jpeg' : 'application/pdf'),
    size: formatFileSizeLabel(obj.size ?? obj.fileSize),
  };
}

function mapRawMessage(raw: RawRecord): ChatMessageItem {
  const senderTypeRaw = String(raw.senderType ?? raw.senderRole ?? 'patient').toLowerCase();
  const senderType: ChatMessageItem['senderType'] =
    senderTypeRaw === 'doctor' || senderTypeRaw === 'system' ? senderTypeRaw : 'patient';

  return {
    id: String(raw._id ?? raw.id ?? `${raw.sentAt ?? Date.now()}-${Math.random()}`),
    clientMessageId: typeof raw.clientMessageId === 'string' ? raw.clientMessageId : undefined,
    senderType,
    content: typeof raw.content === 'string' ? raw.content : '',
    sentAt: String(raw.sentAt ?? raw.createdAt ?? new Date().toISOString()),
    editedAt: typeof raw.editedAt === 'string' ? raw.editedAt : undefined,
    attachment: mapRawAttachment(raw.attachments),
  };
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'PT';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ''}${parts[parts.length - 1][0] ?? ''}`.toUpperCase();
}

export default function DoctorChatSessionScreen() {
  const params = useLocalSearchParams<{ id?: string; consultationId?: string }>();
  const consultationId = String(params.consultationId ?? params.id ?? '');

  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useSafeRouter();
  const scrollRef = useRef<ScrollView>(null);
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [patientId, setPatientId] = useState('');
  const [patientName, setPatientName] = useState(() => t('mobile.patient_fallback', 'Patient'));
  const [patientAvatar, setPatientAvatar] = useState<string | undefined>(undefined);
  const [isPatientOnline, setIsPatientOnline] = useState(false);

  const [messages, setMessages] = useState<ChatMessageItem[]>([]);
  const [nextCursor, setNextCursor] = useState<string | undefined>(undefined);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoadingEarlier, setIsLoadingEarlier] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [msgText, setMsgText] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);

  const [showVitalsBanner, setShowVitalsBanner] = useState(false);
  const [vitals, setVitals] = useState<VitalPeekItem[]>([]);
  const [loadingVitals, setLoadingVitals] = useState(false);

  const [pickerVisible, setPickerVisible] = useState(false);
  const [pickerMode, setPickerMode] = useState<'image' | 'file'>('image');
  const [viewerImage, setViewerImage] = useState<ChatAttachment | null>(null);
  const [viewerDoc, setViewerDoc] = useState<ChatAttachment | null>(null);

  const [editingMsg, setEditingMsg] = useState<ChatMessageItem | null>(null);
  const [editText, setEditText] = useState('');
  const [isMutatingMessage, setIsMutatingMessage] = useState(false);

  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [reportType, setReportType] =
    useState<FeTypes.ViolationsCreateRequest['report_type']>('inappropriate_content');
  const [reportReason, setReportReason] = useState('');
  const [isSubmittingReport, setIsSubmittingReport] = useState(false);

  const loadSession = useCallback(async () => {
    if (!consultationId) {
      setLoadError(t('mobile.missing_consultation_id', 'Missing consultation identifier'));
      return;
    }

    try {
      setLoadError(null);
      const [consultRes, messagesRes] = await Promise.all([
        mobileApi.consultationsFindOne({ params: { id: consultationId } }),
        mobileApi.chatGetConsultationMessages({
          params: { consultationId },
          query: { limit: 25, sortOrder: -1, sortBy: 'sentAt' },
        }),
      ]);

      const consultRaw = (consultRes?.data ?? consultRes) as RawRecord;
      const rawPatient = consultRaw?.patientId;
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

      if (resolvedPatientId) {
        try {
          const presenceRes = await mobileApi.presenceCheckUsersStatus({
            body: { userIds: [resolvedPatientId] },
          } as unknown as FeTypes.PresenceCheckUsersStatusRequest);
          const payload = (presenceRes?.data ?? presenceRes) as { onlineUserIds?: string[] };
          setIsPatientOnline(
            Array.isArray(payload?.onlineUserIds) &&
              payload.onlineUserIds.map(String).includes(resolvedPatientId),
          );
        } catch {
          // Non-blocking presence failure
        }
      }

      const cursorPage = normalizeCursorList<RawRecord>(messagesRes);
      setMessages(cursorPage.items.map(mapRawMessage).reverse());
      setNextCursor(cursorPage.nextCursor);
      setHasMoreMessages(Boolean(cursorPage.hasNextPage));
    } catch (err) {
      setLoadError(extractApiErrorMessage(err));
    }
  }, [consultationId, t]);

  useEffect(() => {
    let active = true;
    setIsLoading(true);
    loadSession().finally(() => {
      if (active) {
        setIsLoading(false);
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: false }), 120);
      }
    });
    return () => {
      active = false;
    };
  }, [loadSession]);

  useEffect(() => {
    if (!consultationId) return;
    connectSocket();
    connectPresenceSocket();

    socket.emit(SOCKET_EVENTS.JOIN_CONSULTATION, { consultationId });

    const onNewMessage = (event: unknown) => {
      if (!event || typeof event !== 'object') return;
      const e = event as RawRecord;
      const payload = (e.message && typeof e.message === 'object' ? e.message : e) as RawRecord;
      if (String(payload.consultationId ?? e.consultationId ?? '') !== consultationId) return;
      const incoming = mapRawMessage(payload);
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === incoming.id ||
            (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId),
        );
        if (exists) {
          return prev.map((m) => (m.id === incoming.id ? incoming : m));
        }
        return [...prev, incoming];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    };

    const onPresence = (event: FeTypes.RealtimePresenceChanged) => {
      if (patientId && String(event?.userId ?? '') === patientId) {
        setIsPatientOnline(event?.status === 'online');
      }
    };

    socket.on(SOCKET_EVENTS.CONSULTATION_MESSAGE, onNewMessage);
    presenceSocket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_CONSULTATION, { consultationId });
      socket.off(SOCKET_EVENTS.CONSULTATION_MESSAGE, onNewMessage);
      presenceSocket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);
    };
  }, [consultationId, patientId]);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadSession();
    setIsRefreshing(false);
  }, [loadSession]);

  const handleLoadEarlier = useCallback(async () => {
    if (!consultationId || !nextCursor || isLoadingEarlier || !hasMoreMessages) return;
    setIsLoadingEarlier(true);
    try {
      const res = await mobileApi.chatGetConsultationMessages({
        params: { consultationId },
        query: { limit: 25, cursor: nextCursor, sortOrder: -1, sortBy: 'sentAt' },
      });
      const cursorPage = normalizeCursorList<RawRecord>(res);
      const older = cursorPage.items.map(mapRawMessage).reverse();
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const filteredOlder = older.filter((m) => !seen.has(m.id));
        return [...filteredOlder, ...prev];
      });
      setNextCursor(cursorPage.nextCursor);
      setHasMoreMessages(Boolean(cursorPage.hasNextPage));
    } catch (err) {
      Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
    } finally {
      setIsLoadingEarlier(false);
    }
  }, [consultationId, hasMoreMessages, isLoadingEarlier, nextCursor]);

  const handleToggleVitals = useCallback(async () => {
    const nextOpen = !showVitalsBanner;
    setShowVitalsBanner(nextOpen);
    if (!nextOpen || !patientId || vitals.length > 0 || loadingVitals) return;
    setLoadingVitals(true);
    try {
      const res = await mobileApi.healthMetricsFindAll({
        query: { patientId, limit: 4, sortOrder: -1 },
      });
      const normalized = normalizePaginatedList<RawRecord>(res);
      const mapped: VitalPeekItem[] = normalized.items.map((item) => {
        const type = String(item.type ?? 'metric');
        let valueLabel = '—';
        if (type === 'blood_pressure') {
          valueLabel = `${item.systolic ?? '—'}/${item.diastolic ?? '—'} mmHg`;
        } else if (typeof item.value === 'number' || typeof item.value === 'string') {
          valueLabel = `${item.value}${item.unit ? ` ${item.unit}` : ''}`;
        }
        return {
          id: String(item._id ?? item.id ?? Math.random()),
          type,
          valueLabel,
          measuredAt: String(item.measuredAt ?? item.createdAt ?? ''),
        };
      });
      setVitals(mapped);
    } catch {
      // Silently ignore non-critical vitals peek error
    } finally {
      setLoadingVitals(false);
    }
  }, [loadingVitals, patientId, showVitalsBanner, vitals.length]);

  const handleSendText = useCallback(async () => {
    const trimmed = msgText.trim();
    if (!trimmed || !consultationId || isSending) return;

    setIsSending(true);
    try {
      try {
        const check = await mobileApi.blacklistKeywordsCheckContent({
          body: { content: trimmed },
        } as unknown as FeTypes.BlacklistKeywordsCheckContentRequest);
        if (check?.flagged) {
          Toast.show({
            type: 'error',
            text1: t('mobile.message_flagged_warning', 'Message contains restricted wording'),
          });
          setIsSending(false);
          return;
        }
      } catch {
        // Proceed if moderation precheck endpoint is unavailable
      }

      const clientMessageId = generateIdempotencyKey('msg');
      const res = await mobileApi.chatSendMessage({
        consultationId,
        senderType: 'doctor',
        content: trimmed,
        clientMessageId,
      } as FeTypes.ChatSendMessageRequest);
      setMsgText('');
      const created = mapRawMessage((res?.data ?? {}) as RawRecord);
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === created.id ||
            (created.clientMessageId && m.clientMessageId === created.clientMessageId),
        );
        return exists ? prev : [...prev, created];
      });
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.send_failed', 'Could not send message'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setIsSending(false);
    }
  }, [consultationId, isSending, msgText, t]);

  const handleSendAttachment = useCallback(
    async (file: NativeMediaFile) => {
      if (!consultationId || isSending) return;
      setPickerVisible(false);
      setIsSending(true);
      try {
        const isImage = file.type === 'image';
        const mime =
          file.mimeType ||
          (isImage
            ? file.name.toLowerCase().endsWith('.png')
              ? 'image/png'
              : 'image/jpeg'
            : 'application/pdf');
        const content = isImage
          ? t('mobile.sent_medical_image', 'Sent a medical image.')
          : t('mobile.sent_medical_document', 'Sent a medical document.');
        const clientMessageId = generateIdempotencyKey('msg');
        const res = await mobileApi.chatSendMessage({
          consultationId,
          senderType: 'doctor',
          content,
          clientMessageId,
          attachments: [
            {
              uri: file.uri,
              name: file.name,
              type: mime,
            } as unknown as FeTypes.UploadBinary,
          ],
        } as unknown as FeTypes.ChatSendMessageRequest);
        const created = mapRawMessage((res?.data ?? {}) as RawRecord);
        setMessages((prev) => {
          const exists = prev.some(
            (m) =>
              m.id === created.id ||
              (created.clientMessageId && m.clientMessageId === created.clientMessageId),
          );
          return exists ? prev : [...prev, created];
        });
        setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 80);
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: t('mobile.attachment_upload_failed', 'Unable to upload attachment'),
          text2: extractApiErrorMessage(err),
        });
      } finally {
        setIsSending(false);
      }
    },
    [consultationId, isSending, t],
  );

  const handleDownloadAttachment = useCallback(
    async (msg: ChatMessageItem) => {
      if (!msg.attachment || downloadingId) return;
      setDownloadingId(msg.id);
      try {
        await downloadMediaFileToDevice({
          uri: msg.attachment.uri,
          fileName: msg.attachment.name,
          mimeType: msg.attachment.mimeType,
        });
      } finally {
        setDownloadingId(null);
      }
    },
    [downloadingId],
  );

  const handleSaveEditMessage = useCallback(async () => {
    if (!editingMsg || isMutatingMessage) return;
    const trimmed = editText.trim();
    if (!trimmed) return;
    setIsMutatingMessage(true);
    try {
      await mobileApi.chatUpdateMessage({
        params: { id: editingMsg.id },
        body: { content: trimmed },
      });
      setMessages((prev) =>
        prev.map((m) =>
          m.id === editingMsg.id ? { ...m, content: trimmed, editedAt: new Date().toISOString() } : m,
        ),
      );
      setEditingMsg(null);
      setEditText('');
    } catch (err) {
      Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
    } finally {
      setIsMutatingMessage(false);
    }
  }, [editText, editingMsg, isMutatingMessage]);

  const handleDeleteMessage = useCallback(
    async (id: string) => {
      if (isMutatingMessage) return;
      setIsMutatingMessage(true);
      try {
        await mobileApi.chatRemoveMessage({ params: { id } });
        setMessages((prev) => prev.filter((m) => m.id !== id));
        setEditingMsg(null);
      } catch (err) {
        Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
      } finally {
        setIsMutatingMessage(false);
      }
    },
    [isMutatingMessage],
  );

  const handleSubmitReport = useCallback(async () => {
    if (!patientId || isSubmittingReport) return;
    const trimmed = reportReason.trim();
    if (!trimmed) {
      Toast.show({ type: 'info', text1: t('mobile.enter_report_reason', 'Please enter a reason') });
      return;
    }
    setIsSubmittingReport(true);
    try {
      await mobileApi.violationsCreate({
        reported_user_id: patientId,
        report_type: reportType,
        reason: trimmed,
      });
      Toast.show({ type: 'success', text1: t('mobile.report_submitted', 'Violation report submitted') });
      setReportModalOpen(false);
      setReportReason('');
    } catch (err) {
      Toast.show({ type: 'error', text1: extractApiErrorMessage(err) });
    } finally {
      setIsSubmittingReport(false);
    }
  }, [isSubmittingReport, patientId, reportReason, reportType, t]);

  const formatMsgTime = (iso: string) => {
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '';
    return d.toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top', 'bottom']}>
      {/* Header */}
      <View
        style={tw(
          'px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between',
        )}
      >
        <View style={tw('flex-row items-center gap-2.5 flex-1 min-w-0 pr-2')}>
          <TouchableOpacity onPress={() => router.back('/(doctor)/chat')} style={tw('p-2 -ml-1 rounded-xl')}>
            <ArrowLeft size={20} color={isDark ? '#e2e8f0' : '#0f172a'} />
          </TouchableOpacity>
          {patientAvatar ? (
            <Image
              source={{ uri: patientAvatar }}
              style={tw('w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700')}
            />
          ) : (
            <View style={tw('w-10 h-10 rounded-full bg-teal-100 dark:bg-teal-900/60 items-center justify-center')}>
              <Text style={tw('text-xs font-bold text-teal-800 dark:text-teal-200')}>
                {getInitials(patientName)}
              </Text>
            </View>
          )}
          <View style={tw('flex-1 min-w-0')}>
            <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
              {patientName}
            </Text>
            <View style={tw('flex-row items-center gap-1.5 mt-0.5')}>
              <View
                style={tw(`w-2 h-2 rounded-full ${isPatientOnline ? 'bg-emerald-500' : 'bg-slate-400'}`)}
              />
              <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                {isPatientOnline ? t('mobile.online', 'Online') : t('mobile.offline', 'Offline')}
              </Text>
            </View>
          </View>
        </View>

        <View style={tw('flex-row items-center gap-1.5')}>
          <TouchableOpacity
            onPress={handleToggleVitals}
            style={tw(
              `p-2 rounded-xl border ${
                showVitalsBanner
                  ? 'bg-teal-600 border-teal-600'
                  : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`,
            )}
          >
            <Activity size={17} color={showVitalsBanner ? '#ffffff' : isDark ? '#5eead4' : '#0d9488'} />
          </TouchableOpacity>

          <TouchableOpacity
            onPress={() => router.push(`/(doctor)/video-call?consultationId=${consultationId}`)}
            style={tw('p-2 rounded-xl bg-teal-50 dark:bg-teal-950/60 border border-teal-200 dark:border-teal-800')}
          >
            <Video size={17} color="#0d9488" />
          </TouchableOpacity>

          {Boolean(patientId) && (
            <TouchableOpacity
              onPress={() => setReportModalOpen(true)}
              style={tw('p-2 rounded-xl bg-red-50 dark:bg-red-950/50 border border-red-200 dark:border-red-800')}
            >
              <Flag size={16} color="#ef4444" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Collapsible Recent Vitals Peek */}
      {showVitalsBanner && (
        <View style={tw('px-4 py-2.5 bg-teal-50 dark:bg-teal-950/40 border-b border-teal-100 dark:border-teal-900')}>
          <Text style={tw('text-[11px] font-bold text-teal-800 dark:text-teal-300 uppercase mb-1.5')}>
            {t('mobile.recent_patient_vitals', 'Recent Recorded Vitals')}
          </Text>
          {loadingVitals ? (
            <Skeleton className="h-6 w-48 rounded-lg" />
          ) : vitals.length === 0 ? (
            <Text style={tw('text-xs text-slate-600 dark:text-slate-300')}>
              {t('mobile.no_recent_vitals', 'No recent vitals recorded yet.')}
            </Text>
          ) : (
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw('gap-2')}>
              {vitals.map((v) => (
                <View
                  key={v.id}
                  style={tw('px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-teal-200 dark:border-teal-800')}
                >
                  <Text style={tw('text-[11px] font-bold text-slate-900 dark:text-white')}>
                    {v.valueLabel}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      )}

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
      >
        {isLoading ? (
          <View style={tw('p-5 gap-3 flex-1')}>
            <Skeleton className="h-12 w-3/4 rounded-2xl" />
            <Skeleton className="h-14 w-2/3 rounded-2xl self-end" />
            <Skeleton className="h-12 w-3/5 rounded-2xl" />
          </View>
        ) : loadError ? (
          <View style={tw('flex-1 items-center justify-center px-8')}>
            <AlertCircle size={38} color="#ef4444" />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
              {t('mobile.load_error_title', 'Unable to open chat')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center')}>{loadError}</Text>
            <TouchableOpacity
              onPress={() => {
                setIsLoading(true);
                loadSession().finally(() => setIsLoading(false));
              }}
              style={tw('mt-4 px-5 py-2.5 rounded-xl bg-teal-600 flex-row items-center gap-2')}
            >
              <RefreshCw size={15} color="#ffffff" />
              <Text style={tw('text-sm font-bold text-white')}>{t('mobile.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <ScrollView
            ref={scrollRef}
            contentContainerStyle={tw('px-4 pt-4 pb-6 gap-3')}
            refreshControl={<RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />}
          >
            {hasMoreMessages && (
              <TouchableOpacity
                disabled={isLoadingEarlier}
                onPress={handleLoadEarlier}
                style={tw('self-center px-4 py-1.5 rounded-full bg-slate-200 dark:bg-slate-800 mb-2')}
              >
                {isLoadingEarlier ? (
                  <ActivityIndicator size="small" color="#0d9488" />
                ) : (
                  <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.load_earlier_messages', 'Load earlier messages')}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {messages.length === 0 ? (
              <View style={tw('py-12 items-center')}>
                <Text style={tw('text-xs text-slate-400 text-center')}>
                  {t('mobile.no_messages_yet', 'No messages in this consultation yet.')}
                </Text>
              </View>
            ) : (
              messages.map((msg) => {
                if (msg.senderType === 'system') {
                  return (
                    <View key={msg.id} style={tw('self-center px-3 py-1 rounded-full bg-slate-200/70 dark:bg-slate-800')}>
                      <Text style={tw('text-[11px] text-slate-600 dark:text-slate-300 text-center')}>
                        {msg.content}
                      </Text>
                    </View>
                  );
                }

                const isDoctor = msg.senderType === 'doctor';
                const attachment = msg.attachment;

                return (
                  <TouchableOpacity
                    key={msg.id}
                    activeOpacity={isDoctor ? 0.85 : 1}
                    onLongPress={() => {
                      if (!isDoctor || msg.attachment) return;
                      setEditingMsg(msg);
                      setEditText(msg.content);
                    }}
                    style={tw(`max-w-[82%] ${isDoctor ? 'self-end items-end' : 'self-start items-start'}`)}
                  >
                    <View
                      style={tw(
                        `rounded-2xl p-3 overflow-hidden ${
                          isDoctor
                            ? 'bg-teal-600 rounded-br-sm'
                            : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-bl-sm'
                        }`,
                      )}
                    >
                      {attachment?.type === 'image' && (
                        <View style={tw('mb-2 relative')}>
                          <TouchableOpacity onPress={() => setViewerImage(attachment)}>
                            <Image
                              source={{ uri: attachment.uri }}
                              style={tw('w-56 h-40 rounded-xl bg-slate-200 dark:bg-slate-800')}
                              resizeMode="cover"
                            />
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={downloadingId === msg.id}
                            onPress={() => handleDownloadAttachment(msg)}
                            style={tw(
                              'absolute top-2 right-2 flex-row items-center gap-1 px-2.5 py-1 rounded-full bg-black/65',
                            )}
                          >
                            {downloadingId === msg.id ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Download size={12} color="#ffffff" />
                            )}
                            <Text style={tw('text-[10px] font-bold text-white')}>
                              {t('mobile.download', 'Download')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      )}

                      {attachment?.type === 'file' && (
                        <View
                          style={tw(
                            `w-64 overflow-hidden flex-row items-center gap-2.5 p-2.5 rounded-xl mb-1.5 ${
                              isDoctor ? 'bg-teal-700/80' : 'bg-slate-100 dark:bg-slate-800'
                            }`,
                          )}
                        >
                          <View style={tw('w-9 h-9 rounded-lg bg-red-100 dark:bg-red-900/40 items-center justify-center shrink-0')}>
                            <FileText size={18} color="#dc2626" />
                          </View>
                          <View style={tw('flex-1 min-w-0')}>
                            <Text
                              style={tw(
                                `text-xs font-bold ${isDoctor ? 'text-white' : 'text-slate-900 dark:text-white'}`,
                              )}
                              numberOfLines={1}
                              ellipsizeMode="middle"
                            >
                              {attachment.name}
                            </Text>
                            <Text
                              style={tw(
                                `text-[11px] mt-0.5 ${isDoctor ? 'text-teal-100' : 'text-slate-500 dark:text-slate-400'}`,
                              )}
                              numberOfLines={1}
                            >
                              {attachment.size}
                            </Text>
                          </View>
                          <View style={tw('flex-row items-center gap-1.5 shrink-0')}>
                            <TouchableOpacity
                              onPress={() => setViewerDoc(attachment)}
                              style={tw(
                                `p-1.5 rounded-lg ${isDoctor ? 'bg-white/15' : 'bg-white dark:bg-slate-900'}`,
                              )}
                            >
                              <Eye size={14} color={isDoctor ? '#ffffff' : '#0f172a'} />
                            </TouchableOpacity>
                            <TouchableOpacity
                              disabled={downloadingId === msg.id}
                              onPress={() => handleDownloadAttachment(msg)}
                              style={tw(
                                `p-1.5 rounded-lg ${isDoctor ? 'bg-white/15' : 'bg-white dark:bg-slate-900'}`,
                              )}
                            >
                              {downloadingId === msg.id ? (
                                <ActivityIndicator size="small" color={isDoctor ? '#ffffff' : '#0d9488'} />
                              ) : (
                                <Download size={14} color={isDoctor ? '#ffffff' : '#0f172a'} />
                              )}
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {Boolean(msg.content) && (
                        <Text
                          style={[
                            tw(`text-sm leading-5 ${isDoctor ? 'text-white' : 'text-slate-800 dark:text-slate-100'}`),
                            { flexShrink: 1 },
                          ]}
                        >
                          {msg.content}
                        </Text>
                      )}
                    </View>

                    <Text style={tw('text-[10px] text-slate-400 mt-1 px-1')}>
                      {formatMsgTime(msg.sentAt)}
                      {msg.editedAt ? ` • ${t('mobile.edited', 'Edited')}` : ''}
                    </Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        )}

        {/* Composer */}
        <View
          style={tw(
            'px-3 py-2.5 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-row items-end gap-2',
          )}
        >
          <TouchableOpacity
            disabled={isSending}
            onPress={() => {
              setPickerMode('image');
              setPickerVisible(true);
            }}
            style={tw('p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800')}
          >
            <ImageIcon size={18} color={isDark ? '#94a3b8' : '#475569'} />
          </TouchableOpacity>

          <TouchableOpacity
            disabled={isSending}
            onPress={() => {
              setPickerMode('file');
              setPickerVisible(true);
            }}
            style={tw('p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800')}
          >
            <Paperclip size={18} color={isDark ? '#94a3b8' : '#475569'} />
          </TouchableOpacity>

          <TextInput
            value={msgText}
            onChangeText={setMsgText}
            multiline
            placeholder={t('mobile.type_message_placeholder', 'Write a message...')}
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            style={tw(
              'flex-1 max-h-24 px-3.5 py-2 rounded-2xl bg-slate-100 dark:bg-slate-800 text-sm text-slate-900 dark:text-white',
            )}
          />

          <TouchableOpacity
            disabled={isSending || !msgText.trim()}
            onPress={handleSendText}
            style={[
              tw('p-2.5 rounded-xl bg-teal-600'),
              (!msgText.trim() || isSending) && { opacity: 0.5 },
            ]}
          >
            {isSending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send size={18} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Modals */}
      <AttachmentPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        initialMode={pickerMode}
        onSendAttachment={handleSendAttachment}
      />

      <ImageViewerModal
        visible={Boolean(viewerImage)}
        onClose={() => setViewerImage(null)}
        imageUri={viewerImage?.uri}
        imageName={viewerImage?.name}
        imageSize={viewerImage?.size}
      />

      <DocViewerModal
        visible={Boolean(viewerDoc)}
        onClose={() => setViewerDoc(null)}
        fileUri={viewerDoc?.uri}
        fileName={viewerDoc?.name}
        fileSize={viewerDoc?.size}
      />

      {/* Edit / Delete Message Modal */}
      <Modal
        visible={Boolean(editingMsg)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditingMsg(null)}
      >
        <View style={tw('flex-1 bg-black/50 justify-center px-5')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800')}>
            <View style={tw('flex-row items-center justify-between')}>
              <View style={tw('flex-row items-center gap-2')}>
                <Edit3 size={17} color="#0d9488" />
                <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.edit_message', 'Edit Message')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setEditingMsg(null)}>
                <X size={18} color="#94a3b8" />
              </TouchableOpacity>
            </View>
            <TextInput
              value={editText}
              onChangeText={setEditText}
              multiline
              style={tw(
                'mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white min-h-[84px]',
              )}
              textAlignVertical="top"
            />
            <View style={tw('flex-row justify-between items-center mt-4')}>
              <TouchableOpacity
                disabled={isMutatingMessage}
                onPress={() => editingMsg && handleDeleteMessage(editingMsg.id)}
                style={tw('flex-row items-center gap-1.5 px-3 py-2 rounded-xl bg-red-50 dark:bg-red-950/60')}
              >
                <Trash2 size={14} color="#dc2626" />
                <Text style={tw('text-xs font-bold text-red-600 dark:text-red-300')}>
                  {t('mobile.delete', 'Delete')}
                </Text>
              </TouchableOpacity>

              <View style={tw('flex-row gap-2')}>
                <TouchableOpacity
                  onPress={() => setEditingMsg(null)}
                  style={tw('px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800')}
                >
                  <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                    {t('mobile.cancel', 'Cancel')}
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  disabled={isMutatingMessage || !editText.trim()}
                  onPress={handleSaveEditMessage}
                  style={tw('px-4 py-2 rounded-xl bg-teal-600')}
                >
                  <Text style={tw('text-xs font-bold text-white')}>{t('mobile.save', 'Save')}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Report Modal */}
      <Modal
        visible={reportModalOpen}
        transparent
        animationType="fade"
        onRequestClose={() => setReportModalOpen(false)}
      >
        <View style={tw('flex-1 bg-black/50 justify-center px-5')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-100 dark:border-slate-800')}>
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
              {t('mobile.report_patient_title', 'Report Patient Behavior')}
            </Text>
            <View style={tw('flex-row flex-wrap gap-2 mt-3')}>
              {REPORT_TYPES.map((item) => {
                const selected = reportType === item.value;
                return (
                  <TouchableOpacity
                    key={item.value}
                    onPress={() => setReportType(item.value)}
                    style={tw(
                      `px-3 py-1.5 rounded-full border ${
                        selected
                          ? 'bg-red-600 border-red-600'
                          : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                      }`,
                    )}
                  >
                    <Text
                      style={tw(
                        `text-xs font-semibold ${selected ? 'text-white' : 'text-slate-700 dark:text-slate-300'}`,
                      )}
                    >
                      {t(item.labelKey, item.defaultLabel)}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              multiline
              placeholder={t('mobile.report_reason_placeholder', 'Describe the issue...')}
              placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
              style={tw(
                'mt-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-sm text-slate-900 dark:text-white min-h-[84px]',
              )}
              textAlignVertical="top"
            />
            <View style={tw('flex-row justify-end gap-2 mt-4')}>
              <TouchableOpacity
                onPress={() => setReportModalOpen(false)}
                style={tw('px-4 py-2 rounded-xl bg-slate-100 dark:bg-slate-800')}
              >
                <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                  {t('mobile.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={isSubmittingReport}
                onPress={handleSubmitReport}
                style={tw('px-4 py-2 rounded-xl bg-red-600')}
              >
                <Text style={tw('text-xs font-bold text-white')}>
                  {t('mobile.submit_report', 'Submit Report')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
