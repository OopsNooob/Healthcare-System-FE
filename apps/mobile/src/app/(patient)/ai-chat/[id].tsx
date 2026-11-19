import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
  Image,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams } from 'expo-router';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft,
  Send,
  Sparkles,
  AlertTriangle,
  X,
  BookOpen,
  Crown,
  Camera,
  Image as ImageIcon,
  ZoomIn,
  Download,
  Star,
  ThumbsUp,
  Trash2,
  Edit3,
  BarChart3,
  RefreshCw,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import {
  mobileApi,
  generateIdempotencyKey,
  normalizeCursorList,
  normalizePaginatedList,
  type FeTypes,
} from '@repo/shared-hooks';
import { pickNativeImage, downloadMediaFileToDevice } from '@/services/nativeMedia';
import { ImageViewerModal } from '@/components/modals';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

type ConversationType =
  | 'health_inquiry'
  | 'symptom_analysis'
  | 'health_education'
  | 'test_result_explanation'
  | 'medication_info'
  | 'general_consultation';

type Citation = {
  source: string;
  chunkId?: string;
  documentId?: string;
  score?: number;
  excerpt?: string;
};

type MessageAttachment = {
  publicId?: string;
  secureUrl: string;
  originalName?: string;
  size?: number;
  mimeType?: string;
};

type ChatMessage = {
  id: string;
  text: string;
  sender: 'ai' | 'user';
  time: string;
  attachments?: MessageAttachment[];
  citations?: Citation[];
};

type FeedbackItem = FeTypes.AiFeedbacksGetConversationFeedbacksResponse['data'][number] & {
  _id?: string;
  id?: string;
  helpfulCount?: number;
  isHelpful?: boolean;
  isVerified?: boolean;
  createdAt?: string;
};

const TYPE_OPTIONS: Array<{ value: ConversationType; labelKey: string; defaultLabel: string }> = [
  { value: 'general_consultation', labelKey: 'mobile.ai_type_general', defaultLabel: 'General' },
  { value: 'symptom_analysis', labelKey: 'mobile.ai_type_symptoms', defaultLabel: 'Symptoms' },
  { value: 'medication_info', labelKey: 'mobile.ai_type_medication', defaultLabel: 'Medication' },
  { value: 'test_result_explanation', labelKey: 'mobile.ai_type_lab_results', defaultLabel: 'Lab Results' },
  { value: 'health_education', labelKey: 'mobile.ai_type_education', defaultLabel: 'Education' },
];

const QUICK_PROMPTS = [
  { key: 'mobile.ai_quick_prompt_bp', defaultText: 'How should I interpret a blood pressure reading of 140/90?' },
  { key: 'mobile.ai_quick_prompt_meds', defaultText: 'What side effects should I monitor with blood pressure medication?' },
  { key: 'mobile.ai_quick_prompt_diet', defaultText: 'What daily diet helps control blood sugar and cholesterol?' },
];

function getRecordId(obj: { _id?: unknown; id?: unknown } | null | undefined): string {
  return String(obj?._id ?? obj?.id ?? '');
}

function isSyntheticOpener(content: string): boolean {
  const normalized = content.toLowerCase().replace(/\s+/g, ' ').trim();
  return (
    (normalized.includes('xin chao') || normalized.includes('xin chào')) &&
    (normalized.includes('toi can tu van') || normalized.includes('tôi cần tư vấn'))
  );
}

