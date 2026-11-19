import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import {
  AlertCircle,
  AlertTriangle,
  CalendarPlus,
  Check,
  CheckCircle2,
  Clock,
  Info,
  RefreshCw,
  X,
  XCircle,
} from 'lucide-react-native';
import Toast from 'react-native-toast-message';
import {
  mobileApi,
  normalizePaginatedList,
} from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';

interface CareAlertsModalProps {
  visible: boolean;
  onClose: () => void;
  patientId?: string;
  enrollmentId?: string;
  patientName?: string;
  onChanged?: () => void;
}

interface NormalizedCareAlert {
  id: string;
  patientCareProgramId: string;
  patientId: string;
  patientName: string;
  severity: 'urgent' | 'attention';
  status: 'open' | 'acknowledged' | 'resolved' | 'dismissed';
  reasonCodes: string[];
  detectedAt: string;
  revision: number;
}

interface AlertDetailPayload {
  id: string;
  revision: number;
  status: string;
  allowedActions?: string[];
  evaluation?: {
    severity?: string;
    reasonCodes?: string[];
    evaluatedAt?: string;
    inputData?: Record<string, unknown>;
  };
}

function formatCodeLabel(code: string): string {
  return code
    .replace(/[_-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function summarizeInputData(inputData?: Record<string, unknown>): string {
  if (!inputData) return '';
  const parts: string[] = [];
  for (const [k, v] of Object.entries(inputData)) {
    if (v === null || v === undefined || typeof v === 'object') continue;
    parts.push(`${formatCodeLabel(k)}: ${String(v)}`);
  }
  return parts.slice(0, 4).join(' • ');
}

export const CareAlertsModal: React.FC<CareAlertsModalProps> = ({
  visible,
  onClose,
  patientId,
  enrollmentId,
  patientName,
  onChanged,
}) => {
  const { t } = useTranslation();
  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const [alerts, setAlerts] = useState<NormalizedCareAlert[]>([]);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<'active' | 'open' | 'acknowledged'>('active');

  const [busyId, setBusyId] = useState<string | null>(null);
  const [expandedAlertId, setExpandedAlertId] = useState<string | null>(null);
  const [alertDetails, setAlertDetails] = useState<Record<string, AlertDetailPayload>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);
  const [actionMode, setActionMode] = useState<{
    alertId: string;
    type: 'resolve' | 'dismiss' | 'consult';
  } | null>(null);
  const [actionReason, setActionReason] = useState('');

  const resolvePatientNames = useCallback(
    async (rawItems: Array<Record<string, unknown>>): Promise<Record<string, string>> => {
      const nameMap: Record<string, string> = {};
      if (patientId && patientName) {
        nameMap[patientId] = patientName;
      }
      const idsToFetch = Array.from(
        new Set(
          rawItems
            .map((item) => String(item.patientId ?? ''))
            .filter((id) => Boolean(id) && !nameMap[id])
        )
      ).slice(0, 15);

      await Promise.allSettled(
        idsToFetch.map(async (id) => {
          const res = await mobileApi.usersFindProfile({ params: { id } });
          const raw = res as unknown as { data?: { fullName?: string }; fullName?: string };
          const fullName = raw?.data?.fullName ?? raw?.fullName;
          if (fullName) nameMap[id] = String(fullName);
        })
      );
      return nameMap;
    },
    [patientId, patientName]
  );

  const mapRawAlert = (
    item: Record<string, unknown>,
    nameMap: Record<string, string>
  ): NormalizedCareAlert => {
    const pId = String(item.patientId ?? '');
    return {
      id: String(item.id ?? item._id ?? ''),
      patientCareProgramId: String(item.patientCareProgramId ?? ''),
      patientId: pId,
      patientName:
        nameMap[pId] ??
        (String(item.patientName ?? '').trim() || patientName || t('mobile.patient')),
      severity: String(item.severity ?? 'attention') === 'urgent' ? 'urgent' : 'attention',
      status: (String(item.status ?? 'open') as NormalizedCareAlert['status']) || 'open',
      reasonCodes: Array.isArray(item.reasonCodes) ? item.reasonCodes.map(String) : [],
      detectedAt: String(item.detectedAt ?? item.createdAt ?? ''),
      revision: Number(item.revision ?? 1),
    };
  };

  const loadAlerts = useCallback(
    async (cursor?: string | null, append = false) => {
      if (!visible) return;
      if (append) setLoadingMore(true);
      else {
        setLoading(true);
        setErrorMsg(null);
      }

      try {
        const res = await mobileApi.careAlertInbox({
          query: {
            limit: 30,
            ...(cursor ? { cursor } : {}),
            ...(statusFilter !== 'active' ? { status: statusFilter } : {}),
          },
        });
        const page = normalizePaginatedList<Record<string, unknown>>(res);
        const rawItems = page.items;
        const nameMap = await resolvePatientNames(rawItems);
        const mapped = rawItems
          .map((item) => mapRawAlert(item, nameMap))
          .filter((item) => {
            if (patientId && item.patientId && item.patientId !== patientId) return false;
            if (enrollmentId && item.patientCareProgramId && item.patientCareProgramId !== enrollmentId) {
              return false;
            }
            return Boolean(item.id);
          });

        setAlerts((prev) => (append ? [...prev, ...mapped] : mapped));
        const rawMeta = res as unknown as { nextCursor?: string | null; hasNextPage?: boolean };
        setNextCursor(rawMeta?.nextCursor ?? null);
        setHasMore(Boolean(rawMeta?.hasNextPage ?? page.hasNextPage ?? rawMeta?.nextCursor));
      } catch (err) {
        if (!append) {
          setErrorMsg(extractApiErrorMessage(err, 'mobile.load_care_alerts_failed'));
        }
      } finally {
        setLoading(false);
        setLoadingMore(false);
      }
    },
    [enrollmentId, patientId, patientName, resolvePatientNames, statusFilter, visible]
  );

  useEffect(() => {
    if (visible) {
      void loadAlerts(null, false);
    }
  }, [loadAlerts, visible]);

  const handleToggleExpand = async (alertId: string) => {
    if (expandedAlertId === alertId) {
      setExpandedAlertId(null);
      return;
    }
    setExpandedAlertId(alertId);
    if (alertDetails[alertId]) return;

    setLoadingDetailId(alertId);
    try {
      const detail = await mobileApi.careAlertDoctorDetail({ params: { id: alertId } });
      const raw = detail as unknown as { data?: AlertDetailPayload } & AlertDetailPayload;
      const payload = raw.data && typeof raw.data === 'object' ? raw.data : raw;
      setAlertDetails((prev) => ({ ...prev, [alertId]: payload }));
    } catch {
      // Keep summary card expanded silently
    } finally {
      setLoadingDetailId(null);
    }
  };

  const handleAcknowledge = async (alert: NormalizedCareAlert) => {
    if (busyId) return;
    setBusyId(alert.id);
    try {
      const updated = await mobileApi.careAlertAcknowledge({
        params: { id: alert.id },
        body: {
          expectedRevision: alert.revision,
          reason: t('mobile.alert_acknowledged_by_doctor'),
        },
      });
      const raw = updated as unknown as { revision?: number };
      setAlerts((prev) =>
        prev.map((a) =>
          a.id === alert.id
            ? { ...a, status: 'acknowledged', revision: Number(raw?.revision ?? a.revision + 1) }
            : a
        )
      );
      onChanged?.();
      Toast.show({
        type: 'success',
        text1: t('mobile.alert_acknowledged'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.alert_action_failed'),
      });
      await loadAlerts(null, false);
    } finally {
      setBusyId(null);
    }
  };

  const handleAcknowledgeAll = async () => {
    const openAlerts = alerts.filter((a) => a.status === 'open');
    if (busyId || openAlerts.length === 0) return;
    setBusyId('all');
    try {
      for (const item of openAlerts) {
        await mobileApi.careAlertAcknowledge({
          params: { id: item.id },
          body: {
            expectedRevision: item.revision,
            reason: t('mobile.alert_acknowledged_by_doctor'),
          },
        });
      }
      await loadAlerts(null, false);
      onChanged?.();
      Toast.show({
        type: 'success',
        text1: t('mobile.all_alerts_acknowledged'),
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.alert_action_failed'),
      });
      await loadAlerts(null, false);
    } finally {
      setBusyId(null);
    }
  };

  const handleSubmitActionModal = async () => {
    if (!actionMode || busyId) return;
    const alert = alerts.find((a) => a.id === actionMode.alertId);
    if (!alert) return;

    const trimmed = actionReason.trim();
    if ((actionMode.type === 'resolve' || actionMode.type === 'dismiss') && !trimmed) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: t('mobile.reason_required'),
      });
      return;
    }

    setBusyId(alert.id);
    try {
      if (actionMode.type === 'resolve') {
        await mobileApi.careAlertResolve({
          params: { id: alert.id },
          body: { expectedRevision: alert.revision, reason: trimmed },
        });
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        Toast.show({ type: 'success', text1: t('mobile.alert_resolved') });
      } else if (actionMode.type === 'dismiss') {
        await mobileApi.careAlertDismiss({
          params: { id: alert.id },
          body: { expectedRevision: alert.revision, reason: trimmed },
        });
        setAlerts((prev) => prev.filter((a) => a.id !== alert.id));
        Toast.show({ type: 'success', text1: t('mobile.alert_dismissed') });
      } else {
        await mobileApi.careAlertCreateConsultation({
          params: { id: alert.id },
          body: {
            followUpNote: trimmed || t('mobile.alert_followup_consultation_note'),
            nextAction: 'follow_up_consultation',
          },
        });
        Toast.show({
          type: 'success',
          text1: t('mobile.consultation_created_from_alert'),
        });
      }
      setActionMode(null);
      setActionReason('');
      onChanged?.();
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error'),
        text2: extractApiErrorMessage(err, 'mobile.alert_action_failed'),
      });
    } finally {
      setBusyId(null);
    }
  };

  const pendingCount = alerts.filter((a) => a.status === 'open').length;

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={tw('flex-1 justify-end bg-black/60')}>
        <View
          style={tw(
            'bg-white dark:bg-slate-900 rounded-t-3xl h-[86%] border-t border-slate-200 dark:border-slate-800'
          )}
        >
          {/* Header */}
          <View
            style={tw(
              'p-5 border-b border-slate-100 dark:border-slate-800 flex-row items-center justify-between'
            )}
          >
            <View style={tw('flex-row items-center flex-1 mr-3')}>
              <View
                style={tw(
                  'w-10 h-10 rounded-2xl bg-red-100 dark:bg-red-900/40 items-center justify-center mr-3'
                )}
              >
                <AlertTriangle color="#ef4444" size={20} />
              </View>
              <View style={tw('flex-1')}>
                <View style={tw('flex-row flex-wrap items-center gap-2')}>
                  <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                    {t('mobile.care_alerts')}
                  </Text>
                  {pendingCount > 0 && (
                    <View style={tw('bg-red-500 px-2 py-0.5 rounded-full')}>
                      <Text style={tw('text-white text-xs font-bold')}>{pendingCount}</Text>
                    </View>
                  )}
                </View>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                  {patientName
                    ? `${patientName} • ${t('mobile.alert_escalation_sub')}`
                    : t('mobile.alert_escalation_sub')}
                </Text>
              </View>
            </View>
            <View style={tw('flex-row items-center gap-2')}>
              <TouchableOpacity
                onPress={() => void loadAlerts(null, false)}
                disabled={loading}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <RefreshCw
                  color={twInstance.color('text-slate-600 dark:text-slate-300')}
                  size={18}
                />
              </TouchableOpacity>
              <TouchableOpacity
                onPress={onClose}
                style={tw('p-2 rounded-full bg-slate-100 dark:bg-slate-800')}
              >
                <X color={twInstance.color('text-slate-600 dark:text-slate-300')} size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Status Filter Chips */}
          <View
            style={tw(
              'px-5 py-3 border-b border-slate-100 dark:border-slate-800 flex-row gap-2'
            )}
          >
            {(
              [
                { id: 'active', label: t('mobile.all_active_alerts') },
                { id: 'open', label: t('mobile.open_alerts') },
                { id: 'acknowledged', label: t('mobile.acknowledged_alerts') },
              ] as const
            ).map((tab) => {
              const active = statusFilter === tab.id;
              return (
                <TouchableOpacity
                  key={tab.id}
                  onPress={() => setStatusFilter(tab.id)}
                  style={tw(
                    `px-3.5 py-1.5 rounded-full border items-center justify-center ${
                      active
                        ? 'bg-slate-900 dark:bg-brand border-slate-900 dark:border-brand'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`
                  )}
                >
                  <Text
                    numberOfLines={1}
                    style={tw(
                      `text-xs font-bold ${
                        active ? 'text-white dark:text-slate-900' : 'text-slate-600 dark:text-slate-300'
                      }`
                    )}
                  >
                    {tab.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          <ScrollView contentContainerStyle={tw('p-5 gap-3')} showsVerticalScrollIndicator={false}>
            {loading ? (
              <View style={tw('gap-3')}>
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
                <Skeleton className="h-32 w-full rounded-2xl" />
              </View>
            ) : errorMsg ? (
              <View
                style={tw(
                  'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-2xl p-5 items-center'
                )}
              >
                <AlertCircle color="#e11d48" size={28} style={tw('mb-2')} />
                <Text style={tw('text-sm font-semibold text-rose-700 dark:text-rose-300 text-center mb-3')}>
                  {errorMsg}
                </Text>
                <TouchableOpacity
                  onPress={() => void loadAlerts(null, false)}
                  style={tw('bg-rose-600 px-4 py-2 rounded-xl')}
                >
                  <Text style={tw('text-white font-bold text-xs')}>{t('mobile.retry')}</Text>
                </TouchableOpacity>
              </View>
            ) : alerts.length === 0 ? (
              <View
                style={tw(
                  'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 items-center'
                )}
              >
                <CheckCircle2 color="#10b981" size={32} style={tw('mb-2')} />
                <Text style={tw('text-base font-bold text-slate-800 dark:text-white mb-1')}>
                  {t('mobile.no_care_alerts')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center')}>
                  {t('mobile.no_care_alerts_desc')}
                </Text>
              </View>
            ) : (
              alerts.map((alert) => {
                const isUrgent = alert.severity === 'urgent';
                const isAck = alert.status === 'acknowledged';
                const isExpanded = expandedAlertId === alert.id;
                const detail = alertDetails[alert.id];
                const isEditingThis = actionMode?.alertId === alert.id;

                return (
                  <View
                    key={alert.id}
                    style={tw(
                      `p-4 rounded-2xl border ${
                        isUrgent
                          ? 'bg-red-50/70 dark:bg-red-950/20 border-red-200 dark:border-red-900/50'
                          : 'bg-amber-50/70 dark:bg-amber-950/20 border-amber-200 dark:border-amber-900/50'
                      }`
                    )}
                  >
                    <TouchableOpacity
                      onPress={() => void handleToggleExpand(alert.id)}
                      activeOpacity={0.85}
                    >
                      <View style={tw('flex-row justify-between items-start gap-2 mb-2')}>
                        <View
                          style={tw(
                            `px-2.5 py-0.5 rounded-md ${isUrgent ? 'bg-red-500' : 'bg-amber-500'}`
                          )}
                        >
                          <Text style={tw('text-white text-[11px] font-bold uppercase')}>
                            {isUrgent ? t('mobile.urgent') : t('mobile.attention')}
                          </Text>
                        </View>
                        <View style={tw('flex-row items-center')}>
                          <Clock color={twInstance.color('text-slate-400')} size={12} style={tw('mr-1')} />
                          <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                            {alert.detectedAt
                              ? new Date(alert.detectedAt).toLocaleString(dateLocale, {
                                  month: 'short',
                                  day: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })
                              : '—'}
                          </Text>
                        </View>
                      </View>

                      <Text style={tw('font-bold text-slate-900 dark:text-white text-base mb-1')}>
                        {alert.patientName}
                      </Text>

                      <View style={tw('flex-row flex-wrap gap-1.5 mb-2')}>
                        {alert.reasonCodes.length > 0 ? (
                          alert.reasonCodes.map((code) => (
                            <View
                              key={code}
                              style={tw(
                                'bg-white/90 dark:bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-200 dark:border-slate-700'
                              )}
                            >
                              <Text style={tw('text-xs font-medium text-slate-700 dark:text-slate-200')}>
                                {formatCodeLabel(code)}
                              </Text>
                            </View>
                          ))
                        ) : (
                          <Text style={tw('text-xs text-slate-600 dark:text-slate-300')}>
                            {t('mobile.clinical_threshold_alert')}
                          </Text>
                        )}
                      </View>
                    </TouchableOpacity>

                    {/* Expanded evaluation evidence */}
                    {isExpanded && (
                      <View
                        style={tw(
                          'bg-white/90 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 mb-3'
                        )}
                      >
                        {loadingDetailId === alert.id ? (
                          <Skeleton className="h-10 w-full rounded-lg" />
                        ) : detail?.evaluation?.inputData ? (
                          <View style={tw('flex-row items-start')}>
                            <Info color="#3b82f6" size={14} style={tw('mt-0.5 mr-2 shrink-0')} />
                            <Text style={tw('text-xs text-slate-700 dark:text-slate-300 flex-1')}>
                              {summarizeInputData(detail.evaluation.inputData) || t('mobile.evaluation_details_recorded')}
                            </Text>
                          </View>
                        ) : (
                          <Text style={tw('text-xs text-slate-500 dark:text-slate-400')}>
                            {t('mobile.evaluation_details_recorded')}
                          </Text>
                        )}
                      </View>
                    )}

                    {/* Inline reason input for Resolve / Dismiss / Consult */}
                    {isEditingThis && (
                      <View style={tw('mt-2 mb-3 bg-white dark:bg-slate-900 p-3 rounded-xl border border-slate-200 dark:border-slate-700')}>
                        <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200 mb-1.5')}>
                          {actionMode.type === 'resolve'
                            ? t('mobile.resolution_note_label')
                            : actionMode.type === 'dismiss'
                            ? t('mobile.dismissal_reason_label')
                            : t('mobile.followup_consultation_note_label')}
                        </Text>
                        <TextInput
                          value={actionReason}
                          onChangeText={setActionReason}
                          placeholder={t('mobile.enter_clinical_note_placeholder')}
                          placeholderTextColor="#94a3b8"
                          editable={busyId === null}
                          style={tw(
                            'bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white mb-2'
                          )}
                        />
                        <View style={tw('flex-row gap-2 justify-end')}>
                          <TouchableOpacity
                            disabled={busyId !== null}
                            onPress={() => {
                              setActionMode(null);
                              setActionReason('');
                            }}
                            style={tw('px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-800')}
                          >
                            <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300')}>
                              {t('mobile.cancel')}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            disabled={busyId !== null}
                            onPress={() => void handleSubmitActionModal()}
                            style={tw('px-3 py-1.5 rounded-lg bg-brand')}
                          >
                            <Text style={tw('text-xs font-bold text-slate-900')}>
                              {t('mobile.confirm')}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Actions row */}
                    <View
                      style={tw(
                        'flex-row flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-black/5 dark:border-white/5'
                      )}
                    >
                      <View style={tw('flex-row items-center')}>
                        {isAck ? (
                          <View style={tw('flex-row items-center')}>
                            <Check color="#10b981" size={14} style={tw('mr-1')} />
                            <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                              {t('mobile.acknowledged')}
                            </Text>
                          </View>
                        ) : (
                          <TouchableOpacity
                            disabled={busyId !== null}
                            onPress={() => void handleAcknowledge(alert)}
                            style={tw(
                              `bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 px-3 py-1.5 rounded-lg flex-row items-center ${
                                busyId === alert.id ? 'opacity-60' : ''
                              }`
                            )}
                          >
                            {busyId === alert.id && (
                              <ActivityIndicator size="small" color="#3b82f6" style={tw('mr-1.5')} />
                            )}
                            <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                              {t('mobile.acknowledge')}
                            </Text>
                          </TouchableOpacity>
                        )}
                      </View>

                      <View style={tw('flex-row flex-wrap gap-1.5')}>
                        <TouchableOpacity
                          disabled={busyId !== null}
                          onPress={() => {
                            setActionMode({ alertId: alert.id, type: 'consult' });
                            setActionReason('');
                          }}
                          style={tw(
                            'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-2.5 py-1.5 rounded-lg flex-row items-center'
                          )}
                        >
                          <CalendarPlus color="#2563eb" size={13} style={tw('mr-1')} />
                          <Text style={tw('text-xs font-semibold text-blue-700 dark:text-blue-300')}>
                            {t('mobile.create_consult')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={busyId !== null}
                          onPress={() => {
                            setActionMode({ alertId: alert.id, type: 'resolve' });
                            setActionReason('');
                          }}
                          style={tw(
                            'bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-2.5 py-1.5 rounded-lg flex-row items-center'
                          )}
                        >
                          <CheckCircle2 color="#059669" size={13} style={tw('mr-1')} />
                          <Text style={tw('text-xs font-semibold text-emerald-700 dark:text-emerald-300')}>
                            {t('mobile.resolve')}
                          </Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                          disabled={busyId !== null}
                          onPress={() => {
                            setActionMode({ alertId: alert.id, type: 'dismiss' });
                            setActionReason('');
                          }}
                          style={tw(
                            'bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 px-2.5 py-1.5 rounded-lg flex-row items-center'
                          )}
                        >
                          <XCircle color={twInstance.color('text-slate-500')} size={13} style={tw('mr-1')} />
                          <Text style={tw('text-xs font-semibold text-slate-600 dark:text-slate-300')}>
                            {t('mobile.dismiss')}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>
                  </View>
                );
              })
            )}

            {hasMore && !loading && (
              <TouchableOpacity
                disabled={loadingMore}
                onPress={() => void loadAlerts(nextCursor, true)}
                style={tw(
                  'py-3 rounded-xl bg-slate-100 dark:bg-slate-800 items-center justify-center flex-row'
                )}
              >
                {loadingMore && (
                  <ActivityIndicator size="small" color="#3b82f6" style={tw('mr-2')} />
                )}
                <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                  {t('mobile.load_more')}
                </Text>
              </TouchableOpacity>
            )}
          </ScrollView>

          {/* Footer */}
          <View
            style={tw('p-4 border-t border-slate-100 dark:border-slate-800 flex-row gap-3')}
          >
            <TouchableOpacity
              onPress={onClose}
              style={tw('flex-1 bg-slate-100 dark:bg-slate-800 py-3.5 rounded-xl items-center')}
            >
              <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-sm')}>
                {t('mobile.close')}
              </Text>
            </TouchableOpacity>
            {pendingCount > 0 && (
              <TouchableOpacity
                disabled={busyId !== null}
                onPress={() => void handleAcknowledgeAll()}
                style={tw(
                  `flex-1 bg-brand py-3.5 rounded-xl items-center flex-row justify-center ${
                    busyId === 'all' ? 'opacity-60' : ''
                  }`
                )}
              >
                {busyId === 'all' && (
                  <ActivityIndicator size="small" color="#0f172a" style={tw('mr-1.5')} />
                )}
                <Text style={tw('text-slate-900 font-bold text-sm')}>
                  {t('mobile.acknowledge_all')}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
};
