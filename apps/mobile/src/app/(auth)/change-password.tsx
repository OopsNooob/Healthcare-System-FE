import { useState } from 'react';
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
import { useChangePassword } from '@repo/shared-hooks';
import { useThemeContext } from '@/context/ThemeContext';
import { useSafeRouter as useRouter } from '@/utils/useSafeRouter';
import { extractApiErrorMessage } from '@/utils/apiError';
import { Lock, Cross, ArrowLeft } from 'lucide-react-native';
import { tw, twInstance } from '@/tw';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  useThemeContext();
  const router = useRouter();
  const params = useLocalSearchParams<{ email?: string; otpCode?: string }>();
  const email = typeof params.email === 'string' ? params.email : '';
  const otpCode = typeof params.otpCode === 'string' ? params.otpCode : '';

  const { changePassword, isLoading } = useChangePassword();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleChangePassword = async () => {
    if (isLoading) return;
    if (!email || !otpCode) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.missing_email_restart_reset', 'Missing reset session. Please request a new OTP.'),
      });
      router.replace('/(auth)/forgot-password');
      return;
    }
    if (password.length < 12) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.password_min_12', 'Password must be at least 12 characters.'),
      });
      return;
    }
    if (password !== confirmPassword) {
      Toast.show({
        type: 'error',
        text1: t('mobile.error', 'Error'),
        text2: t('mobile.passwords_do_not_match', 'Passwords do not match.'),
      });
      return;
    }

    try {
      await changePassword({ email, otpCode, newPassword: password });
      Toast.show({
        type: 'success',
        text1: t('mobile.password_changed', 'Password Updated'),
        text2: t('mobile.password_changed_desc', 'You can now sign in with your new password.'),
      });
      router.replace('/(auth)/login');
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
            {t('mobile.new_password', 'New Password')}
          </Text>
          <Text style={tw('text-center text-sm text-gray-500 dark:text-slate-400 mb-8')}>
            {t('mobile.create_a_new_strong_password_f', 'Create a new strong password for your account.')}
          </Text>

          <View style={tw('gap-4')}>
            <View style={tw('gap-1.5')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.new_password', 'New Password')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.enter_new_password', 'Enter new password')}
                  placeholderTextColor="#9ca3af"
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  editable={!isLoading}
                />
              </View>
            </View>

            <View style={tw('gap-1.5 mt-2')}>
              <Text style={tw('text-sm font-medium text-[#1E1E1E] dark:text-slate-200')}>
                {t('mobile.confirm_password', 'Confirm Password')}
              </Text>
              <View style={tw('flex-row items-center bg-gray-50 dark:bg-slate-800 rounded-2xl px-4 py-3 border border-gray-200 dark:border-slate-700')}>
                <Lock color="#9ca3af" size={20} />
                <TextInput
                  style={tw('flex-1 ml-3 text-base text-gray-900 dark:text-gray-100 bg-transparent')}
                  placeholder={t('mobile.confirm_new_password', 'Confirm new password')}
                  placeholderTextColor="#9ca3af"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  secureTextEntry
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
              onPress={handleChangePassword}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color="#ffffff" size="small" />
              ) : (
                <Text style={tw('text-white text-base font-semibold')}>
                  {t('mobile.change_password', 'Change Password')}
                </Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}
