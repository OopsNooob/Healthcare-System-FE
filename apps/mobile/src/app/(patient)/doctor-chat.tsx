import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
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
import {
  ChevronLeft,
  Download,
  Eye,
  FileText,
  Flag,
  ImagePlus,
  Paperclip,
  Phone,
  Send,
  Star,
  Video,
  X,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import { evaluateConsultationAccess } from '@/utils/consultationAccess';
import { AttachmentPickerModal, DocViewerModal, ImageViewerModal } from '@/components/modals';
import { downloadMediaFileToDevice, type NativeMediaFile } from '@/services/nativeMedia';
import {
  connectConsultationsSocket,
  connectSocket,
  consultationsSocket,
  generateIdempotencyKey,
  mobileApi,
  normalizeCursorList,
  normalizePaginatedList,
  presenceSocket,
  socket,
  SOCKET_EVENTS,
  useSharedAuthStore,
  type FeTypes,
} from '@repo/shared-hooks';

type AttachmentKind = 'image' | 'file';

interface ChatAttachment {
  uri: string;
  name: string;
  size: string;
  type: AttachmentKind;
  mimeType: string;
}

interface ChatMessage {
  id: string;
  clientMessageId?: string;
  senderId: string;
  sender: 'me' | 'doctor';
  text: string;
  time: string;
  type: 'text' | 'image' | 'file';
  attachment?: ChatAttachment;
}

type ReportCategory =
  | 'harassment'
  | 'spam'
  | 'misinformation'
  | 'inappropriate_content'
  | 'other';

function formatBytesLabel(size?: number): string {
  if (!size || size <= 0) return '';
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'DR';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export default function PatientDoctorChatScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const router = useRouter();
  const params = useLocalSearchParams<{ consultationId?: string; doctorId?: string }>();
  const token = useSharedAuthStore((s) => s.token);
  const authUser = useSharedAuthStore((s) => s.user);
  const scrollViewRef = useRef<ScrollView>(null);

  const [consultationId, setConsultationId] = useState<string>(params.consultationId || '');
  const [doctorId, setDoctorId] = useState<string>(params.doctorId || '');
  const [doctorName, setDoctorName] = useState<string>('');
  const [doctorAvatar, setDoctorAvatar] = useState<string>('');
  const [doctorOnline, setDoctorOnline] = useState<boolean>(false);
  const [consultationStatus, setConsultationStatus] = useState<{
    mode: string;
    requestStatus: string;
    sessionStatus: string;
    queueJoinedAt: string | null;
    calledAt: string | null;
  }>({
    mode: '',
    requestStatus: '',
    sessionStatus: '',
    queueJoinedAt: null,
    calledAt: null,
  });

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMoreMessages, setHasMoreMessages] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);

  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [attachmentModalVisible, setAttachmentModalVisible] = useState(false);
  const [attachmentMode, setAttachmentMode] = useState<'image' | 'file'>('image');
  const [selectedImagePreview, setSelectedImagePreview] = useState<{
    uri?: string;
    name?: string;
    size?: string;
  } | null>(null);
  const [selectedDocPreview, setSelectedDocPreview] = useState<{
    uri?: string;
    name?: string;
    size?: string;
  } | null>(null);

  // Edit message modal
  const [editTarget, setEditTarget] = useState<ChatMessage | null>(null);
  const [editDraft, setEditDraft] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  // Report violation modal
  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [reportCategory, setReportCategory] = useState<ReportCategory>('inappropriate_content');
  const [reportReason, setReportReason] = useState('');
  const [submittingReport, setSubmittingReport] = useState(false);

  // Review modal
  const [reviewModalVisible, setReviewModalVisible] = useState(false);
  const [existingReviewId, setExistingReviewId] = useState<string | undefined>(undefined);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState('');
  const [submittingReview, setSubmittingReview] = useState(false);

  const mapRawMessage = useCallback(
    (raw: Record<string, unknown>): ChatMessage => {
      const id = String(raw._id ?? raw.id ?? raw.clientMessageId ?? `${Date.now()}-${Math.random()}`);
      const senderType = String(raw.senderType ?? '');
      const senderId = String(raw.senderId ?? '');
      const sender: 'me' | 'doctor' =
        senderType === 'patient' || (authUser?.id && senderId === authUser.id) ? 'me' : 'doctor';
      const sentAtRaw = String(raw.sentAt ?? raw.createdAt ?? '');
      const time = sentAtRaw
        ? new Date(sentAtRaw).toLocaleTimeString(dateLocale, { hour: '2-digit', minute: '2-digit' })
        : '';

      const rawAtts = Array.isArray(raw.attachments)
        ? (raw.attachments as Record<string, unknown>[])
        : [];
      const firstAtt = rawAtts[0];
      let msgType: ChatMessage['type'] = 'text';
      let attachment: ChatAttachment | undefined;
      if (firstAtt) {
        const mime = String(firstAtt.mimeType ?? 'application/octet-stream');
        const isImg = mime.startsWith('image/');
        msgType = isImg ? 'image' : 'file';
        attachment = {
          uri: String(firstAtt.fileUrl ?? ''),
          name: String(firstAtt.fileName ?? t('mobile.attachment', 'Attachment')),
          size: formatBytesLabel(typeof firstAtt.fileSize === 'number' ? firstAtt.fileSize : undefined),
          type: isImg ? 'image' : 'file',
          mimeType: mime,
        };
      }

      return {
        id,
        clientMessageId: raw.clientMessageId ? String(raw.clientMessageId) : undefined,
        senderId,
        sender,
        text: String(raw.content ?? ''),
        time,
        type: msgType,
        attachment,
      };
    },
    [authUser?.id, dateLocale, t],
  );

  const loadInitialChat = useCallback(
    async (isRefresh = false) => {
      if (!isRefresh) setLoading(true);
      setErrorMsg(null);
      try {
        let activeConsultId = params.consultationId || consultationId || '';
        let resolvedDocId = params.doctorId || doctorId || '';
        let consultData: Record<string, unknown> | null = null;

        if (activeConsultId) {
          const res = await mobileApi.consultationsFindOne({ params: { id: activeConsultId } });
          consultData = (res?.data ?? null) as Record<string, unknown> | null;
        } else {
          const listRes = await mobileApi.consultationsFindAll({
            query: {
              page: 1,
              limit: 20,
              sortOrder: -1,
              ...(resolvedDocId ? { doctorId: resolvedDocId } : {}),
            },
          });
          const items = normalizePaginatedList<Record<string, unknown>>(listRes).items;
          const preferred =
            items.find((c) =>
              evaluateConsultationAccess({
                mode: String(c.mode ?? ''),
                requestStatus: String(c.requestStatus ?? ''),
                sessionStatus: String(c.sessionStatus ?? ''),
                queueJoinedAt: typeof c.queueJoinedAt === 'string' ? c.queueJoinedAt : null,
                calledAt: typeof c.calledAt === 'string' ? c.calledAt : null,
              }).canChat,
            ) ??
            items.find((c) => ['accepted', 'pending'].includes(String(c.requestStatus ?? ''))) ??
            items[0];
          if (preferred) {
            consultData = preferred;
            activeConsultId = String(preferred._id ?? preferred.id ?? '');
          }
        }

        if (!activeConsultId || !consultData) {
          setConsultationId('');
          setConsultationStatus({
            mode: '',
            requestStatus: '',
            sessionStatus: '',
            queueJoinedAt: null,
            calledAt: null,
          });
          setMessages([]);
          return;
        }

        setConsultationId(activeConsultId);
        const resolvedSesStatus = String(consultData.sessionStatus ?? '');
        setConsultationStatus({
          mode: String(consultData.mode ?? ''),
          requestStatus: String(consultData.requestStatus ?? ''),
          sessionStatus: resolvedSesStatus,
          queueJoinedAt:
            typeof consultData.queueJoinedAt === 'string' ? consultData.queueJoinedAt : null,
          calledAt: typeof consultData.calledAt === 'string' ? consultData.calledAt : null,
        });

        const docRaw = consultData.doctorId;
        if (docRaw && typeof docRaw === 'object') {
          const dObj = docRaw as Record<string, unknown>;
          resolvedDocId = String(dObj._id ?? dObj.id ?? resolvedDocId);
          setDoctorName(String(dObj.fullName ?? t('mobile.specialist_doctor', 'Doctor')));
          setDoctorAvatar(String(dObj.avatarUrl ?? ''));
        } else {
          resolvedDocId = String(docRaw ?? resolvedDocId);
        }

        if (resolvedDocId) {
          setDoctorId(resolvedDocId);
          const [docUser, presenceRes] = await Promise.all([
            !doctorName
              ? mobileApi.usersFindOne({ params: { id: resolvedDocId } }).catch(() => null)
              : Promise.resolve(null),
            mobileApi
              .presenceCheckUsersStatus({
                body: { userIds: [resolvedDocId] },
              } as unknown as FeTypes.PresenceCheckUsersStatusRequest)
              .catch(() => null),
          ]);
          if (docUser) {
            const u = docUser as unknown as Record<string, unknown>;
            setDoctorName(String(u.fullName ?? t('mobile.specialist_doctor', 'Doctor')));
            setDoctorAvatar(String(u.avatarUrl ?? ''));
            setDoctorOnline(Boolean(u.isOnline));
          }
          if (presenceRes?.data?.onlineUserIds) {
            setDoctorOnline(presenceRes.data.onlineUserIds.map(String).includes(resolvedDocId));
          }
        }

        const [messagesRes, reviewRes] = await Promise.all([
          mobileApi.chatGetConsultationMessages({
            params: { consultationId: activeConsultId },
            query: { limit: 30, sortOrder: -1, sortBy: 'sentAt' },
          }),
          resolvedSesStatus === 'completed'
            ? mobileApi
                .reviewsFindByConsultationId({ params: { id: activeConsultId } })
                .catch(() => null)
            : Promise.resolve(null),
        ]);

        if (reviewRes?.data) {
          const rev = reviewRes.data as Record<string, unknown>;
          setExistingReviewId(String(rev._id ?? rev.id ?? ''));
          setReviewRating(Number(rev.rating ?? 5));
          setReviewComment(String(rev.comment ?? ''));
        } else {
          setExistingReviewId(undefined);
        }

        const cursorPage = normalizeCursorList<Record<string, unknown>>(messagesRes);
        const mapped = cursorPage.items.map(mapRawMessage).reverse();
        setMessages(mapped);
        setNextCursor(cursorPage.nextCursor);
        setHasMoreMessages(cursorPage.hasNextPage);
      } catch (err) {
        setErrorMsg(extractApiErrorMessage(err));
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [consultationId, doctorId, doctorName, mapRawMessage, params.consultationId, params.doctorId, t],
  );

  const loadInitialChatRef = useRef(loadInitialChat);
  loadInitialChatRef.current = loadInitialChat;

  useEffect(() => {
    void loadInitialChat(false);
  }, [loadInitialChat]);

  useEffect(() => {
    if (!consultationId) return;
    if (token) {
      void connectSocket(token);
      void connectConsultationsSocket(token);
    }
    socket.emit(SOCKET_EVENTS.JOIN_CONSULTATION, { consultationId });

    const onNewMessage = (raw: Record<string, unknown>) => {
      if (String(raw.consultationId ?? '') !== consultationId) return;
      const incoming = mapRawMessage(raw);
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === incoming.id ||
            (incoming.clientMessageId && m.clientMessageId === incoming.clientMessageId),
        );
        return exists ? prev : [...prev, incoming];
      });
    };

    const onPresence = (payload: FeTypes.RealtimePresenceChanged) => {
      if (payload?.userId && payload.userId === doctorId) {
        setDoctorOnline(payload.status === 'online');
      }
    };

    const onConsultationChanged = (payload: unknown) => {
      if (payload && typeof payload === 'object') {
        const p = payload as Record<string, unknown>;
        const cid = String(p.consultationId ?? p.id ?? p._id ?? '');
        if (cid && cid !== consultationId) return;
      }
      void loadInitialChatRef.current(true);
    };

    socket.on(SOCKET_EVENTS.CONSULTATION_MESSAGE, onNewMessage);
    presenceSocket.on(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);
    consultationsSocket.on(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onConsultationChanged);
    consultationsSocket.on(SOCKET_EVENTS.QUEUE_CALLED, onConsultationChanged);

    return () => {
      socket.emit(SOCKET_EVENTS.LEAVE_CONSULTATION, { consultationId });
      socket.off(SOCKET_EVENTS.CONSULTATION_MESSAGE, onNewMessage);
      presenceSocket.off(SOCKET_EVENTS.USER_STATUS_CHANGED, onPresence);
      consultationsSocket.off(SOCKET_EVENTS.CONSULTATIONS_CHANGED, onConsultationChanged);
      consultationsSocket.off(SOCKET_EVENTS.QUEUE_CALLED, onConsultationChanged);
    };
  }, [consultationId, doctorId, mapRawMessage, token]);

  const handleLoadEarlier = async () => {
    if (!consultationId || !nextCursor || loadingMore) return;
    setLoadingMore(true);
    try {
      const res = await mobileApi.chatGetConsultationMessages({
        params: { consultationId },
        query: { limit: 30, cursor: nextCursor, sortOrder: -1, sortBy: 'sentAt' },
      });
      const cursorPage = normalizeCursorList<Record<string, unknown>>(res);
      const older = cursorPage.items.map(mapRawMessage).reverse();
      setMessages((prev) => {
        const seen = new Set(prev.map((m) => m.id));
        const filteredOlder = older.filter((m) => !seen.has(m.id));
        return [...filteredOlder, ...prev];
      });
      setNextCursor(cursorPage.nextCursor);
      setHasMoreMessages(cursorPage.hasNextPage);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to load messages'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setLoadingMore(false);
    }
  };

  const handleDirectDownload = async (msg: ChatMessage) => {
    if (!msg.attachment || downloadingId === msg.id) return;
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
  };

  const access = evaluateConsultationAccess(consultationStatus);
  const isStatusLoaded = Boolean(consultationStatus.requestStatus);
  const isChatLocked = !isStatusLoaded || !access.canChat;
  const canVideoCall = isStatusLoaded && access.canVideoCall;
  const canReview = isStatusLoaded && access.canReview;
  const isWaitingLock =
    access.chatLockReason === 'pending' ||
    access.chatLockReason === 'scheduled_not_checked_in' ||
    access.chatLockReason === 'scheduled_waiting_call';
  const patientLockBannerMessage =
    access.chatLockReason === 'pending'
      ? t(
          'mobile.chat_locked_pending_patient',
          'Waiting for the doctor to accept your request. Chat and video call unlock once accepted.',
        )
      : access.chatLockReason === 'scheduled_not_checked_in'
        ? t(
            'mobile.chat_locked_scheduled_not_checked_in_patient',
            'You have not checked in for this appointment yet. Check in during the window and wait for the doctor to call you to unlock chat and video.',
          )
        : access.chatLockReason === 'scheduled_waiting_call'
          ? t(
              'mobile.chat_locked_scheduled_waiting_call_patient',
              'You are in the waiting queue. Chat and video call will unlock once the doctor calls your turn.',
            )
          : t(
              'mobile.consultation_chat_readonly',
              'This consultation is closed. History is read-only.',
            );

  const handleSend = async () => {
    const trimmed = msgText.trim();
    if (!trimmed || !consultationId || sending || isChatLocked) return;
    setSending(true);
    try {
      const check = await mobileApi
        .blacklistKeywordsCheckContent({
          body: { content: trimmed },
        } as unknown as FeTypes.BlacklistKeywordsCheckContentRequest)
        .catch(() => null);
      if (check?.flagged) {
        Toast.show({
          type: 'error',
          text1: t('mobile.message_flagged_title', 'Message contains restricted words'),
          text2: check.flaggedWords?.join(', '),
        });
        setSending(false);
        return;
      }

      const clientMessageId = generateIdempotencyKey('msg');
      const res = await mobileApi.chatSendMessage({
        consultationId,
        senderType: 'patient',
        content: trimmed,
        clientMessageId,
      } as FeTypes.ChatSendMessageRequest);
      setMsgText('');
      const created = mapRawMessage((res?.data ?? {}) as Record<string, unknown>);
      setMessages((prev) => {
        const exists = prev.some(
          (m) =>
            m.id === created.id ||
            (created.clientMessageId && m.clientMessageId === created.clientMessageId),
        );
        return exists ? prev : [...prev, created];
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to send message'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSending(false);
    }
  };

  const handleSendAttachment = async (file: NativeMediaFile) => {
    if (!consultationId || sending || isChatLocked) return;
    setSending(true);
    try {
      const mime =
        file.mimeType || (file.type === 'image' ? 'image/jpeg' : 'application/pdf');
      const content =
        file.type === 'image'
          ? t('mobile.sent_medical_image', 'Sent a medical image.')
          : t('mobile.sent_medical_document', 'Sent a medical document.');
      const res = await mobileApi.chatSendMessage({
        consultationId,
        senderType: 'patient',
        content,
        attachments: [
          {
            uri: file.uri,
            name: file.name,
            type: mime,
          } as unknown as FeTypes.UploadBinary,
        ],
      });
      const created = mapRawMessage((res?.data ?? {}) as Record<string, unknown>);
      setMessages((prev) => (prev.some((m) => m.id === created.id) ? prev : [...prev, created]));
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to upload attachment'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSending(false);
    }
  };

  const handleMessageLongPress = (msg: ChatMessage) => {
    if (isChatLocked || msg.sender !== 'me' || msg.id.startsWith('tmp')) return;
    Alert.alert(
      t('mobile.message_actions', 'Message Options'),
      undefined,
      [
        { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
        ...(msg.type === 'text'
          ? [
              {
                text: t('mobile.edit', 'Edit'),
                onPress: () => {
                  setEditTarget(msg);
                  setEditDraft(msg.text);
                },
              },
            ]
          : []),
        {
          text: t('mobile.delete', 'Delete'),
          style: 'destructive' as const,
          onPress: async () => {
            try {
              await mobileApi.chatRemoveMessage({ params: { id: msg.id } });
              setMessages((prev) => prev.filter((m) => m.id !== msg.id));
            } catch (err) {
              Toast.show({
                type: 'error',
                text1: t('mobile.error_generic', 'Failed to delete message'),
                text2: extractApiErrorMessage(err),
              });
            }
          },
        },
      ],
    );
  };

  const handleConfirmEditMessage = async () => {
    if (!editTarget || !editDraft.trim() || savingEdit) return;
    setSavingEdit(true);
    try {
      const updatedText = editDraft.trim();
      await mobileApi.chatUpdateMessage({
        params: { id: editTarget.id },
        body: { content: updatedText },
      });
      setMessages((prev) =>
        prev.map((m) => (m.id === editTarget.id ? { ...m, text: updatedText } : m)),
      );
      setEditTarget(null);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to update message'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSavingEdit(false);
    }
  };

  const handleSubmitViolation = async () => {
    if (!doctorId || submittingReport) return;
    const reason = reportReason.trim();
    if (!reason) {
      Toast.show({
        type: 'info',
        text1: t('mobile.report_reason_required', 'Please enter a reason'),
      });
      return;
    }
    setSubmittingReport(true);
    try {
      await mobileApi.violationsCreate({
        reported_user_id: doctorId,
        report_type: reportCategory,
        reason,
      });
      setReportModalVisible(false);
      setReportReason('');
      Toast.show({
        type: 'success',
        text1: t('mobile.report_sent', 'Report submitted'),
        text2: t('mobile.report_sent_desc', 'Moderators will review your report shortly.'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to submit report'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSubmittingReport(false);
    }
  };

  const handleSubmitReview = async () => {
    if (!consultationId || !doctorId || submittingReview) return;
    setSubmittingReview(true);
    try {
      const comment = reviewComment.trim();
      if (existingReviewId) {
        await mobileApi.reviewsUpdate({
          params: { id: existingReviewId },
          body: { rating: reviewRating, comment },
        });
      } else {
        const res = await mobileApi.reviewsCreate({
          doctorId,
          consultationId,
          rating: reviewRating,
          comment,
        });
        const d = (res?.data ?? {}) as Record<string, unknown>;
        setExistingReviewId(String(d._id ?? d.id ?? ''));
      }
      setReviewModalVisible(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.review_submitted_title', 'Review saved'),
        text2: `${reviewRating}/5 ★`,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error_generic', 'Failed to save review'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setSubmittingReview(false);
    }
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top', 'bottom']}>
      {/* Top Header */}
      <View
        style={tw(
          'flex-row items-center justify-between px-4 py-3 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800',
        )}
      >
        <View style={tw('flex-row items-center flex-1 mr-2')}>
          <TouchableOpacity onPress={() => router.back('/(patient)/chat-hub')} style={tw('p-2 -ml-2')}>
            <ChevronLeft color={twInstance.color('text-slate-900 dark:text-white')} size={24} />
          </TouchableOpacity>

          {doctorAvatar ? (
            <Image
              source={{ uri: doctorAvatar }}
              style={tw('w-10 h-10 rounded-full mr-3 bg-slate-200 dark:bg-slate-700')}
            />
          ) : (
            <View
              style={tw(
                'w-10 h-10 rounded-full mr-3 bg-slate-100 dark:bg-slate-800 items-center justify-center',
              )}
            >
              <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                {getInitials(doctorName || 'DR')}
              </Text>
            </View>
          )}

          <View style={tw('flex-1')}>
            <Text style={tw('font-bold text-slate-900 dark:text-white text-base')} numberOfLines={1}>
              {doctorName || t('mobile.specialist_doctor', 'Specialist Doctor')}
            </Text>
            <Text
              style={tw(
                `text-xs font-medium ${
                  doctorOnline ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'
                }`,
              )}
            >
              {doctorOnline ? t('mobile.online', 'Online') : t('mobile.offline', 'Offline')}
            </Text>
          </View>
        </View>

        <View style={tw('flex-row items-center gap-2')}>
          {canVideoCall && (
            <>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/(patient)/video-call?consultationId=${consultationId}&doctorId=${doctorId}`)
                }
                style={tw(
                  'w-9 h-9 bg-emerald-50 dark:bg-emerald-950/40 rounded-full items-center justify-center',
                )}
              >
                <Video color="#059669" size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() =>
                  router.push(`/(patient)/video-call?consultationId=${consultationId}&doctorId=${doctorId}`)
                }
                style={tw(
                  'w-9 h-9 bg-blue-50 dark:bg-blue-950/40 rounded-full items-center justify-center',
                )}
              >
                <Phone color="#3b82f6" size={18} />
              </TouchableOpacity>
            </>
          )}
          <TouchableOpacity
            onPress={() => setReportModalVisible(true)}
            style={tw(
              'w-9 h-9 bg-red-50 dark:bg-red-950/40 rounded-full items-center justify-center',
            )}
          >
            <Flag color="#ef4444" size={17} />
          </TouchableOpacity>
          {canReview && (
            <TouchableOpacity
              onPress={() => setReviewModalVisible(true)}
              style={tw(
                'w-9 h-9 bg-amber-50 dark:bg-amber-950/40 rounded-full items-center justify-center',
              )}
            >
              <Star color="#f59e0b" size={17} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      {/* Consultation Call Banner */}
      {consultationId && canVideoCall ? (
        <View
          style={tw(
            'bg-emerald-50 dark:bg-emerald-950/40 px-4 py-2.5 flex-row items-center justify-between border-b border-emerald-100 dark:border-emerald-900',
          )}
        >
          <View style={tw('flex-row items-center flex-1 mr-2')}>
            <View style={tw('w-2 h-2 rounded-full bg-emerald-500 mr-2')} />
            <Text
              style={tw('text-xs font-semibold text-emerald-800 dark:text-emerald-200')}
              numberOfLines={1}
            >
              {t('mobile.virtual_clinic_ready', 'Virtual clinic ready for consultation')}
            </Text>
          </View>
          <TouchableOpacity
            onPress={() =>
              router.push(`/(patient)/video-call?consultationId=${consultationId}&doctorId=${doctorId}`)
            }
            style={tw('bg-emerald-600 px-3 py-1.5 rounded-full flex-row items-center gap-1')}
          >
            <Video color="#ffffff" size={12} />
            <Text style={tw('text-white text-xs font-bold')}>
              {t('mobile.video_call', 'Video Call')}
            </Text>
          </TouchableOpacity>
        </View>
      ) : null}

      <KeyboardAvoidingView
        style={tw('flex-1')}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        <ScrollView
          ref={scrollViewRef}
          style={tw('flex-1 px-4')}
          contentContainerStyle={tw('py-4 gap-3')}
          onContentSizeChange={() => {
            if (!loadingMore) scrollViewRef.current?.scrollToEnd({ animated: true });
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={() => {
                setRefreshing(true);
                void loadInitialChat(true);
              }}
            />
          }
        >
          {loading ? (
            <View style={tw('gap-3')}>
              <Skeleton className="h-16 w-3/4 rounded-2xl" />
              <Skeleton className="h-16 w-2/3 self-end rounded-2xl" />
              <Skeleton className="h-20 w-3/4 rounded-2xl" />
            </View>
          ) : errorMsg ? (
            <View style={tw('items-center py-12 px-4')}>
              <Text style={tw('text-sm text-red-500 text-center mb-4')}>{errorMsg}</Text>
              <TouchableOpacity
                onPress={() => void loadInitialChat(false)}
                style={tw('bg-brand px-5 py-2.5 rounded-xl')}
              >
                <Text style={tw('font-bold text-slate-900 text-xs')}>
                  {t('mobile.retry', 'Retry')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : !consultationId ? (
            <View style={tw('items-center py-16 px-6')}>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-2 text-center')}>
                {t('mobile.no_consultation_selected', 'No consultation conversation found')}
              </Text>
              <TouchableOpacity
                onPress={() => router.push('/(patient)/my-doctors')}
                style={tw('bg-brand px-6 py-3 rounded-xl mt-2')}
              >
                <Text style={tw('text-slate-900 font-bold text-sm')}>
                  {t('mobile.find_a_doctor', 'Find a Doctor')}
                </Text>
              </TouchableOpacity>
            </View>
          ) : (
            <>
              {hasMoreMessages && (
                <TouchableOpacity
                  disabled={loadingMore}
                  onPress={() => void handleLoadEarlier()}
                  style={tw('self-center bg-white dark:bg-slate-900 px-4 py-2 rounded-full border border-slate-200 dark:border-slate-800 mb-2')}
                >
                  {loadingMore ? (
                    <ActivityIndicator size="small" color="#64748b" />
                  ) : (
                    <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300')}>
                      {t('mobile.load_earlier_messages', 'Load earlier messages')}
                    </Text>
                  )}
                </TouchableOpacity>
              )}

              {messages.map((msg) => {
                const isMe = msg.sender === 'me';
                return (
                  <View key={msg.id} style={tw(`${isMe ? 'items-end' : 'items-start'}`)}>
                    <TouchableOpacity
                      activeOpacity={0.9}
                      onLongPress={() => handleMessageLongPress(msg)}
                      style={tw(
                        `max-w-[85%] rounded-2xl p-3 shadow-sm ${
                          isMe
                            ? 'bg-brand rounded-tr-none'
                            : 'bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-tl-none'
                        }`,
                      )}
                    >
                      {msg.type === 'image' && msg.attachment ? (
                        <View style={tw('mb-1')}>
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedImagePreview({
                                uri: msg.attachment?.uri,
                                name: msg.attachment?.name,
                                size: msg.attachment?.size,
                              })
                            }
                            style={tw('relative rounded-xl overflow-hidden bg-slate-100 dark:bg-slate-800')}
                          >
                            <Image
                              source={{ uri: msg.attachment.uri }}
                              style={tw('w-56 h-40 rounded-xl')}
                              resizeMode="cover"
                            />
                            <TouchableOpacity
                              disabled={downloadingId === msg.id}
                              onPress={() => void handleDirectDownload(msg)}
                              style={tw(
                                'absolute top-2 right-2 bg-slate-900/75 px-2.5 py-1.5 rounded-lg flex-row items-center gap-1',
                              )}
                            >
                              {downloadingId === msg.id ? (
                                <ActivityIndicator size="small" color="#ffffff" />
                              ) : (
                                <Download color="#ffffff" size={13} />
                              )}
                              <Text style={tw('text-white text-[10px] font-bold')}>
                                {t('mobile.download', 'Save')}
                              </Text>
                            </TouchableOpacity>
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {msg.type === 'file' && msg.attachment ? (
                        <View
                          style={tw(
                            `w-64 overflow-hidden flex-row items-center gap-2.5 p-2.5 rounded-xl mb-1 ${
                              isMe
                                ? 'bg-slate-900/10'
                                : 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700'
                            }`,
                          )}
                        >
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedDocPreview({
                                uri: msg.attachment?.uri,
                                name: msg.attachment?.name,
                                size: msg.attachment?.size,
                              })
                            }
                            style={tw('flex-row items-center gap-2.5 flex-1 min-w-0')}
                          >
                            <View
                              style={tw(
                                'w-9 h-9 bg-red-100 dark:bg-red-900/40 rounded-lg items-center justify-center shrink-0',
                              )}
                            >
                              <FileText color="#ef4444" size={18} />
                            </View>
                            <View style={tw('flex-1 min-w-0')}>
                              <Text
                                style={tw(
                                  `font-bold text-xs ${isMe ? 'text-slate-900' : 'text-slate-900 dark:text-white'}`,
                                )}
                                numberOfLines={1}
                                ellipsizeMode="middle"
                              >
                                {msg.attachment.name}
                              </Text>
                              <Text
                                style={tw(
                                  `text-[10px] ${
                                    isMe ? 'text-slate-700' : 'text-slate-400 dark:text-slate-500'
                                  }`,
                                )}
                                numberOfLines={1}
                              >
                                {msg.attachment.size ? `${msg.attachment.size} • ` : ''}
                                {t('mobile.tap_to_preview', 'Tap to view')}
                              </Text>
                            </View>
                          </TouchableOpacity>
                          <TouchableOpacity
                            onPress={() =>
                              setSelectedDocPreview({
                                uri: msg.attachment?.uri,
                                name: msg.attachment?.name,
                                size: msg.attachment?.size,
                              })
                            }
                            style={tw('p-1.5 rounded-lg bg-slate-900/10 dark:bg-slate-700 shrink-0')}
                          >
                            <Eye color={isMe ? '#0f172a' : '#64748b'} size={15} />
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={downloadingId === msg.id}
                            onPress={() => void handleDirectDownload(msg)}
                            style={tw('p-1.5 rounded-lg bg-slate-900/10 dark:bg-slate-700 shrink-0')}
                          >
                            {downloadingId === msg.id ? (
                              <ActivityIndicator size="small" color={isMe ? '#0f172a' : '#64748b'} />
                            ) : (
                              <Download color={isMe ? '#0f172a' : '#64748b'} size={15} />
                            )}
                          </TouchableOpacity>
                        </View>
                      ) : null}

                      {msg.text ? (
                        <Text
                          style={tw(
                            `text-sm leading-5 ${
                              isMe ? 'text-slate-900 font-medium' : 'text-slate-800 dark:text-slate-100'
                            }`,
                          )}
                        >
                          {msg.text}
                        </Text>
                      ) : null}
                    </TouchableOpacity>
                    {msg.time ? (
                      <Text style={tw('text-[10px] text-slate-400 mt-1 mx-1')}>{msg.time}</Text>
                    ) : null}
                  </View>
                );
              })}
            </>
          )}
        </ScrollView>

        {/* Bottom Chat Input or Locked/Closed Banner */}
        {isStatusLoaded && !access.canChat ? (
          <View
            style={tw(
              isWaitingLock
                ? 'px-4 py-3.5 bg-amber-50 dark:bg-amber-950/40 border-t border-amber-200 dark:border-amber-900/50 items-center'
                : 'px-4 py-3 bg-slate-100 dark:bg-slate-900 border-t border-slate-200 dark:border-slate-800 items-center',
            )}
          >
            <Text
              style={tw(
                isWaitingLock
                  ? 'text-xs font-medium text-amber-800 dark:text-amber-300 text-center leading-4'
                  : 'text-xs font-medium text-slate-500 dark:text-slate-400 text-center',
              )}
            >
              {patientLockBannerMessage}
            </Text>
          </View>
        ) : (
          <View
            style={tw(
              'px-4 py-3 bg-white dark:bg-slate-900 border-t border-slate-100 dark:border-slate-800 flex-row items-center gap-2',
            )}
          >
            <TouchableOpacity
              disabled={sending || !consultationId || isChatLocked}
              onPress={() => {
                setAttachmentMode('image');
                setAttachmentModalVisible(true);
              }}
              style={tw('w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center')}
            >
              <ImagePlus color="#64748b" size={20} />
            </TouchableOpacity>
            <TouchableOpacity
              disabled={sending || !consultationId || isChatLocked}
              onPress={() => {
                setAttachmentMode('file');
                setAttachmentModalVisible(true);
              }}
              style={tw('w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 items-center justify-center')}
            >
              <Paperclip color="#64748b" size={20} />
            </TouchableOpacity>
            <TextInput
              style={tw(
                'flex-1 bg-slate-100 dark:bg-slate-950 rounded-2xl px-4 py-2.5 text-sm text-slate-900 dark:text-white max-h-24',
              )}
              placeholder={t('mobile.type_a_message', 'Type a message...')}
              placeholderTextColor="#94a3b8"
              value={msgText}
              onChangeText={setMsgText}
              editable={!isChatLocked}
              multiline
            />
            <TouchableOpacity
              disabled={sending || !msgText.trim() || !consultationId || isChatLocked}
              onPress={() => void handleSend()}
              style={tw(
                `w-10 h-10 rounded-full items-center justify-center ${
                  msgText.trim() && !sending ? 'bg-brand' : 'bg-slate-200 dark:bg-slate-800'
                }`,
              )}
            >
              {sending ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Send color={msgText.trim() ? '#0f172a' : '#94a3b8'} size={18} />
              )}
            </TouchableOpacity>
          </View>
        )}
      </KeyboardAvoidingView>

      {/* Edit Message Modal */}
      <Modal
        visible={Boolean(editTarget)}
        transparent
        animationType="fade"
        onRequestClose={() => setEditTarget(null)}
      >
        <View style={tw('flex-1 justify-center items-center bg-black/60 p-4')}>
          <View style={tw('w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl p-5')}>
            <View style={tw('flex-row justify-between items-center mb-3')}>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white')}>
                {t('mobile.edit_message', 'Edit Message')}
              </Text>
              <TouchableOpacity onPress={() => setEditTarget(null)}>
                <X color="#64748b" size={20} />
              </TouchableOpacity>
            </View>
            <TextInput
              value={editDraft}
              onChangeText={setEditDraft}
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-3 min-h-[80px] text-sm text-slate-900 dark:text-white mb-4',
              )}
            />
            <TouchableOpacity
              disabled={savingEdit || !editDraft.trim()}
              onPress={() => void handleConfirmEditMessage()}
              style={tw('bg-brand py-3 rounded-xl items-center')}
            >
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.save', 'Save')}
              </Text>
            </TouchableOpacity>
          </View>
          <AppModalToast visible={Boolean(editTarget)} />
        </View>
      </Modal>

      {/* Report Violation Modal */}
      <Modal
        visible={reportModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800',
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.report_abuse_title', 'Report Conduct Violation')}
              </Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>
            <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
              {(
                [
                  ['inappropriate_content', t('mobile.report_type_inappropriate', 'Inappropriate content')],
                  ['harassment', t('mobile.report_type_harassment', 'Harassment')],
                  ['misinformation', t('mobile.report_type_misinformation', 'Misinformation')],
                  ['spam', t('mobile.report_type_spam', 'Spam')],
                  ['other', t('mobile.report_type_other', 'Other')],
                ] as const
              ).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setReportCategory(key)}
                  style={tw(
                    `px-3 py-1.5 rounded-xl border ${
                      reportCategory === key
                        ? 'bg-red-600 border-red-600'
                        : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                    }`,
                  )}
                >
                  <Text
                    style={tw(
                      `text-xs font-bold ${
                        reportCategory === key ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                      }`,
                    )}
                  >
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={reportReason}
              onChangeText={setReportReason}
              placeholder={t('mobile.report_reason_placeholder', 'Describe the violation...')}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[90px] text-sm text-slate-900 dark:text-white mb-4',
              )}
            />
            <TouchableOpacity
              disabled={submittingReport}
              onPress={() => void handleSubmitViolation()}
              style={tw('bg-red-600 py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              {submittingReport && (
                <ActivityIndicator size="small" color="#ffffff" style={tw('mr-2')} />
              )}
              <Text style={tw('font-bold text-white text-sm')}>
                {t('mobile.submit_report', 'Submit Report')}
              </Text>
            </TouchableOpacity>
          </View>
          <AppModalToast visible={reportModalVisible} />
        </KeyboardAvoidingView>
      </Modal>

      {/* Review Modal */}
      <Modal
        visible={reviewModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setReviewModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800',
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View>
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.rate_consultation_title', 'Rate Doctor')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {doctorName}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setReviewModalVisible(false)}>
                <X color="#64748b" size={22} />
              </TouchableOpacity>
            </View>
            <View style={tw('flex-row justify-center gap-3 my-4')}>
              {[1, 2, 3, 4, 5].map((star) => (
                <TouchableOpacity key={star} onPress={() => setReviewRating(star)} style={tw('p-1')}>
                  <Star
                    color="#f59e0b"
                    fill={star <= reviewRating ? '#f59e0b' : 'transparent'}
                    size={34}
                  />
                </TouchableOpacity>
              ))}
            </View>
            <TextInput
              value={reviewComment}
              onChangeText={setReviewComment}
              placeholder={t(
                'mobile.review_comment_placeholder',
                'Share your consultation experience...',
              )}
              placeholderTextColor="#94a3b8"
              multiline
              textAlignVertical="top"
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 min-h-[95px] text-sm text-slate-900 dark:text-white mb-4',
              )}
            />
            <TouchableOpacity
              disabled={submittingReview}
              onPress={() => void handleSubmitReview()}
              style={tw('bg-brand py-3.5 rounded-xl items-center flex-row justify-center')}
            >
              {submittingReview && (
                <ActivityIndicator size="small" color="#0f172a" style={tw('mr-2')} />
              )}
              <Text style={tw('font-bold text-slate-900 text-sm')}>
                {t('mobile.submit_review_btn', 'Submit Review')}
              </Text>
            </TouchableOpacity>
          </View>
          <AppModalToast visible={reviewModalVisible} />
        </KeyboardAvoidingView>
      </Modal>

      {/* Attachment Picker Modal */}
      <AttachmentPickerModal
        visible={attachmentModalVisible}
        onClose={() => setAttachmentModalVisible(false)}
        initialMode={attachmentMode}
        onSendAttachment={handleSendAttachment}
      />

      {/* Image Preview Modal */}
      <ImageViewerModal
        visible={!!selectedImagePreview}
        onClose={() => setSelectedImagePreview(null)}
        imageUri={selectedImagePreview?.uri}
        imageName={selectedImagePreview?.name}
        imageSize={selectedImagePreview?.size}
      />

      {/* PDF Document Viewer Modal */}
      <DocViewerModal
        visible={!!selectedDocPreview}
        onClose={() => setSelectedDocPreview(null)}
        fileName={selectedDocPreview?.name}
        fileSize={selectedDocPreview?.size}
        fileUri={selectedDocPreview?.uri}
      />
    </SafeAreaView>
  );
}
