import { View, Text, ScrollView, TouchableOpacity, SafeAreaView, Image } from 'react-native';
import { useRouter } from 'expo-router';
import { Crown, CheckCircle2, ArrowRight, ShieldCheck, Zap } from 'lucide-react-native';
import { tw } from '@/tw';

export default function PremiumScreen() {
  const router = useRouter();

  const handleUpgrade = () => {
    // Mock VNPAY integration
    alert('Redirecting to VNPAY Sandbox...');
  };

  return (
    <SafeAreaView style={tw('flex-1 bg-slate-50')}>
      <ScrollView contentContainerStyle={tw('pb-20')} showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={tw('items-center px-6 pt-10 pb-6')}>
          <View style={tw('w-20 h-20 bg-amber-100 rounded-full items-center justify-center mb-4')}>
            <Crown color="#f59e0b" size={40} />
          </View>
          <Text style={tw('text-3xl font-bold text-slate-900 text-center')}>Upgrade to Premium</Text>
          <Text style={tw('text-slate-500 text-center mt-2 px-4')}>
            Unlock unlimited AI consultations and priority booking with top specialists.
          </Text>
        </View>

        {/* Current Plan */}
        <View style={tw('px-6 mb-8')}>
          <View style={tw('bg-white p-5 rounded-3xl border border-slate-200 shadow-sm flex-row items-center justify-between')}>
            <View>
              <Text style={tw('text-slate-500 text-sm font-semibold uppercase tracking-wider mb-1')}>Current Plan</Text>
              <Text style={tw('text-xl font-bold text-slate-900')}>Free Tier</Text>
            </View>
            <View style={tw('bg-slate-100 px-3 py-1.5 rounded-full')}>
              <Text style={tw('text-slate-600 font-bold text-xs')}>3 AI Chats / day</Text>
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
                <Text style={tw('text-amber-400 font-bold text-lg mb-1')}>Premium Member</Text>
                <View style={tw('flex-row items-end')}>
                  <Text style={tw('text-4xl font-bold text-white')}>99.000</Text>
                  <Text style={tw('text-slate-400 font-medium ml-1 mb-1')}>VND / tháng</Text>
                </View>
              </View>
            </View>

            <View style={tw('space-y-4 mb-8')}>
              <View style={tw('flex-row items-center')}>
                <CheckCircle2 color="#10b981" size={20} />
                <Text style={tw('text-slate-200 ml-3 font-medium text-base')}>Unlimited AI Health Consultations</Text>
              </View>
              <View style={tw('flex-row items-center mt-3')}>
                <CheckCircle2 color="#10b981" size={20} />
                <Text style={tw('text-slate-200 ml-3 font-medium text-base')}>Priority queue for Doctor appointments</Text>
              </View>
              <View style={tw('flex-row items-center mt-3')}>
                <CheckCircle2 color="#10b981" size={20} />
                <Text style={tw('text-slate-200 ml-3 font-medium text-base')}>Advanced Medical Record analysis</Text>
              </View>
            </View>

            <TouchableOpacity 
              onPress={handleUpgrade}
              style={tw('bg-amber-400 py-4 rounded-2xl flex-row items-center justify-center')}
            >
              <Text style={tw('text-slate-900 font-bold text-lg mr-2')}>Upgrade via VNPAY</Text>
              <ArrowRight color="#0f172a" size={20} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Trust Badges */}
        <View style={tw('flex-row justify-center gap-6 px-6')}>
          <View style={tw('items-center')}>
            <ShieldCheck color="#94a3b8" size={24} />
            <Text style={tw('text-xs text-slate-400 font-medium mt-1')}>Secure Payment</Text>
          </View>
          <View style={tw('items-center')}>
            <Zap color="#94a3b8" size={24} />
            <Text style={tw('text-xs text-slate-400 font-medium mt-1')}>Instant Activation</Text>
          </View>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
}
