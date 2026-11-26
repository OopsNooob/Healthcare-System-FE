import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  RefreshControl,
  ScrollView,
  Share,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import QRCode from 'react-native-qrcode-svg';
import Toast from 'react-native-toast-message';
import {
  Activity,
  AlertCircle,
  ArrowLeft,
  Check,
  CheckCircle2,
  HeartHandshake,
  KeyRound,
  MailOpen,
  PauseCircle,
  PlayCircle,
  Plus,
  QrCode,
  RefreshCw,
  Search,
  Settings,
  Share2,
  ShieldCheck,
  Trash2,
  UserPlus,
  Users,
  UserX,
  X,
} from 'lucide-react-native';
import { resolveApiError } from '@healthcare/api-client';
import {
  generateIdempotencyKey,
  mobileApi,
  type FeTypes,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { Skeleton } from '@/components/ui/Skeleton';
import { useThemeContext } from '@/context/ThemeContext';
import { extractApiErrorMessage } from '@/utils/apiError';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';

const RELATIONSHIPS = ['parent', 'child', 'spouse', 'sibling', 'caregiver'] as const;

const METRIC_TYPES: ReadonlyArray<{
  type: FeTypes.FamilySharedMetricType;
  labelKey: string;
}> = [
  { type: 'blood_pressure', labelKey: 'mobile.metric_blood_pressure' },
  { type: 'heart_rate', labelKey: 'mobile.metric_heart_rate' },
  { type: 'blood_glucose', labelKey: 'mobile.metric_blood_glucose' },
  { type: 'oxygen_saturation', labelKey: 'mobile.metric_oxygen_saturation' },
  { type: 'body_temperature', labelKey: 'mobile.metric_body_temperature' },
  { type: 'respiratory_rate', labelKey: 'mobile.metric_respiratory_rate' },
  { type: 'bmi', labelKey: 'mobile.metric_bmi' },
  { type: 'weight', labelKey: 'mobile.metric_weight' },
  { type: 'height', labelKey: 'mobile.metric_height' },
  { type: 'water_intake', labelKey: 'mobile.metric_water_intake' },
  { type: 'kcal_intake', labelKey: 'mobile.metric_kcal_intake' },
];

function extractInvitationTokenFromInput(rawInput: string): {
  invitationToken?: string;
  shortCode?: string;
} {
  const trimmed = rawInput.trim();
  if (!trimmed) return {};
  if (/^\d{6}$/.test(trimmed)) {
    return { shortCode: trimmed };
  }
  const tokenMatch = trimmed.match(/[?&]token=([^&#\s]+)/i);
  if (tokenMatch && tokenMatch[1]) {
    try {
      return { invitationToken: decodeURIComponent(tokenMatch[1]) };
    } catch {
      return { invitationToken: tokenMatch[1] };
    }
  }
  return { invitationToken: trimmed };
}

function normalizeContactsResponse(
  res: FeTypes.SearchFamilyCompanionContactsResponse | undefined,
): FeTypes.FamilyCompanionContactRecord[] {
  if (!res) return [];
  if (Array.isArray(res.data?.items)) return res.data.items;
  if (Array.isArray(res.items)) return res.items;
  return [];
}

function getStatusBadgeClasses(status: FeTypes.FamilyLinkStatus): {
  container: string;
  text: string;
} {
  switch (status) {
    case 'active':
      return {
        container: 'bg-emerald-100 dark:bg-emerald-950/60',
        text: 'text-emerald-700 dark:text-emerald-300',
      };
    case 'paused':
      return {
        container: 'bg-amber-100 dark:bg-amber-950/60',
        text: 'text-amber-700 dark:text-amber-300',
      };
    case 'pending':
      return {
        container: 'bg-sky-100 dark:bg-sky-950/60',
        text: 'text-sky-700 dark:text-sky-300',
      };
    default:
      return {
        container: 'bg-slate-200 dark:bg-slate-800',
        text: 'text-slate-600 dark:text-slate-400',
      };
  }
}

export default function FamilyCompanionScreen() {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ inviteToken?: string; inviteCode?: string }>();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [activeTab, setActiveTab] = useState<'sent' | 'received'>('sent');
  const [links, setLinks] = useState<FeTypes.FamilyLink[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [featureDisabled, setFeatureDisabled] = useState(false);
  const [busyLinkId, setBusyLinkId] = useState<string | null>(null);

  // Ephemeral session-only display labels when creator selected a searched contact
  const [sessionContactLabels, setSessionContactLabels] = useState<Record<string, string>>({});

  // Create Invitation Modal
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [inviteMode, setInviteMode] = useState<'contact' | 'share'>('contact');
  const [contactQuery, setContactQuery] = useState('');
  const [contactResults, setContactResults] = useState<FeTypes.FamilyCompanionContactRecord[]>([]);
  const [searchingContacts, setSearchingContacts] = useState(false);
  const [selectedContact, setSelectedContact] =
    useState<FeTypes.FamilyCompanionContactRecord | null>(null);
  const [relationship, setRelationship] = useState<string>('child');
  const [isCreating, setIsCreating] = useState(false);

  // Reveal-Once Invitation Artifacts Modal
  const [artifactsModalData, setArtifactsModalData] =
    useState<FeTypes.FamilyInvitationArtifacts | null>(null);

  // Redeem Modal
  const [redeemModalVisible, setRedeemModalVisible] = useState(false);
  const [redeemInput, setRedeemInput] = useState('');
  const [isRedeeming, setIsRedeeming] = useState(false);
  const handledDeepLinkKeyRef = useRef<string | null>(null);

  // Accept Pending Invitation Modal
  const [acceptTarget, setAcceptTarget] = useState<FeTypes.FamilyLink | null>(null);
  const [acceptConsent, setAcceptConsent] = useState(false);
  const [acceptPermissions, setAcceptPermissions] = useState<FeTypes.FamilyReminderPermission[]>([
    'missed_task_reminder',
    'weekly_progress',
  ]);
  const [isAccepting, setIsAccepting] = useState(false);

  // Manage Active/Paused Link Modal (Permissions & Health Metric Sharing for Owner)
  const [manageTarget, setManageTarget] = useState<FeTypes.FamilyLink | null>(null);
  const [managePerms, setManagePerms] = useState<FeTypes.FamilyReminderPermission[]>([]);
  const [savingPerms, setSavingPerms] = useState(false);
  const [sharingLoading, setSharingLoading] = useState(false);
  const [sharingSaving, setSharingSaving] = useState(false);
  const [sharingScope, setSharingScope] = useState<'all' | 'selected'>('selected');
  const [sharingTypes, setSharingTypes] = useState<FeTypes.FamilySharedMetricType[]>([
    'blood_pressure',
    'heart_rate',
    'blood_glucose',
  ]);
  const [sharingConsentChecked, setSharingConsentChecked] = useState(false);
  const [activeSharingInfo, setActiveSharingInfo] =
    useState<FeTypes.FamilyHealthMetricSharingResponse['data']['sharing']>(null);

  const actionLockRef = useRef(false);

  const relationshipLabel = (rel?: string) => {
    if (!rel) return t('mobile.rel_caregiver');
    return t(`mobile.rel_${rel}`, rel);
  };

  const statusLabel = (status: FeTypes.FamilyLinkStatus) => {
    return t(`mobile.family_status_${status}`, status);
  };

  const formatDateTime = (iso?: string) => {
    if (!iso) return '—';
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return '—';
    return d.toLocaleDateString(dateLocale, {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const loadLinks = useCallback(
    async (silent = false) => {
      if (!silent) setLoading(true);
      setLoadError(null);
      try {
        const res = await mobileApi.familyLinksList({
          query: { direction: activeTab, page: 1, limit: 50 },
        });
        setFeatureDisabled(false);
        setLinks(Array.isArray(res?.data?.items) ? res.data.items : []);
      } catch (err) {
        const resolved = resolveApiError(err);
        if (resolved?.key === 'FAMILY_COMPANION_DISABLED') {
          setFeatureDisabled(true);
          setLinks([]);
          setLoadError(extractApiErrorMessage(err));
        } else {
          setLoadError(extractApiErrorMessage(err, 'mobile.family_load_failed'));
        }
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [activeTab],
  );

  useFocusEffect(
    useCallback(() => {
      void loadLinks(false);
    }, [loadLinks]),
  );

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadLinks(true);
  }, [loadLinks]);

  // Contact search debounce when creating direct invitation
  useEffect(() => {
    if (!createModalVisible || inviteMode !== 'contact') return;
    const trimmed = contactQuery.trim();
    if (trimmed.length < 2) {
      setContactResults([]);
      setSearchingContacts(false);
      return;
    }

    let cancelled = false;
    setSearchingContacts(true);
    const timer = setTimeout(() => {
      void (async () => {
        try {
          const res = await mobileApi.usersSearchFamilyCompanionContacts({
            query: { search: trimmed, page: 1, limit: 10 },
          });
          if (!cancelled) {
            setContactResults(normalizeContactsResponse(res));
          }
        } catch {
          if (!cancelled) {
            setContactResults([]);
          }
        } finally {
          if (!cancelled) {
            setSearchingContacts(false);
          }
        }
      })();
    }, 350);

    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [contactQuery, createModalVisible, inviteMode]);

  const handleRedeemSubmit = useCallback(
    async (overrideInput?: { invitationToken?: string; shortCode?: string }) => {
      if (isRedeeming || actionLockRef.current) return;
      const body = overrideInput ?? extractInvitationTokenFromInput(redeemInput);
      if (!body.invitationToken && !body.shortCode) {
        Toast.show({
          type: 'error',
          text1: t('mobile.error'),
          text2: t('mobile.family_redeem_input_required'),
        });
        return;
      }

      actionLockRef.current = true;
      setIsRedeeming(true);
      try {
        const res = await mobileApi.familyLinksRedeem({
          headers: { 'Idempotency-Key': generateIdempotencyKey('family-redeem') },
          body,
        });
        const redeemedLink = res?.data;
        setRedeemModalVisible(false);
        setRedeemInput('');
        setActiveTab('received');
        Toast.show({
          type: 'success',
          text1: t('mobile.success'),
          text2: t('mobile.family_redeemed_review_consent'),
        });
        if (redeemedLink && redeemedLink.status === 'pending') {
          setAcceptTarget(redeemedLink);
          setAcceptConsent(false);
          setAcceptPermissions(
            redeemedLink.permissions?.length
              ? redeemedLink.permissions
              : ['missed_task_reminder', 'weekly_progress'],
          );
        }
        await loadLinks(true);
      } catch (err) {
        Toast.show({
          type: 'error',
          text1: t('mobile.error'),
          text2: extractApiErrorMessage(err, 'mobile.family_redeem_failed'),
        });
      } finally {
        actionLockRef.current = false;
        setIsRedeeming(false);
      }
    },
    [isRedeeming, loadLinks, redeemInput, t],
  );

  // Deep-link prefill & redeem trigger (`healthcare://family-links/redeem?token=...`)
  useEffect(() => {
    const tokenParam =
      typeof params.inviteToken === 'string' ? params.inviteToken.trim() : '';
    const codeParam =
      typeof params.inviteCode === 'string' ? params.inviteCode.trim() : '';
    if (!tokenParam && !codeParam) return;
    const key = `${tokenParam}|${codeParam}`;
    if (handledDeepLinkKeyRef.current === key) return;
    handledDeepLinkKeyRef.current = key;

    setRedeemInput(codeParam || tokenParam);
    setRedeemModalVisible(true);
    void handleRedeemSubmit(
      tokenParam ? { invitationToken: tokenParam } : { shortCode: codeParam },
    );
  }, [params.inviteToken, params.inviteCode, handleRedeemSubmit]);

  const handleCreateInvitation = async () => {
    if (isCreating || actionLockRef.current) return;
    if (inviteMode === 'contact' && !selectedContact) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.family_select_contact_required'),
      });
      return;
    }

    actionLockRef.current = true;
    setIsCreating(true);
    try {
      const res = await mobileApi.familyLinksCreate({
        headers: { 'Idempotency-Key': generateIdempotencyKey('family-create') },
        body:
          inviteMode === 'contact' && selectedContact
            ? { contactUserId: selectedContact.id, relationship }
            : { share: true, relationship },
      });

      const createdLink = res?.data?.link;
      if (createdLink && inviteMode === 'contact' && selectedContact) {
        setSessionContactLabels((prev) => ({
          ...prev,
          [createdLink.id]: selectedContact.fullName,
        }));
      }

      setCreateModalVisible(false);
      setContactQuery('');
      setSelectedContact(null);
      setActiveTab('sent');

      const artifacts = res?.data?.artifacts;
      if (artifacts && 'shareLink' in artifacts) {
        setArtifactsModalData(artifacts);
      } else {
        Toast.show({
          type: 'success',
          text1: t('mobile.success'),
          text2: t('mobile.family_invite_created'),
        });
      }

      await loadLinks(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.family_invite_failed'),
      });
    } finally {
      actionLockRef.current = false;
      setIsCreating(false);
    }
  };

  const handleRegenerateArtifacts = async (link: FeTypes.FamilyLink) => {
    if (busyLinkId || actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyLinkId(link.id);
    try {
      const res = await mobileApi.familyLinksRegenerateArtifacts({
        params: { id: link.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('family-regen') },
      });
      const artifacts = res?.data?.artifacts;
      if (artifacts && 'shareLink' in artifacts) {
        setArtifactsModalData(artifacts);
      } else {
        Toast.show({
          type: 'info',
          text1: t('mobile.family_artifacts_replay_title'),
          text2: t('mobile.family_artifacts_replay_desc'),
        });
      }
      await loadLinks(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.family_regenerate_failed'),
      });
    } finally {
      actionLockRef.current = false;
      setBusyLinkId(null);
    }
  };

  const handleShareInvite = async () => {
    if (!artifactsModalData) return;
    try {
      await Share.share({
        message: t('mobile.family_share_message', {
          shortCode: artifactsModalData.shortCode,
          shareLink: artifactsModalData.shareLink,
        }),
      });
    } catch {
      // User dismissed share sheet
    }
  };

  const handleAcceptSubmit = async () => {
    if (!acceptTarget || isAccepting || actionLockRef.current) return;
    if (!acceptConsent) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.family_consent_required'),
      });
      return;
    }

    actionLockRef.current = true;
    setIsAccepting(true);
    try {
      await mobileApi.familyLinksAccept({
        params: { id: acceptTarget.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('family-accept') },
        body: {
          consentVersion: 'family-consent.v1',
          permissions: acceptPermissions,
        },
      });
      setAcceptTarget(null);
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.family_invite_accepted'),
      });
      await loadLinks(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.family_accept_failed'),
      });
    } finally {
      actionLockRef.current = false;
      setIsAccepting(false);
    }
  };

  const performLinkAction = async (
    link: FeTypes.FamilyLink,
    action: 'decline' | 'pause' | 'resume' | 'revoke',
  ) => {
    if (busyLinkId || actionLockRef.current) return;
    actionLockRef.current = true;
    setBusyLinkId(link.id);
    try {
      await mobileApi.familyLinksAction({
        params: { id: link.id, action },
        headers: { 'Idempotency-Key': generateIdempotencyKey(`family-${action}`) },
        body: {},
      });
      if (manageTarget?.id === link.id) {
        setManageTarget(null);
      }
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t(`mobile.family_action_${action}_done`),
      });
      await loadLinks(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      actionLockRef.current = false;
      setBusyLinkId(null);
    }
  };

  const confirmLinkAction = (
    link: FeTypes.FamilyLink,
    action: 'decline' | 'revoke',
  ) => {
    Alert.alert(
      t(`mobile.family_confirm_${action}_title`),
      t(`mobile.family_confirm_${action}_desc`),
      [
        { text: t('mobile.cancel'), style: 'cancel' },
        {
          text: t('mobile.confirm'),
          style: 'destructive',
          onPress: () => void performLinkAction(link, action),
        },
      ],
    );
  };

  const loadSharingConfig = useCallback(async (linkId: string) => {
    setSharingLoading(true);
    try {
      const res = await mobileApi.familyLinksGetHealthMetricSharing({
        params: { id: linkId },
      });
      const sharing = res?.data?.sharing ?? null;
      setActiveSharingInfo(sharing);
      if (sharing) {
        setSharingScope(sharing.scope);
        setSharingTypes(
          sharing.scope === 'selected' && sharing.metricTypes.length > 0
            ? sharing.metricTypes
            : ['blood_pressure', 'heart_rate', 'blood_glucose'],
        );
        setSharingConsentChecked(true);
      } else {
        setSharingConsentChecked(false);
      }
    } catch {
      setActiveSharingInfo(null);
    } finally {
      setSharingLoading(false);
    }
  }, []);

  const openManageModal = (link: FeTypes.FamilyLink) => {
    setManageTarget(link);
    setManagePerms(link.permissions ?? []);
    setActiveSharingInfo(null);
    if (link.status === 'active') {
      void loadSharingConfig(link.id);
    }
  };

  const handleSaveReminderPermissions = async () => {
    if (!manageTarget || savingPerms || actionLockRef.current) return;
    actionLockRef.current = true;
    setSavingPerms(true);
    try {
      const res = await mobileApi.familyLinksUpdatePermissions({
        params: { id: manageTarget.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('family-perms') },
        body: {
          permissions: managePerms,
          policyVersion: 'family-reminders.v1',
        },
      });
      if (res?.data) {
        setManageTarget(res.data);
      }
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.family_permissions_saved'),
      });
      await loadLinks(true);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      actionLockRef.current = false;
      setSavingPerms(false);
    }
  };

  const handleSaveHealthMetricSharing = async () => {
    if (!manageTarget || sharingSaving || actionLockRef.current) return;
    if (!sharingConsentChecked) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.family_sharing_consent_required'),
      });
      return;
    }
    if (sharingScope === 'selected' && sharingTypes.length === 0) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.family_sharing_select_metric_required'),
      });
      return;
    }

    actionLockRef.current = true;
    setSharingSaving(true);
    try {
      const body: FeTypes.FamilyHealthMetricSharingRequest =
        sharingScope === 'all'
          ? { scope: 'all', consentVersion: 'family-health-metric-sharing.v1' }
          : {
              scope: 'selected',
              metricTypes: sharingTypes,
              consentVersion: 'family-health-metric-sharing.v1',
            };
      await mobileApi.familyLinksUpsertHealthMetricSharing({
        params: { id: manageTarget.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('family-share-save') },
        body,
      });
      await loadSharingConfig(manageTarget.id);
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.family_sharing_saved'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      actionLockRef.current = false;
      setSharingSaving(false);
    }
  };

  const handleRevokeHealthMetricSharing = async () => {
    if (!manageTarget || sharingSaving || actionLockRef.current) return;
    actionLockRef.current = true;
    setSharingSaving(true);
    try {
      await mobileApi.familyLinksRevokeHealthMetricSharing({
        params: { id: manageTarget.id },
        headers: { 'Idempotency-Key': generateIdempotencyKey('family-share-revoke') },
      });
      await loadSharingConfig(manageTarget.id);
      Toast.show({
        type: 'success',
        text1: t('mobile.success'),
        text2: t('mobile.family_sharing_revoked'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      actionLockRef.current = false;
      setSharingSaving(false);
    }
  };

  const togglePermission = (
    list: FeTypes.FamilyReminderPermission[],
    perm: FeTypes.FamilyReminderPermission,
  ): FeTypes.FamilyReminderPermission[] =>
    list.includes(perm) ? list.filter((p) => p !== perm) : [...list, perm];

  const toggleMetricType = (metric: FeTypes.FamilySharedMetricType) => {
    setSharingTypes((prev) =>
      prev.includes(metric) ? prev.filter((m) => m !== metric) : [...prev, metric],
    );
  };

  const displayedLinks = useMemo(() => links, [links]);

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')} edges={['top']}>
      {/* Header */}
      <View
        style={tw(
          'px-5 pt-4 pb-4 bg-white dark:bg-slate-900 border-b border-slate-100 dark:border-slate-800',
        )}
      >
        <View style={tw('flex-row items-center justify-between')}>
          <View style={tw('flex-row items-center flex-1 mr-3')}>
            <TouchableOpacity
              onPress={() => router.back('/(patient)/profile')}
              style={tw(
                'w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center mr-3',
              )}
            >
              <ArrowLeft color={twInstance.color('text-slate-700 dark:text-slate-200')} size={20} />
            </TouchableOpacity>
            <View style={tw('flex-1')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.family_companion_title')}
              </Text>
              <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                {t('mobile.family_companion_subtitle')}
              </Text>
            </View>
          </View>

          {!featureDisabled ? (
            <View style={tw('flex-row items-center gap-2')}>
              <TouchableOpacity
                onPress={() => {
                  setRedeemInput('');
                  setRedeemModalVisible(true);
                }}
                style={tw(
                  'w-10 h-10 bg-slate-100 dark:bg-slate-800 rounded-full items-center justify-center',
                )}
              >
                <KeyRound color={twInstance.color('text-slate-700 dark:text-slate-200')} size={18} />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setCreateModalVisible(true)}
                style={tw('w-10 h-10 bg-brand rounded-full items-center justify-center shadow-sm')}
              >
                <Plus color="#0f172a" size={20} />
              </TouchableOpacity>
            </View>
          ) : null}
        </View>

        {/* Direction Tabs */}
        <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mt-4')}>
          {(['sent', 'received'] as const).map((tabKey) => {
            const active = activeTab === tabKey;
            return (
              <TouchableOpacity
                key={tabKey}
                onPress={() => setActiveTab(tabKey)}
                style={tw(
                  `flex-1 py-2.5 rounded-xl items-center ${
                    active ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                  }`,
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-bold ${
                      active
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`,
                  )}
                >
                  {tabKey === 'sent'
                    ? t('mobile.family_tab_sent')
                    : t('mobile.family_tab_received')}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <ScrollView
        contentContainerStyle={tw('p-5 pb-24 gap-4')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#10b981" />
        }
      >
        {loading ? (
          <View style={tw('gap-3')}>
            {[1, 2, 3].map((i) => (
              <View
                key={i}
                style={tw(
                  'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 gap-3',
                )}
              >
                <View style={tw('flex-row justify-between items-center')}>
                  <Skeleton className="h-5 w-36 rounded-lg" />
                  <Skeleton className="h-5 w-20 rounded-full" />
                </View>
                <Skeleton className="h-3.5 w-48 rounded-lg" />
                <Skeleton className="h-10 w-full rounded-xl" />
              </View>
            ))}
          </View>
        ) : loadError ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 items-center',
            )}
          >
            <AlertCircle color="#ef4444" size={34} />
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white mt-3 text-center')}>
              {featureDisabled
                ? t('mobile.family_disabled_title')
                : t('mobile.family_load_failed')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1 text-center leading-5')}>
              {loadError}
            </Text>
            {!featureDisabled ? (
              <TouchableOpacity
                onPress={() => void loadLinks(false)}
                style={tw('mt-4 bg-brand px-5 py-2.5 rounded-full flex-row items-center')}
              >
                <RefreshCw size={14} color="#0f172a" />
                <Text style={tw('text-slate-900 font-bold text-xs ml-1.5')}>
                  {t('mobile.retry')}
                </Text>
              </TouchableOpacity>
            ) : null}
          </View>
        ) : displayedLinks.length === 0 ? (
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-3xl p-7 border border-slate-200 dark:border-slate-800 items-center',
            )}
          >
            <View
              style={tw(
                'w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center mb-3',
              )}
            >
              <Users color={isDark ? '#34d399' : '#10b981'} size={28} />
            </View>
            <Text style={tw('text-base font-bold text-slate-900 dark:text-white text-center')}>
              {activeTab === 'sent'
                ? t('mobile.family_empty_sent_title')
                : t('mobile.family_empty_received_title')}
            </Text>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1.5 text-center leading-5')}>
              {activeTab === 'sent'
                ? t('mobile.family_empty_sent_desc')
                : t('mobile.family_empty_received_desc')}
            </Text>
            <TouchableOpacity
              onPress={() =>
                activeTab === 'sent' ? setCreateModalVisible(true) : setRedeemModalVisible(true)
              }
              style={tw('mt-5 bg-brand px-5 py-3 rounded-2xl flex-row items-center')}
            >
              {activeTab === 'sent' ? (
                <UserPlus size={16} color="#0f172a" />
              ) : (
                <KeyRound size={16} color="#0f172a" />
              )}
              <Text style={tw('text-slate-900 font-bold text-xs ml-2')}>
                {activeTab === 'sent'
                  ? t('mobile.family_invite_cta')
                  : t('mobile.family_redeem_cta')}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          displayedLinks.map((link) => {
            const badge = getStatusBadgeClasses(link.status);
            const isBusy = busyLinkId === link.id;
            const label =
              sessionContactLabels[link.id] ||
              `${relationshipLabel(link.relationship)} • #${link.id.slice(-6)}`;

            return (
              <View
                key={link.id}
                style={tw(
                  'bg-white dark:bg-slate-900 rounded-2xl p-4 border border-slate-200 dark:border-slate-800 shadow-sm gap-3',
                )}
              >
                <View style={tw('flex-row items-start justify-between gap-2')}>
                  <View style={tw('flex-row items-center flex-1')}>
                    <View
                      style={tw(
                        'w-11 h-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 items-center justify-center mr-3',
                      )}
                    >
                      <HeartHandshake color={isDark ? '#818cf8' : '#4f46e5'} size={20} />
                    </View>
                    <View style={tw('flex-1')}>
                      <Text
                        numberOfLines={1}
                        style={tw('text-sm font-bold text-slate-900 dark:text-white')}
                      >
                        {label}
                      </Text>
                      <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                        {relationshipLabel(link.relationship)} •{' '}
                        {link.invitationDelivery === 'shared_link'
                          ? t('mobile.family_delivery_shared_link')
                          : t('mobile.family_delivery_selected_contact')}
                      </Text>
                    </View>
                  </View>
                  <View style={tw(`px-2.5 py-1 rounded-full ${badge.container}`)}>
                    <Text style={tw(`text-[11px] font-bold ${badge.text}`)}>
                      {statusLabel(link.status)}
                    </Text>
                  </View>
                </View>

                <View style={tw('flex-row flex-wrap gap-2')}>
                  {(link.permissions ?? []).map((perm) => (
                    <View
                      key={perm}
                      style={tw(
                        'px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200/70 dark:border-slate-700',
                      )}
                    >
                      <Text style={tw('text-[11px] font-medium text-slate-700 dark:text-slate-300')}>
                        {t(`mobile.family_perm_${perm}`, perm)}
                      </Text>
                    </View>
                  ))}
                  {link.status === 'pending' && (
                    <Text style={tw('text-[11px] text-slate-400 dark:text-slate-500 self-center')}>
                      {t('mobile.family_expires_on')}: {formatDateTime(link.invitationExpiresAt)}
                    </Text>
                  )}
                </View>

                {/* Action buttons per direction & status */}
                <View style={tw('flex-row flex-wrap gap-2 pt-1 border-t border-slate-100 dark:border-slate-800')}>
                  {activeTab === 'sent' && link.status === 'pending' ? (
                    <>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => void handleRegenerateArtifacts(link)}
                        style={tw(
                          'flex-1 py-2.5 px-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 flex-row items-center justify-center',
                        )}
                      >
                        {isBusy ? (
                          <ActivityIndicator size="small" color="#6366f1" />
                        ) : (
                          <>
                            <QrCode size={15} color={isDark ? '#a5b4fc' : '#4f46e5'} />
                            <Text style={tw('text-xs font-bold text-indigo-700 dark:text-indigo-300 ml-1.5')}>
                              {t('mobile.family_regenerate_qr')}
                            </Text>
                          </>
                        )}
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => confirmLinkAction(link, 'revoke')}
                        style={tw(
                          'py-2.5 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex-row items-center justify-center',
                        )}
                      >
                        <UserX size={15} color="#ef4444" />
                        <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400 ml-1.5')}>
                          {t('mobile.family_revoke_btn')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {activeTab === 'sent' && (link.status === 'active' || link.status === 'paused') ? (
                    <TouchableOpacity
                      disabled={isBusy}
                      onPress={() => openManageModal(link)}
                      style={tw(
                        'flex-1 py-2.5 px-3 rounded-xl bg-slate-100 dark:bg-slate-800 flex-row items-center justify-center',
                      )}
                    >
                      <Settings size={15} color={twInstance.color('text-slate-700 dark:text-slate-200')} />
                      <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-100 ml-1.5')}>
                        {t('mobile.family_manage_connection')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}

                  {activeTab === 'received' && link.status === 'pending' ? (
                    <>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => {
                          setAcceptTarget(link);
                          setAcceptConsent(false);
                          setAcceptPermissions(
                            link.permissions?.length
                              ? link.permissions
                              : ['missed_task_reminder', 'weekly_progress'],
                          );
                        }}
                        style={tw('flex-1 py-2.5 px-3 rounded-xl bg-brand flex-row items-center justify-center')}
                      >
                        <CheckCircle2 size={15} color="#0f172a" />
                        <Text style={tw('text-xs font-bold text-slate-900 ml-1.5')}>
                          {t('mobile.family_accept_btn')}
                        </Text>
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() => confirmLinkAction(link, 'decline')}
                        style={tw(
                          'py-2.5 px-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex-row items-center justify-center',
                        )}
                      >
                        <UserX size={15} color="#ef4444" />
                        <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400 ml-1.5')}>
                          {t('mobile.family_decline_btn')}
                        </Text>
                      </TouchableOpacity>
                    </>
                  ) : null}

                  {activeTab === 'received' && (link.status === 'active' || link.status === 'paused') ? (
                    <>
                      <TouchableOpacity
                        disabled={isBusy}
                        onPress={() =>
                          router.push({
                            pathname: '/(patient)/family-metrics',
                            params: {
                              linkId: link.id,
                              relationship: link.relationship ?? '',
                              patientId: link.patientId,
                            },
                          })
                        }
                        style={tw(
                          'flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200/70 dark:border-emerald-800/50 flex-row items-center justify-center',
                        )}
                      >
                        <Activity size={15} color={isDark ? '#34d399' : '#059669'} />
                        <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1.5')}>
                          {t('mobile.family_view_shared_metrics')}
                        </Text>
                      </TouchableOpacity>

                      {link.allowedActions.includes('pause') ? (
                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() => void performLinkAction(link, 'pause')}
                          style={tw('py-2.5 px-3 rounded-xl bg-amber-50 dark:bg-amber-950/40 items-center justify-center')}
                        >
                          <PauseCircle size={16} color="#d97706" />
                        </TouchableOpacity>
                      ) : null}
                      {link.allowedActions.includes('resume') ? (
                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() => void performLinkAction(link, 'resume')}
                          style={tw('py-2.5 px-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 items-center justify-center')}
                        >
                          <PlayCircle size={16} color="#10b981" />
                        </TouchableOpacity>
                      ) : null}
                      {link.allowedActions.includes('revoke') ? (
                        <TouchableOpacity
                          disabled={isBusy}
                          onPress={() => confirmLinkAction(link, 'revoke')}
                          style={tw('py-2.5 px-3 rounded-xl bg-rose-50 dark:bg-rose-950/40 items-center justify-center')}
                        >
                          <Trash2 size={16} color="#ef4444" />
                        </TouchableOpacity>
                      ) : null}
                    </>
                  ) : null}
                </View>
              </View>
            );
          })
        )}
      </ScrollView>

      {/* Create Invitation Modal */}
      <Modal
        visible={createModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isCreating && setCreateModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[88%] border-t border-slate-200 dark:border-slate-800 p-5',
            )}
          >
            <View style={tw('flex-row items-center justify-between mb-4')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.family_invite_modal_title')}
              </Text>
              <TouchableOpacity
                disabled={isCreating}
                onPress={() => setCreateModalVisible(false)}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={18} />
              </TouchableOpacity>
            </View>

            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-xl mb-4')}>
                {(['contact', 'share'] as const).map((m) => {
                  const active = inviteMode === m;
                  return (
                    <TouchableOpacity
                      key={m}
                      disabled={isCreating}
                      onPress={() => setInviteMode(m)}
                      style={tw(
                        `flex-1 py-2 rounded-lg items-center ${
                          active ? 'bg-white dark:bg-slate-900 shadow-sm' : ''
                        }`,
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            active ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'
                          }`,
                        )}
                      >
                        {m === 'contact'
                          ? t('mobile.family_mode_search_contact')
                          : t('mobile.family_mode_share_qr')}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {inviteMode === 'contact' ? (
                <View style={tw('mb-4')}>
                  <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300 mb-1.5')}>
                    {t('mobile.family_search_contact_label')}
                  </Text>
                  <View
                    style={tw(
                      'flex-row items-center bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3.5 py-2.5',
                    )}
                  >
                    <Search size={16} color="#94a3b8" />
                    <TextInput
                      value={contactQuery}
                      onChangeText={(txt) => {
                        setContactQuery(txt);
                        if (selectedContact && txt !== selectedContact.fullName) {
                          setSelectedContact(null);
                        }
                      }}
                      placeholder={t('mobile.family_search_contact_placeholder')}
                      placeholderTextColor="#94a3b8"
                      style={tw('flex-1 ml-2.5 text-sm text-slate-900 dark:text-white')}
                    />
                  </View>

                  {searchingContacts ? (
                    <View style={tw('gap-2 mt-2.5')}>
                      <Skeleton className="h-12 w-full rounded-xl" />
                      <Skeleton className="h-12 w-full rounded-xl" />
                    </View>
                  ) : contactResults.length > 0 ? (
                    <View style={tw('gap-2 mt-2.5')}>
                      {contactResults.map((c) => {
                        const isSelected = selectedContact?.id === c.id;
                        return (
                          <TouchableOpacity
                            key={c.id}
                            onPress={() => setSelectedContact(c)}
                            style={tw(
                              `p-3 rounded-xl border flex-row items-center justify-between ${
                                isSelected
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-500'
                                  : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                              }`,
                            )}
                          >
                            <View style={tw('flex-1 mr-2')}>
                              <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                                {c.fullName}
                              </Text>
                              <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                                {c.email || c.phoneNumber || `#${c.id.slice(-6)}`}
                              </Text>
                            </View>
                            {isSelected ? <Check size={16} color="#10b981" /> : null}
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  ) : contactQuery.trim().length >= 2 ? (
                    <Text style={tw('text-xs text-slate-400 dark:text-slate-500 mt-2')}>
                      {t('mobile.family_no_contacts_found')}
                    </Text>
                  ) : null}
                </View>
              ) : (
                <View
                  style={tw(
                    'mb-4 p-3.5 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-200 dark:border-indigo-800/50',
                  )}
                >
                  <Text style={tw('text-xs text-indigo-800 dark:text-indigo-200 leading-5')}>
                    {t('mobile.family_share_mode_hint')}
                  </Text>
                </View>
              )}

              <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300 mb-2')}>
                {t('mobile.family_relationship_label')}
              </Text>
              <View style={tw('flex-row flex-wrap gap-2 mb-5')}>
                {RELATIONSHIPS.map((rel) => {
                  const active = relationship === rel;
                  return (
                    <TouchableOpacity
                      key={rel}
                      onPress={() => setRelationship(rel)}
                      style={tw(
                        `px-3.5 py-2 rounded-xl border ${
                          active
                            ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                            : 'bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800'
                        }`,
                      )}
                    >
                      <Text
                        style={tw(
                          `text-xs font-bold ${
                            active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                          }`,
                        )}
                      >
                        {relationshipLabel(rel)}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              <TouchableOpacity
                disabled={isCreating}
                onPress={() => void handleCreateInvitation()}
                style={tw(
                  `h-12 rounded-2xl bg-brand items-center justify-center flex-row ${
                    isCreating ? 'opacity-60' : ''
                  }`,
                )}
              >
                {isCreating ? (
                  <ActivityIndicator size="small" color="#0f172a" />
                ) : (
                  <Text style={tw('font-bold text-slate-900 text-sm')}>
                    {inviteMode === 'contact'
                      ? t('mobile.family_send_invite_btn')
                      : t('mobile.family_generate_qr_btn')}
                  </Text>
                )}
              </TouchableOpacity>
            </ScrollView>
            <AppModalToast visible={createModalVisible} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Reveal-Once QR & Short Code Modal */}
      <Modal
        visible={Boolean(artifactsModalData)}
        transparent
        animationType="fade"
        onRequestClose={() => setArtifactsModalData(null)}
      >
        <View style={tw('flex-1 justify-center items-center bg-black/65 px-5')}>
          <View
            style={tw(
              'w-full max-w-sm bg-white dark:bg-slate-900 rounded-3xl p-6 border border-slate-200 dark:border-slate-800 items-center',
            )}
          >
            <Text style={tw('text-lg font-bold text-slate-900 dark:text-white text-center')}>
              {t('mobile.family_artifacts_title')}
            </Text>
            <Text style={tw('text-xs text-amber-600 dark:text-amber-400 mt-1 text-center leading-4')}>
              {t('mobile.family_artifacts_reveal_once_warn')}
            </Text>

            {artifactsModalData ? (
              <>
                <View style={tw('bg-white p-4 rounded-2xl border border-slate-200 my-5')}>
                  <QRCode value={artifactsModalData.qrPayload} size={180} />
                </View>

                <View
                  style={tw(
                    'w-full bg-slate-50 dark:bg-slate-950 rounded-2xl p-3.5 border border-slate-200 dark:border-slate-800 items-center mb-4',
                  )}
                >
                  <Text style={tw('text-[11px] uppercase tracking-wider text-slate-400 font-bold')}>
                    {t('mobile.family_short_code_label')}
                  </Text>
                  <Text style={tw('text-2xl font-black tracking-widest text-slate-900 dark:text-white mt-1')}>
                    {artifactsModalData.shortCode}
                  </Text>
                  <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-1')}>
                    {t('mobile.family_expires_on')}:{' '}
                    {formatDateTime(artifactsModalData.shortCodeExpiresAt)}
                  </Text>
                </View>

                <View style={tw('flex-row gap-3 w-full')}>
                  <TouchableOpacity
                    onPress={() => setArtifactsModalData(null)}
                    style={tw('flex-1 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center')}
                  >
                    <Text style={tw('font-bold text-slate-700 dark:text-slate-300 text-xs')}>
                      {t('mobile.close')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => void handleShareInvite()}
                    style={tw('flex-1 py-3 rounded-xl bg-brand flex-row items-center justify-center')}
                  >
                    <Share2 size={15} color="#0f172a" />
                    <Text style={tw('font-bold text-slate-900 text-xs ml-1.5')}>
                      {t('mobile.family_share_btn')}
                    </Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </Modal>

      {/* Redeem Invitation Modal */}
      <Modal
        visible={redeemModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => !isRedeeming && setRedeemModalVisible(false)}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={tw('flex-1 justify-end bg-black/60')}
        >
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5',
            )}
          >
            <View style={tw('flex-row items-center justify-between mb-3')}>
              <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                {t('mobile.family_redeem_modal_title')}
              </Text>
              <TouchableOpacity
                disabled={isRedeeming}
                onPress={() => setRedeemModalVisible(false)}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={18} />
              </TouchableOpacity>
            </View>
            <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mb-3')}>
              {t('mobile.family_redeem_modal_desc')}
            </Text>
            <TextInput
              value={redeemInput}
              onChangeText={setRedeemInput}
              editable={!isRedeeming}
              autoCapitalize="none"
              placeholder={t('mobile.family_redeem_placeholder')}
              placeholderTextColor="#94a3b8"
              style={tw(
                'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl px-4 py-3.5 text-sm text-slate-900 dark:text-white mb-4',
              )}
            />
            <TouchableOpacity
              disabled={isRedeeming}
              onPress={() => void handleRedeemSubmit()}
              style={tw(
                `h-12 rounded-2xl bg-brand items-center justify-center ${
                  isRedeeming ? 'opacity-60' : ''
                }`,
              )}
            >
              {isRedeeming ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={tw('font-bold text-slate-900 text-sm')}>
                  {t('mobile.family_redeem_submit_btn')}
                </Text>
              )}
            </TouchableOpacity>
            <AppModalToast visible={redeemModalVisible} />
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Accept Invitation & Consent Modal */}
      <Modal
        visible={Boolean(acceptTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => !isAccepting && setAcceptTarget(null)}
      >
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl border-t border-slate-200 dark:border-slate-800 p-5 gap-4',
            )}
          >
            <View style={tw('flex-row items-center justify-between')}>
              <View style={tw('flex-row items-center')}>
                <MailOpen size={20} color={isDark ? '#34d399' : '#10b981'} />
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white ml-2')}>
                  {t('mobile.family_accept_modal_title')}
                </Text>
              </View>
              <TouchableOpacity
                disabled={isAccepting}
                onPress={() => setAcceptTarget(null)}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={18} />
              </TouchableOpacity>
            </View>

            <View style={tw('gap-2.5')}>
              {(['missed_task_reminder', 'weekly_progress'] as const).map((perm) => (
                <View
                  key={perm}
                  style={tw(
                    'flex-row items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800',
                  )}
                >
                  <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 mr-3')}>
                    {t(`mobile.family_perm_${perm}`, perm)}
                  </Text>
                  <Switch
                    value={acceptPermissions.includes(perm)}
                    disabled={isAccepting}
                    onValueChange={() =>
                      setAcceptPermissions((prev) => togglePermission(prev, perm))
                    }
                    trackColor={{ false: '#cbd5e1', true: '#34d399' }}
                    thumbColor="#ffffff"
                  />
                </View>
              ))}
            </View>

            <TouchableOpacity
              disabled={isAccepting}
              onPress={() => setAcceptConsent((v) => !v)}
              style={tw(
                'flex-row items-start p-3.5 rounded-2xl bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-800/50',
              )}
            >
              <View
                style={tw(
                  `w-5 h-5 rounded border items-center justify-center mt-0.5 mr-3 ${
                    acceptConsent
                      ? 'bg-emerald-500 border-emerald-500'
                      : 'border-slate-300 dark:border-slate-600'
                  }`,
                )}
              >
                {acceptConsent ? <Check size={12} color="#ffffff" /> : null}
              </View>
              <Text style={tw('text-xs text-slate-700 dark:text-slate-200 flex-1 leading-5')}>
                {t('mobile.family_consent_checkbox')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              disabled={isAccepting}
              onPress={() => void handleAcceptSubmit()}
              style={tw(
                `h-12 rounded-2xl bg-brand items-center justify-center ${
                  isAccepting ? 'opacity-60' : ''
                }`,
              )}
            >
              {isAccepting ? (
                <ActivityIndicator size="small" color="#0f172a" />
              ) : (
                <Text style={tw('font-bold text-slate-900 text-sm')}>
                  {t('mobile.family_confirm_accept_btn')}
                </Text>
              )}
            </TouchableOpacity>
            <AppModalToast visible={Boolean(acceptTarget)} />
          </View>
        </View>
      </Modal>

      {/* Manage Sent Connection Modal (Permissions + Metric Sharing + Lifecycle) */}
      <Modal
        visible={Boolean(manageTarget)}
        transparent
        animationType="slide"
        onRequestClose={() => !savingPerms && !sharingSaving && setManageTarget(null)}
      >
        <View style={tw('flex-1 justify-end bg-black/60')}>
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl max-h-[90%] border-t border-slate-200 dark:border-slate-800 p-5',
            )}
          >
            <View style={tw('flex-row items-center justify-between mb-4')}>
              <View style={tw('flex-row items-center')}>
                <ShieldCheck size={20} color="#10b981" />
                <Text style={tw('text-lg font-bold text-slate-900 dark:text-white ml-2')}>
                  {t('mobile.family_manage_connection')}
                </Text>
              </View>
              <TouchableOpacity
                disabled={savingPerms || sharingSaving}
                onPress={() => setManageTarget(null)}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={18} />
              </TouchableOpacity>
            </View>

            {manageTarget ? (
              <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={tw('gap-4 pb-4')}>
                {/* Reminder Permissions */}
                <View style={tw('gap-2.5')}>
                  <Text style={tw('text-xs font-bold uppercase text-slate-400')}>
                    {t('mobile.family_reminder_permissions_title')}
                  </Text>
                  {(['missed_task_reminder', 'weekly_progress'] as const).map((perm) => (
                    <View
                      key={perm}
                      style={tw(
                        'flex-row items-center justify-between p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800',
                      )}
                    >
                      <Text style={tw('text-xs font-semibold text-slate-800 dark:text-slate-200 flex-1 mr-3')}>
                        {t(`mobile.family_perm_${perm}`, perm)}
                      </Text>
                      <Switch
                        value={managePerms.includes(perm)}
                        disabled={savingPerms}
                        onValueChange={() => setManagePerms((prev) => togglePermission(prev, perm))}
                        trackColor={{ false: '#cbd5e1', true: '#34d399' }}
                        thumbColor="#ffffff"
                      />
                    </View>
                  ))}
                  <TouchableOpacity
                    disabled={savingPerms}
                    onPress={() => void handleSaveReminderPermissions()}
                    style={tw('h-11 rounded-xl bg-slate-900 dark:bg-brand items-center justify-center')}
                  >
                    {savingPerms ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <Text style={tw('text-xs font-bold text-white dark:text-slate-900')}>
                        {t('mobile.family_save_permissions')}
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>

                {/* Health Metric Sharing Management (active links) */}
                {manageTarget.status === 'active' ? (
                  <View
                    style={tw(
                      'gap-3 p-4 rounded-2xl bg-emerald-50/50 dark:bg-emerald-950/20 border border-emerald-200/70 dark:border-emerald-800/50',
                    )}
                  >
                    <View style={tw('flex-row items-center justify-between')}>
                      <Text style={tw('text-xs font-bold uppercase text-emerald-800 dark:text-emerald-300')}>
                        {t('mobile.family_metric_sharing_title')}
                      </Text>
                      <View
                        style={tw(
                          `px-2 py-0.5 rounded-full ${
                            activeSharingInfo
                              ? 'bg-emerald-200 dark:bg-emerald-900'
                              : 'bg-slate-200 dark:bg-slate-800'
                          }`,
                        )}
                      >
                        <Text style={tw('text-[10px] font-bold text-slate-800 dark:text-slate-200')}>
                          {activeSharingInfo
                            ? t('mobile.family_sharing_active')
                            : t('mobile.family_sharing_inactive')}
                        </Text>
                      </View>
                    </View>

                    {sharingLoading ? (
                      <Skeleton className="h-24 w-full rounded-xl" />
                    ) : (
                      <>
                        <View style={tw('flex-row bg-white dark:bg-slate-900 p-1 rounded-xl')}>
                          {(['selected', 'all'] as const).map((sc) => {
                            const active = sharingScope === sc;
                            return (
                              <TouchableOpacity
                                key={sc}
                                onPress={() => setSharingScope(sc)}
                                style={tw(
                                  `flex-1 py-2 rounded-lg items-center ${
                                    active ? 'bg-emerald-600' : ''
                                  }`,
                                )}
                              >
                                <Text
                                  style={tw(
                                    `text-xs font-bold ${
                                      active ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                                    }`,
                                  )}
                                >
                                  {sc === 'all'
                                    ? t('mobile.family_scope_all')
                                    : t('mobile.family_scope_selected')}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>

                        {sharingScope === 'selected' ? (
                          <View style={tw('flex-row flex-wrap gap-2')}>
                            {METRIC_TYPES.map((m) => {
                              const picked = sharingTypes.includes(m.type);
                              return (
                                <TouchableOpacity
                                  key={m.type}
                                  onPress={() => toggleMetricType(m.type)}
                                  style={tw(
                                    `px-3 py-1.5 rounded-full border ${
                                      picked
                                        ? 'bg-emerald-600 border-emerald-600'
                                        : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700'
                                    }`,
                                  )}
                                >
                                  <Text
                                    style={tw(
                                      `text-[11px] font-semibold ${
                                        picked ? 'text-white' : 'text-slate-600 dark:text-slate-300'
                                      }`,
                                    )}
                                  >
                                    {t(m.labelKey, m.type)}
                                  </Text>
                                </TouchableOpacity>
                              );
                            })}
                          </View>
                        ) : null}

                        <TouchableOpacity
                          onPress={() => setSharingConsentChecked((v) => !v)}
                          style={tw('flex-row items-start pt-1')}
                        >
                          <View
                            style={tw(
                              `w-5 h-5 rounded border items-center justify-center mr-2.5 mt-0.5 ${
                                sharingConsentChecked
                                  ? 'bg-emerald-600 border-emerald-600'
                                  : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-900'
                              }`,
                            )}
                          >
                            {sharingConsentChecked ? <Check size={12} color="#ffffff" /> : null}
                          </View>
                          <Text style={tw('text-xs text-slate-700 dark:text-slate-300 flex-1 leading-4')}>
                            {t('mobile.family_sharing_consent_checkbox')}
                          </Text>
                        </TouchableOpacity>

                        <View style={tw('flex-row gap-2')}>
                          <TouchableOpacity
                            disabled={sharingSaving}
                            onPress={() => void handleSaveHealthMetricSharing()}
                            style={tw(
                              'flex-1 h-11 rounded-xl bg-emerald-600 items-center justify-center',
                            )}
                          >
                            {sharingSaving ? (
                              <ActivityIndicator size="small" color="#ffffff" />
                            ) : (
                              <Text style={tw('text-xs font-bold text-white')}>
                                {t('mobile.family_sharing_save_btn')}
                              </Text>
                            )}
                          </TouchableOpacity>
                          {activeSharingInfo ? (
                            <TouchableOpacity
                              disabled={sharingSaving}
                              onPress={() => void handleRevokeHealthMetricSharing()}
                              style={tw(
                                'px-4 h-11 rounded-xl bg-rose-100 dark:bg-rose-950/50 items-center justify-center',
                              )}
                            >
                              <Text style={tw('text-xs font-bold text-rose-700 dark:text-rose-300')}>
                                {t('mobile.family_sharing_revoke_btn')}
                              </Text>
                            </TouchableOpacity>
                          ) : null}
                        </View>
                      </>
                    )}
                  </View>
                ) : null}

                {/* Lifecycle Actions */}
                <View style={tw('flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800')}>
                  {manageTarget.allowedActions.includes('pause') ? (
                    <TouchableOpacity
                      disabled={busyLinkId === manageTarget.id}
                      onPress={() => void performLinkAction(manageTarget, 'pause')}
                      style={tw(
                        'flex-1 h-11 rounded-xl bg-amber-50 dark:bg-amber-950/40 flex-row items-center justify-center',
                      )}
                    >
                      <PauseCircle size={16} color="#d97706" />
                      <Text style={tw('text-xs font-bold text-amber-700 dark:text-amber-300 ml-1.5')}>
                        {t('mobile.family_pause_btn')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {manageTarget.allowedActions.includes('resume') ? (
                    <TouchableOpacity
                      disabled={busyLinkId === manageTarget.id}
                      onPress={() => void performLinkAction(manageTarget, 'resume')}
                      style={tw(
                        'flex-1 h-11 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 flex-row items-center justify-center',
                      )}
                    >
                      <PlayCircle size={16} color="#10b981" />
                      <Text style={tw('text-xs font-bold text-emerald-700 dark:text-emerald-300 ml-1.5')}>
                        {t('mobile.family_resume_btn')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                  {manageTarget.allowedActions.includes('revoke') ? (
                    <TouchableOpacity
                      disabled={busyLinkId === manageTarget.id}
                      onPress={() => confirmLinkAction(manageTarget, 'revoke')}
                      style={tw(
                        'flex-1 h-11 rounded-xl bg-rose-50 dark:bg-rose-950/40 flex-row items-center justify-center',
                      )}
                    >
                      <Trash2 size={16} color="#ef4444" />
                      <Text style={tw('text-xs font-bold text-rose-600 dark:text-rose-400 ml-1.5')}>
                        {t('mobile.family_revoke_btn')}
                      </Text>
                    </TouchableOpacity>
                  ) : null}
                </View>
              </ScrollView>
            ) : null}
            <AppModalToast visible={Boolean(manageTarget)} />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
