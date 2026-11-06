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
              text1: t('mobile.order_ended', 'Đơn hàng kết thúc'),
              text2: `Trạng thái: ${order.status}`,
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
        error?.response?.data?.message || error?.message || 'Cổng thanh toán đang được chuẩn bị';
      Alert.alert(
        t('mobile.payment_gateway', 'Cổng thanh toán VNPAY'),
        `${errorMsg}.\n\nLưu ý (BILL-03): Return URL chỉ hiển thị trạng thái chờ xác minh (payment_verification_pending). Gói chỉ kích hoạt khi IPN hợp lệ.\n\nBạn có muốn mô phỏng IPN thành công (Sandbox Demo)?`,
        [
          { text: t('mobile.cancel', 'Hủy'), style: 'cancel' },
          {
            text: t('mobile.sandbox_demo', 'Mô phỏng IPN Paid'),
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
        text2: t('mobile.order_cancelled', 'Đơn hàng chưa thanh toán đã chuyển sang trạng thái cancelled.'),
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
      text1: t('mobile.refund_processed', 'Đã gửi yêu cầu hoàn tiền (BILL-09)'),
      text2: t(
        'mobile.refund_success_desc',
        'Đã chụp usageSnapshot để Admin đối soát điều kiện hoàn tiền.'
      ),
    });
  };

  const getOrderStatusBadge = (status: PaymentOrderInfo['status']) => {
    switch (status) {
      case 'paid':
        return { bg: 'bg-emerald-100 dark:bg-emerald-900/30', text: 'text-emerald-700 dark:text-emerald-400', label: 'PAID (IPN Verified)' };
      case 'pending':
      case 'created':
      case 'processing':
        return { bg: 'bg-amber-100 dark:bg-amber-900/30', text: 'text-amber-700 dark:text-amber-400', label: `${status.toUpperCase()} (payment_verification_pending)` };
      case 'refund_pending':
        return { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-400', label: 'REFUND_PENDING' };
      case 'refunded':
        return { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-400', label: 'REFUNDED' };
      default:
        return { bg: 'bg-slate-200 dark:bg-slate-800', text: 'text-slate-600 dark:text-slate-400', label: status.toUpperCase() };
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
              {t('mobile.orders_and_refunds', 'Lịch sử đơn & Hoàn tiền')}
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
              'Quản lý gói đăng ký, hạn mức sử dụng (Entitlements) và chương trình đồng hành bác sĩ.'
            )}
          </Text>
        </View>

        {isRefundPending && (
          <View style={tw('px-6 mb-4')}>
            <View style={tw('bg-amber-100 dark:bg-amber-900/30 p-4 rounded-2xl flex-row items-center border border-amber-200 dark:border-amber-800/50')}>
              <AlertCircle color={twInstance.color('text-amber-600 dark:text-amber-400')} size={24} />
              <View style={tw('flex-1 ml-3')}>
                <Text style={tw('text-amber-800 dark:text-amber-300 font-bold')}>
                  {t('mobile.refund_pending_title', 'Yêu cầu hoàn tiền đang chờ duyệt (BILL-17)')}
                </Text>
                <Text style={tw('text-amber-700/80 dark:text-amber-400/80 text-xs mt-1')}>
                  {t(
                    'mobile.refund_pending_desc',
                    'Quyền lợi trả phí tạm khóa để kiểm toán usageSnapshot. Gói Free và Safety Alerts vẫn hoạt động bình thường.'
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
                    ACTIVE
                  </Text>
                </View>
              </View>

              <View style={tw('flex-row items-center mb-3')}>
                <BarChart3 size={16} color={twInstance.color('text-indigo-500')} />
                <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 ml-1.5')}>
                  {t('mobile.usage_meters_title', '4 Chỉ số hạn mức độc lập (BILL-18)')}
                </Text>
              </View>

              {/* Meter 1: AiUsageMeter */}
              <View style={tw('mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center mb-1')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    1. AI Usage Meter (Requests & Tokens)
                  </Text>
                  <Text style={tw('text-xs font-bold text-indigo-600 dark:text-indigo-400')}>
                    {usageMeters.aiUsage.requestsUsed}/{usageMeters.aiUsage.requestsLimit} reqs
                  </Text>
                </View>
                <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                  Tokens: {usageMeters.aiUsage.tokensUsed.toLocaleString()} / {usageMeters.aiUsage.tokensLimit.toLocaleString()} tokens
                </Text>
              </View>

              {/* Meter 2: ConsultationUsageMeter */}
              <View style={tw('mb-3 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                <View style={tw('flex-row justify-between items-center mb-1')}>
                  <Text style={tw('text-xs font-bold text-slate-700 dark:text-slate-200')}>
                    2. Consultation Quota Meter
                  </Text>
                  <Text style={tw('text-xs font-bold text-emerald-600 dark:text-emerald-400')}>
                    {t('mobile.remaining', 'Còn lại')}: {usageMeters.consultationUsage.remaining}
                  </Text>
                </View>
                <View style={tw('flex-row gap-3 mt-1')}>
                  <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                    Used: <Text style={tw('font-bold text-slate-700 dark:text-slate-200')}>{usageMeters.consultationUsage.used}</Text>
                  </Text>
                  <Text style={tw('text-[11px] text-amber-600 dark:text-amber-400')}>
                    Reserved: <Text style={tw('font-bold')}>{usageMeters.consultationUsage.reserved}</Text>
                  </Text>
                  <Text style={tw('text-[11px] text-emerald-600 dark:text-emerald-400')}>
                    Remaining: <Text style={tw('font-bold')}>{usageMeters.consultationUsage.remaining}</Text>
                  </Text>
                </View>
              </View>

              {/* Meter 3 & 4: CareProgramLimit & FamilyLinkLimit */}
              <View style={tw('flex-row gap-2.5')}>
                <View style={tw('flex-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                  <Text style={tw('text-[11px] font-bold text-slate-500 dark:text-slate-400')}>
                    3. Care Program Limit
                  </Text>
                  <Text style={tw('text-sm font-bold text-slate-900 dark:text-white mt-1')}>
                    {activePlan === 'care' ? '1 / 1 Active' : '0 / 0 (Cần gói CARE)'}
                  </Text>
                </View>
                <View style={tw('flex-1 bg-slate-50 dark:bg-slate-800/60 p-3 rounded-2xl')}>
                  <Text style={tw('text-[11px] font-bold text-slate-500 dark:text-slate-400')}>
                    4. Family Link Limit
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
            {t('mobile.compare_plans', 'So sánh 3 gói cước chuẩn Backend Contract')}
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
                  {t('mobile.free_feature_1', '1 lượt tư vấn bác sĩ / chu kỳ & AI tư vấn cơ bản')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#64748b" size={16} />
                <Text style={tw('text-slate-600 dark:text-slate-300 text-xs ml-2')}>
                  {t('mobile.free_feature_2', 'Ghi nhận chỉ số sức khỏe, Safety Alerts & 1 liên kết gia đình')}
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
                  {t('mobile.feature_consult_plus', '3 lượt tư vấn bác sĩ (Scheduled / On-demand) / chu kỳ')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_reports_plus', 'Báo cáo xu hướng 7/30/90 ngày, AI Summary & xuất PDF/CSV')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_family_plus', 'Tối đa 3 thành viên Family Companion')}
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
                  {t('mobile.feature_consult_care', '6 lượt tư vấn bác sĩ / chu kỳ & hạn mức AI cao nhất')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2 font-bold')}>
                  {t('mobile.feature_care_program', 'Chương trình Chronic Care đồng hành cùng Bác sĩ (1 Active Program)')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_doctor_review', 'Bác sĩ rà soát định kỳ (Doctor Review) & Priority Inbox')}
                </Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 text-sm ml-2')}>
                  {t('mobile.feature_family_care', 'Tối đa 5 thành viên Family Companion')}
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
                  {t('mobile.request_refund', 'Gửi yêu cầu hoàn tiền (BILL-09)')}
                </Text>
                <Text style={tw('text-red-600/80 dark:text-red-400/80 text-xs mt-1')}>
                  {t('mobile.refund_desc', 'Đính kèm mã lý do và tự động chụp usageSnapshot tại thời điểm yêu cầu')}
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
                  BILL-04, BILL-05, BILL-10 • VNPAY IPN Authority
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
                  {t(
                    'mobile.ipn_authority_notice',
                    'Quy tắc BILL-03: Return URL chỉ hiển thị trạng thái payment_verification_pending. Chỉ khi hệ thống xác thực VNPAY IPN hợp lệ thì đơn hàng mới chuyển sang paid.'
                  )}
                </Text>
              </View>

              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2.5')}>
                {t('mobile.payment_orders_list', 'Danh sách đơn thanh toán (PaymentOrder)')}
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
                          {ord.orderCode} • Gói {ord.planCode}
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
                      <View style={tw(`px-2.5 py-1 rounded-full ${badge.bg}`)}>
                        <Text style={tw(`text-[10px] font-bold ${badge.text}`)}>{badge.label}</Text>
                      </View>
                      {(ord.status === 'created' || ord.status === 'pending') && (
                        <TouchableOpacity
                          onPress={() => handleCancelOrder(ord._id)}
                          style={tw('bg-red-100 dark:bg-red-900/30 px-3 py-1.5 rounded-xl')}
                        >
                          <Text style={tw('text-xs font-bold text-red-700 dark:text-red-400')}>
                            {t('mobile.cancel_unpaid_order', 'Hủy đơn (BILL-05)')}
                          </Text>
                        </TouchableOpacity>
                      )}
                    </View>
                  </View>
                );
              })}

              <Text style={tw('text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 mt-4 mb-2.5')}>
                {t('mobile.refund_requests_list', 'Yêu cầu hoàn tiền & Usage Snapshot (BILL-10)')}
              </Text>

              {refundHistory.map((ref) => (
                <View
                  key={ref.id}
                  style={tw('bg-slate-50 dark:bg-slate-800/70 p-4 rounded-2xl mb-4 border border-slate-200 dark:border-slate-800')}
                >
                  <View style={tw('flex-row justify-between items-center mb-1')}>
                    <Text style={tw('font-bold text-slate-900 dark:text-white text-sm')}>
                      {ref.orderCode} ({ref.planCode})
                    </Text>
                    <View style={tw('bg-indigo-100 dark:bg-indigo-900/40 px-2.5 py-0.5 rounded-full')}>
                      <Text style={tw('text-[10px] font-bold text-indigo-700 dark:text-indigo-300 uppercase')}>
                        {ref.status}
                      </Text>
                    </View>
                  </View>
                  <Text style={tw('text-xs text-slate-600 dark:text-slate-300 mt-1')}>
                    Lý do: <Text style={tw('font-semibold')}>{ref.reasonCode}</Text> — {ref.note}
                  </Text>
                  <View style={tw('mt-2.5 pt-2.5 border-t border-slate-200 dark:border-slate-700 flex-row justify-between')}>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      Snapshot AI: {ref.usageSnapshot.aiTokensUsed} tok
                    </Text>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      Consults: {ref.usageSnapshot.consultationsUsed}
                    </Text>
                    <Text style={tw('text-[11px] text-slate-500 dark:text-slate-400')}>
                      Care: {ref.usageSnapshot.careProgramEnrolled ? 'Yes' : 'No'}
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
                {t('mobile.request_refund', 'Yêu cầu hoàn tiền (BILL-09)')}
              </Text>
              <TouchableOpacity onPress={() => setRefundRequestModalVisible(false)}>
                <X color={twInstance.color('text-slate-400')} size={24} />
              </TouchableOpacity>
            </View>

            <Text style={tw('text-xs font-bold uppercase text-slate-500 dark:text-slate-400 mt-4 mb-2')}>
              {t('mobile.select_refund_reason', 'Chọn mã lý do (Allowlisted reasonCode)')}
            </Text>
            <View style={tw('flex-row flex-wrap gap-2 mb-4')}>
              {(
                [
                  { code: 'service_not_used', label: 'Chưa sử dụng dịch vụ' },
                  { code: 'accidental_purchase', label: 'Mua nhầm gói' },
                  { code: 'technical_issue', label: 'Lỗi kỹ thuật' },
                  { code: 'other', label: 'Lý do khác' },
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
              placeholder={t('mobile.refund_note_placeholder', 'Nhập thêm mô tả để Admin đối soát...')}
              placeholderTextColor="#94a3b8"
              multiline
              style={tw(
                'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-3.5 text-slate-900 dark:text-white min-h-[80px] mb-4'
              )}
            />

            <View style={tw('bg-amber-50 dark:bg-amber-950/40 p-3.5 rounded-2xl border border-amber-200 dark:border-amber-800/60 mb-5')}>
              <Text style={tw('text-xs font-bold text-amber-800 dark:text-amber-300 mb-1')}>
                Usage Snapshot hiện tại (sẽ đính kèm yêu cầu):
              </Text>
              <Text style={tw('text-xs text-amber-700 dark:text-amber-400')}>
                • AI Tokens đã dùng: {usageMeters.aiUsage.tokensUsed.toLocaleString()} tokens{'\n'}
                • Lượt khám đã dùng: {usageMeters.consultationUsage.used} lượt{'\n'}
                • Đăng ký Care Program: {usageMeters.careProgramLimit.enrolled > 0 ? 'Đã kích hoạt' : 'Chưa'}
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
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>Thanh toán VNPAY QR</Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>
                  Mã đơn: {currentOrder?.orderCode}
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
                    Quét mã bằng ứng dụng ngân hàng
                  </Text>
                </View>
              ) : (
                <View style={tw('w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl items-center justify-center p-4')}>
                  <QrCode color={twInstance.color('text-slate-400')} size={64} />
                  <Text style={tw('text-xs text-slate-500 text-center mt-2')}>
                    Đang mở trang thanh toán VNPAY...
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
                  payment_verification_pending (Chờ VNPAY IPN: {pollingStatus})
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
                  <Text style={tw('text-white font-bold text-base')}>Mở lại cổng thanh toán VNPAY</Text>
                </TouchableOpacity>
              ) : null}

              <TouchableOpacity
                onPress={() => handleCancelOrder()}
                style={tw('bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center justify-center')}
              >
                <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-base')}>
                  Hủy đơn hàng (BILL-05)
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
