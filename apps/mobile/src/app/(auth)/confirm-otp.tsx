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
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import Toast from 'react-native-toast-message';
import { mobileApi } from '@repo/shared-hooks';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Cross, ArrowLeft } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

export default function ConfirmOTPScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';

  const [otp, setOtp] = useState('');
  const [isFocused, setIsFocused] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = setInterval(() => {
      setCooldown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldown]);

  const handleConfirm = () => {
    if (isResending) return;
    if (!email) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.missing_email_restart_reset', 'Missing email context. Please start password reset again.'),
      });
      router.replace('/(auth)/forgot-password');
      return;
    }
    const cleanOtp = otp.replace(/\s+/g, '').trim();
    if (!/^\d{6}$/.test(cleanOtp)) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.please_enter_otp', 'Please enter the 6-digit verification OTP code.'),
      });
      return;
    }

    router.push({
      pathname: '/(auth)/change-password',
      params: { email, otpCode: cleanOtp },
    });
  };

  const handleResend = async () => {
    if (isResending || cooldown > 0 || !email) return;
    setIsResending(true);
    try {
      await mobileApi.authPasswordRecovery({ email });
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
              <View
                style={tw(
                  `relative justify-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-1.5 border ${
                    isFocused
                      ? 'border-emerald-500 dark:border-emerald-400'
                      : 'border-gray-200 dark:border-slate-700'
                  }`,
                )}
              >
                {otp.length === 0 && !isFocused && (
                  <Text
                    pointerEvents="none"
                    style={tw(
                      'absolute inset-x-0 text-center text-2xl tracking-widest text-gray-400 dark:text-slate-500',
                    )}
                  >
                    ------
                  </Text>
                )}
                <TextInput
                  style={[
                    tw(
                      'w-full h-12 text-center text-2xl font-semibold text-gray-900 dark:text-gray-100 bg-transparent',
                    ),
                    {
                      textAlignVertical: 'center',
                      includeFontPadding: false,
                      letterSpacing: otp.length > 0 ? 8 : 0,
                    },
                  ]}
                  textAlign="center"
                  cursorColor="#10b981"
                  selectionColor="#10b981"
                  value={otp}
                  onFocus={() => setIsFocused(true)}
                  onBlur={() => setIsFocused(false)}
                  onChangeText={(val) => setOtp(val.replace(/[^\d]/g, ''))}
                  keyboardType="number-pad"
                  maxLength={6}
                  editable={!isResending}
                />
              </View>
            </View>

            <TouchableOpacity
              style={tw(
                `h-12 w-full mt-4 rounded-2xl items-center justify-center ${
                  isResending ? 'bg-emerald-400' : 'bg-emerald-500'
                }`,
              )}
              onPress={handleConfirm}
              disabled={isResending}
            >
              <Text style={tw('text-white text-base font-semibold')}>
                {t('mobile.continue_next', 'Continue')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={tw('mt-4 items-center')}
              onPress={handleResend}
              disabled={isResending || cooldown > 0 || !email}
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
