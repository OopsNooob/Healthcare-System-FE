import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MailCheck, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useTranslation } from 'react-i18next';
import Toast from 'react-native-toast-message';
import { useVerifyEmail, useSharedAuthStore } from '@repo/shared-hooks';
import { tw, twInstance } from '@/tw';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';

export default function VerifyEmailScreen() {
  const { t } = useTranslation();
  const { isDark } = useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; role?: string; from?: string }>();
  const { verifyEmail, resendVerification, isVerifying, isResending } = useVerifyEmail();
  const isAuthenticated = useSharedAuthStore((s) => s.isAuthenticated);
  const updateCurrentUser = useSharedAuthStore((s) => s.updateCurrentUser);

  const [email, setEmail] = useState(
    typeof params.email === 'string' ? params.email : '',
  );
  const [otpCode, setOtpCode] = useState('');
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (typeof params.email === 'string' && params.email && !email) {
      setEmail(params.email);
    }
  }, [params.email, email]);

  useEffect(() => {
    if (cooldownSeconds <= 0) return;
    const timer = setInterval(() => {
      setCooldownSeconds((prev) => (prev > 1 ? prev - 1 : 0));
    }, 1000);
    return () => clearInterval(timer);
  }, [cooldownSeconds]);

  const cleanEmail = email.trim();
  const cleanOtp = otpCode.replace(/\s+/g, '').trim();
  const isBusy = isVerifying || isResending;

  const handleVerify = async () => {
    if (isBusy) return;
    setErrorMessage(null);

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = t('mobile.invalid_email', 'Please enter a valid email address.');
      setErrorMessage(msg);
      Toast.show({ type: 'error', text1: t('mobile.error', 'Error'), text2: msg });
      return;
    }

    if (!/^\d{6}$/.test(cleanOtp)) {
      const msg = t('mobile.verify_email_otp_required', 'Please enter the 6-digit verification code.');
      setErrorMessage(msg);
      Toast.show({ type: 'error', text1: t('mobile.error', 'Error'), text2: msg });
      return;
    }

    try {
      const res = await verifyEmail({ email: cleanEmail, otpCode: cleanOtp });
      const successText =
        params.role === 'doctor'
          ? t(
              'mobile.verify_email_doctor_success',
              'Email verified. Your doctor profile is now waiting for admin approval.',
            )
          : res?.message ||
            t(
              'mobile.verify_email_patient_success',
              'Email verified successfully! You can now sign in.',
            );

      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: successText,
      });
      if (isAuthenticated) {
        updateCurrentUser({ emailVerified: true });
        if (params.from === 'profile') {
          router.back('/(patient)/profile');
          return;
        }
      }
      router.replace('/(auth)/login');
    } catch (err) {
      const msg = extractApiErrorMessage(err, 'mobile.verify_email_failed');
      setErrorMessage(msg);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: msg,
      });
    }
  };

  const handleResend = async () => {
    if (isBusy || cooldownSeconds > 0) return;
    setErrorMessage(null);

    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
      const msg = t('mobile.invalid_email', 'Please enter a valid email address.');
      setErrorMessage(msg);
      Toast.show({ type: 'error', text1: t('mobile.error', 'Error'), text2: msg });
      return;
    }

    try {
      await resendVerification(cleanEmail);
      setCooldownSeconds(60);
      Toast.show({
        type: 'success',
        text1: t('mobile.success', 'Success'),
        text2: t(
          'mobile.verify_email_resent',
          'A new verification code has been sent to your email.',
        ),
      });
    } catch (err) {
      const msg = extractApiErrorMessage(err, 'mobile.verify_email_resend_failed');
      setErrorMessage(msg);
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: msg,
      });
    }
  };

  return (
    <KeyboardAvoidingView
      style={tw('flex-1 bg-white dark:bg-slate-950')}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={tw('flex-grow px-6 py-10')}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={tw('w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-900 items-center justify-center mb-6')}
          onPress={() => router.back('/(auth)/login')}
          disabled={isBusy}
          accessibilityLabel={t('mobile.back', 'Back')}
        >
          <ArrowLeft color={twInstance.color('text-slate-800 dark:text-slate-100')} size={20} />
        </TouchableOpacity>

        <View style={tw('items-center mb-8')}>
          <View style={tw('w-16 h-16 rounded-2xl bg-emerald-50 dark:bg-emerald-950/50 items-center justify-center mb-4 border border-emerald-200 dark:border-emerald-800')}>
            <MailCheck color={isDark ? '#34d399' : '#10b981'} size={32} />
          </View>
          <Text style={tw('text-2xl font-bold text-slate-900 dark:text-white text-center')}>
            {t('mobile.verify_email_title', 'Verify Your Email')}
          </Text>
          <Text style={tw('text-sm text-slate-500 dark:text-slate-400 text-center mt-2 leading-5')}>
            {t(
              'mobile.verify_email_subtitle',
              'Enter the 6-digit verification code sent to your email address to activate your account.',
            )}
          </Text>
        </View>

        {errorMessage ? (
          <View style={tw('bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 rounded-2xl px-4 py-3 mb-5')}>
            <Text style={tw('text-xs font-medium text-rose-700 dark:text-rose-300 leading-4')}>
              {errorMessage}
            </Text>
          </View>
        ) : null}

        <View style={tw('gap-4')}>
          <View style={tw('gap-1.5')}>
            <Text style={tw('text-sm font-medium text-slate-800 dark:text-slate-200')}>
              {t('mobile.email', 'Email')}
            </Text>
            <TextInput
              style={tw('bg-gray-50 dark:bg-slate-900 rounded-2xl px-4 py-3.5 text-base text-slate-900 dark:text-slate-100 border border-gray-200 dark:border-slate-700')}
              placeholder={t('mobile.enter_email_address', 'you@example.com')}
              placeholderTextColor="#9ca3af"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              value={email}
              onChangeText={setEmail}
              editable={!isBusy}
            />
          </View>

          <View style={tw('gap-1.5')}>
            <Text style={tw('text-sm font-medium text-slate-800 dark:text-slate-200')}>
              {t('mobile.otp_code', 'Verification Code (OTP)')}
            </Text>
            <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-900 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
              <ShieldCheck color={isDark ? '#94a3b8' : '#64748b'} size={20} />
              <TextInput
                style={tw('flex-1 ml-3 text-lg tracking-widest font-semibold text-slate-900 dark:text-slate-100 bg-transparent')}
                placeholder="123456"
                placeholderTextColor="#9ca3af"
                keyboardType="number-pad"
                maxLength={6}
                value={otpCode}
                onChangeText={(val) => setOtpCode(val.replace(/[^\d]/g, ''))}
                editable={!isBusy}
              />
            </View>
          </View>

          <TouchableOpacity
            style={tw(`h-12 mt-2 rounded-2xl items-center justify-center ${isBusy ? 'bg-emerald-400 dark:bg-emerald-600' : 'bg-emerald-500'}`)}
            onPress={handleVerify}
            disabled={isBusy}
          >
            {isVerifying ? (
              <ActivityIndicator color="#ffffff" size="small" />
            ) : (
              <Text style={tw('text-white text-base font-semibold')}>
                {t('mobile.verify_email_cta', 'Verify Email')}
              </Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={tw('py-3 flex-row items-center justify-center')}
            onPress={handleResend}
            disabled={isBusy || cooldownSeconds > 0}
          >
            {isResending ? (
              <ActivityIndicator color={isDark ? '#34d399' : '#10b981'} size="small" />
            ) : (
              <>
                <RefreshCw
                  color={cooldownSeconds > 0 ? '#94a3b8' : isDark ? '#34d399' : '#10b981'}
                  size={15}
                  style={tw('mr-1.5')}
                />
                <Text
                  style={tw(
                    `text-sm font-semibold ${
                      cooldownSeconds > 0
                        ? 'text-slate-400 dark:text-slate-500'
                        : 'text-emerald-600 dark:text-emerald-400'
                    }`,
                  )}
                >
                  {cooldownSeconds > 0
                    ? t('mobile.verify_email_resend_countdown', {
                        seconds: cooldownSeconds,
                        defaultValue: 'Resend code in {{seconds}}s',
                      })
                    : t('mobile.verify_email_resend', 'Resend verification code')}
                </Text>
              </>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={tw('mt-2 items-center')}
            onPress={() => router.replace('/(auth)/login')}
            disabled={isBusy}
          >
            <Text style={tw('text-sm font-medium text-slate-500 dark:text-slate-400')}>
              {t('mobile.back_to_login', 'Back to Sign In')}
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

