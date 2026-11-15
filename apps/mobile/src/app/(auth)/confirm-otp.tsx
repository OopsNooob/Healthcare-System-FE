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
import { mobileApi, useConfirmOtp } from '@repo/shared-hooks';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Cross, ArrowLeft } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

export default function ConfirmOTPScreen() {
  const { t } = useTranslation();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const { confirmOtp, isLoading } = useConfirmOtp();
  const [otp, setOtp] = useState('');
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleConfirm = async () => {
    if (isLoading) return;
    if (!email) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.missing_email_restart_reset', 'Missing email context. Please start password reset again.'),
      });
      router.replace('/(auth)/forgot-password');
      return;
    }
    const cleanOtp = otp.trim();
    if (!cleanOtp || cleanOtp.length < 4) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.please_enter_otp', 'Please enter the verification OTP code.'),
      });
      return;
    }

    try {
      await confirmOtp({ email, otpCode: cleanOtp });
      Toast.show({
        type: 'success',
        text1: t('mobile.otp_verified', 'OTP Verified'),
      });
      router.push({
        pathname: '/(auth)/change-password',
        params: { email, otpCode: cleanOtp },
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    }
  };

  const handleResend = async () => {
    if (isLoading || isResending || cooldown > 0 || !email) return;
    setIsResending(true);
    try {
      await mobileApi.authSendOtp({ email });
      setCooldown(60);
      Toast.show({
        type: 'success',
        text1: t('mobile.otp_resent', 'OTP Resent'),
        text2: email,
      });
    } catch (err) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: extractApiErrorMessage(err),
      });
    } finally {
      setIsResending(false);
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
          onPress={() => router.back('/(auth)/forgot-password')}
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
            {t('mobile.confirm_otp', 'Confirm OTP')}
          </Text>
          <Text style={tw('text-center text-sm text-gray-500 dark:text-slate-400 mb-2')}>
            {t('mobile.please_enter_the_6digit_otp_se', 'Please enter the 6-digit OTP sent to your email.')}
          </Text>
          {Boolean(email) && (
            <Text style={tw('text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400 mb-6')}>
              {email}
            </Text>
          )}

          <View style={tw('gap-4')}>
            <View style={tw('gap-1.5')}>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <TextInput
                  style={tw('flex-1 text-center text-2xl tracking-widest text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder="------"
                  placeholderTextColor="#9ca3af"
                  value={otp}
                  onChangeText={setOtp}
                  keyboardType="number-pad"
                  maxLength={6}
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
              onPress={handleConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw('text-white text-base font-semibold')}>
                  {t('mobile.verify', 'Verify')}
                </Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={tw('mt-4 items-center')}
              onPress={handleResend}
              disabled={isLoading || isResending || cooldown > 0 || !email}
            >
              <Text style={tw('text-sm text-gray-500 dark:text-slate-400')}>
                {t('mobile.didnt_receive_code', "Didn't receive code?")}{' '}
                <Text style={tw('font-medium text-emerald-600 dark:text-emerald-400')}>
                  {isResending
                    ? t('mobile.loading', 'Loading...')
                    : cooldown > 0
                      ? `${t('mobile.resend', 'Resend')} (${cooldown}s)`
                      : t('mobile.resend', 'Resend')}
                </Text>
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
