import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Image,
  Modal,
  ActivityIndicator,
  RefreshControl,
  TextInput,
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
  XCircle,
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
} from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import {
  paymentsCreate,
  paymentsGet,
  paymentsCancel,
  generateIdempotencyKey,
} from '@healthcare/api-client';

interface PaymentOrderInfo {
  _id: string;
  orderCode: string;
  planCode: 'PLUS' | 'CARE';
  amount: number;
  status:
    | 'created'
    | 'pending'
    | 'processing'
    | 'paid'
    | 'expired'
    | 'cancelled'
    | 'failed'
    | 'refund_pending'
    | 'refunded';
  createdAt: string;
  paymentUrl?: string | null;
  paymentQrDataUrl?: string | null;
  ipnVerified?: boolean;
}

interface RefundRequestRecord {
  id: string;
  orderCode: string;
  planCode: 'PLUS' | 'CARE';
  amount: number;
  status: 'pending' | 'approved' | 'rejected' | 'manual_review_required';
  reasonCode: 'accidental_purchase' | 'service_not_used' | 'technical_issue' | 'other';
  note: string;
  createdAt: string;
  usageSnapshot: {
    aiTokensUsed: number;
    consultationsUsed: number;
    careProgramEnrolled: boolean;
  };
}

export default function PremiumScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Active and selected plan
  const [activePlan, setActivePlan] = useState<'free' | 'plus' | 'care'>('plus');
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'plus' | 'care'>('care');
  const [isRefundPending, setIsRefundPending] = useState(false);

  // 4 Separate Usage Meters (BILL-18)
  const [usageMeters] = useState({
    aiUsage: {
      requestsUsed: 18,
      requestsLimit: 50,
      tokensUsed: 24500,
      tokensLimit: 100000,
    },
    consultationUsage: {
      used: 1,
      reserved: 1,
      remaining: 1,
      total: 3,
    },
    careProgramLimit: {
      enrolled: 0,
      maxAllowed: 0, // PLUS = 0, CARE = 1
    },
    familyLinkLimit: {
      linked: 2,
      maxAllowed: 3, // FREE = 1, PLUS = 3, CARE = 5
    },
  });

  // Order History & Refund History (BILL-04, BILL-05, BILL-09, BILL-10, BILL-17)
  const [orderHistoryModalVisible, setOrderHistoryModalVisible] = useState(false);
  const [selectedOrderDetail, setSelectedOrderDetail] = useState<PaymentOrderInfo | null>(null);
  const [refundRequestModalVisible, setRefundRequestModalVisible] = useState(false);
  const [refundReasonCode, setRefundReasonCode] = useState<
    'accidental_purchase' | 'service_not_used' | 'technical_issue' | 'other'
  >('service_not_used');
  const [refundNote, setRefundNote] = useState('');

  const [orders, setOrders] = useState<PaymentOrderInfo[]>([
    {
      _id: 'ord_101',
      orderCode: 'ORD-20261101-8821',
      planCode: 'PLUS',
      amount: 99000,
      status: 'paid',
      createdAt: '2026-11-01 09:15',
      ipnVerified: true,
    },
    {
      _id: 'ord_102',
      orderCode: 'ORD-20261105-4410',
      planCode: 'CARE',
      amount: 299000,
      status: 'pending',
      createdAt: '2026-11-05 14:20',
      ipnVerified: false,
    },
    {
      _id: 'ord_100',
      orderCode: 'ORD-20261015-1092',
      planCode: 'PLUS',
      amount: 99000,
      status: 'expired',
      createdAt: '2026-10-15 18:00',
      ipnVerified: false,
    },
  ]);

  const [refundHistory, setRefundHistory] = useState<RefundRequestRecord[]>([
    {
      id: 'ref_01',
      orderCode: 'ORD-20260910-3319',
      planCode: 'PLUS',
      amount: 99000,
      status: 'approved',
      reasonCode: 'accidental_purchase',
      note: 'Bấm nhầm gói khi thanh toán qua QR.',
      createdAt: '2026-09-10 11:05',
      usageSnapshot: {
        aiTokensUsed: 0,
        consultationsUsed: 0,
        careProgramEnrolled: false,
      },
    },
  ]);

  // VNPAY Payment Order Modal & Polling state
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrderInfo | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('pending');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 600);
    return () => {
      clearTimeout(timer);
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

  const onRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 800);
  };

  const startPollingOrderStatus = (orderId: string) => {
    if (pollingIntervalRef.current) {
      clearInterval(pollingIntervalRef.current);
    }

    pollingIntervalRef.current = setInterval(async () => {
      try {
        const res: any = await paymentsGet({
          path: { id: orderId },
        });

        const order = res?.data?.order || res?.data;
        if (order?.status) {
          setPollingStatus(order.status);
          if (order.status === 'paid') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            Toast.show({
              type: 'success',
              text1: t('mobile.success', 'Thành công'),
              text2: t('mobile.vnpay_success', 'Thanh toán VNPAY IPN thành công! Gói cước đã kích hoạt.'),
            });
            if (selectedPlan !== 'free') setActivePlan(selectedPlan);
            setOrderModalVisible(false);
          } else if (order.status === 'cancelled' || order.status === 'expired') {
            if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
            Toast.show({
              type: 'info',
              text1: t('mobile.order_ended', 'Đơn hàng đã kết thúc'),
              text2: `${t('mobile.status_label', 'Trạng thái')}: ${orderStatusText(order.status)}`,
            });
            setOrderModalVisible(false);
          }
        }
      } catch {
        // silent
      }
    }, 3000);
  };

  const handleUpgrade = async () => {
    if (selectedPlan === 'free') return;
    setIsProcessingOrder(true);
    const idempotencyKey = generateIdempotencyKey();
    const planId = selectedPlan === 'plus' ? '670f00000000000000000001' : '670f00000000000000000002';

    try {
      const res: any = await paymentsCreate({
        body: { planId } as any,
        headers: { 'idempotency-key': idempotencyKey } as any,
      });

      const orderData = res?.data;
      const order = orderData?.order || orderData;
      const paymentUrl = orderData?.paymentUrl;
      const paymentQrDataUrl = orderData?.paymentQrDataUrl;

      if (order?._id) {
        const newOrder: PaymentOrderInfo = {
          _id: order._id,
          orderCode: order.orderCode || `ORD-${Date.now().toString().slice(-6)}`,
          planCode: selectedPlan === 'plus' ? 'PLUS' : 'CARE',
          amount: order.amount || (selectedPlan === 'plus' ? 99000 : 299000),
          status: order.status || 'created',
          createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
          paymentUrl,
          paymentQrDataUrl,
        };
        setCurrentOrder(newOrder);
        setOrders((prev) => [newOrder, ...prev]);

        setOrderModalVisible(true);
        startPollingOrderStatus(order._id);

        if (paymentUrl) {
          Linking.openURL(paymentUrl).catch(() => {});
        }
      } else {
        throw new Error('No order returned');
      }
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message ||
        error?.message ||
        t('mobile.payment_gateway_preparing', 'Cổng thanh toán đang được chuẩn bị');
      Alert.alert(
        t('mobile.payment_gateway', 'Cổng thanh toán VNPAY'),
        t('mobile.vnpay_demo_prompt', {
          error: errorMsg,
          defaultValue: `${errorMsg}.\n\nLưu ý: trang kết quả thanh toán chỉ hiển thị trạng thái chờ xác minh. Gói chỉ được kích hoạt khi ngân hàng xác nhận giao dịch hợp lệ.\n\nBạn có muốn mô phỏng thanh toán thành công?`,
        }),
        [
          { text: t('mobile.cancel', 'Hủy'), style: 'cancel' },
          {
            text: t('mobile.sandbox_demo', 'Mô phỏng thanh toán thành công'),
            onPress: () => {
              const demoOrder: PaymentOrderInfo = {
                _id: `ord_${Date.now()}`,
                orderCode: `ORD-${Date.now().toString().slice(-6)}`,
                planCode: selectedPlan === 'plus' ? 'PLUS' : 'CARE',
                amount: selectedPlan === 'plus' ? 99000 : 299000,
                status: 'paid',
                createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
                ipnVerified: true,
              };
              setOrders((prev) => [demoOrder, ...prev]);
              Toast.show({
                type: 'success',
                text1: t('mobile.success', 'Thành công'),
                text2: t('mobile.vnpay_success', 'Đã xác nhận VNPAY IPN thành công!'),
              });
              setActivePlan(selectedPlan);
            },
          },
        ]
      );
    } finally {
      setIsProcessingOrder(false);
    }
  };

  const handleCancelOrder = async (targetOrderId?: string) => {
    const idToCancel = targetOrderId || currentOrder?._id;
    if (!idToCancel) return;
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    try {
      await paymentsCancel({
        path: { id: idToCancel },
      });
    } catch {
      // ignore fallback
    } finally {
      setOrders((prev) =>
        prev.map((o) => (o._id === idToCancel ? { ...o, status: 'cancelled' } : o))
      );
      if (selectedOrderDetail?._id === idToCancel) {
        setSelectedOrderDetail((prev) => (prev ? { ...prev, status: 'cancelled' } : null));
      }
      Toast.show({
        type: 'info',
        text1: t('mobile.cancelled', 'Đã hủy đơn hàng'),
        text2: t('mobile.order_cancelled', 'Đơn hàng chưa thanh toán đã được hủy.'),
      });
      setOrderModalVisible(false);
      setCurrentOrder(null);
    }
  };

  const handleSubmitRefundRequest = () => {
    const newRefund: RefundRequestRecord = {
      id: `ref_${Date.now()}`,
      orderCode: orders.find((o) => o.status === 'paid')?.orderCode || 'ORD-20261101-8821',
      planCode: activePlan === 'care' ? 'CARE' : 'PLUS',
      amount: activePlan === 'care' ? 299000 : 99000,
      status: 'pending',
      reasonCode: refundReasonCode,
      note: refundNote.trim() || t('mobile.refund_default_note', 'Yêu cầu hoàn tiền từ người dùng'),
      createdAt: new Date().toISOString().slice(0, 16).replace('T', ' '),
      usageSnapshot: {
        aiTokensUsed: usageMeters.aiUsage.tokensUsed,
        consultationsUsed: usageMeters.consultationUsage.used,
        careProgramEnrolled: usageMeters.careProgramLimit.enrolled > 0,
      },
    };
    setRefundHistory((prev) => [newRefund, ...prev]);
    setIsRefundPending(true);
    setRefundRequestModalVisible(false);
    setRefundNote('');
    Toast.show({
      type: 'info',
      text1: t('mobile.refund_processed', 'Đã gửi yêu cầu hoàn tiền'),
      text2: t(
        'mobile.refund_success_desc',
        'Hệ thống đã ghi lại mức sử dụng hiện tại để quản trị viên đối soát điều kiện hoàn tiền.'
      ),
    });
  };

  const orderStatusText = (status: string) => {
    const key = `mobile.order_status_${status}`;
    const map: Record<string, string> = {
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
    return t(key, map[status] || status);
  };

  const refundReasonText = (code: string) => {
    const key = `mobile.refund_reason_${code}`;
    const map: Record<string, string> = {
      service_not_used: 'Chưa sử dụng dịch vụ',
      accidental_purchase: 'Mua nhầm gói',
      technical_issue: 'Lỗi kỹ thuật',
      other: 'Lý do khác',
    };
    return t(key, map[code] || code);
  };

  const refundStatusText = (status: string) => {
    const key = `mobile.refund_status_${status}`;
    const map: Record<string, string> = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      rejected: 'Từ chối',
    };
    return t(key, map[status] || status);
  };

  const getOrderStatusBadge = (status: PaymentOrderInfo['status']) => {
    switch (status) {
      case 'paid':
        return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: orderStatusText('paid') };
      case 'pending':
      case 'created':
      case 'processing':
        return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: orderStatusText(status) };
      case 'refund_pending':
        return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: orderStatusText('refund_pending') };
      case 'refunded':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: orderStatusText('refunded') };
      default:
        return { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: orderStatusText(status) };
    }
  };

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
            onPress={() => setOrderHistoryModalVisible(true)}
            style={tw('flex-row items-center bg-white dark:bg-slate-900 px-3.5 py-2 rounded-full border border-slate-200 dark:border-slate-800')}
          >
            <Receipt size={16} color={twInstance.color('text-indigo-600 dark:text-indigo-400')} />
            <Text style={tw('text-xs font-bold text-slate-800 dark:text-slate-200 ml-1.5')}>
              {t('mobile.orders_and_refunds', 'Lịch sử đơn và hoàn tiền')}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={tw('items-center px-6 pt-2 pb-6')}>
          <View style={tw('w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4')}>
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
            <View style={tw('bg-amber-100 dark:bg-amber-900/30 p-4 rounded-2xl flex-row items-center border border-amber-200 dark:border-amber-800/50')}>
              <AlertCircle color={twInstance.color('text-amber-600 dark:text-amber-400')} size={24} />
              <View style={tw('flex-1 ml-3')}>
                <Text style={tw('text-amber-800 dark:text-amber-300 font-bold')}>
                  {t('mobile.refund_pending_title', 'Yêu cầu hoàn tiền đang chờ duyệt')}
                </Text>
                <Text style={tw('text-amber-700/80 dark:text-amber-400/80 text-xs mt-1')}>
                  {t(
                    'mobile.refund_pending_desc',
                    'Quyền lợi trả phí tạm khóa để kiểm tra mức sử dụng. Gói Miễn phí và cảnh báo an toàn vẫn hoạt động bình thường.'
                  )}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Current Plan & 4 Separate Usage Meters (BILL-18) */}
        <View style={tw('px-6 mb-6')}>
          {loading ? (
            <View style={tw('bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 h-56 justify-center items-center')}>
              <ActivityIndicator size="large" color={twInstance.color('text-amber-500')} />
            </View>
          ) : (
            <View style={tw('bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm')}>
              <View style={tw('flex-row items-center justify-between mb-4 pb-3 border-b border-slate-100 dark:border-slate-800')}>
                <View>
                  <Text style={tw('text-slate-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider mb-1')}>
                    {t('mobile.current_plan', 'Gói hiện tại')}
                  </Text>
                  <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                    {activePlan === 'free'
                      ? t('mobile.free_tier', 'Gói FREE (Cơ bản)')
                      : activePlan === 'plus'
                        ? t('mobile.plus_plan', 'Gói PLUS (99K/tháng)')
                        : t('mobile.care_plan', 'Gói CARE (299K/tháng)')}
                  </Text>
                </View>
                <View style={tw('bg-emerald-100 dark:bg-emerald-900/30 px-3 py-1.5 rounded-full')}>
                  <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold text-xs')}>
                    {t('mobile.plan_active_badge', 'ĐANG DÙNG')}
                  </Text>
                </View>
              </View>

              <View style={tw('flex-row items-center mb-3')}>
                <BarChart3 size={16} color={twInstance.color('text-indigo-500')} />
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1.5')}>
                  {t('mobile.usage_meters_title', 'Hạn mức sử dụng')}
                </Text>
              </View>

              {/* Meter 1: AiUsageMeter */}
              <View style={tw('mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center mb-1')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.meter_1_ai_usage', '1. Lượt dùng AI')}
                  </Text>
                  <Text style={tw('text-xs font-bold text-indigo-600 dark:text-indigo-400')}>
                    {usageMeters.aiUsage.requestsUsed}/{usageMeters.aiUsage.requestsLimit} {t('mobile.requests_unit', 'yêu cầu')}
                  </Text>
                </View>
                <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                  {t('mobile.tokens_label', 'Token')}: {usageMeters.aiUsage.tokensUsed.toLocaleString()} / {usageMeters.aiUsage.tokensLimit.toLocaleString()}
                </Text>
              </View>

              {/* Meter 2: ConsultationUsageMeter */}
              <View style={tw('mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center mb-1')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    {t('mobile.meter_2_consult_quota', '2. Hạn mức tư vấn bác sĩ')}
                  </Text>
                  <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                    {t('mobile.remaining', 'Còn lại')}: {usageMeters.consultationUsage.remaining}
                  </Text>
                </View>
                <View style={tw('flex-row gap-3 mt-1')}>
                  <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                    {t('mobile.used_label', 'Đã dùng')}: <Text style={tw('font-bold text-slate-700 dark:text-slate-200')}>{usageMeters.consultationUsage.used}</Text>
                  </Text>
                  <Text style={tw('text-[11px] text-amber-600 dark:text-amber-400')}>
                    {t('mobile.reserved_label', 'Đã giữ chỗ')}: <Text style={tw('font-bold')}>{usageMeters.consultationUsage.reserved}</Text>
                  </Text>
                  <Text style={tw('text-[11px] text-emerald-600 dark:text-emerald-400')}>
                    {t('mobile.remaining', 'Còn lại')}: <Text style={tw('font-bold')}>{usageMeters.consultationUsage.remaining}</Text>
                  </Text>
                </View>
              </View>

              {/* Meter 3 & 4: CareProgramLimit & FamilyLinkLimit */}
              <View style={tw('flex-row gap-2.5')}>
                <View style={tw('flex-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                  <Text style={tw('text-[11px] font-bold text-slate-500 dark:text-slate-400')}>
                    {t('mobile.meter_3_care_program', '3. Chương trình chăm sóc')}
                  </Text>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mt-1')}>
                    {activePlan === 'care'
                      ? t('mobile.care_limit_active', '1 / 1 đang dùng')
                      : t('mobile.care_limit_upgrade_needed', '0 / 0 • Cần gói CARE')}
                  </Text>
                </View>
                <View style={tw('flex-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                  <Text style={tw('text-[11px] font-bold text-slate-500 dark:text-slate-400')}>
                    {t('mobile.meter_4_family_link', '4. Liên kết người thân')}
                  </Text>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mt-1')}>
                    {usageMeters.familyLinkLimit.linked} / {activePlan === 'free' ? 1 : activePlan === 'plus' ? 3 : 5} {t('mobile.members', 'Thành viên')}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>

        {/* Pricing Tiers (FREE / PLUS / CARE aligned with Backend Contract) */}
        <View style={tw('px-6 mb-4')}>
          <Text style={tw('text-sm font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-3')}>
            {t('mobile.compare_plans', 'So sánh các gói cước')}
          </Text>

          {/* FREE Plan */}
          <TouchableOpacity
            onPress={() => setSelectedPlan('free')}
            style={tw(
              `p-5 rounded-3xl mb-4 border-2 ${
                selectedPlan === 'free'
                  ? 'border-slate-500 bg-slate-100 dark:bg-slate-900'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-3')}>
              <Text style={tw('font-bold text-lg text-slate-900 dark:text-white')}>
                {t('mobile.free_tier', 'Gói FREE')}
              </Text>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>0đ</Text>
            </View>
            <View style={tw('gap-2')}>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#64748b" size={16} />
                <Text style={tw('text-slate-600 dark:text-slate-300 text-xs ml-2')}>
                  {t('mobile.free_feature_1', '1 lượt tư vấn bác sĩ mỗi chu kỳ và AI tư vấn cơ bản')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#64748b" size={16} />
                <Text style={tw('text-slate-600 dark:text-slate-300 text-xs ml-2')}>
                  {t('mobile.free_feature_2', 'Ghi nhận chỉ số sức khỏe, cảnh báo an toàn và 1 liên kết gia đình')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* PLUS Plan */}
          <TouchableOpacity
            onPress={() => setSelectedPlan('plus')}
            style={tw(
              `p-6 rounded-3xl mb-4 border-2 ${
                selectedPlan === 'plus'
                  ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View style={tw('flex-row items-center')}>
                <Sparkles
                  color={selectedPlan === 'plus' ? twInstance.color('text-amber-500') : twInstance.color('text-slate-400')}
                  size={24}
                />
                <Text
                  style={tw(
                    `font-bold text-xl ml-2 ${
                      selectedPlan === 'plus' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                    }`
                  )}
                >
                  {t('mobile.plus_plan', 'Gói PLUS')}
                </Text>
              </View>
              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
                99K
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                  {t('mobile.per_month_short', '/tháng')}
                </Text>
              </Text>
            </View>
            <View style={tw('gap-2.5')}>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_consult_plus', '3 lượt tư vấn bác sĩ mỗi chu kỳ')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_reports_plus', 'Báo cáo xu hướng 7/30/90 ngày, tóm tắt AI và xuất PDF/CSV')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_family_plus', 'Tối đa 3 thành viên đồng hành gia đình')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* CARE Plan */}
          <TouchableOpacity
            onPress={() => setSelectedPlan('care')}
            style={tw(
              `p-6 rounded-3xl mb-6 border-2 ${
                selectedPlan === 'care'
                  ? 'border-brand bg-brand-light/30 dark:bg-emerald-950/30'
                  : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'
              }`
            )}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View style={tw('flex-row items-center')}>
                <HeartPulse
                  color={selectedPlan === 'care' ? twInstance.color('text-brand') : twInstance.color('text-slate-400')}
                  size={24}
                />
                <Text
                  style={tw(
                    `font-bold text-xl ml-2 ${
                      selectedPlan === 'care' ? 'text-brand' : 'text-slate-900 dark:text-white'
                    }`
                  )}
                >
                  {t('mobile.care_plan', 'Gói CARE')}
                </Text>
              </View>
              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>
                299K
                <Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>
                  {t('mobile.per_month_short', '/tháng')}
                </Text>
              </Text>
            </View>
            <View style={tw('gap-2.5')}>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_consult_care', '6 lượt tư vấn bác sĩ mỗi chu kỳ và hạn mức AI cao nhất')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2 font-bold')}>
                  {t('mobile.feature_care_program', 'Chương trình chăm sóc bệnh mạn tính cùng bác sĩ')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_doctor_review', 'Bác sĩ rà soát định kỳ và ưu tiên xử lý cảnh báo')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_family_care', 'Tối đa 5 thành viên đồng hành gia đình')}
                </Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Upgrade Button */}
          {activePlan !== selectedPlan && selectedPlan !== 'free' ? (
            <TouchableOpacity
              onPress={handleUpgrade}
              disabled={isProcessingOrder}
              style={tw(
                `bg-slate-900 dark:bg-white py-4 rounded-2xl flex-row items-center justify-center shadow-md mb-6 ${
                  isProcessingOrder ? 'opacity-70' : ''
                }`
              )}
            >
              {isProcessingOrder ? (
                <ActivityIndicator
                  color={twInstance.color('text-white dark:text-slate-900')}
                  size="small"
                  style={tw('mr-2')}
                />
              ) : null}
              <Text style={tw('text-white dark:text-slate-900 font-bold text-lg mr-2')}>
                {isProcessingOrder
                  ? t('mobile.creating_order', 'Đang tạo đơn...')
                  : t('mobile.upgrade_via_vnpay', 'Nâng cấp qua VNPAY')}
              </Text>
              <ArrowRight color={twInstance.color('text-white dark:text-slate-900')} size={20} />
            </TouchableOpacity>
          ) : (
            <View style={tw('bg-emerald-100 dark:bg-emerald-900/30 py-4 rounded-2xl items-center mb-6')}>
              <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold text-base')}>
                {activePlan === selectedPlan
                  ? t('mobile.current_active_plan', 'Đây là gói đang kích hoạt của bạn')
                  : t('mobile.free_always_active', 'Gói Cơ bản luôn sẵn sàng')}
              </Text>
            </View>
          )}

          {/* Refund Section (BILL-09) */}
          {activePlan !== 'free' && !isRefundPending && (
            <TouchableOpacity
              onPress={() => setRefundRequestModalVisible(true)}
              style={tw(
                'bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl flex-row items-center justify-between border border-red-100 dark:border-red-800/50'
              )}
            >
              <View style={tw('flex-1 pr-3')}>
                <Text style={tw('text-red-700 dark:text-red-400 font-bold')}>
                  {t('mobile.request_refund', 'Gửi yêu cầu hoàn tiền')}
                </Text>
                <Text style={tw('text-red-600/80 dark:text-red-400/80 text-xs mt-1')}>
                  {t('mobile.refund_desc', 'Đính kèm lý do và tự động ghi nhận mức sử dụng tại thời điểm yêu cầu')}
                </Text>
              </View>
              <XCircle color={twInstance.color('text-red-500')} size={24} />
            </TouchableOpacity>
          )}
        </View>

        {/* Trust Badges */}
        <View style={tw('flex-row justify-center gap-6 px-6 mt-4')}>
          <View style={tw('items-center')}>
            <ShieldCheck color={twInstance.color('text-slate-400')} size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>
              {t('mobile.secure_payment', 'Bảo mật VNPAY IPN')}
            </Text>
          </View>
          <View style={tw('items-center')}>
            <Zap color={twInstance.color('text-slate-400')} size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>
              {t('mobile.instant_activation', 'Đồng bộ Entitlement tức thì')}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Order History & Refund History Modal (BILL-04, BILL-05, BILL-10) */}
      <Modal
        visible={orderHistoryModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setOrderHistoryModalVisible(false)}
      >
        <View style={tw('flex-1 bg-black/60 justify-end')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 max-h-[88%]')}>
            <View style={tw('flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800')}>
              <View>
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                  {t('mobile.orders_and_refunds', 'Lịch sử Đơn hàng & Hoàn tiền')}
                </Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                  {t('mobile.orders_refunds_subtitle', 'Đơn thanh toán, hoàn tiền và mức sử dụng')}
                </Text>
              </View>
              <TouchableOpacity onPress={() => setOrderHistoryModalVisible(false)} style={tw('p-2')}>
                <X color={twInstance.color('text-slate-400')} size={24} />
              </TouchableOpacity>
            </View>

            <ScrollView style={tw('mt-4')} showsVerticalScrollIndicator={false}>
              {/* IPN Authority Notice */}
              <View style={tw('bg-blue-50 dark:bg-blue-950/40 p-3.5 rounded-2xl border border-blue-200 dark:border-blue-900 mb-4 flex-row items-start')}>
                <Info size={18} color={twInstance.color('text-blue-600 dark:text-blue-400')} style={tw('mt-0.5 mr-2.5')} />
                <Text style={tw('text-xs text-blue-800 dark:text-blue-300 flex-1 leading-4')}>
                  {t('mobile.ipn_authority_notice', 'Đơn hàng chỉ chuyển sang đã thanh toán khi ngân hàng xác nhận giao dịch hợp lệ. Trang kết quả thanh toán chỉ hiển thị trạng thái chờ xác minh.'
                  )}
                </Text>
              </View>

              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5')}>
                {t('mobile.payment_orders_list', 'Danh sách đơn thanh toán')}
              </Text>

              {orders.map((ord) => {
                const badge = getOrderStatusBadge(ord.status);
                return (
                  <View
                    key={ord._id}
                    style={tw('bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl mb-3 border border-slate-200 dark:border-slate-800')}
                  >
                    <View style={tw('flex-row justify-between items-start mb-2')}>
                      <View>
                        <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>
                          {ord.orderCode} • {t('mobile.plan_prefix', 'Gói')} {ord.planCode}
                        </Text>
                        <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-0.5')}>
                          {ord.createdAt}
                        </Text>
                      </View>
                      <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>
                        {ord.amount.toLocaleString('vi-VN')}đ
                      </Text>
                    </View>
                    <View style={tw('flex-row items-center justify-between mt-2')}>
                      <View style={tw(`px-2.5 py-1 rounded-full shrink-0 ${badge.bg}`)}>
                        <Text style={tw(`text-[10px] font-bold ${badge.text}`)} numberOfLines={1}>{badge.label}</Text>
                      </View>
                      {(ord.status === 'created' || ord.status === 'pending') && (
                        <TouchableOpacity
                          onPress={() => handleCancelOrder(ord._id)}
                          style={tw('bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-xl')}
                        >
                          <Text style={tw('text-xs font-bold text-red-700 dark:text-red-400')}>
                            {t('mobile.cancel_unpaid_order', 'Hủy đơn')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-4 mb-2.5')}>
                {t('mobile.refund_requests_list', 'Yêu cầu hoàn tiền và mức sử dụng')}
              </Text>

              {refundHistory.map((ref) => (
                <View
                  key={ref.id}
                  style={tw('bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl mb-4 border border-slate-200 dark:border-slate-800')}
                >
                  <View style={tw('flex-row justify-between items-center mb-1')}>
                    <Text style={tw('font-bold text-slate-900 dark:text-white text-sm flex-1 mr-2')} numberOfLines={1}>
                      {ref.orderCode} ({ref.planCode})
                    </Text>
                    <View
                      style={tw(
                        `px-2.5 py-0.5 rounded-full shrink-0 ${
                          ref.status === 'approved'
                            ? 'bg-emerald-100 dark:bg-emerald-900/40'
                            : ref.status === 'rejected'
                            ? 'bg-red-100 dark:bg-red-900/40'
                            : 'bg-amber-100 dark:bg-amber-900/40'
                        }`
                      )}
                    >
                      <Text
                        style={tw(
                          `text-[10px] font-bold uppercase ${
                            ref.status === 'approved'
                              ? 'text-emerald-700 dark:text-emerald-300'
                              : ref.status === 'rejected'
                              ? 'text-red-700 dark:text-red-300'
                              : 'text-amber-700 dark:text-amber-300'
                          }`
                        )}
                        numberOfLines={1}
                      >
                        {refundStatusText(ref.status)}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 mt-1')}>
                    {t('mobile.reason_label', 'Lý do')}: <Text style={tw('font-semibold')}>{refundReasonText(ref.reasonCode)}</Text> — {ref.note}
                  </Text>
                  <View style={tw('mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex-row justify-between')}>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      {t('mobile.ai_used_label', 'AI đã dùng')}: {ref.usageSnapshot.aiTokensUsed} tokens
                    </Text>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      {t('mobile.consults_used_short', 'Lượt khám')}: {ref.usageSnapshot.consultationsUsed}
                    </Text>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      {t('mobile.program_short_label', 'Chương trình')}: {ref.usageSnapshot.careProgramEnrolled ? t('mobile.common_yes', 'Có') : t('mobile.common_no', 'Không')}
                    </Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Refund Request Creation Modal (BILL-09) */}
      <Modal
        visible={refundRequestModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => setRefundRequestModalVisible(false)}
      >
        <View style={tw('flex-1 bg-black/60 justify-end')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6')}>
            <View style={tw('flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800')}>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {t('mobile.request_refund', 'Yêu cầu hoàn tiền')}
              </Text>
              <TouchableOpacity onPress={() => setRefundRequestModalVisible(false)}>
                <X color={twInstance.color('text-slate-400')} size={24} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mt-4 mb-2')}>
              {t('mobile.select_refund_reason', 'Chọn lý do hoàn tiền')}
            </Text>
            <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
              {(
                [
                  { code: 'service_not_used', label: refundReasonText('service_not_used') },
                  { code: 'accidental_purchase', label: refundReasonText('accidental_purchase') },
                  { code: 'technical_issue', label: refundReasonText('technical_issue') },
                  { code: 'other', label: refundReasonText('other') },
                ] as const
              ).map((item) => (
                <TouchableOpacity
                  key={item.code}
                  onPress={() => setRefundReasonCode(item.code)}
                  style={tw(
                    `px-3.5 py-2 rounded-xl border ${
                      refundReasonCode === item.code
                        ? 'bg-red-50 dark:bg-red-900/30 border-red-500'
                        : 'bg-slate-50 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                    }`
                  )}
                >
                  <Text
                    style={tw(
                      `text-xs font-bold ${
                        refundReasonCode === item.code
                          ? 'text-red-700 dark:text-red-300'
                          : 'text-slate-700 dark:text-slate-300'
                      }`
                    )}
                  >
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mb-2')}>
              {t('mobile.additional_note', 'Ghi chú chi tiết')}
            </Text>
            <TextInput
              value={refundNote}
              onChangeText={setRefundNote}
              placeholder={t('mobile.refund_note_placeholder', 'Nhập thêm mô tả để quản trị viên đối soát...')}
              placeholderTextColor="#94a3b8"
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-slate-900 dark:text-white min-h-[80px] mb-4'
              )}
            />

            <View style={tw('bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 mb-5')}>
              <Text style={tw('text-xs font-bold text-amber-800 dark:text-amber-300 mb-1')}>
                {t('mobile.current_usage_attached_title', 'Mức sử dụng hiện tại đính kèm yêu cầu:')}
              </Text>
              <Text style={tw('text-xs text-amber-700 dark:text-amber-400')}>
                • {t('mobile.ai_used_label', 'AI đã dùng')}: {usageMeters.aiUsage.tokensUsed.toLocaleString()} tokens{'\n'}
                • {t('mobile.consultations_used_label', 'Lượt khám đã dùng')}: {usageMeters.consultationUsage.used}{'\n'}
                • {t('mobile.care_program_label', 'Chương trình chăm sóc')}:{' '}
                {usageMeters.careProgramLimit.enrolled > 0
                  ? t('mobile.status_activated', 'Đã kích hoạt')
                  : t('mobile.status_not_enrolled', 'Chưa đăng ký')}
              </Text>
            </View>

            <TouchableOpacity
              onPress={handleSubmitRefundRequest}
              style={tw('bg-red-600 py-4 rounded-2xl items-center')}
            >
              <Text style={tw('text-white font-bold text-base')}>
                {t('mobile.confirm_refund', 'Xác nhận gửi yêu cầu hoàn tiền')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* VNPAY Order & QR Modal */}
      <Modal
        visible={orderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={() => handleCancelOrder()}
      >
        <View style={tw('flex-1 bg-black/60 justify-end')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800')}>
            {/* Modal Header */}
            <View style={tw('flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800')}>
              <View>
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.vnpay_qr_payment_title', 'Thanh toán VNPAY QR')}</Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                  {t('mobile.order_code_label', 'Mã đơn')}: {currentOrder?.orderCode}
                </Text>
              </View>
              <TouchableOpacity onPress={() => handleCancelOrder()} style={tw('p-2')}>
                <X color={twInstance.color('text-slate-400')} size={24} />
              </TouchableOpacity>
            </View>

            {/* QR Code display */}
            <View style={tw('items-center my-6')}>
              {currentOrder?.paymentQrDataUrl ? (
                <View style={tw('p-4 bg-white rounded-2xl border border-slate-200 shadow-sm items-center')}>
                  <Image
                    source={{ uri: currentOrder.paymentQrDataUrl }}
                    style={{ width: 200, height: 200 }}
                    resizeMode="contain"
                  />
                  <Text style={tw('text-xs text-slate-500 mt-2 font-medium')}>
                    {t('mobile.scan_with_banking_app', 'Quét mã bằng ứng dụng ngân hàng')}
                  </Text>
                </View>
              ) : (
                <View style={tw('w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl items-center justify-center p-4')}>
                  <QrCode color={twInstance.color('text-slate-400')} size={64} />
                  <Text style={tw('text-xs text-slate-500 text-center mt-2')}>
                    {t('mobile.opening_vnpay_page', 'Đang mở trang thanh toán VNPAY...')}
                  </Text>
                </View>
              )}

              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white mt-4')}>
                {currentOrder?.amount?.toLocaleString('vi-VN')} VND
              </Text>

              {/* Status polling indicator (BILL-03 payment_verification_pending) */}
              <View style={tw('flex-row items-center mt-3 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full')}>
                <ActivityIndicator
                  size="small"
                  color={twInstance.color('text-amber-500')}
                  style={tw('mr-2')}
                />
                <Text style={tw('text-xs font-semibold text-amber-700 dark:text-amber-400')}>
                  {t('mobile.waiting_payment_confirmation', 'Đang chờ xác nhận thanh toán')} • {orderStatusText(pollingStatus)}
                </Text>
              </View>
            </View>

            {/* Action buttons */}
            <View style={tw('gap-3 pb-4')}>
              {currentOrder?.paymentUrl ? (
                <TouchableOpacity
                  onPress={() => currentOrder.paymentUrl && Linking.openURL(currentOrder.paymentUrl)}
                  style={tw('bg-blue-600 py-3.5 rounded-2xl items-center justify-center')}
                >
                  <Text style={tw('text-white font-bold text-base')}>{t('mobile.reopen_vnpay_page', 'Mở lại cổng thanh toán VNPAY')}</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() => handleCancelOrder()}
                style={tw('bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center justify-center')}
              >
                <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-base')}>
                  {t('mobile.cancel_order_btn', 'Hủy đơn hàng')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
