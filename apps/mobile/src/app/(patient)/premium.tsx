import { useTranslation } from 'react-i18next';
import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Platform, Alert, Image } from 'react-native';
import { useRouter } from 'expo-router';
import Toast from 'react-native-toast-message';
import { Crown, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react-native';
import { tw } from '@/tw';

export default function PremiumScreen() {
  const { t } = useTranslation();

  const router = useRouter();

  const handleUpgrade = () => {
    Toast.show({
      type: 'info',
      text1: 'Redirecting',
      text2: 'Redirecting to VNPAY Sandbox...'
    });
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('items-center px-6 pt-10 pb-6')}>
          <View style={tw('w-20 h-20 bg-amber-100 rounded-full items-center justify-center mb-4')}>
            <Crown color="#f59e0b" size={40} />
          </View>
          <Text style={tw('text-3xl font-bold text-slate-900 dark:text-white text-center')}>{t('mobile.upgrade_to_premium', `Upgrade to Premium`)}</Text>
          <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-center mt-2 px-4')}>{t('mobile.unlock_unlimited_ai_consultati', `Unlock unlimited AI consultations and priority booking with top specialists.`)}</Text>
        </View>

        {/* Current Plan */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('bg-white dark:bg-slate-900 p-5 rounded-3xl border border-slate-200 dark:border-slate-700 shadow-sm flex-row items-center justify-between')}>
            <View>
              <Text style={tw('text-slate-500 dark:text-slate-400 dark:text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1')}>{t('mobile.current_plan', `Current Plan`)}</Text>
              <Text style={tw('text-xl font-bold text-slate-900 dark:text-white')}>{t('mobile.free_tier', `Free Tier`)}</Text>
            </View>
            <View style={tw('bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full')}>
              <Text style={tw('text-slate-600 dark:text-slate-300 font-bold text-xs')}>{t('mobile.3_ai_chats_day', `3 AI Chats / day`)}</Text>
            </View>
          </View>
        </View>

        {/* Premium Plan Card */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('bg-slate-900 p-6 rounded-3xl shadow-lg relative overflow-hidden')}>
            <View style={tw('absolute -right-10 -top-10 opacity-10')}>
              <Crown color="#ffffff" size={120} />
            </View>
            
            <View style={tw('flex-row justify-between items-center mb-6')}>
              <View>
                <Text style={tw('text-amber-400 font-bold text-lg mb-1')}>{t('mobile.premium_member', `Premium Member`)}</Text>
                <View style={tw('flex-row items-end')}>
                  <Text style={tw('text-4xl font-bold text-white')}>{t('mobile.99000', `99.000`)}</Text>
                  <Text style={tw('text-slate-400 dark:text-slate-500 font-medium ml-1 mb-1')}>{t('mobile.vnd_thng', `VND / tháng`)}</Text>
                </View>
              </View>
            </View>

            <View style={tw('space-y-4 mb-8')}>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={20} />
                <Text style={tw('text-slate-200 ml-3 font-medium text-base')}>{t('mobile.unlimited_ai_health_consultati', `Unlimited AI Health Consultations`)}</Text>
              </View>
              <View style={tw('flex-row items-center mt-3')}>
                <CheckCircle2 color="#10b981" size={20} />
                <Text style={tw('text-slate-200 ml-3 font-medium text-base')}>{t('mobile.priority_queue_for_doctor_appo', `Priority queue for Doctor appointments`)}</Text>
              </View>
              <View style={tw('flex-row items-center mt-3')}>
                <CheckCircle2 color="#10b981" size={20} />
                <Text style={tw('text-slate-200 ml-3 font-medium text-base')}>{t('mobile.advanced_medical_record_analys', `Advanced Medical Record analysis`)}</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleUpgrade}
              style={tw('bg-amber-400 py-4 rounded-2xl flex-row items-center justify-center')}
            >
              <Text style={tw('text-slate-900 dark:text-white font-bold text-lg mr-2')}>{t('mobile.upgrade_via_vnpay', `Upgrade via VNPAY`)}</Text>
              <ArrowRight color="#0f172a" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Badges */}
        <View style={tw('flex-row justify-center gap-6 px-6')}>
          <View style={tw('items-center')}>
            <ShieldCheck color="#94a3b8" size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>{t('mobile.secure_payment', `Secure Payment`)}</Text>
          </View>
          <View style={tw('items-center')}>
            <Zap color="#94a3b8" size={24} />
            <Text style={tw('text-xs text-slate-400 dark:text-slate-500 font-medium mt-1')}>{t('mobile.instant_activation', `Instant Activation`)}</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
