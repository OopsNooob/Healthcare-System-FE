import { useState, useEffect, useRef, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import {
  Crown,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  Zap,
  HeartPulse,
  Sparkles,
  AlertCircle,
  QrCode,
  X,
  Receipt,
  RefreshCw,
  BarChart3,
  Clock,
  Info,
  Calendar,
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { AppModalToast } from '@/components/ui/AppToast';
import { useThemeContext } from '@/context/ThemeContext';
import { Skeleton } from '@/components/ui/Skeleton';
import { extractApiErrorMessage } from '@/utils/apiError';
import {
  findCurrentPlan,
  formatBillingMoney as formatMoney,
  getDefaultSelectedPlanId,
  getPlanActionKind,
  isSameBillingPlan,
  type PlanActionKind,
} from '@/utils/billingPlanSelection';
import { PlanChangeConfirmModal } from '@/components/patient/PlanChangeConfirmModal';
import { formatPlanBenefits } from '@/utils/billingBenefits';
import {
  mobileApi,
  normalizePaginatedList,
  generateIdempotencyKey,
  type FeTypes,
} from '@repo/shared-hooks';

type OrderStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'paid'
  | 'expired'
  | 'cancelled'
  | 'failed'
  | 'refund_pending'
  | 'refunded';

type PlanDto = FeTypes.PatientBillingReadGetPlanResponse;
type SubscriptionDto = FeTypes.PatientBillingReadSubscriptionsResponse['items'][number];
type UsageDto = FeTypes.PatientBillingReadUsageResponse;
type OrderSummaryDto = FeTypes.PaymentsListResponse['items'][number];
type OrderDetailDto = FeTypes.PaymentsGetResponse & { id?: string; _id?: string };

interface ActivePaymentModalState {
  id: string;
  orderCode: string;
  planName: string;
  amount: number;
  currency: string;
  status: OrderStatus;
  paymentUrl?: string | null;
  paymentQrDataUrl?: string | null;
}

function getOrderId(order: { id?: string; _id?: string } | null | undefined): string {
  return String(order?.id ?? order?._id ?? '');
}

export default function PremiumScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const incomingUrl = Linking.useURL();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [plans, setPlans] = useState<PlanDto[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [effectiveSub, setEffectiveSub] = useState<SubscriptionDto | null>(null);
  const [subscriptions, setSubscriptions] = useState<SubscriptionDto[]>([]);
  const [usage, setUsage] = useState<UsageDto | null>(null);
  const [orders, setOrders] = useState<OrderSummaryDto[]>([]);
  const [activeCareCount, setActiveCareCount] = useState<number>(0);
  const [activeFamilyLinkCount, setActiveFamilyLinkCount] = useState<number>(0);
  const [aiTotalTokens, setAiTotalTokens] = useState<number | null>(null);
  const [aiTotalConversations, setAiTotalConversations] = useState<number | null>(null);

  const [planDetailModalVisible, setPlanDetailModalVisible] = useState(false);
  const [loadingPlanDetail, setLoadingPlanDetail] = useState(false);
  const [planDetail, setPlanDetail] = useState<PlanDto | null>(null);

  const [orderHistoryModalVisible, setOrderHistoryModalVisible] = useState(false);
  const [historyTab, setHistoryTab] = useState<'orders' | 'subscriptions'>('orders');
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<OrderDetailDto | null>(null);
  const [loadingOrderDetail, setLoadingOrderDetail] = useState(false);
  const [cancellingOrderId, setCancellingOrderId] = useState<string | null>(null);

  const [confirmModalVisible, setConfirmModalVisible] = useState(false);
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<ActivePaymentModalState | null>(null);
  const [pollingStatus, setPollingStatus] = useState<OrderStatus>('pending');
  const [isCheckingOrder, setIsCheckingOrder] = useState(false);

  const pollingIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const handledReturnUrlRef = useRef<string | null>(null);
  const lastEffectivePlanIdRef = useRef<string | null>(null);

  const dateLocale = t('mobile.date_locale', 'vi-VN');

  const formatDateTime = useCallback(
    (iso?: string | null) => {
      if (!iso) return '—';
      const parsed = new Date(iso);
      if (Number.isNaN(parsed.getTime())) return iso;
      return parsed.toLocaleString(dateLocale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    },
    [dateLocale]
  );

  const stopPolling = useCallback(() => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
      pollingIntervalRef.current = null;
    }
  }, []);

  const loadBillingData = useCallback(async (opts?: { silent?: boolean }) => {
    if (!opts?.silent) {
      setLoadError(null);
    }

    try {
      const [
        plansResult,
        subsResult,
        usageResult,
        ordersResult,
        careResult,
        aiSummaryResult,
        familyLinksResult,
      ] = await Promise.allSettled([
        mobileApi.patientBillingReadListPlans({
          query: { page: 1, limit: 50, sortOrder: 1, sortBy: 'price' },
        }),
        mobileApi.patientBillingReadSubscriptions({
          query: { page: 1, limit: 50, sortOrder: -1, sortBy: 'startedAt' },
        }),
        mobileApi.patientBillingReadUsage(),
        mobileApi.paymentsList({
          query: { page: 1, limit: 50, sortOrder: -1, sortBy: 'createdAt' },
        }),
        mobileApi.careEnrollmentList({ query: { page: 1, limit: 20, status: 'active' } }),
        mobileApi.aiAssistantGetUserConversationSummary(),
        mobileApi.familyLinksList({
          query: { direction: 'sent', status: 'active', page: 1, limit: 1 },
        }),
      ]);

      const coreErrors: unknown[] = [];
      let nextPlans: PlanDto[] | null = null;
      let nextEffective: SubscriptionDto | null | undefined = undefined;

      if (plansResult.status === 'fulfilled') {
        const normalizedPlans = normalizePaginatedList<PlanDto>(plansResult.value, 1, 50).items;
        nextPlans = [...normalizedPlans].sort((a, b) => a.price - b.price);
        setPlans(nextPlans);
      } else {
        coreErrors.push(plansResult.reason);
      }

      if (subsResult.status === 'fulfilled') {
        const rawSubs = subsResult.value;
        nextEffective = rawSubs?.effective ?? null;
        setEffectiveSub(nextEffective);
        setSubscriptions(normalizePaginatedList<SubscriptionDto>(rawSubs, 1, 50).items);
      } else {
        coreErrors.push(subsResult.reason);
      }

      if (nextPlans) {
        const effectiveForSelection = nextEffective !== undefined ? nextEffective : null;
        const nextEffectivePlanId = effectiveForSelection?.plan?.id ?? null;
        const effectivePlanChanged =
          nextEffective !== undefined && lastEffectivePlanIdRef.current !== nextEffectivePlanId;
        if (nextEffective !== undefined) {
          lastEffectivePlanIdRef.current = nextEffectivePlanId;
        }
        const resolvedPlans = nextPlans;
        setSelectedPlanId((prev) => {
          if (prev && !effectivePlanChanged && resolvedPlans.some((p) => p.id === prev)) {
            return prev;
          }
          return getDefaultSelectedPlanId(resolvedPlans, effectiveForSelection);
        });
      }

      if (usageResult.status === 'fulfilled') {
        setUsage(usageResult.value ?? null);
      }

      if (ordersResult.status === 'fulfilled') {
        const normalizedOrders = normalizePaginatedList<OrderSummaryDto>(ordersResult.value, 1, 50).items.map(
          (item) => ({
            ...item,
            id: getOrderId(item as OrderSummaryDto & { _id?: string }),
          })
        );
        setOrders(normalizedOrders);
      }

      if (careResult.status === 'fulfilled') {
        const carePage = normalizePaginatedList<FeTypes.CareEnrollmentListResponse['items'][number]>(
          careResult.value,
          1,
          20
        );
        setActiveCareCount(
          carePage.total > 0
            ? carePage.total
            : carePage.items.filter((e) => e.status === 'active').length
        );
      }

      if (aiSummaryResult.status === 'fulfilled') {
        const summaryData = (aiSummaryResult.value as { data?: Record<string, unknown> } | undefined)?.data;
        if (summaryData && typeof summaryData === 'object') {
          if (typeof summaryData.totalTokensUsed === 'number') {
            setAiTotalTokens(summaryData.totalTokensUsed);
          }
          if (typeof summaryData.totalConversations === 'number') {
            setAiTotalConversations(summaryData.totalConversations);
          }
        }
      }

      if (familyLinksResult.status === 'fulfilled') {
        const rawFamily = familyLinksResult.value as
          | { data?: { total?: number; items?: unknown[] }; total?: number; items?: unknown[] }
          | undefined;
        const familyPayload = rawFamily?.data ?? rawFamily;
        const familyTotal =
          typeof familyPayload?.total === 'number'
            ? familyPayload.total
            : Array.isArray(familyPayload?.items)
              ? familyPayload.items.length
              : 0;
        setActiveFamilyLinkCount(familyTotal);
      }

      if (coreErrors.length === 2) {
        setLoadError(extractApiErrorMessage(coreErrors[0], 'mobile.billing_load_failed'));
      } else {
        setLoadError(null);
      }
    } catch (err) {
      setLoadError(extractApiErrorMessage(err, 'mobile.billing_load_failed'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    void loadBillingData();
    return () => {
      stopPolling();
    };
  }, [loadBillingData, stopPolling]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    void loadBillingData({ silent: true });
  }, [loadBillingData]);

  const orderStatusText = useCallback(
    (status: string) => {
      const defaults: Record<string, string> = {
        paid: 'Đã thanh toán',
        pending: 'Chờ xác minh',
        created: 'Mới tạo',
        processing: 'Đang xử lý',
        expired: 'Hết hạn',
        cancelled: 'Đã hủy',
        failed: 'Thất bại',
        refund_pending: 'Chờ hoàn tiền',
        refunded: 'Đã hoàn tiền',
      };
      return t(`mobile.order_status_${status}`, defaults[status] || status);
    },
    [t]
  );

  const pollOrderOnce = useCallback(
    async (orderId: string) => {
      try {
        const detail = await mobileApi.paymentsGet({ params: { id: orderId } });
        const status = detail?.status;
        if (!status) return;
        setPollingStatus(status);
        setCurrentOrder((prev) => (prev && prev.id === orderId ? { ...prev, status } : prev));

        if (status === 'paid') {
          stopPolling();
          Toast.show({
            type: 'success',
            text1: t('mobile.success', 'Thành công'),
            text2: t(
              'mobile.vnpay_success',
              'Thanh toán VNPAY thành công! Quyền lợi gói đã được cập nhật.'
            ),
          });
          setOrderModalVisible(false);
          void loadBillingData({ silent: true });
        } else if (status === 'cancelled' || status === 'expired' || status === 'failed') {
          stopPolling();
          Toast.show({
            type: 'info',
            text1: t('mobile.order_ended', 'Đơn hàng đã kết thúc'),
            text2: `${t('mobile.status_label', 'Trạng thái')}: ${orderStatusText(status)}`,
          });
          setOrderModalVisible(false);
          void loadBillingData({ silent: true });
        }
      } catch {
        // Poll will retry on next tick
      }
    },
    [loadBillingData, orderStatusText, stopPolling, t]
  );

  const startPollingOrderStatus = useCallback(
    (orderId: string) => {
      stopPolling();
      pollingIntervalRef.current = setInterval(() => {
        void pollOrderOnce(orderId);
      }, 3000);
    },
    [pollOrderOnce, stopPolling]
  );

  useEffect(() => {
    if (!incomingUrl || !incomingUrl.toLowerCase().includes('vnpay')) return;
    if (handledReturnUrlRef.current === incomingUrl) return;
    handledReturnUrlRef.current = incomingUrl;

    void (async () => {
      try {
        const ret = await mobileApi.paymentsReturnFromVnpay();
        if (ret?.message) {
          Toast.show({
            type: 'info',
            text1: t('mobile.payment_verification_pending_title', 'Đang xác minh giao dịch'),
            text2: t(
              'mobile.payment_verification_pending_desc',
              'Hệ thống đang kiểm tra xác nhận từ VNPAY.'
            ),
          });
        }
      } catch {
        // Ignored: status refresh remains authoritative
      } finally {
        if (currentOrder?.id) {
          await pollOrderOnce(currentOrder.id);
        }
        await loadBillingData({ silent: true });
      }
    })();
  }, [incomingUrl, currentOrder?.id, loadBillingData, pollOrderOnce, t]);

  const handleOpenPlanDetail = async (plan: PlanDto) => {
    setPlanDetail(plan);
    setPlanDetailModalVisible(true);
    setLoadingPlanDetail(true);
    try {
      const fresh = await mobileApi.patientBillingReadGetPlan({ params: { id: plan.id } });
      if (fresh) setPlanDetail(fresh);
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.billing_load_failed'),
      });
    } finally {
      setLoadingPlanDetail(false);
    }
  };

  const handleOpenOrderDetail = async (orderId: string) => {
    if (!orderId || loadingOrderDetail) return;
    setLoadingOrderDetail(true);
    try {
      const detail = await mobileApi.paymentsGet({ params: { id: orderId } });
      setSelectedOrderDetail({ ...detail, id: orderId });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.order_detail_failed'),
      });
    } finally {
      setLoadingOrderDetail(false);
    }
  };

  const handleUpgrade = async () => {
    const selectedPlan = plans.find((p) => p.id === selectedPlanId);
    if (!selectedPlan || !selectedPlan.purchasable || effectiveSub?.renewal || isProcessingOrder) {
      return;
    }

    setIsProcessingOrder(true);
    try {
      const res = await mobileApi.paymentsCreate({
        body: { planId: selectedPlan.id },
        headers: { 'idempotency-key': generateIdempotencyKey() },
      });

      const orderObj = (res?.order ?? res) as unknown as {
        id?: string;
        _id?: string;
        orderCode?: string;
        amount?: number;
        currency?: string;
        status?: OrderStatus;
        orderSnapshot?: { name?: string };
      } | null;

      let orderId = getOrderId(orderObj);
      const orderCode = orderObj?.orderCode || '';

      if (!orderId && orderCode) {
        const listRes = await mobileApi.paymentsList({
          query: { page: 1, limit: 10, sortOrder: -1, sortBy: 'createdAt' },
        });
        const matched = normalizePaginatedList<OrderSummaryDto>(listRes, 1, 10).items.find(
          (o) => o.orderCode === orderCode
        );
        if (matched) {
          orderId = getOrderId(matched as OrderSummaryDto & { _id?: string });
        }
      }

      if (!orderId) {
        throw new Error(t('mobile.payment_create_failed', 'Không thể tạo đơn thanh toán'));
      }

      const activeModal: ActivePaymentModalState = {
        id: orderId,
        orderCode: orderCode || orderId,
        planName: orderObj?.orderSnapshot?.name || selectedPlan.name,
        amount: orderObj?.amount ?? selectedPlan.price,
        currency: orderObj?.currency || selectedPlan.currency || 'VND',
        status: orderObj?.status || 'created',
        paymentUrl: res?.paymentUrl ?? null,
        paymentQrDataUrl: res?.paymentQrDataUrl ?? null,
      };

      setConfirmModalVisible(false);
      setCurrentOrder(activeModal);
      setPollingStatus(activeModal.status);
      setOrderModalVisible(true);
      startPollingOrderStatus(orderId);
      void loadBillingData({ silent: true });

      if (res?.paymentUrl) {
        Linking.openURL(res.paymentUrl).catch(() => {});
      }
    } catch (err) {
      setConfirmModalVisible(false);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.payment_create_failed'),
      });
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleManualVerifyOrder = async () => {
    if (!currentOrder?.id || isCheckingOrder) return;
    setIsCheckingOrder(true);
    try {
      await pollOrderOnce(currentOrder.id);
    } finally {
      setIsCheckingOrder(false);
    }
  };

  const handleCancelOrder = async (targetOrderId?: string) => {
    const idToCancel = targetOrderId || currentOrder?.id;
    if (!idToCancel || cancellingOrderId) return;

    setCancellingOrderId(idToCancel);
    try {
      const updated = await mobileApi.paymentsCancel({
        params: { id: idToCancel },
      });
      if (currentOrder?.id === idToCancel) {
        stopPolling();
        setOrderModalVisible(false);
        setCurrentOrder(null);
      }
      setOrders((prev) =>
        prev.map((o) =>
          o.id === idToCancel ? { ...o, status: updated?.status ?? 'cancelled' } : o
        )
      );
      if (selectedOrderDetail && getOrderId(selectedOrderDetail) === idToCancel) {
        setSelectedOrderDetail({ ...selectedOrderDetail, ...updated, id: idToCancel });
      }
      Toast.show({
        type: 'info',
        text1: t('mobile.cancelled', 'Đã hủy đơn hàng'),
        text2: t('mobile.order_cancelled', 'Đơn hàng chưa thanh toán đã được hủy.'),
      });
      void loadBillingData({ silent: true });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Lỗi'),
        text2: extractApiErrorMessage(err, 'mobile.order_cancel_failed'),
      });
    } finally {
      setCancellingOrderId(null);
    }
  };

  const getOrderStatusBadge = (status: string) => {
    switch (status) {
      case 'paid':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          label: orderStatusText('paid'),
        };
      case 'pending':
      case 'created':
      case 'processing':
        return {
          bg: 'bg-amber-100 dark:bg-amber-900/30',
          text: 'text-amber-700 dark:text-amber-400',
          label: orderStatusText(status),
        };
      case 'refund_pending':
        return {
          bg: 'bg-purple-100 dark:bg-purple-900/30',
          text: 'text-purple-700 dark:text-purple-400',
          label: orderStatusText('refund_pending'),
        };
      case 'refunded':
        return {
          bg: 'bg-blue-100 dark:bg-blue-900/30',
          text: 'text-blue-700 dark:text-blue-400',
          label: orderStatusText('refunded'),
        };
      default:
        return {
          bg: 'bg-slate-200 dark:bg-slate-800',
          text: 'text-slate-600 dark:text-slate-400',
          label: orderStatusText(status),
        };
    }
  };

  const getSubscriptionStatusBadge = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return {
          bg: 'bg-emerald-100 dark:bg-emerald-900/30',
          text: 'text-emerald-700 dark:text-emerald-400',
          label: t('mobile.sub_status_active', 'Đang hiệu lực'),
        };
      case 'expired':
        return {
          bg: 'bg-slate-200 dark:bg-slate-800',
          text: 'text-slate-600 dark:text-slate-400',
          label: t('mobile.sub_status_expired', 'Hết hạn'),
        };
      case 'cancelled':
        return {
          bg: 'bg-red-100 dark:bg-red-900/30',
          text: 'text-red-700 dark:text-red-400',
          label: t('mobile.sub_status_cancelled', 'Đã hủy'),
        };
      default:
        return {
          bg: 'bg-indigo-100 dark:bg-indigo-900/40',
          text: 'text-indigo-700 dark:text-indigo-300',
          label: String(status),
        };
    }
  };

  const activePlanCode = (effectiveSub?.plan?.code || '').toUpperCase();
  const selectedPlan = plans.find((p) => p.id === selectedPlanId) ?? null;
  const isRefundPending = orders.some((o) => o.status === 'refund_pending');
  const entitlement = effectiveSub?.entitlement;
  const aiPeriodLabel =
    entitlement?.aiQuotaPeriod === 'day'
      ? t('mobile.per_day', 'mỗi ngày')
      : t('mobile.per_cycle', 'mỗi chu kỳ');

  const renderPlanIcon = (code: string, isSelected: boolean) => {
    const upper = code.toUpperCase();
    if (upper === 'CARE') {
      return (
        <HeartPulse
          color={isSelected ? twInstance.color('text-brand') : twInstance.color('text-slate-400')}
          size={22}
        />
      );
    }
    if (upper === 'PLUS') {
      return (
        <Sparkles
          color={
            isSelected ? twInstance.color('text-amber-500') : twInstance.color('text-slate-400')
          }
          size={22}
        />
      );
    }
    return (
      <ShieldCheck
        color={isSelected ? twInstance.color('text-slate-600 dark:text-slate-200') : twInstance.color('text-slate-400')}
        size={22}
      />
    );
  };

  const currentPlan = findCurrentPlan(plans, effectiveSub);
  const isSelectedCurrentPlan = Boolean(
    selectedPlan && isSameBillingPlan(selectedPlan, effectiveSub?.plan)
  );
  const planActionKind: PlanActionKind | null = selectedPlan
    ? getPlanActionKind(selectedPlan, currentPlan, effectiveSub)
    : null;
  const formattedCurrentExpiry = formatDateTime(effectiveSub?.expiresAt);

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView
        contentContainerStyle={tw('pb-24')}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={twInstance.color('text-amber-500')}
          />
        }
      >
        {/* Navigation Bar */}
        <View style={tw('flex-row items-center justify-between px-4 pt-4 pb-2')}>
          <TouchableOpacity
            style={tw('p-2 -ml-1')}
            onPress={() => router.back('/(patient)/profile')}
            accessibilityLabel={t('mobile.back', 'Quay lại')}
          >
            <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => {
              setHistoryTab('orders');
              setOrderHistoryModalVisible(true);
            }}
            style={tw(
              'flex-row items-center bg-white dark:bg-slate-900 px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-800'
            )}
          >
            <Receipt size={16} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
            <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200 ml-1.5')}>
              {t('mobile.orders_and_subscriptions', 'Đơn hàng & Đăng ký')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={tw('items-center px-6 pt-2 pb-6')}>
          <View
            style={tw(
              'w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4'
            )}
          >
            <Crown color={twInstance.color('text-amber-500')} size={40} />
          </View>
          <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white text-center')}>
            {t('mobile.upgrade_to_premium', 'Gói cước & Quyền lợi')}
          </Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-center mt-2 px-4')}>
            {t(
              'mobile.unlock_unlimited_ai_consultati',
              'Quản lý gói đăng ký, hạn mức sử dụng và chương trình đồng hành cùng bác sĩ.'
            )}
          </Text>
        </View>

        {isRefundPending && (
          <View style={tw('px-6 mb-4')}>
            <View
              style={tw(
                'bg-amber-100 dark:bg-amber-900/30 p-4 rounded-2xl flex-row items-center border border-amber-200 dark:border-amber-800/50'
              )}
            >
              <AlertCircle
                color={twInstance.color('text-amber-600 dark:text-amber-400')}
                size={24}
              />
              <View style={tw('flex-1 ml-3')}>
                <Text style={tw('text-amber-800 dark:text-amber-300 font-bold')}>
                  {t('mobile.refund_pending_title', 'Đơn hàng đang chờ xử lý hoàn tiền')}
                </Text>
                <Text style={tw('text-amber-700/80 dark:text-amber-400/80 text-xs mt-1')}>
                  {t(
                    'mobile.refund_pending_desc',
                    'Một đơn hàng của bạn đang ở trạng thái chờ hoàn tiền. Vui lòng kiểm tra chi tiết trong lịch sử đơn hàng.'
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {loadError && !loading && (
          <View style={tw('px-6 mb-4')}>
            <View
              style={tw(
                'bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl border border-red-200 dark:border-red-800/50'
              )}
            >
              <Text style={tw('text-sm font-bold text-red-700 dark:text-red-300')}>
                {t('mobile.billing_load_failed', 'Không thể tải thông tin gói cước')}
              </Text>
              <Text style={tw('text-xs text-red-600 dark:text-red-400 mt-1')}>{loadError}</Text>
              <TouchableOpacity
                onPress={() => void loadBillingData()}
                style={tw(
                  'mt-3 self-start bg-red-600 px-4 py-2 rounded-xl flex-row items-center'
                )}
              >
                <RefreshCw size={14} color="#ffffff" />
                <Text style={tw('text-white text-xs font-bold ml-1.5')}>
                  {t('mobile.retry', 'Thử lại')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Current Plan & Live Usage Section */}
        <View style={tw('px-6 mb-6')}>
          {loading ? (
            <View
              style={tw(
                'bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800'
              )}
            >
              <Skeleton className="h-4 w-28 mb-2 rounded" />
              <Skeleton className="h-7 w-48 mb-4 rounded-lg" />
              <Skeleton className="h-16 w-full mb-3 rounded-2xl" />
              <Skeleton className="h-16 w-full mb-3 rounded-2xl" />
              <View style={tw('flex-row gap-2.5')}>
                <Skeleton className="h-16 flex-1 rounded-2xl" />
                <Skeleton className="h-16 flex-1 rounded-2xl" />
              </View>
            </View>
          ) : (
            <View
              style={tw(
                'bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm'
              )}
            >
              <View
                style={tw(
                  'flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800'
                )}
              >
                <View style={tw('flex-1 mr-3')}>
                  <Text
                    style={tw(
                      'text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1'
                    )}
                  >
                    {t('mobile.current_plan', 'Gói hiện tại')}
                  </Text>
                  <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                    {effectiveSub?.plan?.name || t('mobile.free_tier', 'Gói Miễn phí')}
                  </Text>
                  {effectiveSub?.expiresAt ? (
                    <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                      {t('mobile.expires_on', 'Hết hạn')}: {formatDateTime(effectiveSub.expiresAt)}
                    </Text>
                  ) : null}
                </View>
                <View style={tw('bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full')}>
                  <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold text-xs')}>
                    {t('mobile.plan_active_badge', 'ĐANG DÙNG')}
                  </Text>
                </View>
              </View>

              {effectiveSub?.renewal ? (
                <View
                  style={tw(
                    'mb-4 bg-indigo-50 dark:bg-indigo-950/40 p-3 rounded-2xl border border-indigo-200 dark:border-indigo-900 flex-row items-center'
                  )}
                >
                  <Calendar
                    size={16}
                    color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                  />
                  <Text style={tw('text-xs text-indigo-800 dark:text-indigo-300 ml-2 flex-1')}>
                    {t('mobile.scheduled_renewal', 'Gói gia hạn tiếp theo')}:{' '}
                    <Text style={tw('font-bold')}>{effectiveSub.renewal.name}</Text> (
                    {formatDateTime(effectiveSub.renewal.effectiveAt)})
                  </Text>
                </View>
              ) : null}

              <View style={tw('flex-row items-center mb-3')}>
                <BarChart3 size={16} color={twInstance.color('text-indigo-500')} />
                <Text
                  style={tw(
                    'text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1.5'
                  )}
                >
                  {t('mobile.usage_meters_title', 'Hạn mức quyền lợi')}
                </Text>
              </View>

              {/* Meter 1: AI Entitlement & Summary */}
              <View style={tw('mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center mb-1')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.meter_ai_entitlement', 'Hạn mức Trợ lý AI')}
                  </Text>
                  <Text style={tw('text-xs font-bold text-indigo-600 dark:text-indigo-400')}>
                    {entitlement
                      ? `${entitlement.aiRequestLimit.toLocaleString(dateLocale)} ${t(
                          'mobile.requests_unit',
                          'lượt'
                        )} / ${aiPeriodLabel}`
                      : '—'}
                  </Text>
                </View>
                <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                  {t('mobile.ai_token_limit_label', 'Giới hạn token')}:{' '}
                  {entitlement ? entitlement.aiTokenLimit.toLocaleString(dateLocale) : '—'}
                  {aiTotalTokens !== null
                    ? ` • ${t('mobile.used_total_tokens', 'Đã dùng tích lũy')}: ${aiTotalTokens.toLocaleString(dateLocale)}`
                    : ''}
                  {aiTotalConversations !== null
                    ? ` (${aiTotalConversations} ${t('mobile.conversations_unit', 'hội thoại')})`
                    : ''}
                </Text>
              </View>

              {/* Meter 2: Consultation Usage from GET /subscriptions/me/usage */}
              <View style={tw('mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center mb-1')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.meter_2_consult_quota', 'Hạn mức tư vấn bác sĩ')}
                  </Text>
                  <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                    {usage?.consultations.unlimited
                      ? t('mobile.unlimited', 'Không giới hạn')
                      : `${t('mobile.remaining', 'Còn lại')}: ${
                          usage?.consultations.available ?? 0
                        }`}
                  </Text>
                </View>
                <View style={tw('flex-row flex-wrap gap-3 mt-1')}>
                  <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                    {t('mobile.cycle_limit', 'Giới hạn chu kỳ')}:{' '}
                    <Text style={tw('font-bold text-slate-700 dark:text-slate-200')}>
                      {usage?.consultations.unlimited
                        ? '∞'
                        : usage?.consultations.limit ??
                          entitlement?.consultationLimitPerCycle ??
                          0}
                    </Text>
                  </Text>
                  <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                    {t('mobile.used_label', 'Đã dùng:')}{' '}
                    <Text style={tw('font-bold text-slate-700 dark:text-slate-200')}>
                      {usage?.consultations.counted ?? 0}
                    </Text>
                  </Text>
                  <Text style={tw('text-[11px] text-amber-600 dark:text-amber-400')}>
                    {t('mobile.reserved_label', 'Đang giữ chỗ:')}{' '}
                    <Text style={tw('font-bold')}>{usage?.consultations.reserved ?? 0}</Text>
                  </Text>
                </View>
              </View>

              {/* Meter 3: Care Program Limit */}
              <View style={tw('mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.meter_3_care_program', 'Chương trình chăm sóc đang hoạt động')}
                  </Text>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                    {activeCareCount} / {entitlement?.activeCareProgramLimit ?? 0}
                  </Text>
                </View>
              </View>

              {/* Meter 4: Family Companion Link Limit */}
              <View style={tw('bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.meter_4_family_link', 'Liên kết tài khoản người thân')}
                  </Text>
                  <Text style={tw('text-xs font-bold text-slate-900 dark:text-white')}>
                    {activeFamilyLinkCount} / {entitlement?.familyLinkLimit ?? 0}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Plans Catalog from GET /plans */}
        <View style={tw('px-6 mb-4')}>
          <Text
            style={tw(
              'text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3'
            )}
          >
            {t('mobile.compare_plans', 'Danh sách gói dịch vụ')}
          </Text>

          {loading ? (
            <View style={tw('gap-4')}>
              <Skeleton className="h-36 w-full rounded-3xl" />
              <Skeleton className="h-44 w-full rounded-3xl" />
              <Skeleton className="h-44 w-full rounded-3xl" />
            </View>
          ) : plans.length === 0 ? (
            <View
              style={tw(
                'bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 items-center'
              )}
            >
              <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center')}>
                {t('mobile.no_plans_available', 'Hiện chưa có gói dịch vụ nào khả dụng.')}
              </Text>
            </View>
          ) : (
            plans.map((plan) => {
              const isSelected = selectedPlanId === plan.id;
              const isCurrent =
                effectiveSub?.plan &&
                (plan.id === effectiveSub.plan.id ||
                  plan.code.toUpperCase() === activePlanCode);
              const isScheduledRenewal = Boolean(
                effectiveSub?.renewal && isSameBillingPlan(plan, effectiveSub.renewal)
              );
              const upperCode = plan.code.toUpperCase();
              const borderBgClass = isSelected
                ? upperCode === 'CARE'
                  ? 'border-brand bg-brand-light/30 dark:bg-emerald-950/30'
                  : upperCode === 'PLUS'
                    ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10'
                    : 'border-slate-500 bg-slate-100 dark:bg-slate-900'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900';

              return (
                <TouchableOpacity
                  key={plan.id}
                  onPress={() => setSelectedPlanId(plan.id)}
                  activeOpacity={0.85}
                  style={tw(`p-5 rounded-3xl mb-4 border-2 ${borderBgClass}`)}
                >
                  <View style={tw('flex-row justify-between items-start mb-3')}>
                    <View style={tw('flex-row items-center flex-1 mr-2')}>
                      {renderPlanIcon(plan.code, isSelected)}
                      <View style={tw('ml-2.5 flex-1')}>
                        <View style={tw('flex-row items-center flex-wrap gap-2')}>
                          <Text style={tw('font-bold text-lg text-slate-900 dark:text-white')}>
                            {plan.name}
                          </Text>
                          {isCurrent ? (
                            <View
                              style={tw(
                                'bg-emerald-100 dark:bg-emerald-900/40 px-2 py-0.5 rounded-full'
                              )}
                            >
                              <Text
                                style={tw(
                                  'text-[10px] font-bold text-emerald-700 dark:text-emerald-300'
                                )}
                              >
                                {t('mobile.plan_active_badge', 'ĐANG DÙNG')}
                              </Text>
                            </View>
                          ) : null}
                          {isScheduledRenewal ? (
                            <View
                              style={tw(
                                'bg-indigo-100 dark:bg-indigo-900/40 px-2 py-0.5 rounded-full'
                              )}
                            >
                              <Text
                                style={tw(
                                  'text-[10px] font-bold text-indigo-700 dark:text-indigo-300'
                                )}
                              >
                                {t('mobile.plan_scheduled_badge', 'ĐÃ LÊN LỊCH')}
                              </Text>
                            </View>
                          ) : null}
                        </View>
                        {plan.description ? (
                          <Text
                            style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}
                            numberOfLines={2}
                          >
                            {plan.description}
                          </Text>
                        ) : null}
                      </View>
                    </View>
                    <View style={tw('items-end')}>
                      <Text style={tw('text-lg font-bold text-slate-900 dark:text-white')}>
                        {formatMoney(
                          plan.price,
                          plan.currency,
                          t('mobile.free_price', '0đ'),
                          dateLocale
                        )}
                      </Text>
                      {plan.durationDays > 0 ? (
                        <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                          {plan.durationDays} {t('mobile.days_unit', 'ngày')}
                        </Text>
                      ) : null}
                    </View>
                  </View>

                  <View style={tw('gap-2')}>
                    <View style={tw('flex-row items-center')}>
                      <CheckCircle2 color="#10b981" size={16} />
                      <Text style={tw('text-slate-700 dark:text-slate-300 text-xs ml-2 flex-1')}>
                        {plan.quota.consultationLimitPerCycle}{' '}
                        {t('mobile.consultations_per_cycle_short', 'lượt tư vấn bác sĩ mỗi chu kỳ')}
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center')}>
                      <CheckCircle2 color="#10b981" size={16} />
                      <Text style={tw('text-slate-700 dark:text-slate-300 text-xs ml-2 flex-1')}>
                        {plan.quota.aiRequestLimit.toLocaleString(dateLocale)}{' '}
                        {t('mobile.requests_unit', 'lượt')} AI •{' '}
                        {plan.quota.aiTokenLimit.toLocaleString(dateLocale)}{' '}
                        {t('mobile.tokens_unit', 'token')}
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center')}>
                      <CheckCircle2 color="#10b981" size={16} />
                      <Text style={tw('text-slate-700 dark:text-slate-300 text-xs ml-2 flex-1')}>
                        {plan.quota.activeCareProgramLimit > 0
                          ? t(
                              'mobile.care_program_included',
                              'Tối đa {{count}} chương trình chăm sóc mạn tính',
                              { count: plan.quota.activeCareProgramLimit }
                            )
                          : t(
                              'mobile.no_care_program_included',
                              'Theo dõi chỉ số cơ bản và cảnh báo an toàn'
                            )}
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center')}>
                      <CheckCircle2 color="#10b981" size={16} />
                      <Text style={tw('text-slate-700 dark:text-slate-300 text-xs ml-2 flex-1')}>
                        {(plan.quota.familyLinkLimit ?? 0) > 0
                          ? t(
                              'mobile.family_links_included',
                              'Tối đa {{count}} liên kết đồng hành gia đình',
                              { count: plan.quota.familyLinkLimit }
                            )
                          : t(
                              'mobile.no_family_links_included',
                              'Chưa hỗ trợ liên kết đồng hành gia đình'
                            )}
                      </Text>
                    </View>
                  </View>

                  <TouchableOpacity
                    onPress={() => void handleOpenPlanDetail(plan)}
                    style={tw('mt-3 pt-3 border-t border-slate-200/70 dark:border-slate-800 flex-row items-center justify-between')}
                  >
                    <Text style={tw('text-xs font-semibold text-indigo-600 dark:text-indigo-400')}>
                      {t('mobile.view_plan_details', 'Xem chi tiết quyền lợi gói')}
                    </Text>
                    <ArrowRight size={14} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
                  </TouchableOpacity>
                </TouchableOpacity>
              );
            })
          )}

          {/* Upgrade / Schedule Action Section */}
          {!loading && selectedPlan && planActionKind ? (
            planActionKind === 'already_scheduled' ? (
              <View
                style={tw(
                  'bg-indigo-50 dark:bg-indigo-950/40 p-4 rounded-2xl border border-indigo-200 dark:border-indigo-900 flex-row items-center mt-2 mb-4'
                )}
              >
                <Calendar
                  size={20}
                  color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                />
                <Text
                  style={tw(
                    'text-indigo-800 dark:text-indigo-300 text-xs font-semibold leading-5 ml-3 flex-1'
                  )}
                >
                  {t(
                    'mobile.already_scheduled_notice',
                    'Bạn đã lên lịch gói {{name}} cho chu kỳ tiếp theo từ {{date}}. Mỗi chu kỳ chỉ hỗ trợ 1 lịch thay đổi gói.',
                    {
                      name: effectiveSub?.renewal?.name ?? '',
                      date: formatDateTime(effectiveSub?.renewal?.effectiveAt),
                    }
                  )}
                </Text>
              </View>
            ) : planActionKind === 'not_purchasable' ? (
              isSelectedCurrentPlan ? (
                <View
                  style={tw(
                    'bg-emerald-100 dark:bg-emerald-900/30 py-4 px-4 rounded-2xl items-center mt-2 mb-4'
                  )}
                >
                  <Text
                    style={tw(
                      'text-emerald-700 dark:text-emerald-400 font-bold text-base text-center'
                    )}
                  >
                    {t('mobile.current_active_plan', 'Đây là gói hiện tại của bạn')}
                  </Text>
                </View>
              ) : (
                <View
                  style={tw(
                    'bg-slate-100 dark:bg-slate-800 py-4 px-4 rounded-2xl items-center mt-2 mb-4'
                  )}
                >
                  <Text
                    style={tw(
                      'text-slate-600 dark:text-slate-300 font-medium text-xs text-center leading-5'
                    )}
                  >
                    {t(
                      'mobile.free_plan_auto_after_expiry',
                      'Gói miễn phí không yêu cầu thanh toán và sẽ tự áp dụng khi gói trả phí hiện tại hết hạn.'
                    )}
                  </Text>
                </View>
              )
            ) : (
              (() => {
                const isDowngrade = planActionKind === 'schedule_downgrade';
                const isRenew = planActionKind === 'schedule_renew';
                const isImmediateUpgrade = planActionKind === 'upgrade_now';

                const ctaBg = isDowngrade
                  ? 'bg-amber-600 dark:bg-amber-500'
                  : isRenew
                    ? 'bg-emerald-600 dark:bg-emerald-500'
                    : 'bg-slate-900 dark:bg-white';
                const ctaText =
                  isDowngrade || isRenew
                    ? 'text-white dark:text-slate-950'
                    : 'text-white dark:text-slate-900';

                const ctaLabel =
                  planActionKind === 'upgrade_now'
                    ? t('mobile.upgrade_to_plan_vnpay', 'Nâng cấp lên {{name}} qua VNPAY', {
                        name: selectedPlan.name,
                      })
                    : planActionKind === 'schedule_renew'
                      ? t('mobile.schedule_renew_btn', 'Gia hạn {{name}} cho chu kỳ sau', {
                          name: selectedPlan.name,
                        })
                      : planActionKind === 'schedule_downgrade'
                        ? t('mobile.schedule_downgrade_btn', 'Đặt lịch chuyển sang {{name}}', {
                            name: selectedPlan.name,
                          })
                        : t('mobile.schedule_upgrade_btn', 'Đặt lịch nâng lên {{name}}', {
                            name: selectedPlan.name,
                          });

                return (
                  <View style={tw('mt-2 mb-4')}>
                    {isDowngrade ? (
                      <View
                        style={tw(
                          'bg-amber-50 dark:bg-amber-950/30 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 flex-row items-start mb-3'
                        )}
                      >
                        <AlertCircle
                          size={18}
                          color={twInstance.color('text-amber-600 dark:text-amber-400')}
                          style={tw('mt-0.5')}
                        />
                        <Text
                          style={tw(
                            'text-amber-800 dark:text-amber-300 text-xs leading-5 ml-2.5 flex-1'
                          )}
                        >
                          {t(
                            'mobile.downgrade_warning_hint',
                            'Gói {{target}} có quyền lợi thấp hơn gói {{current}} bạn đang dùng. Nếu đặt lịch, gói mới sẽ bắt đầu từ {{date}}.',
                            {
                              target: selectedPlan.name,
                              current: effectiveSub?.plan?.name || currentPlan?.name || '',
                              date: formattedCurrentExpiry,
                            }
                          )}
                        </Text>
                      </View>
                    ) : !isImmediateUpgrade ? (
                      <View
                        style={tw(
                          'bg-indigo-50/80 dark:bg-indigo-950/30 p-3 rounded-2xl border border-indigo-200/80 dark:border-indigo-900 flex-row items-center mb-3'
                        )}
                      >
                        <Calendar
                          size={16}
                          color={twInstance.color('text-indigo-600 dark:text-indigo-400')}
                        />
                        <Text
                          style={tw(
                            'text-indigo-800 dark:text-indigo-300 text-xs leading-4 ml-2 flex-1'
                          )}
                        >
                          {t(
                            'mobile.schedule_effective_hint',
                            'Áp dụng cho chu kỳ tiếp theo từ {{date}}. Gói hiện tại vẫn giữ nguyên đến hết hạn.',
                            { date: formattedCurrentExpiry }
                          )}
                        </Text>
                      </View>
                    ) : null}

                    <TouchableOpacity
                      onPress={() => {
                        if (isImmediateUpgrade) {
                          void handleUpgrade();
                        } else {
                          setConfirmModalVisible(true);
                        }
                      }}
                      disabled={isProcessingOrder}
                      style={tw(
                        `${ctaBg} py-4 px-4 rounded-2xl flex-row items-center justify-center shadow-md ${
                          isProcessingOrder ? 'opacity-70' : ''
                        }`
                      )}
                    >
                      {isProcessingOrder ? (
                        <ActivityIndicator
                          color={twInstance.color(ctaText)}
                          size="small"
                          style={tw('mr-2')}
                        />
                      ) : null}
                      <Text style={tw(`${ctaText} font-bold text-base text-center mr-2 shrink`)}>
                        {isProcessingOrder
                          ? t('mobile.creating_order', 'Đang tạo đơn...')
                          : ctaLabel}
                      </Text>
                      <ArrowRight color={twInstance.color(ctaText)} size={20} />
                    </TouchableOpacity>
                  </View>
                );
              })()
            )
          ) : null}
        </View>

        {/* Trust Badges */}
        <View style={tw('flex-row justify-center gap-6 px-6 mt-2')}>
          <View style={tw('items-center')}>
            <ShieldCheck color={twInstance.color('text-slate-400')} size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>
              {t('mobile.secure_payment', 'Xác thực thanh toán VNPAY')}
            </Text>
          </View>
          <View style={tw('items-center')}>
            <Zap color={twInstance.color('text-slate-400')} size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>
              {t('mobile.instant_activation', 'Kích hoạt quyền lợi tự động')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Plan Detail Modal */}
      <Modal
        visible={planDetailModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setPlanDetailModalVisible(false)}
      >
        <View style={tw('flex-1 bg-black/60 justify-end')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[85%]')}>
            <View
              style={tw(
                'flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                  {planDetail?.name || t('mobile.plan_details', 'Chi tiết gói')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                  {planDetail?.code} • v{planDetail?.version ?? 1}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setPlanDetailModalVisible(false)}
                style={tw('p-2')}
              >
                <X color={twInstance.color('text-slate-400')} size={24} />
              </TouchableOpacity>
            </View>

            {loadingPlanDetail ? (
              <View style={tw('py-6 gap-3')}>
                <Skeleton className="h-5 w-1/2 rounded" />
                <Skeleton className="h-20 w-full rounded-2xl" />
                <Skeleton className="h-24 w-full rounded-2xl" />
              </View>
            ) : planDetail ? (
              <ScrollView style={tw('mt-4')} showsVerticalScrollIndicator={false}>
                {planDetail.description ? (
                  <Text style={tw('text-sm text-slate-600 dark:text-slate-300 mb-4 leading-5')}>
                    {planDetail.description}
                  </Text>
                ) : null}

                <View
                  style={tw(
                    'bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 gap-2'
                  )}
                >
                  <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400')}>
                    {t('mobile.quota_specifications', 'Thông số hạn mức')}
                  </Text>
                  <Text style={tw('text-sm text-slate-800 dark:text-slate-200')}>
                    • {t('mobile.price_label', 'Giá gói')}:{' '}
                    <Text style={tw('font-bold')}>
                      {formatMoney(
                        planDetail.price,
                        planDetail.currency,
                        t('mobile.free_price', 'Miễn phí'),
                        dateLocale
                      )}
                    </Text>
                  </Text>
                  <Text style={tw('text-sm text-slate-800 dark:text-slate-200')}>
                    • {t('mobile.duration_label', 'Thời hạn')}: {planDetail.durationDays}{' '}
                    {t('mobile.days_unit', 'ngày')}
                  </Text>
                  <Text style={tw('text-sm text-slate-800 dark:text-slate-200')}>
                    • {t('mobile.consultations_quota_label', 'Lượt tư vấn bác sĩ')}:{' '}
                    {planDetail.quota.consultationLimitPerCycle}
                  </Text>
                  <Text style={tw('text-sm text-slate-800 dark:text-slate-200')}>
                    • {t('mobile.ai_requests_quota_label', 'Lượt hỏi đáp AI')}:{' '}
                    {planDetail.quota.aiRequestLimit.toLocaleString(dateLocale)} (
                    {planDetail.quota.aiTokenLimit.toLocaleString(dateLocale)}{' '}
                    {t('mobile.tokens_unit', 'token')})
                  </Text>
                  <Text style={tw('text-sm text-slate-800 dark:text-slate-200')}>
                    • {t('mobile.care_program_quota_label', 'Chương trình chăm sóc tối đa')}:{' '}
                    {planDetail.quota.activeCareProgramLimit.toLocaleString(dateLocale)}
                  </Text>
                  <Text style={tw('text-sm text-slate-800 dark:text-slate-200')}>
                    • {t('mobile.family_link_quota_label', 'Liên kết gia đình tối đa')}:{' '}
                    {(planDetail.quota.familyLinkLimit ?? 0).toLocaleString(dateLocale)}
                  </Text>
                </View>

                {(() => {
                  const formattedBenefits = formatPlanBenefits(
                    planDetail.benefits,
                    t,
                    dateLocale
                  );
                  if (
                    formattedBenefits.rows.length === 0 &&
                    formattedBenefits.highlights.length === 0
                  ) {
                    return null;
                  }
                  return (
                    <View
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl border border-slate-200 dark:border-slate-700 mb-4 gap-2'
                      )}
                    >
                      <Text
                        style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400')}
                      >
                        {t('mobile.included_benefits', 'Quyền lợi bổ sung')}
                      </Text>
                      {formattedBenefits.rows.map((row) => (
                        <View
                          key={row.key}
                          style={tw('flex-row justify-between items-center py-0.5')}
                        >
                          <Text style={tw('text-xs text-slate-600 dark:text-slate-300 flex-1 mr-3')}>
                            {row.label}
                          </Text>
                          <Text
                            style={tw(
                              `text-xs font-bold ${
                                row.isBoolean
                                  ? row.boolValue
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : 'text-slate-400 dark:text-slate-500'
                                  : 'text-slate-900 dark:text-white'
                              }`
                            )}
                          >
                            {row.valueText}
                          </Text>
                        </View>
                      ))}
                      {formattedBenefits.highlights.length > 0 ? (
                        <View
                          style={tw(
                            `${
                              formattedBenefits.rows.length > 0
                                ? 'pt-2 mt-1 border-t border-slate-200 dark:border-slate-700'
                                : ''
                            } gap-1`
                          )}
                        >
                          <Text style={tw('text-xs font-semibold text-slate-700 dark:text-slate-200')}>
                            {t('mobile.plan_benefit_highlights', 'Tính năng nổi bật')}
                          </Text>
                          {formattedBenefits.highlights.map((item, idx) => (
                            <Text
                              key={`hl-${idx}`}
                              style={tw('text-xs text-slate-600 dark:text-slate-300 pl-2 leading-4')}
                            >
                              • {item}
                            </Text>
                          ))}
                        </View>
                      ) : null}
                    </View>
                  );
                })()}
              </ScrollView>
            ) : null}
          </View>
          <AppModalToast visible={planDetailModalVisible} />
        </View>
      </Modal>

      {/* Orders & Subscription History Modal */}
      <Modal
        visible={orderHistoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderHistoryModalVisible(false)}
      >
        <View style={tw('flex-1 bg-black/60 justify-end')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[88%]')}>
            <View
              style={tw(
                'flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.orders_and_subscriptions', 'Lịch sử Đơn hàng & Đăng ký')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                  {t('mobile.orders_subscriptions_subtitle', 'Theo dõi giao dịch VNPAY và gói đã dùng')}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setSelectedOrderDetail(null);
                  setOrderHistoryModalVisible(false);
                }}
                style={tw('p-2')}
              >
                <X color={twInstance.color('text-slate-400')} size={24} />
              </TouchableOpacity>
            </View>

            {/* Modal Tabs */}
            <View style={tw('flex-row bg-slate-100 dark:bg-slate-800 p-1 rounded-2xl mt-4')}>
              <TouchableOpacity
                onPress={() => setHistoryTab('orders')}
                style={tw(
                  `flex-1 py-2 rounded-xl items-center ${
                    historyTab === 'orders' ? 'bg-white dark:bg-slate-900' : ''
                  }`
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-bold ${
                      historyTab === 'orders'
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`
                  )}
                >
                  {t('mobile.payment_orders_list', 'Đơn thanh toán')} ({orders.length})
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => setHistoryTab('subscriptions')}
                style={tw(
                  `flex-1 py-2 rounded-xl items-center ${
                    historyTab === 'subscriptions' ? 'bg-white dark:bg-slate-900' : ''
                  }`
                )}
              >
                <Text
                  style={tw(
                    `text-xs font-bold ${
                      historyTab === 'subscriptions'
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-500 dark:text-slate-400'
                    }`
                  )}
                >
                  {t('mobile.subscriptions_history', 'Gói đăng ký')} ({subscriptions.length})
                </Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={tw('mt-4')} showsVerticalScrollIndicator={false}>
              {/* IPN Authority Notice */}
              <View
                style={tw(
                  'bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900 mb-4 flex-row items-start'
                )}
              >
                <Info
                  size={18}
                  color={twInstance.color('text-blue-600 dark:text-blue-400')}
                  style={tw('mt-0.5 mr-2.5')}
                />
                <Text style={tw('text-xs text-blue-800 dark:text-blue-300 flex-1 leading-4')}>
                  {t(
                    'mobile.ipn_authority_notice',
                    'Đơn hàng chỉ chuyển sang đã thanh toán khi ngân hàng xác nhận giao dịch hợp lệ. Trang kết quả thanh toán chỉ hiển thị trạng thái chờ xác minh.'
                  )}
                </Text>
              </View>

              {historyTab === 'orders' ? (
                <>
                  {selectedOrderDetail ? (
                    <View
                      style={tw(
                        'bg-indigo-50/70 dark:bg-indigo-950/30 p-4 rounded-2xl mb-4 border border-indigo-200 dark:border-indigo-900'
                      )}
                    >
                      <View style={tw('flex-row justify-between items-center mb-2')}>
                        <Text style={tw('text-sm font-bold text-slate-900 dark:text-white')}>
                          {selectedOrderDetail.orderCode}
                        </Text>
                        <TouchableOpacity onPress={() => setSelectedOrderDetail(null)}>
                          <X size={18} color={twInstance.color('text-slate-500')} />
                        </TouchableOpacity>
                      </View>
                      <Text style={tw('text-xs text-slate-700 dark:text-slate-300')}>
                        {t('mobile.plan_prefix', 'Gói:')}{' '}
                        {selectedOrderDetail.plan?.name} (v
                        {selectedOrderDetail.plan?.version})
                      </Text>
                      <Text style={tw('text-xs text-slate-700 dark:text-slate-300 mt-1')}>
                        {t('mobile.status_label', 'Trạng thái')}:{' '}
                        {orderStatusText(selectedOrderDetail.status)}
                      </Text>
                      {selectedOrderDetail.expiresAt &&
                      (selectedOrderDetail.status === 'created' ||
                        selectedOrderDetail.status === 'pending' ||
                        selectedOrderDetail.status === 'processing' ||
                        selectedOrderDetail.status === 'expired') ? (
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                          {t('mobile.order_payment_deadline', 'Hạn thanh toán đơn')}:{' '}
                          {formatDateTime(selectedOrderDetail.expiresAt)}
                        </Text>
                      ) : null}
                      {selectedOrderDetail.paidAt ? (
                        <Text style={tw('text-xs text-emerald-700 dark:text-emerald-400 mt-1')}>
                          {t('mobile.paid_at', 'Thanh toán lúc')}:{' '}
                          {formatDateTime(selectedOrderDetail.paidAt)}
                        </Text>
                      ) : null}
                      {selectedOrderDetail.cancelledAt ? (
                        <Text style={tw('text-xs text-red-600 dark:text-red-400 mt-1')}>
                          {t('mobile.cancelled_at', 'Huỷ lúc')}:{' '}
                          {formatDateTime(selectedOrderDetail.cancelledAt)}
                        </Text>
                      ) : null}
                    </View>
                  ) : null}

                  {orders.length === 0 ? (
                    <View style={tw('py-10 items-center')}>
                      <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                        {t('mobile.no_orders_yet', 'Bạn chưa có đơn thanh toán nào.')}
                      </Text>
                    </View>
                  ) : (
                    orders.map((ord) => {
                      const badge = getOrderStatusBadge(ord.status);
                      const isCancelling = cancellingOrderId === ord.id;
                      return (
                        <TouchableOpacity
                          key={ord.id}
                          onPress={() => void handleOpenOrderDetail(ord.id)}
                          activeOpacity={0.85}
                          style={tw(
                            'bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-800'
                          )}
                        >
                          <View style={tw('flex-row justify-between items-start mb-2')}>
                            <View style={tw('flex-1 mr-3')}>
                              <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>
                                {ord.orderCode} • {ord.plan?.name || ord.plan?.code}
                              </Text>
                              <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                                {formatDateTime(ord.createdAt)}
                              </Text>
                            </View>
                            <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>
                              {formatMoney(
                                ord.amount,
                                ord.currency,
                                t('mobile.free_price', '0đ'),
                                dateLocale
                              )}
                            </Text>
                          </View>
                          <View style={tw('flex-row items-center justify-between mt-2')}>
                            <View style={tw(`px-2.5 py-1 rounded-full shrink-0 ${badge.bg}`)}>
                              <Text
                                style={tw(`text-[10px] font-bold ${badge.text}`)}
                                numberOfLines={1}
                              >
                                {badge.label}
                              </Text>
                            </View>
                            {(ord.status === 'created' || ord.status === 'pending') && (
                              <TouchableOpacity
                                onPress={() => void handleCancelOrder(ord.id)}
                                disabled={isCancelling}
                                style={tw(
                                  `bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-xl ${
                                    isCancelling ? 'opacity-60' : ''
                                  }`
                                )}
                              >
                                <Text style={tw('text-xs font-bold text-red-700 dark:text-red-400')}>
                                  {isCancelling
                                    ? t('mobile.processing', 'Đang xử lý...')
                                    : t('mobile.cancel_unpaid_order', 'Hủy đơn')}
                                </Text>
                              </TouchableOpacity>
                            )}
                          </View>
                        </TouchableOpacity>
                      );
                    })
                  )}
                </>
              ) : subscriptions.length === 0 ? (
                <View style={tw('py-10 items-center')}>
                  <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                    {t('mobile.no_subscriptions_yet', 'Chưa có lịch sử gói đăng ký.')}
                  </Text>
                </View>
              ) : (
                subscriptions.map((sub) => {
                  const subBadge = getSubscriptionStatusBadge(String(sub.status));
                  return (
                    <View
                      key={sub.subscriptionId}
                      style={tw(
                        'bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-800'
                      )}
                    >
                      <View style={tw('flex-row justify-between items-center mb-1.5')}>
                        <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>
                          {sub.plan.name} (v{sub.plan.version})
                        </Text>
                        <View style={tw(`px-2.5 py-0.5 rounded-full shrink-0 ${subBadge.bg}`)}>
                          <Text
                            style={tw(`text-[10px] font-bold ${subBadge.text}`)}
                            numberOfLines={1}
                          >
                            {subBadge.label}
                          </Text>
                        </View>
                      </View>
                      <View style={tw('flex-row items-center mt-1')}>
                        <Clock size={12} color={twInstance.color('text-slate-400')} />
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 ml-1.5')}>
                          {formatDateTime(sub.startedAt)} → {formatDateTime(sub.expiresAt)}
                        </Text>
                      </View>
                      <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400 mt-1.5')}>
                        {sub.entitlement.consultationLimitPerCycle}{' '}
                        {t('mobile.consultations_per_cycle_short', 'lượt tư vấn')} •{' '}
                        {sub.entitlement.aiRequestLimit} {t('mobile.requests_unit', 'lượt')} AI •{' '}
                        {sub.entitlement.familyLinkLimit ?? 0}{' '}
                        {t('mobile.family_links_short', 'liên kết gia đình')}
                      </Text>
                    </View>
                  );
                })
              )}
            </ScrollView>
          </View>
          <AppModalToast visible={orderHistoryModalVisible} />
        </View>
      </Modal>

      {/* VNPAY Active Payment Modal */}
      <Modal
        visible={orderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => {
          stopPolling();
          setOrderModalVisible(false);
        }}
      >
        <View style={tw('flex-1 bg-black/60 justify-end')}>
          <View
            style={tw(
              'bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800'
            )}
          >
            <View
              style={tw(
                'flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800'
              )}
            >
              <View style={tw('flex-1 mr-3')}>
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.vnpay_qr_payment_title', 'Thanh toán VNPAY')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                  {t('mobile.order_code_label', 'Mã đơn')}: {currentOrder?.orderCode} •{' '}
                  {currentOrder?.planName}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => {
                  stopPolling();
                  setOrderModalVisible(false);
                }}
                style={tw('p-2')}
              >
                <X color={twInstance.color('text-slate-400')} size={24} />
              </TouchableOpacity>
            </View>

            <View style={tw('items-center my-6')}>
              {currentOrder?.paymentQrDataUrl ? (
                <View
                  style={tw('p-4 bg-white rounded-2xl border border-slate-200 shadow-sm items-center')}
                >
                  <Image
                    source={{ uri: currentOrder.paymentQrDataUrl }}
                    style={{ width: 200, height: 200 }}
                    resizeMode="contain"
                  />
                  <Text style={tw('text-xs text-slate-500 mt-2 font-medium text-center')}>
                    {t(
                      'mobile.scan_with_banking_app',
                      'Quét mã bằng camera điện thoại để mở cổng thanh toán VNPAY'
                    )}
                  </Text>
                </View>
              ) : (
                <View
                  style={tw(
                    'w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl items-center justify-center p-4'
                  )}
                >
                  <QrCode color={twInstance.color('text-slate-400')} size={64} />
                  <Text style={tw('text-xs text-slate-500 dark:text-slate-400 text-center mt-2')}>
                    {t('mobile.opening_vnpay_page', 'Đang chờ xác nhận từ cổng VNPAY...')}
                  </Text>
                </View>
              )}

              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white mt-4')}>
                {formatMoney(
                  currentOrder?.amount ?? 0,
                  currentOrder?.currency,
                  t('mobile.free_price', '0đ'),
                  dateLocale
                )}
              </Text>

              <View
                style={tw(
                  'flex-row items-center mt-3 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full'
                )}
              >
                <ActivityIndicator
                  size="small"
                  color={twInstance.color('text-amber-500')}
                  style={tw('mr-2')}
                />
                <Text style={tw('text-xs font-semibold text-amber-700 dark:text-amber-400')}>
                  {t('mobile.waiting_payment_confirmation', 'Đang chờ xác nhận thanh toán')} •{' '}
                  {orderStatusText(pollingStatus)}
                </Text>
              </View>
            </View>

            <View style={tw('gap-3 pb-4')}>
              {currentOrder?.paymentUrl ? (
                <TouchableOpacity
                  onPress={() =>
                    currentOrder.paymentUrl && Linking.openURL(currentOrder.paymentUrl).catch(() => {})
                  }
                  style={tw('bg-blue-600 py-3.5 rounded-2xl items-center justify-center')}
                >
                  <Text style={tw('text-white font-bold text-base')}>
                    {t('mobile.reopen_vnpay_page', 'Mở trang thanh toán VNPAY')}
                  </Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() => void handleManualVerifyOrder()}
                disabled={isCheckingOrder}
                style={tw(
                  `bg-emerald-600 py-3.5 rounded-2xl items-center justify-center ${
                    isCheckingOrder ? 'opacity-70' : ''
                  }`
                )}
              >
                <Text style={tw('text-white font-bold text-base')}>
                  {isCheckingOrder
                    ? t('mobile.checking_status', 'Đang kiểm tra...')
                    : t('mobile.check_payment_status', 'Kiểm tra trạng thái thanh toán')}
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => currentOrder?.id && void handleCancelOrder(currentOrder.id)}
                disabled={!currentOrder?.id || cancellingOrderId === currentOrder?.id}
                style={tw(
                  `bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center justify-center ${
                    cancellingOrderId === currentOrder?.id ? 'opacity-60' : ''
                  }`
                )}
              >
                <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-base')}>
                  {cancellingOrderId === currentOrder?.id
                    ? t('mobile.processing', 'Đang xử lý...')
                    : t('mobile.cancel_order_btn', 'Hủy đơn hàng')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
          <AppModalToast visible={orderModalVisible} />
        </View>
      </Modal>

      <PlanChangeConfirmModal
        visible={
          confirmModalVisible &&
          (planActionKind === 'schedule_upgrade' ||
            planActionKind === 'schedule_renew' ||
            planActionKind === 'schedule_downgrade')
        }
        mode={
          planActionKind === 'schedule_downgrade' || planActionKind === 'schedule_renew'
            ? planActionKind
            : 'schedule_upgrade'
        }
        currentPlanName={
          effectiveSub?.plan?.name || currentPlan?.name || t('mobile.free_tier', 'Gói Miễn phí')
        }
        currentPrice={currentPlan?.price ?? null}
        currentCurrency={currentPlan?.currency || 'VND'}
        currentQuota={effectiveSub?.entitlement ?? currentPlan?.quota ?? null}
        targetPlan={selectedPlan}
        effectiveAtFormatted={formattedCurrentExpiry}
        isProcessing={isProcessingOrder}
        onClose={() => {
          if (!isProcessingOrder) setConfirmModalVisible(false);
        }}
        onConfirm={() => void handleUpgrade()}
      />
    </SafeAreaView>
  );
}
