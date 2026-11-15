import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocalSearchParams, useFocusEffect } from 'expo-router';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import {
  ArrowLeft,
  Sparkles,
  Plus,
  ChevronRight,
  Search,
  Star,
  Archive,
  Trash2,
  Edit3,
  HeartPulse,
  X,
  MessageSquare,
  AlertCircle,
  RefreshCw,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import {
  mobileApi,
  normalizePaginatedList,
  type FeTypes,
} from '@repo/shared-hooks';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

type ConversationType =
  | 'health_inquiry'
  | 'symptom_analysis'
  | 'health_education'
  | 'test_result_explanation'
  | 'medication_info'
  | 'general_consultation';

type ConversationItem = FeTypes.AiAssistantGetConversationsResponse['data'][number] & {
  _id?: string;
  id?: string;
};

type UserSummaryStats = {
  totalConversations?: number;
  favoriteCount?: number;
  archivedCount?: number;
  totalMessages?: number;
  averageRating?: number;
};

function getConvId(item: ConversationItem): string {
  return String(item._id ?? item.id ?? '');
}

const CONVERSATION_TYPES: Array<{ value: ConversationType; labelKey: string; defaultLabel: string }> = [
  { value: 'general_consultation', labelKey: 'mobile.ai_type_general', defaultLabel: 'General Consultation' },
  { value: 'symptom_analysis', labelKey: 'mobile.ai_type_symptoms', defaultLabel: 'Symptom Analysis' },
  { value: 'medication_info', labelKey: 'mobile.ai_type_medication', defaultLabel: 'Medication Info' },
  { value: 'test_result_explanation', labelKey: 'mobile.ai_type_lab_results', defaultLabel: 'Test Results' },
  { value: 'health_education', labelKey: 'mobile.ai_type_education', defaultLabel: 'Health Education' },
  { value: 'health_inquiry', labelKey: 'mobile.ai_type_inquiry', defaultLabel: 'Health Inquiry' },
];

export default function AiChatHistoryScreen() {
  const { t, i18n } = useTranslation();
  const { colorScheme } = useThemeContext();
  const isDark = colorScheme === 'dark';

  const router = useRouter();
  const { prefill } = useLocalSearchParams<{ prefill?: string }>();
  const handledPrefillRef = useRef<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [conversations, setConversations] = useState<ConversationItem[]>([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);

  const [activeTab, setActiveTab] = useState<'active' | 'favorites' | 'archived'>('active');
  const [selectedType, setSelectedType] = useState<ConversationType | 'all'>('all');
  const [searchInput, setSearchInput] = useState('');
  const [activeSearch, setActiveSearch] = useState('');

  const [summary, setSummary] = useState<UserSummaryStats | null>(null);
  const [busyConvId, setBusyConvId] = useState<string | null>(null);

  const [renameTarget, setRenameTarget] = useState<ConversationItem | null>(null);
  const [renameText, setRenameText] = useState('');
  const [renaming, setRenaming] = useState(false);

  const [healthSummaryModalVisible, setHealthSummaryModalVisible] = useState(false);
  const [loadingHealthSummary, setLoadingHealthSummary] = useState(false);
  const [healthSummaryText, setHealthSummaryText] = useState('');
  const [healthSummaryError, setHealthSummaryError] = useState<string | null>(null);

  useEffect(() => {
    if (prefill && handledPrefillRef.current !== prefill) {
      handledPrefillRef.current = prefill;
      router.replace({
        pathname: '/(patient)/ai-chat/[id]',
        params: { id: 'new-session', prefill },
      });
    }
  }, [prefill, router]);

  const dateLocale = i18n.language?.startsWith('vi') ? 'vi-VN' : 'en-US';

  const fetchConversations = useCallback(
    async (targetPage = 1, append = false, opts?: { showLoader?: boolean }) => {
      if (opts?.showLoader && !append) {
        setLoading(true);
      }
      setLoadError(null);
      try {
        const trimmedSearch = activeSearch.trim();
        const typeParam = selectedType !== 'all' ? selectedType : undefined;

        const [listResult, summaryResult] = await Promise.allSettled([
          trimmedSearch.length >= 2
            ? mobileApi.aiAssistantSearchConversations({
                query: {
                  q: trimmedSearch,
                  page: targetPage,
                  limit: 20,
                  sortBy: 'lastMessageAt',
                  sortOrder: -1,
                  ...(typeParam ? { type: typeParam } : {}),
                },
              })
            : mobileApi.aiAssistantGetConversations({
                query: {
                  page: targetPage,
                  limit: 20,
                  sortBy: 'lastMessageAt',
                  sortOrder: -1,
                  ...(typeParam ? { type: typeParam } : {}),
                  ...(activeTab === 'favorites' ? { isFavorite: true } : {}),
                  ...(activeTab === 'archived' ? { isArchived: true } : {}),
                  ...(activeTab === 'active' ? { isArchived: false } : {}),
                },
              }),
          !append ? mobileApi.aiAssistantGetUserConversationSummary() : Promise.resolve(null),
        ]);

        if (listResult.status === 'rejected') {
          throw listResult.reason;
        }

        const parsed = normalizePaginatedList<ConversationItem>(
          listResult.value,
          targetPage,
          20
        );

        setConversations((prev) => (append ? [...prev, ...parsed.items] : parsed.items));
        setPage(parsed.page);
        setHasMore(parsed.hasNextPage);

        if (summaryResult.status === 'fulfilled' && summaryResult.value) {
          const sumData = (summaryResult.value as { data?: UserSummaryStats })?.data;
          if (sumData) {
            setSummary(sumData);
          }
        }
      } catch (error) {
        if (!append) {
          setLoadError(
            extractApiErrorMessage(
              error,
              t('mobile.ai_load_conversations_error', 'Unable to load AI consultation history.')
            )
          );
        } else {
          Toast.show({
            type: 'error',
            text1: t('mobile.error', 'Error'),
            text2: extractApiErrorMessage(
              error,
              t('mobile.ai_load_conversations_error', 'Unable to load more conversations.')
            ),
          });
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
        setLoadingMore(false);
      }
    },
    [activeSearch, activeTab, selectedType, t]
  );

  useFocusEffect(
    useCallback(() => {
      void fetchConversations(1, false, { showLoader: conversations.length === 0 });
    }, [fetchConversations, conversations.length])
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void fetchConversations(1, false);
  }, [fetchConversations]);

  const handleLoadMore = () => {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    void fetchConversations(page + 1, true);
  };

  const handleSearchSubmit = () => {
    const trimmed = searchInput.trim();
    if (trimmed.length === 1) {
      Toast.show({
        type: 'info',
        text1: t('mobile.search', 'Search'),
        text2: t('mobile.ai_search_min_chars', 'Please enter at least 2 characters to search.'),
      });
      return;
    }
    setActiveSearch(trimmed);
  };

  const handleToggleFavorite = async (item: ConversationItem) => {
    const id = getConvId(item);
    if (!id || busyConvId) return;
    setBusyConvId(id);
    try {
      const res = await mobileApi.aiAssistantToggleFavorite({
        params: { conversationId: id },
      });
      const isFavorite = Boolean(res?.data?.isFavorite);
      setConversations((prev) => {
        if (activeTab === 'favorites' && !isFavorite) {
          return prev.filter((c) => getConvId(c) !== id);
        }
        return prev.map((c) => (getConvId(c) === id ? { ...c, isFavorite } : c));
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Could not update favorite status.')),
      });
    } finally {
      setBusyConvId(null);
    }
  };

  const handleToggleArchive = async (item: ConversationItem) => {
    const id = getConvId(item);
    if (!id || busyConvId) return;
    const willArchive = !item.archivedAt;
    setBusyConvId(id);
    try {
      const res = await mobileApi.aiAssistantArchiveConversation({
        params: { conversationId: id },
        body: { isArchived: willArchive },
      });
      const archivedAt = res?.data?.archivedAt ?? undefined;
      setConversations((prev) => prev.filter((c) => getConvId(c) !== id || (activeTab === 'favorites')));
      if (activeTab === 'favorites') {
        setConversations((prev) =>
          prev.map((c) => (getConvId(c) === id ? { ...c, archivedAt: archivedAt ?? undefined } : c))
        );
      }
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: willArchive
          ? t('mobile.ai_archived_success', 'Conversation archived.')
          : t('mobile.ai_unarchived_success', 'Conversation restored to inbox.'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Unable to update archive status.')),
      });
    } finally {
      setBusyConvId(null);
    }
  };

  const confirmDelete = (item: ConversationItem) => {
    const id = getConvId(item);
    if (!id || busyConvId) return;
    Alert.alert(
      t('mobile.ai_delete_title', 'Delete Consultation'),
      t('mobile.ai_delete_confirm', 'Are you sure you want to permanently delete this AI conversation?'),
      [
        { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
        {
          text: t('mobile.delete', 'Delete'),
          style: 'destructive',
          onPress: async () => {
            setBusyConvId(id);
            try {
              await mobileApi.aiAssistantDeleteConversation({
                params: { conversationId: id },
              });
              setConversations((prev) => prev.filter((c) => getConvId(c) !== id));
              Toast.show({
                type: 'success',
                text1: t('mobile.success', 'Success'),
                text2: t('mobile.ai_deleted_success', 'Conversation deleted.'),
              });
            } catch (error) {
              Toast.show({
                type: 'error',
                text1: t('mobile.error', 'Error'),
                text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Unable to delete conversation.')),
              });
            } finally {
              setBusyConvId(null);
            }
          },
        },
      ]
    );
  };

  const handleSaveRename = async () => {
    if (!renameTarget || renaming) return;
    const id = getConvId(renameTarget);
    const trimmed = renameText.trim();
    if (!id || !trimmed) return;
    setRenaming(true);
    try {
      await mobileApi.aiAssistantUpdateConversation({
        params: { conversationId: id },
        body: { topic: trimmed },
      });
      setConversations((prev) =>
        prev.map((c) => (getConvId(c) === id ? { ...c, topic: trimmed } : c))
      );
      setRenameTarget(null);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t('mobile.ai_topic_updated', 'Conversation topic updated.'),
      });
    } catch (error) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(error, t('mobile.action_failed', 'Could not update topic.')),
      });
    } finally {
      setRenaming(false);
    }
  };

  const handleOpenHealthSummary = async () => {
    if (loadingHealthSummary) return;
    setHealthSummaryModalVisible(true);
    setLoadingHealthSummary(true);
    setHealthSummaryError(null);
    setHealthSummaryText('');
    try {
      const meRes = await mobileApi.usersGetMe();
      const meWrapped = meRes as unknown as { data?: FeTypes.UsersGetMeResponse };
      const me = meWrapped?.data ?? (meRes as FeTypes.UsersGetMeResponse);
      const summaryResponse = await mobileApi.aiAssistantGetHealthProfileSummary({
        patientProfile: me
          ? {
              fullName: me.fullName,
              gender: me.gender,
              dateOfBirth: me.dateOfBirth,
              address: me.address,
            }
          : {},
      });
      const text =
        typeof summaryResponse === 'string'
          ? summaryResponse
          : String((summaryResponse as { data?: unknown })?.data ?? '');
      setHealthSummaryText(text.trim());
    } catch (error) {
      setHealthSummaryError(
        extractApiErrorMessage(
          error,
          t('mobile.ai_health_summary_error', 'Could not generate AI health summary at this time.')
        )
      );
    } finally {
      setLoadingHealthSummary(false);
    }
  };

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parsed = new Date(dateStr);
    if (Number.isNaN(parsed.getTime())) return '';
    return parsed.toLocaleDateString(dateLocale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  const getTypeLabel = (type?: string) => {
    const found = CONVERSATION_TYPES.find((item) => item.value === type);
    return found ? t(found.labelKey, found.defaultLabel) : t('mobile.ai_type_general', 'General Consultation');
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      {/* Header */}
      <View style={tw('flex-row items-center px-4 py-3.5 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800')}>
        <TouchableOpacity
          style={tw('p-2 -ml-1 mr-2')}
          onPress={() => router.back('/(patient)/chat-hub')}
          accessibilityLabel={t('mobile.back', 'Back')}
        >
          <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
        </TouchableOpacity>
        <View style={tw('w-10 h-10 bg-indigo-100 dark:bg-indigo-900/40 rounded-full items-center justify-center mr-3')}>
          <Sparkles color={isDark ? '#818cf8' : '#6366f1'} size={20} />
        </View>
        <View style={tw('flex-1 mr-2')}>
          <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')} numberOfLines={1}>
            {t('mobile.ai_consultations', 'AI Consultations')}
          </Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-xs')} numberOfLines={1}>
            {summary?.totalConversations !== undefined
              ? t('mobile.ai_summary_counts', {
                  count: summary.totalConversations,
                  messages: summary.totalMessages ?? 0,
                  defaultValue: '{{count}} conversations · {{messages}} messages',
                })
              : t('mobile.your_health_analysis_history', 'Your health analysis history')}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleOpenHealthSummary}
          disabled={loadingHealthSummary}
          style={tw('flex-row items-center bg-indigo-50 dark:bg-indigo-900/30 border border-indigo-200 dark:border-indigo-800 px-3 py-2 rounded-xl')}
        >
          <HeartPulse color={isDark ? '#818cf8' : '#4f46e5'} size={16} style={tw('mr-1.5')} />
          <Text style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300')}>
            {t('mobile.ai_health_summary_btn', 'Summary')}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Search & Filters */}
      <View style={tw('bg-white dark:bg-slate-900 px-4 pt-3 pb-2 border-b border-slate-100 dark:border-slate-800 gap-2.5')}>
        <View style={tw('flex-row items-center bg-slate-100 dark:bg-slate-800 rounded-xl px-3 py-2')}>
          <Search color={isDark ? '#94a3b8' : '#64748b'} size={18} style={tw('mr-2')} />
          <TextInput
            value={searchInput}
            onChangeText={(val) => {
              setSearchInput(val);
              if (!val.trim() && activeSearch) {
                setActiveSearch('');
              }
            }}
            onSubmitEditing={handleSearchSubmit}
            returnKeyType="search"
            placeholder={t('mobile.ai_search_placeholder', 'Search consultations...')}
            placeholderTextColor={isDark ? '#64748b' : '#94a3b8'}
            style={tw('flex-1 text-sm text-slate-900 dark:text-white p-0')}
          />
          {searchInput.length > 0 && (
            <TouchableOpacity
              onPress={() => {
                setSearchInput('');
                setActiveSearch('');
              }}
              style={tw('p-1')}
            >
              <X color={isDark ? '#94a3b8' : '#64748b'} size={16} />
            </TouchableOpacity>
          )}
        </View>

        <View style={tw('flex-row gap-2')}>
          {(['active', 'favorites', 'archived'] as const).map((tab) => {
            const active = activeTab === tab;
            const label =
              tab === 'active'
                ? t('mobile.tab_active', 'Active')
                : tab === 'favorites'
                  ? t('mobile.tab_favorites', 'Favorites')
                  : t('mobile.tab_archived', 'Archived');
            return (
              <TouchableOpacity
                key={tab}
                onPress={() => setActiveTab(tab)}
                style={tw(
                  `flex-1 px-2 py-2 rounded-xl items-center justify-center border ${
                    active
                      ? 'bg-indigo-600 border-indigo-600'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
                  }`
                )}
              >
                <Text
                  numberOfLines={1}
                  style={tw(
                    `w-full text-center text-xs font-bold ${
                      active ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                    }`
                  )}
                >
                  {label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={tw('gap-2 pb-1')}>
          <TouchableOpacity
            onPress={() => setSelectedType('all')}
            style={tw(
              `px-3 py-1.5 rounded-full border ${
                selectedType === 'all'
                  ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                  : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
              }`
            )}
          >
            <Text
              style={tw(
                `text-xs font-semibold ${
                  selectedType === 'all'
                    ? 'text-white dark:text-slate-900'
                    : 'text-slate-600 dark:text-slate-300'
                }`
              )}
            >
              {t('mobile.all', 'All')}
            </Text>
          </TouchableOpacity>
          {CONVERSATION_TYPES.map((ct) => {
            const selected = selectedType === ct.value;
            return (
              <TouchableOpacity
                key={ct.value}
                onPress={() => setSelectedType(ct.value)}
                style={tw(
                  `px-3 py-1.5 rounded-full border ${
                    selected
                      ? 'bg-slate-900 dark:bg-white border-slate-900 dark:border-white'
                      : 'bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                  }`
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-semibold ${
                      selected
                        ? 'text-white dark:text-slate-900'
                        : 'text-slate-600 dark:text-slate-300'
                    }`
                  )}
                >
                  {t(ct.labelKey, ct.defaultLabel)}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-4 pb-28')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={isDark ? '#818cf8' : '#4f46e5'}
          />
        }
      >
        {loading ? (
          <View style={tw('gap-3')}>
            {[0, 1, 2, 3].map((idx) => (
              <View
                key={idx}
                style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl border border-slate-100 dark:border-slate-800 gap-2')}
              >
                <Skeleton className="h-4 w-24 rounded-full" />
                <Skeleton className="h-5 w-4/5 rounded-lg" />
                <Skeleton className="h-4 w-full rounded-lg" />
                <Skeleton className="h-3 w-32 rounded-lg" />
              </View>
            ))}
          </View>
        ) : loadError ? (
          <View style={tw('items-center justify-center py-16 px-4 bg-white dark:bg-slate-900 rounded-2xl border border-slate-100 dark:border-slate-800')}>
            <AlertCircle color="#ef4444" size={36} style={tw('mb-3')} />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1 text-center')}>
              {t('mobile.unable_to_load', 'Unable to Load')}
            </Text>
            <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center mb-4')}>
              {loadError}
            </Text>
            <TouchableOpacity
              onPress={() => void fetchConversations(1, false, { showLoader: true })}
              style={tw('flex-row items-center bg-indigo-600 px-5 py-2.5 rounded-xl')}
            >
              <RefreshCw color="#ffffff" size={16} style={tw('mr-2')} />
              <Text style={tw('text-white font-bold text-sm')}>{t('mobile.retry', 'Retry')}</Text>
            </TouchableOpacity>
          </View>
        ) : conversations.length === 0 ? (
          <View style={tw('items-center justify-center py-20 px-4')}>
            <View style={tw('w-16 h-16 bg-indigo-50 dark:bg-indigo-900/30 rounded-full items-center justify-center mb-4')}>
              <MessageSquare color={isDark ? '#818cf8' : '#6366f1'} size={28} />
            </View>
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1 text-center')}>
              {t('mobile.ai_no_conversations', 'No AI Consultations Yet')}
            </Text>
            <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center mb-5')}>
              {t('mobile.ai_no_conversations_desc', 'Start a new conversation to ask about symptoms, medications, or test results.')}
            </Text>
            <TouchableOpacity
              onPress={() => router.push('/(patient)/ai-chat/new')}
              style={tw('bg-indigo-600 px-5 py-3 rounded-xl flex-row items-center')}
            >
              <Plus color="#ffffff" size={18} style={tw('mr-1.5')} />
              <Text style={tw('text-white font-bold text-sm')}>{t('mobile.new_chat', 'New Chat')}</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            {conversations.map((session) => {
              const id = getConvId(session);
              const isBusy = busyConvId === id;
              return (
                <TouchableOpacity
                  key={id || session.topic}
                  disabled={!id || isBusy}
                  onPress={() => router.push(`/(patient)/ai-chat/${id}`)}
                  style={tw('bg-white dark:bg-slate-900 p-4 rounded-2xl mb-3 border border-slate-100 dark:border-slate-800 shadow-sm')}
                >
                  <View style={tw('flex-row items-center justify-between mb-2')}>
                    <View style={tw('bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 rounded-full')}>
                      <Text style={tw('text-[11px] font-bold text-indigo-700 dark:text-indigo-300')}>
                        {getTypeLabel(session.type)}
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center gap-1')}>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => handleToggleFavorite(session)}
                        style={tw('p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800')}
                      >
                        <Star
                          color={session.isFavorite ? '#f59e0b' : isDark ? '#94a3b8' : '#64748b'}
                          fill={session.isFavorite ? '#f59e0b' : 'none'}
                          size={15}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => {
                          setRenameTarget(session);
                          setRenameText(session.topic || '');
                        }}
                        style={tw('p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800')}
                      >
                        <Edit3 color={isDark ? '#94a3b8' : '#64748b'} size={15} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => handleToggleArchive(session)}
                        style={tw('p-1.5 rounded-lg bg-slate-50 dark:bg-slate-800')}
                      >
                        <Archive color={isDark ? '#94a3b8' : '#64748b'} size={15} />
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => confirmDelete(session)}
                        style={tw('p-1.5 rounded-lg bg-red-50 dark:bg-red-900/20')}
                      >
                        <Trash2 color="#ef4444" size={15} />
                      </TouchableOpacity>
                    </View>
                  </View>

                  <View style={tw('flex-row items-center justify-between')}>
                    <View style={tw('flex-1 mr-3')}>
                      <Text style={tw('text-base font-bold text-slate-900 dark:text-white mb-1')} numberOfLines={2}>
                        {session.topic || t('mobile.ai_assistant', 'AI Assistant')}
                      </Text>
                      {!!session.summary && (
                        <Text style={tw('text-sm text-slate-500 dark:text-slate-400 mb-1.5')} numberOfLines={2}>
                          {session.summary}
                        </Text>
                      )}
                      <View style={tw('flex-row items-center gap-3 mt-1')}>
                        <Text style={tw('text-xs text-slate-400 dark:text-slate-500')}>
                          {formatDate(session.lastMessageAt || session.createdAt)}
                        </Text>
                        <Text style={tw('text-xs text-slate-400 dark:text-slate-500')}>
                          {t('mobile.ai_msg_count', {
                            count: session.messageCount ?? 0,
                            defaultValue: '{{count}} msgs',
                          })}
                        </Text>
                      </View>
                    </View>
                    <View style={tw('w-8 h-8 bg-slate-50 dark:bg-slate-800 rounded-full items-center justify-center')}>
                      {isBusy ? (
                        <ActivityIndicator size="small" color="#6366f1" />
                      ) : (
                        <ChevronRight color="#94a3b8" size={18} />
                      )}
                    </View>
                  </View>
                </TouchableOpacity>
              );
            })}

            {hasMore && (
              <TouchableOpacity
                onPress={handleLoadMore}
                disabled={loadingMore}
                style={tw('mt-2 py-3 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 items-center')}
              >
                {loadingMore ? (
                  <ActivityIndicator size="small" color="#6366f1" />
                ) : (
                  <Text style={tw('text-sm font-bold text-indigo-600 dark:text-indigo-400')}>
                    {t('mobile.load_more', 'Load more')}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </>
        )}
      </ScrollView>

      {/* FAB - New Consultation */}
      <TouchableOpacity
        onPress={() => router.push('/(patient)/ai-chat/new')}
        style={[
          tw('absolute bottom-8 right-6 bg-indigo-600 flex-row items-center justify-center rounded-full px-5 py-4 shadow-lg'),
          { shadowColor: '#6366f1', shadowOpacity: 0.3, shadowRadius: 8, shadowOffset: { width: 0, height: 4 } },
        ]}
      >
        <Plus color="#ffffff" size={22} style={tw('mr-2')} />
        <Text style={tw('text-white font-bold text-base')}>{t('mobile.new_chat', 'New Chat')}</Text>
      </TouchableOpacity>

      {/* Rename Topic Modal */}
      <Modal
        visible={!!renameTarget}
        transparent
        animationType="fade"
        onRequestClose={() => !renaming && setRenameTarget(null)}
      >
        <View style={tw('flex-1 justify-center items-center bg-black/60 px-6')}>
          <View style={tw('w-full bg-white dark:bg-slate-900 rounded-2xl p-5 border border-slate-200 dark:border-slate-800')}>
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white mb-3')}>
              {t('mobile.ai_rename_topic', 'Rename Conversation')}
            </Text>
            <TextInput
              value={renameText}
              onChangeText={setRenameText}
              placeholder={t('mobile.ai_topic_placeholder', 'Enter conversation title...')}
              placeholderTextColor="#94a3b8"
              style={tw('bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 text-slate-900 dark:text-white mb-4')}
            />
            <View style={tw('flex-row gap-3')}>
              <TouchableOpacity
                disabled={renaming}
                onPress={() => setRenameTarget(null)}
                style={tw('flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
              >
                <Text style={tw('text-sm font-bold text-slate-700 dark:text-slate-300')}>
                  {t('mobile.cancel', 'Cancel')}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                disabled={renaming || !renameText.trim()}
                onPress={handleSaveRename}
                style={tw(`flex-1 py-3 rounded-xl items-center ${renaming || !renameText.trim() ? 'bg-indigo-400' : 'bg-indigo-600'}`)}
              >
                {renaming ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <Text style={tw('text-sm font-bold text-white')}>{t('mobile.save', 'Save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* AI Health Profile Summary Modal */}
      <Modal
        visible={healthSummaryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setHealthSummaryModalVisible(false)}
      >
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 max-h-[80%] p-5')}>
            <View style={tw('flex-row items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3 mb-4')}>
              <View style={tw('flex-row items-center flex-1 mr-3')}>
                <HeartPulse color={isDark ? '#818cf8' : '#4f46e5'} size={22} style={tw('mr-2.5')} />
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.ai_health_summary_title', 'AI Health Profile Summary')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setHealthSummaryModalVisible(false)}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw('pb-4')}>
              {loadingHealthSummary ? (
                <View style={tw('gap-3 py-2')}>
                  <Skeleton className="h-4 w-full rounded-lg" />
                  <Skeleton className="h-4 w-5/6 rounded-lg" />
                  <Skeleton className="h-4 w-4/5 rounded-lg" />
                  <Skeleton className="h-4 w-full rounded-lg" />
                </View>
              ) : healthSummaryError ? (
                <View style={tw('py-6 items-center')}>
                  <AlertCircle color="#ef4444" size={28} style={tw('mb-2')} />
                  <Text style={tw('text-sm text-slate-600 dark:text-slate-300 text-center mb-4')}>
                    {healthSummaryError}
                  </Text>
                  <TouchableOpacity
                    onPress={handleOpenHealthSummary}
                    style={tw('bg-indigo-600 px-5 py-2.5 rounded-xl')}
                  >
                    <Text style={tw('text-white font-bold text-sm')}>{t('mobile.retry', 'Retry')}</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <Text style={tw('text-sm leading-6 text-slate-700 dark:text-slate-200')}>
                  {healthSummaryText || t('mobile.ai_health_summary_empty', 'No health summary available yet.')}
                </Text>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
