import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Plus, ArrowLeft } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

export default function ConfirmOTPScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [otp, setOtp] = useState('');

  const handleConfirm = () => {
    // Mock navigating to change password
    router.push('/(auth)/change-password');
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}
    >
      <ScrollView contentContainerStyle={tw('flex-grow items-center justify-center px-6 py-10')}>
        {/* Back Button */}
        <TouchableOpacity 
          style={tw('absolute top-12 left-6 p-2 bg-white dark:bg-slate-900 rounded-full shadow-sm')}
          onPress={() => router.back()}
        >
          <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
        </TouchableOpacity>

        {/* Logo area */}
        <View style={tw('flex-col items-center gap-2 mb-10')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Plus color="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34] dark:text-slate-100')}>{t('mobile.healthcare', `Healthcare`)}</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] dark:text-slate-100 mb-2')}>{t('mobile.confirm_otp', `Confirm OTP`)}</Text>
          <Text style={tw('text-center text-sm text-gray-500 mb-8')}>{t('mobile.please_enter_the_6digit_otp_se', `Please enter the 6-digit OTP sent to your email.`)}</Text>

          <View style={tw('gap-4')}>
            {/* OTP Field */}
            <View style={tw('gap-1.5')}>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <TextInput
                  style={tw('flex-1 text-center text-2xl tracking-widest text-gray-900 dark:text-gray-100')}
                  placeholder="------"
                  placeholderTextColor="#9ca3af"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={tw('h-12 w-full bg-emerald-500 rounded-2xl items-center justify-center mt-4')}
              onPress={handleConfirm}
            >
              <Text style={tw('text-white text-base font-semibold')}>{t('mobile.verify', `Verify`)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw('mt-4 items-center')}
              onPress={() => {}}
            >
              <Text style={tw('text-sm text-gray-500')}>
                Didn't receive code? <Text style={tw('font-medium text-emerald-500')}>{t('mobile.resend', `Resend`)}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
