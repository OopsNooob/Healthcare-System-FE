import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, Platform, Alert, Image, Modal, ActivityIndicator } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Linking from 'expo-linking';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { Crown, CheckCircle2, ArrowRight, ArrowLeft, ShieldCheck, Zap, XCircle, HeartPulse, Sparkles, AlertCircle, QrCode, X } from 'lucide-react-native';
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
  amount: number;
  status: string;
  paymentUrl?: string | null;
  paymentQrDataUrl?: string | null;
}

export default function PremiumScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const router = useRouter();
  
  // Active and selected plan
  const [activePlan, setActivePlan] = useState<'free' | 'plus' | 'care'>('plus');
  const [selectedPlan, setSelectedPlan] = useState<'plus' | 'care'>('plus');
  const [isRefundPending, setIsRefundPending] = useState(false);

  // VNPAY Payment Order Modal & Polling state
  const [isProcessingOrder, setIsProcessingOrder] = useState(false);
  const [orderModalVisible, setOrderModalVisible] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<PaymentOrderInfo | null>(null);
  const [pollingStatus, setPollingStatus] = useState<string>('pending');
  const pollingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
    };
  }, []);

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
              text2: t('mobile.vnpay_success', 'Thanh toán VNPAY thành công! Gói cước đã kích hoạt.'),
            });
            setActivePlan(selectedPlan);
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
        setCurrentOrder({
          _id: order._id,
          orderCode: order.orderCode || `ORD-${Date.now().toString().slice(-6)}`,
          amount: order.amount || (selectedPlan === 'plus' ? 99000 : 199000),
          status: order.status || 'created',
          paymentUrl,
          paymentQrDataUrl,
        });

        setOrderModalVisible(true);
        startPollingOrderStatus(order._id);

        if (paymentUrl) {
          Linking.openURL(paymentUrl).catch(() => {});
        }
      } else {
        throw new Error('No order returned');
      }
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || 'Cổng thanh toán đang được chuẩn bị';
      Alert.alert(
        t('mobile.payment_gateway', 'Cổng thanh toán VNPAY'),
        `${errorMsg}.\n\nBạn có muốn kích hoạt thử nghiệm nhanh (Sandbox Demo)?`,
        [
          { text: t('mobile.cancel', 'Hủy'), style: 'cancel' },
          {
            text: t('mobile.sandbox_demo', 'Kích hoạt Sandbox Demo'),
            onPress: () => {
              Toast.show({
                type: 'success',
                text1: t('mobile.success', 'Thành công'),
                text2: t('mobile.vnpay_success', 'Thanh toán thành công (Mô phỏng Sandbox)!'),
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

  const handleCancelOrder = async () => {
    if (!currentOrder?._id) return;
    if (pollingIntervalRef.current) clearInterval(pollingIntervalRef.current);
    try {
      await paymentsCancel({
        path: { id: currentOrder._id },
      });
      Toast.show({
        type: 'info',
        text1: t('mobile.cancelled', 'Đã hủy'),
        text2: t('mobile.order_cancelled', 'Đơn hàng đã được hủy.'),
      });
    } catch {
      // ignore
    } finally {
      setOrderModalVisible(false);
      setCurrentOrder(null);
    }
  };

  const handleRefund = () => {
    Alert.alert(
      t('mobile.request_refund', 'Yêu cầu hoàn tiền'), 
      t('mobile.refund_confirm_desc', 'Bạn có chắc chắn muốn yêu cầu hoàn tiền? Các quyền lợi Premium sẽ tạm khóa để kiểm toán.'),
      [
        { text: t('mobile.cancel', 'Hủy'), style: 'cancel' },
        { 
          text: t('mobile.confirm_refund', 'Xác nhận hoàn tiền'), 
          style: 'destructive',
          onPress: () => {
            Toast.show({
              type: 'info',
              text1: t('mobile.refund_processed', 'Đã gửi yêu cầu'),
              text2: t('mobile.refund_success_desc', 'Yêu cầu hoàn tiền đã gửi đến Quản trị viên. Gói cước tạm chuyển trạng thái rà soát.')
            });
            setIsRefundPending(true);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Navigation Bar */}
        <View style={tw('flex-row items-center px-4 pt-4 pb-2')}>
          <TouchableOpacity 
            style={tw('p-2 -ml-1 mr-2')}
            onPress={() => router.back('/(patient)/profile')}
            accessibilityLabel={t('mobile.back', 'Quay lại')}
          >
            <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
          </TouchableOpacity>
        </View>

        {/* Header */}
        <View style={tw('items-center px-6 pt-2 pb-6')}>
          <View style={tw('w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4')}>
            <Crown color={twInstance.color('text-amber-500')} size={40} />
          </View>
          <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white text-center')}>{t('mobile.upgrade_to_premium', `Upgrade to Premium`)}</Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-center mt-2 px-4')}>{t('mobile.unlock_unlimited_ai_consultati', `Unlock unlimited AI consultations and priority booking with top specialists.`)}</Text>
        </View>

        {isRefundPending && (
          <View style={tw('px-6 mb-4')}>
            <View style={tw('bg-amber-100 dark:bg-amber-900/30 p-4 rounded-2xl flex-row items-center border border-amber-200 dark:border-amber-800/50')}>
              <AlertCircle color={twInstance.color('text-amber-600 dark:text-amber-400')} size={24} />
              <View style={tw('flex-1 ml-3')}>
                <Text style={tw('text-amber-800 dark:text-amber-300 font-bold')}>{t('mobile.refund_pending_title', 'Refund Request Pending')}</Text>
                <Text style={tw('text-amber-700/80 dark:text-amber-400/80 text-xs mt-1')}>{t('mobile.refund_pending_desc', 'Premium features are temporarily paused. Free tier and Safety Alerts remain active.')}</Text>
              </View>
            </View>
          </View>
        )}

        {/* Current Plan */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm flex-row items-center justify-between')}>
            <View>
              <Text style={tw('text-slate-500 dark:text-slate-400 text-sm font-semibold uppercase tracking-wider mb-1')}>{t('mobile.current_plan', `Current Plan`)}</Text>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>
                {activePlan === 'free' ? t('mobile.free_tier', 'Free Tier') : 
                 activePlan === 'plus' ? t('mobile.plus_plan', 'Plus Plan') : t('mobile.care_plan', 'Care Plan')}
              </Text>
            </View>
            <View style={tw('bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full')}>
              <Text style={tw('text-slate-600 dark:text-slate-300 font-bold text-xs')}>
                {activePlan === 'free' ? '3 AI Chats' : activePlan === 'plus' ? '50 AI Chats' : 'Unlimited'}
              </Text>
            </View>
          </View>
        </View>

        {/* Pricing Tiers */}
        <View style={tw('px-6 mb-4')}>
          {/* Plus Plan */}
          <TouchableOpacity 
            onPress={() => setSelectedPlan('plus')}
            style={tw(`p-6 rounded-3xl mb-4 border-2 ${selectedPlan === 'plus' ? 'border-amber-400 bg-amber-50 dark:bg-amber-900/10' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`)}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View style={tw('flex-row items-center')}>
                <Sparkles color={selectedPlan === 'plus' ? twInstance.color('text-amber-500') : twInstance.color('text-slate-400')} size={24} />
                <Text style={tw(`font-bold text-xl ml-2 ${selectedPlan === 'plus' ? 'text-amber-600 dark:text-amber-400' : 'text-slate-900 dark:text-white'}`)}>{t('mobile.plus_plan', 'Plus Plan')}</Text>
              </View>
              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>99K<Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>{t('mobile.per_month_short', '/mo')}</Text></Text>
            </View>
            <View style={tw('gap-3')}>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 ml-2')}>{t('mobile.feature_ai_plus', '50 AI Chats per month')}</Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 ml-2')}>{t('mobile.feature_consult_plus', '3 Tele-consultations')}</Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 ml-2')}>{t('mobile.feature_family_plus', 'Up to 3 Family Members')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Care Plan */}
          <TouchableOpacity 
            onPress={() => setSelectedPlan('care')}
            style={tw(`p-6 rounded-3xl mb-6 border-2 ${selectedPlan === 'care' ? 'border-brand bg-brand-light/30' : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900'}`)}
          >
            <View style={tw('flex-row justify-between items-center mb-4')}>
              <View style={tw('flex-row items-center')}>
                <HeartPulse color={selectedPlan === 'care' ? twInstance.color('text-brand') : twInstance.color('text-slate-400')} size={24} />
                <Text style={tw(`font-bold text-xl ml-2 ${selectedPlan === 'care' ? 'text-brand' : 'text-slate-900 dark:text-white'}`)}>{t('mobile.care_plan', 'Care Plan')}</Text>
              </View>
              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>299K<Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>{t('mobile.per_month_short', '/mo')}</Text></Text>
            </View>
            <View style={tw('gap-3')}>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 ml-2')}>{t('mobile.feature_ai_care', 'Unlimited AI Chats')}</Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 ml-2')}>{t('mobile.feature_consult_care', 'Unlimited Consultations')}</Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 ml-2')}>{t('mobile.feature_family_care', 'Up to 10 Family Members')}</Text>
              </View>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={18} />
                <Text style={tw('text-slate-700 dark:text-slate-300 ml-2 font-bold')}>{t('mobile.feature_doctor_review', 'Periodic Doctor Review')}</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Upgrade Button */}
          {activePlan !== selectedPlan ? (
            <TouchableOpacity 
              onPress={handleUpgrade}
              disabled={isProcessingOrder}
              style={tw(`bg-slate-900 dark:bg-white py-4 rounded-2xl flex-row items-center justify-center shadow-md mb-6 ${isProcessingOrder ? 'opacity-70' : ''}`)}
            >
              {isProcessingOrder ? (
                <ActivityIndicator color={twInstance.color('text-white dark:text-slate-900')} size="small" style={tw('mr-2')} />
              ) : null}
              <Text style={tw('text-white dark:text-slate-900 font-bold text-lg mr-2')}>
                {isProcessingOrder ? t('mobile.creating_order', 'Đang tạo đơn...') : t('mobile.upgrade_via_vnpay', `Upgrade via VNPAY`)}
              </Text>
              <ArrowRight color={twInstance.color('text-white dark:text-slate-900')} size={20} />
            </TouchableOpacity>
          ) : (
            <View style={tw('bg-emerald-100 dark:bg-emerald-900/30 py-4 rounded-2xl items-center mb-6')}>
              <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold text-lg')}>{t('mobile.current_active_plan', 'This is your active plan')}</Text>
            </View>
          )}

          {/* Refund Section (P1) */}
          {activePlan !== 'free' && !isRefundPending && (
            <TouchableOpacity 
              onPress={handleRefund}
              style={tw('bg-red-50 dark:bg-red-900/20 p-4 rounded-2xl flex-row items-center justify-between border border-red-100 dark:border-red-800/50')}
            >
              <View style={tw('flex-1')}>
                <Text style={tw('text-red-700 dark:text-red-400 font-bold')}>{t('mobile.request_refund', 'Request Full Refund')}</Text>
                <Text style={tw('text-red-600/80 dark:text-red-400/80 text-xs mt-1')}>{t('mobile.refund_desc', 'Available within 24h of purchase')}</Text>
              </View>
              <XCircle color={twInstance.color('text-red-500')} size={24} />
            </TouchableOpacity>
          )}
        </View>

        {/* Trust Badges */}
        <View style={tw('flex-row justify-center gap-6 px-6 mt-4')}>
          <View style={tw('items-center')}>
            <ShieldCheck color={twInstance.color('text-slate-400')} size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>{t('mobile.secure_payment', `Secure Payment`)}</Text>
          </View>
          <View style={tw('items-center')}>
            <Zap color={twInstance.color('text-slate-400')} size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>{t('mobile.instant_activation', `Instant Activation`)}</Text>
          </View>
        </View>
      </ScrollView>

      {/* VNPAY Order & QR Modal */}
      <Modal
        visible={orderModalVisible}
        transparent
        animationType="slide"
        onRequestClose={handleCancelOrder}
      >
        <View style={tw('flex-1 bg-black/60 justify-end')}>
          <View style={tw('bg-white dark:bg-slate-900 rounded-t-3xl p-6 border-t border-slate-200 dark:border-slate-800')}>
            {/* Modal Header */}
            <View style={tw('flex-row justify-between items-center pb-4 border-b border-slate-100 dark:border-slate-800')}>
              <View>
                <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>Thanh toán VNPAY QR</Text>
                <Text style={tw('text-xs text-slate-500 dark:text-slate-400 mt-1')}>Mã đơn: {currentOrder?.orderCode}</Text>
              </View>
              <TouchableOpacity onPress={handleCancelOrder} style={tw('p-2')}>
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
                  <Text style={tw('text-xs text-slate-500 mt-2 font-medium')}>Quét mã bằng ứng dụng ngân hàng</Text>
                </View>
              ) : (
                <View style={tw('w-48 h-48 bg-slate-100 dark:bg-slate-800 rounded-2xl items-center justify-center p-4')}>
                  <QrCode color={twInstance.color('text-slate-400')} size={64} />
                  <Text style={tw('text-xs text-slate-500 text-center mt-2')}>Đang mở trang thanh toán VNPAY...</Text>
                </View>
              )}

              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white mt-4')}>
                {currentOrder?.amount?.toLocaleString('vi-VN')} VND
              </Text>

              {/* Status polling indicator */}
              <View style={tw('flex-row items-center mt-3 bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5 rounded-full')}>
                <ActivityIndicator size="small" color={twInstance.color('text-amber-500')} style={tw('mr-2')} />
                <Text style={tw('text-xs font-semibold text-amber-700 dark:text-amber-400')}>
                  Đang chờ xác nhận thanh toán... ({pollingStatus})
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
                onPress={handleCancelOrder}
                style={tw('bg-slate-100 dark:bg-slate-800 py-3.5 rounded-2xl items-center justify-center')}
              >
                <Text style={tw('text-slate-700 dark:text-slate-300 font-bold text-base')}>Hủy đơn hàng</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}
