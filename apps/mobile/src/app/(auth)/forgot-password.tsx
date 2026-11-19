import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { useForgotPassword } from '@repo/shared-hooks';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Mail, Cross, ArrowLeft } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const { sendOtp, isLoading } = useForgotPassword();
  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );

  useEffect(() => {
    if (typeof params.email === 'string' && params.email && !email) {
      setEmail(params.email);
    }
  }, [params.email, email]);

  const handleReset = async () => {
    if (isLoading) return;
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.please_enter_email', 'Please enter your email address.'),
      });
      return;
    }

    try {
      await sendOtp({ email: trimmedEmail });
      Toast.show({
        type: 'success',
        text1: t('mobile.otp_sent', 'OTP Sent'),
        text2: t('mobile.otp_sent_desc', 'Please check your email inbox for the 6-digit code.'),
      });
      router.push({ pathname: '/(auth)/confirm-otp', params: { email: trimmedEmail } });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    }
  };

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={tw('flex-1 bg-slate-50 dark:bg-slate-950')}
    >
      <ScrollView
        contentContainerStyle={tw('flex-grow items-center justify-center px-6 py-10')}
        keyboardShouldPersistTaps="handled"
      >
        <TouchableOpacity
          style={tw('absolute top-12 left-6 p-2 bg-white dark:bg-slate-900 rounded-full border border-slate-200 dark:border-slate-800 shadow-sm')}
          onPress={() => router.back('/(auth)/login')}
        >
          <ArrowLeft color={twInstance.color('text-slate-900 dark:text-slate-100')} size={24} />
        </TouchableOpacity>

        <View style={tw('flex-col items-center gap-2 mb-10')}>
          <View style={tw('flex-row items-center gap-2')}>
            <Cross color="#10b981" fill="#10b981" size={32} />
            <Text style={tw('text-3xl font-bold text-[#313A34] dark:text-slate-100')}>
              {t('mobile.healthcare', 'Healthcare')}
            </Text>
          </View>
        </View>

        <View style={tw('w-full bg-white dark:bg-slate-900 rounded-3xl border border-gray-200 dark:border-slate-800 shadow-sm px-6 py-8')}>
          <Text style={tw('text-center text-3xl font-bold text-[#313A34] dark:text-slate-100 mb-2')}>
            {t('mobile.forgot_password', 'Forgot Password')}
          </Text>
          <Text style={tw('text-center text-sm text-gray-500 dark:text-slate-400 mb-8')}>
            {t('mobile.enter_your_email_and_well_send', "Enter your email and we'll send you an OTP to reset your password.")}
          </Text>

          <View style={tw('gap-4')}>
            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.email', 'Email')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Mail color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.enter_your_email', 'Enter your email account')}
                  placeholderTextColor="#9ca3af"
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  keyboardType="email-address"
                  editable={!isLoading}
                />
              </View>
            </View>

            <TouchableOpacity
              style={tw(
                `h-12 w-full mt-4 rounded-2xl items-center justify-center ${
                  isLoading ? 'bg-emerald-400' : 'bg-emerald-500'
                }`,
              )}
              onPress={handleReset}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw('text-white text-base font-semibold')}>
                  {t('mobile.send_otp', 'Send OTP')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={tw('mt-4 items-center')}
              onPress={() => router.replace('/(auth)/login')}
              disabled={isLoading}
            >
              <Text style={tw('text-sm text-gray-500 dark:text-slate-400')}>
                {t('mobile.remember_your_password', 'Remember your password?')}{' '}
                <Text style={tw('font-medium text-emerald-600 dark:text-emerald-400')}>
                  {t('mobile.log_in', 'Log in')}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
