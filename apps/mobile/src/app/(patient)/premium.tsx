import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert, Image } from 'react-native';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import Toast from 'react-native-toast-message';
import { Crown, CheckCircle2, ArrowRight, ShieldCheck, Zap, XCircle, HeartPulse, Sparkles } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';

export default function PremiumScreen() {
  const { t } = useTranslation();
  useThemeContext();

  const router = useRouter();
  
  // Mock active plan
  const [activePlan, setActivePlan] = useState('free');
  const [selectedPlan, setSelectedPlan] = useState('plus');

  const handleUpgrade = () => {
    Alert.alert(
      t('mobile.confirm_payment', 'Confirm Payment'), 
      t('mobile.redirecting_to_vnpay', 'You are about to be redirected to VNPAY Sandbox to complete your purchase.'),
      [
        { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('mobile.pay_now', 'Pay Now'), 
          onPress: () => {
            Toast.show({
              type: 'success',
              text1: t('mobile.success', 'Success'),
              text2: t('mobile.vnpay_success', 'Payment successful (Sandbox)! Plan upgraded.')
            });
            setActivePlan(selectedPlan);
          }
        }
      ]
    );
  };

  const handleRefund = () => {
    Alert.alert(
      t('mobile.request_refund', 'Request Full Refund'), 
      t('mobile.refund_confirm_desc', 'Are you sure you want to request a refund? You will lose access to premium features immediately.'),
      [
        { text: t('mobile.cancel', 'Cancel'), style: 'cancel' },
        { 
          text: t('mobile.confirm_refund', 'Confirm Refund'), 
          style: 'destructive',
          onPress: () => {
            Toast.show({
              type: 'info',
              text1: t('mobile.refund_processed', 'Refund Processed'),
              text2: t('mobile.refund_success_desc', 'Your refund request has been sent to admin.')
            });
            setActivePlan('free');
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('items-center px-6 pt-10 pb-6')}>
          <View style={tw('w-20 h-20 bg-amber-100 dark:bg-amber-900/30 rounded-full items-center justify-center mb-4')}>
            <Crown color={twInstance.color('text-amber-500')} size={40} />
          </View>
          <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white text-center')}>{t('mobile.upgrade_to_premium', `Upgrade to Premium`)}</Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 text-center mt-2 px-4')}>{t('mobile.unlock_unlimited_ai_consultati', `Unlock unlimited AI consultations and priority booking with top specialists.`)}</Text>
        </View>

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
              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>99K<Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>/mo</Text></Text>
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
              <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white')}>299K<Text style={tw('text-sm text-slate-500 dark:text-slate-400')}>/mo</Text></Text>
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
              style={tw('bg-slate-900 dark:bg-white py-4 rounded-2xl flex-row items-center justify-center shadow-md mb-6')}
            >
              <Text style={tw('text-white dark:text-slate-900 font-bold text-lg mr-2')}>{t('mobile.upgrade_via_vnpay', `Upgrade via VNPAY`)}</Text>
              <ArrowRight color={twInstance.color('text-white dark:text-slate-900')} size={20} />
            </TouchableOpacity>
          ) : (
            <View style={tw('bg-emerald-100 dark:bg-emerald-900/30 py-4 rounded-2xl items-center mb-6')}>
              <Text style={tw('text-emerald-700 dark:text-emerald-400 font-bold text-lg')}>{t('mobile.current_active_plan', 'This is your active plan')}</Text>
            </View>
          )}

          {/* Refund Section (P1) */}
          {activePlan !== 'free' && (
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
    </SafeAreaView>
  );
}