export default function AiChatSessionScreen() {
  const { t } = useTranslation();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';
  const router = useRouter();
  const { id, prefill } = useLocalSearchParams<{ id?: string; prefill?: string }>();
  const scrollViewRef = useRef<ScrollView>(null);

  const isNewParam = !id || id === 'new' || id === 'new-session';
  const [activeConversationId, setActiveConversationId] = useState<string | null>(
    isNewParam ? null : String(id)
  );
  const [selectedType, setSelectedType] = useState<ConversationType>('general_consultation');
  const [conversationTopic, setConversationTopic] = useState<string>('');
  const [currentRating, setCurrentRating] = useState<number>(0);

  const [loading, setLoading] = useState(!isNewParam);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingEarlier, setLoadingEarlier] = useState(false);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasEarlier, setHasEarlier] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [pendingImage, setPendingImage] = useState<{
    uri: string;
    name: string;
    mimeType: string;
    sizeLabel: string;
  } | null>(null);
  const [sending, setSending] = useState(false);
  const handledPrefillRef = useRef<string | null>(null);

  const [planQuotaLabel, setPlanQuotaLabel] = useState<string | null>(null);

  const [reportModalVisible, setReportModalVisible] = useState(false);
  const [imagePickerModalVisible, setImagePickerModalVisible] = useState(false);
  const [statsModalVisible, setStatsModalVisible] = useState(false);
  const [reportReason, setReportReason] = useState('');
  const [ratingValue, setRatingValue] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submittingFeedback, setSubmittingFeedback] = useState(false);
  const [submittingRating, setSubmittingRating] = useState(false);

  const [feedbacks, setFeedbacks] = useState<FeedbackItem[]>([]);
  const [feedbackTotal, setFeedbackTotal] = useState<number>(0);
  const [convStats, setConvStats] = useState<FeTypes.AiAssistantGetConversationStatsResponse['data'] | null>(null);
  const [editingFeedbackId, setEditingFeedbackId] = useState<string | null>(null);
  const [editingFeedbackText, setEditingFeedbackText] = useState('');
  const [busyFeedbackId, setBusyFeedbackId] = useState<string | null>(null);

  const [selectedImagePreview, setSelectedImagePreview] = useState<{
    uri: string;
    name: string;
    size: string;
  } | null>(null);
  const [downloadingMsgId, setDownloadingMsgId] = useState<string | null>(null);

  const timeLocale = t('mobile.date_locale', 'vi-VN');

  const formatMsgTime = useCallback(
    (iso?: string) => {
      const dt = iso ? new Date(iso) : new Date();
      if (Number.isNaN(dt.getTime())) return '';
      return dt.toLocaleTimeString(timeLocale, { hour: '2-digit', minute: '2-digit' });
    },
    [timeLocale]
  );

  const mapServerMessages = useCallback(
    (rawMessages: FeTypes.AiAssistantGetConversationResponse['messages']): ChatMessage[] => {
      const sorted = [...rawMessages].sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return sorted
        .filter((msg, index) => !(index === 0 && msg.role === 'user' && isSyntheticOpener(msg.content)))
        .map((msg, idx) => ({
          id: getRecordId(msg as { _id?: unknown; id?: unknown }) || `${msg.timestamp}-${idx}`,
          text: msg.content,
          sender: msg.role === 'assistant' ? 'ai' : 'user',
          time: formatMsgTime(msg.timestamp),
          attachments: msg.attachments?.map((att) => ({
            publicId: att.publicId,
            secureUrl: att.secureUrl,
            originalName: att.originalName,
            size: att.size,
            mimeType: att.mimeType,
          })),
        }));
    },
    [formatMsgTime]
  );

  const loadQuotaBanner = useCallback(async () => {
    try {
      const subsRes = await mobileApi.patientBillingReadSubscriptions({
        query: { page: 1, limit: 10 },
      });
      const effective = subsRes?.effective ?? subsRes?.items?.[0] ?? null;
      if (effective?.entitlement) {
        const limit = effective.entitlement.aiRequestLimit;
        const periodLabel =
          effective.entitlement.aiQuotaPeriod === 'day'
            ? t('mobile.per_day', 'day')
            : t('mobile.per_cycle', 'cycle');
        setPlanQuotaLabel(
          t('mobile.ai_plan_quota_info', {
            plan: effective.plan?.name || t('mobile.plan_free', 'Free'),
            limit,
            period: periodLabel,
            defaultValue: '{{plan}}: up to {{limit}} AI requests / {{period}}',
          })
        );
      }
    } catch {
      // Non-blocking quota banner info
    }
  }, [t]);

  const loadConversation = useCallback(
    async (convId: string, opts?: { showLoader?: boolean }) => {
      if (opts?.showLoader) setLoading(true);
      setLoadError(null);
      try {
        const [convRes, fbRes, fbStatsRes, statsRes] = await Promise.allSettled([
          mobileApi.aiAssistantGetConversation({
            params: { conversationId: convId },
            query: { page: 1, limit: 30, sortOrder: -1, sortBy: 'timestamp' },
          }),
          mobileApi.aiFeedbacksGetConversationFeedbacks({
            params: { conversationId: convId },
            query: { page: 1, limit: 20, sortOrder: -1 },
          }),
          mobileApi.aiFeedbacksGetConversationStats({
            params: { conversationId: convId },
          }),
          mobileApi.aiAssistantGetConversationStats({
            params: { conversationId: convId },
          }),
        ]);

        if (convRes.status === 'rejected') {
          throw convRes.reason;
        }

        const payload = convRes.value;
        setConversationTopic(payload.data?.topic || '');
        if (payload.data?.type) setSelectedType(payload.data.type);
        if (payload.data?.rating) {
          setCurrentRating(payload.data.rating);
          setRatingValue(payload.data.rating);
        }
        setRatingComment(payload.data?.ratingComment || '');

        const mapped = mapServerMessages(payload.messages ?? []);
        setMessages(mapped);

        const cursorMeta = normalizeCursorList(payload);
        setNextCursor(cursorMeta.nextCursor);
        setHasEarlier(Boolean(payload.hasNextPage && payload.nextCursor));

        if (fbRes.status === 'fulfilled') {
          const parsedFb = normalizePaginatedList<FeedbackItem>(fbRes.value, 1, 20);
          setFeedbacks(parsedFb.items);
          setFeedbackTotal(parsedFb.total);
        }
        if (fbStatsRes.status === 'fulfilled') {
          setFeedbackTotal(Number(fbStatsRes.value?.totalFeedbacks ?? 0));
        }
        if (statsRes.status === 'fulfilled') {
          setConvStats(statsRes.value?.data ?? null);
        }
      } catch (error) {
        setLoadError(
          extractApiErrorMessage(
            error,
            t('mobile.ai_load_session_error', 'Unable to load this AI conversation.')
          )
        );
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [mapServerMessages, t]
  );

  useEffect(() => {
    void loadQuotaBanner();
  }, [loadQuotaBanner]);

  useEffect(() => {
    const newFlag = !id || id === 'new' || id === 'new-session';
    if (newFlag) {
      setActiveConversationId(null);
      setLoading(false);
    } else {
      const strId = String(id);
      setActiveConversationId(strId);
      void loadConversation(strId, { showLoader: true });
    }
  }, [id, loadConversation]);

  const sendMessageCore = useCallback(
    async (
      rawText: string,
      imagePayload?: { uri: string; name: string; mimeType: string; sizeLabel: string } | null
    ) => {
      if (sending) return;
      const trimmed = rawText.trim();
      if (!trimmed && !imagePayload) return;

      setSending(true);
      const optimisticId = `local-user-${Date.now()}`;
      const optimisticText =
        trimmed || t('mobile.ai_image_sent_fallback', 'Sent medical image for AI analysis');

      setMessages((prev) => [
        ...prev,
        {
          id: optimisticId,
          text: optimisticText,
          sender: 'user',
          time: formatMsgTime(),
          attachments: imagePayload
            ? [
                {
                  secureUrl: imagePayload.uri,
                  originalName: imagePayload.name,
                  mimeType: imagePayload.mimeType,
                },
              ]
            : undefined,
        },
      ]);
      setMessageInput('');
      setPendingImage(null);

      try {
        let convId = activeConversationId;
        if (!convId) {
          const started = await mobileApi.aiAssistantStartConversation({
            type: selectedType,
            initialQuestion: 'Xin chào, tôi cần tư vấn sức khỏe',
          });
          convId = getRecordId(started?.data as { _id?: unknown; id?: unknown });
          if (!convId) {
            throw new Error(t('mobile.ai_start_failed', 'Unable to start AI conversation.'));
          }
          setActiveConversationId(convId);
        }

        const key = generateIdempotencyKey('ai-msg');
        const uploadFiles = imagePayload
          ? ([
              {
                uri: imagePayload.uri,
                name: imagePayload.name,
                type: imagePayload.mimeType || 'image/jpeg',
              },
            ] as unknown as FeTypes.UploadBinary[])
          : undefined;

        const response = await mobileApi.aiAssistantSendMessage({
          params: { conversationId: convId },
          headers: { 'Idempotency-Key': key, 'idempotency-key': key },
          body: {
            ...(trimmed ? { message: trimmed } : {}),
            conversationType: selectedType,
            ...(uploadFiles ? { images: uploadFiles } : {}),
          },
          ...(uploadFiles ? { images: uploadFiles } : {}),
        });

        const resData = response.data;
        if (resData.topic) {
          setConversationTopic(resData.topic);
        }

        setMessages((prev) => {
          const updatedUser = prev.map((m) =>
            m.id === optimisticId && resData.attachments?.length
              ? {
                  ...m,
                  attachments: resData.attachments.map((att) => ({
                    publicId: att.publicId,
                    secureUrl: att.secureUrl,
                    originalName: imagePayload?.name,
                  })),
                }
              : m
          );
          return [
            ...updatedUser,
            {
              id: `ai-${Date.now()}`,
              text: resData.finalAiResponse,
              sender: 'ai',
              time: formatMsgTime(),
              citations: resData.citations ?? [],
            },
          ];
        });
      } catch (error) {
        setMessages((prev) => prev.filter((m) => m.id !== optimisticId));
        if (!imagePayload) {
          setMessageInput(trimmed);
        } else {
          setPendingImage(imagePayload);
        }
        Toast.show({
          type: 'error',
          text1: t('mobile.error', 'Error'),
          text2: extractApiErrorMessage(
            error,
            t('mobile.ai_send_error', 'Failed to get AI response. Please try again.')
          ),
        });
      } finally {
        setSending(false);
      }
    },
    [activeConversationId, formatMsgTime, selectedType, sending, t]
  );

  useEffect(() => {
    if (prefill && isNewParam && handledPrefillRef.current !== prefill) {
      handledPrefillRef.current = prefill;
      void sendMessageCore(String(prefill));
    }
  }, [prefill, isNewParam, sendMessageCore]);

  const handleLoadEarlier = async () => {
    if (!activeConversationId || !nextCursor || loadingEarlier) return;
    setLoadingEarlier(true);
    try {
      const olderRes = await mobileApi.aiAssistantGetConversation({
        params: { conversationId: activeConversationId },
        query: { page: 1, limit: 30, cursor: nextCursor, sortOrder: -1, sortBy: 'timestamp' },
      });
      const olderMapped = mapServerMessages(olderRes.messages ?? []);
      setMessages((prev) => {
        const existingIds = new Set(prev.map((m) => m.id));
        const uniqueOlder = olderMapped.filter((m) => !existingIds.has(m.id));
        return [...uniqueOlder, ...prev];
      });
      setNextCursor(olderRes.nextCursor);
      setHasEarlier(Boolean(olderRes.hasNextPage && olderRes.nextCursor));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.ai_load_session_error', 'Unable to load earlier messages.')),
      });
    } finally {
      setLoadingEarlier(false);
    }
  };

  const handlePickImage = async (source: 'camera' | 'gallery') => {
    setImagePickerModalVisible(false);
    const media = await pickNativeImage(source, { allowsEditing: false, quality: 0.8 });
    if (!media) return;
    setPendingImage({
      uri: media.uri,
      name: media.name,
      mimeType: media.mimeType || 'image/jpeg',
      sizeLabel: media.size,
    });
  };

  const handleDirectDownload = async (msgId: string, att: MessageAttachment) => {
    if (!att.secureUrl || downloadingMsgId) return;
    setDownloadingMsgId(msgId);
    try {
      const fileName = att.originalName || `Medical_Image_${msgId}.jpg`;
      await downloadMediaFileToDevice({
        uri: att.secureUrl,
        fileName,
        mimeType: att.mimeType || (fileName.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg'),
      });
    } finally {
      setDownloadingMsgId(null);
    }
  };

  const handleSubmitFeedback = async () => {
    if (submittingFeedback) return;
    if (!activeConversationId) {
      Toast.show({
        type: 'info',
        text1: t('mobile.ai_assistant', 'AI Assistant'),
        text2: t('mobile.ai_send_first_before_feedback', 'Send at least one message before submitting feedback.'),
      });
      return;
    }
    const content = reportReason.trim();
    if (!content) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.ai_feedback_required', 'Please enter feedback or report details.'),
      });
      return;
    }
    setSubmittingFeedback(true);
    try {
      const created = await mobileApi.aiFeedbacksCreate({
        aiConversationId: activeConversationId,
        content,
      });
      setFeedbacks((prev) => [created as FeedbackItem, ...prev]);
      setFeedbackTotal((prev) => prev + 1);
      setReportReason('');
      setReportModalVisible(false);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.report_submitted', 'Feedback submitted successfully.'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Unable to submit feedback.')),
      });
    } finally {
      setSubmittingFeedback(false);
    }
  };

  const handleSubmitRating = async () => {
    if (!activeConversationId || submittingRating) return;
    setSubmittingRating(true);
    try {
      await mobileApi.aiAssistantRateConversation({
        params: { conversationId: activeConversationId },
        body: {
          rating: ratingValue,
          ...(ratingComment.trim() ? { comment: ratingComment.trim() } : {}),
        },
      });
      setCurrentRating(ratingValue);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.ai_rating_saved', 'Thank you for rating this AI consultation.'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Could not save rating.')),
      });
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleMarkFeedbackHelpful = async (fb: FeedbackItem) => {
    const fbId = getRecordId(fb);
    if (!fbId || busyFeedbackId) return;
    setBusyFeedbackId(fbId);
    try {
      const updated = await mobileApi.aiFeedbacksMarkHelpful({ params: { id: fbId } });
      setFeedbacks((prev) =>
        prev.map((item) => (getRecordId(item) === fbId ? { ...item, ...(updated as FeedbackItem) } : item))
      );
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Could not mark helpful.')),
      });
    } finally {
      setBusyFeedbackId(null);
    }
  };

  const handleSaveFeedbackEdit = async (fbId: string) => {
    if (!fbId || busyFeedbackId || !editingFeedbackText.trim()) return;
    setBusyFeedbackId(fbId);
    try {
      const updated = await mobileApi.aiFeedbacksUpdateFeedback({
        params: { id: fbId },
        body: { content: editingFeedbackText.trim() },
      });
      setFeedbacks((prev) =>
        prev.map((item) => (getRecordId(item) === fbId ? { ...item, ...(updated as FeedbackItem) } : item))
      );
      setEditingFeedbackId(null);
      setEditingFeedbackText('');
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Could not update feedback.')),
      });
    } finally {
      setBusyFeedbackId(null);
    }
  };

  const handleDeleteFeedback = async (fbId: string) => {
    if (!fbId || busyFeedbackId) return;
    setBusyFeedbackId(fbId);
    try {
      await mobileApi.aiFeedbacksDeleteFeedback({ params: { id: fbId } });
      setFeedbacks((prev) => prev.filter((item) => getRecordId(item) !== fbId));
      setFeedbackTotal((prev) => Math.max(0, prev - 1));
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Could not delete feedback.')),
      });
    } finally {
      setBusyFeedbackId(null);
    }
  };

  const onRefresh = () => {
    if (!activeConversationId) {
      setRefreshing(false);
      return;
    }
    setRefreshing(true);
    void loadConversation(activeConversationId);
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-white dark:bg-slate-900')}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={tw('flex-1')}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Header */}
        <View style={tw('flex-row items-center justify-between px-4 py-3.5 border-b border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 z-10')}>
          <View style={tw('flex-row items-center flex-1 mr-2')}>
            <TouchableOpacity style={tw('p-2 -ml-1')} onPress={() => router.back('/(patient)/ai-chat')}>
              <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={22} />
            </TouchableOpacity>
            <View style={tw('w-9 h-9 bg-indigo-100 dark:bg-indigo-900/30 rounded-full items-center justify-center ml-1 mr-2.5')}>
              <Sparkles color={isDark ? '#818cf8' : '#4f46e5'} size={18} />
            </View>
            <View style={tw('flex-1')}>
              <Text style={tw('text-base font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
                {conversationTopic || t('mobile.ai_assistant', 'AI Assistant')}
              </Text>
              <Text style={tw('text-indigo-600 dark:text-indigo-400 text-xs font-medium')}>
                {t('mobile.online_247', 'Online 24/7')}
              </Text>
            </View>
          </View>

          <View style={tw('flex-row items-center gap-2')}>
            {!!activeConversationId && (
              <TouchableOpacity
                style={tw('p-2 bg-slate-100 dark:bg-slate-800 rounded-full')}
                onPress={() => setStatsModalVisible(true)}
              >
                <BarChart3 color={isDark ? '#cbd5e1' : '#334155'} size={18} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={tw('p-2 bg-red-50 dark:bg-red-900/20 rounded-full')}
              onPress={() => setReportModalVisible(true)}
            >
              <AlertTriangle color="#ef4444" size={18} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Quota / Plan Banner */}
        <View style={tw('bg-amber-50 dark:bg-amber-900/20 px-4 py-2 flex-row items-center justify-between border-b border-amber-100 dark:border-amber-900/30')}>
          <View style={tw('flex-row items-center flex-1 mr-2')}>
            <Crown color="#f59e0b" size={15} />
            <Text style={tw('text-amber-800 dark:text-amber-300 text-xs font-medium ml-2')} numberOfLines={1}>
              {planQuotaLabel || t('mobile.ai_upgrade_plus_hint', 'Need higher AI daily capacity? Upgrade your care plan.')}
            </Text>
          </View>
          <TouchableOpacity onPress={() => router.push('/(patient)/premium')} style={tw('bg-amber-500 px-3 py-1 rounded-full')}>
            <Text style={tw('text-white text-xs font-bold')}>{t('mobile.upgrade', 'Upgrade')}</Text>
          </TouchableOpacity>
        </View>

        {/* Conversation Body */}
        {loading ? (
          <View style={tw('flex-1 p-4 gap-4')}>
            <Skeleton className="h-16 w-3/4 rounded-2xl self-start" />
            <Skeleton className="h-14 w-2/3 rounded-2xl self-end" />
            <Skeleton className="h-24 w-4/5 rounded-2xl self-start" />
          </View>
        ) : loadError ? (
          <View style={tw('flex-1 items-center justify-center px-6')}>
            <AlertTriangle color="#ef4444" size={32} style={tw('mb-3')} />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1 text-center')}>
              {t('mobile.unable_to_load', 'Unable to Load')}
            </Text>
            <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center mb-4')}>{loadError}</Text>
            {!!activeConversationId && (
              <TouchableOpacity
                onPress={() => void loadConversation(activeConversationId, { showLoader: true })}
                style={tw('flex-row items-center bg-indigo-600 px-5 py-2.5 rounded-xl')}
              >
                <RefreshCw color="#ffffff" size={16} style={tw('mr-2')} />
                <Text style={tw('text-white font-bold text-sm')}>{t('mobile.retry', 'Retry')}</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <ScrollView
            ref={scrollViewRef}
            onContentSizeChange={() => scrollViewRef.current?.scrollToEnd({ animated: true })}
            contentContainerStyle={tw('p-4 pb-8 flex-grow')}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#6366f1" />
            }
          >
            {hasEarlier && (
              <TouchableOpacity
                onPress={handleLoadEarlier}
                disabled={loadingEarlier}
                style={tw('self-center mb-4 px-4 py-2 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700')}
              >
                {loadingEarlier ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <Text style={tw('text-xs font-bold text-slate-600 dark:text-slate-300')}>
                    {t('mobile.load_earlier_messages', 'Load earlier messages')}
                  </Text>
                )}
              </TouchableOpacity>
            )}

            {/* Empty / Welcome starter when no messages yet */}
            {messages.length === 0 && (
              <View style={tw('gap-4')}>
                <View style={tw('p-4 rounded-2xl bg-slate-100 dark:bg-slate-800 self-start max-w-[90%] rounded-tl-sm')}>
                  <Text style={tw('text-base text-slate-800 dark:text-slate-100 leading-6')}>
                    {t(
                      'mobile.ai_welcome_msg',
                      'Hello! I am your Medical AI Assistant. Choose a consultation topic below or ask your health question.'
                    )}
                  </Text>
                </View>

                <View>
                  <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
                    {t('mobile.ai_select_topic', 'Consultation Focus')}
                  </Text>
                  <View style={tw('flex-row flex-wrap gap-2')}>
                    {TYPE_OPTIONS.map((opt) => {
                      const active = selectedType === opt.value;
                      return (
                        <TouchableOpacity
                          key={opt.value}
                          onPress={() => setSelectedType(opt.value)}
                          style={tw(
                            `px-3 py-1.5 rounded-full border ${
                              active
                                ? 'bg-indigo-600 border-indigo-600'
                                : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                            }`
                          )}
                        >
                          <Text
                            style={tw(
                              `text-xs font-semibold ${
                                active ? 'text-white' : 'text-slate-700 dark:text-slate-300'
                              }`
                            )}
                          >
                            {t(opt.labelKey, opt.defaultLabel)}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>

                <View>
                  <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
                    {t('mobile.ai_suggested_questions', 'Suggested Questions')}
                  </Text>
                  <View style={tw('gap-2')}>
                    {QUICK_PROMPTS.map((item) => {
                      const promptText = t(item.key, item.defaultText);
                      return (
                        <TouchableOpacity
                          key={item.key}
                          disabled={sending}
                          onPress={() => void sendMessageCore(promptText)}
                          style={tw('p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-900/50')}
                        >
                          <Text style={tw('text-sm text-indigo-800 dark:text-indigo-200 font-medium')}>
                            {promptText}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              </View>
            )}

            {messages.map((msg) => (
              <View
                key={msg.id}
                style={tw(`mb-4 max-w-[85%] ${msg.sender === 'user' ? 'self-end' : 'self-start'}`)}
              >
                <View
                  style={tw(
                    `p-3.5 rounded-2xl ${
                      msg.sender === 'user'
                        ? 'bg-indigo-600 rounded-tr-sm'
                        : 'bg-slate-100 dark:bg-slate-800 rounded-tl-sm'
                    }`
                  )}
                >
                  {msg.attachments?.map((att, idx) =>
                    att.secureUrl ? (
                      <View
                        key={`${msg.id}-att-${idx}`}
                        style={tw('w-56 h-56 rounded-xl mb-2.5 overflow-hidden border border-black/10 dark:border-white/10 bg-slate-200 dark:bg-slate-700 relative')}
                      >
                        <TouchableOpacity
                          activeOpacity={0.88}
                          onPress={() =>
                            setSelectedImagePreview({
                              uri: att.secureUrl,
                              name: att.originalName || `Medical_Photo_${msg.id}.jpg`,
                              size: att.size
                                ? `${(att.size / 1024).toFixed(0)} KB`
                                : t('mobile.image_attachment', 'Image'),
                            })
                          }
                          style={tw('w-full h-full')}
                        >
                          <Image source={{ uri: att.secureUrl }} style={tw('w-full h-full')} resizeMode="cover" />
                        </TouchableOpacity>
                        <TouchableOpacity
                          activeOpacity={0.8}
                          disabled={downloadingMsgId === msg.id}
                          onPress={() => void handleDirectDownload(msg.id, att)}
                          style={tw('absolute top-2 right-2 bg-black/75 px-2.5 py-1.5 rounded-lg flex-row items-center')}
                        >
                          {downloadingMsgId === msg.id ? (
                            <ActivityIndicator size="small" color="#ffffff" />
                          ) : (
                            <>
                              <Download color="#ffffff" size={12} style={tw('mr-1')} />
                              <Text style={tw('text-[10px] text-white font-bold')}>
                                {t('mobile.download', 'Download')}
                              </Text>
                            </>
                          )}
                        </TouchableOpacity>
                        <View style={tw('absolute bottom-2 right-2 bg-black/70 px-2 py-1 rounded-md flex-row items-center pointer-events-none')}>
                          <ZoomIn color="#ffffff" size={12} style={tw('mr-1')} />
                          <Text style={tw('text-[10px] text-white font-medium')}>
                            {t('mobile.zoom_image', 'Zoom')}
                          </Text>
                        </View>
                      </View>
                    ) : null
                  )}
                  <Text
                    style={tw(
                      `text-base leading-6 ${
                        msg.sender === 'user' ? 'text-white' : 'text-slate-800 dark:text-slate-100'
                      }`
                    )}
                  >
                    {msg.text}
                  </Text>
                </View>

                {msg.citations && msg.citations.length > 0 && (
                  <View style={tw('mt-2 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-xl border border-slate-200 dark:border-slate-700')}>
                    <View style={tw('flex-row items-center mb-1')}>
                      <BookOpen color={twInstance.color('text-slate-400')} size={14} />
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 font-bold ml-1 uppercase')}>
                        {t('mobile.citations', 'References')}
                      </Text>
                    </View>
                    {msg.citations.map((cite, idx) => (
                      <Text key={idx} style={tw('text-xs text-indigo-600 dark:text-indigo-400 mt-1')}>
                        [{idx + 1}] {cite.source}
                      </Text>
                    ))}
                  </View>
                )}

                <Text
                  style={tw(
                    `text-xs text-slate-400 dark:text-slate-500 mt-1 ${
                      msg.sender === 'user' ? 'text-right' : 'text-left'
                    }`
                  )}
                >
                  {msg.time}
                </Text>
              </View>
            ))}

            {sending && (
              <View style={tw('self-start bg-slate-100 dark:bg-slate-800 px-4 py-3 rounded-2xl rounded-tl-sm flex-row items-center gap-2')}>
                <ActivityIndicator size="small" color="#6366f1" />
                <Text style={tw('text-sm text-slate-600 dark:text-slate-300 font-medium')}>
                  {t('mobile.ai_analyzing', 'AI is analyzing...')}
                </Text>
              </View>
            )}
          </ScrollView>
        )}

        {/* Pending Image Preview Strip */}
        {pendingImage && (
          <View style={tw('px-4 pt-2 pb-1 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex-row items-center justify-between')}>
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <Image source={{ uri: pendingImage.uri }} style={tw('w-12 h-12 rounded-xl mr-3')} />
              <View style={tw('flex-1')}>
                <Text style={tw('text-xs font-bold text-slate-800 dark:text-white')} numberOfLines={1}>
                  {pendingImage.name}
                </Text>
                <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                  {pendingImage.sizeLabel}
                </Text>
              </View>
            </View>
            <TouchableOpacity onPress={() => setPendingImage(null)} style={tw('p-1.5')}>
              <X color={isDark ? '#cbd5e1' : '#475569'} size={18} />
            </TouchableOpacity>
          </View>
        )}

        {/* Input Area */}
        <View style={tw('p-3.5 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex-row items-end')}>
          <TouchableOpacity
            disabled={sending}
            onPress={() => setImagePickerModalVisible(true)}
            style={tw('w-11 h-11 bg-slate-100 dark:bg-slate-800 rounded-full mr-2 items-center justify-center')}
          >
            <Camera color={twInstance.color('text-indigo-600 dark:text-indigo-400')} size={20} />
          </TouchableOpacity>
          <View style={tw('flex-1 bg-slate-100 dark:bg-slate-800 rounded-2xl px-3.5 py-2 mr-2 justify-center min-h-[44px] max-h-32')}>
            <TextInput
              style={[tw('text-base text-slate-900 dark:text-white max-h-28 p-0'), { textAlignVertical: 'center' }]}
              placeholder={t('mobile.ask_anything', 'Ask AI a health question...')}
              placeholderTextColor="#94a3b8"
              value={messageInput}
              onChangeText={setMessageInput}
              multiline
              scrollEnabled
              editable={!sending}
            />
          </View>
          <TouchableOpacity
            onPress={() => void sendMessageCore(messageInput, pendingImage)}
            style={tw(
              `w-11 h-11 rounded-full items-center justify-center ${
                (messageInput.trim() || pendingImage) && !sending
                  ? 'bg-indigo-600'
                  : 'bg-slate-200 dark:bg-slate-700'
              }`
            )}
            disabled={(!messageInput.trim() && !pendingImage) || sending}
          >
            {sending ? (
              <ActivityIndicator size="small" color="#ffffff" />
            ) : (
              <Send
                color={messageInput.trim() || pendingImage ? '#ffffff' : twInstance.color('text-slate-400')}
                size={19}
              />
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>

      {/* Feedback & Rating Modal */}
      <Modal
        visible={reportModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setReportModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-5 max-h-[85%]')}>
            <View style={tw('flex-row justify-between items-center mb-4 pb-3 border-b border-slate-100 dark:border-slate-800')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.report_ai_chat', 'AI Feedback & Rating')}
              </Text>
              <TouchableOpacity onPress={() => setReportModalVisible(false)}>
                <X color={twInstance.color('text-slate-500')} size={22} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw('gap-4 pb-4')}>
              {!!activeConversationId && (
                <View style={tw('bg-slate-50 dark:bg-slate-800/50 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 gap-3')}>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.ai_rate_session', 'Rate this consultation')}
                  </Text>
                  <View style={tw('flex-row gap-2')}>
                    {[1, 2, 3, 4, 5].map((num) => (
                      <TouchableOpacity key={num} onPress={() => setRatingValue(num)} style={tw('p-1')}>
                        <Star
                          color={num <= ratingValue ? '#f59e0b' : '#94a3b8'}
                          fill={num <= ratingValue ? '#f59e0b' : 'none'}
                          size={24}
                        />
                      </TouchableOpacity>
                    ))}
                  </View>
                  <TextInput
                    value={ratingComment}
                    onChangeText={setRatingComment}
                    placeholder={t('mobile.ai_rating_comment_placeholder', 'Optional comment on response quality...')}
                    placeholderTextColor="#94a3b8"
                    style={tw('bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-slate-900 dark:text-white')}
                  />
                  <TouchableOpacity
                    disabled={submittingRating}
                    onPress={handleSubmitRating}
                    style={tw('bg-indigo-600 py-2.5 rounded-xl items-center')}
                  >
                    {submittingRating ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={tw('text-white text-sm font-bold')}>
                        {currentRating > 0
                          ? t('mobile.update_rating', 'Update Rating')
                          : t('mobile.submit_rating', 'Submit Rating')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              <View>
                <Text style={tw('text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2')}>
                  {t('mobile.reason_for_reporting', 'Feedback / Issue Report')}
                </Text>
                <TextInput
                  value={reportReason}
                  onChangeText={setReportReason}
                  placeholder={t('mobile.report_placeholder', 'Share helpful feedback or report inaccurate medical advice...')}
                  placeholderTextColor="#94a3b8"
                  style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white h-24')}
                  multiline
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  disabled={submittingFeedback || !reportReason.trim()}
                  onPress={handleSubmitFeedback}
                  style={tw(`mt-3 py-3.5 rounded-xl items-center ${submittingFeedback || !reportReason.trim() ? 'bg-red-400' : 'bg-red-500'}`)}
                >
                  {submittingFeedback ? (
                    <ActivityIndicator size="small" color="#ffffff" />
                  ) : (
                    <Text style={tw('text-white font-bold text-sm')}>{t('mobile.submit_report', 'Submit Feedback')}</Text>
                  )}
                </TouchableOpacity>
              </View>

              {feedbacks.length > 0 && (
                <View style={tw('gap-2.5')}>
                  <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400')}>
                    {t('mobile.ai_previous_feedbacks', {
                      count: feedbackTotal,
                      defaultValue: 'Feedback History ({{count}})',
                    })}
                  </Text>
                  {feedbacks.map((fb) => {
                    const fbId = getRecordId(fb);
                    const isEditing = editingFeedbackId === fbId;
                    return (
                      <View
                        key={fbId || fb.content}
                        style={tw('p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 gap-2')}
                      >
                        {isEditing ? (
                          <View style={tw('gap-2')}>
                            <TextInput
                              value={editingFeedbackText}
                              onChangeText={setEditingFeedbackText}
                              style={tw('bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white')}
                            />
                            <View style={tw('flex-row gap-2 justify-end')}>
                              <TouchableOpacity
                                onPress={() => {
                                  setEditingFeedbackId(null);
                                  setEditingFeedbackText('');
                                }}
                                style={tw('px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-700')}
                              >
                                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                                  {t('mobile.cancel', 'Cancel')}
                                </Text>
                              </TouchableOpacity>
                              <TouchableOpacity
                                disabled={busyFeedbackId === fbId}
                                onPress={() => void handleSaveFeedbackEdit(fbId)}
                                style={tw('px-3 py-1.5 rounded-lg bg-indigo-600')}
                              >
                                <Text style={tw('text-xs font-bold text-white')}>{t('mobile.save', 'Save')}</Text>
                              </TouchableOpacity>
                            </View>
                          </View>
                        ) : (
                          <>
                            <Text style={tw('text-sm text-slate-800 dark:text-slate-100')}>{fb.content}</Text>
                            <View style={tw('flex-row items-center justify-between')}>
                              <TouchableOpacity
                                disabled={!fbId || busyFeedbackId === fbId}
                                onPress={() => void handleMarkFeedbackHelpful(fb)}
                                style={tw('flex-row items-center gap-1')}
                              >
                                <ThumbsUp color="#6366f1" size={14} />
                                <Text style={tw('text-xs font-semibold text-indigo-600 dark:text-indigo-400')}>
                                  {t('mobile.helpful', 'Helpful')}
                                  {typeof fb.helpfulCount === 'number' ? ` (${fb.helpfulCount})` : ''}
                                </Text>
                              </TouchableOpacity>
                              {!!fbId && (
                                <View style={tw('flex-row items-center gap-2')}>
                                  <TouchableOpacity
                                    onPress={() => {
                                      setEditingFeedbackId(fbId);
                                      setEditingFeedbackText(fb.content);
                                    }}
                                  >
                                    <Edit3 color="#64748b" size={14} />
                                  </TouchableOpacity>
                                  <TouchableOpacity
                                    disabled={busyFeedbackId === fbId}
                                    onPress={() => void handleDeleteFeedback(fbId)}
                                  >
                                    <Trash2 color="#ef4444" size={14} />
                                  </TouchableOpacity>
                                </View>
                              )}
                            </View>
                          </>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Conversation Stats Modal */}
      <Modal
        visible={statsModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setStatsModalVisible(false)}
      >
        <View style={tw('flex-1 justify-center items-center bg-black/60 px-6')}>
          <View style={tw('w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800')}>
            <View style={tw('flex-row items-center justify-between mb-4')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.ai_conversation_stats', 'Conversation Statistics')}
              </Text>
              <TouchableOpacity onPress={() => setStatsModalVisible(false)}>
                <X color={twInstance.color('text-slate-500')} size={20} />
              </TouchableOpacity>
            </View>
            <View style={tw('gap-2.5')}>
              <View style={tw('flex-row justify-between py-2 border-b border-slate-100 dark:border-slate-800')}>
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                  {t('mobile.ai_total_messages', 'Total messages')}
                </Text>
                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                  {String(convStats?.totalMessages ?? messages.length)}
                </Text>
              </View>
              <View style={tw('flex-row justify-between py-2 border-b border-slate-100 dark:border-slate-800')}>
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                  {t('mobile.ai_tokens_used', 'Tokens used')}
                </Text>
                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                  {Number(convStats?.totalTokensUsed ?? 0).toLocaleString(timeLocale)}
                </Text>
              </View>
              <View style={tw('flex-row justify-between py-2')}>
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                  {t('mobile.ai_feedback_count', 'Feedback entries')}
                </Text>
                <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>{feedbackTotal}</Text>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Image Picker Bottom Sheet Modal */}
      <Modal
        visible={imagePickerModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setImagePickerModalVisible(false)}
      >
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 gap-4')}>
            <View style={tw('flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.send_medical_image', 'Send Medical Image to AI')}
              </Text>
              <TouchableOpacity
                onPress={() => setImagePickerModalVisible(false)}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
              {t('mobile.ai_image_only_notice', 'AI supports analyzing photos of prescriptions, device readings, or visible symptoms.')}
            </Text>

            <View style={tw('gap-3 py-2')}>
              <TouchableOpacity
                onPress={() => void handlePickImage('camera')}
                style={tw('p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/40 flex-row items-center')}
              >
                <View style={tw('w-10 h-10 rounded-xl bg-indigo-100 dark:bg-indigo-900/60 items-center justify-center mr-3')}>
                  <Camera color={twInstance.color('text-indigo-600 dark:text-indigo-300')} size={22} />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.take_photo', 'Take a Photo')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.take_photo_desc', 'Capture prescription or visible symptom area')}
                  </Text>
                </View>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => void handlePickImage('gallery')}
                style={tw('p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 flex-row items-center')}
              >
                <View style={tw('w-10 h-10 rounded-xl bg-slate-200 dark:bg-slate-700 items-center justify-center mr-3')}>
                  <ImageIcon color={twInstance.color('text-slate-600 dark:text-slate-300')} size={22} />
                </View>
                <View style={tw('flex-1')}>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.choose_library', 'Choose from Photo Library')}
                  </Text>
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                    {t('mobile.choose_library_desc', 'Select an existing image on your device')}
                  </Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Full-Screen Image Lightbox */}
      <ImageViewerModal
        visible={!!selectedImagePreview}
        imageUri={selectedImagePreview?.uri}
        imageName={selectedImagePreview?.name}
        imageSize={selectedImagePreview?.size}
        onClose={() => setSelectedImagePreview(null)}
      />
    </SafeAreaView>
  );
}
