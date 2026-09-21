import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { View, Text, TextInput, TouchableOpacity, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useRouter } from 'expo-router';
import { Mail, Plus, ArrowLeft } from 'lucide-react-native';
import { tw } from '@/tw';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();

  const router = useRouter();
  const [email, setEmail] = useState('');

  const handleReset = () => {
    // Mock navigating to OTP screen
    router.push('/(auth)/confirm-otp');
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
          <ArrowLeft color="#1E1E1E" size={24} />
        </TouchableOpacity>

        {/* Logo area */}
        <View style={tw('flex-col items-center gap-2 mb-10')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Plus color="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34]')}>{t('mobile.healthcare', `Healthcare`)}</Text>
          </View>
        </View>

        {/* Form Card */}
        <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] mb-2')}>{t('mobile.forgot_password', `Forgot Password`)}</Text>
          <Text style={tw('text-center text-sm text-gray-500 mb-8')}>{t('mobile.enter_your_email_and_well_send', `Enter your email and we'll send you an OTP to reset your password.`)}</Text>

          <View style={tw('gap-4')}>
            {/* Email Field */}
            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E]')}>{t('mobile.email', `Email`)}</Text>
              <View style={tw('flex-row items-center bg-gray-50 rounded-2xl px-4 py-3 border border-gray-200')}>
                <Mail color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900')}
                  placeholder="Enter your email account"
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                />
              </View>
            </View>

            {/* Submit Button */}
            <TouchableOpacity 
              style={tw('h-12 w-full bg-emerald-500 rounded-2xl items-center justify-center mt-4')}
              onPress={handleReset}
            >
              <Text style={tw('text-white text-base font-semibold')}>{t('mobile.send_otp', `Send OTP`)}</Text>
            </TouchableOpacity>

            <TouchableOpacity 
              style={tw('mt-4 items-center')}
              onPress={() => router.push('/(auth)/login')}
            >
              <Text style={tw('text-sm text-gray-500')}>
                Remember your password? <Text style={tw('font-medium text-emerald-500')}>{t('mobile.log_in', `Log in`)}</Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
